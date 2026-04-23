const express = require('express');
const router  = express.Router();
const {
  getComplaints,
  createComplaint,
  respondToComplaint
} = require('../controllers/complaintController');
const { protect } = require('../middleware/auth');

router.get('/',            protect, getComplaints);
router.post('/',           protect, createComplaint);
router.put('/:id/respond', protect, respondToComplaint);

module.exports = router;