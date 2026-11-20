/**
 * @file companySettingsController.js
 * @description Controller for Company Settings, Foundation Anniversary & Shift Policy in MongoDB Atlas.
 */

const CompanySettings = require('../models/CompanySettings');
const Employee = require('../../hr/models/Employee');
const Attendance = require('../../hr/models/Attendance');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

const parseTimeStrToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const cleaned = String(timeStr).trim();
  const isPM = cleaned.toUpperCase().includes('PM');
  const isAM = cleaned.toUpperCase().includes('AM');
  const timePart = cleaned.replace(/AM|PM/gi, '').trim();
  const parts = timePart.split(':').map(Number);
  let h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 3600 + m * 60 + s;
};

exports.getCompanySettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = new CompanySettings();
      await settings.save();
    }
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCompanySettings = async (req, res) => {
  try {
    const u = req.user;
    const rawData = { ...(req.body || {}) };
    delete rawData._id;
    delete rawData.__v;
    delete rawData.createdAt;
    delete rawData.updatedAt;

    const payloadKeys = Object.keys(rawData);
    const isPayrollDisbursementOnly = payloadKeys.length === 1 && payloadKeys[0] === 'disbursedPayrollMonths';
    const HR_META_KEYS = new Set(['customDesignations', 'customDepartments', 'promotionHistory']);
    const isHrMetaOnly = payloadKeys.length > 0 && payloadKeys.every(k => HR_META_KEYS.has(k));
    const isRolesOnly = payloadKeys.length > 0 && payloadKeys.every(k => k === 'customRoles' || HR_META_KEYS.has(k));

    const canEditSettings = Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.isDelegatedAdmin || u.permissions?.manageSettings || u.permissions?.allAccess));
    const canDisbursePayroll = Boolean(canEditSettings || (u && (u.systemRole === 'hr' || u.permissions?.managePayroll)));
    const canManageHrMeta = Boolean(canEditSettings || (u && (u.systemRole === 'hr' || u.permissions?.manageEmployees)));
    const canManageRoles = Boolean(canEditSettings || (u && u.permissions?.grantPermissions));

    if (!(
      canEditSettings ||
      (isPayrollDisbursementOnly && canDisbursePayroll) ||
      (isHrMetaOnly && canManageHrMeta) ||
      (isRolesOnly && canManageRoles)
    )) {
      return res.status(403).json({ success: false, message: 'Access denied: Insufficient permissions to update company settings.' });
    }

    if (Array.isArray(rawData.disbursedPayrollMonths)) {
      rawData.disbursedPayrollMonths = [...new Set(rawData.disbursedPayrollMonths.map(m => String(m || '').trim()).filter(Boolean))];
    }
    if (Array.isArray(rawData.customDesignations)) {
      rawData.customDesignations = [...new Set(rawData.customDesignations.map(v => String(v || '').trim()).filter(Boolean))];
    }
    if (Array.isArray(rawData.customDepartments)) {
      rawData.customDepartments = [...new Set(rawData.customDepartments.map(v => String(v || '').trim()).filter(Boolean))];
    }

    if (typeof rawData.companyLogo === 'string' && rawData.companyLogo.length > 600000) {
      return res.status(400).json({ success: false, message: 'Company logo is too large. Please upload an image under 400KB.' });
    }
    if (Array.isArray(rawData.weeklyOffDays)) {
      rawData.weeklyOffDays = [...new Set(rawData.weeklyOffDays.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b);
    }

    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = new CompanySettings(rawData);
    } else {
      Object.assign(settings, rawData);
    }
    await settings.save();
    const plainSettings = settings.toObject ? settings.toObject() : settings;
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('settings:updated', { settings: plainSettings });
    } catch (_) {}
    res.json({
      success: true,
      data: plainSettings,
      message: 'Company settings updated successfully in database'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.applyShiftPolicyToOrg = async (req, res) => {
  try {
    const u = req.user;
    const canEdit = Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.isDelegatedAdmin || u.permissions?.manageSettings || u.permissions?.allAccess));
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can apply shift policy.' });
    }

    let settings = await CompanySettings.findOne().lean();
    if (!settings) settings = new CompanySettings().toObject();

    const shiftStartTime = settings.shiftStartTime || '10:00 AM';
    const shiftEndTime = settings.shiftEndTime || '07:00 PM';
    const graceMins = settings.gracePeriodMinutes !== undefined ? Number(settings.gracePeriodMinutes) : 15;
    const standardWorkHours = settings.standardWorkHours !== undefined ? Number(settings.standardWorkHours) : 9;
    const halfDayThresholdHours = settings.halfDayThresholdHours !== undefined ? Number(settings.halfDayThresholdHours) : 4.5;
    const minOvertimeMinutes = settings.minOvertimeMinutes !== undefined ? Number(settings.minOvertimeMinutes) : 0;
    const shiftWindowLabel = `${shiftStartTime} - ${shiftEndTime}`;

    const { syncEmployeeShifts = true, recalculateScope = 'today' } = req.body || {};

    let updatedEmployeesCount = 0;
    if (syncEmployeeShifts) {
      const empRes = await Employee.updateMany(
        { status: { $ne: 'inactive' } },
        { $set: { shiftTiming: shiftWindowLabel } }
      );
      updatedEmployeesCount = empRes.modifiedCount || 0;
    }

    let recalculatedAttendanceCount = 0;
    if (recalculateScope === 'today' || recalculateScope === 'month') {
      const todayStr = getIstDateString();
      const dateFilter = recalculateScope === 'month'
        ? { date: new RegExp(`^${todayStr.slice(0, 7)}`) }
        : { date: todayStr };

      const shiftStartSecs = parseTimeStrToSeconds(shiftStartTime);
      const graceLimitSecs = shiftStartSecs + (graceMins * 60);

      const records = await Attendance.find({
        ...dateFilter,
        status: { $in: ['present', 'late', 'half_day'] }
      });

      for (const rec of records) {
        let changed = false;
        let nextStatus = rec.status;
        let isLate = false;
        let lateByMinutes = 0;

        if (rec.clockInTime) {
          const inSecs = parseTimeStrToSeconds(rec.clockInTime);
          if (inSecs > graceLimitSecs) {
            isLate = true;
            lateByMinutes = Math.floor((inSecs - shiftStartSecs) / 60);
            nextStatus = 'half_day';
          } else {
            nextStatus = 'present';
          }
        }

        const effectiveWorkHours = (rec.workSeconds && Number(rec.workSeconds) > 0)
          ? +(Number(rec.workSeconds) / 3600).toFixed(2)
          : (Number(rec.totalWorkingHours) || 0);

        if (rec.clockOutTime && effectiveWorkHours > 0 && effectiveWorkHours < halfDayThresholdHours) {
          nextStatus = 'half_day';
        }

        const rawOtMins = Math.max(0, Math.round((effectiveWorkHours - standardWorkHours) * 60));
        const qualifiedOtHours = rawOtMins >= minOvertimeMinutes && rawOtMins > 0 ? +(rawOtMins / 60).toFixed(2) : 0;
        const qualifiedOtSecs = Math.round(qualifiedOtHours * 3600);

        if (
          rec.status !== nextStatus ||
          Boolean(rec.isLate) !== isLate ||
          Number(rec.lateByMinutes || 0) !== lateByMinutes ||
          Number(rec.overtimeSeconds || 0) !== qualifiedOtSecs
        ) {
          rec.status = nextStatus;
          rec.isLate = isLate;
          rec.lateByMinutes = lateByMinutes;
          rec.overtimeHours = qualifiedOtHours;
          rec.overtimeSeconds = qualifiedOtSecs;
          if (qualifiedOtSecs > 0) {
            rec.overtimeStatus = 'auto_recorded';
            rec.overtimeReason = `Auto-tracked (outside ${shiftWindowLabel} shift)`;
          }
          await rec.save();
          recalculatedAttendanceCount++;
          changed = true;
        }
        if (changed) {
          // tracked in recalculatedAttendanceCount
        }
      }
    }

    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('settings:updated', { settings });
      if (updatedEmployeesCount > 0) emitToAll('employees:updated', { reason: 'shift_policy_sync' });
      if (recalculatedAttendanceCount > 0) emitToAll('attendance:updated', { reason: 'shift_policy_recalc' });
    } catch (_) {}

    res.json({
      success: true,
      data: {
        shiftWindow: shiftWindowLabel,
        updatedEmployeesCount,
        recalculatedAttendanceCount
      },
      message: `Shift policy (${shiftWindowLabel}) applied: ${updatedEmployeesCount} employee schedules synced, ${recalculatedAttendanceCount} attendance record(s) recalculated.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

