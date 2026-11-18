const mongoose = require('mongoose');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    docType: { type: String, required: true, default: 'Aadhaar Card' },
    employeeId: { type: String, default: '' },
    employeeCode: { type: String, default: '', uppercase: true, trim: true },
    employeeName: { type: String, default: '' },
    employeeAvatar: { type: String, default: '' },
    department: { type: String, default: '' },
    fileName: { type: String, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    fileSize: { type: String, default: '0 KB' },
    fileSizeBytes: { type: Number, default: 0 },
    fileDataUrl: { type: String, default: '' },
    uploadDate: { type: String, default: () => getIstDateString() },
    uploadedBy: { type: String, default: '' },
    uploadedById: { type: String, default: '' },
    status: { type: String, enum: ['verified', 'pending', 'rejected'], default: 'verified' }
  },
  { timestamps: true }
);

DocumentSchema.index({ employeeCode: 1, docType: 1 });

module.exports = mongoose.model('Document', DocumentSchema);
