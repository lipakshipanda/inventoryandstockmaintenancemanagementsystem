const express = require('express');
const router  = express.Router();
const {
  getUsers, deleteUser, updateUserRole, resetPassword, updateSalary, toggleActive
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/',                protect, adminOnly, getUsers);
router.delete('/:id',          protect, adminOnly, deleteUser);
router.put('/:id/role',        protect, adminOnly, updateUserRole);
router.put('/:id/password',    protect, adminOnly, resetPassword);
router.put('/:id/salary',      protect, adminOnly, updateSalary);
router.put('/:id/toggle',      protect, adminOnly, toggleActive);

module.exports = router;
