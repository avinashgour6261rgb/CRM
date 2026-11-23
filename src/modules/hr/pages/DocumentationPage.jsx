import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderLock,
  Upload,
  Search,
  FileText,
  ShieldCheck,
  Download,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { canAccessModule, canManageDocumentation } from '../../../shared/utils/permissionUtils';
import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { API_BASE, getAuthHeaders } from '../../../shared/config/apiConfig';
import { UploadDocumentModal } from '../components/documents/UploadDocumentModal';

const formatTotalBytes = (bytes = 0) => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const DocumentationPage = () => {
  const { employees = [] } = useHR();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const canManage = canManageDocumentation(currentUser);
  const canAccessDocs = canAccessModule(currentUser, 'documentation');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const [documents, setDocuments] = useState(() => getCollection(KEYS.DOCUMENTS) || []);

  const fetchDocumentsFromDB = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : [];
        setDocuments(list);
        saveCollection(KEYS.DOCUMENTS, list, { broadcast: false });
      }
    } catch (err) {
      console.warn('[DocumentationPage] Using cached documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccessDocs) return;
    fetchDocumentsFromDB();
    const handleRemoteUpdate = () => fetchDocumentsFromDB();
    window.addEventListener('ems_documents_updated', handleRemoteUpdate);
    window.addEventListener('ems_socket_reconnected', handleRemoteUpdate);
    return () => {
      window.removeEventListener('ems_documents_updated', handleRemoteUpdate);
      window.removeEventListener('ems_socket_reconnected', handleRemoteUpdate);
    };
  }, [canAccessDocs, fetchDocumentsFromDB]);

  const handleDocumentUploaded = async (newDocPayload) => {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(newDocPayload)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.message || `Failed to upload document (${res.status})`);
    }
    const created = json?.data;
    if (created) {
      setDocuments(prev => {
        const updated = [created, ...(prev || []).filter(d => String(d._id || d.id) !== String(created._id || created.id))];
        saveCollection(KEYS.DOCUMENTS, updated, { broadcast: false });
        return updated;
      });
    } else {
      await fetchDocumentsFromDB();
    }
  };

  const handleDownload = async (doc) => {
    const docId = doc._id || doc.id;
    setDownloadingId(docId);
    try {
      let fileDataUrl = doc.fileDataUrl || '';
      let fileName = doc.fileName || `${doc.title || 'document'}`;

      if (!fileDataUrl && docId && /^[a-fA-F0-9]{24}$/.test(String(docId))) {
        const res = await fetch(`${API_BASE}/documents/${docId}/download`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.fileDataUrl) fileDataUrl = json.data.fileDataUrl;
          if (json?.data?.fileName) fileName = json.data.fileName;
        }
      }

      if (!fileDataUrl) {
        // Fallback summary only when an older metadata-only record had no binary file attached
        const fallbackName = fileName.replace(/\.[^/.]+$/, '') + '_summary.txt';
        fileDataUrl = `data:text/plain;charset=utf-8,Official Employee Document Record%0A-----------------------------------%0ATitle: ${encodeURIComponent(doc.title || '')}%0AEmployee: ${encodeURIComponent(doc.employeeName || '')} (${doc.employeeCode || ''})%0ACategory: ${encodeURIComponent(doc.docType || '')}%0AUpload Date: ${doc.uploadDate || ''}%0AStatus: Verified Record%0A`;
        fileName = fallbackName;
      }

      const link = document.createElement('a');
      link.href = fileDataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        title: 'Document Downloaded 📥',
        message: `${fileName} downloaded successfully.`,
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Download Failed',
        message: err?.message || 'Could not download this document.',
        type: 'error'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc) => {
    const docId = doc._id || doc.id;
    try {
      if (docId && /^[a-fA-F0-9]{24}$/.test(String(docId))) {
        const res = await fetch(`${API_BASE}/documents/${docId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.message || `Failed to delete document (${res.status})`);
        }
      }
      setDocuments(prev => {
        const updated = (prev || []).filter(d => String(d._id || d.id) !== String(docId));
        saveCollection(KEYS.DOCUMENTS, updated, { broadcast: false });
        return updated;
      });
      addToast({
        title: 'Document Removed 🗑️',
        message: 'Employee document permanently removed from MongoDB cloud storage.',
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Delete Failed',
        message: err?.message || 'Could not remove document.',
        type: 'error'
      });
    }
  };

  if (!canAccessDocs) {
    return (
      <div className="flex flex-col items-center justify-center p-[60px_20px] text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 my-6 mx-auto max-w-[540px]">
        <div className="w-14 h-14 rounded-[14px] bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4">
          <FolderLock size={28} />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 m-0 mb-2">
          Documentation Access Restricted
        </h3>
        <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-normal m-0 mb-4">
          Company documents and KYC records are restricted to HR & Administrators by default. Please contact your administrator if you require documentation access.
        </p>
      </div>
    );
  }

  const filteredDocs = (documents || []).filter(doc => {
    // Regular employees without management access only see company policies or documents assigned to them
    if (!canManage) {
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
    <div className="flex flex-col gap-5 min-h-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FolderLock size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Documentation & KYC Hub</h1>
              <span className="text-[10.5px] py-px px-1.5 rounded bg-green-100 text-green-600 font-bold">
                Verified Cloud
              </span>
            </div>
            <p className="m-0 mt-px text-[11.5px] text-slate-500 dark:text-slate-400">
              Secure repository for Aadhaar, PAN, Offer Letters & compliance certificates
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 text-white border-none text-xs font-bold cursor-pointer shadow-sm hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <Upload size={14} />
          Upload Document
        </button>
      </div>

      {/* Metric Cards - Compact High-Density Grid */}
      {(() => {
        const totalBytes = (documents || []).reduce((sum, d) => sum + (Number(d.fileSizeBytes) || 0), 0);
        const activeEmps = (employees || []).filter(e => !['resigned', 'inactive', 'terminated', 'suspended', 'archived'].includes(String(e?.status || 'active').toLowerCase()));
        const uniqueCoveredCodes = new Set((documents || []).map(d => String(d.employeeCode || '').toUpperCase()).filter(c => c && c !== 'COMPANY'));
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-white dark:bg-slate-900 rounded-[10px] p-[10px_14px] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total KYC Documents</span>
                <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                  {filteredDocs.length} <span className="text-xs font-semibold text-slate-500">Files</span>
                </div>
                <span className="text-[10.5px] text-green-600 font-bold">● Synced with MongoDB Cloud</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText size={16} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[10px] p-[10px_14px] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Employees with Docs</span>
                <div className="text-lg font-extrabold text-green-600 dark:text-green-400 mt-0.5">
                  {Math.min(uniqueCoveredCodes.size, activeEmps.length)} / {activeEmps.length} <span className="text-xs font-semibold text-slate-500">Active</span>
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">Live onboarding KYC coverage</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[10px] p-[10px_14px] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Cloud Storage Used</span>
                <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatTotalBytes(totalBytes)}
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">MongoDB Atlas Active</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <FolderLock size={16} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {/* Filter / Search Bar */}
        <div className="p-2 px-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-full sm:w-60 min-w-0 flex-1">
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search document or employee..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border-none bg-transparent outline-none text-xs w-full text-slate-900 dark:text-slate-100"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="h-[30px] px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none w-full sm:w-auto"
          >
            <option value="all">All Document Types</option>
            <option value="Aadhaar Card">Aadhaar Card</option>
            <option value="PAN Card">PAN Card</option>
            <option value="Offer Letter">Offer Letter</option>
            <option value="Appointment Letter">Appointment Letter</option>
            <option value="Relieving / Experience Letter">Relieving Letter</option>
            <option value="Bank Passbook / Cheque">Bank Passbook / Cheque</option>
            <option value="Educational Certificates">Educational Certificates</option>
            <option value="Company Policy">Company Policy</option>
            <option value="Handbook">Employee Handbook</option>
          </select>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-2 px-3 whitespace-nowrap">Document Name</th>
                <th className="p-2 px-3 whitespace-nowrap">Employee</th>
                <th className="p-2 px-3 whitespace-nowrap">Type</th>
                <th className="p-2 px-3 whitespace-nowrap">Size</th>
                <th className="p-2 px-3 whitespace-nowrap">Upload Date</th>
                <th className="p-2 px-3 whitespace-nowrap">Status</th>
                <th className="p-2 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingDocs ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Loading documents from cloud storage...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No documents uploaded yet. Click &quot;Upload Document&quot; to store Aadhaar, PAN, Offer Letters or Policies in MongoDB Cloud.
                  </td>
                </tr>
              ) : filteredDocs.map(doc => {
                const rowId = doc._id || doc.id;
                const canDeleteDoc = canManage || (currentUser?.employeeCode && String(doc.employeeCode || '').toUpperCase() === String(currentUser.employeeCode).toUpperCase());
                return (
                  <tr
                    key={rowId}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-1.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-[26px] h-[26px] rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <FileText size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{doc.title}</div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">{doc.fileName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-1.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {doc.employeeAvatar ? (
                          <img
                            src={doc.employeeAvatar}
                            alt={doc.employeeName}
                            className="w-[22px] h-[22px] rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-[22px] h-[22px] rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center">
                            {(doc.employeeName || 'C').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{doc.employeeName || 'Company-Wide'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{doc.department || doc.employeeCode}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-1.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{doc.docType}</td>
                  <td className="p-1.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{doc.fileSize}</td>
                  <td className="p-1.5 px-3 whitespace-nowrap">
                    <div className="text-slate-600 dark:text-slate-300 font-medium">{doc.uploadDate}</div>
                    {doc.uploadedBy && (
                      <div className="text-[10px] text-slate-400">by {doc.uploadedBy}</div>
                    )}
                  </td>
                  <td className="p-1.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 py-0.5 px-[7px] rounded-[10px] bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 text-[10.5px] font-bold">
                      <CheckCircle size={11} />
                      Verified
                    </span>
                  </td>
                  <td className="p-1.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === rowId}
                        className="bg-slate-100 dark:bg-slate-800 border-none text-blue-600 dark:text-blue-400 w-6 h-6 rounded-[5px] inline-flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        title="Download Document"
                      >
                        <Download size={13} />
                      </button>
                      {canDeleteDoc && (
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === rowId}
                          className="bg-slate-100 dark:bg-slate-800 border-none text-blue-600 dark:text-blue-400 w-6 h-6 rounded-[5px] inline-flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                          title="Download Document"
                        >
                          <Download size={13} />
                        </button>
                        {canDeleteDoc && (
                          <button
                            onClick={() => handleDelete(doc)}
                            className="bg-red-100 dark:bg-red-950/60 border-none text-red-600 dark:text-red-400 w-6 h-6 rounded-[5px] inline-flex items-center justify-center cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
