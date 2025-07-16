const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ✅ Mock isAuthenticated
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    req.session.user = { _id: 'user123' };
    next();
  }
}));

// ✅ Mock CSRF
jest.mock('csurf', () => () => (req, res, next) => {
  req.csrfToken = () => 'mock-token';
  next();
});

jest.mock('multer', () => {
  const multerMock = () => ({
    single: () => (req, res, next) => {
      req.file = null; // Simulate no uploaded file
      return next();   // Important: call next() to proceed!
    }
  });

  multerMock.diskStorage = () => ({});
  return multerMock;
});


// ✅ Mock Item model
jest.mock('../models/Item');
const Item = require('../models/Item');

// ✅ Import router AFTER mocks
const router = require('../routes/items');

describe('Items Router', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'test' });

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
    app.use(flash());

    // Mock rendering and flash
    app.use((req, res, next) => {
      req.flash = () => {};
      res.render = (view, options) => res.status(200).json(options);
      next();
    });

    app.use('/', router);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /items should list items', async () => {
    Item.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { itemName: 'Test Item', itemNumber: 'ITEM001' }
        ])
      })
    });

    const res = await request(app).get('/items');
    expect(res.statusCode).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  test('GET /items/:id should return item JSON', async () => {
    Item.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'abc123', itemName: 'Test' })
    });

    const res = await request(app).get('/items/abc123');
    expect(res.statusCode).toBe(200);
    expect(res.body.itemName).toBe('Test');
  });

  test('POST /items should validate and reject missing fields', async () => {
    Item.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/items')
      .send({
        itemNumber: '',
        itemName: '',
        unitPrice: '',
        discountPercent: '5',
        stock: '10',
        status: 'Active'
      });

    expect(res.statusCode).toBe(302);
    expect(res.header.location).toMatch('/items?error=');
  });

  test('POST /items/toggle-status/:id should toggle item status', async () => {
    const item = {
      _id: 'abc123',
      status: 'Active',
      save: jest.fn().mockResolvedValue(true)
    };
    Item.findById.mockResolvedValue(item);

    const res = await request(app).post('/items/toggle-status/abc123');
    expect(res.statusCode).toBe(302);
    expect(item.save).toHaveBeenCalled();
    expect(item.status).toBe('Inactive');
  });

  test('POST /items/delete/:id should delete item', async () => {
    const item = { _id: 'abc123', itemName: 'DeleteMe' };
    Item.findByIdAndDelete.mockResolvedValue(item);

    const res = await request(app).post('/items/delete/abc123');
    expect(res.statusCode).toBe(302);
    expect(Item.findByIdAndDelete).toHaveBeenCalledWith('abc123');
  });
});
