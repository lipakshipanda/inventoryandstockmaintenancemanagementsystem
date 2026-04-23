const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

exports.getProfile = async (req, res) => {
  try {
    const user = await mongoose.connection.db
      .collection('users')
      .findOne(
        { _id: new mongoose.Types.ObjectId(req.user._id) },
        { projection: { password: 0 } }
      );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, address, phone, department, avatar } = req.body;
    const update = { updatedAt: new Date() };
    if (name)       update.name       = name;
    if (email)      update.email      = email;
    if (address !== undefined) update.address    = address;
    if (phone   !== undefined) update.phone      = phone;
    if (department !== undefined) update.department = department;
    if (avatar)     update.avatar     = avatar;

    await mongoose.connection.db
      .collection('users')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(req.user._id) },
        { $set: update }
      );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both passwords are required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }
    const user = await mongoose.connection.db
      .collection('users')
      .findOne({ _id: new mongoose.Types.ObjectId(req.user._id) });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await mongoose.connection.db
      .collection('users')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(req.user._id) },
        { $set: { password: hashed, updatedAt: new Date() } }
      );
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};