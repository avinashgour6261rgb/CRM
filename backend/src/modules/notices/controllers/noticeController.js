const Notice = require('../models/Notice');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// @desc    Get all notices
// @route   GET /api/notices
exports.getNotices = asyncHandler(async (req, res) => {
  const notices = await Notice.find({}).sort({ pinned: -1, createdAt: -1 });
  res.json({ success: true, count: notices.length, data: notices });
});

// @desc    Create a notice
// @route   POST /api/notices
exports.createNotice = asyncHandler(async (req, res) => {
  const count = await Notice.countDocuments();
  const noticeCode = req.body.noticeCode || `NOT-${100 + count + 1}`;
  const notice = await Notice.create({
    ...req.body,
    noticeCode
  });
  res.status(201).json({ success: true, data: notice });
});

// @desc    Update a notice
// @route   PUT /api/notices/:id
exports.updateNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
  if (!notice) {
    return res.status(404).json({ success: false, message: 'Notice not found' });
  }
  res.json({ success: true, data: notice });
});

// @desc    Delete a notice
// @route   DELETE /api/notices/:id
exports.deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) {
    return res.status(404).json({ success: false, message: 'Notice not found' });
  }
  res.json({ success: true, message: 'Notice removed', data: {} });
});
