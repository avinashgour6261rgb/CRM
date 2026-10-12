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

    // Ensure real database records exist and no stale legacy mock remains
    try {
      const Employee = require('../../modules/hr/models/Employee');
      const Task = require('../../modules/work/models/Task');
      const empCount = await Employee.countDocuments();
      const hasAdmin = await Employee.findOne({ employeeCode: 'ADM-001' });
      const hasLegacyAvinash = (await Employee.findOne({ name: /Avinash/i })) ||
                               (await Task.findOne({ $or: [{ assignedToName: /Avinash/i }, { title: /Develop Client Analytics/i }] }));

      if (empCount === 0 || !hasAdmin || hasLegacyAvinash) {
        console.log('⚡ Detected legacy mock records or uninitialized DB. Syncing clean actual database records...');
        const { seedDatabase } = require('../../seeders/seed');
        await seedDatabase();
      }
    } catch (seedErr) {
      console.warn('⚠️ Auto-seed check notice:', seedErr.message);
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
