const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

exports.getUsers = async (req, res) => {
  try {
    const users = await mongoose.connection.db
      .collection('users')
      .find({}, { projection: { password: 0 } })
      .toArray();
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    const user = await mongoose.connection.db
      .collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user)             return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete an admin' });
    await mongoose.connection.db
      .collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    const user = await mongoose.connection.db
      .collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Admin role cannot be changed' });
    await mongoose.connection.db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { role: req.body.role, updatedAt: new Date() } }
    );
    res.json({ message: 'Role updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    const result = await mongoose.connection.db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { password: hashed, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Password updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateSalary = async (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    await mongoose.connection.db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { salary: parseFloat(req.body.salary) || 0, updatedAt: new Date() } }
    );
    res.json({ message: 'Salary updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Toggle active/inactive status
exports.toggleActive = async (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    const user = await mongoose.connection.db
      .collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot deactivate an admin' });

    const newStatus = user.active === false ? true : false;
    await mongoose.connection.db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { active: newStatus, updatedAt: new Date() } }
    );
    res.json({ message: newStatus ? 'User activated' : 'User deactivated', active: newStatus });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
