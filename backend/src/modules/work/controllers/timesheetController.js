/**
 * @file timesheetController.js
 * @description Controller for Timesheet and Time Tracking in EMS Work Module.
 */

const mongoose = require('mongoose');
const Timesheet = require('../models/Timesheet');
const Task = require('../models/Task');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

// @desc    Get timesheet entries with filters
// @route   GET /api/timesheet
exports.getTimesheets = async (req, res, next) => {
  try {
    const { employeeId, projectId, taskId, date, status, search } = req.query;
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
    const formattedTimesheets = timesheets.map(t => {
      const obj = t.toObject ? t.toObject() : { ...t };
      if (!obj.employeeId && obj.employee) {
        obj.employeeId = String(obj.employee);
      }
      return obj;
    });
    res.status(200).json({
      success: true,
      count: formattedTimesheets.length,
      data: formattedTimesheets
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

    // Enrich with task assignee first if available - ALWAYS prioritize the task's actual assignee
    let taskAssignee = null;
    if (payload.taskId || payload.taskCode) {
      try {
        taskAssignee = await Task.findOne({
          $or: [
            ...(payload.taskId ? [{ _id: mongoose.Types.ObjectId.isValid(payload.taskId) ? payload.taskId : undefined }, { taskId: payload.taskId }] : []),
            ...(payload.taskCode ? [{ taskCode: payload.taskCode }] : [])
          ].filter(Boolean)
        });
        if (taskAssignee) {
          // If the task has an assignee, strictly assign the timesheet to the task assignee,
          // NEVER letting an admin action overwrite employee timesheets with Admin's identity!
          const realAssigneeId = taskAssignee.assignedToId || (taskAssignee.assignedTo ? taskAssignee.assignedTo.toString() : '');
          const realAssigneeCode = taskAssignee.assignedToCode || '';
          const realAssigneeName = taskAssignee.assignedToName || '';

          if (realAssigneeId) {
            payload.employeeId = realAssigneeId;
          }
          if (realAssigneeCode) {
            payload.employeeCode = realAssigneeCode;
          }
          if (realAssigneeName) {
            payload.employeeName = realAssigneeName;
          }
          if (taskAssignee.assignedTo && mongoose.Types.ObjectId.isValid(taskAssignee.assignedTo)) {
            payload.employee = taskAssignee.assignedTo;
          }
        }
      } catch (_) {}
    }

    // Enrich with authenticated user details ONLY if task had no assignee and employeeId is still missing
    if (!payload.employeeId && user) {
      payload.employeeId = user._id ? user._id.toString() : (user.employeeCode || '');
    }
    if (!payload.employeeName && user) {
      payload.employeeName = user.name || 'Employee';
    }
    // Preserve employeeCode for cross-referencing
    if (!payload.employeeCode && user) {
      payload.employeeCode = user.employeeCode || '';
    }

    // Set the employee ObjectId ref only when it's a valid ObjectId
    // — keep employeeId (string) field for code-based lookups regardless
    if (payload.employee && !mongoose.Types.ObjectId.isValid(payload.employee)) {
      delete payload.employee; // Don't set invalid ObjectId
    } else if (!payload.employee && user && mongoose.Types.ObjectId.isValid(user._id)) {
      const isTargetingSelf = !payload.employeeId ||
        String(payload.employeeId) === String(user._id) ||
        (user.employeeCode && String(payload.employeeCode || payload.employeeId) === String(user.employeeCode));
      if (isTargetingSelf) {
        payload.employee = user._id;
      }
    }

    // Clean ObjectId-typed refs — remove invalid ones so Mongoose doesn't throw CastError
    if (payload.task && !mongoose.Types.ObjectId.isValid(payload.task)) delete payload.task;
    if (payload.project && !mongoose.Types.ObjectId.isValid(payload.project)) delete payload.project;

    const targetDate = payload.date || getIstDateString();
    payload.date = targetDate;
    const durationSecs = Number(payload.totalDurationSeconds) || 0;

    // Deduplication check: If auto-save or shift clock-out for a task today, check if timesheet already exists
    let timesheet = null;
    if (payload.taskId || payload.taskCode || payload.taskTitle) {
      const matchConditions = [];
      if (payload.taskId) {
        matchConditions.push({ taskId: String(payload.taskId) });
        if (mongoose.Types.ObjectId.isValid(payload.taskId)) {
          matchConditions.push({ task: payload.taskId });
        }
      }
      if (payload.taskCode) {
        matchConditions.push({ taskCode: payload.taskCode });
        matchConditions.push({ taskCode: new RegExp(`^${payload.taskCode}$`, 'i') });
      }
      if (payload.taskTitle) {
        matchConditions.push({ taskTitle: payload.taskTitle });
      }

      const empConditions = [];
      if (payload.employeeId) empConditions.push({ employeeId: String(payload.employeeId) });
      if (payload.employeeCode) empConditions.push({ employeeCode: String(payload.employeeCode) });
      if (payload.employee && mongoose.Types.ObjectId.isValid(payload.employee)) empConditions.push({ employee: payload.employee });
      if (payload.employeeName) empConditions.push({ employeeName: new RegExp(`^${payload.employeeName.trim()}$`, 'i') });
      const isForCurrentUser = !payload.employeeId || String(payload.employeeId) === String(user?._id) || (user?.employeeCode && String(payload.employeeCode || payload.employeeId) === String(user.employeeCode));
      if (isForCurrentUser && user && user._id) empConditions.push({ employee: user._id });
      if (isForCurrentUser && user && user.employeeCode) empConditions.push({ employeeCode: user.employeeCode });

      const existingTs = await Timesheet.findOne({
        date: targetDate,
        ...(matchConditions.length > 0 ? { $or: matchConditions } : {}),
        ...(empConditions.length > 0 ? { $and: [{ $or: empConditions }] } : {})
      });

      if (existingTs) {
        // Update existing record with maximum duration rather than stacking duplicate rows
        const effectiveDuration = Math.max(Number(existingTs.totalDurationSeconds) || 0, durationSecs);
        existingTs.totalDurationSeconds = effectiveDuration;
        if (payload.totalDurationText) existingTs.totalDurationText = payload.totalDurationText;
        if (payload.endTime) existingTs.endTime = payload.endTime;
        if (payload.memo) existingTs.memo = payload.memo;
        if (payload.status) existingTs.status = payload.status;
        timesheet = await existingTs.save();
      }
    }

    if (!timesheet) {
      timesheet = await Timesheet.create(payload);
    }

    // Recalculate task hoursLogged accurately from all timesheets (prevents double-counting)
    if (payload.taskId) {
      const taskQuery = mongoose.Types.ObjectId.isValid(payload.taskId)
        ? { _id: payload.taskId }
        : { $or: [{ taskCode: payload.taskId }, { _id: payload.taskId }] };
      const task = await Task.findOne(taskQuery);

      if (task) {
        const allTaskTimesheets = await Timesheet.find({
          $or: [
            { task: task._id },
            { taskId: task._id.toString() },
            ...(task.taskCode ? [{ taskCode: task.taskCode }] : [])
          ]
        });
        const dateTaskMap = new Map();
        allTaskTimesheets.forEach(ts => {
          const dKey = `${ts.date || ''}_${ts.employeeId || ts.employeeCode || ts.employee || ''}`;
          const dSecs = Number(ts.totalDurationSeconds) || 0;
          if (!dateTaskMap.has(dKey) || dSecs > dateTaskMap.get(dKey)) {
            dateTaskMap.set(dKey, dSecs);
          }
        });
        const totalTaskSecs = Array.from(dateTaskMap.values()).reduce((sum, s) => sum + s, 0);
        task.hoursLogged = Number((totalTaskSecs / 3600).toFixed(2));
        const totalHrs = Math.floor(totalTaskSecs / 3600);
        const totalMins = Math.floor((totalTaskSecs % 3600) / 60);
        task.hoursLoggedText = `${String(totalHrs).padStart(2, '0')}h ${String(totalMins).padStart(2, '0')}m`;
        await task.save();
      }
    }

    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('timesheet:updated', { action: 'create', item: timesheet });
    } catch (_) {}

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
    const { taskId, totalDurationSeconds = 0, endTime, memo } = req.body;
    const targetDate = req.body.date || getIstDateString();
    const user = req.user;
    
    // Update task safely
    let task = null;
    if (mongoose.Types.ObjectId.isValid(taskId)) {
      task = await Task.findById(taskId);
    } else {
      task = await Task.findOne({ $or: [{ taskCode: taskId }, { _id: taskId }] });
    }

    // Format duration text
    const hrs = String(Math.floor(totalDurationSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalDurationSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalDurationSeconds % 60).padStart(2, '0');
    const durationText = `${hrs}:${mins}:${secs}`;

    const realTaskAssigneeId = task?.assignedToId || (task?.assignedTo ? task.assignedTo.toString() : '');
    const realTaskAssigneeCode = task?.assignedToCode || '';
    const realTaskAssigneeName = task?.assignedToName || '';

    const empId = realTaskAssigneeId || req.body.employeeId || (user?._id ? user._id.toString() : '') || user?.employeeCode || '';
    const empCode = realTaskAssigneeCode || req.body.employeeCode || user?.employeeCode || '';
    const empName = realTaskAssigneeName || req.body.employeeName || user?.name || 'Current User';
    const isTargetingUser = !empId || String(empId) === String(user?._id) || (user?.employeeCode && (String(empCode || empId) === String(user.employeeCode)));

    // Check if a timesheet for this task on this date already exists for this employee
    const matchConditions = [
      { taskId: String(taskId) }
    ];
    if (task?._id) matchConditions.push({ task: task._id });
    if (task?.taskCode) matchConditions.push({ taskCode: task.taskCode });

    const empConditions = [];
    if (empId) empConditions.push({ employeeId: String(empId) });
    if (empCode) empConditions.push({ employeeCode: String(empCode) });
    if (empName) empConditions.push({ employeeName: new RegExp(`^${empName.trim()}$`, 'i') });
    if (task?.assignedTo && mongoose.Types.ObjectId.isValid(task.assignedTo)) {
      empConditions.push({ employee: task.assignedTo });
    } else if (isTargetingUser && user && mongoose.Types.ObjectId.isValid(user._id) && (!task?.assignedToId || String(task.assignedToId) === String(user._id))) {
      empConditions.push({ employee: user._id });
    }

    let existingLog = await Timesheet.findOne({
      date: targetDate,
      $or: matchConditions,
      ...(empConditions.length > 0 ? { $and: [{ $or: empConditions }] } : {})
    });

    let timesheetLog = null;
    if (existingLog) {
      const priorSecs = Number(existingLog.totalDurationSeconds) || 0;
      const effectiveSecs = Math.max(priorSecs, Number(totalDurationSeconds) || 0);
      const eHrs = String(Math.floor(effectiveSecs / 3600)).padStart(2, '0');
      const eMins = String(Math.floor((effectiveSecs % 3600) / 60)).padStart(2, '0');
      const eSecs = String(effectiveSecs % 60).padStart(2, '0');
      const effectiveDurationText = `${eHrs}:${eMins}:${eSecs}`;

      existingLog.totalDurationSeconds = effectiveSecs;
      existingLog.totalDurationText = effectiveDurationText;
      existingLog.endTime = endTime || new Date().toTimeString().split(' ')[0];
      if (memo) existingLog.memo = memo;
      existingLog.status = 'stopped';
      timesheetLog = await existingLog.save();
    } else {
      timesheetLog = await Timesheet.create({
        task: task?._id || null,
        taskId: task?._id?.toString() || taskId,
        taskCode: task?.taskCode || '',
        taskTitle: task?.title || 'Tracked Session',
        project: task?.project || null,
        projectId: task?.projectId || '',
        projectName: task?.projectName || 'General Work',
        employee: (empId && mongoose.Types.ObjectId.isValid(empId)) ? empId : (task?.assignedTo && mongoose.Types.ObjectId.isValid(task.assignedTo) ? task.assignedTo : (isTargetingUser && user && mongoose.Types.ObjectId.isValid(user._id) ? user._id : null)),
        employeeId: empId,
        employeeCode: empCode,
        employeeName: empName || task?.assignedToName || user?.name || 'Current User',
        employeeAvatar: task?.assignedToAvatar || user?.avatar || '',
        employeeRole: task?.assignedToRole || user?.role || '',
        date: targetDate,
        startTime: req.body.startTime || new Date(Date.now() - totalDurationSeconds * 1000).toTimeString().split(' ')[0],
        endTime: endTime || new Date().toTimeString().split(' ')[0],
        totalDurationSeconds,
        totalDurationText: durationText,
        memo: memo || 'Live work session completed',
        status: 'stopped'
      });
    }

    // Accurately recalculate task accumulated and hoursLogged from all timesheets (prevents double-counting)
    if (task) {
      task.timerRunning = false;
      task.startedAt = null;

      const allTaskTimesheets = await Timesheet.find({
        $or: [
          { task: task._id },
          { taskId: task._id.toString() },
          ...(task.taskCode ? [{ taskCode: task.taskCode }] : [])
        ]
      });

      const dateTaskMap = new Map();
      allTaskTimesheets.forEach(ts => {
        const dKey = `${ts.date || ''}_${ts.employeeId || ts.employeeCode || ts.employee || ''}`;
        const dSecs = Number(ts.totalDurationSeconds) || 0;
        if (!dateTaskMap.has(dKey) || dSecs > dateTaskMap.get(dKey)) {
          dateTaskMap.set(dKey, dSecs);
        }
      });
      const totalTaskSecs = Array.from(dateTaskMap.values()).reduce((sum, s) => sum + s, 0);
      task.hoursLogged = Number((totalTaskSecs / 3600).toFixed(2));
      const totalHrs = Math.floor(totalTaskSecs / 3600);
      const totalMins = Math.floor((totalTaskSecs % 3600) / 60);
      task.hoursLoggedText = `${String(totalHrs).padStart(2, '0')}h ${String(totalMins).padStart(2, '0')}m`;
      task.timerSeconds = Math.max(task.timerSeconds || 0, totalTaskSecs);
      task.accumulatedSeconds = Math.max(task.accumulatedSeconds || 0, totalTaskSecs);
      task.durationSeconds = Math.max(task.durationSeconds || 0, totalTaskSecs);
      await task.save();
    }

    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('timesheet:updated', { action: 'create', item: timesheetLog });
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: 'Timer stopped and duration logged to timesheet!',
      data: timesheetLog
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete timesheet entry
// @route   DELETE /api/timesheet/:id
exports.deleteTimesheet = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Timesheet entry not found' });
    }
    const existing = await Timesheet.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timesheet entry not found' });
    }
    const u = req.user;
    const isPriv = Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.permissions?.deleteTasks || u.permissions?.allAccess));
    const isOwner = Boolean(u && (
      String(existing.employeeId) === String(u._id) ||
      String(existing.employee) === String(u._id) ||
      (u.employeeCode && (String(existing.employeeCode).toUpperCase() === String(u.employeeCode).toUpperCase() || String(existing.employeeId).toUpperCase() === String(u.employeeCode).toUpperCase()))
    ));
    if (!isPriv && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete your own timesheet entries.' });
    }
    const timesheet = await Timesheet.findByIdAndDelete(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet entry not found' });
    }
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('timesheet:updated', { action: 'delete', id: String(timesheet._id) });
    } catch (_) {}
    res.status(200).json({
      success: true,
      message: 'Timesheet entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
