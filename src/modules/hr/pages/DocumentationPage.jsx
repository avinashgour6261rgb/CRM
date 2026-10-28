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
      <div className="flex flex-col items-center justify-center p-[60px_20px] text-center bg-white rounded-xl border border-slate-200 my-6 mx-auto max-w-[540px]">
        <div className="w-14 h-14 rounded-[14px] bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4">
          <FolderLock size={28} />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 m-0 mb-2">
          Documentation Access Restricted
        </h3>
        <p className="text-[13.5px] text-slate-500 leading-normal m-0 mb-4">
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
    <div className="flex flex-col gap-5 min-h-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white p-3 px-4 rounded-[10px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <FolderLock size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-base font-extrabold text-slate-900 leading-tight">Documentation & KYC Hub</h1>
              <span className="text-[10.5px] py-px px-1.5 rounded bg-green-100 text-green-600 font-bold">
                Verified Cloud
              </span>
            </div>
            <p className="m-0 mt-px text-[11.5px] text-slate-500">
              Secure repository for Aadhaar, PAN, Offer Letters & compliance certificates
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 text-white border-none text-xs font-bold cursor-pointer shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Upload size={14} />
          Upload Document
        </button>
      </div>

      {/* Metric Cards - Compact High-Density Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
        <div className="bg-white rounded-[10px] p-[10px_14px] border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Total KYC Documents</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {documents.length} <span className="text-xs font-semibold text-slate-500">Files</span>
            </div>
            <span className="text-[10.5px] text-green-600 font-bold">● 100% Encrypted</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText size={16} />
          </div>
        </div>

        <div className="bg-white rounded-[10px] p-[10px_14px] border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Verified Onboarding</span>
            <div className="text-lg font-extrabold text-green-600 mt-0.5">
              {employees.length} / {employees.length} <span className="text-xs font-semibold text-slate-500">Complete</span>
            </div>
            <span className="text-[10.5px] text-slate-500">Zero compliance backlog</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="bg-white rounded-[10px] p-[10px_14px] border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Storage Used</span>
            <div className="text-lg font-extrabold text-blue-600 mt-0.5">
              11.4 MB
            </div>
            <span className="text-[10.5px] text-slate-500">AWS S3 Cloud Active</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <FolderLock size={16} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-[10px] border border-slate-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {/* Filter / Search Bar */}
        <div className="p-2 px-3 border-b border-slate-100 flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 bg-slate-50 w-60">
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search document or employee..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border-none bg-transparent outline-none text-xs w-full text-slate-900"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="h-[30px] px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-900 outline-none"
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
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
              {filteredDocs.map(doc => (
                <tr
                  key={doc.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="p-1.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-[26px] h-[26px] rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{doc.title}</div>
                        <div className="text-[10.5px] text-slate-500">{doc.fileName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-1.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={doc.employeeAvatar}
                        alt={doc.employeeName}
                        className="w-[22px] h-[22px] rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{doc.employeeName}</div>
                        <div className="text-[10px] text-slate-500">{doc.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-1.5 px-3 text-slate-700 whitespace-nowrap">{doc.docType}</td>
                  <td className="p-1.5 px-3 text-slate-500 whitespace-nowrap">{doc.fileSize}</td>
                  <td className="p-1.5 px-3 text-slate-500 whitespace-nowrap">{doc.uploadDate}</td>
                  <td className="p-1.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 py-0.5 px-[7px] rounded-[10px] bg-green-100 text-green-700 text-[10.5px] font-bold">
                      <CheckCircle size={11} />
                      Verified
                    </span>
                  </td>
                  <td className="p-1.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="bg-slate-100 border-none text-blue-600 w-6 h-6 rounded-[5px] inline-flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"
                        title="Download Document"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="bg-red-100 border-none text-red-600 w-6 h-6 rounded-[5px] inline-flex items-center justify-center cursor-pointer hover:bg-red-200 transition-colors"
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
