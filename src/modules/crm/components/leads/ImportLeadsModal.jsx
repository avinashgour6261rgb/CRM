/**
 * @file ImportLeadsModal.jsx
 * @description Modal allowing users to import leads from CSV/Excel files with live table preview and row validation.
 */

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Trash2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useCRM } from '../../../../shared/context/CRMContext';
import { useToast } from '../../../../shared/context/ToastContext';

export const ImportLeadsModal = ({ isOpen, onClose }) => {
  const { importLeadsBatch } = useCRM();
  const { addToast } = useToast();

  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  // Sample CSV Template Download
  const handleDownloadSample = () => {
    const headers = ['Contact Name', 'Company Name', 'Work Email', 'Phone Number', 'Lead Type', 'Priority', 'Deal Value', 'Notes'];
    const sampleRows = [
      ['Alexander Wright', 'Wright Technologies Ltd', 'a.wright@wright-tech.com', '+44 20 7946 0888', 'Enterprise', 'high', '650000', 'Inquiry for 100 employee licenses'],
      ['Deepa Nair', 'Nair Cloud Innovations', 'deepa.nair@naircloud.in', '+91 98450 11223', 'Inbound Web', 'medium', '420000', 'Requested demo of payroll & task board'],
      ['Marcus Vance', 'Vance Capital Partners', 'marcus@vancecapital.com', '+1 (415) 555-0143', 'Referral', 'urgent', '1250000', 'Enterprise contract negotiation']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sampleRows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Sample_Leads_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Sample Leads CSV downloaded', 'info');
  };

  // Parse CSV text into array of lead objects
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);

        if (lines.length < 2) {
          alert('CSV file is empty or does not contain header and data rows.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim().toLowerCase());
        const dataRows = [];

        for (let i = 1; i < lines.length; i++) {
          // Simple CSV line splitter accounting for quotes
          const rawRow = lines[i];
          const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
          const matches = [];
          let match;
          while ((match = regex.exec(rawRow)) !== null) {
            let val = match[1] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1).replace(/""/g, '"');
            }
            matches.push(val.trim());
            if (regex.lastIndex === match.index) regex.lastIndex++;
          }

          // Fallback simple split if regex produced empty array
          const cells = matches.length > 1 ? matches.filter((_, idx) => idx < headers.length) : rawRow.split(',').map(c => c.replace(/["']/g, '').trim());

          const rowObj = {};
          headers.forEach((header, idx) => {
            rowObj[header] = cells[idx] || '';
          });

          // Map headers to CRM Lead properties
          const name = rowObj['contact name'] || rowObj['name'] || rowObj['lead name'] || rowObj['contact'] || '';
          const companyName = rowObj['company name'] || rowObj['company'] || rowObj['client'] || '';
          const email = rowObj['work email'] || rowObj['email'] || rowObj['email address'] || '';
          const phone = rowObj['phone number'] || rowObj['phone'] || rowObj['mobile'] || '';
          const leadType = rowObj['lead type'] || rowObj['category'] || rowObj['type'] || 'Inbound Web';
          const priority = (rowObj['priority'] || 'medium').toLowerCase();
          const dealValue = Number(rowObj['deal value'] || rowObj['value'] || rowObj['amount'] || 0);
          const notes = rowObj['notes'] || rowObj['description'] || '';

          // Validation
          const errors = [];
          if (!name) errors.push('Missing Lead / Contact Name');
          if (!email) errors.push('Missing Work Email');
          else if (!email.includes('@')) errors.push('Invalid Email format');

          dataRows.push({
            id: i,
            name,
            contactPerson: name,
            companyName: companyName || name,
            client: companyName || name,
            email,
            phone,
            leadType,
            priority: ['urgent', 'high', 'medium', 'low'].includes(priority) ? priority : 'medium',
            dealValue,
            notes,
            isValid: errors.length === 0,
            errors
          });
        }

        setParsedRows(dataRows);
      } catch (err) {
        console.error('Error parsing CSV:', err);
        alert('Failed to parse file. Please verify CSV format.');
      }
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid lead rows to import. Please check validation errors in the preview table.');
      return;
    }

    try {
      setImporting(true);
      await importLeadsBatch(validRows);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[780px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileSpreadsheet size={18} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 m-0">
                Import Leads from CSV / Excel
              </h2>
            </div>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 ml-10">
              Upload your spreadsheet file to batch import prospect records with preview & validation
            </p>
          </div>

          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-[18px]">
          
          {/* Upload Area & Sample Downloader */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload size={24} />
            </div>

            <div>
              <label className="inline-flex items-center gap-2 py-[9px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer shadow-md transition-colors">
                <Upload size={15} />
                Select CSV or Excel File
                <input
                  type="file"
                  accept=".csv, text/csv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Supports standard comma-separated `.csv` and text files
              </div>
            </div>

            <div className="h-px w-full bg-slate-200 dark:bg-slate-700 my-1" />

            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Don't have a file ready? Download our official format:
              </span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md py-1.5 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download size={13} />
                Download Sample CSV Template
              </button>
            </div>
          </div>

          {/* Uploaded File Stats & Validation Summary */}
          {parsedRows.length > 0 && (
            <div className="flex items-center justify-between p-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-[10px] border border-slate-200 dark:border-slate-700 flex-wrap gap-2.5">
              <div>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                  📄 File: {fileName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  ({parsedRows.length} total rows parsed)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-300 py-[3px] px-2 rounded-md">
                  <CheckCircle2 size={13} />
                  {validCount} Ready to Import
                </span>

                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300 py-[3px] px-2 rounded-md">
                    <AlertTriangle size={13} />
                    {invalidCount} Needs Fix
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Table Preview */}
          {parsedRows.length > 0 && (
            <div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100 mb-2">
                Live Data Preview & Row Validation:
              </div>
              <div className="max-h-[260px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full border-collapse text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5 w-[30px]">Status</th>
                      <th className="py-2 px-2.5">Contact Name</th>
                      <th className="py-2 px-2.5">Company</th>
                      <th className="py-2 px-2.5">Work Email</th>
                      <th className="py-2 px-2.5">Phone</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5">Deal Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-100 dark:border-slate-800 ${
                          row.isValid ? 'bg-white dark:bg-slate-900' : 'bg-red-50/70 dark:bg-red-950/30'
                        }`}
                      >
                        <td className="py-2 px-2.5 text-center">
                          {row.isValid ? (
                            <CheckCircle2 size={14} className="text-green-600 mx-auto" />
                          ) : (
                            <span title={row.errors.join(', ')} className="cursor-help">
                              <AlertTriangle size={14} className="text-red-600 mx-auto" />
                            </span>
                          )}
                        </td>
                        <td className={`py-2 px-2.5 font-semibold ${row.name ? 'text-slate-900 dark:text-slate-100' : 'text-red-600'}`}>
                          {row.name || '⚠️ Missing'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300">
                          {row.companyName || '—'}
                        </td>
                        <td className={`py-2 px-2.5 ${row.email ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                          {row.email || '⚠️ Missing'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300">
                          {row.phone || '—'}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className="py-[1px] px-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10.5px]">
                            {row.leadType}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-semibold text-green-600 dark:text-green-400">
                          ₹{row.dealValue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="py-[9px] px-[18px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || validCount === 0}
              className={`inline-flex items-center gap-2 py-[9px] px-[22px] rounded-lg border-none text-white text-[13px] font-bold transition-colors ${
                validCount > 0
                  ? 'bg-green-600 hover:bg-green-700 cursor-pointer shadow-md'
                  : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={16} />
              {importing ? 'Importing Leads...' : `Confirm Import (${validCount} Leads)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
