/**
 * @file payrollUtils.js
 * @description Centralized, single-source-of-truth payroll and attendance calculation engine.
 *
 * Core Principles:
 * 1. Direct In-Hand Salary: No statutory allowance splits (Basic 50%, HRA 40%, PF, PT, TDS).
 *    Agreed monthly salary is the direct in-hand salary.
 * 2. Total Calendar Days Basis:
 *    dailyRate = monthlySalary / daysInMonth (28, 29, 30, or 31).
 *    halfDayRate = dailyRate * 0.5.
 * 3. Attendance Deductions (Loss of Pay / LOP):
 *    - Full Present / Late / Approved Paid Leave: Paid (0 deduction).
 *    - Half Day: 0.5 day deduction.
 *    - Explicit Absent: 1 day deduction.
 *    - Unpaid Leave (LOP): 1 day deduction.
 *    - Unmarked Past Working Day: Treated as Absent (1 day deduction).
 *    - Weekly Offs (Sundays) & Declared Holidays: Paid (0 deduction).
 *    - Upcoming / Future Days in current month: Not penalized.
 */

import { getWeeklyOffDays } from '../services/companySettingsService';
import { getLocalDateString } from './timerUtils';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Resolves an employee's direct monthly salary.
 * Direct In-Hand model: No allowances or statutory deductions.
 */
export const resolveDirectSalary = (emp, salaryData = null) => {
  const s = salaryData || emp?.salary || {};
  let gross = Number(s.monthlyGross) || Number(s.netSalary) || Number(s.basic) || 0;

  if (!gross) {
    gross = Number(emp?.startingSalary) || (emp?.annualCTC ? Math.round(Number(emp.annualCTC) / 12) : 0);
  }

  // Fallback to 35,000 if not configured
  if (!gross && !emp) gross = 35000;
  if (!gross) gross = 35000;

  return {
    monthlyGross: gross,
    inHandSalary: gross,
    netSalary: gross,
    basic: gross,
    hra: 0,
    allowances: 0,
    bonus: Number(s.bonus) || 0,
    pf: 0,
    pt: 0,
    tds: 0,
    totalDeductions: 0,
    annualCTC: gross * 12,
    isDirectSalary: true
  };
};

/**
 * Parses any month input (e.g. "November 2026", "2026-11", { month: "November", year: 2026 })
 */
export const parseMonthYear = (monthInput) => {
  const now = new Date();
  let monthName = MONTH_NAMES[now.getMonth()];
  let yearNum = now.getFullYear();

  if (typeof monthInput === 'string') {
    if (monthInput.includes('-')) {
      const [y, m] = monthInput.split('-');
      yearNum = parseInt(y, 10) || yearNum;
      const mIdx = (parseInt(m, 10) || 1) - 1;
      monthName = MONTH_NAMES[mIdx] || monthName;
    } else {
      const parts = monthInput.trim().split(/\s+/);
      if (parts[0] && MONTH_NAMES.includes(parts[0])) {
        monthName = parts[0];
      }
      if (parts[1]) {
        yearNum = parseInt(parts[1], 10) || yearNum;
      }
    }
  } else if (monthInput && typeof monthInput === 'object') {
    if (monthInput.month) monthName = monthInput.month;
    if (monthInput.year) yearNum = parseInt(monthInput.year, 10) || yearNum;
  }

  const monthIdx = MONTH_NAMES.indexOf(monthName);
  const mIdxValid = monthIdx >= 0 ? monthIdx : now.getMonth();
  const safeMonthName = MONTH_NAMES[mIdxValid];
  const monthNumStr = String(mIdxValid + 1).padStart(2, '0');
  const monthPrefix = `${yearNum}-${monthNumStr}`;
  const daysInMonth = new Date(yearNum, mIdxValid + 1, 0).getDate();

  return {
    monthName: safeMonthName,
    monthNumStr,
    monthIdx: mIdxValid,
    yearNum,
    monthPrefix,
    daysInMonth
  };
};

/**
 * Matches an attendance or leave record to a target employee.
 */
export const isRecordForEmployee = (record, emp) => {
  if (!record || !emp) return false;
  const empId = String(emp._id || emp.id || '').toLowerCase();
  const empCode = String(emp.employeeCode || '').toLowerCase();
  const empName = String(emp.name || '').trim().toLowerCase();

  const rId = String(record.employeeId || (typeof record.employee === 'object' ? record.employee?._id : record.employee) || '').toLowerCase();
  const rCode = String(record.employeeCode || '').toLowerCase();
  const rName = String(record.employeeName || '').trim().toLowerCase();

  if (empId && rId && empId === rId) return true;
  if (empCode && rCode && empCode === rCode) return true;
  if (empId && rCode && empId === rCode) return true;
  if (empCode && rId && empCode === rId) return true;
  if (empName && rName && empName === rName) return true;
  return false;
};

/**
 * Checks whether a given YYYY-MM-DD date falls within an approved leave range.
 */
export const isDateInLeaveRange = (dateStr, leave) => {
  if (!leave || !leave.startDate) return false;
  const start = leave.startDate.substring(0, 10);
  const end = (leave.endDate || leave.startDate).substring(0, 10);
  return dateStr >= start && dateStr <= end;
};

/**
 * Core engine: Calculates monthly payroll, attendance breakdown & LOP deductions.
 */
export const calculateMonthlyPayroll = ({
  employee,
  selectedMonth,
  attendance = [],
  leaves = [],
  holidays = [],
  companySettings = null,
  salaryOverride = null
}) => {
  const { monthName, yearNum, monthIdx, monthPrefix, daysInMonth } = parseMonthYear(selectedMonth);
  const salary = resolveDirectSalary(employee, salaryOverride);
  const monthlySalary = salary.monthlyGross;

  const dailyRate = Math.round(monthlySalary / daysInMonth);
  const halfDayRate = +(dailyRate * 0.5).toFixed(2);

  const todayStr = getLocalDateString();
  const currentMonthPrefix = todayStr.substring(0, 7);
  const isCurrentMonth = monthPrefix === currentMonthPrefix;
  const isPastMonth = monthPrefix < currentMonthPrefix;

  // Filter employee-specific data
  const empAttendance = (attendance || []).filter(a =>
    a?.date && a.date.startsWith(monthPrefix) && isRecordForEmployee(a, employee)
  );

  const empLeaves = (leaves || []).filter(l =>
    l?.status === 'approved' && isRecordForEmployee(l, employee)
  );

  const weeklyOffs = getWeeklyOffDays(companySettings);

  // Day-by-day audit
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let weeklyOffCount = 0;
  let holidayCount = 0;
  let futureDaysCount = 0;
  let preJoiningDays = 0;

  const dayDetails = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${monthPrefix}-${dayStr}`;
    const dayDate = new Date(yearNum, monthIdx, d);
    const dayOfWeek = dayDate.getDay(); // 0=Sun, 6=Sat

    const isWeeklyOff = weeklyOffs.includes(dayOfWeek);
    const holidayMatch = (holidays || []).find(h =>
      (h.date === dateStr || h.holidayDate === dateStr) && h.status !== 'cancelled'
    );
    const isHoliday = Boolean(holidayMatch);
    const isFuture = isCurrentMonth ? dateStr > todayStr : !isPastMonth;

    // Check if employee had not joined yet
    if (employee?.joiningDate && dateStr < employee.joiningDate.substring(0, 10)) {
      preJoiningDays++;
      dayDetails.push({ date: dateStr, status: 'pre_joining', lop: 1.0, reason: 'Prior to joining date' });
      continue;
    }

    // Check attendance record
    const att = empAttendance.find(a => a.date === dateStr);

    // Check leave application
    const leave = empLeaves.find(l => isDateInLeaveRange(dateStr, l));

    if (att) {
      if (['present', 'late'].includes(att.status)) {
        presentDays++;
        dayDetails.push({ date: dateStr, status: att.status, lop: 0, reason: 'Present' });
      } else if (att.status === 'half_day') {
        halfDays++;
        dayDetails.push({ date: dateStr, status: 'half_day', lop: 0.5, reason: 'Half Day' });
      } else if (att.status === 'on_leave') {
        const isUnpaid = att.isPaidLeave === false || att.leavePayType === 'unpaid' ||
          (leave && String(leave.leaveType || leave.type || '').toLowerCase().includes('unpaid'));
        if (isUnpaid) {
          unpaidLeaveDays++;
          dayDetails.push({ date: dateStr, status: 'unpaid_leave', lop: 1.0, reason: 'Unpaid Leave (LOP)' });
        } else {
          paidLeaveDays++;
          dayDetails.push({ date: dateStr, status: 'paid_leave', lop: 0, reason: 'Approved Paid Leave' });
        }
      } else if (att.status === 'absent') {
        absentDays++;
        dayDetails.push({ date: dateStr, status: 'absent', lop: 1.0, reason: 'Marked Absent' });
      } else if (['holiday', 'day_off'].includes(att.status)) {
        if (att.status === 'holiday') holidayCount++;
        else weeklyOffCount++;
        dayDetails.push({ date: dateStr, status: att.status, lop: 0, reason: 'Holiday / Off' });
      } else {
        // Fallback present
        presentDays++;
        dayDetails.push({ date: dateStr, status: 'present', lop: 0, reason: 'Present' });
      }
    } else if (leave) {
      const isUnpaid = String(leave.leaveType || leave.type || '').toLowerCase().includes('unpaid') || leave.isPaid === false;
      if (isUnpaid) {
        unpaidLeaveDays++;
        dayDetails.push({ date: dateStr, status: 'unpaid_leave', lop: 1.0, reason: 'Approved Unpaid Leave (LOP)' });
      } else {
        paidLeaveDays++;
        dayDetails.push({ date: dateStr, status: 'paid_leave', lop: 0, reason: 'Approved Paid Leave' });
      }
    } else if (isWeeklyOff) {
      weeklyOffCount++;
      dayDetails.push({ date: dateStr, status: 'weekly_off', lop: 0, reason: 'Weekly Off' });
    } else if (isHoliday) {
      holidayCount++;
      dayDetails.push({ date: dateStr, status: 'holiday', lop: 0, reason: holidayMatch.name || 'Company Holiday' });
    } else if (isFuture) {
      futureDaysCount++;
      dayDetails.push({ date: dateStr, status: 'future', lop: 0, reason: 'Scheduled Upcoming Day' });
    } else {
      // Past working day with NO punch/mark -> Treated as Absent (as required by user)
      absentDays++;
      dayDetails.push({ date: dateStr, status: 'unmarked_absent', lop: 1.0, reason: 'Unmarked Past Working Day (Absent)' });
    }
  }

  // Calculate LOP Days and Payable Days
  const totalLopDays = +(absentDays + unpaidLeaveDays + (halfDays * 0.5) + preJoiningDays).toFixed(1);
  const paidDays = Math.max(0, +(daysInMonth - totalLopDays).toFixed(1));

  // Deductions calculation
  const absentDeduction = Math.round((absentDays + preJoiningDays) * dailyRate);
  const unpaidLeaveDeduction = Math.round(unpaidLeaveDays * dailyRate);
  const halfDayDeduction = Math.round(halfDays * (dailyRate * 0.5));
  const totalLopDeduction = Math.min(monthlySalary, absentDeduction + unpaidLeaveDeduction + halfDayDeduction);
  const netSalary = Math.max(0, monthlySalary - totalLopDeduction);

  return {
    employee,
    selectedMonthName: monthName,
    selectedYear: yearNum,
    monthPrefix,
    daysInMonth,
    monthlyGross: monthlySalary,
    dailyRate,
    halfDayRate,
    presentDays,
    halfDays,
    absentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    weeklyOffCount,
    holidayCount,
    futureDaysCount,
    preJoiningDays,
    totalLopDays,
    paidDays,
    absentDeduction,
    halfDayDeduction,
    unpaidLeaveDeduction,
    totalLopDeduction,
    netSalary,
    isDirectSalary: true,
    dayDetails
  };
};
