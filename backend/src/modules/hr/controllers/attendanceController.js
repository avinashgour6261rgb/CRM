const Attendance = require('../models/Attendance');
const AttendanceAudit = require('../models/AttendanceAudit');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// ─── GET /api/attendance ─────────────────────────────────────────────────────
// Query: ?month=9&year=2026&employeeId=...
const getMonthlyAttendance = asyncHandler(async (req, res) => {
  const { month, year, employeeId } = req.query;

  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year query params are required' });
  }

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const query = { date: new RegExp(`^${monthStr}`) };

  // Tenant scoping: non-admin can only see own attendance
  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr' || req.user?.systemRole === 'admin';
  if (!isPrivileged) {
    const myId = req.user?.id || req.user?._id;
    query.$or = [{ employee: myId }, { employeeId: String(myId) }];
  } else if (employeeId && employeeId !== 'all') {
    query.$or = [{ employee: employeeId }, { employeeId: String(employeeId) }];
  }

  const records = await Attendance.find(query).sort({ date: 1, employee: 1 });

  res.json({ success: true, count: records.length, data: records });
});

// ─── GET /api/attendance/summary ──────────────────────────────────────────────
// Returns aggregate counts for a given month/year/employee
const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { month, year, employeeId } = req.query;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const matchStage = { date: new RegExp(`^${monthStr}`) };
  if (employeeId && employeeId !== 'all') matchStage.employee = require('mongoose').Types.ObjectId.createFromHexString(employeeId);

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

// ─── POST /api/attendance/mark ────────────────────────────────────────────────
const markAttendance = asyncHandler(async (req, res) => {
  const { employee, date, status, clockInTime, clockOutTime, notes, markedBy, auditNote, isAdminOverride } = req.body;

  if (!employee || !date || !status) {
    return res.status(400).json({ success: false, message: 'employee, date, and status are required' });
  }

  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr';
  const adminActorId = req.user?.id || req.user?._id || markedBy || 'ADMIN';
  const adminActorName = req.user?.name || markedBy || 'HR Administrator';

  // Upsert: update existing or create new
  const record = await Attendance.findOneAndUpdate(
    { employee, date },
    {
      employee,
      date,
      status,
      clockInTime,
      clockOutTime,
      notes: notes || (auditNote ? `Adjusted by Admin ${adminActorName}: ${auditNote}` : ''),
      markedBy: adminActorName
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // Re-fetch so pre-save calculations are applied
  if (clockInTime && clockOutTime) {
    const [inH, inM, inS = 0] = clockInTime.split(':').map(Number);
    const [outH, outM, outS = 0] = clockOutTime.split(':').map(Number);
    const diffSecs = Math.max(0, (outH * 3600 + outM * 60 + outS) - (inH * 3600 + inM * 60 + inS));
    record.totalWorkingHours = +(diffSecs / 3600).toFixed(2);
    const graceLimit = 9 * 3600 + 30 * 60;
    record.isLate = (inH * 3600 + inM * 60 + inS) > graceLimit;
    record.lateByMinutes = record.isLate
      ? Math.floor(((inH * 3600 + inM * 60 + inS) - graceLimit) / 60)
      : 0;
    await record.save();
  }

  // Mandatory Audit Trail for Admin manual modifications
  if (auditNote || isAdminOverride || isPrivileged) {
    try {
      await AttendanceAudit.create({
        employee,
        employeeId: String(employee),
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
  const auditData = req.body || {};
  const employeeId = auditData.employeeId || auditData.employeeCode || req.user?.id || req.user?._id;
  const type = auditData.type || auditData.action || 'system';
  const action = auditData.action || auditData.type || 'audit';

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'employeeId is required' });
  }

  const isPrivileged = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'hr';
  const isAdminOverride = !!auditData.isAdminOverride || (isPrivileged && auditData.actor === 'admin');

  const record = new AttendanceAudit({
    ...auditData,
    employeeId,
    type,
    action,
    date: auditData.date || new Date().toISOString().split('T')[0],
    timeFormatted: auditData.timeFormatted || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    actor: auditData.actor || (isPrivileged ? 'admin' : 'employee'),
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
  if (!auditNote || !auditNote.trim()) {
    return res.status(400).json({ success: false, message: 'Audit note explaining administrator override is mandatory' });
  }

  const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const adminId = req.user?.id || req.user?._id || 'ADMIN';
  const adminName = req.user?.name || 'Administrator';

  // Find target attendance record to update
  let attRecord = await Attendance.findOne({
    $or: [{ employee: employeeId }, { employeeId }],
    date: targetDate
  });

  if (attRecord) {
    attRecord.clockOutTime = nowStr;
    attRecord.status = attRecord.status || 'present';
    attRecord.notes = `Manual Clock-Out by Admin ${adminName} (${adminId}): "${auditNote.trim()}"`;
    attRecord.markedBy = adminName;
    await attRecord.save();
  }

  // Create official Audit Trail record
  const auditEntry = new AttendanceAudit({
    employeeId: String(employeeId),
    employeeName: attRecord?.employeeName || 'Employee',
    employeeCode: attRecord?.employeeCode || '',
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
    auditNote: auditNote.trim(),
    details: `Administrator ${adminName} [ID: ${adminId}] manually forced shift clock-out. Reason: "${auditNote.trim()}"`
  });

  await auditEntry.save();

  res.status(200).json({
    success: true,
    message: `Shift forcefully clocked out by Admin ${adminName}`,
    data: { attendance: attRecord, audit: auditEntry }
  });
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
  forceClockOut
};
