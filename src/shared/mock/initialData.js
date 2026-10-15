/**
 * @file initialData.js
 * @description Initial seed dataset replicating Enterprise CRM / HRMS data.
 */

export const INITIAL_EMPLOYEES = [
  {
    _id: 'emp_admin',
    employeeCode: 'ADM-001',
    name: 'Admin User',
    email: 'admin@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Administrator',
    department: 'Management',
    status: 'active',
    joiningDate: '2023-01-01',
    dob: '1992-05-15',
    isCurrentUser: true,
    isAdmin: true,
    leaveBalance: { casual: 12, sick: 10, earned: 18, maternity: 0 }
  },
  {
    _id: 'emp_002',
    employeeCode: 'EMP-002',
    name: 'Priya Sharma',
    email: 'priya.s@company.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    role: 'Lead UI/UX Designer',
    department: 'Product Design',
    status: 'active',
    joiningDate: '2023-03-01',
    dob: '1996-10-14', // 14 October
    isCurrentUser: false,
    leaveBalance: { casual: 5, sick: 4, earned: 10, maternity: 0 }
  },
  {
    _id: 'emp_003',
    employeeCode: 'EMP-003',
    name: 'Rahul Verma',
    email: 'rahul.v@company.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    role: 'Senior Full Stack Developer',
    department: 'Engineering',
    status: 'active',
    joiningDate: '2022-11-10',
    dob: '1994-11-20', // 20 November
    isCurrentUser: false,
    leaveBalance: { casual: 7, sick: 5, earned: 14, maternity: 0 }
  },
  {
    _id: 'emp_004',
    employeeCode: 'EMP-004',
    name: 'Sneha Patel',
    email: 'sneha.p@company.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    role: 'HR & Operations Lead',
    department: 'Human Resources',
    status: 'active',
    joiningDate: '2022-08-20',
    dob: '1995-12-05', // 05 December
    isCurrentUser: false,
    leaveBalance: { casual: 10, sick: 8, earned: 15, maternity: 0 }
  },
  {
    _id: 'emp_005',
    employeeCode: 'EMP-005',
    name: 'Amit Kumar',
    email: 'amit.k@company.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    role: 'DevOps & Cloud Engineer',
    department: 'Infrastructure',
    status: 'active',
    joiningDate: '2023-06-12',
    dob: '1993-08-18', // 18 August
    isCurrentUser: false,
    leaveBalance: { casual: 6, sick: 3, earned: 8, maternity: 0 }
  },
  {
    _id: 'emp_006',
    employeeCode: 'EMP-006',
    name: 'Neha Gupta',
    email: 'neha.g@company.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    role: 'Frontend React Developer',
    department: 'Engineering',
    status: 'active',
    joiningDate: '2023-08-01',
    dob: '1997-04-12',
    isCurrentUser: false,
    leaveBalance: { casual: 8, sick: 5, earned: 12, maternity: 0 }
  },
  {
    _id: 'emp_007',
    employeeCode: 'EMP-007',
    name: 'Vikram Malhotra',
    email: 'vikram.m@company.com',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
    role: 'QA & Automation Specialist',
    department: 'Product & QA',
    status: 'active',
    joiningDate: '2023-05-10',
    dob: '1994-09-22',
    isCurrentUser: false,
    leaveBalance: { casual: 7, sick: 4, earned: 10, maternity: 0 }
  }
];

export const INITIAL_LEAVES = [
  {
    _id: 'lv_001',
    employeeId: 'emp_001',
    employeeName: 'Aarav Patel',
    employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    employeeRole: 'Digital Marketing Strategic',
    leaveType: 'Casual Leave',
    startDate: '2026-09-15',
    endDate: '2026-09-16',
    durationDays: 2,
    durationText: '2 Days',
    reason: 'Family urgent function in hometown',
    isPaid: true,
    status: 'approved',
    appliedOn: '2026-09-10T10:30:00Z',
    approvedBy: 'Sneha Patel',
    createdAt: '2026-09-10T10:30:00Z'
  },
  {
    _id: 'lv_002',
    employeeId: 'emp_002',
    employeeName: 'Priya Sharma',
    employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    employeeRole: 'Lead UI/UX Designer',
    leaveType: 'Sick Leave',
    startDate: '2026-09-22',
    endDate: '2026-09-22',
    durationDays: 1,
    durationText: '1 Day',
    reason: 'Viral fever and doctor consultation',
    isPaid: true,
    status: 'approved',
    appliedOn: '2026-09-21T18:45:00Z',
    approvedBy: 'Sneha Patel',
    createdAt: '2026-09-21T18:45:00Z'
  },
  {
    _id: 'lv_003',
    employeeId: 'emp_003',
    employeeName: 'Rahul Verma',
    employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    employeeRole: 'Senior Full Stack Developer',
    leaveType: 'Earned Leave',
    startDate: '2026-10-02',
    endDate: '2026-10-05',
    durationDays: 4,
    durationText: '4 Days',
    reason: 'Planned vacation travel',
    isPaid: true,
    status: 'pending',
    appliedOn: '2026-09-25T14:10:00Z',
    approvedBy: null,
    createdAt: '2026-09-25T14:10:00Z'
  },
  {
    _id: 'lv_004',
    employeeId: 'emp_005',
    employeeName: 'Amit Kumar',
    employeeAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    employeeRole: 'DevOps & Cloud Engineer',
    leaveType: 'Casual Leave',
    startDate: '2026-09-28',
    endDate: '2026-09-28',
    durationDays: 0.5,
    durationText: 'Half Day (Second Half)',
    reason: 'Vehicle servicing appointment',
    isPaid: true,
    status: 'approved',
    appliedOn: '2026-09-26T09:15:00Z',
    approvedBy: 'Sneha Patel',
    createdAt: '2026-09-26T09:15:00Z'
  }
];

// Generate Attendance Matrix data including September 2026, current month, and TODAY's live records
export const generateInitialAttendance = () => {
  const records = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // September 2026 data
  INITIAL_EMPLOYEES.forEach((emp) => {
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
      const d = new Date(2026, 8, day);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      let status = isWeekend ? 'day_off' : null;

      if (!isWeekend) {
        if (day % 11 === 0) status = 'absent';
        else if (day % 7 === 0) status = 'late';
        else if (day % 15 === 0) status = 'half_day';
        else status = 'present';
      }

      if (status) {
        records.push({
          _id: `att_${emp._id}_sep_${day}`,
          employeeId: emp._id,
          employeeCode: emp.employeeCode || emp._id,
          employeeName: emp.name,
          date: dateStr,
          status: status,
          clockInTime: status === 'present' ? '09:12 AM' : (status === 'late' ? '10:45 AM' : null),
          clockOutTime: status === 'present' ? '06:15 PM' : (status === 'late' ? '07:00 PM' : null),
          totalWorkingHours: status === 'present' ? 8.5 : (status === 'late' ? 7.5 : 0),
          isLate: status === 'late',
          notes: status === 'late' ? 'Traffic delay on highway' : ''
        });
      }
    }
  });

  // Current month days up to yesterday
  INITIAL_EMPLOYEES.forEach((emp) => {
    const todayDay = now.getDate();
    for (let day = 1; day < todayDay; day++) {
      const dateStr = `${year}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(year, currentMonth - 1, day);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      let status = isWeekend ? 'day_off' : 'present';

      if (!isWeekend) {
        records.push({
          _id: `att_${emp._id}_cur_${day}`,
          employeeId: emp._id,
          employeeCode: emp.employeeCode || emp._id,
          employeeName: emp.name,
          date: dateStr,
          status: status,
          clockInTime: '09:15 AM',
          clockOutTime: '06:05 PM',
          totalWorkingHours: 8.2,
          isLate: false
        });
      }
    }
  });

  // TODAY'S REALISTIC INTERCONNECTED ATTENDANCE
  const todayEmployeeRecords = [
    { empId: 'emp_admin', code: 'ADM-001', name: 'Admin User', status: 'present', clockIn: '09:00 AM', clockOut: null, hours: 7.5, isLate: false },
    { empId: 'emp_002', code: 'EMP-002', name: 'Priya Sharma', status: 'present', clockIn: '09:30 AM', clockOut: null, hours: 6.8, isLate: false },
    { empId: 'emp_003', code: 'EMP-003', name: 'Rahul Verma', status: 'present', clockIn: '09:15 AM', clockOut: null, hours: 7.2, isLate: false },
    { empId: 'emp_004', code: 'EMP-004', name: 'Sneha Patel', status: 'present', clockIn: '09:00 AM', clockOut: '05:30 PM', hours: 8.0, isLate: false },
    { empId: 'emp_005', code: 'EMP-005', name: 'Amit Kumar', status: 'present', clockIn: '09:45 AM', clockOut: null, hours: 6.5, isLate: false },
    { empId: 'emp_006', code: 'EMP-006', name: 'Neha Gupta', status: 'on_leave', clockIn: null, clockOut: null, hours: 0, isLate: false, notes: 'Casual Leave' },
    { empId: 'emp_007', code: 'EMP-007', name: 'Vikram Malhotra', status: 'present', clockIn: '10:05 AM', clockOut: null, hours: 5.9, isLate: true, notes: 'Traffic delay' }
  ];

  todayEmployeeRecords.forEach(tRec => {
    records.push({
      _id: `att_${tRec.empId}_today`,
      employeeId: tRec.empId,
      employeeCode: tRec.code,
      employeeName: tRec.name,
      date: todayStr,
      status: tRec.status,
      clockInTime: tRec.clockIn,
      clockIn: tRec.clockIn,
      clockOutTime: tRec.clockOut,
      clockOut: tRec.clockOut,
      totalWorkingHours: tRec.hours,
      isLate: tRec.isLate,
      notes: tRec.notes || ''
    });
  });

  return records;
};

export const INITIAL_HOLIDAYS = [
  {
    _id: 'hol_001',
    name: 'New Year Day',
    date: '2026-01-01',
    dayOfWeek: 'Thursday',
    type: 'National Holiday',
    description: 'First day of the year 2026 celebration across all offices',
    isRecurringYearly: true
  },
  {
    _id: 'hol_002',
    name: 'Republic Day',
    date: '2026-01-26',
    dayOfWeek: 'Monday',
    type: 'National Holiday',
    description: '77th Republic Day of India - National Flag Hoisting and Celebration',
    isRecurringYearly: true
  },
  {
    _id: 'hol_003',
    name: 'Maha Shivratri',
    date: '2026-02-17',
    dayOfWeek: 'Tuesday',
    type: 'Gazetted Holiday',
    description: 'Traditional celebration and night vigil of Maha Shivratri',
    isRecurringYearly: false
  },
  {
    _id: 'hol_004',
    name: 'Holi (Festival of Colors)',
    date: '2026-03-04',
    dayOfWeek: 'Wednesday',
    type: 'Gazetted Holiday',
    description: 'Spring festival of colors, warmth, and brotherhood',
    isRecurringYearly: false
  },
  {
    _id: 'hol_005',
    name: 'Eid-ul-Fitr',
    date: '2026-03-21',
    dayOfWeek: 'Saturday',
    type: 'Gazetted Holiday',
    description: 'Islamic festival marking the end of Ramadan',
    isRecurringYearly: false
  },
  {
    _id: 'hol_006',
    name: 'Good Friday',
    date: '2026-04-03',
    dayOfWeek: 'Friday',
    type: 'Gazetted Holiday',
    description: 'Christian holy day commemorating the crucifixion of Jesus Christ',
    isRecurringYearly: false
  },
  {
    _id: 'hol_007',
    name: 'Dr. B.R. Ambedkar Jayanti',
    date: '2026-04-14',
    dayOfWeek: 'Tuesday',
    type: 'Gazetted Holiday',
    description: 'Birth anniversary of Babasaheb Dr. B.R. Ambedkar',
    isRecurringYearly: true
  },
  {
    _id: 'hol_008',
    name: 'Mahavir Jayanti',
    date: '2026-04-30',
    dayOfWeek: 'Thursday',
    type: 'Gazetted Holiday',
    description: 'Birth anniversary of Lord Mahavira, 24th Tirthankara of Jainism',
    isRecurringYearly: false
  },
  {
    _id: 'hol_009',
    name: 'Buddha Purnima',
    date: '2026-05-02',
    dayOfWeek: 'Saturday',
    type: 'Gazetted Holiday',
    description: 'Celebration of the birth, enlightenment, and death of Gautama Buddha',
    isRecurringYearly: false
  },
  {
    _id: 'hol_010',
    name: 'Eid-ul-Adha (Bakrid)',
    date: '2026-05-28',
    dayOfWeek: 'Thursday',
    type: 'Gazetted Holiday',
    description: 'Feast of the Sacrifice observed by Muslims worldwide',
    isRecurringYearly: false
  },
  {
    _id: 'hol_011',
    name: 'Muharram',
    date: '2026-06-26',
    dayOfWeek: 'Friday',
    type: 'Gazetted Holiday',
    description: 'Day of Ashura commemorating historic martyrdom',
    isRecurringYearly: false
  },
  {
    _id: 'hol_012',
    name: 'Independence Day',
    date: '2026-08-15',
    dayOfWeek: 'Saturday',
    type: 'National Holiday',
    description: 'Celebration of Indian Independence and national freedom',
    isRecurringYearly: true
  },
  {
    _id: 'hol_013',
    name: 'Raksha Bandhan',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    type: 'Restricted / Optional Holiday',
    description: 'Traditional festival celebrating the bond between brothers and sisters',
    isRecurringYearly: false
  },
  {
    _id: 'hol_014',
    name: 'Janmashtami',
    date: '2026-09-04',
    dayOfWeek: 'Friday',
    type: 'Gazetted Holiday',
    description: 'Birth celebration of Lord Krishna',
    isRecurringYearly: false
  },
  {
    _id: 'hol_015',
    name: 'Milad-un-Nabi (Id-e-Milad)',
    date: '2026-09-05',
    dayOfWeek: 'Saturday',
    type: 'Gazetted Holiday',
    description: 'Observance of the birthday of the Islamic Prophet Muhammad',
    isRecurringYearly: false
  },
  {
    _id: 'hol_016',
    name: 'Mahatma Gandhi Jayanti',
    date: '2026-10-02',
    dayOfWeek: 'Friday',
    type: 'National Holiday',
    description: 'Birth anniversary of Father of the Nation, Mahatma Gandhi',
    isRecurringYearly: true
  },
  {
    _id: 'hol_017',
    name: 'Dussehra (Vijayadashami)',
    date: '2026-10-20',
    dayOfWeek: 'Tuesday',
    type: 'Gazetted Holiday',
    description: 'Celebration of victory of truth and good over evil',
    isRecurringYearly: false
  },
  {
    _id: 'hol_018',
    name: 'Diwali (Deepavali)',
    date: '2026-11-08',
    dayOfWeek: 'Sunday',
    type: 'Gazetted Holiday',
    description: 'Auspicious Festival of Lights and Prosperity',
    isRecurringYearly: false
  },
  {
    _id: 'hol_019',
    name: 'Govardhan Puja',
    date: '2026-11-09',
    dayOfWeek: 'Monday',
    type: 'Gazetted Holiday',
    description: 'Day dedicated to Lord Krishna and Govardhan Hill',
    isRecurringYearly: false
  },
  {
    _id: 'hol_020',
    name: 'Bhai Dooj',
    date: '2026-11-10',
    dayOfWeek: 'Tuesday',
    type: 'Restricted / Optional Holiday',
    description: 'Festivity honoring the bond of siblings',
    isRecurringYearly: false
  },
  {
    _id: 'hol_021',
    name: 'Guru Nanak Jayanti',
    date: '2026-11-24',
    dayOfWeek: 'Tuesday',
    type: 'Gazetted Holiday',
    description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism',
    isRecurringYearly: false
  },
  {
    _id: 'hol_022',
    name: 'Christmas Day',
    date: '2026-12-25',
    dayOfWeek: 'Friday',
    type: 'National Holiday',
    description: 'Joyous Christmas celebration and year-end holidays',
    isRecurringYearly: true
  },
  {
    _id: 'hol_023',
    name: 'Inforag Annual Foundation Day',
    date: '2026-10-15',
    dayOfWeek: 'Thursday',
    type: 'Company Holiday',
    description: 'Official Inforag Corporate Foundation Day & Annual Townhall Off',
    isRecurringYearly: true
  }
];

export const INITIAL_APPRECIATIONS = [
  {
    _id: 'app_001',
    givenToId: 'emp_001',
    givenToName: 'Aarav Patel',
    givenToAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    givenToRole: 'Digital Marketing Strategic',
    awardName: 'Marketing Campaign MVP',
    awardBadgeIcon: 'trophy',
    givenOn: '2026-09-18',
    givenById: 'emp_004',
    givenByName: 'Sneha Patel',
    rewardPointsOrCash: '₹5,000 Voucher',
    appreciationNote: 'Exceptional performance leading the Q3 organic acquisition funnel with +45% conversion increase!'
  },
  {
    _id: 'app_002',
    givenToId: 'emp_003',
    givenToName: 'Rahul Verma',
    givenToAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    givenToRole: 'Senior Full Stack Developer',
    awardName: 'Star Developer of the Month',
    awardBadgeIcon: 'star',
    givenOn: '2026-09-10',
    givenById: 'emp_004',
    givenByName: 'Sneha Patel',
    rewardPointsOrCash: '₹10,000 Bonus',
    appreciationNote: 'Flawless architecture implementation of real-time event pipeline with zero downtime.'
  },
  {
    _id: 'app_003',
    givenToId: 'emp_002',
    givenToName: 'Priya Sharma',
    givenToAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    givenToRole: 'Lead UI/UX Designer',
    awardName: 'Design Excellence Award',
    awardBadgeIcon: 'award',
    givenOn: '2026-08-25',
    givenById: 'emp_004',
    givenByName: 'Sneha Patel',
    rewardPointsOrCash: '₹7,500 Gift Card',
    appreciationNote: 'Crafting stunning enterprise UI/UX system loved by all clients.'
  }
];

// ===========================================================================
// 🏢 WORK MODULE: PROJECTS, TASKS & TIMESHEETS
// ===========================================================================

export const INITIAL_PROJECTS = [
  {
    _id: 'prj_001',
    projectCode: 'CPC',
    name: 'City Prime Care Health Portal',
    startDate: '2026-09-01',
    deadline: '2026-11-30',
    hasNoDeadline: false,
    category: 'Digital Marketing',
    department: 'Marketing & Growth',
    client: 'City Prime Care',
    summary: 'Comprehensive SEO, social growth, and multi-channel acquisition funnel for healthcare operations.',
    status: 'in_progress',
    progress: 65,
    publicGanttChart: true,
    publicTaskBoard: true,
    taskApprovalRequired: false,
    budget: 250000,
    currency: 'INR',
    members: ['emp_001', 'emp_002'],
    membersList: [
      { _id: 'emp_001', name: 'Aarav Patel', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', role: 'Digital Marketing Strategic' },
      { _id: 'emp_002', name: 'Priya Sharma', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', role: 'Lead UI/UX Designer' }
    ]
  },
  {
    _id: 'prj_002',
    projectCode: 'NBR',
    name: 'Novainfinity Brand Revamp & Design System',
    startDate: '2026-08-15',
    deadline: '2026-10-31',
    hasNoDeadline: false,
    category: 'UI/UX Design',
    department: 'Product Design',
    client: 'Novainfinity Global',
    summary: 'Complete brand redesign, UI component kit, and dark-mode multi-theme web applications.',
    status: 'in_progress',
    progress: 80,
    publicGanttChart: true,
    publicTaskBoard: true,
    taskApprovalRequired: true,
    budget: 400000,
    currency: 'INR',
    members: ['emp_002', 'emp_003'],
    membersList: [
      { _id: 'emp_002', name: 'Priya Sharma', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', role: 'Lead UI/UX Designer' },
      { _id: 'emp_003', name: 'Rahul Verma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', role: 'Senior Full Stack Developer' }
    ]
  },
  {
    _id: 'prj_003',
    projectCode: 'ERP',
    name: 'Enterprise ERP Core Pipeline',
    startDate: '2026-07-01',
    deadline: '2026-12-31',
    hasNoDeadline: false,
    category: 'Web Development',
    department: 'Engineering',
    client: 'In-House Tech Suite',
    summary: 'Scalable MERN business management platform with HRMS, Work, Finance, and CRM automation.',
    status: 'in_progress',
    progress: 50,
    publicGanttChart: true,
    publicTaskBoard: true,
    taskApprovalRequired: false,
    budget: 800000,
    currency: 'INR',
    members: ['emp_001', 'emp_003', 'emp_005'],
    membersList: [
      { _id: 'emp_001', name: 'Aarav Patel', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', role: 'Digital Marketing Strategic' },
      { _id: 'emp_003', name: 'Rahul Verma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', role: 'Senior Full Stack Developer' },
      { _id: 'emp_005', name: 'Amit Kumar', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', role: 'DevOps & Cloud Engineer' }
    ]
  },
  {
    _id: 'prj_004',
    projectCode: 'CIM',
    name: 'Cloud Infrastructure & High Availability Migration',
    startDate: '2026-09-10',
    deadline: '2026-10-20',
    hasNoDeadline: false,
    category: 'Cloud Infrastructure',
    department: 'Infrastructure',
    client: 'Global Cloud Systems',
    summary: 'Containerized Kubernetes cluster deployment with automated CI/CD and disaster recovery.',
    status: 'under_review',
    progress: 90,
    publicGanttChart: false,
    publicTaskBoard: true,
    taskApprovalRequired: true,
    budget: 350000,
    currency: 'INR',
    members: ['emp_005'],
    membersList: [
      { _id: 'emp_005', name: 'Amit Kumar', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', role: 'DevOps & Cloud Engineer' }
    ]
  }
];

const getOffsetDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const INITIAL_TASKS = [
  // ── Web Development ──
  {
    _id: 'tsk_001',
    taskCode: 'ERP-1',
    title: 'Enterprise ERP Core Pipeline & Mongoose Pooling',
    category: 'Web Development',
    projectId: 'prj_001',
    projectName: 'Enterprise ERP Core Pipeline',
    projectCode: 'ERP',
    startDate: getOffsetDate(-2),
    dueDate: getOffsetDate(1),
    hasNoDueDate: false,
    description: 'Configure Mongoose connection pooling, production environment variables, and reliable schema seeding.',
    priority: 'high',
    status: 'in_progress',
    assignedToId: 'emp_003',
    assignedToName: 'Rahul Verma',
    assignedToAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'Senior Full Stack Developer',
    estimatedHours: 8,
    hoursLogged: 4.5,
    hoursLoggedText: '04h 30m',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['Backend', 'MongoDB'],
    timerRunning: true,
    timerSeconds: 4320
  },
  {
    _id: 'tsk_002',
    taskCode: 'ERP-2',
    title: 'JWT Auth Middleware & Refresh Token Rotation',
    category: 'Web Development',
    projectId: 'prj_001',
    projectName: 'Enterprise ERP Core Pipeline',
    projectCode: 'ERP',
    startDate: getOffsetDate(0),
    dueDate: getOffsetDate(0),
    hasNoDueDate: false,
    description: 'Implement secure HTTP-only cookie JWT auth middleware and token refresh endpoints.',
    priority: 'urgent',
    status: 'incomplete',
    assignedToId: 'emp_003',
    assignedToName: 'Rahul Verma',
    assignedToAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'Senior Full Stack Developer',
    estimatedHours: 6,
    hoursLogged: 1.5,
    hoursLoggedText: '01h 30m',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['Security', 'API'],
    timerRunning: false,
    timerSeconds: 0
  },
  {
    _id: 'tsk_003',
    taskCode: 'ERP-3',
    title: 'Audit Logging Framework & Activity Streams',
    category: 'Web Development',
    projectId: 'prj_001',
    projectName: 'Enterprise ERP Core Pipeline',
    projectCode: 'ERP',
    startDate: getOffsetDate(-1),
    dueDate: getOffsetDate(0),
    hasNoDueDate: false,
    description: 'Persist system-wide audit logs with actor IDs, IP tracking, and change diffs.',
    priority: 'medium',
    status: 'completed',
    completedOn: getOffsetDate(0),
    assignedToId: 'emp_003',
    assignedToName: 'Rahul Verma',
    assignedToAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'Senior Full Stack Developer',
    estimatedHours: 5,
    hoursLogged: 5,
    hoursLoggedText: '05h 00m',
    isPrivate: false,
    isBillable: true,
    labels: ['Audit', 'Core'],
    timerRunning: false,
    timerSeconds: 0
  },

  // ── UI/UX Design ──
  {
    _id: 'tsk_004',
    taskCode: 'DES-1',
    title: 'Design System Token Definition & Glassmorphism UI Kit',
    category: 'UI/UX Design',
    projectId: 'prj_002',
    projectName: 'Novainfinity Brand Revamp & Design System',
    projectCode: 'DES',
    startDate: getOffsetDate(-3),
    dueDate: getOffsetDate(2),
    hasNoDueDate: false,
    description: 'Create harmonious HSL color palette, typography scales, glassmorphism card elevation tokens.',
    priority: 'high',
    status: 'in_progress',
    assignedToId: 'emp_002',
    assignedToName: 'Priya Sharma',
    assignedToAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'Lead UI/UX Designer',
    estimatedHours: 16,
    hoursLogged: 12,
    hoursLoggedText: '12h 00m',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['Figma', 'UI Kit'],
    timerRunning: true,
    timerSeconds: 3600
  },
  {
    _id: 'tsk_005',
    taskCode: 'DES-2',
    title: 'Interactive Figma Prototype for Leads CRM Funnel',
    category: 'UI/UX Design',
    projectId: 'prj_002',
    projectName: 'Novainfinity Brand Revamp & Design System',
    projectCode: 'DES',
    startDate: getOffsetDate(0),
    dueDate: getOffsetDate(0),
    hasNoDueDate: false,
    description: 'Build high-fidelity click-through interactive prototype for sales lead management flow.',
    priority: 'medium',
    status: 'incomplete',
    assignedToId: 'emp_002',
    assignedToName: 'Priya Sharma',
    assignedToAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'Lead UI/UX Designer',
    estimatedHours: 6,
    hoursLogged: 0,
    hoursLoggedText: '00:00:00',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['Figma', 'CRM'],
    timerRunning: false,
    timerSeconds: 0
  },
  {
    _id: 'tsk_006',
    taskCode: 'DES-3',
    title: 'Dark Mode Contrast Audit & Accessibility Pass (WCAG AA)',
    category: 'UI/UX Design',
    projectId: 'prj_002',
    projectName: 'Novainfinity Brand Revamp & Design System',
    projectCode: 'DES',
    startDate: getOffsetDate(-2),
    dueDate: getOffsetDate(-1),
    hasNoDueDate: false,
    description: 'Ensure all primary buttons and typography pass WCAG AA 4.5:1 contrast standards in dark theme.',
    priority: 'medium',
    status: 'completed',
    completedOn: getOffsetDate(0),
    assignedToId: 'emp_002',
    assignedToName: 'Priya Sharma',
    assignedToAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'Lead UI/UX Designer',
    estimatedHours: 4,
    hoursLogged: 4,
    hoursLoggedText: '04h 00m',
    isPrivate: false,
    isBillable: true,
    labels: ['Accessibility', 'A11y'],
    timerRunning: false,
    timerSeconds: 0
  },

  // ── Infrastructure & DevOps ──
  {
    _id: 'tsk_007',
    taskCode: 'INF-1',
    title: 'Docker Swarm & SSL Certificate Automation',
    category: 'Infrastructure',
    projectId: 'prj_003',
    projectName: 'Cloud Infrastructure & High Availability Migration',
    projectCode: 'INF',
    startDate: getOffsetDate(-2),
    dueDate: getOffsetDate(3),
    hasNoDueDate: false,
    description: 'Setup automated certbot SSL renewals, reverse proxy caching, and Docker swarm replica health checks.',
    priority: 'high',
    status: 'in_progress',
    assignedToId: 'emp_005',
    assignedToName: 'Amit Kumar',
    assignedToAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'DevOps & Cloud Engineer',
    estimatedHours: 12,
    hoursLogged: 6,
    hoursLoggedText: '06h 00m',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['Docker', 'DevOps'],
    timerRunning: false,
    timerSeconds: 0
  },
  {
    _id: 'tsk_008',
    taskCode: 'INF-2',
    title: 'Production Database Automatic Backups to AWS S3',
    category: 'Infrastructure',
    projectId: 'prj_003',
    projectName: 'Cloud Infrastructure & High Availability Migration',
    projectCode: 'INF',
    startDate: getOffsetDate(-1),
    dueDate: getOffsetDate(0),
    hasNoDueDate: false,
    description: 'Automate daily encrypted mongodump cron jobs with lifecycle retention rules in AWS S3 bucket.',
    priority: 'urgent',
    status: 'incomplete',
    assignedToId: 'emp_005',
    assignedToName: 'Amit Kumar',
    assignedToAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'DevOps & Cloud Engineer',
    estimatedHours: 4,
    hoursLogged: 0,
    hoursLoggedText: '00:00:00',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['Backup', 'AWS'],
    timerRunning: false,
    timerSeconds: 0
  },

  // ── Digital Marketing & SEO ──
  {
    _id: 'tsk_009',
    taskCode: 'MKT-1',
    title: 'Q4 SEO Strategy & High DA Backlink Citation Campaign',
    category: 'Digital Marketing',
    projectId: 'prj_004',
    projectName: 'Digital Marketing Growth Engine',
    projectCode: 'MKT',
    startDate: getOffsetDate(-7),
    dueDate: getOffsetDate(-2),
    hasNoDueDate: false,
    description: 'Execute high DA bookmarking submissions and niche directory citation links for Q4 product launch.',
    priority: 'urgent',
    status: 'incomplete',
    assignedToId: 'emp_006',
    assignedToName: 'Neha Gupta',
    assignedToAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'Frontend React Developer',
    estimatedHours: 10,
    hoursLogged: 4,
    hoursLoggedText: '04h 00m',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['SEO', 'Backlinks'],
    timerRunning: false,
    timerSeconds: 0
  },
  {
    _id: 'tsk_010',
    taskCode: 'MKT-2',
    title: 'Google Analytics 4 Enhanced Ecommerce Conversion Tracking',
    category: 'Digital Marketing',
    projectId: 'prj_004',
    projectName: 'Digital Marketing Growth Engine',
    projectCode: 'MKT',
    startDate: getOffsetDate(-1),
    dueDate: getOffsetDate(1),
    hasNoDueDate: false,
    description: 'Configure GA4 event parameters, funnel step tracking, and Google Tag Manager triggers.',
    priority: 'medium',
    status: 'in_progress',
    assignedToId: 'emp_006',
    assignedToName: 'Neha Gupta',
    assignedToAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'Frontend React Developer',
    estimatedHours: 6,
    hoursLogged: 3,
    hoursLoggedText: '03h 00m',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['Analytics', 'GTM'],
    timerRunning: false,
    timerSeconds: 0
  },

  // ── HR & Operations ──
  {
    _id: 'tsk_011',
    taskCode: 'OPS-1',
    title: 'Quarterly Performance Review Matrix & KPI Rollout',
    category: 'HR & Operations',
    projectId: 'prj_001',
    projectName: 'Enterprise ERP Core Pipeline',
    projectCode: 'OPS',
    startDate: getOffsetDate(-4),
    dueDate: getOffsetDate(0),
    hasNoDueDate: false,
    description: 'Review departmental milestone deliverables and formulate 360-degree feedback appraisal sheets.',
    priority: 'high',
    status: 'in_progress',
    assignedToId: 'emp_004',
    assignedToName: 'Sneha Patel',
    assignedToAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'HR & Operations Lead',
    estimatedHours: 12,
    hoursLogged: 9,
    hoursLoggedText: '09h 00m',
    completedOn: null,
    isPrivate: false,
    isBillable: false,
    labels: ['HR', 'Appraisal'],
    timerRunning: false,
    timerSeconds: 0
  },
  {
    _id: 'tsk_012',
    taskCode: 'OPS-2',
    title: 'New Employee Onboarding Verification & Compliance Docs',
    category: 'HR & Operations',
    projectId: 'prj_001',
    projectName: 'Enterprise ERP Core Pipeline',
    projectCode: 'OPS',
    startDate: getOffsetDate(-1),
    dueDate: getOffsetDate(0),
    hasNoDueDate: false,
    description: 'Verify identity documents, background checks, and generate official offer confirmation letters.',
    priority: 'medium',
    status: 'completed',
    completedOn: getOffsetDate(0),
    assignedToId: 'emp_004',
    assignedToName: 'Sneha Patel',
    assignedToAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'HR & Operations Lead',
    estimatedHours: 4,
    hoursLogged: 4,
    hoursLoggedText: '04h 00m',
    isPrivate: false,
    isBillable: false,
    labels: ['Compliance', 'Onboarding'],
    timerRunning: false,
    timerSeconds: 0
  },

  // ── QA & Automation ──
  {
    _id: 'tsk_013',
    taskCode: 'QA-1',
    title: 'End-to-End Cypress Integration Test Suite for Punch Clock',
    category: 'QA & Automation',
    projectId: 'prj_001',
    projectName: 'Enterprise ERP Core Pipeline',
    projectCode: 'QA',
    startDate: getOffsetDate(-2),
    dueDate: getOffsetDate(2),
    hasNoDueDate: false,
    description: 'Write automated regression test scenarios for shift clock in, tea/lunch breaks, and admin overrides.',
    priority: 'high',
    status: 'in_progress',
    assignedToId: 'emp_007',
    assignedToName: 'Vikram Malhotra',
    assignedToAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
    assignedToRole: 'QA & Automation Specialist',
    estimatedHours: 14,
    hoursLogged: 8,
    hoursLoggedText: '08h 00m',
    completedOn: null,
    isPrivate: false,
    isBillable: true,
    labels: ['Testing', 'Cypress'],
    timerRunning: false,
    timerSeconds: 0
  }
];

export const INITIAL_TIMESHEETS = [
  {
    _id: 'time_001',
    taskId: 'tsk_001',
    taskCode: 'CPC-0',
    taskTitle: 'Bookmarking 20',
    projectId: 'prj_001',
    projectName: 'CITY PRIME CARE',
    employeeId: 'emp_001',
    employeeName: 'Aarav Patel',
    employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    employeeRole: 'Digital Marketing Strategic',
    date: '2026-09-25',
    startTime: '09:30:00',
    endTime: '11:30:00',
    totalDurationSeconds: 7200,
    totalDurationText: '02:00:00',
    memo: 'Executing citation bookmarks and niche directory submissions',
    status: 'stopped'
  },
  {
    _id: 'time_002',
    taskId: 'tsk_002',
    taskCode: 'NBR-1',
    taskTitle: 'Design System Token Definition & UI Kit',
    projectId: 'prj_002',
    projectName: 'Novainfinity Brand Revamp & Design System',
    employeeId: 'emp_002',
    employeeName: 'Priya Sharma',
    employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    employeeRole: 'Lead UI/UX Designer',
    date: '2026-09-24',
    startTime: '10:00:00',
    endTime: '15:30:00',
    totalDurationSeconds: 19800,
    totalDurationText: '05h 30m',
    memo: 'Color contrast ratios and accessible interactive states',
    status: 'stopped'
  },
  {
    _id: 'time_003',
    taskId: 'tsk_003',
    taskCode: 'ERP-2',
    taskTitle: 'MongoDB Atlas Cloud Cluster Connection & Schema Seeder',
    projectId: 'prj_003',
    projectName: 'Enterprise ERP Core Pipeline',
    employeeId: 'emp_003',
    employeeName: 'Rahul Verma',
    employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    employeeRole: 'Senior Full Stack Developer',
    date: '2026-09-22',
    startTime: '09:00:00',
    endTime: '17:00:00',
    totalDurationSeconds: 28800,
    totalDurationText: '08h 00m',
    memo: 'Created Mongoose schemas, controllers, and seeded Atlas database',
    status: 'approved'
  }
];

// ===========================================================================
// 💰 FINANCE & EXPENSES DATA (Admin & Employee Expense Records)
// ===========================================================================

export const INITIAL_EXPENSES = [
  {
    _id: 'exp_001',
    idNumber: 1,
    expenseCode: 'EXP-101',
    itemName: 'AWS Cloud Hosting & Kubernetes Cluster Dedicated Node',
    price: 45000,
    amount: 45000,
    category: 'Cloud Infrastructure',
    purchasedFrom: 'Amazon Web Services Inc',
    purchaseDate: '2026-09-15',
    date: '2026-09-15',
    employeeId: 'emp_005',
    employeeName: 'Amit Kumar',
    employeeAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    paidBy: 'Amit Kumar',
    status: 'approved',
    description: 'Monthly production cluster compute scaling and high-availability database replication tier.',
    billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
    createdById: 'emp_005',
    createdByName: 'Amit Kumar',
    createdAt: '2026-09-15T10:00:00Z'
  },
  {
    _id: 'exp_002',
    idNumber: 2,
    expenseCode: 'EXP-102',
    itemName: 'Figma Enterprise Organization 10-Seat Annual License',
    price: 32000,
    amount: 32000,
    category: 'Software & Tools',
    purchasedFrom: 'Figma Inc',
    purchaseDate: '2026-09-18',
    date: '2026-09-18',
    employeeId: 'emp_002',
    employeeName: 'Priya Sharma',
    employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    paidBy: 'Priya Sharma',
    status: 'approved',
    description: 'Annual design subscription for UI/UX design tokens and collaborative design library.',
    billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
    createdById: 'emp_002',
    createdByName: 'Priya Sharma',
    createdAt: '2026-09-18T11:30:00Z'
  },
  {
    _id: 'exp_003',
    idNumber: 3,
    expenseCode: 'EXP-103',
    itemName: 'Apple Mac Mini M2 Pro Developer Workstation',
    price: 128000,
    amount: 128000,
    category: 'Hardware & Devices',
    purchasedFrom: 'Apple Store India',
    purchaseDate: '2026-09-22',
    date: '2026-09-22',
    employeeId: 'emp_003',
    employeeName: 'Rahul Verma',
    employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    paidBy: 'Rahul Verma',
    status: 'pending',
    description: 'Hardware upgrade for mobile app compilation, Docker simulations, and automated unit testing pipeline.',
    billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
    createdById: 'emp_003',
    createdByName: 'Rahul Verma',
    createdAt: '2026-09-22T14:15:00Z'
  },
  {
    _id: 'exp_004',
    idNumber: 4,
    expenseCode: 'EXP-104',
    itemName: 'Google Workspace Enterprise Plus Annual Subscription',
    price: 54000,
    amount: 54000,
    category: 'Software & Tools',
    purchasedFrom: 'Google Cloud India',
    purchaseDate: '2026-09-24',
    date: '2026-09-24',
    employeeId: 'emp_001',
    employeeName: 'Aarav Patel',
    employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    paidBy: 'Aarav Patel',
    status: 'approved',
    description: 'Corporate email hosting, 5TB drive storage per employee, and Meet enterprise recordings.',
    billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
    createdById: 'emp_001',
    createdByName: 'Aarav Patel',
    createdAt: '2026-09-24T09:45:00Z'
  },
  {
    _id: 'exp_005',
    idNumber: 5,
    expenseCode: 'EXP-105',
    itemName: 'Office High-Speed Optical Fiber Leased Line (Q3)',
    price: 18500,
    amount: 18500,
    category: 'Utilities & Office',
    purchasedFrom: 'Airtel Business Telecommunications',
    purchaseDate: '2026-09-25',
    date: '2026-09-25',
    employeeId: 'emp_004',
    employeeName: 'Sneha Patel',
    employeeAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
    paidBy: 'Sneha Patel',
    status: 'approved',
    description: '1 Gbps Dedicated symmetric internet connection with 99.9% uptime SLA guarantee.',
    billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
    createdById: 'emp_004',
    createdByName: 'Sneha Patel',
    createdAt: '2026-09-25T12:00:00Z'
  },
  {
    _id: 'exp_006',
    idNumber: 6,
    expenseCode: 'EXP-106',
    itemName: 'Team Annual Celebration & Catering Buffet Lunch',
    price: 24500,
    amount: 24500,
    category: 'Team & Events',
    purchasedFrom: 'Grand Imperial Banquets',
    purchaseDate: '2026-09-26',
    date: '2026-09-26',
    employeeId: 'emp_004',
    employeeName: 'Sneha Patel',
    employeeAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
    paidBy: 'Sneha Patel',
    status: 'pending',
    description: 'Catering and refreshment arrangement for all 35 team members during Q3 milestone celebration.',
    billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
    createdById: 'emp_004',
    createdByName: 'Sneha Patel',
    createdAt: '2026-09-26T16:20:00Z'
  }
];

// ===========================================================================
// 🎫 TICKETS, NOTICES, EVENTS & SOCIAL CRM DATA
// ===========================================================================

export const INITIAL_TICKETS = [
  {
    _id: 'tkt_001',
    ticketCode: 'TKT-1041',
    subject: 'VPN Access request for staging Kubernetes cluster',
    category: 'IT & Infrastructure',
    priority: 'high',
    description: 'Need secure wireguard VPN credentials for testing new microservices build on cloud cluster.',
    status: 'in_progress',
    requestedById: 'emp_001',
    requestedByName: 'Aarav Patel',
    requestedByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    assignedToId: 'emp_005',
    assignedToName: 'Amit Kumar',
    requestedOn: '2026-09-24',
    createdAt: '2026-09-24T11:20:00Z',
    replies: [
      {
        id: 'rep_1',
        senderId: 'emp_005',
        senderName: 'Amit Kumar (Admin / DevOps)',
        senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
        message: 'Hello Aarav, your VPN profile has been generated. Please check your corporate inbox for the Wireguard config file.',
        timestamp: '2026-09-24T14:30:00Z',
        isAdminReply: true
      },
      {
        id: 'rep_2',
        senderId: 'emp_001',
        senderName: 'Aarav Patel',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        message: 'Received the config! Testing connection now. Thank you Amit!',
        timestamp: '2026-09-24T15:10:00Z',
        isAdminReply: false
      }
    ],
    internalNotes: [
      {
        id: 'note_1',
        author: 'Amit Kumar',
        text: 'Assigned static IP 10.8.0.45 with restricted VPC route to staging cluster only.',
        date: '2026-09-24T14:25:00Z'
      }
    ]
  },
  {
    _id: 'tkt_002',
    ticketCode: 'TKT-1042',
    subject: 'Figma Enterprise workspace seat allocation',
    category: 'Design Tools',
    priority: 'medium',
    description: 'Requesting Figma editor license upgrade for Q4 design sprint deliverables.',
    status: 'resolved',
    requestedById: 'emp_002',
    requestedByName: 'Priya Sharma',
    requestedByAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    assignedToId: 'emp_004',
    assignedToName: 'Sneha Patel',
    requestedOn: '2026-09-20',
    createdAt: '2026-09-20T09:15:00Z',
    replies: [
      {
        id: 'rep_3',
        senderId: 'emp_004',
        senderName: 'Sneha Patel (Admin / HR)',
        senderAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
        message: 'Hi Priya, your Figma Enterprise editor seat has been approved and activated.',
        timestamp: '2026-09-20T11:00:00Z',
        isAdminReply: true
      }
    ],
    internalNotes: []
  },
  {
    _id: 'tkt_003',
    ticketCode: 'TKT-1043',
    subject: 'Ergonomic Chair Replacement for Desk 14',
    category: 'Office & Facilities',
    priority: 'low',
    description: 'The hydraulic cylinder of desk chair 14 is slipping down during work hours.',
    status: 'open',
    requestedById: 'emp_003',
    requestedByName: 'Rahul Verma',
    requestedByAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    assignedToId: 'emp_004',
    assignedToName: 'Sneha Patel',
    requestedOn: '2026-09-25',
    createdAt: '2026-09-25T10:45:00Z',
    replies: [],
    internalNotes: []
  },
  {
    _id: 'tkt_004',
    ticketCode: 'TKT-1044',
    subject: 'Production Server CPU Spike Investigation',
    category: 'Urgent Tech Support',
    priority: 'urgent',
    description: 'Noticed 92% CPU load on Redis caching worker between 02:00 PM and 02:45 PM.',
    status: 'pending',
    requestedById: 'emp_001',
    requestedByName: 'Aarav Patel',
    requestedByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    assignedToId: 'emp_005',
    assignedToName: 'Amit Kumar',
    requestedOn: '2026-09-25',
    createdAt: '2026-09-25T14:50:00Z',
    replies: [
      {
        id: 'rep_4',
        senderId: 'emp_005',
        senderName: 'Amit Kumar (Admin / DevOps)',
        senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
        message: 'Investigating Redis cluster eviction logs. Enabling auto-scaling threshold at 80% to prevent throttling.',
        timestamp: '2026-09-25T15:05:00Z',
        isAdminReply: true
      }
    ],
    internalNotes: []
  }
];

export const INITIAL_NOTICES = [
  {
    _id: 'not_001',
    title: 'Company Holiday: Gandhi Jayanti on Friday, Oct 2nd',
    description: 'All corporate offices will remain closed in observance of Gandhi Jayanti. Emergency server support will be active.',
    shortDescription: 'All corporate offices will remain closed in observance of Gandhi Jayanti. Emergency server support will be active.',
    category: 'Holiday Announcement',
    priority: 'high',
    targetAudience: 'All Employees',
    to: 'All Employees',
    postedBy: 'Sneha Patel (HR Lead)',
    createdBy: 'Sneha Patel',
    date: '2026-09-25',
    expiryDate: '2026-10-03',
    isImportant: true,
    fullContent: 'Dear Team,\n\nPlease note that Friday, 2nd October 2026 will be observed as a mandatory national holiday for Gandhi Jayanti. All offices will remain closed.\n\nEnjoy the long weekend!'
  },
  {
    _id: 'not_002',
    title: 'Q4 Enterprise All-Hands & Strategy Townhall',
    description: 'Join us this Thursday at 4:00 PM for the quarterly product roadmap presentation and high-performer recognitions.',
    shortDescription: 'Join us this Thursday at 4:00 PM for the quarterly product roadmap presentation and high-performer recognitions.',
    category: 'Company Event',
    priority: 'urgent',
    targetAudience: 'All Employees',
    to: 'All Employees',
    postedBy: 'Executive Team',
    createdBy: 'Executive Team',
    date: '2026-09-23',
    expiryDate: '2026-10-15',
    isImportant: true,
    fullContent: 'Team Novainfinity,\n\nWe will be conducting our Q4 Strategy Townhall via live video stream. Please ensure all ongoing client tasks are updated before the meeting.'
  },
  {
    _id: 'not_003',
    title: 'Updated Health & Wellness Reimbursement Policy',
    description: 'Employees can now claim monthly fitness, gym, and medical benefits directly via the HR portal.',
    shortDescription: 'Employees can now claim monthly fitness, gym, and medical benefits directly via the HR portal.',
    category: 'Policy Update',
    priority: 'medium',
    targetAudience: 'All Employees',
    to: 'All Employees',
    postedBy: 'HR Operations',
    createdBy: 'HR Operations',
    date: '2026-09-18',
    expiryDate: '2026-12-31',
    isImportant: false,
    fullContent: 'Effective September 2026, employee wellness benefits have been enhanced with comprehensive outpatient insurance coverage.'
  }
];

export const INITIAL_BIRTHDAYS = [
  {
    _id: 'bday_001',
    name: 'Aarav Patel',
    role: 'Digital Marketing Strategic',
    department: 'Marketing & Growth',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    birthdayDate: '15 Oct',
    dob: '1995-10-15',
    daysRemainingText: '7 days remaining'
  },
  {
    _id: 'bday_002',
    name: 'Priya Sharma',
    role: 'Lead UI/UX Designer',
    department: 'Product Design',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    birthdayDate: '14 Oct',
    dob: '1996-10-14',
    daysRemainingText: '6 days remaining'
  },
  {
    _id: 'bday_003',
    name: 'Rahul Verma',
    role: 'Senior Full Stack Developer',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    birthdayDate: '20 Nov',
    dob: '1994-11-20',
    daysRemainingText: '1 month after'
  }
];

export const INITIAL_WFH_EMPLOYEES = [
  { id: 'wfh_1', name: 'Simran Kaur', role: 'Senior Developer', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
  { id: 'wfh_2', name: 'Devyansh Sharma', role: 'Developer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
  { id: 'wfh_3', name: 'Mr Jitendra', role: 'Developer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
  { id: 'wfh_4', name: 'Miss Aashika Kaushik', role: 'Developer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
  { id: 'wfh_5', name: 'Devendra Singh', role: 'Developer', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
  { id: 'wfh_6', name: 'Abhay Tyagi', role: 'Developer', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100' },
  { id: 'wfh_7', name: 'Miss Megha', role: 'Digital Marketing Strategist', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' },
  { id: 'wfh_8', name: 'Md Tausif', role: 'Developer', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100' },
  { id: 'wfh_9', name: 'Aarav Patel', role: 'Digital Marketing Strategist', isCurrentUser: false, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }
];

export const INITIAL_WEEKLY_TIMELOGS = [
  { day: 'Monday', shortDay: 'Mo', date: '2026-10-12', durationText: '9h 00m', durationHours: 9.0, loginTime: '10:00 AM', logoutTime: '07:00 PM', breakDuration: '45m', isCompleted: true },
  { day: 'Tuesday', shortDay: 'Tu', date: '2026-10-13', durationText: '8h 30m', durationHours: 8.5, loginTime: '10:05 AM', logoutTime: '06:45 PM', breakDuration: '50m', isCompleted: true },
  { day: 'Wednesday', shortDay: 'We', date: '2026-10-14', durationText: '9h 15m', durationHours: 9.25, loginTime: '10:00 AM', logoutTime: '07:20 PM', breakDuration: '40m', isCompleted: true },
  { day: 'Thursday', shortDay: 'Th', date: '2026-10-15', durationText: '9h 00m', durationHours: 9.0, loginTime: '09:55 AM', logoutTime: '07:05 PM', breakDuration: '45m', isCompleted: true },
  { day: 'Friday', shortDay: 'Fr', date: '2026-10-16', durationText: '8h 45m', durationHours: 8.75, loginTime: '10:00 AM', logoutTime: '06:55 PM', breakDuration: '40m', isCompleted: true },
  { day: 'Saturday', shortDay: 'Sa', date: '2026-10-17', durationText: '5h 00m', durationHours: 5.0, loginTime: '10:00 AM', logoutTime: '03:00 PM', breakDuration: '20m', isCompleted: true },
  { day: 'Sunday', shortDay: 'Su', date: '2026-10-18', durationText: '0h 00m', durationHours: 0, loginTime: 'Off', logoutTime: 'Off', breakDuration: '0m', isDayOff: true }
];

export const INITIAL_EVENTS = [
  {
    _id: 'ev_001',
    eventName: 'Ganesh Chaturthi Celebration 🪔',
    title: 'Ganesh Chaturthi Celebration 🪔',
    eventType: 'Festival',
    type: 'festival',
    color: '#ea580c',
    bgColor: '#ffedd5',
    startDate: '2026-09-14',
    endDate: '2026-09-14',
    date: '2026-09-14',
    startTime: '10:00 AM',
    time: '10:00 AM',
    location: 'Corporate Main Lobby & Virtual Stream',
    description: 'Traditional Ganesh Pooja, Prasad distribution, and festive celebration.',
    isRecurring: true
  },
  {
    _id: 'ev_002',
    eventName: 'Sprint Review & Engineering Demo 🚀',
    title: 'Sprint Review & Engineering Demo 🚀',
    eventType: 'Meeting',
    type: 'meeting',
    color: '#2563eb',
    bgColor: '#eff6ff',
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    date: '2026-09-25',
    startTime: '04:00 PM',
    time: '04:00 PM',
    location: 'Conference Room Alpha & Google Meet',
    description: 'Weekly team engineering sync & sprint demo showcase.'
  },
  {
    _id: 'ev_003',
    eventName: 'Gandhi Jayanti',
    title: 'Gandhi Jayanti',
    eventType: 'Holiday',
    type: 'holiday',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    startDate: '2026-10-02',
    endDate: '2026-10-02',
    date: '2026-10-02',
    startTime: 'All Day',
    time: 'All Day',
    location: 'All Office Locations',
    description: 'National Public Holiday',
    isRecurring: true
  },
  {
    _id: 'ev_004',
    eventName: 'Dussehra (Vijayadashami) 🪔',
    title: 'Dussehra (Vijayadashami) 🪔',
    eventType: 'Festival',
    type: 'festival',
    color: '#ea580c',
    bgColor: '#ffedd5',
    startDate: '2026-10-20',
    endDate: '2026-10-20',
    date: '2026-10-20',
    startTime: 'All Day',
    time: 'All Day',
    location: 'Corporate Holiday',
    description: 'Auspicious festival of victory of good over evil.',
    isRecurring: true
  },
  {
    _id: 'ev_005',
    eventName: 'Diwali Festive Gala & Rangoli Competition 🪔✨',
    title: 'Diwali Festive Gala & Rangoli Competition 🪔✨',
    eventType: 'Festival',
    type: 'festival',
    color: '#d97706',
    bgColor: '#fef3c7',
    startDate: '2026-11-08',
    endDate: '2026-11-10',
    date: '2026-11-08',
    startTime: '03:00 PM',
    time: '03:00 PM',
    location: 'HQ Campus & All Branches',
    description: 'Grand Diwali celebration, traditional attire day, sweets gift hampers, and annual party!',
    isRecurring: true
  },
  {
    _id: 'ev_006',
    eventName: 'Company Annual Hackathon 2026 💻',
    title: 'Company Annual Hackathon 2026 💻',
    eventType: 'Company Event',
    type: 'company_event',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    startDate: '2026-11-25',
    endDate: '2026-11-27',
    date: '2026-11-25',
    startTime: '09:00 AM',
    time: '09:00 AM',
    location: 'Innovation Hub & Remote Discord Server',
    description: '48-hour internal innovation hackathon with ₹5,00,000 in prizes for top AI solutions.',
    isRecurring: true
  },
  {
    _id: 'ev_007',
    eventName: 'New Year 2027 Corporate Kickoff 🎆',
    title: 'New Year 2027 Corporate Kickoff 🎆',
    eventType: 'Company Event',
    type: 'company_event',
    color: '#0891b2',
    bgColor: '#ecfeff',
    startDate: '2027-01-01',
    endDate: '2027-01-01',
    date: '2027-01-01',
    startTime: 'All Day',
    time: 'All Day',
    location: 'Company Wide',
    description: 'New Year celebration and company roadmap kickoff.',
    isRecurring: true
  }
];

// ===========================================================================
// 💬 MESSAGES & TEAM CHAT DATA
// ===========================================================================

export const INITIAL_CONVERSATIONS = [
  {
    id: 'conv_1',
    participantId: 'emp_002',
    participantName: 'Priya Sharma',
    participantRole: 'Lead UI/UX Designer',
    participantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    isOnline: true,
    lastMessage: 'I have updated the design tokens in Figma for the Leads dashboard.',
    lastMessageTime: '10:45 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg_1',
        senderId: 'emp_002',
        senderName: 'Priya Sharma',
        text: 'Hi Aarav, did you get a chance to check the new CRM color palette?',
        timestamp: '10:30 AM',
        isOutgoing: false
      },
      {
        id: 'msg_2',
        senderId: 'emp_001',
        senderName: 'Aarav Patel',
        text: 'Yes Priya! The slate blue and vibrant emerald accents look super sharp and premium.',
        timestamp: '10:38 AM',
        isOutgoing: true
      },
      {
        id: 'msg_3',
        senderId: 'emp_002',
        senderName: 'Priya Sharma',
        text: 'I have updated the design tokens in Figma for the Leads dashboard.',
        timestamp: '10:45 AM',
        isOutgoing: false
      }
    ]
  },
  {
    id: 'conv_2',
    participantId: 'emp_003',
    participantName: 'Rahul Verma',
    participantRole: 'Senior Full Stack Developer',
    participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    isOnline: true,
    lastMessage: 'The Redis cluster latency dropped by 40% after indexing.',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_4',
        senderId: 'emp_003',
        senderName: 'Rahul Verma',
        text: 'Hey Aarav, testing the new database schemas on localhost.',
        timestamp: 'Yesterday 04:15 PM',
        isOutgoing: false
      },
      {
        id: 'msg_5',
        senderId: 'emp_001',
        senderName: 'Aarav Patel',
        text: 'Awesome Rahul, let me know once the API benchmarks are ready.',
        timestamp: 'Yesterday 04:20 PM',
        isOutgoing: true
      },
      {
        id: 'msg_6',
        senderId: 'emp_003',
        senderName: 'Rahul Verma',
        text: 'The Redis cluster latency dropped by 40% after indexing.',
        timestamp: 'Yesterday 05:10 PM',
        isOutgoing: false
      }
    ]
  },
  {
    id: 'conv_3',
    participantId: 'emp_004',
    participantName: 'Sneha Patel',
    participantRole: 'HR & Operations Lead',
    participantAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
    isOnline: false,
    lastMessage: 'Please submit your September monthly expense bills before the 30th.',
    lastMessageTime: '23 Sep',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_7',
        senderId: 'emp_004',
        senderName: 'Sneha Patel',
        text: 'Please submit your September monthly expense bills before the 30th.',
        timestamp: '23 Sep 11:00 AM',
        isOutgoing: false
      }
    ]
  },
  {
    id: 'conv_4',
    participantId: 'emp_005',
    participantName: 'Amit Kumar',
    participantRole: 'DevOps & Cloud Engineer',
    participantAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    isOnline: true,
    lastMessage: 'Wireguard VPN profile is generated and verified.',
    lastMessageTime: '24 Sep',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_8',
        senderId: 'emp_005',
        senderName: 'Amit Kumar',
        text: 'Wireguard VPN profile is generated and verified.',
        timestamp: '24 Sep 03:00 PM',
        isOutgoing: false
      }
    ]
  }
];

export const INITIAL_LEADS = [
  {
    _id: 'lead_012',
    idNumber: 12,
    leadCode: 'LEAD-1012',
    name: 'Uli Kuenzel',
    contactPerson: 'Uli Kuenzel',
    companyName: 'Kuenzel Digital GmbH',
    client: 'Kuenzel Digital',
    email: 'uli.kuenzel@kuenzel-digital.de',
    phone: '+49 170 555 4321',
    leadType: 'Enterprise',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-20',
    createdDate: '09-12-2026',
    status: 'in_progress', // 'new', 'active', 'in_progress', 'negotiation', 'converted', 'lost'
    priority: 'high',
    dealValue: 750000,
    leadSource: 'Website Inquiry',
    notes: 'High-intent enterprise lead looking for complete ERP & HRMS automation architecture.',
    createdAt: '2026-09-12T09:30:00.000Z'
  },
  {
    _id: 'lead_011',
    idNumber: 11,
    leadCode: 'LEAD-1011',
    name: 'Abdullah Khawaja',
    contactPerson: 'Abdullah Khawaja',
    companyName: 'Khawaja Fintech Global',
    client: 'Khawaja Group',
    email: 'a.khawaja@fintechglobal.ae',
    phone: '+971 50 123 4567',
    leadType: 'Inbound Web',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-18',
    createdDate: '09-12-2026',
    status: 'active',
    priority: 'medium',
    dealValue: 520000,
    leadSource: 'LinkedIn Campaign',
    notes: 'Requested product demo for multi-currency payment integration module.',
    createdAt: '2026-09-12T10:15:00.000Z'
  },
  {
    _id: 'lead_010',
    idNumber: 10,
    leadCode: 'LEAD-1010',
    name: 'Suki S. Hyperlink Founder',
    contactPerson: 'Suki S.',
    companyName: 'Hyperlink AI Systems',
    client: 'Hyperlink AI',
    email: 'support@suki.ai',
    phone: '+1 (415) 890-1200',
    leadType: 'Referral',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-25',
    createdDate: '09-12-2026',
    status: 'negotiation',
    priority: 'urgent',
    dealValue: 1200000,
    leadSource: 'Executive Referral',
    notes: 'Proposal sent for AI-driven workflow copilots across all employee workstations.',
    createdAt: '2026-09-12T11:00:00.000Z'
  },
  {
    _id: 'lead_009',
    idNumber: 9,
    leadCode: 'LEAD-1009',
    name: 'Steven Paterson',
    contactPerson: 'Steven Paterson',
    companyName: 'Margin Syndicate Capital',
    client: 'Margin Syndicate',
    email: 'steven@marginsyndicate.com',
    phone: '+44 20 7946 0912',
    leadType: 'Outbound Sales',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-15',
    createdDate: '09-12-2026',
    status: 'new',
    priority: 'high',
    dealValue: 450000,
    leadSource: 'Cold Outreach',
    notes: 'Interested in analytics dashboard for real-time portfolio margin calculation.',
    createdAt: '2026-09-12T11:45:00.000Z'
  },
  {
    _id: 'lead_008',
    idNumber: 8,
    leadCode: 'LEAD-1008',
    name: 'Arvind Vij',
    contactPerson: 'Arvind Vij',
    companyName: 'Arthanova Capital Advisors',
    client: 'Arthanova Capital',
    email: 'arvind.vij@arthanova.com',
    phone: '+91 98201 44556',
    leadType: 'Enterprise',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-30',
    createdDate: '09-12-2026',
    status: 'converted',
    priority: 'medium',
    dealValue: 980000,
    leadSource: 'Trade Show / Conference',
    notes: 'Deal closed! Enterprise subscription signed for 50 seats with SLA tier 1.',
    createdAt: '2026-09-12T12:30:00.000Z'
  },
  {
    _id: 'lead_007',
    idNumber: 7,
    leadCode: 'LEAD-1007',
    name: 'Annanay Kapila at QFEX',
    contactPerson: 'Annanay Kapila',
    companyName: 'QFEX Trading Technologies',
    client: 'QFEX Inc',
    email: 'annanay.k@qfex.io',
    phone: '+65 6712 3344',
    leadType: 'Partner',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-22',
    createdDate: '09-12-2026',
    status: 'active',
    priority: 'high',
    dealValue: 640000,
    leadSource: 'Strategic Partnership',
    notes: 'Joint partner solution evaluating API integration for high-frequency order processing.',
    createdAt: '2026-09-12T13:10:00.000Z'
  },
  {
    _id: 'lead_006',
    idNumber: 6,
    leadCode: 'LEAD-1006',
    name: 'Matt Stover',
    contactPerson: 'Matt Stover',
    companyName: 'MG Stover Global Fund Services',
    client: 'MG Stover Group',
    email: 'matt.stover@mgstover.com',
    phone: '+1 (303) 555-0199',
    leadType: 'Enterprise',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-16',
    createdDate: '09-12-2026',
    status: 'in_progress',
    priority: 'high',
    dealValue: 880000,
    leadSource: 'Website Inquiry',
    notes: 'Comprehensive security audit & custom compliance checklist required.',
    createdAt: '2026-09-12T14:00:00.000Z'
  },
  {
    _id: 'lead_005',
    idNumber: 5,
    leadCode: 'LEAD-1005',
    name: 'Jeff Gustaveson',
    contactPerson: 'Jeff Gustaveson',
    companyName: 'Gnoesis Cloud Networks',
    client: 'Gnoesis Networks',
    email: 'jeff@gnoesis.xyz',
    phone: '+1 (206) 555-7821',
    leadType: 'Inbound Web',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-19',
    createdDate: '09-12-2026',
    status: 'active',
    priority: 'medium',
    dealValue: 320000,
    leadSource: 'Google Search Ads',
    notes: 'Evaluating cloud timesheet and project tracking tools for 25 remote engineers.',
    createdAt: '2026-09-12T14:45:00.000Z'
  },
  {
    _id: 'lead_004',
    idNumber: 4,
    leadCode: 'LEAD-1004',
    name: 'Rustam at Nitro Labs',
    contactPerson: 'Rustam Aliyev',
    companyName: 'Nitro Labs Compute',
    client: 'Nitro Labs',
    email: 'rustam@nitrolabs.io',
    phone: '+41 22 767 8900',
    leadType: 'Referral',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-14',
    createdDate: '09-12-2026',
    status: 'negotiation',
    priority: 'urgent',
    dealValue: 1450000,
    leadSource: 'Founder Network',
    notes: 'Finalizing custom contract terms for dedicated on-premise high-security deployment.',
    createdAt: '2026-09-12T15:30:00.000Z'
  },
  {
    _id: 'lead_003',
    idNumber: 3,
    leadCode: 'LEAD-1003',
    name: 'Vasily Nikonov',
    contactPerson: 'Vasily Nikonov',
    companyName: 'Nikonov Architecture Bureau',
    client: 'Nikonov Bureau',
    email: 'vasily@nikonov-tech.ru',
    phone: '+7 495 788 1234',
    leadType: 'Cold Campaign',
    leadOwnerId: 'emp_001',
    leadOwnerName: 'Mr Calvin Thomas',
    leadOwnerRole: 'Senior Marketing Director',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    createdById: 'emp_001',
    createdByName: 'Mr Calvin Thomas',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-12',
    endDate: '2026-10-12',
    createdDate: '09-12-2026',
    status: 'lost',
    priority: 'low',
    dealValue: 210000,
    leadSource: 'Email Campaign',
    notes: 'Budget constraints for current quarter; scheduled re-engagement for next financial year.',
    createdAt: '2026-09-12T16:15:00.000Z'
  },
  {
    _id: 'lead_002',
    idNumber: 2,
    leadCode: 'LEAD-1002',
    name: 'Elena Rossi',
    contactPerson: 'Elena Rossi',
    companyName: 'Milano Retail POS Solutions',
    client: 'Milano Retail',
    email: 'elena.r@milano-retail.it',
    phone: '+39 02 8899 7711',
    leadType: 'Enterprise',
    leadOwnerId: 'emp_002',
    leadOwnerName: 'Priya Sharma',
    leadOwnerRole: 'Lead UI/UX Designer',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    createdById: 'emp_001',
    createdByName: 'Aarav Patel',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-15',
    endDate: '2026-10-28',
    createdDate: '09-15-2026',
    status: 'converted',
    priority: 'high',
    dealValue: 950000,
    leadSource: 'Website Demo',
    notes: 'Closed deal for omnichannel CRM and multi-store inventory dashboard.',
    createdAt: '2026-09-15T09:00:00.000Z'
  },
  {
    _id: 'lead_001',
    idNumber: 1,
    leadCode: 'LEAD-1001',
    name: 'Vikram Malhotra',
    contactPerson: 'Vikram Malhotra',
    companyName: 'Malhotra Supply Chain Ltd',
    client: 'Malhotra Logistics',
    email: 'vikram@malhotratech.in',
    phone: '+91 99887 66554',
    leadType: 'Inbound Web',
    leadOwnerId: 'emp_003',
    leadOwnerName: 'Rahul Verma',
    leadOwnerRole: 'Senior Full Stack Developer',
    leadOwnerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    createdById: 'emp_001',
    createdByName: 'Aarav Patel',
    createdByRole: 'Senior',
    createdByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    startDate: '2026-09-18',
    endDate: '2026-10-31',
    createdDate: '09-18-2026',
    status: 'new',
    priority: 'urgent',
    dealValue: 1100000,
    leadSource: 'Web Contact Form',
    notes: 'Immediate requirement for tracking 120+ fleet drivers and delivery milestones.',
    createdAt: '2026-09-18T14:20:00.000Z'
  }
];

export const INITIAL_EMERGENCY_CONTACTS = [
  {
    _id: 'emg_001',
    name: 'Sunita Sharma',
    email: 'sunita.sharma@gmail.com',
    mobile: '+91 98765 43211',
    alternateNumber: '+91 98765 00000',
    relationship: 'Mother',
    address: 'B-402, Green Valley Apartments, Mumbai, India',
    employeeId: 'emp_001'
  },
  {
    _id: 'emg_002',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@yahoo.com',
    mobile: '+91 98765 43212',
    alternateNumber: '+91 98765 11111',
    relationship: 'Father',
    address: 'B-402, Green Valley Apartments, Mumbai, India',
    employeeId: 'emp_001'
  }
];

export const INITIAL_STICKY_NOTES = [
  {
    _id: 'note_001',
    title: 'Q4 Product Roadmap Discussion',
    content: 'Review the sprint deliverables with the UI/UX team and finalize the lead management filters by Thursday.',
    color: '#fef08a',
    isPinned: true,
    isCompleted: false,
    createdAt: '2026-09-25T10:00:00.000Z'
  },
  {
    _id: 'note_002',
    title: 'Client Demo Checklist',
    content: '1. Prepare presentation slides\n2. Verify lead pipeline analytics\n3. Export expense report for CFO',
    color: '#bfdbfe',
    isPinned: false,
    isCompleted: false,
    createdAt: '2026-09-25T11:30:00.000Z'
  },
  {
    _id: 'note_003',
    title: 'Call HR Regarding Diwali Event',
    content: 'Confirm lunch catering options and finalize gift distribution schedule for all office teams.',
    color: '#bbf7d0',
    isPinned: false,
    isCompleted: true,
    createdAt: '2026-09-24T15:20:00.000Z'
  }
];


