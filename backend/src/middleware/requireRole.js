const requireRole = (...roles) => {
  return (req, res, next) => {
    // Note: This middleware must run after the authenticate middleware
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
};

module.exports = requireRole;
