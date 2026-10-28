import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useToast } from '../../../../shared/context/ToastContext';

export const UploadDocumentModal = ({ isOpen, onClose, onDocumentUploaded }) => {
  const { employees } = useHR();
  const { addToast } = useToast();

  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.employeeCode || 'EMP-001');
  const [docType, setDocType] = useState('Aadhaar Card');
  const [docTitle, setDocTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fileName && !docTitle) return;

    const emp = employees.find(e => e.employeeCode === selectedEmployee) || employees[0];

    const newDoc = {
      id: 'DOC-' + Date.now(),
      title: docTitle || `${docType} - ${emp.name}`,
      docType,
      employeeName: emp.name,
      employeeCode: emp.employeeCode,
      employeeAvatar: emp.avatar,
      department: emp.department,
      fileName: fileName || `${docType.toLowerCase().replace(/\s+/g, '_')}_document.pdf`,
      fileSize: fileSize || '1.45 MB',
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'verified'
    };

    onDocumentUploaded(newDoc);

    addToast({
      title: 'Document Uploaded & Verified ✅',
      message: `${docType} uploaded successfully for ${emp.name}.`,
      type: 'success'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-[4px] flex items-center justify-center z-[9999] p-5">
      <div className="bg-white rounded-2xl w-full max-w-[520px] shadow-[0_20px_40px_rgba(0,0,0,0.2)] overflow-hidden">
        {/* Modal Header */}
        <div className="py-[18px] px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-extrabold text-slate-900 m-0">
            Upload Employee Onboarding Document
          </h3>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-slate-500 cursor-pointer p-1 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
              Select Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              className="w-full py-[9px] px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 outline-none bg-white"
            >
              {employees.map(emp => (
                <option key={emp.employeeCode} value={emp.employeeCode}>
                  {emp.name} ({emp.employeeCode}) — {emp.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
              Document Category
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full py-[9px] px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 outline-none bg-white"
            >
              <option value="Aadhaar Card">Aadhaar Card (National ID)</option>
              <option value="PAN Card">PAN Card (Tax Identification)</option>
              <option value="Offer Letter">Offer Letter (Signed)</option>
              <option value="Appointment Letter">Appointment Letter</option>
              <option value="Relieving / Experience Letter">Relieving / Experience Letter</option>
              <option value="Bank Passbook / Cheque">Bank Passbook / Cancelled Cheque</option>
              <option value="Educational Certificates">Educational Degree Certificates</option>
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
              Document Title / Memo
            </label>
            <input
              type="text"
              placeholder="e.g. Employee_Aadhaar_Card_Front_Back.pdf"
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              className="w-full py-[9px] px-3 rounded-lg border border-slate-300 text-[13px] outline-none"
            />
          </div>

          {/* File Drop Area */}
          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
              Attach File (PDF, PNG, JPG up to 10MB)
            </label>
            <label className="flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 cursor-pointer text-center">
              <UploadCloud size={32} color="#2563eb" className="mb-2" />
              {fileName ? (
                <div className="flex items-center gap-1.5 text-green-600 font-bold text-[13px]">
                  <CheckCircle2 size={16} />
                  <span>{fileName} ({fileSize})</span>
                </div>
              ) : (
                <>
                  <span className="text-[13px] font-semibold text-blue-800">
                    Click to browse or drop file here
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Secure 256-bit encrypted storage
                  </span>
                </>
              )}
              <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-[9px] px-4 rounded-lg border border-slate-300 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-[9px] px-5 rounded-lg border-0 bg-blue-600 text-white text-[13px] font-bold cursor-pointer shadow-[0_2px_6px_rgba(37,99,235,0.3)] hover:bg-blue-700"
            >
              Upload & Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
