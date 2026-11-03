const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
} = require('../controllers/taskController');
const { authenticateUser, requirePermission } = require('../../../shared/middleware/authMiddleware');

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(authenticateUser, requirePermission('deleteTasks'), deleteTask);

router.route('/:id/status')
  .patch(updateTaskStatus);

module.exports = router;
