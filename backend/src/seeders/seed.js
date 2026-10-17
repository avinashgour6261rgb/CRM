/**
 * @file seed.js
 * @description MongoDB Seeder script to initialize clean production database.
 * Preserves only the Master Admin account and official holidays.
 * Leaves all task, project, leave, and timesheet collections completely empty.
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

const EMPLOYEES = [
  {
    employeeCode: 'ADM-001',
    name: 'Administrator',
    email: 'admin@inforag.com',
    password: 'admin123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Administrator',
    systemRole: 'admin',
    department: 'Management',
    status: 'active',
    joiningDate: '2026-01-01',
    isCurrentUser: true,
    isAdmin: true,
    leaveBalance: { casual: 15, sick: 12, earned: 20, maternity: 0 },
    customFields: []
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
    if (!MONGO_URI) {
      console.warn('⚠️ MONGO_URI is not set; skipping MongoDB seeder.');
      return false;
    }

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

    console.log('Inserting Master Admin...');
    await Employee.insertMany(EMPLOYEES);

    console.log('Inserting Holidays...');
    await Holiday.insertMany(HOLIDAYS);

    console.log('✅ Clean multi-user production seed complete: 0 dummy tasks, 0 mock employees.');
    if (require.main === module) {
      process.exit(0);
    }
    return true;
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    if (require.main === module) {
      process.exit(1);
    }
    return false;
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, EMPLOYEES };
