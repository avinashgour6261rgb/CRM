const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getCurrentUser,
  switchCurrentUser,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeePermissions,
  deleteEmployee
} = require('../controllers/employeeController');
const { authenticateUser } = require('../../../shared/middleware/authMiddleware');

router.get('/current', getCurrentUser);
router.post('/switch/:id', switchCurrentUser);
router.put('/:id/permissions', authenticateUser, updateEmployeePermissions);
router.route('/')
  .get(getEmployees)
  .post(authenticateUser, createEmployee);

router.route('/:id')
  .get(getEmployeeById)
  .put(authenticateUser, updateEmployee)
  .delete(authenticateUser, deleteEmployee);

module.exports = router;
