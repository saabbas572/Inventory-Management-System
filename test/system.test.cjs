const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ✅ Mocks
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    req.session.user = { _id: 'user123' };
    next();
  }
}));

jest.mock('csurf', () => () => (req, res, next) => {
  req.csrfToken = () => 'mock-csrf-token';
  next();
});

jest.mock('multer', () => {
  const multerMock = () => ({
    single: () => (req, res, next) => {
      req.file = null;
      next();
    }
  });
  multerMock.diskStorage = () => ({});
  return multerMock;
});

// Mock models
jest.mock('../models/User');
jest.mock('../models/Item');
jest.mock('../models/Vendor');
jest.mock('../models/Purchase');
jest.mock('../models/Sale');
jest.mock('../models/Customer');

const User = require('../models/User');
const Item = require('../models/Item');
const Vendor = require('../models/Vendor');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');

const authRouter = require('../routes/auth');
const itemsRouter = require('../routes/items');
const vendorsRouter = require('../routes/vendors');
const purchasesRouter = require('../routes/purchases');
const salesRouter = require('../routes/sales');

describe('System Test', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({
      secret: 'testsecret',
      resave: false,
      saveUninitialized: true
    }));
    app.use(flash());

    // Simulate flash/csrf/render
    app.use((req, res, next) => {
      req.csrfToken = () => 'mock-csrf-token';
      req.flash = jest.fn((type, msg) => {
        if (msg) {
          req.session[type] = msg;
        }
        return req.session[type] || [];
      });
      res.render = (view, options) => res.status(200).json(options);
      next();
    });

    // Load routers
    app.use('/', authRouter);
    app.use('/items', itemsRouter);
    app.use('/vendors', vendorsRouter);
    app.use('/purchases', purchasesRouter);
    app.use('/sales', salesRouter);

    app.get('/dashboard', (req, res) => {
      if (!req.session.user) return res.status(401).send('Unauthorized');
      res.status(200).send('Dashboard');
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Full system: login, view dashboard, create item, vendor, purchase, and sale', async () => {
    const bcrypt = require('bcryptjs');
    const hashed = bcrypt.hashSync('password123', 10);

    User.findOne.mockImplementation((query) => {
      const testRegex = query?.username?.$regex;
      if (testRegex?.test && testRegex.test('testuser')) {
        return Promise.resolve({
          username: 'testuser',
          password: hashed,
          _id: 'user123',
          role: 'user'
        });
      }
      return Promise.resolve(null);
    });

    const agent = request.agent(app);

    // 1️⃣ Login
    const loginInput = { username: 'testuser', password: 'password123' };
    console.log('1️⃣ Logging in...');
    console.log('Input:', loginInput);
    const loginRes = await agent
      .post('/login')
      .type('form')
      .send(loginInput)
      .expect(302)
      .expect('Location', '/dashboard');
    console.log('Output: Redirect to', loginRes.headers.location);
    console.log('✅ Logged in successfully\n');

    // 2️⃣ Access Dashboard
    console.log('2️⃣ Accessing dashboard...');
    const dashboardRes = await agent.get('/dashboard').expect(200);
    console.log('Output:', dashboardRes.text);
    expect(dashboardRes.text).toBe('Dashboard');
    console.log('✅ Dashboard accessed\n');

    const csrfToken = 'mock-csrf-token';

    // 3️⃣ Create Item with invalid data (to test error handling)
    const createItemInput = {
      itemNumber: '',
      itemName: '',
      unitPrice: '',
      discountPercent: '5',
      stock: '10',
      status: 'Active',
      _csrf: csrfToken,
    };
    console.log('3️⃣ Creating item with invalid data...');
    console.log('Input:', createItemInput);
    const createItemRes = await agent
      .post('/items/items')
      .send(createItemInput);
    console.log('Output status:', createItemRes.statusCode);
    console.log('Output redirect location:', createItemRes.header.location);
    expect(createItemRes.statusCode).toBe(302);
    expect(createItemRes.header.location).toMatch('/items?error=');
    console.log('✅ Item creation error handling verified\n');

    // 4️⃣ Toggle item status
    console.log('4️⃣ Toggling item status...');
    const fakeItem = {
      _id: 'item123',
      status: 'Active',
      save: jest.fn().mockResolvedValue(true)
    };
    Item.findById.mockResolvedValue(fakeItem);

    const toggleRes = await agent
      .post('/items/items/toggle-status/item123')
      .expect(302);
    console.log('Output status:', toggleRes.statusCode);
    console.log('Item status after toggle:', fakeItem.status);
    expect(fakeItem.status).toBe('Inactive');
    console.log('✅ Item status toggled\n');

    // 5️⃣ Create Purchase with valid data
    console.log('5️⃣ Creating purchase with valid data...');
    Purchase.create = jest.fn().mockResolvedValue(true);
    Item.findOne.mockResolvedValue({
      itemNumber: 'ITEM001',
      itemName: 'Test Item',
      stock: 5,
      save: jest.fn().mockResolvedValue(true)
    });
    Vendor.findById.mockResolvedValue({ _id: 'vendor123', fullName: 'Vendor X' });

    const purchaseInput = {
      itemNumber: 'ITEM001',
      vendorId: 'vendor123',
      quantity: '5',
      unitPrice: '100',
      _csrf: csrfToken
    };
    console.log('Input:', purchaseInput);
    const purchaseRes = await agent
      .post('/purchases/purchases')
      .type('form')
      .send(purchaseInput)
      .expect(302);
    console.log('Output redirect location:', purchaseRes.header.location);
    expect(purchaseRes.header.location).toBe('/purchases');
    console.log('✅ Purchase created successfully\n');

    // 6️⃣ Create Sale with valid data
    console.log('6️⃣ Creating sale with valid data...');
    Customer.findById.mockResolvedValue({ _id: 'cust123', fullName: 'John Doe' });
    Item.findOne.mockResolvedValue({
      itemNumber: 'ITEM001',
      stock: 10,
      save: jest.fn().mockResolvedValue(true)
    });
    Sale.prototype.save = jest.fn().mockResolvedValue(true);
    Sale.countDocuments = jest.fn().mockResolvedValue(0);

    const saleInput = {
      itemNumber: 'ITEM001',
      customerId: 'cust123',
      saleDate: '2024-01-01',
      quantity: 3,
      unitPrice: 120
    };
    console.log('Input:', saleInput);
    const saleRes = await agent
      .post('/sales/sales')
      .send(saleInput)
      .expect(302);
    console.log('Output redirect location:', saleRes.header.location);
    expect(saleRes.header.location).toBe('/sales');
    console.log('✅ Sale recorded successfully\n');

    console.log('🎉 System test completed successfully!');
  });
});
