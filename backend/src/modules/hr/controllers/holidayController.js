const mongoose = require('mongoose');
const Holiday = require('../models/Holiday');
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
  }

  // If exists on same date, update it
  let holiday = await Holiday.findOne({ date: req.body.date });
  if (holiday) {
    holiday = await Holiday.findOneAndUpdate({ date: req.body.date }, req.body, { new: true });
    return res.json({ success: true, data: holiday });
  }

  holiday = new Holiday(req.body);
  await holiday.save();
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

  let holiday = null;
  if (mongoose.isValidObjectId(req.params.id)) {
    holiday = await Holiday.findByIdAndDelete(req.params.id);
  }
  if (!holiday) {
    holiday = await Holiday.findOneAndDelete({ $or: [{ code: req.params.id }, { date: req.params.id }] });
  }

  if (!holiday) {
    // If not found in DB, return success true so frontend can cleanly remove from local cache
    return res.json({ success: true, message: 'Holiday not found or already removed', data: {} });
  }
  res.json({ success: true, message: 'Holiday removed', data: {} });
});

module.exports = {
  getHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday
};
