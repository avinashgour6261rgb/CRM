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
    if (mongoose.connection.readyState !== 1) {
      const start = Date.now();
      while (mongoose.connection.readyState !== 1 && Date.now() - start < 2000) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: 'Database connecting, standby' });
      }
    }
    const { projectId, status, priority, assignedTo, search, hideCompleted } = req.query;
    let query = {};

    const user = req.user;
    const isPrivileged = user && (
      user.isAdmin ||
      user.systemRole === 'admin' ||
      user.systemRole === 'hr' ||
      user.role === 'Administrator' ||
      user.role === 'HR Manager' ||
      user.permissions?.liveOperations === true ||
      user.permissions?.teamoperations === true ||
      user.permissions?.viewAllTasks === true ||
      user.permissions?.allAccess === true
    );

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

    // Role-based tenant isolation: Regular employees can strictly access tasks assigned to them (single or multi-assignee) OR created by them
    if (!isPrivileged && user) {
      const userObjId = mongoose.Types.ObjectId.isValid(user._id) ? user._id : null;
      const userAssignedFilter = [
        ...(userObjId ? [{ assignedTo: userObjId }] : []),
        { assignedToId: String(user._id) },
        { assignedToId: String(user.employeeCode) },
        { assignedToIds: String(user._id) },
        { assignedToIds: String(user.employeeCode) },
        { 'assignees._id': user._id },
        { 'assignees.employeeCode': user.employeeCode },
        // Creator / Assigner can always view tasks they delegated
        { assignedById: String(user._id) },
        { assignedById: String(user.employeeCode) }
      ];
      if (user.name) {
        const escapedName = String(user.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        userAssignedFilter.push({ assignedToName: new RegExp(`^${escapedName}$`, 'i') });
        userAssignedFilter.push({ assignedToName: new RegExp(escapedName, 'i') });
        userAssignedFilter.push({ assignedBy: new RegExp(`^${escapedName}$`, 'i') });
        userAssignedFilter.push({ assignedBy: new RegExp(escapedName, 'i') });
        userAssignedFilter.push({ 'assignees.name': new RegExp(`^${escapedName}$`, 'i') });
        userAssignedFilter.push({ 'assignees.name': new RegExp(escapedName, 'i') });

        const parts = String(user.name).trim().split(/\s+/).filter(p => p.length >= 3);
        for (const p of parts) {
          const escP = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          userAssignedFilter.push({ assignedToName: new RegExp(escP, 'i') });
          userAssignedFilter.push({ 'assignees.name': new RegExp(escP, 'i') });
        }
      }
      if (user.email) {
        const escEmail = String(user.email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        userAssignedFilter.push({ assignedToEmail: new RegExp(`^${escEmail}$`, 'i') });
        userAssignedFilter.push({ 'assignees.email': new RegExp(`^${escEmail}$`, 'i') });
      }

      if (query.$or) {
        query.$and = (query.$and || []).concat([{ $or: query.$or }, { $or: userAssignedFilter }]);
        delete query.$or;
      } else {
        query.$or = userAssignedFilter;
      }
    } else if (assignedTo && assignedTo !== 'all') {
      const isValid = mongoose.Types.ObjectId.isValid(assignedTo);
      const assignedFilter = [
        ...(isValid ? [{ assignedTo: assignedTo }] : []),
        { assignedToId: assignedTo },
        { assignedToIds: assignedTo },
        { 'assignees._id': assignedTo },
        { 'assignees.employeeCode': assignedTo }
      ];
      if (query.$or) {
        query.$and = (query.$and || []).concat([{ $or: query.$or }, { $or: assignedFilter }]);
        delete query.$or;
      } else {
        query.$or = assignedFilter;
      }
    }

    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchOr = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { taskCode: { $regex: escapedSearch, $options: 'i' } },
        { projectName: { $regex: escapedSearch, $options: 'i' } },
        { assignedToName: { $regex: escapedSearch, $options: 'i' } }
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

    // Sanitize ObjectId fields while preserving string IDs
    const rawAssignedTo = taskData.assignedTo;
    if (!taskData.assignedTo || !mongoose.Types.ObjectId.isValid(taskData.assignedTo)) {
      taskData.assignedToId = taskData.assignedToId || (rawAssignedTo ? String(rawAssignedTo) : '');
      taskData.assignedTo = null;
    }
    if (!taskData.assignedToIds || !Array.isArray(taskData.assignedToIds) || taskData.assignedToIds.length === 0) {
      if (taskData.assignedToId) {
        taskData.assignedToIds = [taskData.assignedToId];
      }
    }
    if (!taskData.project || !mongoose.Types.ObjectId.isValid(taskData.project)) {
      taskData.project = null;
    }

    if (!taskData.history || !Array.isArray(taskData.history) || taskData.history.length === 0) {
      taskData.history = [{
        id: `hist_${Date.now()}_create`,
        action: 'created',
        title: 'Task Created & Assigned',
        timestamp: new Date().toISOString(),
        performedBy: taskData.assignedBy || 'Administrator',
        performedById: taskData.assignedById || 'admin',
        assignedTo: taskData.assignedToName || 'Team Members',
        details: `Task #${taskData.taskCode} created and assigned to ${taskData.assignedToName || 'team'} by ${taskData.assignedBy || 'Administrator'}. (Due: ${taskData.hasNoDueDate ? 'No Due Date' : (taskData.dueDate || 'Open')})`,
        metadata: {
          priority: taskData.priority || 'medium',
          category: taskData.category || 'General',
          projectName: taskData.projectName || 'General Work'
        }
      }];
    }

    const task = await Task.create(taskData);
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('task:updated', task);
    } catch (_) {}
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
      updateData.assignedToId = updateData.assignedToId || (updateData.assignedTo ? String(updateData.assignedTo) : '');
      updateData.assignedTo = null;
    }
    if (!updateData.assignedToIds || !Array.isArray(updateData.assignedToIds) || updateData.assignedToIds.length === 0) {
      if (updateData.assignedToId) {
        updateData.assignedToIds = [updateData.assignedToId];
      }
    }
    if (updateData.project !== undefined && (!updateData.project || !mongoose.Types.ObjectId.isValid(updateData.project))) {
      updateData.project = null;
    }

    // Fetch existing task first to enforce monotonic duration protection (NEVER allow a stale browser to delete/shrink logged work time!)
    let existingTask = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      existingTask = await Task.findById(req.params.id).lean();
    }
    if (!existingTask) {
      existingTask = await Task.findOne({ taskCode: req.params.id }).lean();
    }

    if (existingTask) {
      const hasTimerPayload = (
        updateData.accumulatedSeconds !== undefined ||
        updateData.timerSeconds !== undefined ||
        updateData.todayWorkSeconds !== undefined ||
        updateData.accumulatedTodaySeconds !== undefined ||
        updateData.dailySessions !== undefined
      );

      if (hasTimerPayload) {
        const existingDaily = (existingTask.dailySessions && typeof existingTask.dailySessions === 'object') ? existingTask.dailySessions : {};
        const incomingDaily = (updateData.dailySessions && typeof updateData.dailySessions === 'object') ? updateData.dailySessions : {};
        const mergedDaily = { ...existingDaily };
        for (const [dKey, dVal] of Object.entries(incomingDaily)) {
          const prevVal = Number(mergedDaily[dKey]) || 0;
          const nextVal = Math.max(0, Number(dVal) || 0);
          mergedDaily[dKey] = Math.max(prevVal, nextVal);
        }

        const activeDate = updateData.sessionDate || existingTask.sessionDate || new Date().toISOString().split('T')[0];
        const prevDateSecs = existingTask.sessionDate === activeDate
          ? Math.max(Number(existingTask.accumulatedTodaySeconds) || 0, Number(existingTask.todayWorkSeconds) || 0, Number(mergedDaily[activeDate]) || 0)
          : (Number(mergedDaily[activeDate]) || 0);
        const incomingDateSecs = Math.max(
          Number(updateData.accumulatedTodaySeconds) || 0,
          Number(updateData.todayWorkSeconds) || 0,
          Number(incomingDaily[activeDate]) || 0
        );
        const safeDateSecs = Math.max(prevDateSecs, incomingDateSecs);
        if (safeDateSecs > 0 || mergedDaily[activeDate] !== undefined) {
          mergedDaily[activeDate] = safeDateSecs;
        }

        const safeAccum = Math.max(
          Number(existingTask.accumulatedSeconds) || 0,
          Number(updateData.accumulatedSeconds) || 0,
          safeDateSecs
        );
        const safeTimer = Math.max(
          Number(existingTask.timerSeconds) || 0,
          Number(updateData.timerSeconds) || 0,
          safeAccum
        );

        updateData.dailySessions = mergedDaily;
        updateData.accumulatedSeconds = safeAccum;
        updateData.timerSeconds = safeTimer;
        updateData.accumulatedTodaySeconds = safeDateSecs;
        updateData.todayWorkSeconds = safeDateSecs;
        updateData.liveTodaySeconds = safeDateSecs;
        updateData.hoursLogged = +(safeAccum / 3600).toFixed(2);
      }
    }

    let task = null;
    if (existingTask?._id) {
      task = await Task.findByIdAndUpdate(existingTask._id, updateData, {
        new: true,
        runValidators: true
      });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      task = await Task.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
      });
    }
    if (!task) {
      task = await Task.findOneAndUpdate({ taskCode: req.params.id }, updateData, {
        new: true,
        runValidators: true
      });
    }

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('task:updated', task);
    } catch (_) {}
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
      if (req.body.timerSeconds !== undefined) update.timerSeconds = req.body.timerSeconds;
      if (req.body.durationSeconds !== undefined) update.durationSeconds = req.body.durationSeconds;
      if (req.body.hoursLogged !== undefined) update.hoursLogged = req.body.hoursLogged;
      if (req.body.hoursLoggedText !== undefined) update.hoursLoggedText = req.body.hoursLoggedText;
      if (req.body.todayWorkSeconds !== undefined) update.todayWorkSeconds = req.body.todayWorkSeconds;
      if (req.body.accumulatedTodaySeconds !== undefined) update.accumulatedTodaySeconds = req.body.accumulatedTodaySeconds;
      if (req.body.accumulatedSeconds !== undefined) update.accumulatedSeconds = req.body.accumulatedSeconds;
      if (req.body.dailySessions !== undefined) update.dailySessions = req.body.dailySessions;
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
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('task:updated', task);
    } catch (_) {}
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
    if (req.user && !req.user.isAdmin && req.user.systemRole !== 'admin') {
      const perms = req.user.permissions || {};
      if (!perms.deleteTasks && !perms.allAccess) {
        return res.status(403).json({ success: false, message: 'Access Denied: Missing deleteTasks authority' });
      }
    }

    let task = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      task = await Task.findByIdAndDelete(req.params.id);
    } else {
      task = await Task.findOneAndDelete({ taskCode: req.params.id });
    }

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('task:deleted', { _id: String(task._id), id: String(task._id), taskCode: task.taskCode });
    } catch (_) {}
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
