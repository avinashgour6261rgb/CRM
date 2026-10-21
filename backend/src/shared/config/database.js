const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  if (!process.env.MONGO_URI) {
    console.warn('\n⚠️  MONGO_URI is not defined in environment variables. Database features will be in standby.\n');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    isConnected = true;

    console.log(`\n🍃 MongoDB Atlas Cloud Connected successfully!`);
    console.log(`   Database: ${conn.connection.name}\n`);

    // Ensure basic system records exist without wiping user projects, tasks, or employees
    try {
      const Employee = require('../../modules/hr/models/Employee');
      const Holiday = require('../../modules/hr/models/Holiday');
      const Task = require('../../modules/work/models/Task');

      // 1. Ensure Master Admin exists if none present
      const adminExists = await Employee.findOne({ $or: [{ employeeCode: 'ADM-001' }, { role: 'Administrator' }, { isAdmin: true }] });
      if (!adminExists) {
        await Employee.create({
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
          isAdmin: true,
          isSuperAdmin: true,
          leaveBalance: { casual: 15, sick: 12, earned: 20, maternity: 0 }
        });
        console.log('✅ Master Admin account initialized in MongoDB Atlas.');
      }

      // 2. Safely remove ONLY legacy mock records without touching user data
      await Employee.deleteMany({ $or: [{ name: /Avinash/i }, { name: /Pooja Sharma/i }, { name: /Aarav Patel/i }] });
      await Task.deleteMany({ $or: [{ assignedToName: /Avinash/i }, { title: /Bookmarking 20/i }] });

      // 3. Ensure official holidays are present if collection is empty
      const holidayCount = await Holiday.countDocuments();
      if (holidayCount === 0) {
        const { HOLIDAYS } = require('../../seeders/seed');
        if (Array.isArray(HOLIDAYS) && HOLIDAYS.length > 0) {
          await Holiday.insertMany(HOLIDAYS);
          console.log('✅ Official holidays initialized in MongoDB Atlas.');
        }
      }
    } catch (dbInitErr) {
      console.warn('⚠️ Database initialization notice:', dbInitErr.message);
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('\n⚠️  MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:', error.message);
    console.error('💡 Tip: Ensure your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas Network Access.\n');
  }
};

module.exports = connectDB;
