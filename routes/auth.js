const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../middleware/auth'); // if you use it elsewhere

// Login Page
router.get('/login', (req, res) => {
  res.render('login', { 
    error: req.flash('error')[0] || null,
    success: req.flash('success')[0] || null,
    csrfToken: req.csrfToken() // Add CSRF token here too if login uses POST
  });
});

// Login Handle
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      req.flash('error', 'Please provide both username and password');
      return res.redirect('/login');
    }

    const user = await User.findOne({ username });

    if (!user) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role || 'user'
    };

    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error', 'Login failed');
        return res.redirect('/login');
      }
      req.flash('success', 'Logged in successfully');
      res.redirect('/dashboard');
    });

  } catch (err) {
    console.error(err);
    req.flash('error', 'Login failed');
    res.redirect('/login');
  }
});

// Register Page
router.get('/register', (req, res) => {
  res.render('register', {
    error: req.flash('error')[0] || null,
    csrfToken: req.csrfToken()  // <-- CSRF token sent here
  });
});

// Register Handle
router.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  try {
    if (!username || !password || !confirmPassword) {
      req.flash('error', 'All fields are required');
      return res.redirect('/register');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/register');
    }

    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters');
      return res.redirect('/register');
    }

    let user = await User.findOne({ username });
    if (user) {
      req.flash('error', 'Username already exists');
      return res.redirect('/register');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      password: hashedPassword
    });

    await user.save();

    req.session.user = {
      id: user._id,
      username: user.username,
      role: 'user'
    };

    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error', 'Registration complete but login failed');
        return res.redirect('/login');
      }
      req.flash('success', 'Registration successful! You are now logged in');
      res.redirect('/dashboard');
    });

  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed');
    res.redirect('/register');
  }
});

// Logout Handle
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.redirect('/dashboard');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

module.exports = router;
