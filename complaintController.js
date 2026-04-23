const mongoose = require('mongoose');

exports.getComplaints = async (req, res) => {
  try {
    const role = req.user?.role;
    const uid  = String(req.user?._id);
    let query  = {};
    if (role === 'staff') query = { raisedById: uid };
    const complaints = await mongoose.connection.db
      .collection('complaints')
      .find(query).sort({ createdAt: -1 }).toArray();
    res.json(complaints);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title?.trim())       return res.status(400).json({ message: 'Title is required' });
    if (!description?.trim()) return res.status(400).json({ message: 'Description is required' });

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 10);

    const complaint = {
      title:           title.trim(),
      description:     description.trim(),
      category:        category || 'Other',
      priority:        priority || 'medium',
      status:          'open',
      raisedById:      String(req.user?._id),
      raisedByName:    req.user?.name  || 'Unknown',
      raisedByRole:    req.user?.role  || 'unknown',
      deadline,
      response:        null,
      respondedBy:     null,
      respondedByName: null,
      respondedAt:     null,
      createdAt:       new Date(),
      updatedAt:       new Date()
    };

    const result = await mongoose.connection.db
      .collection('complaints').insertOne(complaint);
    res.status(201).json({ ...complaint, _id: result.insertedId });
  } catch (err) {
    console.error('createComplaint error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.respondToComplaint = async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Only Admin and Manager can respond' });
    }
    const { ObjectId } = mongoose.Types;
    const { response, status } = req.body;
    if (!response?.trim()) return res.status(400).json({ message: 'Response is required' });
    if (!['in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const result = await mongoose.connection.db.collection('complaints').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: {
          response:        response.trim(),
          status,
          respondedBy:     String(req.user._id),
          respondedByName: req.user.name || 'Admin',
          respondedAt:     new Date(),
          updatedAt:       new Date()
      }}
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ message: 'Response submitted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
