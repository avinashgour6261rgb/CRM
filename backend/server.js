const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Shared infrastructure
const connectDB = require('./src/shared/config/database');
const { errorHandler, notFound } = require('./src/shared/middleware/errorHandler');
const { authenticateUser } = require('./src/shared/middleware/authMiddleware');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/api/health', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  res.status(isDbReady ? 200 : 503).json({
    status: isDbReady ? 'online' : 'connecting',
    database: isDbReady ? 'connected' : 'connecting',
    system: 'Enterprise Management System (EMS) API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Database Seed / Reset Endpoint
app.post('/api/seed', async (req, res) => {
  try {
    const { seedDatabase } = require('./src/seeders/seed');
    await seedDatabase();
    res.json({ success: true, message: 'Database successfully seeded with actual enterprise data!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Public Authentication Routes (Login strictly against MongoDB Atlas) ────
app.use('/api/auth', require('./src/modules/auth/routes/authRoutes'));

// Authenticate user & tenant scoping middleware
app.use('/api', authenticateUser);

// ─── Mount Module Routes ────────────────────────────────────────────────────
// HR Module
app.use('/api/employees',    require('./src/modules/hr/routes/employeeRoutes'));
app.use('/api/leaves',       require('./src/modules/hr/routes/leaveRoutes'));
app.use('/api/attendance',   require('./src/modules/hr/routes/attendanceRoutes'));
app.use('/api/holidays',     require('./src/modules/hr/routes/holidayRoutes'));
app.use('/api/appreciations', require('./src/modules/hr/routes/appreciationRoutes'));

// Work Module (Projects, Tasks, Timesheets)
app.use('/api/projects',     require('./src/modules/work/routes/projectRoutes'));
app.use('/api/tasks',        require('./src/modules/work/routes/taskRoutes'));
app.use('/api/timesheet',    require('./src/modules/work/routes/timesheetRoutes'));
app.use('/api/timesheets',   require('./src/modules/work/routes/timesheetRoutes'));
app.use('/api/timer',        require('./src/modules/work/routes/timesheetRoutes'));
app.use('/api/timelogs',     require('./src/modules/work/routes/timesheetRoutes'));
app.use('/api/timelog',      require('./src/modules/work/routes/timesheetRoutes'));

// CRM Module (Leads, etc.)
app.use('/api/leads',        require('./src/modules/crm/routes/leadRoutes'));

// 404 & Error Handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Enterprise Management System (EMS) Backend Server running on port ${PORT}`);
  console.log(`📡 API Endpoints ready at http://localhost:${PORT}/api/`);
});
