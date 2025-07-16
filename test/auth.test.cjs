const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');

// 1. Create hashed password for mock user
const correctHashedPassword = bcrypt.hashSync('correct_password', 10);

jest.mock('../models/User', () => ({
  findOne: jest.fn().mockImplementation(async (query) => {
    if (query.username?.$regex?.test('existingUser')) {
      return {
        _id: '507f1f77bcf86cd799439011',
        username: 'existingUser',
        password: correctHashedPassword,
        role: 'user'
      };
    }
    return null;
  })
}));

describe('Auth Router', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
      secret: 'testsecret',
      resave: true,
      saveUninitialized: true,
      cookie: { secure: false }
    }));
    app.use(flash());
    
    // Load auth router
    const authRouter = require('../routes/auth');
    app.use('/', authRouter);
    
    // 2. Add minimal dashboard route for testing
    app.get('/dashboard', (req, res) => {
      if (!req.session.user) {
        return res.status(401).send('Unauthorized');
      }
      res.status(200).send('Dashboard');
    });
  });

  it('should login successfully with correct credentials', async () => {
    const agent = request.agent(app);
    
    // 3. Test login flow
    const loginResponse = await agent
      .post('/login')
      .type('form')
      .send({
        username: 'existingUser',
        password: 'correct_password'
      })
      .expect(302);
    
    expect(loginResponse.header.location).toBe('/dashboard');
    
    // 4. Test dashboard access
    const dashboardResponse = await agent
      .get('/dashboard')
      .expect(200);
    
    expect(dashboardResponse.text).toBe('Dashboard');
  });
});