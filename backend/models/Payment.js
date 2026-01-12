const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    paymentType: {
      type: String,
      enum: ['rent', 'deposit', 'other'],
      default: 'rent'
    },
    billingPeriod: {
      type: String,
      trim: true
    },
    method: {
      type: String,
      enum: ['upi', 'cash', 'netbanking', 'card', 'other'],
      default: 'upi'
    },
    referenceId: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'verified', 'rejected', 'completed'],
      default: 'pending'
    },
    adminReply: {
      type: String,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
