const mongoose = require('mongoose');
const Appreciation = require('../models/Appreciation');
const Employee = require('../models/Employee');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// @desc    Get all appreciations
// @route   GET /api/appreciations
const getAppreciations = asyncHandler(async (req, res) => {
  const { employeeId, search } = req.query;
  const query = {};

  if (employeeId && employeeId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      query.$or = [{ givenTo: employeeId }, { givenToId: employeeId }];
    } else {
      query.givenToId = employeeId;
    }
  }

  if (search) {
    const sRegex = new RegExp(search, 'i');
    const searchConditions = [
      { awardName: sRegex },
      { appreciationNote: sRegex },
      { givenToName: sRegex },
      { givenByName: sRegex }
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  const appreciations = await Appreciation.find(query)
    .populate('givenTo', 'name email role avatar department employeeCode')
    .populate('givenBy', 'name email role avatar employeeCode')
    .sort({ givenOn: -1, createdAt: -1 });

  res.json({
    success: true,
    count: appreciations.length,
    data: appreciations
  });
});

// @desc    Get single appreciation
// @route   GET /api/appreciations/:id
const getAppreciationById = asyncHandler(async (req, res) => {
  const appreciation = await Appreciation.findById(req.params.id)
    .populate('givenTo', 'name email role avatar department employeeCode')
    .populate('givenBy', 'name email role avatar employeeCode');

  if (!appreciation) {
    return res.status(404).json({ success: false, message: 'Appreciation not found' });
  }

  res.json({ success: true, data: appreciation });
});

// @desc    Create appreciation
// @route   POST /api/appreciations
const createAppreciation = asyncHandler(async (req, res) => {
  const {
    givenTo,
    givenToId,
    givenToName,
    givenToAvatar,
    givenToRole,
    givenBy,
    givenById,
    givenByName,
    awardName,
    awardBadgeIcon,
    givenOn,
    rewardPointsOrCash,
    appreciationNote
  } = req.body;

  let recipientEmp = null;
  const targetId = givenTo || givenToId;
  if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
    recipientEmp = await Employee.findById(targetId);
  }
  if (!recipientEmp && targetId) {
    recipientEmp = await Employee.findOne({
      $or: [
        { employeeCode: targetId },
        { email: targetId },
        { name: givenToName || targetId }
      ]
    });
  }

  let giverEmp = null;
  const gId = givenBy || givenById;
  if (gId && mongoose.Types.ObjectId.isValid(gId)) {
    giverEmp = await Employee.findById(gId);
  }

  const finalGivenTo = recipientEmp ? recipientEmp._id : (targetId && mongoose.Types.ObjectId.isValid(targetId) ? targetId : null);
  const finalGivenBy = giverEmp ? giverEmp._id : (gId && mongoose.Types.ObjectId.isValid(gId) ? gId : null);

  const appreciation = new Appreciation({
    givenTo: finalGivenTo,
    givenToId: String(targetId || recipientEmp?._id || ''),
    givenToName: givenToName || recipientEmp?.name || 'Team Member',
    givenToAvatar: givenToAvatar || recipientEmp?.avatar || '',
    givenToRole: givenToRole || recipientEmp?.role || recipientEmp?.designation || 'Team Member',
    givenBy: finalGivenBy,
    givenById: String(gId || giverEmp?._id || ''),
    givenByName: givenByName || giverEmp?.name || req.user?.name || 'Administrator',
    awardName: awardName || 'Star Performer of the Month',
    awardBadgeIcon: awardBadgeIcon || 'trophy',
    givenOn: givenOn || new Date().toISOString().split('T')[0],
    rewardPointsOrCash: rewardPointsOrCash || '',
    appreciationNote: appreciationNote || ''
  });

  await appreciation.save();

  const populated = await Appreciation.findById(appreciation._id)
    .populate('givenTo', 'name email role avatar department employeeCode')
    .populate('givenBy', 'name email role avatar employeeCode');

  res.status(201).json({ success: true, data: populated || appreciation });
});

// @desc    Delete appreciation
// @route   DELETE /api/appreciations/:id
const deleteAppreciation = asyncHandler(async (req, res) => {
  const appreciation = await Appreciation.findByIdAndDelete(req.params.id);
  if (!appreciation) {
    return res.status(404).json({ success: false, message: 'Appreciation not found' });
  }
  res.json({ success: true, message: 'Appreciation removed', data: {} });
});

module.exports = {
  getAppreciations,
  getAppreciationById,
  createAppreciation,
  deleteAppreciation
};

