const mongoose = require('mongoose');
const Holiday = require('../models/Holiday');
const Attendance = require('../models/Attendance');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// @desc    Get all holidays
// @route   GET /api/holidays
const getHolidays = asyncHandler(async (req, res) => {
  const { year, search } = req.query;
  const query = {};

  if (year) {
    query.date = new RegExp(`^${year}`);
  }

  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { type: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ];
  }

  const holidays = await Holiday.find(query).sort({ date: 1 });

  res.json({
    success: true,
    count: holidays.length,
    data: holidays
  });
});

// @desc    Get single holiday
// @route   GET /api/holidays/:id
const getHolidayById = asyncHandler(async (req, res) => {
  let holiday = null;
  if (mongoose.isValidObjectId(req.params.id)) {
    holiday = await Holiday.findById(req.params.id);
  }
  if (!holiday) {
    holiday = await Holiday.findOne({ $or: [{ code: req.params.id }, { date: req.params.id }] });
  }

  if (!holiday) {
    return res.status(404).json({ success: false, message: 'Holiday not found' });
  }
  res.json({ success: true, data: holiday });
});

// @desc    Create new holiday
// @route   POST /api/holidays
const createHoliday = asyncHandler(async (req, res) => {
  const u = req.user;
  if (u) {
    const canManage = u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.holidays || u.permissions?.allAccess;
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Access denied: Only HR & Administrators can declare company holidays.' });
    }
    const actorLabel = u.employeeCode ? `${u.name || 'Admin'} (${u.employeeCode})` : (u.name || 'Admin');
    if (!req.body.createdBy) req.body.createdBy = actorLabel;
    if (!req.body.createdById) req.body.createdById = String(u._id || '');
    if (!req.body.createdByCode) req.body.createdByCode = u.employeeCode || '';
    if (!req.body.confirmedBy) req.body.confirmedBy = actorLabel;
    if (!req.body.confirmedById) req.body.confirmedById = String(u._id || '');
    if (!req.body.confirmedByCode) req.body.confirmedByCode = u.employeeCode || '';
  }

  // If exists on same date, update it
  let holiday = await Holiday.findOne({ date: req.body.date });
  if (holiday) {
    holiday = await Holiday.findOneAndUpdate({ date: req.body.date }, req.body, { new: true });
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('holiday:updated', { action: 'update', item: holiday });
    } catch (_) {}
    return res.json({ success: true, data: holiday });
  }

  holiday = new Holiday(req.body);
  await holiday.save();
  try {
    const { emitToAll } = require('../../../shared/socket/socketManager');
    emitToAll('holiday:updated', { action: 'create', item: holiday });
  } catch (_) {}
  res.status(201).json({ success: true, data: holiday });
});

// @desc    Update holiday
// @route   PUT /api/holidays/:id
const updateHoliday = asyncHandler(async (req, res) => {
  const u = req.user;
  if (u) {
    const canManage = u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.holidays || u.permissions?.allAccess;
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Access denied: Only HR & Administrators can update company holidays.' });
    }
    const actorLabel = u.employeeCode ? `${u.name || 'Admin'} (${u.employeeCode})` : (u.name || 'Admin');
    req.body.lastUpdatedBy = actorLabel;
    req.body.lastUpdatedById = String(u._id || '');
    req.body.lastUpdatedByCode = u.employeeCode || '';
  }

  let holiday = null;
  if (mongoose.isValidObjectId(req.params.id)) {
    holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  } else {
    holiday = await Holiday.findOneAndUpdate({ $or: [{ code: req.params.id }, { date: req.params.id }] }, req.body, { new: true, runValidators: true });
  }

  if (!holiday) {
    return res.status(404).json({ success: false, message: 'Holiday not found' });
  }
  try {
    const { emitToAll } = require('../../../shared/socket/socketManager');
    emitToAll('holiday:updated', { action: 'update', item: holiday });
  } catch (_) {}
  res.json({ success: true, data: holiday });
});

// @desc    Delete holiday
// @route   DELETE /api/holidays/:id
const deleteHoliday = asyncHandler(async (req, res) => {
  const u = req.user;
  if (u) {
    const canManage = u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.holidays || u.permissions?.allAccess;
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Access denied: Only HR & Administrators can cancel or delete company holidays.' });
    }
  }

  const queryDate = req.query.date || req.body?.date;
  const queryCode = req.query.code || req.body?.code;
  const targetId = req.params.id;

  let holiday = null;
  if (mongoose.isValidObjectId(targetId)) {
    holiday = await Holiday.findByIdAndDelete(targetId);
  }
  if (!holiday) {
    const orConditions = [
      { code: targetId },
      { date: targetId }
    ];
    if (queryDate) orConditions.push({ date: queryDate });
    if (queryCode) orConditions.push({ code: queryCode });
    holiday = await Holiday.findOneAndDelete({ $or: orConditions });
  }

  // If date was provided, wipe any duplicates matching that date
  if (queryDate) {
    try {
      await Holiday.deleteMany({ date: queryDate });
    } catch (_) {}
  }

  const removedDate = holiday?.date || queryDate;
  const removedCode = holiday?.code || queryCode;
  const removedId = holiday ? String(holiday._id) : targetId;

  // Clean any holiday-status attendance records for the cancelled holiday date so it reverts to a normal working day
  if (removedDate) {
    try {
      await Attendance.deleteMany({ date: removedDate, status: 'holiday' });
    } catch (_) {}
  }

  try {
    const { emitToAll } = require('../../../shared/socket/socketManager');
    emitToAll('holiday:updated', { action: 'delete', id: removedId, date: removedDate, code: removedCode });
    if (removedDate) {
      emitToAll('attendance:updated', { action: 'holiday_cancelled', date: removedDate });
    }
  } catch (_) {}
  res.json({ success: true, message: 'Holiday removed', data: { id: removedId, date: removedDate, code: removedCode } });
});

module.exports = {
  getHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday
};
