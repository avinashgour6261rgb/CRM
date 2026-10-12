/**
 * @file timesheetController.js
 * @description Controller for Timesheet and Time Tracking in EMS Work Module.
 */

const mongoose = require('mongoose');
const Timesheet = require('../models/Timesheet');
const Task = require('../models/Task');

// @desc    Get timesheet entries with filters
// @route   GET /api/timesheet
exports.getTimesheets = async (req, res, next) => {
  try {
    const { employeeId, projectId, taskId, date, status, search } = req.query;
    let query = {};

    const user = req.user;
    const isPrivileged = user && (user.isAdmin || user.systemRole === 'admin' || user.systemRole === 'hr' || user.role === 'Administrator' || user.role === 'HR Manager');

    // Tenant / User Scoping: Non-admins strictly only view their own personal timesheets
    if (!isPrivileged && user) {
      const userObjId = mongoose.Types.ObjectId.isValid(user._id) ? user._id : null;
      const userTimesheetFilter = userObjId
        ? [{ employee: userObjId }, { employeeId: user._id }, { employeeId: user.employeeCode }]
        : [{ employeeId: user._id }, { employeeId: user.employeeCode }];
      if (user.name) {
        userTimesheetFilter.push({ employeeName: new RegExp(`^${user.name}$`, 'i') });
      }

      query.$or = userTimesheetFilter;
    } else if (employeeId && employeeId !== 'all') {
      const isValid = mongoose.Types.ObjectId.isValid(employeeId);
      query.$or = isValid ? [{ employee: employeeId }, { employeeId }] : [{ employeeId }];
    }

    if (projectId && projectId !== 'all') {
      const isValid = mongoose.Types.ObjectId.isValid(projectId);
      const prjFilter = isValid ? [{ project: projectId }, { projectId }] : [{ projectId }];
      if (query.$or) {
        query.$and = (query.$and || []).concat([{ $or: query.$or }, { $or: prjFilter }]);
        delete query.$or;
      } else {
        query.$or = prjFilter;
      }
    }
    if (taskId && taskId !== 'all') {
      const isValid = mongoose.Types.ObjectId.isValid(taskId);
      const tskFilter = isValid ? [{ task: taskId }, { taskId }] : [{ taskId }];
      if (query.$or) {
        query.$and = (query.$and || []).concat([{ $or: query.$or }, { $or: tskFilter }]);
        delete query.$or;
      } else {
        query.$or = tskFilter;
      }
    }
    if (date) {
      query.date = date;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      const searchOr = [
        { taskTitle: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { memo: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = (query.$and || []).concat([{ $or: query.$or }, { $or: searchOr }]);
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const timesheets = await Timesheet.find(query).sort({ date: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      count: timesheets.length,
      data: timesheets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log manual time entry
// @route   POST /api/timesheet
exports.createTimesheet = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const user = req.user;

    if (!payload.employee && user && mongoose.Types.ObjectId.isValid(user._id)) {
      payload.employee = user._id;
    }
    if (!payload.employeeId && user) {
      payload.employeeId = user._id;
    }
    if (!payload.employeeName && user) {
      payload.employeeName = user.name;
    }

    if (!payload.task || !mongoose.Types.ObjectId.isValid(payload.task)) delete payload.task;
    if (!payload.project || !mongoose.Types.ObjectId.isValid(payload.project)) delete payload.project;
    if (!payload.employee || !mongoose.Types.ObjectId.isValid(payload.employee)) delete payload.employee;

    const timesheet = await Timesheet.create(payload);

    // If linked to a task, increment task logged hours safely
    if (req.body.taskId && mongoose.Types.ObjectId.isValid(req.body.taskId)) {
      const durationHours = (req.body.totalDurationSeconds || 0) / 3600;
      await Task.findByIdAndUpdate(req.body.taskId, {
        $inc: { hoursLogged: durationHours }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Time logged successfully',
      data: timesheet
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stop running timer and save duration
// @route   POST /api/timesheet/stop
exports.stopTimer = async (req, res, next) => {
  try {
    const { taskId, totalDurationSeconds, endTime, memo } = req.body;
    
    // Update task safely
    let task = null;
    if (mongoose.Types.ObjectId.isValid(taskId)) {
      task = await Task.findById(taskId);
    } else {
      task = await Task.findOne({ $or: [{ taskCode: taskId }, { _id: taskId }] });
    }
    if (task) {
      task.timerRunning = false;
      task.timerSeconds = 0; // Reset active session seconds
      const hoursAdded = totalDurationSeconds / 3600;
      task.hoursLogged = Number(((task.hoursLogged || 0) + hoursAdded).toFixed(2));
      const totalSecs = Math.round(task.hoursLogged * 3600);
      const totalHrs = Math.floor(totalSecs / 3600);
      const totalMins = Math.floor((totalSecs % 3600) / 60);
      task.hoursLoggedText = `${String(totalHrs).padStart(2, '0')}h ${String(totalMins).padStart(2, '0')}m`;
      await task.save();
    }

    // Format duration text
    const hrs = String(Math.floor(totalDurationSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalDurationSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalDurationSeconds % 60).padStart(2, '0');
    const durationText = `${hrs}:${mins}:${secs}`;

    const newLog = await Timesheet.create({
      task: task?._id || null,
      taskId: task?._id?.toString() || taskId,
      taskCode: task?.taskCode || '',
      taskTitle: task?.title || 'Tracked Session',
      project: task?.project || null,
      projectId: task?.projectId || '',
      projectName: task?.projectName || 'General Work',
      employee: task?.assignedTo || null,
      employeeId: task?.assignedToId || '',
      employeeName: task?.assignedToName || 'Current User',
      employeeAvatar: task?.assignedToAvatar || '',
      employeeRole: task?.assignedToRole || '',
      date: new Date().toISOString().split('T')[0],
      startTime: req.body.startTime || new Date(Date.now() - totalDurationSeconds * 1000).toTimeString().split(' ')[0],
      endTime: endTime || new Date().toTimeString().split(' ')[0],
      totalDurationSeconds,
      totalDurationText: durationText,
      memo: memo || 'Live work session completed',
      status: 'stopped'
    });

    res.status(200).json({
      success: true,
      message: 'Timer stopped and duration logged to timesheet!',
      data: newLog
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete timesheet entry
// @route   DELETE /api/timesheet/:id
exports.deleteTimesheet = async (req, res, next) => {
  try {
    const timesheet = await Timesheet.findByIdAndDelete(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet entry not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Timesheet entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
