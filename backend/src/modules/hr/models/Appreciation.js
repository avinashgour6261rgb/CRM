const mongoose = require('mongoose');

const AppreciationSchema = new mongoose.Schema(
  {
    givenTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
      default: null
    },
    givenToId: { type: String, default: '' },
    givenToName: { type: String, required: [true, 'Recipient name is required'] },
    givenToAvatar: { type: String, default: '' },
    givenToRole: { type: String, default: 'Team Member' },

    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
      default: null
    },
    givenById: { type: String, default: '' },
    givenByName: { type: String, default: 'Administrator' },

    awardName: {
      type: String,
      required: [true, 'Award title is required'],
      trim: true,
      maxlength: [120, 'Award name cannot exceed 120 characters']
    },
    awardBadgeIcon: {
      type: String,
      default: 'trophy'
    },
    givenOn: {
      type: String,
      required: [true, 'Award date is required']
    },
    rewardPointsOrCash: {
      type: String,
      default: ''
    },
    appreciationNote: {
      type: String,
      required: [true, 'Appreciation note / citation is required'],
      maxlength: [2000, 'Appreciation note too long (max 2000 characters)']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

AppreciationSchema.index({ givenTo: 1, givenOn: -1 });
AppreciationSchema.index({ givenToId: 1, givenOn: -1 });
AppreciationSchema.index({ givenOn: -1 });

module.exports = mongoose.model('Appreciation', AppreciationSchema);
