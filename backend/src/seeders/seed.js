/**
 * @file seed.js
 * @description MongoDB Seeder script to populate database with initial HR data.
 * Run with: npm run seed
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const Employee = require('../modules/hr/models/Employee');
const Leave = require('../modules/hr/models/Leave');
const Attendance = require('../modules/hr/models/Attendance');
const Holiday = require('../modules/hr/models/Holiday');
const Appreciation = require('../modules/hr/models/Appreciation');
const Project = require('../modules/work/models/Project');
const Task = require('../modules/work/models/Task');
const Timesheet = require('../modules/work/models/Timesheet');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI is not set in .env file!');
  process.exit(1);
}

const EMPLOYEES = [
  {
    employeeCode: 'ADM-001',
    name: 'Admin User',
    email: 'admin@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Administrator',
    department: 'Management',
    status: 'active',
    joiningDate: '2023-01-01',
    isCurrentUser: true,
    isAdmin: true,
    leaveBalance: { casual: 12, sick: 10, earned: 18, maternity: 0 }
  },
  {
    employeeCode: 'HR-001',
    name: 'Pooja Sharma',
    email: 'hr@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    role: 'HR Manager',
    department: 'Human Resources',
    status: 'active',
    joiningDate: '2023-03-01',
    isCurrentUser: false,
    isAdmin: false,
    leaveBalance: { casual: 10, sick: 8, earned: 15, maternity: 0 }
  },
  {
    employeeCode: 'ENG-001',
    name: 'Rahul Verma',
    email: 'rahul.verma@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'Senior Full Stack Developer',
    department: 'Engineering',
    status: 'active',
    joiningDate: '2023-02-15',
    isCurrentUser: false,
    isAdmin: false,
    leaveBalance: { casual: 10, sick: 6, earned: 14, maternity: 0 }
  },
  {
    employeeCode: 'DES-001',
    name: 'Priya Sharma',
    email: 'priya.sharma@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    role: 'Lead UI/UX Designer',
    department: 'Product Design',
    status: 'active',
    joiningDate: '2023-04-10',
    isCurrentUser: false,
    isAdmin: false,
    leaveBalance: { casual: 8, sick: 5, earned: 12, maternity: 0 }
  },
  {
    employeeCode: 'INF-001',
    name: 'Amit Kumar',
    email: 'amit.kumar@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    role: 'DevOps & Cloud Engineer',
    department: 'Infrastructure',
    status: 'active',
    joiningDate: '2023-05-20',
    isCurrentUser: false,
    isAdmin: false,
    leaveBalance: { casual: 6, sick: 4, earned: 10, maternity: 0 }
  }
];

const HOLIDAYS = [
  { name: 'New Year Day', date: '2026-01-01', dayOfWeek: 'Thursday', type: 'Gazetted Holiday', description: 'Celebration of the New Year' },
  { name: 'Republic Day', date: '2026-01-26', dayOfWeek: 'Monday', type: 'National Holiday', description: 'Honoring the Constitution of India' },
  { name: 'Maha Shivratri', date: '2026-02-15', dayOfWeek: 'Sunday', type: 'Restricted / Optional Holiday', description: 'Festival in honor of Lord Shiva' },
  { name: 'Holi', date: '2026-03-04', dayOfWeek: 'Wednesday', type: 'Gazetted Holiday', description: 'Festival of colors and spring' },
  { name: 'Good Friday', date: '2026-04-03', dayOfWeek: 'Friday', type: 'Gazetted Holiday', description: 'Commemoration of the Crucifixion' },
  { name: 'Eid-ul-Fitr', date: '2026-03-21', dayOfWeek: 'Saturday', type: 'Gazetted Holiday', description: 'Islamic festival marking end of Ramadan' },
  { name: 'Independence Day', date: '2026-08-15', dayOfWeek: 'Saturday', type: 'National Holiday', description: 'Celebrating National Independence' },
  { name: 'Raksha Bandhan', date: '2026-08-28', dayOfWeek: 'Friday', type: 'Restricted / Optional Holiday', description: 'Celebrating the bond between siblings' },
  { name: 'Janmashtami', date: '2026-09-04', dayOfWeek: 'Friday', type: 'Gazetted Holiday', description: 'Celebration of the birth of Lord Krishna' },
  { name: 'Gandhi Jayanti', date: '2026-10-02', dayOfWeek: 'Friday', type: 'National Holiday', description: 'Birthday of Mahatma Gandhi' },
  { name: 'Dussehra', date: '2026-10-20', dayOfWeek: 'Tuesday', type: 'Gazetted Holiday', description: 'Victory of Good over Evil' },
  { name: 'Diwali', date: '2026-11-08', dayOfWeek: 'Sunday', type: 'Gazetted Holiday', description: 'Festival of Lights' },
  { name: 'Guru Nanak Jayanti', date: '2026-11-24', dayOfWeek: 'Tuesday', type: 'Gazetted Holiday', description: 'Birthday of Guru Nanak Dev Ji' },
  { name: 'Christmas Day', date: '2026-12-25', dayOfWeek: 'Friday', type: 'Gazetted Holiday', description: 'Celebration of the birth of Jesus Christ' }
];

async function seedDatabase() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(MONGO_URI);
      console.log('Connected to MongoDB successfully.');
    }

    console.log('Clearing existing collections (HR & Work)...');
    await Promise.all([
      Employee.deleteMany({}),
      Leave.deleteMany({}),
      Attendance.deleteMany({}),
      Holiday.deleteMany({}),
      Appreciation.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      Timesheet.deleteMany({})
    ]);

    console.log('Inserting Employees...');
    const insertedEmployees = await Employee.insertMany(EMPLOYEES);
    const empMap = {};
    insertedEmployees.forEach(e => {
      empMap[e.employeeCode] = e;
    });

    console.log('Inserting Holidays...');
    await Holiday.insertMany(HOLIDAYS);

    console.log('Inserting Leaves...');
    await Leave.insertMany([
      {
        employee: empMap['ADM-001']._id,
        employeeName: empMap['ADM-001'].name,
        employeeAvatar: empMap['ADM-001'].avatar,
        employeeRole: empMap['ADM-001'].role,
        employeeCode: empMap['ADM-001'].employeeCode,
        leaveType: 'Casual Leave',
        startDate: '2026-09-12',
        endDate: '2026-09-14',
        durationDays: 3,
        durationText: '3 Days',
        reason: 'Family function in hometown',
        isPaid: true,
        status: 'approved',
        approvedBy: 'Pooja Sharma',
        approverRemarks: 'Approved.'
      },
      {
        employee: empMap['DES-001']._id,
        employeeName: empMap['DES-001'].name,
        employeeAvatar: empMap['DES-001'].avatar,
        employeeRole: empMap['DES-001'].role,
        employeeCode: empMap['DES-001'].employeeCode,
        leaveType: 'Sick Leave',
        startDate: '2026-09-22',
        endDate: '2026-09-23',
        durationDays: 2,
        durationText: '2 Days',
        reason: 'Viral fever and doctor recommended rest',
        isPaid: true,
        status: 'pending'
      },
      {
        employee: empMap['INF-001']._id,
        employeeName: empMap['INF-001'].name,
        employeeAvatar: empMap['INF-001'].avatar,
        employeeRole: empMap['INF-001'].role,
        employeeCode: empMap['INF-001'].employeeCode,
        leaveType: 'Earned Leave',
        startDate: '2026-10-05',
        endDate: '2026-10-08',
        durationDays: 4,
        durationText: '4 Days',
        reason: 'Personal vacation',
        isPaid: true,
        status: 'approved',
        approvedBy: 'Pooja Sharma'
      }
    ]);

    console.log('Inserting Appreciations...');
    await Appreciation.insertMany([
      {
        givenTo: empMap['ADM-001']._id,
        givenToName: empMap['ADM-001'].name,
        givenToAvatar: empMap['ADM-001'].avatar,
        givenToRole: empMap['ADM-001'].role,
        givenBy: empMap['HR-001']._id,
        givenByName: empMap['HR-001'].name,
        awardName: 'Best Performer of the Month',
        awardBadgeIcon: 'trophy',
        givenOn: '2026-09-01',
        rewardPointsOrCash: '₹5,000 Bonus',
        appreciationNote: 'For exceptional performance in leading the Q3 Digital Marketing Campaign.'
      },
      {
        givenTo: empMap['ENG-001']._id,
        givenToName: empMap['ENG-001'].name,
        givenToAvatar: empMap['ENG-001'].avatar,
        givenToRole: empMap['ENG-001'].role,
        givenBy: empMap['HR-001']._id,
        givenByName: empMap['HR-001'].name,
        awardName: 'Code Master Award',
        awardBadgeIcon: 'rocket',
        givenOn: '2026-08-15',
        rewardPointsOrCash: '200 Karma Points',
        appreciationNote: 'For outstanding speed and clean architecture during the system migration.'
      }
    ]);

    console.log('Generating Attendance Data...');
    const attendanceRecords = [];
    const daysInMonth = 30; // September
    const monthStr = '2026-09';

    for (const emp of insertedEmployees) {
      for (let day = 1; day <= daysInMonth; day++) {
        const dayFormatted = String(day).padStart(2, '0');
        const dateStr = `${monthStr}-${dayFormatted}`;
        const dateObj = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat

        let status = 'present';
        let clockInTime = '09:15:00';
        let clockOutTime = '18:30:00';
        let isLate = false;
        let lateByMinutes = 0;

        if (dayOfWeek === 0) {
          status = 'day_off';
          clockInTime = null;
          clockOutTime = null;
        } else if (dayOfWeek === 6) {
          status = day % 2 === 0 ? 'day_off' : 'present';
          if (status === 'day_off') {
            clockInTime = null;
            clockOutTime = null;
          }
        } else if (dateStr === '2026-09-04') {
          status = 'holiday';
          clockInTime = null;
          clockOutTime = null;
        } else if (emp.employeeCode === 'ADM-001' && (day === 12 || day === 13 || day === 14)) {
          status = 'on_leave';
          clockInTime = null;
          clockOutTime = null;
        } else if (emp.employeeCode === 'DES-001' && (day === 22 || day === 23)) {
          status = 'on_leave';
          clockInTime = null;
          clockOutTime = null;
        } else if (day === 5 || day === 18) {
          status = 'late';
          clockInTime = '09:45:00';
          isLate = true;
          lateByMinutes = 15;
        } else if (day === 10) {
          status = 'half_day';
          clockInTime = '09:10:00';
          clockOutTime = '13:30:00';
        }

        attendanceRecords.push({
          employee: emp._id,
          employeeName: emp.name,
          employeeAvatar: emp.avatar,
          employeeRole: emp.role,
          employeeCode: emp.employeeCode,
          date: dateStr,
          status,
          clockInTime,
          clockOutTime,
          isLate,
          lateByMinutes,
          totalWorkingHours: clockInTime && clockOutTime ? 9.25 : 0
        });
      }
    }

    await Attendance.insertMany(attendanceRecords);
    console.log(`Inserted ${attendanceRecords.length} attendance records.`);

    console.log('Inserting Work Projects...');
    const insertedProjects = await Project.insertMany([
      {
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
        members: [empMap['ADM-001']._id, empMap['DES-001']._id],
        membersList: [
          { _id: empMap['ADM-001']._id.toString(), name: empMap['ADM-001'].name, avatar: empMap['ADM-001'].avatar, role: empMap['ADM-001'].role },
          { _id: empMap['DES-001']._id.toString(), name: empMap['DES-001'].name, avatar: empMap['DES-001'].avatar, role: empMap['DES-001'].role }
        ]
      },
      {
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
        members: [empMap['DES-001']._id, empMap['ENG-001']._id],
        membersList: [
          { _id: empMap['DES-001']._id.toString(), name: empMap['DES-001'].name, avatar: empMap['DES-001'].avatar, role: empMap['DES-001'].role },
          { _id: empMap['ENG-001']._id.toString(), name: empMap['ENG-001'].name, avatar: empMap['ENG-001'].avatar, role: empMap['ENG-001'].role }
        ]
      },
      {
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
        members: [empMap['ADM-001']._id, empMap['ENG-001']._id, empMap['INF-001']._id],
        membersList: [
          { _id: empMap['ADM-001']._id.toString(), name: empMap['ADM-001'].name, avatar: empMap['ADM-001'].avatar, role: empMap['ADM-001'].role },
          { _id: empMap['ENG-001']._id.toString(), name: empMap['ENG-001'].name, avatar: empMap['ENG-001'].avatar, role: empMap['ENG-001'].role },
          { _id: empMap['INF-001']._id.toString(), name: empMap['INF-001'].name, avatar: empMap['INF-001'].avatar, role: empMap['INF-001'].role }
        ]
      }
    ]);

    const projectMap = {};
    insertedProjects.forEach(p => {
      projectMap[p.projectCode] = p;
    });

    console.log('Inserting Work Tasks...');
    const insertedTasks = await Task.insertMany([
      {
        taskCode: 'CPC-0',
        title: 'Bookmarking 20',
        category: 'Digital Marketing',
        project: projectMap['CPC']._id,
        projectId: projectMap['CPC']._id.toString(),
        projectName: 'CITY PRIME CARE',
        projectCode: 'CPC',
        startDate: '2026-09-25',
        dueDate: '2026-09-25',
        hasNoDueDate: false,
        description: 'Execute high DA bookmarking submissions and citation links for City Prime Care campaign.',
        priority: 'medium',
        status: 'incomplete',
        assignedTo: empMap['ADM-001']._id,
        assignedToId: empMap['ADM-001']._id.toString(),
        assignedToName: empMap['ADM-001'].name,
        assignedToAvatar: empMap['ADM-001'].avatar,
        assignedToRole: empMap['ADM-001'].role,
        estimatedHours: 4,
        hoursLogged: 2.29,
        hoursLoggedText: '02h 17m',
        completedOn: null,
        isPrivate: false,
        isBillable: true,
        labels: ['Marketing', 'SEO'],
        timerRunning: false,
        timerSeconds: 0
      },
      {
        taskCode: 'NBR-1',
        title: 'Design System Token Definition & UI Kit',
        category: 'UI/UX Design',
        project: projectMap['NBR']._id,
        projectId: projectMap['NBR']._id.toString(),
        projectName: 'Novainfinity Brand Revamp & Design System',
        projectCode: 'NBR',
        startDate: '2026-09-20',
        dueDate: '2026-09-28',
        hasNoDueDate: false,
        description: 'Create harmonious HSL color palette, typography scales, glassmorphism card elevation tokens.',
        priority: 'high',
        status: 'in_progress',
        assignedTo: empMap['DES-001']._id,
        assignedToId: empMap['DES-001']._id.toString(),
        assignedToName: empMap['DES-001'].name,
        assignedToAvatar: empMap['DES-001'].avatar,
        assignedToRole: empMap['DES-001'].role,
        estimatedHours: 16,
        hoursLogged: 12,
        hoursLoggedText: '12h 00m',
        completedOn: null,
        isPrivate: false,
        isBillable: true,
        labels: ['Figma', 'UI Kit'],
        timerRunning: false,
        timerSeconds: 0
      },
      {
        taskCode: 'ERP-2',
        title: 'MongoDB Atlas Cloud Cluster Connection & Schema Seeder',
        category: 'Web Development',
        project: projectMap['ERP']._id,
        projectId: projectMap['ERP']._id.toString(),
        projectName: 'Enterprise ERP Core Pipeline',
        projectCode: 'ERP',
        startDate: '2026-09-15',
        dueDate: '2026-09-22',
        hasNoDueDate: false,
        description: 'Configure Mongoose connection pooling, production environment variables, and reliable schema seeding.',
        priority: 'urgent',
        status: 'completed',
        assignedTo: empMap['ENG-001']._id,
        assignedToId: empMap['ENG-001']._id.toString(),
        assignedToName: empMap['ENG-001'].name,
        assignedToAvatar: empMap['ENG-001'].avatar,
        assignedToRole: empMap['ENG-001'].role,
        estimatedHours: 8,
        hoursLogged: 8,
        hoursLoggedText: '08h 00m',
        completedOn: '2026-09-22',
        isPrivate: false,
        isBillable: true,
        labels: ['Database', 'MongoDB'],
        timerRunning: false,
        timerSeconds: 0
      }
    ]);

    console.log('Inserting Timesheets...');
    await Timesheet.insertMany([
      {
        task: insertedTasks[0]._id,
        taskId: insertedTasks[0]._id.toString(),
        taskCode: 'CPC-0',
        taskTitle: 'Bookmarking 20',
        project: projectMap['CPC']._id,
        projectId: projectMap['CPC']._id.toString(),
        projectName: 'CITY PRIME CARE',
        employee: empMap['ADM-001']._id,
        employeeId: empMap['ADM-001']._id.toString(),
        employeeName: empMap['ADM-001'].name,
        employeeAvatar: empMap['ADM-001'].avatar,
        employeeRole: empMap['ADM-001'].role,
        date: '2026-09-25',
        startTime: '09:30:00',
        endTime: '11:47:21',
        totalDurationSeconds: 8241,
        totalDurationText: '02:17:21',
        memo: 'Executing citation bookmarks and niche directory submissions',
        status: 'stopped'
      },
      {
        task: insertedTasks[1]._id,
        taskId: insertedTasks[1]._id.toString(),
        taskCode: 'NBR-1',
        taskTitle: 'Design System Token Definition & UI Kit',
        project: projectMap['NBR']._id,
        projectId: projectMap['NBR']._id.toString(),
        projectName: 'Novainfinity Brand Revamp & Design System',
        employee: empMap['DES-001']._id,
        employeeId: empMap['DES-001']._id.toString(),
        employeeName: empMap['DES-001'].name,
        employeeAvatar: empMap['DES-001'].avatar,
        employeeRole: empMap['DES-001'].role,
        date: '2026-09-24',
        startTime: '10:00:00',
        endTime: '15:30:00',
        totalDurationSeconds: 19800,
        totalDurationText: '05h 30m',
        memo: 'Color contrast ratios and accessible interactive states',
        status: 'stopped'
      }
    ]);

    console.log('✅ MongoDB Seeding completed successfully!');
    if (require.main === module) {
      process.exit(0);
    }
    return true;
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, EMPLOYEES };
