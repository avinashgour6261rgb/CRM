/**
 * @file celebrationUtils.js
 * @description Pure calculation utilities for automatic birthdays and work anniversaries from employee records.
 */

export const calculateComputedBirthdays = (employees) => {
  if (!employees || !Array.isArray(employees) || employees.length === 0) return [];
  const today = new Date();
  const currentYear = today.getFullYear();

  return employees
    .filter(emp => emp && (emp.dob || emp.birthdayDate))
    .map(emp => {
      let birthMonth = 9; // 0-indexed default
      let birthDay = 15;
      let dobStr = emp.dob;

      if (dobStr) {
        const parts = dobStr.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            birthMonth = parseInt(parts[1], 10) - 1;
            birthDay = parseInt(parts[2], 10);
          } else {
            birthDay = parseInt(parts[0], 10);
            birthMonth = parseInt(parts[1], 10) - 1;
          }
        }
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      const birthdayThisYear = new Date(currentYear, birthMonth, birthDay);
      const birthdayFormattedDate = `${birthDay.toString().padStart(2, '0')} ${monthNames[birthMonth]}`;
      const birthdayEventDate = `${currentYear}-${(birthMonth + 1).toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;

      const diffTime = birthdayThisYear.getTime() - today.setHours(0, 0, 0, 0);
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let targetEventDate = birthdayEventDate;

      if (diffDays < 0) {
        const nextYearBday = new Date(currentYear + 1, birthMonth, birthDay);
        diffDays = Math.ceil((nextYearBday.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
        targetEventDate = `${currentYear + 1}-${(birthMonth + 1).toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
      }

      // Strict Rule: Only display birthdays within 30 days
      if (diffDays < 0 || diffDays > 30) {
        return null;
      }

      let daysRemainingText = '';
      if (diffDays === 0) {
        daysRemainingText = "Today! 🎉 Happy Birthday!";
      } else if (diffDays === 1) {
        daysRemainingText = 'Tomorrow 🎂';
      } else {
        daysRemainingText = `In ${diffDays} days`;
      }

      return {
        _id: `bday_auto_${emp._id}`,
        employeeId: emp._id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        avatar: emp.avatar,
        dob: emp.dob,
        birthdayDate: birthdayFormattedDate,
        eventDate: targetEventDate,
        daysRemainingText,
        diffDays,
        isUpcoming30Days: true,
        isToday: diffDays === 0,
        fullMonth: fullMonthNames[birthMonth],
        dayOfMonth: birthDay
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.diffDays - b.diffDays);
};

export const calculateComputedAnniversaries = (employees) => {
  if (!employees || !Array.isArray(employees) || employees.length === 0) return [];
  const today = new Date();
  const currentYear = today.getFullYear();

  return employees
    .filter(emp => emp && (emp.joiningDate || emp.joinDate))
    .map(emp => {
      let joinMonth = -1;
      let joinDay = 1;
      let joinYear = currentYear;
      const joinStr = emp.joiningDate || emp.joinDate;

      if (joinStr) {
        const parts = String(joinStr).split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            joinYear = parseInt(parts[0], 10);
            joinMonth = parseInt(parts[1], 10) - 1;
            joinDay = parseInt(parts[2], 10);
          } else {
            joinDay = parseInt(parts[0], 10);
            joinMonth = parseInt(parts[1], 10) - 1;
            joinYear = parseInt(parts[2], 10);
          }
        }
      }

      if (joinMonth < 0 || isNaN(joinMonth) || isNaN(joinDay)) return null;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      const annivThisYear = new Date(currentYear, joinMonth, joinDay);
      const annivFormattedDate = `${joinDay.toString().padStart(2, '0')} ${monthNames[joinMonth]}`;
      const annivEventDate = `${currentYear}-${(joinMonth + 1).toString().padStart(2, '0')}-${joinDay.toString().padStart(2, '0')}`;

      const diffTime = annivThisYear.getTime() - today.setHours(0, 0, 0, 0);
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let targetEventDate = annivEventDate;
      let milestoneYears = currentYear - joinYear;

      if (diffDays < 0) {
        const nextYearAnniv = new Date(currentYear + 1, joinMonth, joinDay);
        diffDays = Math.ceil((nextYearAnniv.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
        targetEventDate = `${currentYear + 1}-${(joinMonth + 1).toString().padStart(2, '0')}-${joinDay.toString().padStart(2, '0')}`;
        milestoneYears = (currentYear + 1) - joinYear;
      }

      if (milestoneYears < 1) return null;

      const milestoneYearsText = `${milestoneYears} ${milestoneYears === 1 ? 'Year' : 'Years'}`;
      const serviceYearsText = milestoneYearsText;

      // Strict Rule: Only display anniversaries within 30 days
      if (diffDays < 0 || diffDays > 30) {
        return null;
      }

      let daysRemainingText = '';
      if (diffDays === 0) {
        daysRemainingText = `Today! 🌟 ${serviceYearsText} Work Anniversary!`;
      } else if (diffDays === 1) {
        daysRemainingText = `Tomorrow 💼 (${milestoneYearsText} Anniversary)`;
      } else {
        daysRemainingText = `In ${diffDays} days (${milestoneYearsText} Anniversary)`;
      }

      return {
        _id: `anniv_auto_${emp._id}`,
        employeeId: emp._id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        avatar: emp.avatar,
        joiningDate: joinStr,
        serviceYears: milestoneYears,
        serviceYearsText: milestoneYearsText,
        anniversaryDate: annivFormattedDate,
        annivFormattedDate: annivFormattedDate,
        eventDate: targetEventDate,
        daysRemainingText,
        diffDays,
        isUpcoming30Days: true,
        isToday: diffDays === 0,
        fullMonth: fullMonthNames[joinMonth],
        dayOfMonth: joinDay
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.diffDays - b.diffDays);
};
