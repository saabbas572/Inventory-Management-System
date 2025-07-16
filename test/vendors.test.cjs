const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    req.session = req.session || {};
    req.session.user = { id: 'user123' };
    next();
  }
}));

// Mock Vendor model with proper implementations
jest.mock('../models/Vendor', () => {
  const mockVendor = {
    _id: 'abc123',
    fullName: 'Test Vendor',
    phoneMobile: '1234567890',
    address: '123 Street',
    status: 'Active',
    save: jest.fn().mockResolvedValue(true)
  };

  return {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue([mockVendor]),
    findById: jest.fn().mockImplementation(id => 
      id === 'abc123' ? Promise.resolve(mockVendor) : Promise.resolve(null)
    ),
    findByIdAndUpdate: jest.fn().mockResolvedValue(mockVendor),
    findByIdAndDelete: jest.fn().mockImplementation(id =>
      id === 'abc123' ? Promise.resolve(mockVendor) : Promise.reject(new Error('Delete error'))
    ),
    prototype: {
      save: jest.fn().mockResolvedValue(true)
    }
  };
});

const Vendor = require('../models/Vendor');
const router = require('../routes/vendors');

describe('Vendors Router', () => {
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
      saveUninitialized: true // Changed to true to ensure session works
    }));
    app.use(flash());

    // Mock view rendering and CSRF token
    app.use((req, res, next) => {
      req.csrfToken = () => 'mock-csrf-token';
      req.flash = (type, msg) => {
        req.session[type] = msg || req.session[type];
        return req.session[type] || [];
      };
      res.render = (view, data) => res.status(200).json(data);
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

  describe('GET /vendors', () => {
    it('should list vendors successfully', async () => {
      const res = await request(app)
        .get('/vendors')
        .expect(200);

      expect(res.body.vendors).toBeInstanceOf(Array);
      expect(res.body.csrfToken).toBe('mock-csrf-token');
      expect(res.body.user.id).toBe('user123');
      expect(Vendor.find).toHaveBeenCalled();
    });
  });


  describe('POST /vendors/:id', () => {

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/vendors/abc123')
        .send({
          fullName: '',
          phoneMobile: '',
          address: ''
        })
        .expect(302);

      expect(res.headers.location).toBe('/vendors');
    });
  });

  describe('POST /vendors/delete/:id', () => {
    it('should delete vendor successfully', async () => {
      const res = await request(app)
        .post('/vendors/delete/abc123')
        .expect(302);

      expect(res.headers.location).toBe('/vendors');
      expect(Vendor.findByIdAndDelete).toHaveBeenCalledWith('abc123');
    });

    it('should handle delete failure', async () => {
      Vendor.findByIdAndDelete.mockRejectedValueOnce(new Error('Delete error'));

      const res = await request(app)
        .post('/vendors/delete/invalidid')
        .expect(302);

      expect(res.headers.location).toBe('/vendors');
    });
  });
});