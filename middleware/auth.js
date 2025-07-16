module.exports = {
  isAuthenticated: (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please login first');
    res.redirect('/login');
  }
};