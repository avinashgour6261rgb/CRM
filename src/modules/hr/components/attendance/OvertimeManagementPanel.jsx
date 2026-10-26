import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, XCircle, Briefcase, User, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';

export const OvertimeManagementPanel = ({ currentUser, addToast }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  const isPrivileged = isHRorAdmin(currentUser);

  const fetchOvertimeData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await hrService.getOvertimeRequests();
      const list = Array.isArray(data) ? data : (data?.data || []);
      setRequests(list);
    } catch (e) {
      console.error('Error fetching overtime requests:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOvertimeData();
    const handleStorage = (e) => {
      if (!e?.detail?.key || e.detail.key === 'ems_attendance_overtime' || e.detail.key === 'hrms_attendance') {
        fetchOvertimeData();
      }
    };
    window.addEventListener('hrms_storage_change', handleStorage);
    window.addEventListener('ems_overtime_updated', fetchOvertimeData);
    return () => {
      window.removeEventListener('hrms_storage_change', handleStorage);
      window.removeEventListener('ems_overtime_updated', fetchOvertimeData);
    };
  }, [fetchOvertimeData]);

  const handleDecision = async (id, status) => {
    try {
      let reason = '';
      if (status === 'rejected') {
        reason = window.prompt('Please enter a reason for rejecting this overtime request (optional):') || 'Rejected by approver';
      }
      await hrService.updateOvertimeStatus(id, status, currentUser?.name || 'Admin', reason);
      if (addToast) {
        addToast(`Overtime request marked as ${status.toUpperCase()}!`, status === 'approved' ? 'success' : 'info');
      }
      fetchOvertimeData();
    } catch (err) {
      console.error('Decision error:', err);
      if (addToast) addToast('Failed to update overtime status', 'error');
    }
  };

  const filtered = requests.filter(r => {
    const s = r.overtimeStatus || r.status || 'pending';
    if (filterStatus !== 'all' && s !== filterStatus) return false;
    // Non-privileged users only see their own requests
    if (!isPrivileged) {
      const myId = String(currentUser?._id || currentUser?.id || '');
      const myCode = String(currentUser?.employeeCode || '');
      const empId = String(r.employeeId || r.employee || '');
      const empCode = String(r.employeeCode || '');
      if (myId !== empId && myCode !== empCode) return false;
    }
    return true;
  });

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      {/* Header and Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '14px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              Overtime Requests & Approvals
            </h3>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
              Side-by-side shift extra hours & task duration verification
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              color: '#0f172a',
              outline: 'none'
            }}
          >
            <option value="all">All ({requests.length})</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
          Loading overtime records...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px dashed #cbd5e1'
        }}>
          <Clock size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
            No Overtime Requests Found
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            When employees work beyond standard shift hours, their overtime claims and task work will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((item) => {
            const status = item.overtimeStatus || item.status || 'pending';
            const hours = item.overtimeHours || (item.overtimeSeconds ? +(item.overtimeSeconds / 3600).toFixed(2) : 0);
            const tasks = item.overtimeTasks || [];

            const isPending = status === 'pending';
            const isApproved = status === 'approved';

            return (
              <div
                key={item._id || item.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: `1px solid ${isPending ? '#fed7aa' : (isApproved ? '#bbf7d0' : '#fecaca')}`,
                  backgroundColor: isPending ? '#fffaf5' : (isApproved ? '#f0fdf4' : '#fef2f2'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                {/* Left Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '260px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    fontWeight: '800',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {(item.employeeName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                        {item.employeeName || 'Employee'}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ({item.employeeCode || 'EMP'})
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '5px',
                        backgroundColor: isPending ? '#ffedd5' : (isApproved ? '#dcfce7' : '#fee2e2'),
                        color: isPending ? '#c2410c' : (isApproved ? '#15803d' : '#b91c1c')
                      }}>
                        {status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span>📅 Date: <strong>{item.date}</strong></span>
                      <span>⏰ Extra Time: <strong style={{ color: '#ea580c' }}>+{hours}h</strong></span>
                      {item.overtimeRequestedTo && (
                        <span>Approver: <strong>{item.overtimeRequestedTo}</strong></span>
                      )}
                    </div>

                    {/* Reason Note */}
                    {item.overtimeReason && (
                      <div style={{ fontSize: '11.5px', color: '#334155', marginTop: '4px', fontStyle: 'italic' }}>
                        "{item.overtimeReason}"
                      </div>
                    )}

                    {/* Tasks Worked Pills */}
                    {tasks.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748b' }}>Tasks:</span>
                        {tasks.map((t, tidx) => (
                          <span
                            key={tidx}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              fontSize: '10.5px',
                              color: '#1e293b',
                              fontWeight: '600'
                            }}
                          >
                            {t.taskCode || 'TSK'}: {t.title || 'Task'} ({t.durationText || ''})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                {isPrivileged && isPending && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleDecision(item._id || item.id, 'approved')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 3px rgba(22, 163, 74, 0.2)'
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleDecision(item._id || item.id, 'rejected')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #fca5a5',
                        backgroundColor: '#ffffff',
                        color: '#dc2626',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <XCircle size={13} />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
