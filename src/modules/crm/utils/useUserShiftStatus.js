import { useState, useEffect, useCallback } from 'react';

/**
 * @file useUserShiftStatus.js
 * @description High-performance decoupled shift status hook.
 * Provides live isClockedIn, isOnBreak, and breakType WITHOUT subscribing
 * to TimerContext's 1-second workSeconds ticker.
 * 
 * Prevents 60 full-component re-renders per minute in Messages & Live Voice,
 * eliminating input lag, keyboard stuttering, and heavy CPU usage.
 */
export function useUserShiftStatus(currentUser) {
  const readStatus = useCallback(() => {
    if (!currentUser) {
      return { isClockedIn: false, isOnBreak: false, breakType: null };
    }
    const empKey = currentUser.employeeCode || (currentUser._id ? String(currentUser._id) : (currentUser.id ? String(currentUser.id) : ''));
    if (typeof localStorage === 'undefined' || !empKey) {
      return { isClockedIn: false, isOnBreak: false, breakType: null };
    }

    const checkKey = (suffix) => {
      return (
        localStorage.getItem(`ems_timer_${empKey}_${suffix}`) === 'true' ||
        (currentUser._id && localStorage.getItem(`ems_timer_${currentUser._id}_${suffix}`) === 'true') ||
        (currentUser.id && localStorage.getItem(`ems_timer_${currentUser.id}_${suffix}`) === 'true') ||
        (currentUser.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_${suffix}`) === 'true')
      );
    };

    const isClockedIn = checkKey('is_clocked_in');
    const isOnBreak = checkKey('is_on_break');
    const breakType = (
      localStorage.getItem(`ems_timer_${empKey}_break_type`) ||
      (currentUser._id && localStorage.getItem(`ems_timer_${currentUser._id}_break_type`)) ||
      (currentUser.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_break_type`)) ||
      'Break'
    );

    return { isClockedIn, isOnBreak, breakType };
  }, [currentUser]);

  const [shiftStatus, setShiftStatus] = useState(readStatus);

  useEffect(() => {
    setShiftStatus(readStatus());

    const handleChange = () => {
      setShiftStatus(readStatus());
    };

    window.addEventListener('ems_clocked_in', handleChange);
    window.addEventListener('ems_clocked_out', handleChange);
    window.addEventListener('ems_force_clock_out', handleChange);
    window.addEventListener('ems_break_started', handleChange);
    window.addEventListener('ems_break_ended', handleChange);
    window.addEventListener('hrms_storage_change', handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener('ems_clocked_in', handleChange);
      window.removeEventListener('ems_clocked_out', handleChange);
      window.removeEventListener('ems_force_clock_out', handleChange);
      window.removeEventListener('ems_break_started', handleChange);
      window.removeEventListener('ems_break_ended', handleChange);
      window.removeEventListener('hrms_storage_change', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, [readStatus]);

  return shiftStatus;
}
