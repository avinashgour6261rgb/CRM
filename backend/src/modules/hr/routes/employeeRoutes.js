const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getCurrentUser,
  switchCurrentUser,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employeeController');

router.get('/current', getCurrentUser);
router.post('/switch/:id', switchCurrentUser);
router.route('/')
  .get(getEmployees)
  .post(createEmployee);

router.route('/:id')
  .get(getEmployeeById)
  .put(updateEmployee)
  .delete(deleteEmployee);

module.exports = router;
