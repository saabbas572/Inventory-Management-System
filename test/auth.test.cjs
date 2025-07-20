const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');

jest.mock('../models/User');
const User = require('../models/User');

const authRoutes = require('../routes/auth'); // adjust path if needed

describe('Auth Routes', () => {
  let app;

beforeEach(() => {
  app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(session({
    secret: 'testsecret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));
  app.use(flash());

  // Mock req.csrfToken middleware
  app.use((req, res, next) => {
    req.csrfToken = () => 'mock-csrf-token';
    next();
  });

  // Add session destroy and clearCookie mocks here with default no-op
  app.use((req, res, next) => {
    if (!req.session) req.session = {};
    if (!req.session.destroy) req.session.destroy = (cb) => cb();
    if (!res.clearCookie) res.clearCookie = () => {};
    next();
  });

  // Now mount the auth routes
  app.use(authRoutes);
});


  afterEach(() => {
    jest.clearAllMocks();
  });


  describe('POST /login', () => {
  it('should fail if username or password missing', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')  // Added here
      .send({ username: '', password: '' });
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/login');
  });

  it('should fail if user not found', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/login')
      .type('form')  // Added here
      .send({ username: 'noone', password: 'password' });
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/login');
  });

  it('should fail if password does not match', async () => {
    const user = { password: await bcrypt.hash('correct', 10) };
    User.findOne.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const res = await request(app)
      .post('/login')
      .type('form')  // Added here
      .send({ username: 'user', password: 'wrong' });
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/login');
  });

  it('should login successfully and redirect to /dashboard', async () => {
    const user = {
      _id: 'user123',
      username: 'testuser',
      password: await bcrypt.hash('password', 10),
      role: 'user'
    };
    User.findOne.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const res = await request(app)
      .post('/login')
      .type('form')  // Added here
      .send({ username: 'testuser', password: 'password' });

    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/dashboard');
  });
});


  describe('POST /register', () => {
  const validUser = {
    username: 'newuser',
    password: 'Password1!',
    confirmPassword: 'Password1!'
  };

  it('should fail if any field missing', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')  // Added here
      .send({ username: '', password: '', confirmPassword: '' });
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/register');
  });

  it('should fail if passwords do not match', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')  // Added here
      .send({ username: 'user', password: 'pass', confirmPassword: 'notmatch' });
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/register');
  });

  it('should fail if password is weak', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')  // Added here
      .send({ username: 'user', password: 'weak', confirmPassword: 'weak' });
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/register');
  });

  it('should fail if username already exists', async () => {
    User.findOne.mockResolvedValue({ username: 'existing' });
    const res = await request(app)
      .post('/register')
      .type('form')  // Added here
      .send(validUser);
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/register');
  });

  it('should register successfully and redirect to /dashboard', async () => {
    User.findOne.mockResolvedValue(null);
    User.prototype.save = jest.fn().mockResolvedValue(true);

    const res = await request(app)
      .post('/register')
      .type('form')  // Added here
      .send(validUser);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/dashboard');
    expect(User.prototype.save).toHaveBeenCalled();
  });
});

  describe('GET /logout', () => {
  let app;
  let destroyMock;
  let clearCookieMock;

  beforeEach(() => {
    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use(session({
      secret: 'testsecret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    destroyMock = jest.fn(cb => cb()); // successful destroy by default
    clearCookieMock = jest.fn();

    // **Important: Insert mocks before routes**
    app.use((req, res, next) => {
      // Inject mock session destroy function
      req.session = req.session || {};
      req.session.destroy = destroyMock;

      // Inject mock clearCookie function
      res.clearCookie = clearCookieMock;
      next();
    });

    // Then mount your auth routes
    app.use(authRoutes);
  });

  it('should destroy session and redirect to login', async () => {
    const res = await request(app).get('/logout');

    expect(destroyMock).toHaveBeenCalled();
    expect(clearCookieMock).toHaveBeenCalledWith('connect.sid');
    expect(res.header.location).toBe('/login');
  });

  it('should redirect to dashboard if session destroy error', async () => {
    // Change destroyMock to simulate error for this test
    destroyMock.mockImplementationOnce(cb => cb(new Error('fail')));

    const res = await request(app).get('/logout');

    expect(destroyMock).toHaveBeenCalled();
    expect(clearCookieMock).not.toHaveBeenCalled();
    expect(res.header.location).toBe('/dashboard');
  });
});

});
