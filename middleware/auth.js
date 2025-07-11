// auth.js (alternative version without flash)
module.exports = {
  isAuthenticated: (req, res, next) => {
    if (req.session.user) {
      return next();
    }
    return res.redirect('/login?error=Please+login+first');
  }
};