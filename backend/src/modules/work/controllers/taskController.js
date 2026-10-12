/**
 * @file taskController.js
 * @description Controller for Tasks in EMS Work Module.
 */

const mongoose = require('mongoose');
const Task = require('../models/Task');
const Timesheet = require('../models/Timesheet');

// @desc    Get all tasks with filters
// @route   GET /api/tasks
exports.getTasks = async (req, res, next) => {
  try {
    const { projectId, status, priority, assignedTo, search, hideCompleted } = req.query;
    let query = {};

    const user = req.user;
    const isPrivileged = user && (user.isAdmin || user.systemRole === 'admin' || user.systemRole === 'hr' || user.role === 'Administrator' || user.role === 'HR Manager');

    if (projectId && projectId !== 'all') {
      const isValid = mongoose.Types.ObjectId.isValid(projectId);
      query.$or = isValid ? [{ project: projectId }, { projectId }] : [{ projectId }];
    }
    if (status && status !== 'all') {
      query.status = status;
    } else if (hideCompleted === 'true' || hideCompleted === true) {
      query.status = { $ne: 'completed' };
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Role-based tenant isolation: Regular employees can strictly only access tasks assigned to them
    if (!isPrivileged && user) {
      const userObjId = mongoose.Types.ObjectId.isValid(user._id) ? user._id : null;
      const userAssignedFilter = userObjId
        ? [{ assignedTo: userObjId }, { assignedToId: user._id }, { assignedToId: user.employeeCode }]
        : [{ assignedToId: user._id }, { assignedToId: user.employeeCode }];
      if (user.name) {
        userAssignedFilter.push({ assignedToName: new RegExp(`^${user.name}$`, 'i') });
      }

      if (query.$or) {
        query.$and = (query.$and || []).concat([{ $or: query.$or }, { $or: userAssignedFilter }]);
        delete query.$or;
      } else {
        query.$or = userAssignedFilter;
      }
    } else if (assignedTo && assignedTo !== 'all') {
      const isValid = mongoose.Types.ObjectId.isValid(assignedTo);
      query.$or = isValid ? [{ assignedTo: assignedTo }, { assignedToId: assignedTo }] : [{ assignedToId: assignedTo }];
    }

    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: 'i' } },
        { taskCode: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { assignedToName: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = (query.$and || []).concat([{ $or: query.$or }, { $or: searchOr }]);
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 });
    const todayStr = new Date().toISOString().split('T')[0];

    const mappedTasks = tasks.map(t => {
      const doc = t.toObject ? t.toObject() : { ...t };
      const isOverdue = !!(doc.dueDate && !doc.hasNoDueDate && doc.dueDate < todayStr && doc.status !== 'completed');
      return {
        ...doc,
        isOverdue
      };
    });

    res.status(200).json({
      success: true,
      count: mappedTasks.length,
      data: mappedTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
exports.getTaskById = async (req, res, next) => {
  try {
    let task = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      task = await Task.findById(req.params.id);
    } else {
      task = await Task.findOne({ taskCode: req.params.id });
    }
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new task
// @route   POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const count = await Task.countDocuments();
    const taskData = {
      ...req.body,
      taskCode: req.body.taskCode || `TSK-${count + 1}`
    };

    // Sanitize ObjectId fields
    if (!taskData.assignedTo || !mongoose.Types.ObjectId.isValid(taskData.assignedTo)) {
      taskData.assignedTo = null;
    }
    if (!taskData.project || !mongoose.Types.ObjectId.isValid(taskData.project)) {
      taskData.project = null;
    }

    const task = await Task.create(taskData);
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.assignedTo !== undefined && (!updateData.assignedTo || !mongoose.Types.ObjectId.isValid(updateData.assignedTo))) {
      updateData.assignedTo = null;
    }
    if (updateData.project !== undefined && (!updateData.project || !mongoose.Types.ObjectId.isValid(updateData.project))) {
      updateData.project = null;
    }

    let task = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      task = await Task.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
      });
    } else {
      task = await Task.findOneAndUpdate({ $or: [{ taskCode: req.params.id }, { _id: req.params.id }] }, updateData, {
        new: true,
        runValidators: true
      });
    }

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'completed') {
      update.completedOn = new Date().toISOString().split('T')[0];
      update.timerRunning = false;
      update.timerSeconds = 0;
    }

    let task = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      task = await Task.findByIdAndUpdate(req.params.id, update, { new: true });
    } else {
      task = await Task.findOneAndUpdate({ $or: [{ taskCode: req.params.id }, { _id: req.params.id }] }, update, { new: true });
    }

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({
      success: true,
      message: `Task status updated to ${status}`,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    let task = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      task = await Task.findByIdAndDelete(req.params.id);
    } else {
      task = await Task.findOneAndDelete({ $or: [{ taskCode: req.params.id }, { _id: req.params.id }] });
    }

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
