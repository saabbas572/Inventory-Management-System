require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const csrf = require('csurf');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo');
// Add this with your other route imports
const reportsRoutes = require('./routes/reports');

const dashboardRoutes = require('./routes/dashboard');

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware setup - ORDER MATTERS!
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true, // Changed from false to ensure saves
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // reduces session writes
  }),
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Flash messages (requires session)
app.use(flash());

// CSRF protection (requires session)
const csrfProtection = csrf();
app.use(csrfProtection);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make flash messages and user available to all views
// app.use((req, res, next) => {
//   res.locals.successMessage = req.flash('success') || [];
//   res.locals.errorMessage = req.flash('error') || [];
//   res.locals.csrfToken = req.csrfToken();
//   next();
// });

app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
res.locals.successMessage = req.flash('success') || [];
  res.locals.errorMessage = req.flash('error') || [];
  if (!req.session.flash) {
    req.session.flash = {};
  }

  console.log('Flash messages:', {
    error: req.flash('error'),
    success: req.flash('success')
  });
    res.locals.user = req.session.user || null;
  next();
});

// Routes - mount dashboardRoutes first so /dashboard is handled there
app.use('/', dashboardRoutes);
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/customers'));
app.use('/', require('./routes/items'));
app.use('/', require('./routes/vendors'));
app.use('/', require('./routes/purchases'));
app.use('/', require('./routes/sales'));
app.use('/', require('./routes/search'));
app.use('/reports', reportsRoutes);



// Home route: redirect based on login
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');  // Redirect to dashboard if logged in
  } else {
    res.redirect('/login');      // Otherwise, login page
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Form submission expired. Please try again.');
    return res.redirect('back');
  }

  res.status(500).render('error', { 
    error: process.env.NODE_ENV === 'development' ? err : {},
    message: 'Something went wrong!'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});