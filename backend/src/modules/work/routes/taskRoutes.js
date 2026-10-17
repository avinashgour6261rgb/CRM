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

router.route('/')
  .get(getTasks)
  .post(createTask);

router.delete('/purge/all', async (req, res) => {
  try {
    const Task = require('../models/Task');
    await Task.deleteMany({});
    res.json({ success: true, message: 'All legacy tasks purged from database' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.route('/:id/status')
  .patch(updateTaskStatus);

module.exports = router;
