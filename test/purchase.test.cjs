const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const flash = require('connect-flash');

// Mock models
jest.mock('../models/Purchase', () => {
  function MockPurchase(data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  }
  MockPurchase.find = jest.fn().mockReturnThis();
  MockPurchase.findById = jest.fn().mockReturnThis();
  MockPurchase.findOne = jest.fn().mockReturnThis();
  MockPurchase.findByIdAndUpdate = jest.fn().mockReturnThis();
  MockPurchase.findByIdAndDelete = jest.fn().mockReturnThis();
  MockPurchase.create = jest.fn().mockImplementation(data => Promise.resolve(new MockPurchase(data)));
  MockPurchase.populate = jest.fn().mockReturnThis();
  MockPurchase.sort = jest.fn().mockReturnThis();
  MockPurchase.lean = jest.fn().mockResolvedValue({});
  return MockPurchase;
});

jest.mock('../models/Item', () => {
  function MockItem(data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  }
  MockItem.find = jest.fn().mockReturnThis();
  MockItem.findOne = jest.fn().mockReturnThis();
  MockItem.sort = jest.fn().mockReturnThis();
  MockItem.lean = jest.fn().mockResolvedValue({});
  return MockItem;
});

jest.mock('../models/Vendor', () => {
  function MockVendor(data) {
    Object.assign(this, data);
  }
  MockVendor.find = jest.fn().mockReturnThis();
  MockVendor.findById = jest.fn().mockReturnThis();
  MockVendor.sort = jest.fn().mockReturnThis();
  MockVendor.lean = jest.fn().mockResolvedValue({});
  return MockVendor;
});

jest.mock('../models/sequence', () => ({
  findByIdAndUpdate: jest.fn().mockResolvedValue({ sequence_value: 1000 })
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    req.session.user = { _id: 'user123', username: 'testuser' };
    next();
  }
}));

// Mock csurf middleware
jest.mock('csurf', () => () => (req, res, next) => {
  req.csrfToken = () => 'mock-csrf-token';
  next();
});

describe('Purchases Router', () => {
  let app;
  let mongoServer;
  let Purchase, Item, Vendor, Sequence;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'test' });

    Purchase = require('../models/Purchase');
    Item = require('../models/Item');
    Vendor = require('../models/Vendor');
    Sequence = require('../models/sequence');

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({ 
      secret: 'test', 
      resave: false, 
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use(flash());

    // CSRF protection middleware
    const csrf = require('csurf');
    app.use(csrf({ cookie: false }));

    // Mock render function to send JSON response
    app.use((req, res, next) => {
      res.render = (view, options) => res.status(200).json(options);
      next();
    });

    app.use(require('../routes/purchases'));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- GET /purchases ---
  describe('GET /purchases', () => {
    

    test('should handle database errors', async () => {
      Purchase.find.mockImplementation(() => { throw new Error('DB Error'); });

      const res = await request(app).get('/purchases');

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/dashboard');
    });
  });

  // --- GET /purchases/:id ---
  describe('GET /purchases/:id', () => {
    test('should render purchase details page', async () => {
      const mockPurchase = { 
        _id: 'purchase123',
        purchaseId: 'PUR1001',
        itemNumber: 'ITEM001',
        vendor: { fullName: 'Test Vendor' }
      };
      const mockItem = { itemName: 'Test Item', itemNumber: 'ITEM001' };

      Purchase.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPurchase)
      });
      Item.findOne.mockResolvedValue(mockItem);

      const res = await request(app).get('/purchases/purchase123');

      expect(res.status).toBe(200);
      expect(res.body.purchase).toEqual(mockPurchase);
      expect(res.body.item).toEqual(mockItem);
      expect(res.body.csrfToken).toBe('mock-csrf-token');
    });

    test('should handle purchase not found', async () => {
      Purchase.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      const res = await request(app).get('/purchases/invalid123');

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });
  });

  // --- GET /purchases/:id/edit ---
  describe('GET /purchases/:id/edit', () => {

    test('should redirect if purchase not found', async () => {
      Purchase.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      const res = await request(app).get('/purchases/invalid123/edit');

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });
  });

  // --- POST /purchases ---
  describe('POST /purchases', () => {
    const validPurchase = {
      itemNumber: 'ITEM001',
      vendorId: 'vendor123',
      purchaseDate: '2023-01-01',
      quantity: '10',
      unitPrice: '100',
      _csrf: 'mock-csrf-token'
    };

    test('should create new purchase with valid data', async () => {
      const mockItem = { 
        itemName: 'Test Item',
        itemNumber: 'ITEM001',
        stock: 5,
        save: jest.fn().mockResolvedValue(true)
      };
      const mockVendor = { fullName: 'Test Vendor' };

      Item.findOne.mockResolvedValue(mockItem);
      Vendor.findById.mockResolvedValue(mockVendor);
      Sequence.findByIdAndUpdate.mockResolvedValue({ sequence_value: 1001 });

      const res = await request(app)
        .post('/purchases')
        .type('form')
        .send(validPurchase);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
      expect(Purchase.create).toHaveBeenCalledWith(expect.objectContaining({
        itemNumber: 'ITEM001',
        vendor: 'vendor123',
        quantity: 10,
        unitPrice: 100,
        totalCost: 1000
      }));
      expect(mockItem.stock).toBe(15); // 5 + 10
      expect(mockItem.save).toHaveBeenCalled();
    });

    test('should reject invalid quantity', async () => {
      const res = await request(app)
        .post('/purchases')
        .type('form')
        .send({ ...validPurchase, quantity: '0' });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });

    test('should reject invalid unit price', async () => {
      const res = await request(app)
        .post('/purchases')
        .type('form')
        .send({ ...validPurchase, unitPrice: '-10' });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });

    test('should handle item not found', async () => {
      Item.findOne.mockResolvedValue(null);
      Vendor.findById.mockResolvedValue({});

      const res = await request(app)
        .post('/purchases')
        .type('form')
        .send(validPurchase);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });

    test('should handle vendor not found', async () => {
      Item.findOne.mockResolvedValue({});
      Vendor.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/purchases')
        .type('form')
        .send(validPurchase);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });

    test('should handle database errors', async () => {
      Item.findOne.mockImplementation(() => { throw new Error('DB Error'); });

      const res = await request(app)
        .post('/purchases')
        .type('form')
        .send(validPurchase);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });
  });

  // --- POST /purchases/:id/update ---
  describe('POST /purchases/:id/update', () => {
    const validUpdate = {
      quantity: '20',
      unitPrice: '150',
      _csrf: 'mock-csrf-token'
    };

    test('should update purchase with valid data', async () => {
      const mockPurchase = {
        _id: 'purchase123',
        itemNumber: 'ITEM001',
        quantity: 10,
        unitPrice: 100,
        totalCost: 1000,
        save: jest.fn().mockResolvedValue(true)
      };
      const mockItem = { 
        itemNumber: 'ITEM001',
        stock: 5,
        save: jest.fn().mockResolvedValue(true)
      };

      Purchase.findById.mockResolvedValue(mockPurchase);
      Item.findOne.mockResolvedValue(mockItem);

      const res = await request(app)
        .post('/purchases/purchase123/update')
        .type('form')
        .send(validUpdate);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
      expect(mockPurchase.quantity).toBe(20);
      expect(mockPurchase.unitPrice).toBe(150);
      expect(mockPurchase.totalCost).toBe(3000);
      expect(mockItem.stock).toBe(15); // 5 - 10 (old) + 20 (new)
      expect(mockPurchase.save).toHaveBeenCalled();
      expect(mockItem.save).toHaveBeenCalledTimes(2); // stock adjusted twice
    });

    test('should reject invalid quantity', async () => {
      const res = await request(app)
        .post('/purchases/purchase123/update')
        .type('form')
        .send({ ...validUpdate, quantity: '0' });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('/purchases/purchase123/edit');
    });

    test('should reject invalid unit price', async () => {
      const res = await request(app)
        .post('/purchases/purchase123/update')
        .type('form')
        .send({ ...validUpdate, unitPrice: '-10' });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('/purchases/purchase123/edit');
    });

    test('should handle purchase not found', async () => {
      Purchase.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/purchases/invalid123/update')
        .type('form')
        .send(validUpdate);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });

    test('should handle database errors', async () => {
      Purchase.findById.mockImplementation(() => { throw new Error('DB Error'); });

      const res = await request(app)
        .post('/purchases/purchase123/update')
        .type('form')
        .send(validUpdate);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('/purchases/purchase123/edit');
    });
  });

  // --- POST /purchases/:id/delete ---
  describe('POST /purchases/:id/delete', () => {
    test('should delete purchase and adjust stock', async () => {
      const mockPurchase = {
        _id: 'purchase123',
        purchaseId: 'PUR1001',
        itemNumber: 'ITEM001',
        quantity: 10
      };
      const mockItem = { 
        itemNumber: 'ITEM001',
        stock: 15,
        save: jest.fn().mockResolvedValue(true)
      };

      Purchase.findById.mockResolvedValue(mockPurchase);
      Item.findOne.mockResolvedValue(mockItem);
      Purchase.findByIdAndDelete.mockResolvedValue(mockPurchase);

      const res = await request(app)
        .post('/purchases/purchase123/delete')
        .type('form')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
      expect(mockItem.stock).toBe(5); // 15 - 10
      expect(mockItem.save).toHaveBeenCalled();
      expect(Purchase.findByIdAndDelete).toHaveBeenCalledWith('purchase123');
    });

    test('should handle purchase not found', async () => {
      Purchase.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/purchases/invalid123/delete')
        .type('form')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });

    test('should handle database errors', async () => {
      Purchase.findById.mockImplementation(() => { throw new Error('DB Error'); });

      const res = await request(app)
        .post('/purchases/purchase123/delete')
        .type('form')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/purchases');
    });
  });
});
