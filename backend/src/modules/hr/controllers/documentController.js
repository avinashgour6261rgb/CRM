const mongoose = require('mongoose');
const Document = require('../models/Document');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { getIstDateString } = require('../../../shared/utils/dateUtils');
const { emitToAll } = require('../../../shared/socket/socketManager');

const canManageDocs = (u) => Boolean(
  u && (
    u.isAdmin ||
    u.isDelegatedAdmin ||
    u.systemRole === 'admin' ||
    u.systemRole === 'hr' ||
    u.permissions?.allAccess ||
    u.permissions?.manageDocuments ||
    u.permissions?.manageEmployees ||
    u.permissions?.documentation
  )
);

const isDocAccessibleToUser = (doc, u) => {
  if (!doc || !u) return false;
  if (canManageDocs(u)) return true;
  if (['Company Policy', 'Handbook'].includes(doc.docType)) return true;
  const myId = String(u._id || u.id || '');
  const myCode = String(u.employeeCode || '').toUpperCase();
  const myName = String(u.name || '').trim().toLowerCase();
  return (
    (myId && (String(doc.employeeId) === myId || String(doc.uploadedById) === myId)) ||
    (myCode && String(doc.employeeCode || '').toUpperCase() === myCode) ||
    (myName && String(doc.employeeName || '').trim().toLowerCase() === myName)
  );
};

// ─── GET /api/documents ──────────────────────────────────────────────────────
exports.getDocuments = asyncHandler(async (req, res) => {
  const u = req.user;
  let filter = {};
  if (!canManageDocs(u) && u) {
    const myId = String(u._id || u.id || '');
    const myCode = String(u.employeeCode || '').toUpperCase();
    const orClauses = [
      { docType: { $in: ['Company Policy', 'Handbook'] } }
    ];
    if (myId) orClauses.push({ employeeId: myId }, { uploadedById: myId });
    if (myCode) orClauses.push({ employeeCode: myCode });
    filter = { $or: orClauses };
  }

  // Exclude heavy fileDataUrl from list response for blazing-fast loads
  const docs = await Document.find(filter)
    .select('-fileDataUrl')
    .sort({ createdAt: -1 })
    .lean();

  const formatted = docs.map(d => ({
    ...d,
    id: String(d._id),
    hasFile: Number(d.fileSizeBytes || 0) > 0
  }));

  res.json({ success: true, count: formatted.length, data: formatted });
});

// ─── GET /api/documents/:id/download ─────────────────────────────────────────
exports.downloadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID' });
  }
  const doc = await Document.findById(id).lean();
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  if (!isDocAccessibleToUser(doc, req.user)) {
    return res.status(403).json({ success: false, message: 'Access denied to this document' });
  }

  res.set('Cache-Control', 'private, max-age=86400');
  res.json({
    success: true,
    data: {
      _id: String(doc._id),
      title: doc.title,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      fileDataUrl: doc.fileDataUrl || ''
    }
  });
});

// ─── POST /api/documents ─────────────────────────────────────────────────────
exports.uploadDocument = asyncHandler(async (req, res) => {
  const u = req.user;
  const payload = { ...(req.body || {}) };
  delete payload._id;
  delete payload.id;

  if (!payload.title || !payload.fileName) {
    return res.status(400).json({ success: false, message: 'Document title and file name are required.' });
  }
  if (typeof payload.fileDataUrl === 'string' && payload.fileDataUrl.length > 8 * 1024 * 1024) {
    return res.status(413).json({ success: false, message: 'File is too large. Maximum allowed file size is 5 MB.' });
  }

  // Non-managers can only upload documents for themselves
  if (!canManageDocs(u) && u) {
    payload.employeeId = String(u._id || u.id || '');
    payload.employeeCode = String(u.employeeCode || '').toUpperCase();
    payload.employeeName = u.name || payload.employeeName || '';
    payload.department = u.department || payload.department || '';
    if (['Company Policy', 'Handbook'].includes(payload.docType)) {
      return res.status(403).json({ success: false, message: 'Only Admin/HR can upload Company Policy documents.' });
    }
  }

  const actorName = u ? (u.name || u.email || 'Admin') : 'Admin';
  const actorLabel = u?.employeeCode ? `${actorName} (${u.employeeCode})` : actorName;

  const doc = await Document.create({
    title: String(payload.title).trim(),
    docType: payload.docType || 'Aadhaar Card',
    employeeId: payload.employeeId || '',
    employeeCode: payload.employeeCode ? String(payload.employeeCode).toUpperCase() : '',
    employeeName: payload.employeeName || '',
    employeeAvatar: payload.employeeAvatar || '',
    department: payload.department || '',
    fileName: String(payload.fileName).trim(),
    mimeType: payload.mimeType || 'application/octet-stream',
    fileSize: payload.fileSize || '0 KB',
    fileSizeBytes: Number(payload.fileSizeBytes) || 0,
    fileDataUrl: payload.fileDataUrl || '',
    uploadDate: payload.uploadDate || getIstDateString(),
    uploadedBy: payload.uploadedBy || actorLabel,
    uploadedById: String(u?._id || u?.id || payload.uploadedById || ''),
    uploadedByCode: u?.employeeCode || payload.uploadedByCode || '',
    status: payload.status || 'verified'
  });

  const safeDoc = doc.toObject();
  delete safeDoc.fileDataUrl;
  safeDoc.id = String(safeDoc._id);
  safeDoc.hasFile = Number(safeDoc.fileSizeBytes || 0) > 0;

  try {
    emitToAll('document:updated', { action: 'create', item: safeDoc });
  } catch (_) {}

  res.status(201).json({ success: true, data: safeDoc });
});

// ─── DELETE /api/documents/:id ───────────────────────────────────────────────
exports.deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID' });
  }
  const doc = await Document.findById(id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  const u = req.user;
  const isOwner = Boolean(u && (
    (doc.uploadedById && String(doc.uploadedById) === String(u._id || u.id)) ||
    (doc.employeeCode && u.employeeCode && String(doc.employeeCode).toUpperCase() === String(u.employeeCode).toUpperCase())
  ));
  if (!canManageDocs(u) && !isOwner) {
    return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to delete this document.' });
  }

  await doc.deleteOne();
  try {
    emitToAll('document:updated', { action: 'delete', id: String(doc._id) });
  } catch (_) {}

  res.json({ success: true, message: 'Document removed', data: { id: String(doc._id) } });
});
