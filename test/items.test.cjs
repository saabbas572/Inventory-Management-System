const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock Item model with complete implementation
jest.mock('../models/Item', () => {
  // Mock constructor

  const mockSave = jest.fn();

  function MockItem(data) {
    Object.assign(this, data);
    this.save = mockSave;
  }

  // Static methods
  MockItem.find = jest.fn().mockReturnThis();
  MockItem.findById = jest.fn().mockReturnThis();
  MockItem.findOne = jest.fn().mockReturnThis();
  MockItem.findByIdAndUpdate = jest.fn();
  MockItem.findByIdAndDelete = jest.fn().mockReturnThis();
  MockItem.sort = jest.fn().mockReturnThis();
  MockItem.lean = jest.fn().mockImplementation(function() {
    return Promise.resolve(this);
  });

  return MockItem;
});

const Item = require('../models/Item');

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    req.session.user = { _id: 'user123' };
    next();
  }
}));

// Mock csurf middleware
jest.mock('csurf', () => () => (req, res, next) => {
  req.csrfToken = () => 'mock-csrf-token';
  next();
});

describe('Items Router', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'test' });

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({ 
      secret: 'test', 
      resave: false, 
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    
    // Mock CSRF protection
    const csrf = require('csurf');
    app.use(csrf({ cookie: false }));

    // Mock render function
    app.use((req, res, next) => {
      res.render = (view, options) => res.status(200).json(options);
      next();
    });

    app.use(require('../routes/items'));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /items', () => {
    test('should render items page with filtered items', async () => {
      const mockItems = [
        { itemName: 'Test Item 1', status: 'Active' },
        { itemName: 'Test Item 2', status: 'Active' }
      ];
      
      Item.lean.mockResolvedValue(mockItems);

      const res = await request(app)
        .get('/items?status=Active&search=Test');

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual(mockItems);
      expect(res.body.currentStatus).toBe('Active');
      expect(res.body.searchQuery).toBe('Test');
      expect(Item.find).toHaveBeenCalledWith({
        status: 'Active',
        $or: [
          { itemNumber: { $regex: 'Test', $options: 'i' } },
          { itemName: { $regex: 'Test', $options: 'i' } },
          { description: { $regex: 'Test', $options: 'i' } }
        ]
      });
      expect(Item.sort).toHaveBeenCalledWith({ itemName: 1 });
    });

    test('should handle database errors', async () => {
      Item.find.mockImplementation(() => { throw new Error('DB Error'); });

      const res = await request(app).get('/items');

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/items?error=Failed%20to%20load%20items');
    });
  });

  describe('GET /items/:id', () => {
    test('should return item JSON data', async () => {
      const mockItem = { 
        _id: '123', 
        itemName: 'Test Item',
        itemNumber: 'ITEM001',
        status: 'Active'
      };
      Item.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockItem)
      });

      const res = await request(app).get('/items/123');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockItem);
      expect(Item.findById).toHaveBeenCalledWith('123');
    });

    test('should return 404 for non-existent item', async () => {
      Item.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const res = await request(app).get('/items/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Item not found');
    });

    test('should handle database errors', async () => {
      Item.findById.mockImplementation(() => { throw new Error('DB Error'); });

      const res = await request(app).get('/items/123');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch item');
    });
  });

  describe('POST /items', () => {
    const validItem = {
      itemNumber: 'ITEM001',
      itemName: 'Test Item',
      unitPrice: '100',
      discountPercent: '5',
      stock: '10',
      status: 'Active',
      _csrf: 'mock-csrf-token'
    };

    test('should create new item with valid data', async () => {
      // Mock no existing item
      Item.findOne.mockResolvedValue(null);
      
      // Create a mock item instance
      const mockItem = new Item({
        ...validItem,
        _id: 'new123',
        createdBy: 'user123'
      });
      
      // Mock the save method
      mockItem.save.mockResolvedValue(mockItem);

      const res = await request(app)
        .post('/items')
        .type('form')
        .send(validItem);

      expect(res.status).toBe(302);
      expect(mockItem.save).toHaveBeenCalled();
      expect(res.header.location).toContain('success=Item%20%22Test%20Item%22%20added%20successfully');
    });

    test('should reject duplicate item numbers', async () => {
      Item.findOne.mockResolvedValue({ itemNumber: 'ITEM001' });

      const res = await request(app)
        .post('/items')
        .type('form')
        .send(validItem);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=Item%20number%20already%20exists');
    });

    test('should validate required fields', async () => {
      const res = await request(app)
        .post('/items')
        .type('form')
        .send({
          ...validItem,
          itemNumber: '',
          itemName: '',
          unitPrice: ''
        });

      expect(res.status).toBe(302);
const decodedLocation = decodeURIComponent(res.header.location);
expect(decodedLocation).toContain('error=Item number, name, and unit price are required');
    });

 test('should validate numeric fields', async () => {
  // Make sure no duplicate item triggers
  Item.findOne.mockResolvedValue(null);

  // Optionally mock save to succeed if save is called
  const mockItemInstance = new Item(validItem);
  mockItemInstance.save = jest.fn().mockResolvedValue(mockItemInstance);
  // Or mock Item.prototype.save globally if needed

  const res = await request(app)
    .post('/items')
    .type('form')  // Important for express.urlencoded to parse
    .send({
      ...validItem,
      unitPrice: 'invalid'
    });

  expect(res.status).toBe(302);
    const decodedLocation = decodeURIComponent(res.header.location);

expect(decodedLocation).toContain('error=Discount, stock, and price must be numbers');
});


    test('should validate positive unit price', async () => {
  // Mock no duplicate for this test case
  Item.findOne.mockResolvedValue(null);

  const res = await request(app)
    .post('/items')
    .type('form')
    .send({
      itemNumber: 'UNIQUE001',
      itemName: 'Invalid Unit Price Item',
      unitPrice: -50,
      stock: 10,
      discountPercent: 5,
      status: 'Active',
      description: 'Test item',
    });

  expect(res.status).toBe(302);
  expect(res.header.location).toContain('error=Unit%20price%20must%20be%20greater%20than%200');
});


    test('should handle save errors', async () => {
      Item.findOne.mockResolvedValue(null);
      const mockItem = new Item(validItem);
      mockItem.save.mockRejectedValue(new Error('Save failed'));

      const res = await request(app)
        .post('/items')
        .send(validItem);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=Failed%20to%20add%20item');
    });
  });

  describe('POST /items/items/:id (Update)', () => {
    const updateData = {
      itemNumber: 'UPD001',
      itemName: 'Updated Item',
      unitPrice: '150',
      discountPercent: '10',
      stock: '20',
      status: 'Active',
      _csrf: 'mock-csrf-token'
    };

    test('should update existing item', async () => {
  // Mock a successful update by returning the updated item
  Item.findByIdAndUpdate.mockResolvedValue({
    _id: '123',
    itemName: 'Updated Item',
    itemNumber: 'UPD001',
    unitPrice: 150,
    discountPercent: 10,
    stock: 20,
    status: 'Active'
  });

  const res = await request(app)
    .post('/items/123')
    .type('form')
    .send(updateData);

  expect(res.status).toBe(302);
  expect(res.header.location).toContain('success=Item%20%22Updated%20Item%22%20updated%20successfully');
  expect(Item.findByIdAndUpdate).toHaveBeenCalledWith(
    '123',
    {
      itemNumber: 'UPD001',
      itemName: 'Updated Item',
      description: undefined,
      discountPercent: 10,
      stock: 20,
      unitPrice: 150,
      status: 'Active',
      updatedBy: 'user123',
      updatedAt: expect.any(Number)
    }
  );
});

    test('should handle update errors', async () => {
      Item.findByIdAndUpdate.mockRejectedValue(new Error('Update failed'));

      const res = await request(app)
        .post('/items/123')
        .send(updateData);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=Failed%20to%20update%20item');
    });
  });

  describe('POST /items/toggle-status/:id', () => {
    test('should toggle item status', async () => {
      const mockItem = new Item({
        _id: '123',
        status: 'Active'
      });
      mockItem.save.mockResolvedValue(mockItem);
      Item.findById.mockResolvedValue(mockItem);

      const res = await request(app)
        .post('/items/toggle-status/123')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(mockItem.status).toBe('Inactive');
      expect(mockItem.save).toHaveBeenCalled();
      expect(res.header.location).toContain('success=Item%20status%20changed%20to%20Inactive');
    });

    test('should handle item not found', async () => {
      Item.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/items/toggle-status/123')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=Item%20not%20found');
    });

    test('should handle save errors', async () => {
      const mockItem = new Item({
        _id: '123',
        status: 'Active'
      });
      mockItem.save.mockRejectedValue(new Error('Save failed'));
      Item.findById.mockResolvedValue(mockItem);

      const res = await request(app)
        .post('/items/toggle-status/123')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=Failed%20to%20update%20item%20status');
    });
  });

  describe('POST /items/delete/:id', () => {
    test('should delete item', async () => {
      Item.findByIdAndDelete.mockResolvedValue({ 
        itemName: 'Deleted Item',
        _id: '123'
      });

      const res = await request(app)
        .post('/items/delete/123')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('success=Item%20%22Deleted%20Item%22%20deleted%20successfully');
      expect(Item.findByIdAndDelete).toHaveBeenCalledWith('123');
    });

    test('should handle item not found', async () => {
      Item.findByIdAndDelete.mockResolvedValue(null);

      const res = await request(app)
        .post('/items/delete/123')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=Item%20not%20found');
    });

    test('should handle delete errors', async () => {
      Item.findByIdAndDelete.mockRejectedValue(new Error('Delete failed'));

      const res = await request(app)
        .post('/items/delete/123')
        .send({ _csrf: 'mock-csrf-token' });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=Failed%20to%20delete%20item');
    });
  });
});