/**
 * @file NoticeBoardPage.jsx
 * @description Company-wide Notice Board module matching Screenshot 5 exactly.
 */

import React, { useState, useMemo } from 'react';
import {
  BellRing,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  FileText
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useToast } from '../../../shared/context/ToastContext';
import { AddNoticeModal } from '../../../shared/components/modals/AddNoticeModal';

export const NoticeBoardPage = () => {
  const { notices, deleteNotice } = useCRM();
  const { addToast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        (n.title || '').toLowerCase().includes(q) ||
        (n.description || '').toLowerCase().includes(q) ||
        (n.shortDescription || '').toLowerCase().includes(q) ||
        (n.to || '').toLowerCase().includes(q);

      let matchesDate = true;
      if (startDateFilter && n.date && n.date < startDateFilter) matchesDate = false;
      if (endDateFilter && n.date && n.date > endDateFilter) matchesDate = false;

      return matchesSearch && matchesDate;
    });
  }, [notices, search, startDateFilter, endDateFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredNotices.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (filteredNotices.length === 0) {
      alert('No notices available to export');
      return;
    }

    const headers = ['Notice Title,Date,To,Priority,Posted By,Description'];
    const rows = filteredNotices.map(n =>
      `"${(n.title || '').replace(/"/g, '""')}","${n.date || ''}","${n.to || n.targetAudience || 'All Employees'}","${n.priority || 'Normal'}","${n.postedBy || n.createdBy || ''}","${(n.description || n.fullContent || '').replace(/"/g, '""')}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `notice_board_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Notices exported successfully to CSV!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
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
            <BellRing size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>Company Notice Board</h1>
              <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
                {filteredNotices.length} Active Notices
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Official circulars, company policies & urgent announcements
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#2563eb',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
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
            <Plus size={14} />
            <span>Publish Notice</span>
          </button>
        </div>
      </div>

      {/* Filter and Top Navigation Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Duration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <span style={{ fontWeight: '600' }}>Duration:</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 8px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: '11.5px'
            }}>
              <input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11.5px', color: '#334155' }}
              />
              <span style={{ color: '#94a3b8' }}>to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11.5px', color: '#334155' }}
              />
            </div>
          </div>

          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 10px',
            height: '30px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            minWidth: '220px'
          }}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search notice topic, audience..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                backgroundColor: 'transparent',
                color: '#0f172a'
              }}
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: '700' }}>
            {selectedIds.length} notices selected
          </span>
        )}
      </div>

      {/* Notice Board Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                color: '#64748b',
                fontWeight: '700',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: 'left'
              }}>
                <th style={{ padding: '8px 12px', width: '36px', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={filteredNotices.length > 0 && selectedIds.length === filteredNotices.length}
                    onChange={handleSelectAll}
                    style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Notice Title & Content</th>
                <th style={{ padding: '8px 12px', width: '120px', whiteSpace: 'nowrap' }}>Date</th>
                <th style={{ padding: '8px 12px', width: '150px', whiteSpace: 'nowrap' }}>Target Audience</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '90px', whiteSpace: 'nowrap' }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>No notices found</div>
                  </td>
                </tr>
              ) : (
                filteredNotices.map(notice => (
                  <tr
                    key={notice._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: selectedIds.includes(notice._id) ? 'rgba(37,99,235,0.04)' : '#ffffff',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(notice._id)}
                        onChange={() => handleSelectOne(notice._id)}
                        style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                    </td>

                    {/* Notice Subject & Preview */}
                    <td style={{ padding: '7px 12px' }}>
                      <div
                        onClick={() => setSelectedNotice(notice)}
                        style={{ fontWeight: '700', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {notice.title}
                        {notice.isImportant && (
                          <span style={{
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c'
                          }}>
                            URGENT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', maxWidth: '600px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notice.description || notice.shortDescription || notice.fullContent}
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '7px 12px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {notice.date}
                    </td>

                    {/* To */}
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {notice.to || notice.targetAudience || 'All Employees'}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '7px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setSelectedNotice(notice)}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '5px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          color: '#2563eb',
                          fontSize: '11.5px',
                          fontWeight: '700'
                        }}
                      >
                        View Notice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          color: '#64748b',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Show</span>
            <select style={{
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '11.5px'
            }}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>entries</span>
          </div>

          <div>
            Showing 1 to {filteredNotices.length} of {notices.length} entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              disabled
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#94a3b8',
                fontSize: '11.5px',
                cursor: 'not-allowed'
              }}
            >
              Prev
            </button>
            <button
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #2563eb',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              1
            </button>
            <button
              disabled
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#94a3b8',
                fontSize: '11.5px',
                cursor: 'not-allowed'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddNoticeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb'
                }}>
                  {selectedNotice.category || 'Company Notice'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Posted on {selectedNotice.date}
                </span>
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px' }}>
              {selectedNotice.title}
            </h3>

            <div style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              fontSize: '13.5px',
              color: '#1e293b',
              lineHeight: '1.6',
              border: '1px solid #e2e8f0',
              marginBottom: '18px',
              whiteSpace: 'pre-wrap'
            }}>
              {selectedNotice.description || selectedNotice.fullContent || selectedNotice.shortDescription}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <span>Target: <strong>{selectedNotice.to || 'All Employees'}</strong></span>
              <button
                onClick={() => {
                  deleteNotice(selectedNotice._id);
                  setSelectedNotice(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #fee2e2',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                <Trash2 size={13} />
                Delete Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
