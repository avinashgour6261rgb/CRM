const mongoose = require('mongoose');

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
      default: () => new Date().toISOString().split('T')[0]
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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Expense', ExpenseSchema);
