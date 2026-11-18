const Attendance = require('../models/Attendance');
const AttendanceAudit = require('../models/AttendanceAudit');
const Task = require('../../work/models/Task');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// In-memory cache of live telemetry for sub-millisecond response to Live Operations dashboard
const liveTelemetryCache = new Map();

// ⏱️ Auto-close past-day unclosed shifts (runs daily at midnight or upon request)
const autoClosePastDayShifts = async () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    await Attendance.updateMany(
      {
        date: { $lt: todayStr },
        isClockedIn: true,
        clockOutTime: null
      },
      {
        $set: {
          isClockedIn: false,
          isOnBreak: false,
          clockOutTime: '07:00 PM',
          clockOut: '07:00 PM',
          workSeconds: 32400, // Standard 9 hrs
          totalWorkingHours: 9.0,
          notes: 'Auto-closed at midnight (daily shift reset)'
        }
      }
    );
  } catch (err) {
    console.warn('[attendanceController] Auto-close past day shifts error:', err.message);
  }
};

// ─── GET /api/attendance ─────────────────────────────────────────────────────
// Query: ?month=9&year=2026&employeeId=...
const getMonthlyAttendance = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    const start = Date.now();
    while (mongoose.connection.readyState !== 1 && Date.now() - start < 2000) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database connecting, standby', data: [] });
    }
  }

  // Auto-close any unclosed shifts from previous calendar days
  await autoClosePastDayShifts();

  const { month, year, employeeId } = req.query;

  const query = {};
  if (month && year) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    query.date = new RegExp(`^${monthStr}`);
  }

  // Tenant scoping: non-admin can only see own attendance
  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.systemRole === 'admin' || req.user?.permissions?.viewAllAttendance || req.user?.permissions?.allAccess || req.user?.permissions?.liveOperations || req.user?.permissions?.teamoperations;

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
  const formattedRecords = records.map(r => {
    const obj = r.toObject ? r.toObject() : { ...r };
    if (!obj.employeeId && obj.employee) {
      obj.employeeId = String(obj.employee);
    }
    return obj;
  });

  res.json({ success: true, count: formattedRecords.length, data: formattedRecords });
});

// ─── GET /api/attendance/summary ──────────────────────────────────────────────
// Returns aggregate counts for a given month/year/employee
const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { month, year, employeeId } = req.query;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const matchStage = { date: new RegExp(`^${monthStr}`) };
  const mongoose = require('mongoose');

  // Tenant scoping: non-admin can only see own attendance summary
  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.systemRole === 'admin' || req.user?.permissions?.viewAllAttendance || req.user?.permissions?.allAccess;
  if (!isPrivileged) {
    const myId = req.user?.id || req.user?._id;
    const myCode = req.user?.employeeCode;
    const matchConditions = [];
    if (myId && mongoose.Types.ObjectId.isValid(myId)) matchConditions.push({ employee: new mongoose.Types.ObjectId(myId) });
    if (myCode) matchConditions.push({ employeeCode: myCode });
    if (myId) matchConditions.push({ employeeId: String(myId) });
    if (matchConditions.length > 0) {
      matchStage.$or = matchConditions;
    }
  } else if (employeeId && employeeId !== 'all') {
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

  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.permissions?.editAttendance || req.user?.permissions?.allAccess;
  const adminActorId = req.user?.id || req.user?._id || markedBy || 'ADMIN';
  const adminActorName = req.user?.name || markedBy || 'HR Administrator';

  // Dynamically load CompanySettings for shift timing, grace period & half-day threshold
  const CompanySettings = require('../../settings/models/CompanySettings');
  let companySettings = null;
  try {
    companySettings = await CompanySettings.findOne().lean();
  } catch (err) {
    console.warn('[attendanceController] Could not fetch CompanySettings, using defaults:', err.message);
  }

  const shiftStartTime = companySettings?.shiftStartTime || '09:30 AM';
  const graceMins = companySettings?.gracePeriodMinutes !== undefined ? Number(companySettings.gracePeriodMinutes) : 15;
  const standardWorkHours = companySettings?.standardWorkHours !== undefined ? Number(companySettings.standardWorkHours) : 9;
  const halfDayThresholdHours = companySettings?.halfDayThresholdHours !== undefined ? Number(companySettings.halfDayThresholdHours) : 4.5;

  const shiftStartSecs = parseTimeStringToSeconds(shiftStartTime);
  const graceLimitSecs = shiftStartSecs + (graceMins * 60);

  // Compute working hours and late calculation dynamically based on company policy
  let totalWorkingHours = 0;
  let isLate = status === 'late';
  let lateByMinutes = 0;
  let calculatedStatus = status;

  if (clockInTime) {
    const inSecs = parseTimeStringToSeconds(clockInTime);
    if (inSecs > graceLimitSecs) {
      isLate = true;
      lateByMinutes = Math.floor((inSecs - shiftStartSecs) / 60);
      if (calculatedStatus === 'present') {
        calculatedStatus = 'late';
      }
    }
  }

  if (clockInTime && clockOutTime) {
    const inSecs = parseTimeStringToSeconds(clockInTime);
    const outSecs = parseTimeStringToSeconds(clockOutTime);
    const diffSecs = Math.max(0, outSecs - inSecs);
    totalWorkingHours = +(diffSecs / 3600).toFixed(2);
  }

  const effectiveWorkHours = (workSeconds !== undefined && Number(workSeconds) > 0)
    ? +(Number(workSeconds) / 3600).toFixed(2)
    : totalWorkingHours;

  // Evaluate half-day if employee worked fewer hours than company half-day threshold
  if (clockOutTime && effectiveWorkHours > 0 && effectiveWorkHours < halfDayThresholdHours && !['on_leave', 'holiday', 'day_off'].includes(calculatedStatus)) {
    calculatedStatus = 'half_day';
  }

  // Calculate Overtime if employee worked beyond standard work hours
  let overtimeHours = 0;
  let overtimeSeconds = 0;
  if (effectiveWorkHours > standardWorkHours) {
    overtimeHours = +(effectiveWorkHours - standardWorkHours).toFixed(2);
    overtimeSeconds = Math.round(overtimeHours * 3600);
  }

  // Upsert: update existing or create new
  const updateFields = {
    employee: targetEmpId,
    employeeName: targetEmpName,
    employeeCode: targetEmpCode,
    employeeRole: targetEmpRole,
    employeeAvatar: targetEmpAvatar,
    date,
    status: calculatedStatus,
    notes: notes || (auditNote ? `Adjusted by ${adminActorName}: ${auditNote}` : ''),
    markedBy: adminActorName,
    overtimeHours,
    overtimeSeconds
  };

  // Check for existing record to preserve immutable first clock-in of the day
  const existingRecord = await Attendance.findOne({
    date,
    $or: [
      { employee: targetEmpId },
      { employeeCode: targetEmpCode }
    ]
  });

  if (existingRecord && existingRecord.clockInTime && !isAdminOverride) {
    // Preserve initial first clock-in of the day across re-clock-ins
    updateFields.clockInTime = existingRecord.clockInTime;
    if (existingRecord.clockInTimestamp) {
      updateFields.clockInTimestamp = existingRecord.clockInTimestamp;
    }
  } else if (clockInTime !== undefined) {
    updateFields.clockInTime = clockInTime;
    if (clockInTimestamp !== undefined) updateFields.clockInTimestamp = clockInTimestamp;
  }
  if ('clockOutTime' in req.body) updateFields.clockOutTime = clockOutTime;
  if ('clockOutTimestamp' in req.body) updateFields.clockOutTimestamp = clockOutTimestamp;
  if (workSeconds !== undefined) updateFields.workSeconds = Number(workSeconds) || 0;
  if (breakSeconds !== undefined) updateFields.breakSeconds = Number(breakSeconds) || 0;
  if (isOnBreak !== undefined) updateFields.isOnBreak = Boolean(isOnBreak);
  if (breakType !== undefined) updateFields.breakType = breakType;
  if (breakHistory !== undefined) updateFields.breakHistory = breakHistory;
  if ('punchSessions' in req.body) updateFields.punchSessions = req.body.punchSessions;
  if (req.body.currentSessionStartTimestamp !== undefined) updateFields.currentSessionStartTimestamp = Number(req.body.currentSessionStartTimestamp) || null;
  if (req.body.breakStartTimestamp !== undefined) updateFields.breakStartTimestamp = Number(req.body.breakStartTimestamp) || null;
  if ('activeTask' in req.body) updateFields.activeTask = req.body.activeTask;
  if (req.body.overtimeSeconds !== undefined) {
    const otSecs = Math.max(0, Number(req.body.overtimeSeconds) || 0);
    updateFields.overtimeSeconds = otSecs;
    updateFields.overtimeHours = +(otSecs / 3600).toFixed(2);
    if (otSecs > 0) {
      updateFields.overtimeStatus = 'auto_recorded';
      if (!updateFields.overtimeReason) updateFields.overtimeReason = 'Auto-tracked (outside 10:00 AM - 07:00 PM shift)';
    }
  }
  updateFields.lastHeartbeatAt = Date.now();

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

  const resObj = record.toObject ? record.toObject() : { ...record };
  resObj.employeeId = String(resObj.employee || targetEmpId);

  // Keep in-memory liveTelemetryCache strictly aligned with authoritative DB clock-in / clock-out records
  const todayIst = new Date(Date.now() + 330 * 60000).toISOString().split('T')[0];
  if (date === todayStr || date === todayIst) {
    try {
      const normCode = String(resObj.employeeCode || targetEmpCode || '').trim().toUpperCase();
      const normId = String(resObj.employee || targetEmpId || '');
      const telemEntry = {
        employeeId: normId,
        employeeCode: normCode,
        employeeName: resObj.employeeName || targetEmpName || '',
        date,
        status: resObj.status,
        isClockedIn: Boolean(resObj.isClockedIn && !resObj.clockOutTime),
        isClockedOut: Boolean(resObj.clockOutTime || resObj.clockOut),
        clockInTime: resObj.clockInTime || resObj.clockIn || null,
        clockInTimestamp: resObj.clockInTimestamp ? Number(resObj.clockInTimestamp) : null,
        currentSessionStartTimestamp: resObj.currentSessionStartTimestamp ? Number(resObj.currentSessionStartTimestamp) : (resObj.clockInTimestamp ? Number(resObj.clockInTimestamp) : null),
        clockOutTime: resObj.clockOutTime || resObj.clockOut || null,
        clockOutTimestamp: resObj.clockOutTimestamp ? Number(resObj.clockOutTimestamp) : null,
        workSeconds: Number(resObj.workSeconds) || 0,
        overtimeSeconds: Number(resObj.overtimeSeconds) || 0,
        overtimeHours: Number(resObj.overtimeHours) || +((Number(resObj.overtimeSeconds) || 0) / 3600).toFixed(2),
        overtimeStatus: resObj.overtimeStatus || (Number(resObj.overtimeSeconds) > 0 ? 'auto_recorded' : 'none'),
        isOnBreak: Boolean(resObj.isOnBreak),
        breakType: resObj.breakType || null,
        breakStartTimestamp: resObj.breakStartTimestamp ? Number(resObj.breakStartTimestamp) : null,
        activeTask: resObj.activeTask || null,
        lastHeartbeatAt: Date.now()
      };
      if (normId) liveTelemetryCache.set(normId, telemEntry);
      if (normCode) {
        liveTelemetryCache.set(normCode, telemEntry);
        liveTelemetryCache.set(normCode.toLowerCase(), telemEntry);
      }
      if (telemEntry.employeeName) {
        liveTelemetryCache.set(`name_${String(telemEntry.employeeName).trim().toLowerCase()}`, telemEntry);
      }
    } catch (_) {}
  }

  try {
    const { emitToAll, emitToUser } = require('../../../shared/socket/socketManager');
    emitToAll('attendance:update', resObj);
    emitToUser(String(resObj.employee || targetEmpId), 'attendance:update', resObj);
    if (resObj.employeeCode) emitToUser(String(resObj.employeeCode), 'attendance:update', resObj);
  } catch (_) {}
  res.status(200).json({ success: true, data: resObj });
});

// ─── GET /api/attendance/daily ───────────────────────────────────────────────
const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  const mongoose = require('mongoose');

  const query = { date: targetDate };
  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.systemRole === 'admin' || req.user?.permissions?.viewAllAttendance || req.user?.permissions?.liveOperations || req.user?.permissions?.teamoperations || req.user?.permissions?.allAccess;
  if (!isPrivileged) {
    const myId = req.user?.id || req.user?._id;
    const myCode = req.user?.employeeCode;
    const matchConditions = [];
    if (myId && mongoose.Types.ObjectId.isValid(myId)) matchConditions.push({ employee: myId });
    if (myCode) matchConditions.push({ employeeCode: myCode });
    if (myId) matchConditions.push({ employeeId: String(myId) });
    if (matchConditions.length > 0) {
      query.$or = matchConditions;
    }
  }

  const records = await Attendance.find(query).sort({ employeeName: 1 });
  const formattedRecords = records.map(r => {
    const obj = r.toObject ? r.toObject() : { ...r };
    if (!obj.employeeId && obj.employee) {
      obj.employeeId = String(obj.employee);
    }
    return obj;
  });
  res.json({ success: true, count: formattedRecords.length, date: targetDate, data: formattedRecords });
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
  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.systemRole === 'admin' || req.user?.permissions?.viewAuditTrail || req.user?.permissions?.liveOperations || req.user?.permissions?.teamoperations || req.user?.permissions?.allAccess;

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

  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.permissions?.editAttendance || req.user?.permissions?.allAccess;
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
  try {
    const { emitToAll } = require('../../../shared/socket/socketManager');
    emitToAll('attendance:audit:created', record);
  } catch (_) {}
  res.status(201).json({ success: true, data: record });
});

// ─── POST /api/attendance/force-clock-out ─────────────────────────────────────
// Admin Override: Forcefully clock out an active employee with mandatory audit note
const forceClockOut = asyncHandler(async (req, res) => {
  const isPrimaryAdminUser = req.user?.isSuperAdmin || String(req.user?.employeeCode || '').toUpperCase() === 'ADM-001';
  const explicitlyDenied = !isPrimaryAdminUser && req.user?.permissions?.forceClockOut === false;
  const isPrivileged = !explicitlyDenied && (
    isPrimaryAdminUser ||
    req.user?.isAdmin ||
    req.user?.role === 'admin' ||
    req.user?.role === 'hr' ||
    req.user?.systemRole === 'admin' ||
    req.user?.permissions?.forceClockOut === true ||
    req.user?.permissions?.allAccess === true
  );
  if (!isPrivileged) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Force Clock-Out permission is required.' });
  }

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
    const nowTs = Date.now();
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();

    let updatedSessions = Array.isArray(attRecord.punchSessions) ? [...attRecord.punchSessions] : [];
    const lastSessionOut = updatedSessions.length > 0
      ? Math.max(...updatedSessions.map(s => Number(s.outTimestamp || s.inTimestamp || 0)))
      : 0;

    let sessStartTs = Number(attRecord.currentSessionStartTimestamp);
    if (!sessStartTs || sessStartTs < todayMidnightMs) {
      if (lastSessionOut > 0) {
        sessStartTs = lastSessionOut;
      } else {
        sessStartTs = Number(attRecord.clockInTimestamp) || (todayMidnightMs + parseTimeStringToSeconds(attRecord.clockInTime || nowStr) * 1000);
      }
    }
    if (lastSessionOut > 0 && sessStartTs < lastSessionOut) {
      sessStartTs = lastSessionOut;
    }
    sessStartTs = Math.max(sessStartTs, todayMidnightMs);

    const grossSessionSecs = Math.max(0, Math.floor((nowTs - sessStartTs) / 1000));
    if (grossSessionSecs > 0 && sessStartTs < nowTs) {
      const sessInStr = attRecord.clockInTime || nowStr;
      const newSession = {
        id: `sess_${nowTs}`,
        sessionNumber: updatedSessions.length + 1,
        inTime: sessInStr,
        outTime: nowStr,
        inTimestamp: sessStartTs,
        outTimestamp: nowTs,
        durationSeconds: grossSessionSecs,
        durationText: `${Math.floor(grossSessionSecs / 3600)}h ${Math.floor((grossSessionSecs % 3600) / 60)}m`
      };
      updatedSessions.push(newSession);
    }

    const sessionsSum = updatedSessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0);
    const finalWorkSecs = Math.max(Number(attRecord.workSeconds) || 0, sessionsSum);
    const finalWorkHours = +(finalWorkSecs / 3600).toFixed(2);

    attRecord.clockOutTime = nowStr;
    attRecord.clockOutTimestamp = nowTs;
    attRecord.isClockedIn = false;
    attRecord.isOnBreak = false;
    attRecord.workSeconds = finalWorkSecs;
    attRecord.totalWorkingHours = finalWorkHours;
    attRecord.punchSessions = updatedSessions;
    if (finalWorkHours >= 4.5 && attRecord.status === 'half_day') {
      attRecord.status = 'present';
    }
    const standardWorkHours = 9;
    if (finalWorkHours > standardWorkHours) {
      attRecord.overtimeHours = +(finalWorkHours - standardWorkHours).toFixed(2);
      attRecord.overtimeSeconds = Math.round(attRecord.overtimeHours * 3600);
    }
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
      clockInTime: nowStr,
      workSeconds: 0,
      totalWorkingHours: 0,
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

  // Update live telemetry cache immediately so Live Operations reflects clock-out with 0ms delay
  try {
    const outPayload = {
      employeeId: String(targetEmpId),
      employeeCode: String(targetEmpCode || '').toUpperCase(),
      employeeName: targetEmpName,
      date: targetDate,
      isClockedIn: false,
      isClockedOut: true,
      isOnBreak: false,
      clockInTime: attRecord?.clockInTime || null,
      clockOutTime: nowStr,
      workSeconds: Number(attRecord?.workSeconds) || 0,
      activeTask: null,
      lastHeartbeatAt: Date.now()
    };
    if (targetEmpId) liveTelemetryCache.set(String(targetEmpId), outPayload);
    if (targetEmpCode) {
      liveTelemetryCache.set(String(targetEmpCode).toUpperCase(), outPayload);
      liveTelemetryCache.set(String(targetEmpCode).toLowerCase(), outPayload);
    }
    if (targetEmpName) liveTelemetryCache.set(`name_${String(targetEmpName).trim().toLowerCase()}`, outPayload);
  } catch (_) {}

  try {
    const { emitToAll, emitToUser } = require('../../../shared/socket/socketManager');
    emitToAll('attendance:force_clock_out', { employeeId: String(targetEmpId), employeeCode: targetEmpCode, adminName, clockOutTime: nowStr, workSeconds: Number(attRecord?.workSeconds) || 0 });
    emitToUser(String(targetEmpId), 'attendance:force_clock_out', { employeeId: String(targetEmpId), employeeCode: targetEmpCode, adminName, clockOutTime: nowStr, workSeconds: Number(attRecord?.workSeconds) || 0 });
    if (targetEmpCode) emitToUser(String(targetEmpCode), 'attendance:force_clock_out', { employeeId: String(targetEmpId), employeeCode: targetEmpCode, adminName, clockOutTime: nowStr, workSeconds: Number(attRecord?.workSeconds) || 0 });
    emitToAll('attendance:audit:created', auditEntry);
  } catch (_) {}

  res.status(200).json({
    success: true,
    message: `Shift forcefully clocked out by Admin ${adminName}`,
    data: { attendance: attRecord, audit: auditEntry }
  });
});

// ─── GET /api/attendance/overtime ─────────────────────────────────────────────
const getOvertimeRequests = asyncHandler(async (req, res) => {
  const query = {
    $or: [
      { overtimeSeconds: { $gt: 0 } },
      { overtimeHours: { $gt: 0 } },
      { overtimeStatus: { $in: ['auto_recorded', 'pending', 'approved', 'rejected'] } }
    ]
  };
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

// ─── POST /api/attendance/heartbeat ──────────────────────────────────────────
// Lightweight telemetry pulse sent by employee client while shift or task is active
const updateLiveHeartbeat = asyncHandler(async (req, res) => {
  const {
    employeeId,
    employeeCode,
    isClockedIn,
    clockInTime,
    clockInTimestamp,
    currentSessionStartTimestamp,
    workSeconds,
    isOnBreak,
    breakType,
    breakStartTimestamp,
    activeTask,
    taskOnly
  } = req.body;

  const mongoose = require('mongoose');
  const Employee = require('../models/Employee');

  const rawId = String(employeeId || req.user?.id || req.user?._id || '').trim();
  const rawCode = String(employeeCode || '').trim();
  const today = req.body.date || new Date().toISOString().split('T')[0];

  if (!rawId && !rawCode) {
    return res.status(400).json({ success: false, message: 'employeeId or employeeCode is required' });
  }

  // Always resolve canonical Employee document so we never write an ObjectId as employeeCode
  // or write the actor's name onto another employee's attendance record!
  let empDoc = null;
  try {
    if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
      empDoc = await Employee.findById(rawId).select('_id employeeCode name').lean();
    }
    if (!empDoc && rawCode && !mongoose.Types.ObjectId.isValid(rawCode)) {
      empDoc = await Employee.findOne({ employeeCode: rawCode.toUpperCase() }).select('_id employeeCode name').lean();
    }
    if (!empDoc && rawId && !mongoose.Types.ObjectId.isValid(rawId)) {
      empDoc = await Employee.findOne({ employeeCode: rawId.toUpperCase() }).select('_id employeeCode name').lean();
    }
  } catch (_) {}

  const targetId = empDoc ? String(empDoc._id) : rawId;
  const targetCode = empDoc
    ? String(empDoc.employeeCode || '').trim().toUpperCase()
    : (rawCode && !mongoose.Types.ObjectId.isValid(rawCode) ? rawCode.toUpperCase() : String(req.user?.employeeCode || '').trim().toUpperCase());
  const targetName = empDoc
    ? empDoc.name
    : (req.body.employeeName || req.user?.name || '');

  // Look up existing telemetry / attendance so partial updates (like task start/pause) NEVER wipe workSeconds to 0!
  let existing = (targetCode && liveTelemetryCache.get(targetCode)) ||
    (targetId && liveTelemetryCache.get(targetId)) ||
    null;

  if (!existing || existing.date !== today) {
    try {
      const orLookup = [];
      if (targetId && mongoose.Types.ObjectId.isValid(targetId)) orLookup.push({ employee: targetId });
      if (targetCode) orLookup.push({ employeeCode: targetCode });
      if (orLookup.length > 0) {
        const dbAtt = await Attendance.findOne({ date: today, $or: orLookup }).lean();
        if (dbAtt) {
          existing = {
            employeeId: targetId,
            employeeCode: targetCode || String(dbAtt.employeeCode || '').toUpperCase(),
            employeeName: targetName || dbAtt.employeeName || '',
            date: today,
            isClockedIn: Boolean(dbAtt.isClockedIn && !dbAtt.clockOutTime),
            clockInTime: dbAtt.clockInTime || dbAtt.clockIn || null,
            clockInTimestamp: dbAtt.clockInTimestamp ? Number(dbAtt.clockInTimestamp) : null,
            currentSessionStartTimestamp: dbAtt.currentSessionStartTimestamp ? Number(dbAtt.currentSessionStartTimestamp) : null,
            workSeconds: Number(dbAtt.workSeconds) || 0,
            overtimeSeconds: Number(dbAtt.overtimeSeconds) || 0,
            isOnBreak: Boolean(dbAtt.isOnBreak),
            breakType: dbAtt.breakType || null,
            breakStartTimestamp: dbAtt.breakStartTimestamp ? Number(dbAtt.breakStartTimestamp) : null,
            activeTask: dbAtt.activeTask || null,
            lastHeartbeatAt: dbAtt.lastHeartbeatAt || Date.now()
          };
        }
      }
    } catch (_) {}
  }

  // STRICT GUARD: A heartbeat pulse MUST NEVER fabricate or resurrect a clock-in for an employee
  // who has NOT explicitly clocked in today via POST /api/attendance/mark!
  const hasExistingTodayRecord = Boolean(existing && existing.date === today && (existing.clockInTime || existing.clockInTimestamp));
  if (!hasExistingTodayRecord) {
    return res.json({ success: true, ignored: true, reason: 'No active clock-in record for today', timestamp: Date.now() });
  }

  // If cached/DB record shows employee already clocked out, verify DB before accepting any stale isClockedIn: true pulse
  const hasExplicitClockIn = 'isClockedIn' in req.body && isClockedIn !== undefined && !taskOnly;
  if (!existing.isClockedIn && existing.clockOutTime && hasExplicitClockIn && Boolean(isClockedIn)) {
    try {
      const orCheck = [];
      if (targetId && mongoose.Types.ObjectId.isValid(targetId)) orCheck.push({ employee: targetId });
      if (targetCode) orCheck.push({ employeeCode: targetCode });
      const freshDb = orCheck.length > 0 ? await Attendance.findOne({ date: today, $or: orCheck }).lean() : null;
      if (!freshDb || !freshDb.isClockedIn || freshDb.clockOutTime) {
        return res.json({ success: true, ignored: true, reason: 'Shift already clocked out', timestamp: Date.now() });
      }
      existing.isClockedIn = true;
      existing.clockOutTime = null;
    } catch (_) {
      return res.json({ success: true, ignored: true, reason: 'Shift already clocked out', timestamp: Date.now() });
    }
  }

  const hasExplicitWorkSecs = 'workSeconds' in req.body && workSeconds !== undefined && workSeconds !== null;
  const hasExplicitBreak = 'isOnBreak' in req.body && isOnBreak !== undefined;
  const hasExplicitActiveTask = 'activeTask' in req.body;

  const resolvedClockedIn = hasExplicitClockIn
    ? Boolean(isClockedIn)
    : Boolean(existing?.isClockedIn);

  // If taskOnly heartbeat arrives for an employee who is NOT clocked in today, NEVER ghost-clock-in!
  const existingWorkSecs = Number(existing?.workSeconds) || 0;
  let resolvedWorkSecs = existingWorkSecs;
  if (hasExplicitWorkSecs) {
    const incomingSecs = Math.max(0, Number(workSeconds) || 0);
    // When actively clocked in across multiple browsers, NEVER let a lagging tab pull workSeconds backwards!
    resolvedWorkSecs = resolvedClockedIn
      ? Math.max(existingWorkSecs, incomingSecs)
      : incomingSecs;
  } else if (resolvedClockedIn && !existing?.isOnBreak && existing?.lastHeartbeatAt) {
    // Advance cached workSeconds smoothly while receiving a task-only pulse so working time never drops to 00:00
    const delta = Math.min(120, Math.max(0, Math.floor((Date.now() - Number(existing.lastHeartbeatAt)) / 1000)));
    resolvedWorkSecs = existingWorkSecs + delta;
  }

  const hasExplicitOvertime = 'overtimeSeconds' in req.body && req.body.overtimeSeconds !== undefined && req.body.overtimeSeconds !== null;
  const existingOvertimeSecs = Number(existing?.overtimeSeconds) || 0;
  const resolvedOvertimeSecs = hasExplicitOvertime
    ? Math.max(existingOvertimeSecs, Math.max(0, Number(req.body.overtimeSeconds) || 0))
    : existingOvertimeSecs;

  const payload = {
    employeeId: targetId,
    employeeCode: targetCode,
    employeeName: targetName || existing?.employeeName || '',
    date: today,
    isClockedIn: resolvedClockedIn,
    // Immutable First Clock-In: NEVER allow a heartbeat to overwrite an existing clockInTime / clockInTimestamp!
    clockInTime: existing?.clockInTime || clockInTime || null,
    clockInTimestamp: existing?.clockInTimestamp || (clockInTimestamp ? Number(clockInTimestamp) : null),
    currentSessionStartTimestamp: currentSessionStartTimestamp ? Number(currentSessionStartTimestamp) : (existing?.currentSessionStartTimestamp || null),
    workSeconds: resolvedWorkSecs,
    overtimeSeconds: resolvedOvertimeSecs,
    overtimeHours: +(resolvedOvertimeSecs / 3600).toFixed(2),
    overtimeStatus: resolvedOvertimeSecs > 0 ? 'auto_recorded' : (existing?.overtimeStatus || 'none'),
    isOnBreak: hasExplicitBreak ? Boolean(isOnBreak) : Boolean(existing?.isOnBreak),
    breakType: breakType !== undefined ? (breakType || null) : (existing?.breakType || null),
    breakStartTimestamp: breakStartTimestamp ? Number(breakStartTimestamp) : (existing?.breakStartTimestamp || null),
    activeTask: hasExplicitActiveTask ? (activeTask || null) : (existing?.activeTask || null),
    clockOutTime: resolvedClockedIn ? null : (req.body.clockOutTime || existing?.clockOutTime || null),
    lastHeartbeatAt: Date.now()
  };

  // Update in-memory telemetry cache across canonical keys
  const cacheKey = targetCode || targetId;
  liveTelemetryCache.set(cacheKey, payload);
  if (targetId) liveTelemetryCache.set(String(targetId), payload);
  if (targetCode) {
    liveTelemetryCache.set(String(targetCode).toUpperCase(), payload);
    liveTelemetryCache.set(String(targetCode).toLowerCase(), payload);
  }
  if (payload.employeeName) {
    liveTelemetryCache.set(`name_${String(payload.employeeName).trim().toLowerCase()}`, payload);
  }

  // Background persist in MongoDB Atlas (STRICTLY upsert: false — heartbeats NEVER create new attendance docs!)
  try {
    const updateObj = {
      lastHeartbeatAt: payload.lastHeartbeatAt
    };
    if (hasExplicitClockIn) updateObj.isClockedIn = payload.isClockedIn;
    if (hasExplicitWorkSecs || resolvedWorkSecs > 0) {
      updateObj.workSeconds = payload.workSeconds;
      updateObj.totalWorkingHours = +(payload.workSeconds / 3600).toFixed(2);
    }
    if (resolvedOvertimeSecs > 0) {
      updateObj.overtimeSeconds = resolvedOvertimeSecs;
      updateObj.overtimeHours = +(resolvedOvertimeSecs / 3600).toFixed(2);
      updateObj.overtimeStatus = 'auto_recorded';
      updateObj.overtimeReason = 'Auto-tracked (outside 10:00 AM - 07:00 PM shift)';
    }
    if (hasExplicitBreak) updateObj.isOnBreak = payload.isOnBreak;
    if (breakType !== undefined) updateObj.breakType = payload.breakType;
    if (hasExplicitActiveTask) updateObj.activeTask = payload.activeTask;
    if (payload.currentSessionStartTimestamp) updateObj.currentSessionStartTimestamp = payload.currentSessionStartTimestamp;
    if (payload.breakStartTimestamp) updateObj.breakStartTimestamp = payload.breakStartTimestamp;
    if (targetCode) updateObj.employeeCode = targetCode;
    if (targetName) updateObj.employeeName = targetName;

    const orClauses = [];
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) orClauses.push({ employee: targetId });
    if (targetCode) orClauses.push({ employeeCode: targetCode });

    if (orClauses.length > 0) {
      Attendance.findOneAndUpdate(
        { date: today, $or: orClauses },
        { $set: updateObj },
        { new: true, upsert: false }
      ).catch(e => console.warn('[heartbeat] DB update notice:', e.message));
    }

    // Instant Socket.IO broadcast of complete telemetry to all connected Live Operations dashboards
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('attendance:telemetry', payload);
    } catch (_) {}
  } catch (_) {}

  res.json({ success: true, timestamp: Date.now() });
});

// ─── GET /api/attendance/live-telemetry ────────────────────────────────────────
// Returns live status of all active employees for Live Operations & Admin Dashboard
const getLiveTelemetry = asyncHandler(async (req, res) => {
  const today = req.query.date || new Date().toISOString().split('T')[0];
  const now = Date.now();

  // Load all today's attendance records from MongoDB
  const query = { date: today };
  const records = await Attendance.find(query).lean();

  const telemetryMap = {};

  records.forEach(r => {
    const code = String(r.employeeCode || '').trim().toUpperCase();
    const id = String(r.employee?._id || r.employee || r._id);
    const key = code || id;

    const inTs = Number(r.clockInTimestamp || 0);
    const sessStart = Number(r.currentSessionStartTimestamp || inTs);
    const isClockedIn = Boolean(r.isClockedIn && !r.clockOutTime);
    const isClockedOut = Boolean(r.clockOutTime || r.clockOut);
    const isOnBreak = Boolean(r.isOnBreak);

    let liveWorkSecs = Number(r.workSeconds) || 0;
    const effectiveStartTs = sessStart > 0 ? sessStart : inTs;
    const breakSecs = Number(r.breakSeconds) || 0;
    if (isClockedIn && !isOnBreak) {
      const maxPossibleGross = inTs > 0 ? Math.max(0, Math.floor((now - inTs) / 1000)) : 14 * 3600;
      if (liveWorkSecs === 0 && effectiveStartTs > 0 && effectiveStartTs <= now) {
        // Self-heal: if workSeconds was wiped to 0 while actively clocked in, compute directly from shift start minus breaks
        liveWorkSecs = Math.min(Math.max(0, Math.floor((now - effectiveStartTs) / 1000) - breakSecs), maxPossibleGross);
      } else if (r.lastHeartbeatAt && Number(r.lastHeartbeatAt) <= now) {
        // Add live elapsed seconds since last heartbeat pulse smoothly (no 120s freeze cutoff while shift is open)
        const elapsedSinceHeartbeat = Math.max(0, Math.floor((now - Number(r.lastHeartbeatAt)) / 1000));
        liveWorkSecs = Math.min(liveWorkSecs + elapsedSinceHeartbeat, maxPossibleGross);
      }
    }

    let runningTask = r.activeTask || null;
    if (runningTask && runningTask.timerRunning === true && runningTask.startedAt && isClockedIn && !isOnBreak) {
      const taskStart = Number(runningTask.startedAt);
      const elapsedTask = Math.max(0, Math.floor((now - taskStart) / 1000));
      const accum = Number(runningTask.accumulatedTodaySeconds ?? runningTask.todayWorkSeconds ?? 0);
      runningTask = {
        ...runningTask,
        accumulatedTodaySeconds: accum,
        liveTaskSecs: Math.min(accum + elapsedTask, 14 * 3600),
        timerRunning: true
      };
    } else if (runningTask && runningTask.timerRunning === false) {
      const frozenToday = Number(runningTask.accumulatedTodaySeconds ?? runningTask.todayWorkSeconds ?? 0);
      runningTask = {
        ...runningTask,
        startedAt: null,
        accumulatedTodaySeconds: frozenToday,
        todayWorkSeconds: frozenToday,
        liveTaskSecs: frozenToday,
        timerRunning: false
      };
    }

    const state = {
      employeeId: id,
      employeeCode: code,
      employeeName: r.employeeName,
      date: r.date,
      status: r.status,
      isClockedIn,
      isClockedOut,
      isOnBreak,
      breakType: r.breakType || null,
      clockInTime: r.clockInTime || r.clockIn || null,
      clockInTimestamp: inTs,
      clockOutTime: r.clockOutTime || r.clockOut || null,
      clockOutTimestamp: r.clockOutTimestamp || null,
      currentSessionStartTimestamp: sessStart,
      workSeconds: liveWorkSecs,
      totalWorkingHours: +(liveWorkSecs / 3600).toFixed(2),
      overtimeSeconds: Number(r.overtimeSeconds) || 0,
      overtimeHours: Number(r.overtimeHours) || +((Number(r.overtimeSeconds) || 0) / 3600).toFixed(2),
      overtimeStatus: r.overtimeStatus || 'none',
      activeTask: runningTask,
      lastHeartbeatAt: r.lastHeartbeatAt || now
    };

    telemetryMap[key] = state;
    if (code) {
      telemetryMap[code] = state;
      telemetryMap[code.toLowerCase()] = state;
    }
    if (id) telemetryMap[id] = state;
    if (r.employeeName) {
      telemetryMap[`name_${String(r.employeeName).trim().toLowerCase()}`] = state;
    }
  });

  // Merge in-memory live telemetry cache (captures real-time updates from active browsers)
  for (const [cKey, cVal] of liveTelemetryCache.entries()) {
    if (cVal && cVal.date === today) {
      const cCode = String(cVal.employeeCode || '').trim().toUpperCase();
      const cId = String(cVal.employeeId || '');
      const existing = telemetryMap[cCode] || telemetryMap[cId] || telemetryMap[cKey];

      let taskMerged = ('activeTask' in cVal) ? cVal.activeTask : (existing?.activeTask || null);
      if (taskMerged && taskMerged.timerRunning === true && taskMerged.startedAt && cVal.isClockedIn && !cVal.isOnBreak) {
        const taskStart = Number(taskMerged.startedAt);
        const elapsedTask = Math.max(0, Math.floor((now - taskStart) / 1000));
        const accum = Number(taskMerged.accumulatedTodaySeconds ?? taskMerged.todayWorkSeconds ?? 0);
        taskMerged = {
          ...taskMerged,
          accumulatedTodaySeconds: accum,
          liveTaskSecs: Math.min(accum + elapsedTask, 14 * 3600),
          timerRunning: true
        };
      } else if (taskMerged && taskMerged.timerRunning === false) {
        const frozenToday = Number(taskMerged.accumulatedTodaySeconds ?? taskMerged.todayWorkSeconds ?? 0);
        taskMerged = {
          ...taskMerged,
          startedAt: null,
          accumulatedTodaySeconds: frozenToday,
          todayWorkSeconds: frozenToday,
          liveTaskSecs: frozenToday,
          timerRunning: false
        };
      }

      const mergedClockInTs = Number(cVal.clockInTimestamp || existing?.clockInTimestamp || 0);
      const mergedSessStartTs = Number(cVal.currentSessionStartTimestamp || existing?.currentSessionStartTimestamp || mergedClockInTs || 0);
      const mergedIsClockedIn = Boolean(cVal.isClockedIn);
      const mergedIsOnBreak = Boolean(cVal.isOnBreak);
      const cachedWork = Number(cVal.workSeconds) || 0;
      const dbWork = Number(existing?.workSeconds) || 0;
      let mergedWorkSecs = mergedIsClockedIn ? Math.max(cachedWork, dbWork) : (cachedWork || dbWork);
      if (mergedIsClockedIn && !mergedIsOnBreak) {
        const maxPossibleGross = mergedClockInTs > 0 ? Math.max(0, Math.floor((now - mergedClockInTs) / 1000)) : 14 * 3600;
        if (mergedWorkSecs === 0 && mergedSessStartTs > 0 && mergedSessStartTs <= now) {
          mergedWorkSecs = Math.min(Math.max(0, Math.floor((now - mergedSessStartTs) / 1000)), maxPossibleGross);
        } else if (cachedWork >= dbWork && cVal.lastHeartbeatAt && Number(cVal.lastHeartbeatAt) <= now) {
          const elapsedCache = Math.max(0, Math.floor((now - Number(cVal.lastHeartbeatAt)) / 1000));
          mergedWorkSecs = Math.min(cachedWork + elapsedCache, maxPossibleGross);
        }
      }

      const mergedState = {
        ...(existing || {}),
        employeeId: cId || existing?.employeeId,
        employeeCode: cCode || existing?.employeeCode,
        employeeName: cVal.employeeName || existing?.employeeName,
        date: today,
        status: existing?.status || 'present',
        isClockedIn: mergedIsClockedIn,
        isClockedOut: Boolean(!mergedIsClockedIn && (cVal.clockOutTime || existing?.clockOutTime)),
        isOnBreak: mergedIsOnBreak,
        breakType: cVal.breakType || existing?.breakType || null,
        clockInTime: cVal.clockInTime || existing?.clockInTime,
        clockInTimestamp: mergedClockInTs || null,
        clockOutTime: cVal.clockOutTime || existing?.clockOutTime,
        clockOutTimestamp: cVal.clockOutTimestamp || existing?.clockOutTimestamp,
        currentSessionStartTimestamp: mergedSessStartTs || null,
        workSeconds: mergedWorkSecs,
        totalWorkingHours: +(mergedWorkSecs / 3600).toFixed(2),
        overtimeSeconds: Math.max(Number(cVal.overtimeSeconds) || 0, Number(existing?.overtimeSeconds) || 0),
        overtimeHours: +(Math.max(Number(cVal.overtimeSeconds) || 0, Number(existing?.overtimeSeconds) || 0) / 3600).toFixed(2),
        overtimeStatus: Math.max(Number(cVal.overtimeSeconds) || 0, Number(existing?.overtimeSeconds) || 0) > 0 ? 'auto_recorded' : (existing?.overtimeStatus || 'none'),
        activeTask: taskMerged,
        lastHeartbeatAt: now
      };

      if (cKey) telemetryMap[cKey] = mergedState;
      if (cCode) {
        telemetryMap[cCode] = mergedState;
        telemetryMap[cCode.toLowerCase()] = mergedState;
      }
      if (cId) telemetryMap[cId] = mergedState;
      const cEmpName = mergedState.employeeName;
      if (cEmpName) {
        telemetryMap[`name_${String(cEmpName).trim().toLowerCase()}`] = mergedState;
      }
    }
  }

  res.json({
    success: true,
    date: today,
    timestamp: now,
    count: Object.keys(telemetryMap).length,
    data: telemetryMap
  });
});

module.exports = {
  autoClosePastDayShifts,
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
  updateOvertimeStatus,
  updateLiveHeartbeat,
  getLiveTelemetry
};
