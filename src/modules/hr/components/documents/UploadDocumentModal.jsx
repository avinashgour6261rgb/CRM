import React, { useState, useEffect } from 'react';
import { X, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { canManageDocumentation } from '../../../../shared/utils/permissionUtils';
import { getLocalDateString } from '../../../../shared/utils/timerUtils';

const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB

const formatDocSize = (bytes = 0) => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const UploadDocumentModal = ({ isOpen, onClose, onDocumentUploaded }) => {
  const { employees = [] } = useHR();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const canManage = canManageDocumentation(currentUser);
  const activeEmployees = employees.filter(e => !['resigned', 'inactive', 'terminated', 'suspended', 'archived'].includes(String(e?.status || 'active').toLowerCase()));

  const [selectedEmployee, setSelectedEmployee] = useState(currentUser?.employeeCode || activeEmployees[0]?.employeeCode || 'EMP-001');
  const [docType, setDocType] = useState('Aadhaar Card');
  const [docTitle, setDocTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('application/octet-stream');
  const [fileSize, setFileSize] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!canManage && currentUser?.employeeCode) {
        setSelectedEmployee(currentUser.employeeCode);
      } else if (!selectedEmployee && activeEmployees[0]?.employeeCode) {
        setSelectedEmployee(activeEmployees[0].employeeCode);
      }
    }
  }, [isOpen, canManage, currentUser?.employeeCode]);

  if (!isOpen) return null;

  const resetForm = () => {
    setDocTitle('');
    setFileName('');
    setMimeType('application/octet-stream');
    setFileSize('');
    setFileSizeBytes(0);
    setFileDataUrl('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      addToast('File is too large. Please upload a file under 5 MB.', 'error');
      e.target.value = '';
      return;
    }

    setFileName(file.name);
    setMimeType(file.type || 'application/octet-stream');
    setFileSize(formatDocSize(file.size));
    setFileSizeBytes(file.size);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(String(reader.result || ''));
    };
    reader.onerror = () => {
      addToast('Failed to read selected file. Please try again.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileName && !docTitle) {
      addToast('Please select a file or enter a document title.', 'error');
      return;
    }

    const isCompanyWide = ['Company Policy', 'Handbook'].includes(docType);
    const emp = isCompanyWide
      ? { _id: '', name: 'All Employees', employeeCode: 'COMPANY', avatar: '', department: 'Company-Wide' }
      : (activeEmployees.find(e => e.employeeCode === selectedEmployee) || employees.find(e => e.employeeCode === selectedEmployee) || currentUser || activeEmployees[0] || {});

    const uLabel = currentUser?.employeeCode ? `${currentUser.name} (${currentUser.employeeCode})` : (currentUser?.name || 'Administrator');

    const newDocPayload = {
      title: (docTitle || `${docType} - ${emp.name || 'Employee'}`).trim(),
      docType,
      employeeId: emp._id ? String(emp._id) : '',
      employeeCode: emp.employeeCode || '',
      employeeName: emp.name || 'Employee',
      employeeAvatar: emp.avatar || '',
      department: emp.department || 'General',
      fileName: fileName || `${docType.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      mimeType,
      fileSize: fileSize || '0 KB',
      fileSizeBytes,
      fileDataUrl,
      uploadDate: getLocalDateString(),
      uploadedBy: uLabel,
      uploadedById: String(currentUser?._id || currentUser?.id || ''),
      uploadedByCode: currentUser?.employeeCode || '',
      status: 'verified'
    };

    setIsUploading(true);
    try {
      await onDocumentUploaded(newDocPayload);
      addToast({
        title: 'Document Uploaded to Cloud ✅',
        message: `${docType} saved to MongoDB for ${emp.name || 'Employee'}.`,
        type: 'success'
      });
      resetForm();
      onClose();
    } catch (err) {
      addToast({
        title: 'Upload Failed',
        message: err?.message || 'Could not upload document to database.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-[4px] flex items-center justify-center z-[9999] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[520px] shadow-[0_20px_40px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="py-[18px] px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
            Upload Employee Document / KYC
          </h3>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-slate-500 cursor-pointer p-1 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {!['Company Policy', 'Handbook'].includes(docType) && (
            <div>
              <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Employee
              </label>
              <select
                value={selectedEmployee}
                disabled={!canManage}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 disabled:opacity-70"
              >
                {(canManage ? activeEmployees : activeEmployees.filter(e => e.employeeCode === currentUser?.employeeCode)).map(emp => (
                  <option key={emp.employeeCode} value={emp.employeeCode}>
                    {emp.name} ({emp.employeeCode}) — {emp.role}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Document Category
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"
            >
              <option value="Aadhaar Card">Aadhaar Card (National ID)</option>
              <option value="PAN Card">PAN Card (Tax Identification)</option>
              <option value="Offer Letter">Offer Letter (Signed)</option>
              <option value="Appointment Letter">Appointment Letter</option>
              <option value="Relieving / Experience Letter">Relieving / Experience Letter</option>
              <option value="Bank Passbook / Cheque">Bank Passbook / Cancelled Cheque</option>
              <option value="Educational Certificates">Educational Degree Certificates</option>
              {canManage && <option value="Company Policy">Company Policy (All Employees)</option>}
              {canManage && <option value="Handbook">Employee Handbook (All Employees)</option>}
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Document Title / Memo
            </label>
            <input
              type="text"
              placeholder="e.g. Aadhaar Card - Front & Back"
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] outline-none"
            />
          </div>

          {/* File Drop Area */}
          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Attach File (PDF, PNG, JPG, DOCX up to 5 MB)
            </label>
            <label className="flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-950/30 cursor-pointer text-center">
              <UploadCloud size={32} color="#2563eb" className="mb-2" />
              {fileName ? (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold text-[13px]">
                  <CheckCircle2 size={16} />
                  <span>{fileName} ({fileSize})</span>
                </div>
              ) : (
                <>
                  <span className="text-[13px] font-semibold text-blue-800 dark:text-blue-300">
                    Click to browse or select file
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Saved directly in MongoDB Cloud &amp; synced across devices
                  </span>
                </>
              )}
              <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="py-[9px] px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="py-[9px] px-5 rounded-lg border-0 bg-blue-600 text-white text-[13px] font-bold cursor-pointer shadow-[0_2px_6px_rgba(37,99,235,0.3)] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading to Cloud...' : 'Upload & Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
