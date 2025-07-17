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

// In your auth routes file
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      req.flash('error', 'Please provide both username and password');
      return res.redirect('/login');
    }

    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') }
    });

    if (!user) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(trimmedPassword, user.password);
    
    if (!isMatch) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }

    // Set session data
    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role || 'user'
    };

    // Save session before redirect
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error', 'Login failed');
        return res.redirect('/login');
      }
      req.flash('success', 'Logged in successfully');
      return res.redirect('/dashboard');
    });

  } catch (err) {
    console.error('Login error:', err);
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

router.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  try {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedUsername || !trimmedPassword || !trimmedConfirm) {
      req.flash('error', 'All fields are required');
      return res.redirect('/register');
    }

    if (trimmedPassword !== trimmedConfirm) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/register');
    }

    // Strong password regex:
    // Minimum 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!strongPasswordRegex.test(trimmedPassword)) {
      req.flash('error', 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.');
      return res.redirect('/register');
    }

    let user = await User.findOne({ 
      username: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') }
    });

    if (user) {
      req.flash('error', 'Username already exists');
      return res.redirect('/register');
    }

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    user = new User({
      username: trimmedUsername,
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
    console.error('Registration error:', err);
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
