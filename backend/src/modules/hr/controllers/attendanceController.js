const Attendance = require('../models/Attendance');
const AttendanceAudit = require('../models/AttendanceAudit');
const Task = require('../../work/models/Task');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// ─── GET /api/attendance ─────────────────────────────────────────────────────
// Query: ?month=9&year=2026&employeeId=...
const getMonthlyAttendance = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: 'Database connecting, standby', data: [] });
  }

  const { month, year, employeeId } = req.query;

  const query = {};
  if (month && year) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    query.date = new RegExp(`^${monthStr}`);
  }

  // Tenant scoping: non-admin can only see own attendance
  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.systemRole === 'admin';

  if (!isPrivileged) {
    const myId = req.user?.id || req.user?._id;
    const myCode = req.user?.employeeCode;
    const matchConditions = [];
    if (myId && mongoose.Types.ObjectId.isValid(myId)) matchConditions.push({ employee: myId });
    if (myCode) matchConditions.push({ employeeCode: myCode });
    if (myId) matchConditions.push({ employeeId: String(myId) });

    if (matchConditions.length === 0 && employeeId && employeeId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(employeeId)) matchConditions.push({ employee: employeeId });
      matchConditions.push({ employeeCode: String(employeeId).toUpperCase() });
      matchConditions.push({ employeeId: String(employeeId) });
    }

    if (matchConditions.length > 0) {
      query.$or = matchConditions;
    }
  } else if (employeeId && employeeId !== 'all') {
    const matchConditions = [];
    if (mongoose.Types.ObjectId.isValid(employeeId)) matchConditions.push({ employee: employeeId });
    matchConditions.push({ employeeCode: String(employeeId).toUpperCase() });
    matchConditions.push({ employeeId: String(employeeId) });
    query.$or = matchConditions;
  }

  const records = await Attendance.find(query).sort(month && year ? { date: 1, employee: 1 } : { date: -1, employee: 1 });

  res.json({ success: true, count: records.length, data: records });
});

// ─── GET /api/attendance/summary ──────────────────────────────────────────────
// Returns aggregate counts for a given month/year/employee
const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { month, year, employeeId } = req.query;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const matchStage = { date: new RegExp(`^${monthStr}`) };
  const mongoose = require('mongoose');
  if (employeeId && employeeId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      matchStage.employee = new mongoose.Types.ObjectId(employeeId);
    } else {
      matchStage.employeeCode = String(employeeId).toUpperCase();
    }
  }

  const summary = await Attendance.aggregate([
    { $match: matchStage },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const result = {
    present: 0, late: 0, absent: 0,
    half_day: 0, holiday: 0, day_off: 0, on_leave: 0
  };
  summary.forEach(s => {
    if (result[s._id] !== undefined) result[s._id] = s.count;
  });

  res.json({ success: true, data: result });
});

// Helper: Robust AM/PM and 24-hr time parser to seconds
const parseTimeStringToSeconds = (str) => {
  if (!str) return 0;
  const m = String(str).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3] || '0', 10);
  const ampm = (m[4] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 3600 + min * 60 + sec;
};

// ─── POST /api/attendance/mark ────────────────────────────────────────────────
const markAttendance = asyncHandler(async (req, res) => {
  const rawEmp = req.body.employee || req.body.employeeId || req.body.employeeCode;
  const {
    date,
    status,
    clockInTime,
    clockOutTime,
    clockInTimestamp,
    clockOutTimestamp,
    workSeconds,
    breakSeconds,
    isOnBreak,
    breakType,
    breakHistory,
    isClockedIn,
    notes,
    markedBy,
    auditNote,
    isAdminOverride
  } = req.body;

  if (!rawEmp || !date || !status) {
    return res.status(400).json({ success: false, message: 'employee, date, and status are required' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (date > todayStr && ['present', 'late', 'half_day', 'absent'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot mark attendance as '${status}' for a future date (${date}). Attendance can only be recorded for today or past dates.`
    });
  }

  const Employee = require('../models/Employee');
  const mongoose = require('mongoose');

  let empDoc = null;
  if (mongoose.Types.ObjectId.isValid(rawEmp)) {
    empDoc = await Employee.findById(rawEmp);
  }
  if (!empDoc) {
    empDoc = await Employee.findOne({
      $or: [
        { employeeCode: String(rawEmp).toUpperCase() },
        { email: String(rawEmp).toLowerCase() },
        { name: new RegExp(`^${String(req.body.employeeName || rawEmp)}$`, 'i') }
      ]
    });
  }
  if (!empDoc && req.user) {
    empDoc = await Employee.findOne({
      $or: [
        { employeeCode: req.user.employeeCode },
        { email: req.user.email }
      ]
    });
  }

  const targetEmpId = empDoc ? empDoc._id : (mongoose.Types.ObjectId.isValid(rawEmp) ? rawEmp : new mongoose.Types.ObjectId());
  const targetEmpName = empDoc ? empDoc.name : (req.body.employeeName || 'Employee');
  const targetEmpCode = empDoc ? empDoc.employeeCode : (req.body.employeeCode || String(rawEmp));
  const targetEmpRole = empDoc ? empDoc.role : (req.body.employeeRole || 'Team Member');
  const targetEmpAvatar = empDoc ? empDoc.avatar : (req.body.employeeAvatar || '');

  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr';
  const adminActorId = req.user?.id || req.user?._id || markedBy || 'ADMIN';
  const adminActorName = req.user?.name || markedBy || 'HR Administrator';

  // Compute working hours and late calculation if both times exist
  let totalWorkingHours = 0;
  let isLate = status === 'late';
  let lateByMinutes = 0;

  if (clockInTime && clockOutTime) {
    const inSecs = parseTimeStringToSeconds(clockInTime);
    const outSecs = parseTimeStringToSeconds(clockOutTime);
    const diffSecs = Math.max(0, outSecs - inSecs);
    totalWorkingHours = +(diffSecs / 3600).toFixed(2);
    const graceLimit = 9 * 3600 + 30 * 60; // 09:30 AM
    if (inSecs > graceLimit) {
      isLate = true;
      lateByMinutes = Math.floor((inSecs - graceLimit) / 60);
    }
  }

  // Upsert: update existing or create new
  const updateFields = {
    employee: targetEmpId,
    employeeName: targetEmpName,
    employeeCode: targetEmpCode,
    employeeRole: targetEmpRole,
    employeeAvatar: targetEmpAvatar,
    date,
    status,
    notes: notes || (auditNote ? `Adjusted by ${adminActorName}: ${auditNote}` : ''),
    markedBy: adminActorName
  };

  if (clockInTime !== undefined) updateFields.clockInTime = clockInTime;
  if ('clockOutTime' in req.body) updateFields.clockOutTime = clockOutTime;
  if (clockInTimestamp !== undefined) updateFields.clockInTimestamp = clockInTimestamp;
  if ('clockOutTimestamp' in req.body) updateFields.clockOutTimestamp = clockOutTimestamp;
  if (workSeconds !== undefined) updateFields.workSeconds = Number(workSeconds) || 0;
  if (breakSeconds !== undefined) updateFields.breakSeconds = Number(breakSeconds) || 0;
  if (isOnBreak !== undefined) updateFields.isOnBreak = Boolean(isOnBreak);
  if (breakType !== undefined) updateFields.breakType = breakType;
  if (breakHistory !== undefined) updateFields.breakHistory = breakHistory;
  if ('punchSessions' in req.body) updateFields.punchSessions = req.body.punchSessions;

  if (isClockedIn !== undefined) {
    updateFields.isClockedIn = Boolean(isClockedIn);
  } else if (clockInTime && !clockOutTime) {
    updateFields.isClockedIn = true;
  } else if (clockOutTime) {
    updateFields.isClockedIn = false;
  }

  if (workSeconds !== undefined && Number(workSeconds) > 0) {
    updateFields.totalWorkingHours = +(Number(workSeconds) / 3600).toFixed(2);
  } else if (totalWorkingHours > 0) {
    updateFields.totalWorkingHours = totalWorkingHours;
  }
  updateFields.isLate = isLate;
  updateFields.lateByMinutes = lateByMinutes;

  const record = await Attendance.findOneAndUpdate(
    {
      date,
      $or: [
        { employee: targetEmpId },
        { employeeCode: targetEmpCode }
      ]
    },
    updateFields,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // Mandatory Audit Trail for Admin manual modifications
  if (auditNote || isAdminOverride || isPrivileged) {
    try {
      await AttendanceAudit.create({
        employee: targetEmpId,
        employeeId: String(targetEmpId),
        employeeName: record.employeeName || 'Employee',
        employeeCode: record.employeeCode || '',
        date,
        timeFormatted: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: 'admin_shift_adjustment',
        action: 'Admin Shift Hour Adjustment',
        durationSeconds: (record.totalWorkingHours || 0) * 3600,
        durationText: `${record.totalWorkingHours || 0}h`,
        actor: 'admin',
        actorId: String(adminActorId),
        actorName: adminActorName,
        isAdminOverride: true,
        adminId: String(adminActorId),
        adminName: adminActorName,
        auditNote: auditNote || 'Manual administrative attendance adjustment',
        details: `Shift manually adjusted by Admin ${adminActorName} (ID: ${adminActorId}). Status: ${status}, In: ${clockInTime || '—'}, Out: ${clockOutTime || '—'}. Reason: "${auditNote || 'Administrative review'}"`
      });
    } catch (auditErr) {
      console.warn('Failed to record admin shift adjustment audit:', auditErr);
    }
  }

  res.status(200).json({ success: true, data: record });
});

// ─── GET /api/attendance/daily ───────────────────────────────────────────────
const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const records = await Attendance.find({ date: targetDate }).sort({ employeeName: 1 });
  res.json({ success: true, count: records.length, date: targetDate, data: records });
});

// ─── POST /api/attendance/bulk ───────────────────────────────────────────────
const bulkMarkAttendance = asyncHandler(async (req, res) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'records array is required' });
  }

  const operations = records.map(r => ({
    updateOne: {
      filter: { employee: r.employee, date: r.date },
      update: { $set: r },
      upsert: true
    }
  }));

  const result = await Attendance.bulkWrite(operations);
  res.status(200).json({ success: true, message: 'Bulk attendance recorded', data: result });
});

// ─── DELETE /api/attendance/:id ───────────────────────────────────────────────
const deleteAttendanceRecord = asyncHandler(async (req, res) => {
  const record = await Attendance.findByIdAndDelete(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });
  res.json({ success: true, message: 'Record deleted', data: {} });
});

// ═════════════════════════════════════════════════════════════════════════════
// 📋 AUDIT TRAIL & ADMIN OVERRIDE CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

// ─── GET /api/attendance/audit ───────────────────────────────────────────────
const getAuditLogs = asyncHandler(async (req, res) => {
  const { employeeId, date, month, year, type, onlyOverrides } = req.query;
  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.systemRole === 'admin';

  const query = {};

  // Strict Tenant Scoping: non-privileged users only see their own audit events
  if (!isPrivileged) {
    const myId = req.user?.id || req.user?._id;
    const myCode = req.user?.employeeCode;
    query.$or = [
      { employeeId: String(myId) },
      { employee: myId },
      ...(myCode ? [{ employeeCode: myCode }, { employeeId: myCode }] : [])
    ];
  } else if (employeeId && employeeId !== 'all') {
    query.$or = [
      { employeeId: String(employeeId) },
      { employee: employeeId },
      { employeeCode: employeeId }
    ];
  }

  if (date) query.date = date;
  if (month && year) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    query.date = new RegExp(`^${monthStr}`);
  }
  if (type && type !== 'all') query.type = type;
  if (onlyOverrides === 'true' || onlyOverrides === true) query.isAdminOverride = true;

  const logs = await AttendanceAudit.find(query).sort({ timestamp: -1 }).limit(500);
  res.json({ success: true, count: logs.length, data: logs });
});

// ─── POST /api/attendance/audit ──────────────────────────────────────────────
const createAuditLog = asyncHandler(async (req, res) => {
  const auditData = { ...(req.body || {}) };
  // Remove client-generated custom string _id so MongoDB creates a valid ObjectId
  delete auditData._id;

  const employeeId = String(auditData.employeeId || auditData.employeeCode || req.user?.id || req.user?._id || '');
  const type = auditData.type || auditData.action || 'system';
  const action = auditData.action || auditData.type || 'audit';

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'employeeId is required' });
  }

  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr';
  const isAdminOverride = !!auditData.isAdminOverride || (isPrivileged && auditData.actor === 'admin');

  // Sanitize employee field - must be valid Mongo ObjectId or omitted
  const mongoose = require('mongoose');
  let validEmployeeObjId = undefined;
  if (auditData.employee && mongoose.Types.ObjectId.isValid(auditData.employee)) {
    validEmployeeObjId = auditData.employee;
  }
  delete auditData.employee;

  let actor = auditData.actor || (isPrivileged ? 'admin' : 'employee');
  if (!['employee', 'admin', 'system'].includes(actor)) {
    actor = isPrivileged ? 'admin' : 'employee';
  }

  const employeeName = auditData.employeeName || req.user?.name || 'Employee';

  const record = new AttendanceAudit({
    ...auditData,
    employee: validEmployeeObjId,
    employeeId,
    employeeName,
    type,
    action,
    date: auditData.date || new Date().toISOString().split('T')[0],
    timeFormatted: auditData.timeFormatted || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    actor,
    actorId: auditData.actorId || req.user?.id || req.user?._id || 'unknown',
    actorName: auditData.actorName || req.user?.name || 'User',
    isAdminOverride,
    adminId: isAdminOverride ? (auditData.adminId || req.user?.id || req.user?._id) : null,
    adminName: isAdminOverride ? (auditData.adminName || req.user?.name) : null,
    auditNote: auditData.auditNote || null
  });

  await record.save();
  res.status(201).json({ success: true, data: record });
});

// ─── POST /api/attendance/force-clock-out ─────────────────────────────────────
// Admin Override: Forcefully clock out an active employee with mandatory audit note
const forceClockOut = asyncHandler(async (req, res) => {
  const { employeeId, date, auditNote } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'employeeId is required' });
  }

  const noteText = (auditNote && auditNote.trim()) ? auditNote.trim() : 'Manual clock out by administrator';
  const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const adminId = req.user?.id || req.user?._id || 'ADMIN';
  const adminName = req.user?.name || 'Administrator';
  const Employee = require('../models/Employee');
  const mongoose = require('mongoose');

  // Safely resolve employee document
  let empDoc = null;
  if (mongoose.Types.ObjectId.isValid(employeeId)) {
    empDoc = await Employee.findById(employeeId);
  }
  if (!empDoc) {
    empDoc = await Employee.findOne({
      $or: [
        { employeeCode: String(employeeId).toUpperCase() },
        { email: String(employeeId).toLowerCase() },
        { name: new RegExp(`^${String(employeeId)}$`, 'i') }
      ]
    });
  }

  const targetEmpId = empDoc ? empDoc._id : (mongoose.Types.ObjectId.isValid(employeeId) ? employeeId : null);
  const targetEmpCode = empDoc ? empDoc.employeeCode : String(employeeId);
  const targetEmpName = empDoc ? empDoc.name : 'Employee';

  // Build match query for Attendance record without invalid ObjectId casting
  const matchOr = [
    { employeeId: String(targetEmpCode) },
    { employeeId: String(employeeId) },
    { employeeCode: String(targetEmpCode) }
  ];
  if (targetEmpId) {
    matchOr.unshift({ employee: targetEmpId });
  }

  let attRecord = await Attendance.findOne({
    $or: matchOr,
    date: targetDate
  });

  if (attRecord) {
    attRecord.clockOutTime = nowStr;
    attRecord.clockOutTimestamp = Date.now();
    attRecord.isClockedIn = false;
    attRecord.isOnBreak = false;
    attRecord.status = attRecord.status || 'present';
    attRecord.notes = `Manual Clock-Out by Admin ${adminName}: "${noteText}"`;
    attRecord.markedBy = adminName;
    await attRecord.save();
  } else {
    attRecord = await Attendance.create({
      employee: targetEmpId || new mongoose.Types.ObjectId(),
      employeeName: targetEmpName,
      employeeCode: targetEmpCode,
      employeeRole: empDoc ? empDoc.role : 'Team Member',
      date: targetDate,
      status: 'present',
      clockInTime: '09:30 AM',
      clockOutTime: nowStr,
      clockOutTimestamp: Date.now(),
      isClockedIn: false,
      isOnBreak: false,
      markedBy: adminName,
      notes: `Manual Clock-Out by Admin ${adminName}: "${noteText}"`
    });
  }

  // Create official Audit Trail record
  const auditEntry = new AttendanceAudit({
    employeeId: String(targetEmpCode || employeeId),
    employeeName: targetEmpName,
    employeeCode: targetEmpCode,
    date: targetDate,
    timeFormatted: nowStr,
    type: 'admin_force_clock_out',
    action: 'Admin Force Clock-Out',
    actor: 'admin',
    actorId: String(adminId),
    actorName: adminName,
    isAdminOverride: true,
    adminId: String(adminId),
    adminName,
    auditNote: noteText,
    details: `Administrator ${adminName} [ID: ${adminId}] manually forced shift clock-out. Reason: "${noteText}"`
  });

  // Automatically pause any running task in MongoDB for this employee
  try {
    const taskMatch = [
      { assignedToId: String(employeeId) },
      { assignedToId: String(targetEmpCode) },
      { assignedToIds: String(employeeId) },
      { assignedToIds: String(targetEmpCode) },
      { activeUserId: String(employeeId) },
      { activeUserId: String(targetEmpCode) }
    ];
    if (targetEmpId) {
      taskMatch.push({ assignedTo: targetEmpId });
    }
    const runningTasks = await Task.find({
      timerRunning: true,
      $or: taskMatch
    });
    for (const rt of runningTasks) {
      let currentSecs = (rt.accumulatedSeconds !== undefined && rt.accumulatedSeconds !== null)
        ? Number(rt.accumulatedSeconds)
        : (Number(rt.timerSeconds) || 0);
      if (rt.startedAt) {
        currentSecs += Math.max(0, Math.floor((Date.now() - Number(rt.startedAt)) / 1000));
      }
      rt.timerRunning = false;
      rt.startedAt = null;
      rt.accumulatedSeconds = currentSecs;
      rt.timerSeconds = currentSecs;
      await rt.save();
    }
  } catch (taskErr) {
    console.warn('Failed to auto-pause tasks during force clock-out:', taskErr);
  }

  try {
    await auditEntry.save();
  } catch (auditErr) {
    console.warn('Could not save auditEntry in forceClockOut:', auditErr);
  }

  res.status(200).json({
    success: true,
    message: `Shift forcefully clocked out by Admin ${adminName}`,
    data: { attendance: attRecord, audit: auditEntry }
  });
});

// ─── GET /api/attendance/overtime ─────────────────────────────────────────────
const getOvertimeRequests = asyncHandler(async (req, res) => {
  const query = { overtimeStatus: { $in: ['pending', 'approved', 'rejected'] } };
  const records = await Attendance.find(query).sort({ date: -1, updatedAt: -1 });
  res.json({ success: true, count: records.length, data: records });
});

// ─── POST /api/attendance/overtime ────────────────────────────────────────────
const requestOvertime = asyncHandler(async (req, res) => {
  const { employeeId, employeeCode, employeeName, date, overtimeHours, overtimeSeconds, overtimeReason, overtimeTasks, requestedToId, requestedToName, isSelfApproved } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const mongoose = require('mongoose');
  let attRecord = await Attendance.findOne({
    date: targetDate,
    $or: [
      { employeeCode: employeeCode ? String(employeeCode).toUpperCase() : undefined },
      { employeeId: String(employeeId) },
      mongoose.Types.ObjectId.isValid(employeeId) ? { employee: employeeId } : null
    ].filter(Boolean)
  });

  const status = isSelfApproved ? 'approved' : 'pending';
  const approverName = isSelfApproved ? (employeeName || req.user?.name || 'Admin') : '';
  const approvedAt = isSelfApproved ? new Date() : null;

  if (attRecord) {
    attRecord.overtimeHours = Number(overtimeHours) || +(Number(overtimeSeconds) / 3600).toFixed(2);
    attRecord.overtimeSeconds = Number(overtimeSeconds) || 0;
    attRecord.overtimeStatus = status;
    attRecord.overtimeReason = overtimeReason || '';
    attRecord.overtimeTasks = overtimeTasks || [];
    attRecord.overtimeRequestedTo = requestedToName || '';
    attRecord.overtimeApprovedBy = approverName;
    attRecord.overtimeApprovedAt = approvedAt;
    await attRecord.save();
  }

  // Create audit log
  try {
    const auditEntry = new AttendanceAudit({
      employee: attRecord?.employee || employeeId,
      employeeName: employeeName || 'Employee',
      employeeCode: employeeCode || '',
      type: 'overtime_request',
      action: isSelfApproved ? 'overtime_self_approved' : 'overtime_requested',
      date: targetDate,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      performedBy: employeeName || req.user?.name || 'User',
      note: `${isSelfApproved ? 'Self-approved' : 'Submitted'} overtime of ${overtimeHours || 0}h: ${overtimeReason || ''}`
    });
    await auditEntry.save();
  } catch (_) {}

  res.json({ success: true, message: `Overtime request ${status}`, data: attRecord });
});

// ─── PUT /api/attendance/overtime/:id/status ──────────────────────────────────
const updateOvertimeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, approverName, rejectionReason } = req.body;

  const attRecord = await Attendance.findById(id);
  if (!attRecord) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }

  attRecord.overtimeStatus = status;
  attRecord.overtimeApprovedBy = approverName || req.user?.name || 'Admin';
  attRecord.overtimeApprovedAt = new Date();
  if (rejectionReason) {
    attRecord.notes = attRecord.notes ? `${attRecord.notes} | Overtime rejected: ${rejectionReason}` : `Overtime rejected: ${rejectionReason}`;
  }
  await attRecord.save();

  // Create audit log
  try {
    const auditEntry = new AttendanceAudit({
      employee: attRecord.employee,
      employeeName: attRecord.employeeName,
      employeeCode: attRecord.employeeCode,
      type: 'overtime_decision',
      action: `overtime_${status}`,
      date: attRecord.date,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      performedBy: approverName || req.user?.name || 'Admin',
      note: `Overtime ${status} by ${approverName || 'Admin'}${rejectionReason ? `: ${rejectionReason}` : ''}`
    });
    await auditEntry.save();
  } catch (_) {}

  res.json({ success: true, message: `Overtime request ${status}`, data: attRecord });
});

module.exports = {
  getMonthlyAttendance,
  getAttendanceSummary,
  getAttendanceByDate,
  markAttendance,
  bulkMarkAttendance,
  deleteAttendance: deleteAttendanceRecord,
  deleteAttendanceRecord,
  getAuditLogs,
  createAuditLog,
  forceClockOut,
  getOvertimeRequests,
  requestOvertime,
  updateOvertimeStatus
};
