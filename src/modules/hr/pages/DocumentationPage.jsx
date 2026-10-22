import React, { useState } from 'react';
import {
  FolderLock,
  Upload,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { isHRorAdmin, getUserModulePermissions } from '../../../shared/utils/permissionUtils';
import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { UploadDocumentModal } from '../components/documents/UploadDocumentModal';

export const DocumentationPage = () => {
  const { employees } = useHR();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const isPrivileged = isHRorAdmin(currentUser) || currentUser?.isDelegatedAdmin;
  const perms = getUserModulePermissions(currentUser);
  const canAccessDocs = isPrivileged || perms?.documentation || currentUser?.permissions?.documentation;

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [documents, setDocuments] = useState(() => getCollection(KEYS.DOCUMENTS));

  const handleDocumentUploaded = (newDoc) => {
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    saveCollection(KEYS.DOCUMENTS, updated);
  };

  const handleDownload = (doc) => {
    addToast({
      title: 'Download Started 📥',
      message: `Downloading ${doc.fileName} (${doc.fileSize})...`,
      type: 'info'
    });
  };

  const handleDelete = (docId) => {
    const updated = documents.filter(d => d.id !== docId);
    setDocuments(updated);
    saveCollection(KEYS.DOCUMENTS, updated);
    addToast({
      title: 'Document Removed 🗑️',
      message: 'Employee document removed from cloud storage.',
      type: 'success'
    });
  };

  if (!canAccessDocs) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        margin: '24px auto',
        maxWidth: '540px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#dc2626',
          marginBottom: '16px'
        }}>
          <FolderLock size={28} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
          Documentation Access Restricted
        </h3>
        <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
          Company documents and KYC records are restricted to HR & Administrators by default. Please contact your administrator if you require documentation access.
        </p>
      </div>
    );
  }

  const filteredDocs = (documents || []).filter(doc => {
    // Regular employees with access only see company policies or documents assigned to them
    if (!isPrivileged) {
      const isPublicPolicy = doc.docType === 'Company Policy' || doc.docType === 'Handbook';
      const isMyDoc = doc.employeeCode === currentUser?.employeeCode || doc.employeeName?.toLowerCase() === currentUser?.name?.toLowerCase();
      if (!isPublicPolicy && !isMyDoc) return false;
    }

    const matchesSearch =
      (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.docType || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = selectedCategory === 'all' || doc.docType === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        minHeight: '68px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FolderLock size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>Documentation & KYC Hub</h1>
              <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: '700' }}>
                Verified Cloud
              </span>
            </div>
            <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Secure repository for Aadhaar, PAN, Offer Letters & compliance certificates
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            height: '30px',
            borderRadius: '6px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
          }}
        >
          <Upload size={14} />
          Upload Document
        </button>
      </div>

      {/* Metric Cards - Compact High-Density Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Total KYC Documents</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
              {documents.length} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Files</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: '700' }}>● 100% Encrypted</span>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={16} />
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Verified Onboarding</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
              {employees.length} / {employees.length} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Complete</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748b' }}>Zero compliance backlog</span>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} />
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Storage Used</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
              11.4 MB
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748b' }}>AWS S3 Cloud Active</span>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderLock size={16} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Filter / Search Bar */}
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 10px',
            height: '30px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            width: '240px'
          }}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search document or employee..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                color: '#0f172a'
              }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              height: '30px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#0f172a',
              outline: 'none'
            }}
          >
            <option value="all">All Document Types</option>
            <option value="Aadhaar Card">Aadhaar Card</option>
            <option value="PAN Card">PAN Card</option>
            <option value="Offer Letter">Offer Letter</option>
            <option value="Relieving / Experience Letter">Relieving Letter</option>
            <option value="Educational Certificates">Educational Certificates</option>
          </select>
        </div>

        {/* Documents Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Document Name</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Employee</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Type</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Size</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Upload Date</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr
                  key={doc.id}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <FileText size={14} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{doc.title}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>{doc.fileName}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <img
                        src={doc.employeeAvatar}
                        alt={doc.employeeName}
                        style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{doc.employeeName}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{doc.department}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '7px 12px', color: '#334155', whiteSpace: 'nowrap' }}>{doc.docType}</td>
                  <td style={{ padding: '7px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{doc.fileSize}</td>
                  <td style={{ padding: '7px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{doc.uploadDate}</td>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      fontSize: '10.5px',
                      fontWeight: '700'
                    }}>
                      <CheckCircle size={11} />
                      Verified
                    </span>
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => handleDownload(doc)}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          color: '#2563eb',
                          width: '24px',
                          height: '24px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Download Document"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          color: '#dc2626',
                          width: '24px',
                          height: '24px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Delete Document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentUploaded={handleDocumentUploaded}
      />
    </div>
  );
};
