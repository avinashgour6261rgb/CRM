const mongoose = require('mongoose');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

const ExpenseSchema = new mongoose.Schema(
  {
    expenseCode: {
      type: String,
      trim: true
    },
    itemName: {
      type: String,
      required: [true, 'Expense item name is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Expense price is required']
    },
    category: {
      type: String,
      default: 'Office Supplies'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'approved'
    },
    paymentMethod: {
      type: String,
      default: 'Company Card'
    },
    date: {
      type: String,
      default: () => getIstDateString()
    },
    employeeId: {
      type: String,
      default: ''
    },
    employeeName: {
      type: String,
      default: 'Administrator'
    },
    notes: {
      type: String,
      default: ''
    },
    receiptUrl: {
      type: String,
      default: ''
    },
    approvedBy: { type: String, default: '' },
    approvedById: { type: String, default: '' },
    approvedByCode: { type: String, default: '' },
    approvedAt: { type: Date },
    rejectedBy: { type: String, default: '' },
    rejectedById: { type: String, default: '' },
    rejectedByCode: { type: String, default: '' },
    rejectedAt: { type: Date },
    lastActionBy: { type: String, default: '' },
    lastActionById: { type: String, default: '' },
    lastActionByCode: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

ExpenseSchema.index({ employeeId: 1, purchaseDate: -1 });
ExpenseSchema.index({ status: 1, createdAt: -1 });
ExpenseSchema.index({ category: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
