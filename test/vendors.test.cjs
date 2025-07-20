const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const flash = require('connect-flash');

// Mock Vendor model
jest.mock('../models/Vendor', () => {
  function MockVendor(data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  }

  MockVendor.find = jest.fn(() => ({
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([])
  }));

  MockVendor.findById = jest.fn(() => ({
    lean: jest.fn().mockResolvedValue(null)
  }));

  MockVendor.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  MockVendor.findByIdAndDelete = jest.fn().mockResolvedValue({});
  MockVendor.create = jest.fn(data => Promise.resolve(new MockVendor(data)));

  return MockVendor;
});

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    req.session = req.session || {};
    req.session.user = { _id: 'user123', username: 'testuser' };
    next();
  }
}));

// Mock csurf middleware
jest.mock('csurf', () => () => (req, res, next) => {
  req.csrfToken = () => 'mock-csrf-token';
  next();
});

describe('Vendor Router', () => {
  let app;
  let mongoServer;
  let Vendor;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'test' });

    Vendor = require('../models/Vendor');

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({
      secret: 'test',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use(flash());

    const csrf = require('csurf');
    app.use(csrf({ cookie: false }));

    // Replace res.render with json output for testing ease
    app.use((req, res, next) => {
      res.render = (view, options) => res.status(200).json(options);
      next();
    });

    app.use(require('../routes/vendors'));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /vendors', () => {

    test('should handle database errors', async () => {
      Vendor.find.mockImplementation(() => { throw new Error('DB Error'); });

      const res = await request(app).get('/vendors');

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/');
    });
  });

  describe('GET /vendors/:id', () => {
    test('should return vendor JSON data', async () => {
  const mockVendor = {
    _id: 'vendor123',
    fullName: 'Test Vendor',
    status: 'Active'
  };

  // Proper mock: returns mockVendor directly
  Vendor.findById = jest.fn().mockResolvedValue(mockVendor);

  const res = await request(app).get('/vendors/vendor123');

  expect(res.status).toBe(200);
  expect(res.body).toEqual(mockVendor);
});


    test('should return 404 for non-existent vendor', async () => {
  Vendor.findById.mockResolvedValue(null); // ✅ Simulate not found

  const res = await request(app).get('/vendors/invalid123');

  expect(res.status).toBe(404);
  expect(res.body.error).toBe('Vendor not found');
});

  });

  describe('POST /vendors', () => {
    const validVendor = {
      fullName: 'New Vendor',
      phoneMobile: '1234567890',
      address: '123 Main St',
      _csrf: 'mock-csrf-token'
    };

    

    test('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/vendors')
        .type('form')
        .send({
          ...validVendor,
          fullName: '',
          phoneMobile: ''
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/vendors');
    });
  });

  describe('POST /vendors/:id', () => {
    const validUpdate = {
      fullName: 'Updated Vendor',
      phoneMobile: '9876543210',
      address: '456 Oak Ave',
      _csrf: 'mock-csrf-token'
    };

    test('should update vendor with valid data', async () => {
      Vendor.findByIdAndUpdate.mockResolvedValue({});

      const res = await request(app)
        .post('/vendors/vendor123')
        .type('form')
        .send(validUpdate);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/vendors');
expect(Vendor.findByIdAndUpdate).toHaveBeenCalledWith(
  'vendor123',
  expect.objectContaining({
    fullName: 'Updated Vendor',
    phoneMobile: '9876543210',
    address: '456 Oak Ave',
    address2: expect.any(String),
    city: expect.any(String),
    district: expect.any(String),
    phone2: expect.any(String),
    email: undefined,
    status: undefined,
    updatedAt: expect.any(Number)
  })
);


    });

    test('should reject missing required fields on update', async () => {
      const res = await request(app)
        .post('/vendors/vendor123')
        .type('form')
        .send({
          fullName: '',
          phoneMobile: '',
          address: '',
          _csrf: 'mock-csrf-token'
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/vendors');
    });
  });

  describe('POST /vendors/delete/:id', () => {
    test('should delete vendor', async () => {
      Vendor.findByIdAndDelete.mockResolvedValue({});

      const res = await request(app)
        .post('/vendors/delete/vendor123')
        .type('form')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/vendors');
      expect(Vendor.findByIdAndDelete).toHaveBeenCalledWith('vendor123');
    });
  });
});
