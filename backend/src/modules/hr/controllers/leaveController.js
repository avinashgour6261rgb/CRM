const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// ─── GET /api/leaves ─────────────────────────────────────────────────────────
const getLeaves = asyncHandler(async (req, res) => {
  const { employeeId, status, leaveType, search, startDate, endDate, page = 1, limit = 100 } = req.query;
  const mongoose = require('mongoose');

  const query = {};
  const user = req.user;
  const isPrivileged = user && (user.isAdmin || user.systemRole === 'admin' || user.systemRole === 'hr' || user.role === 'Administrator' || user.role === 'HR Manager');

  // Tenant / User Scoping: Non-admins strictly only view their own leaves
  if (!isPrivileged && user) {
    const userObjId = mongoose.Types.ObjectId.isValid(user._id) ? user._id : null;
    const userLeaveFilter = userObjId
      ? [{ employee: userObjId }, { employeeCode: user.employeeCode }]
      : [{ employeeCode: user.employeeCode }];
    if (user.name) {
      userLeaveFilter.push({ employeeName: new RegExp(`^${user.name}$`, 'i') });
    }
    query.$or = userLeaveFilter;
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

  if (!leaveData.employee && user && mongoose.Types.ObjectId.isValid(user._id)) {
    leaveData.employee = user._id;
  }
  if (!leaveData.employeeName && user) {
    leaveData.employeeName = user.name;
  }
  if (!leaveData.employeeCode && user) {
    leaveData.employeeCode = user.employeeCode;
  }
  if (!leaveData.employeeRole && user) {
    leaveData.employeeRole = user.role;
  }

  const leave = new Leave({
    ...leaveData,
    status: 'pending',
    approvedBy: null,
    appliedOn: new Date()
  });
  await leave.save();

  res.status(201).json({ success: true, data: leave });
});

// ─── PATCH /api/leaves/:id/status ─────────────────────────────────────────────
const updateLeaveStatus = asyncHandler(async (req, res) => {
  const { status, approverName, approverRemarks } = req.body;

  const allowedStatuses = ['approved', 'rejected', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${allowedStatuses.join(', ')}` });
  }

  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
  if (leave.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Leave is already ${leave.status} and cannot be changed`
    });
  }

  leave.status = status;
  leave.approvedBy = status === 'approved' ? (approverName || 'Admin') : null;
  leave.approverRemarks = approverRemarks || '';
  await leave.save();

  // Deduct leave balance on approval & mark attendance
  if (status === 'approved') {
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

    if (employee) {
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

      // Connect approved leave into Attendance Matrix
      try {
        const Attendance = require('../models/Attendance');
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate || leave.startDate);
        const cur = new Date(start);
        while (cur <= end) {
          const dateStr = cur.toISOString().split('T')[0];
          await Attendance.findOneAndUpdate(
            { employee: employee._id, date: dateStr },
            {
              employee: employee._id,
              employeeName: employee.name,
              employeeCode: employee.employeeCode,
              employeeRole: employee.role,
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

      return res.json({
        success: true,
        data: leave,
        updatedEmployee: {
          _id: employee._id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          leaveBalance: employee.leaveBalance
        }
      });
    }
  }

  res.json({ success: true, data: leave });
});

// ─── DELETE /api/leaves/:id ───────────────────────────────────────────────────
const deleteLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findByIdAndDelete(req.params.id);
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
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

