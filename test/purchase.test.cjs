const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const session = require('express-session');
const flash = require('connect-flash');

const router = require('../routes/purchases');

// Mock middleware
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    if (!req.session) req.session = {};
    req.session.user = { _id: 'user123' }; // What the route expects
    next();
  }
}));



// Mock models
jest.mock('../models/Purchase', () => {
  const mockPurchase = {
    _id: 'purchase123',
    purchaseId: 'PUR0001',
    itemNumber: 'ITEM001',
    itemName: 'Test Item',
    quantity: 5,
    unitPrice: 10,
    totalCost: 50,
    vendor: 'vendor123',
    purchaseDate: new Date()
  };

  const mockFind = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue([mockPurchase])
    })
  });

  return {
    find: mockFind,
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue([mockPurchase]),
    countDocuments: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue(mockPurchase),
    findById: jest.fn((id) =>
      id === 'purchase123' ? Promise.resolve(mockPurchase) : Promise.resolve(null)
    ),
    findByIdAndDelete: jest.fn().mockResolvedValue(true)
  };
});

jest.mock('../models/Item', () => ({
  find: jest.fn().mockResolvedValue([{
    itemNumber: 'ITEM001',
    itemName: 'Test Item',
    stock: 10,
    status: 'Active'
  }]),
  findOne: jest.fn(({ itemNumber }) =>
    itemNumber === 'ITEM001'
      ? Promise.resolve({
          itemNumber: 'ITEM001',
          itemName: 'Test Item',
          stock: 10,
          save: jest.fn().mockResolvedValue(true)
        })
      : Promise.resolve(null)
  )
}));

jest.mock('../models/Vendor', () => ({
  find: jest.fn().mockResolvedValue([{
    _id: 'vendor123',
    fullName: 'Test Vendor',
    status: 'Active'
  }]),
  findById: jest.fn((id) =>
    id === 'vendor123'
      ? Promise.resolve({
          _id: 'vendor123',
          fullName: 'Test Vendor'
        })
      : Promise.resolve(null)
  )
}));

describe('Purchases Router', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'test' });

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({
      secret: 'testsecret',
      resave: false,
      saveUninitialized: false,
    }));
    app.use(flash());

    app.use((req, res, next) => {
      req.csrfToken = () => 'test-csrf-token';
      req.flash = (type, msg) => {}; // ignore actual flash for test
      res.render = (view, data) => res.status(200).send(view); // fake render
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


  describe('POST /purchases', () => {

    it('should reject invalid input', async () => {
      const res = await request(app)
        .post('/purchases')
        .send({
          itemNumber: '',
          vendorId: '',
          quantity: '0',
          unitPrice: '0'
        });

      expect(res.statusCode).toBe(302);
    });


    it('should fail when item not found', async () => {
      require('../models/Item').findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/purchases')
        .send({
          itemNumber: 'NONEXISTENT',
          vendorId: 'vendor123',
          quantity: '5',
          unitPrice: '10'
        });

      expect(res.statusCode).toBe(302);
    });
  });
});
