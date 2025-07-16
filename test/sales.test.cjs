const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock middleware to simulate authentication
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    req.session.user = { _id: 'user123' };
    next();
  }
}));

// Mock models
jest.mock('../models/Sale');
jest.mock('../models/Item');
jest.mock('../models/Customer');

const Sale = require('../models/Sale');
const Item = require('../models/Item');
const Customer = require('../models/Customer');

const router = require('../routes/sales');

describe('Sales Router', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'test' });

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({ secret: 'testsecret', resave: false, saveUninitialized: false }));
    app.use(flash());

    // Mock req.flash to be noop and res.render to return json
    app.use((req, res, next) => {
      req.flash = jest.fn((type, msg) => {
        if (msg) {
          req.session[type] = msg;
        }
        return req.session[type] || [];
      });
      res.render = (view, options) => res.status(200).json(options);
      // Mock csrf token function
      req.csrfToken = () => 'mock-csrf-token';
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

  test('GET /sales should render sales page with data', async () => {
    Sale.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ saleId: 'SALE0001' }]) });
    Item.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ itemName: 'Test Item' }]) });
    Customer.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ fullName: 'John Doe' }]) });

    const res = await request(app).get('/sales');

    expect(res.statusCode).toBe(200);
    expect(res.body.sales.length).toBe(1);
    expect(res.body.items.length).toBe(1);
    expect(res.body.customers.length).toBe(1);
    expect(res.body.csrfToken).toBe('mock-csrf-token');
  });

  test('GET /sales/:id returns sale JSON', async () => {
    Sale.findById.mockResolvedValue({ _id: 'sale123', saleId: 'SALE0001' });

    const res = await request(app).get('/sales/sale123');

    expect(res.statusCode).toBe(200);
    expect(res.body.saleId).toBe('SALE0001');
  });

  test('GET /sales/:id returns 404 if sale not found', async () => {
    Sale.findById.mockResolvedValue(null);

    const res = await request(app).get('/sales/nonexistent');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Sale not found');
  });

  test('POST /sales creates a new sale', async () => {
  // Mock Item.findOne to resolve with an object that has a mocked save method
  const saveMock = jest.fn().mockResolvedValue(true);
  Item.findOne.mockResolvedValue({
    itemName: 'Test Item',
    stock: 10,
    save: saveMock
  });

  Customer.findById.mockResolvedValue({ fullName: 'John Doe' });
  Sale.countDocuments.mockResolvedValue(0);
  Sale.prototype.save = jest.fn().mockResolvedValue();

  const res = await request(app)
    .post('/sales')
    .send({
      itemNumber: 'ITEM001',
      customerId: 'cust123',
      saleDate: '2023-01-01',
      quantity: 5,
      unitPrice: 10
    });

  expect(res.statusCode).toBe(302);
  expect(res.header.location).toBe('/sales');
});

  test('POST /sales rejects missing fields', async () => {
    const res = await request(app)
      .post('/sales')
      .send({
        itemNumber: '',
        customerId: '',
        saleDate: '',
        quantity: '',
        unitPrice: ''
      });

    expect(res.statusCode).toBe(302);
    expect(res.header.location).toBe('/sales');
  });

  test('POST /sales/:id updates sale', async () => {
    const sale = { quantity: 5, itemNumber: 'ITEM001' };
    const item = { stock: 10, save: jest.fn().mockResolvedValue(true) };

    Sale.findById.mockResolvedValue(sale);
    Item.findOne.mockResolvedValue(item);
    Sale.findByIdAndUpdate.mockResolvedValue(true);

    const res = await request(app)
      .post('/sales/sale123')
      .send({ quantity: 3, unitPrice: 15 });

    expect(res.statusCode).toBe(302);
    expect(res.header.location).toBe('/sales');
  });

  test('POST /sales/delete/:id deletes sale and restores stock', async () => {
    const sale = { saleId: 'SALE0001', quantity: 5, itemNumber: 'ITEM001' };
    const item = { stock: 10, save: jest.fn().mockResolvedValue(true) };

    Sale.findById.mockResolvedValue(sale);
    Item.findOne.mockResolvedValue(item);
    Sale.findByIdAndDelete.mockResolvedValue(true);

    const res = await request(app).post('/sales/delete/sale123');

    expect(res.statusCode).toBe(302);
    expect(res.header.location).toBe('/sales');
    expect(item.stock).toBe(15); // stock increased by 5
    expect(item.save).toHaveBeenCalled();
    expect(Sale.findByIdAndDelete).toHaveBeenCalledWith('sale123');
  });
});
