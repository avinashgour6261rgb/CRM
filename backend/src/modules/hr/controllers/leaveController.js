const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// ─── GET /api/leaves ─────────────────────────────────────────────────────────
const getLeaves = asyncHandler(async (req, res) => {
  const { employeeId, status, leaveType, search, startDate, endDate, page = 1, limit = 100 } = req.query;

  const query = {};
  const user = req.user;
  const isPrivileged = user && (user.isAdmin || user.systemRole === 'admin' || user.systemRole === 'hr' || user.role === 'Administrator' || user.role === 'HR Manager');

  // Tenant / User Scoping: Non-admins view leaves where they are either applicant or designated reviewer
  if (!isPrivileged && user) {
    const userObjId = mongoose.Types.ObjectId.isValid(user._id) ? user._id : null;
    const userLeaveFilter = userObjId
      ? [{ employee: userObjId }, { employeeId: String(user._id) }, { appliedToId: String(user._id) }]
      : [];
    if (user.employeeCode) {
      userLeaveFilter.push({ employeeCode: user.employeeCode });
      userLeaveFilter.push({ employeeId: user.employeeCode });
      userLeaveFilter.push({ appliedToId: user.employeeCode });
      userLeaveFilter.push({ appliedToCode: user.employeeCode });
    }
    if (user.name) {
      userLeaveFilter.push({ employeeName: new RegExp(`^${user.name}$`, 'i') });
      userLeaveFilter.push({ appliedToName: new RegExp(`^${user.name}$`, 'i') });
    }
    if (user.email) {
      userLeaveFilter.push({ employeeEmail: new RegExp(`^${user.email}$`, 'i') });
      userLeaveFilter.push({ appliedToEmail: new RegExp(`^${user.email}$`, 'i') });
    }
    query.$or = userLeaveFilter.length > 0 ? userLeaveFilter : [{ employeeCode: user.employeeCode || '__none__' }];
  } else if (employeeId && employeeId !== 'all') {
    const isObjId = mongoose.Types.ObjectId.isValid(employeeId);
    query.$or = isObjId ? [{ employee: employeeId }, { employeeCode: employeeId }] : [{ employeeCode: employeeId }];
  }

  if (status && status !== 'all') query.status = status;
  if (leaveType && leaveType !== 'all') query.leaveType = leaveType;

  if (startDate && endDate) {
    query.$or = [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ];
  }

  if (search) {
    const searchReg = new RegExp(search, 'i');
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { employeeName: searchReg },
          { leaveType: searchReg },
          { reason: searchReg }
        ]
      }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [leaves, total] = await Promise.all([
    Leave.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Leave.countDocuments(query)
  ]);

  res.json({
    success: true,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: leaves
  });
});

// ─── GET /api/leaves/:id ─────────────────────────────────────────────────────
const getLeaveById = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
  res.json({ success: true, data: leave });
});

// ─── POST /api/leaves ─────────────────────────────────────────────────────────
const createLeave = asyncHandler(async (req, res) => {
  const user = req.user;
  const leaveData = { ...req.body };

  // 1. Resolve Employee from body or authenticated user
  let employee = null;
  const empRef = leaveData.employee || leaveData.employeeId;
  if (empRef && mongoose.Types.ObjectId.isValid(empRef)) {
    employee = await Employee.findById(empRef);
  }
  if (!employee && leaveData.employeeCode) {
    employee = await Employee.findOne({ employeeCode: leaveData.employeeCode });
  }
  if (!employee && leaveData.employeeName) {
    employee = await Employee.findOne({ name: new RegExp(`^${leaveData.employeeName.trim()}$`, 'i') });
  }
  if (!employee && user) {
    if (mongoose.Types.ObjectId.isValid(user._id)) {
      employee = await Employee.findById(user._id);
    }
    if (!employee && user.employeeCode) {
      employee = await Employee.findOne({ employeeCode: user.employeeCode });
    }
  }

  if (employee) {
    leaveData.employee = employee._id;
    leaveData.employeeId = employee._id.toString();
    leaveData.employeeName = leaveData.employeeName || employee.name;
    leaveData.employeeCode = leaveData.employeeCode || employee.employeeCode;
    leaveData.employeeRole = leaveData.employeeRole || employee.role;
    leaveData.employeeAvatar = leaveData.employeeAvatar || employee.avatar || '';
  } else if (!leaveData.employee || !mongoose.Types.ObjectId.isValid(leaveData.employee)) {
    const firstEmp = await Employee.findOne();
    if (firstEmp) {
      leaveData.employee = firstEmp._id;
      leaveData.employeeId = firstEmp._id.toString();
      leaveData.employeeName = leaveData.employeeName || firstEmp.name;
      leaveData.employeeCode = leaveData.employeeCode || firstEmp.employeeCode;
      leaveData.employeeRole = leaveData.employeeRole || firstEmp.role;
    }
  }

  if (!leaveData.durationText) {
    const dDays = Number(leaveData.durationDays) || 1;
    leaveData.durationText = `${dDays} Day${dDays > 1 ? 's' : ''}`;
  }

  // Deduct employee leave balance upon leave application (reservation/deduction)
  if (employee && leaveData.isPaid !== false && leaveData.leaveType !== 'Unpaid Leave') {
    const balance = {
      casual: employee.leaveBalance?.casual ?? 10,
      sick: employee.leaveBalance?.sick ?? 8,
      earned: employee.leaveBalance?.earned ?? 15,
      maternity: employee.leaveBalance?.maternity ?? 0
    };
    const days = Number(leaveData.durationDays) || 1;
    const lt = (leaveData.leaveType || '').toLowerCase();

    if (lt.includes('cas') || lt === 'cl') {
      balance.casual = Math.max(0, balance.casual - days);
    } else if (lt.includes('sic') || lt === 'sl') {
      balance.sick = Math.max(0, balance.sick - days);
    } else if (lt.includes('earn') || lt.includes('ann') || lt.includes('paid') || lt === 'el') {
      balance.earned = Math.max(0, balance.earned - days);
    } else if (lt.includes('mat') || lt.includes('pat')) {
      balance.maternity = Math.max(0, balance.maternity - days);
    } else {
      if (balance.casual >= days) balance.casual -= days;
      else balance.earned = Math.max(0, balance.earned - days);
    }
    employee.leaveBalance = balance;
    await employee.save();
  }

  const leave = new Leave({
    ...leaveData,
    status: 'pending',
    approvedBy: null,
    appliedOn: new Date()
  });
  await leave.save();

  res.status(201).json({
    success: true,
    data: leave,
    updatedEmployee: employee ? {
      _id: employee._id,
      employeeCode: employee.employeeCode,
      leaveBalance: employee.leaveBalance
    } : null
  });
});

// ─── PUT /api/leaves/:id/status ─────────────────────────────────────────────
const updateLeaveStatus = asyncHandler(async (req, res) => {
  const { status, approverName, approvedBy, approverRemarks, rejectionReason, cancellationReason } = req.body;
  const user = req.user;

  const allowedStatuses = ['approved', 'rejected', 'cancelled', 'pending'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${allowedStatuses.join(', ')}` });
  }

  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

  const isPrivileged = user && (user.isAdmin || user.systemRole === 'admin' || user.systemRole === 'hr' || user.role === 'Administrator' || user.role === 'HR Manager');
  const isDesignatedApprover = user && (
    (leave.appliedToId && String(leave.appliedToId) === String(user._id)) ||
    (leave.appliedToName && user.name && leave.appliedToName.trim().toLowerCase() === user.name.trim().toLowerCase())
  );
  const isApplicant = user && (
    (leave.employee && String(leave.employee) === String(user._id)) ||
    (leave.employeeCode && user.employeeCode && leave.employeeCode === user.employeeCode) ||
    (leave.employeeName && user.name && leave.employeeName.trim().toLowerCase() === user.name.trim().toLowerCase())
  );

  // Self-approval protection: applicant cannot approve their own leave
  if (status === 'approved' && isApplicant && !isPrivileged) {
    return res.status(403).json({ success: false, message: 'Security restriction: You cannot approve your own leave application.' });
  }

  // Authorization check: Only Admin, HR, designated approver, or applicant (for cancel) can change status
  if (!isPrivileged && !isDesignatedApprover) {
    if (isApplicant && status === 'cancelled') {
      // Allowed: applicant cancelling own leave request (pending or approved)
    } else {
      return res.status(403).json({ success: false, message: 'Security restriction: You do not have permission to update or cancel this leave.' });
    }
  }

  const previousStatus = leave.status;
  const actorName = approverName || approvedBy || user?.name || 'Administrator';
  const remarks = approverRemarks || rejectionReason || cancellationReason || '';

  leave.status = status;
  leave.actionBy = actorName;
  leave.actionDate = new Date();

  if (status === 'approved') {
    leave.approvedBy = actorName;
    leave.approverRemarks = remarks;
    leave.cancelledBy = null;
    leave.cancellationReason = '';
    leave.rejectedBy = null;
    leave.rejectionReason = '';
  } else if (status === 'cancelled') {
    leave.cancelledBy = actorName;
    leave.cancellationReason = remarks || 'Cancelled by authorized reviewer';
    leave.approvedBy = null;
    leave.approverRemarks = remarks;
  } else if (status === 'rejected') {
    leave.rejectedBy = actorName;
    leave.rejectionReason = remarks || 'Declined by reviewer';
    leave.approvedBy = null;
    leave.approverRemarks = remarks;
  } else if (status === 'pending') {
    leave.approvedBy = null;
    leave.cancelledBy = null;
    leave.rejectedBy = null;
  }

  await leave.save();

  // Find Employee document for balance & attendance synchronization
  let employee = null;
  if (leave.employee && mongoose.Types.ObjectId.isValid(leave.employee)) {
    employee = await Employee.findById(leave.employee);
  }
  if (!employee && leave.employeeCode) {
    employee = await Employee.findOne({ employeeCode: leave.employeeCode });
  }
  if (!employee && leave.employeeName) {
    employee = await Employee.findOne({ name: leave.employeeName });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. If transitioning TO 'approved' from cancelled/rejected (or if previousStatus was not pending/approved):
  // Deduct employee leave balance only if not already deducted on application
  const alreadyDeductedOnApply = previousStatus === 'pending';
  if (status === 'approved' && previousStatus !== 'approved' && employee) {
    if (!alreadyDeductedOnApply) {
      const balance = {
        casual: employee.leaveBalance?.casual ?? 10,
        sick: employee.leaveBalance?.sick ?? 8,
        earned: employee.leaveBalance?.earned ?? 15,
        maternity: employee.leaveBalance?.maternity ?? 0
      };
      const days = Number(leave.durationDays) || 1;
      const lt = (leave.leaveType || '').toLowerCase();

      if (lt.includes('cas') || lt === 'cl') {
        balance.casual = Math.max(0, balance.casual - days);
      } else if (lt.includes('sic') || lt === 'sl') {
        balance.sick = Math.max(0, balance.sick - days);
      } else if (lt.includes('earn') || lt.includes('ann') || lt.includes('paid') || lt === 'el') {
        balance.earned = Math.max(0, balance.earned - days);
      } else if (lt.includes('mat') || lt.includes('pat')) {
        balance.maternity = Math.max(0, balance.maternity - days);
      } else {
        if (balance.casual >= days) {
          balance.casual -= days;
        } else {
          balance.earned = Math.max(0, balance.earned - days);
        }
      }

      employee.leaveBalance = balance;
      await employee.save();
    }

    // Mark Attendance Matrix as 'on_leave'
    try {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate || leave.startDate);
      const cur = new Date(start);
      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        await Attendance.findOneAndUpdate(
          {
            date: dateStr,
            $or: [{ employee: employee._id }, { employeeCode: employee.employeeCode }]
          },
          {
            employee: employee._id,
            employeeName: employee.name,
            employeeCode: employee.employeeCode,
            employeeRole: employee.role,
            employeeAvatar: employee.avatar || '',
            date: dateStr,
            status: 'on_leave',
            notes: `Approved ${leave.leaveType} (${leave.durationDays}d)`
          },
          { upsert: true, new: true }
        );
        cur.setDate(cur.getDate() + 1);
      }
    } catch (attErr) {
      console.warn('Attendance record creation for approved leave skipped:', attErr);
    }
  }

  // 2. If transitioning FROM 'approved' or 'pending' TO 'cancelled' / 'rejected':
  // RESTORE employee leave balance & CLEAN UP attendance records!
  if ((previousStatus === 'approved' || previousStatus === 'pending') && (status === 'cancelled' || status === 'rejected') && employee) {
    const balance = {
      casual: employee.leaveBalance?.casual ?? 10,
      sick: employee.leaveBalance?.sick ?? 8,
      earned: employee.leaveBalance?.earned ?? 15,
      maternity: employee.leaveBalance?.maternity ?? 0
    };
    const days = Number(leave.durationDays) || 1;
    const lt = (leave.leaveType || '').toLowerCase();

    if (lt.includes('cas') || lt === 'cl') {
      balance.casual = (balance.casual || 0) + days;
    } else if (lt.includes('sic') || lt === 'sl') {
      balance.sick = (balance.sick || 0) + days;
    } else if (lt.includes('earn') || lt.includes('ann') || lt.includes('paid') || lt === 'el') {
      balance.earned = (balance.earned || 0) + days;
    } else if (lt.includes('mat') || lt.includes('pat')) {
      balance.maternity = (balance.maternity || 0) + days;
    } else {
      balance.casual = (balance.casual || 0) + days;
    }

    employee.leaveBalance = balance;
    await employee.save();

    // Clean up attendance records created for this leave:
    try {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate || leave.startDate);
      const cur = new Date(start);
      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        // If future date: DELETE the attendance record completely so future days are NOT marked
        if (dateStr > todayStr) {
          await Attendance.deleteMany({
            date: dateStr,
            $or: [{ employee: employee._id }, { employeeCode: employee.employeeCode }]
          });
        } else {
          // If past/current date: delete if status was on_leave
          await Attendance.deleteMany({
            date: dateStr,
            status: 'on_leave',
            $or: [{ employee: employee._id }, { employeeCode: employee.employeeCode }]
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    } catch (attErr) {
      console.warn('Attendance cleanup for cancelled leave failed:', attErr);
    }
  }

  res.json({
    success: true,
    data: leave,
    updatedEmployee: employee ? {
      _id: employee._id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      leaveBalance: employee.leaveBalance
    } : null
  });
});

// ─── DELETE /api/leaves/:id ───────────────────────────────────────────────────
const deleteLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

  const user = req.user;
  const isPrivileged = user && (user.isAdmin || user.systemRole === 'admin' || user.systemRole === 'hr' || user.role === 'Administrator' || user.role === 'HR Manager');
  const isDesignatedApprover = user && (
    (leave.appliedToId && String(leave.appliedToId) === String(user._id)) ||
    (leave.appliedToName && user.name && leave.appliedToName.trim().toLowerCase() === user.name.trim().toLowerCase())
  );
  const isApplicant = user && (
    (leave.employee && String(leave.employee) === String(user._id)) ||
    (leave.employeeCode && user.employeeCode && leave.employeeCode === user.employeeCode) ||
    (leave.employeeName && user.name && leave.employeeName.trim().toLowerCase() === user.name.trim().toLowerCase())
  );

  if (!isPrivileged && !isDesignatedApprover && !isApplicant) {
    return res.status(403).json({ success: false, message: 'Security restriction: You do not have permission to delete this leave.' });
  }

  // If the leave was approved or pending, restore balance and cleanup attendance before deleting
  if (leave.status === 'approved' || leave.status === 'pending') {
    let employee = null;
    if (leave.employee && mongoose.Types.ObjectId.isValid(leave.employee)) {
      employee = await Employee.findById(leave.employee);
    }
    if (!employee && leave.employeeCode) {
      employee = await Employee.findOne({ employeeCode: leave.employeeCode });
    }
    if (employee) {
      const days = Number(leave.durationDays) || 1;
      const lt = (leave.leaveType || '').toLowerCase();
      const balance = { ...(employee.leaveBalance || { casual: 10, sick: 8, earned: 15, maternity: 0 }) };
      if (lt.includes('cas') || lt === 'cl') balance.casual = (balance.casual || 0) + days;
      else if (lt.includes('sic') || lt === 'sl') balance.sick = (balance.sick || 0) + days;
      else if (lt.includes('earn') || lt.includes('ann') || lt.includes('paid') || lt === 'el') balance.earned = (balance.earned || 0) + days;
      else if (lt.includes('mat') || lt.includes('pat')) balance.maternity = (balance.maternity || 0) + days;
      else balance.casual = (balance.casual || 0) + days;
      employee.leaveBalance = balance;
      await employee.save();

      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate || leave.startDate);
      const cur = new Date(start);
      const todayStr = new Date().toISOString().split('T')[0];
      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        if (dateStr > todayStr) {
          await Attendance.deleteMany({ date: dateStr, $or: [{ employee: employee._id }, { employeeCode: employee.employeeCode }] });
        } else {
          await Attendance.deleteMany({ date: dateStr, status: 'on_leave', $or: [{ employee: employee._id }, { employeeCode: employee.employeeCode }] });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  await Leave.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Leave record deleted', data: {} });
});

// ─── GET /api/leaves/stats ────────────────────────────────────────────────────
const getLeaveStats = asyncHandler(async (req, res) => {
  const stats = await Leave.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDays: { $sum: '$durationDays' }
      }
    }
  ]);

  const formatted = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  stats.forEach(s => {
    if (formatted[s._id] !== undefined) formatted[s._id] = s.count;
  });

  res.json({ success: true, data: formatted });
});

// ─── PATCH /api/leaves/:id/acknowledge ───────────────────────────────────────
const acknowledgeLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
  leave.isAcknowledged = true;
  await leave.save();
  res.json({ success: true, data: leave });
});

module.exports = { getLeaves, getLeaveById, createLeave, updateLeaveStatus, deleteLeave, getLeaveStats, acknowledgeLeave };
