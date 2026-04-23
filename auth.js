const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token         = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await mongoose.connection.db
        .collection('users')
        .findOne(
          { _id: new mongoose.Types.ObjectId(decoded.id) },
          { projection: { password: 0 } }
        );
      if (!user) return res.status(401).json({ message: 'User not found' });
      // Check if user is deactivated
      if (user.active === false) {
        return res.status(403).json({ message: 'Your account has been deactivated. Contact admin.' });
      }
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ message: 'Access denied: Admins only' });
};

const managerAndAbove = (req, res, next) => {
  if (req.user && ['admin', 'manager'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'Access denied: Managers and Admins only' });
};

const staffOnly = (req, res, next) => {
  if (req.user && req.user.role === 'staff') return next();
  res.status(403).json({ message: 'Access denied: Staff only' });
};

module.exports = { protect, adminOnly, managerAndAbove, staffOnly };
