const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    date: {
      type: String,
      required: [true, 'Holiday date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD']
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    type: {
      type: String,
      required: [true, 'Holiday type is required'],
      enum: [
        'National Holiday',
        'Gazetted Holiday',
        'Restricted / Optional Holiday',
        'Company Holiday',
        'Company Declared Holiday',
        'Major Festival',
        'Festival'
      ]
    },
    icon: {
      type: String,
      default: '🏖️'
    },
    isConfirmed: {
      type: Boolean,
      default: true
    },
    confirmedBy: {
      type: String,
      default: 'Admin'
    },
    code: {
      type: String
    },
    description: {
      type: String,
      default: '',
      maxlength: [300, 'Description cannot exceed 300 characters']
    },
    isRecurringYearly: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: String,
      default: 'Admin'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Auto-compute dayOfWeek from date before save
HolidaySchema.pre('save', function (next) {
  if (this.date && !this.dayOfWeek) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(this.date + 'T00:00:00');
    this.dayOfWeek = days[d.getDay()];
  }
  next();
});

// Unique holiday per date
HolidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', HolidaySchema);
