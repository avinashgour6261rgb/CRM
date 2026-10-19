/**
 * @file initialData.js
 * @description Clean initial dataset for production multi-tenant HRMS & CRM.
 * Contains only the Master Admin account and standard holidays.
 */

export const INITIAL_EMPLOYEES = [
  {
    _id: '6ad22399c93908b02fffebe0',
    employeeCode: 'ADM-001',
    name: 'Administrator',
    email: 'admin@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Administrator',
    systemRole: 'admin',
    department: 'Management',
    status: 'active',
    joiningDate: '2026-01-01',
    dob: '1992-05-15',
    isCurrentUser: true,
    isAdmin: true,
    isSuperAdmin: true,
    password: 'admin123',
    permissions: {
      tasks: true,
      attendance: true,
      leaves: true,
      tickets: true,
      crm: true,
      finance: true,
      directory: true,
      delegation: true
    },
    leaveBalance: { casual: 15, sick: 12, earned: 20, maternity: 0 },
    customFields: []
  },
  {
    _id: '6ad363ad24302c31848d32df',
    employeeCode: 'EMP-003',
    name: 'Janvi Hiwse',
    email: 'janvi@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    role: 'HR Specialist & Recruiter',
    systemRole: 'hr',
    department: 'Human Resources',
    status: 'active',
    joiningDate: '2024-01-01',
    dob: '1996-08-20',
    isCurrentUser: false,
    isAdmin: false,
    password: 'emp123',
    permissions: {
      tasks: true,
      attendance: true,
      leaves: true,
      tickets: true,
      crm: true,
      finance: false,
      directory: true,
      delegation: false
    },
    leaveBalance: { casual: 14, sick: 10, earned: 18, maternity: 0 },
    customFields: []
  },
  {
    _id: '6ad5b86d4cd8da54d020b12a',
    employeeCode: 'EMP-002',
    name: 'Sandeep Meena',
    email: 'sandeep@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    role: 'Team Member',
    systemRole: 'team_member',
    department: 'Engineering',
    status: 'active',
    joiningDate: '2024-01-01',
    dob: '1995-10-12',
    isCurrentUser: false,
    isAdmin: false,
    password: 'emp123',
    permissions: {
      tasks: true,
      attendance: true,
      leaves: true,
      tickets: true,
      crm: false,
      finance: false,
      directory: false,
      delegation: false
    },
    leaveBalance: { casual: 12, sick: 10, earned: 15, maternity: 0 },
    customFields: []
  }
];

export const INITIAL_LEAVES = [];

export const generateInitialAttendance = () => [];

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
    name: 'Makar Sankranti / Pongal',
    date: '2026-01-14',
    dayOfWeek: 'Wednesday',
    type: 'Gazetted Holiday',
    description: 'Traditional harvest festival honoring the Sun God',
    isRecurringYearly: false
  },
  {
    _id: 'hol_003',
    name: 'Republic Day',
    date: '2026-01-26',
    dayOfWeek: 'Monday',
    type: 'National Holiday',
    description: 'Commemorating the enactment of the Constitution of India',
    isRecurringYearly: true
  },
  {
    _id: 'hol_004',
    name: 'Maha Shivratri',
    date: '2026-02-15',
    dayOfWeek: 'Sunday',
    type: 'Gazetted Holiday',
    description: 'Solemn festival dedicated to Lord Shiva',
    isRecurringYearly: false
  },
  {
    _id: 'hol_005',
    name: 'Holi (Festival of Colours)',
    date: '2026-03-04',
    dayOfWeek: 'Wednesday',
    type: 'Gazetted Holiday',
    description: 'Vibrant spring festival symbolizing joy, love, and victory of good',
    isRecurringYearly: false
  },
  {
    _id: 'hol_006',
    name: 'Good Friday',
    date: '2026-04-03',
    dayOfWeek: 'Friday',
    type: 'National Holiday',
    description: 'Commemoration of the Crucifixion of Jesus Christ',
    isRecurringYearly: false
  },
  {
    _id: 'hol_007',
    name: 'Eid-ul-Fitr (Ramzan Eid)',
    date: '2026-03-21',
    dayOfWeek: 'Saturday',
    type: 'Gazetted Holiday',
    description: 'Islamic festival marking the end of the Holy month of Ramadan',
    isRecurringYearly: false
  },
  {
    _id: 'hol_008',
    name: 'Dr. B.R. Ambedkar Jayanti',
    date: '2026-04-14',
    dayOfWeek: 'Tuesday',
    type: 'Gazetted Holiday',
    description: 'Honoring the principal architect of the Indian Constitution',
    isRecurringYearly: true
  },
  {
    _id: 'hol_009',
    name: 'Buddha Purnima',
    date: '2026-05-31',
    dayOfWeek: 'Sunday',
    type: 'Gazetted Holiday',
    description: 'Commemorating the birth, enlightenment, and death of Gautama Buddha',
    isRecurringYearly: false
  },
  {
    _id: 'hol_010',
    name: 'Bakrid / Eid al-Adha',
    date: '2026-05-27',
    dayOfWeek: 'Wednesday',
    type: 'Gazetted Holiday',
    description: 'Feast of the Sacrifice honoring willingness of Ibrahim',
    isRecurringYearly: false
  },
  {
    _id: 'hol_011',
    name: 'Muharram (Ashura)',
    date: '2026-06-26',
    dayOfWeek: 'Friday',
    type: 'Gazetted Holiday',
    description: 'Solemn day of remembrance in the first month of Islamic calendar',
    isRecurringYearly: false
  },
  {
    _id: 'hol_012',
    name: 'Independence Day',
    date: '2026-08-15',
    dayOfWeek: 'Saturday',
    type: 'National Holiday',
    description: '79th Indian Independence Day Celebration and Flag Hoisting',
    isRecurringYearly: true
  },
  {
    _id: 'hol_013',
    name: 'Raksha Bandhan',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    type: 'Restricted / Optional Holiday',
    description: 'Celebration of love and duty between brothers and sisters',
    isRecurringYearly: false
  },
  {
    _id: 'hol_014',
    name: 'Janmashtami (Krishna Jayanti)',
    date: '2026-09-04',
    dayOfWeek: 'Friday',
    type: 'Gazetted Holiday',
    description: 'Celebration of the birth of Lord Krishna',
    isRecurringYearly: false
  },
  {
    _id: 'hol_015',
    name: 'Eid-e-Milad (Mawlid)',
    date: '2026-08-26',
    dayOfWeek: 'Wednesday',
    type: 'Gazetted Holiday',
    description: 'Observance of the birthday of the Islamic prophet Muhammad',
    isRecurringYearly: false
  },
  {
    _id: 'hol_016',
    name: 'Mahatma Gandhi Jayanti',
    date: '2026-10-02',
    dayOfWeek: 'Friday',
    type: 'National Holiday',
    description: 'Commemorating the birth of Mahatma Gandhi, Father of the Nation',
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
  }
];

export const INITIAL_APPRECIATIONS = [];

export const INITIAL_PROJECTS = [];

export const INITIAL_TASKS = [];

export const INITIAL_TIMESHEETS = [];

export const INITIAL_EXPENSES = [];

export const INITIAL_TICKETS = [];

export const INITIAL_NOTICES = [];

export const INITIAL_BIRTHDAYS = [];

export const INITIAL_WFH_EMPLOYEES = [];

export const INITIAL_WEEKLY_TIMELOGS = [
  { day: 'Monday', shortDay: 'Mo', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Tuesday', shortDay: 'Tu', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Wednesday', shortDay: 'We', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Thursday', shortDay: 'Th', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Friday', shortDay: 'Fr', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Saturday', shortDay: 'Sa', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Sunday', shortDay: 'Su', date: '', durationText: '0h 00m', durationHours: 0, loginTime: 'Off', logoutTime: 'Off', breakDuration: '0m', isDayOff: true }
];

export const INITIAL_EVENTS = [];

export const INITIAL_CONVERSATIONS = [];

export const INITIAL_LEADS = [];

export const INITIAL_EMERGENCY_CONTACTS = [];

export const INITIAL_STICKY_NOTES = [];
