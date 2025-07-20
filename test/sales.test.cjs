const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const flash = require('connect-flash');

jest.mock('../models/Sale', () => {
  class MockSale {
    constructor(data) {
      Object.assign(this, data);
    }
    save() {
      return Promise.resolve(this);
    }
  }

  MockSale.find = jest.fn().mockReturnThis();
  MockSale.findById = jest.fn().mockReturnThis();
  MockSale.findOne = jest.fn().mockReturnThis();
  MockSale.findByIdAndUpdate = jest.fn().mockReturnThis();
  MockSale.findByIdAndDelete = jest.fn().mockReturnThis();
  MockSale.countDocuments = jest.fn().mockResolvedValue(0);
  MockSale.sort = jest.fn().mockReturnThis();
  MockSale.lean = jest.fn().mockResolvedValue({});

  return MockSale;
});


jest.mock('../models/Item', () => {
  function MockItem(data) {
    Object.assign(this, data);
    this.save = jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    });
  }

  MockItem.find = jest.fn();
  MockItem.findOne = jest.fn();
  MockItem.sort = jest.fn();
  MockItem.lean = jest.fn();

  return MockItem;
});

jest.mock('../models/Customer', () => {
  function MockCustomer(data) {
    Object.assign(this, data);
  }

  MockCustomer.find = jest.fn();
  MockCustomer.findOne = jest.fn();
  MockCustomer.sort = jest.fn();
  MockCustomer.lean = jest.fn();

  return MockCustomer;
});

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

describe('Sales Router', () => {
  let app;
  let mongoServer;
  let Sale, Item, Customer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'test' });

    Sale = require('../models/Sale');
    Item = require('../models/Item');
    Customer = require('../models/Customer');

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({
      secret: 'test',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use(flash());

    // Mock CSRF protection
    const csrf = require('csurf');
    app.use(csrf({ cookie: false }));

    // Mock render function to respond with JSON
    app.use((req, res, next) => {
      res.render = (view, options) => res.status(200).json(options);
      next();
    });

    app.use(require('../routes/sales'));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /sales', () => {
    test('should render sales page with sales data', async () => {
  const mockSales = [{ saleId: 'SALE0001', itemName: 'Test Item' }];
  const mockItems = [{ itemName: 'Test Item', itemNumber: 'ITEM001', status: 'Active' }];
  const mockCustomers = [{ fullName: 'Test Customer', _id: 'cust123', status: 'Active' }];

  Sale.find.mockImplementation(() => ({
    sort: jest.fn().mockResolvedValue(mockSales),  // resolve array directly
  }));

  Item.find.mockImplementation(() => ({
    sort: jest.fn().mockResolvedValue(mockItems),
  }));

  Customer.find.mockImplementation(() => ({
    sort: jest.fn().mockResolvedValue(mockCustomers),
  }));

  const res = await request(app).get('/sales');

  expect(res.status).toBe(200);
  expect(res.body.sales).toEqual(mockSales);
  expect(res.body.items).toEqual(mockItems);
  expect(res.body.customers).toEqual(mockCustomers);
  expect(res.body.csrfToken).toBe('mock-csrf-token');
  expect(res.body.user).toEqual({ _id: 'user123', username: 'testuser' });
});


    test('should handle database errors', async () => {
      Sale.find.mockImplementation(() => { throw new Error('DB Error'); });

      const res = await request(app).get('/sales');

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/dashboard');
    });
  });

  describe('GET /sales/:id', () => {
  test('should return sale JSON data', async () => {
    const mockSale = { 
      _id: 'sale123', 
      saleId: 'SALE0001',
      itemName: 'Test Item'
    };

    Sale.findById.mockResolvedValue(mockSale);

    const res = await request(app).get('/sales/sale123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockSale);
  });

  test('should return 404 for non-existent sale', async () => {
    Sale.findById.mockResolvedValue(null);

    const res = await request(app).get('/sales/invalid123');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sale not found');
  });
});


  describe('POST /sales', () => {
    const validSale = {
      itemNumber: 'ITEM001',
      customerId: 'cust123',
      saleDate: '2023-01-01',
      quantity: '2',
      unitPrice: '100',
      _csrf: 'mock-csrf-token'
    };

    test('should create new sale with valid data', async () => {
  const mockItem = {
    itemName: 'Test Item',
    itemNumber: 'ITEM001',
    stock: 10,
    discountPercent: 10,
    save: jest.fn().mockResolvedValue(true)
  };
  const mockCustomer = { fullName: 'Test Customer' };

  Item.findOne.mockResolvedValue(mockItem);
  Customer.findOne.mockResolvedValue(mockCustomer);
  Sale.findOne.mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue({ saleId: 'SALE0000' })
  });

  // Spy on Sale.prototype.save to verify it's called
  const saveSpy = jest.spyOn(Sale.prototype, 'save').mockResolvedValue();

  const res = await request(app)
    .post('/sales')
    .type('form')
    .send(validSale);

  expect(res.status).toBe(302);
  expect(res.header.location).toBe('/sales');
  expect(mockItem.stock).toBe(8); // 10 - 2
  expect(mockItem.save).toHaveBeenCalled();
  expect(saveSpy).toHaveBeenCalled();

  saveSpy.mockRestore();
});

    test('should reject invalid quantity', async () => {
      const res = await request(app)
        .post('/sales')
        .type('form')
        .send({
          ...validSale,
          quantity: '0'
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/sales');
    });

    test('should handle insufficient stock', async () => {
      const mockItem = {
        itemName: 'Test Item',
        itemNumber: 'ITEM001',
        stock: 1,
        save: jest.fn()
      };
      Item.findOne.mockResolvedValue(mockItem);

      const res = await request(app)
        .post('/sales')
        .type('form')
        .send({
          ...validSale,
          quantity: '2'
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/sales');
    });
  });

  describe('POST /sales/:id', () => {
    const validUpdate = {
      itemNumber: 'ITEM001',
      customerId: 'cust123',
      saleDate: '2023-01-01',
      quantity: '3',
      unitPrice: '100',
      _csrf: 'mock-csrf-token'
    };

    test('should update sale with valid data', async () => {
      const mockSale = {
        _id: 'sale123',
        itemNumber: 'ITEM001',
        quantity: 2,
        save: jest.fn()
      };
      const mockItem = {
        itemNumber: 'ITEM001',
        stock: 5,
        save: jest.fn()
      };

      Sale.findById.mockResolvedValue(mockSale);
      Item.findOne.mockResolvedValue(mockItem);

      const res = await request(app)
        .post('/sales/sale123')
        .type('form')
        .send(validUpdate);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/sales');
      expect(mockItem.stock).toBe(4); // 5 - (3-2)
      expect(mockItem.save).toHaveBeenCalled();
    });
  });

  describe('POST /sales/delete/:id', () => {
    test('should delete sale and restore stock', async () => {
      const mockSale = {
        _id: 'sale123',
        saleId: 'SALE0001',
        itemNumber: 'ITEM001',
        quantity: 2
      };
      const mockItem = {
        itemNumber: 'ITEM001',
        stock: 5,
        save: jest.fn()
      };

      Sale.findById.mockResolvedValue(mockSale);
      Item.findOne.mockResolvedValue(mockItem);
      Sale.findByIdAndDelete.mockResolvedValue(mockSale);

      const res = await request(app)
        .post('/sales/delete/sale123')
        .type('form')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/sales');
      expect(mockItem.stock).toBe(7); // 5 + 2
      expect(mockItem.save).toHaveBeenCalled();
    });
  });
});
