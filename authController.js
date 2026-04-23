const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register a new user
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ name, email, password, role: role || 'staff' });
    await user.save();

    res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (user && await user.matchPassword(password)) {
      res.json({
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
};