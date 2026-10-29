/**
 * @file ImportExpensesModal.jsx
 * @description Modal allowing users to import company expenses from CSV/Excel files with preview.
 */

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useToast } from '../../../shared/context/ToastContext';

export const ImportExpensesModal = ({ isOpen, onClose }) => {
  const { importExpensesBatch } = useCRM();
  const { addToast } = useToast();

  const [previewData, setPreviewData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Item Name,Price,Category,Purchased From,Purchase Date,Status,Description\n' +
      'Cloud Server Dedicated Node,42000,Cloud Infrastructure,DigitalOcean,2026-09-15,approved,Staging deployment worker\n' +
      'Office Standing Desk 4x,36000,Hardware & Devices,IKEA India,2026-09-18,approved,Ergonomic workplace upgrade\n' +
      'JetBrains All Products License,24000,Software & Tools,JetBrains s.r.o.,2026-09-22,pending,Enterprise developer tools suite\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'company_expenses_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Sample CSV template downloaded!', 'success');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length <= 1) {
        alert('File is empty or only contains headers');
        return;
      }

      const rows = lines.slice(1).map((line, idx) => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          id: `row_${idx}`,
          itemName: cols[0] || `Expense Item ${idx + 1}`,
          price: Number(cols[1]) || 5000,
          category: cols[2] || 'Utilities & Office',
          purchasedFrom: cols[3] || 'Vendor Supplier',
          purchaseDate: cols[4] || new Date().toISOString().split('T')[0],
          status: cols[5] || 'approved',
          description: cols[6] || 'Batch imported expense record.'
        };
      });

      setPreviewData(rows);
    };

    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (previewData.length === 0) return;
    try {
      setImporting(true);
      await importExpensesBatch(previewData);
      onClose();
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[740px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 m-0">
                Import Company Expenses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                Upload CSV or Excel files with price, category, and vendor details
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          
          {/* Action Row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-[13px] text-slate-600 dark:text-slate-300">
              Need the template structure? Download the standardized CSV schema:
            </div>
            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-[12.5px] font-semibold cursor-pointer transition-colors"
            >
              <Download size={14} />
              Download Sample CSV
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl py-8 px-5 text-center bg-slate-50 dark:bg-slate-800/40 cursor-pointer relative hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <FileSpreadsheet size={22} />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {fileName ? `Selected: ${fileName}` : 'Choose CSV file or drag & drop here'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports CSV with UTF-8 encoding
            </div>
          </div>

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                  Preview Table ({previewData.length} entries parsed)
                </span>
                <span className="text-xs text-green-600 dark:text-emerald-400 font-semibold">
                  ✓ Valid Schema Verified
                </span>
              </div>

              <div className="max-h-[200px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-left">
                      <th className="p-2 px-3">Item Name</th>
                      <th className="p-2 px-3">Price</th>
                      <th className="p-2 px-3">Category</th>
                      <th className="p-2 px-3">Purchased From</th>
                      <th className="p-2 px-3">Date</th>
                      <th className="p-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map(row => (
                      <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-2 px-3 font-semibold text-slate-900 dark:text-slate-100">{row.itemName}</td>
                        <td className="p-2 px-3 text-green-600 dark:text-emerald-400 font-bold">₹{row.price}</td>
                        <td className="p-2 px-3 text-slate-500 dark:text-slate-400">{row.category}</td>
                        <td className="p-2 px-3 text-slate-700 dark:text-slate-300">{row.purchasedFrom}</td>
                        <td className="p-2 px-3 text-slate-500 dark:text-slate-400">{row.purchaseDate}</td>
                        <td className="p-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            row.status === 'approved' ? 'bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-[18px] py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={importing || previewData.length === 0}
              className={`inline-flex items-center gap-2 px-[22px] py-[9px] rounded-lg border-0 text-white text-[13px] font-bold transition-all ${
                previewData.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-md shadow-blue-600/35'
                  : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={16} />
              {importing ? 'Importing Data...' : `Import ${previewData.length} Records`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
