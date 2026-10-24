const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    employeeName: { type: String, required: true },
    employeeAvatar: { type: String, default: '' },
    employeeRole: { type: String },
    employeeCode: { type: String },

    date: {
      type: String,
      required: [true, 'Attendance date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD']
    },
    status: {
      type: String,
      required: true,
      enum: ['present', 'late', 'absent', 'half_day', 'holiday', 'day_off', 'on_leave']
    },
    clockInTime: {
      type: String,     // "09:15:00"
      default: null
    },
    clockOutTime: {
      type: String,     // "18:30:00"
      default: null
    },
    totalWorkingHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24
    },
    clockInTimestamp: {
      type: Number,
      default: null
    },
    clockOutTimestamp: {
      type: Number,
      default: null
    },
    workSeconds: {
      type: Number,
      default: 0
    },
    breakSeconds: {
      type: Number,
      default: 0
    },
    isOnBreak: {
      type: Boolean,
      default: false
    },
    breakType: {
      type: String,
      default: null
    },
    breakHistory: [mongoose.Schema.Types.Mixed],
    isClockedIn: {
      type: Boolean,
      default: false
    },
    isLate: {
      type: Boolean,
      default: false
    },
    lateByMinutes: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      default: '',
      maxlength: [300, 'Notes too long (max 300 characters)']
    },
    markedBy: {
      type: String,
      default: 'System'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Unique per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, status: 1 });

// Auto-compute totalWorkingHours from clock times
// Uses regex parser to handle both "HH:MM:SS" and "HH:MM AM/PM" formats safely
const parseAttendanceTime = (str) => {
  if (!str) return 0;
  const m = String(str).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3] || '0', 10);
  const ampm = (m[4] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  if (isNaN(h) || isNaN(min) || isNaN(sec)) return 0;
  return h * 3600 + min * 60 + sec;
};

AttendanceSchema.pre('save', function (next) {
  if (this.clockInTime && this.clockOutTime) {
    const inTotal = parseAttendanceTime(this.clockInTime);
    const outTotal = parseAttendanceTime(this.clockOutTime);
    if (inTotal > 0 && outTotal > 0) {
      const diffSecs = Math.max(0, outTotal - inTotal);
      this.totalWorkingHours = +(diffSecs / 3600).toFixed(2);

      // Late if clock-in after 09:30 AM
      const graceLimit = 9 * 3600 + 30 * 60;
      if (inTotal > graceLimit) {
        this.isLate = true;
        this.lateByMinutes = Math.floor((inTotal - graceLimit) / 60);
      }
    }
  }
  next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
