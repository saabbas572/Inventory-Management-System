module.exports = {
  isAuthenticated: (req, res, next) => {
    if (req.session.user){       req.user = req.session.user; // Make sure this line exists
 return next()};
    req.flash('error', 'Please login first');
    res.redirect('/login');
  }
};