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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Upload Employee Onboarding Document
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Select Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              {employees.map(emp => (
                <option key={emp.employeeCode} value={emp.employeeCode}>
                  {emp.name} ({emp.employeeCode}) — {emp.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Document Category
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
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
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Document Title / Memo
            </label>
            <input
              type="text"
              placeholder="e.g. Employee_Aadhaar_Card_Front_Back.pdf"
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* File Drop Area */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Attach File (PDF, PNG, JPG up to 10MB)
            </label>
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              border: '2px dashed #93c5fd',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <UploadCloud size={32} color="#2563eb" style={{ marginBottom: '8px' }} />
              {fileName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: '700', fontSize: '13px' }}>
                  <CheckCircle2 size={16} />
                  <span>{fileName} ({fileSize})</span>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>
                    Click to browse or drop file here
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Secure 256-bit encrypted storage
                  </span>
                </>
              )}
              <input type="file" onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
              }}
            >
              Upload & Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
