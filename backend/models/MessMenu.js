const mongoose = require('mongoose');

const messMenuSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  breakfast: {
    type: String,
    required: true,
    trim: true
  },
  lunch: {
    type: String,
    required: true,
    trim: true
  },
  dinner: {
    type: String,
    required: true,
    trim: true
  },
  isBreakfastVeg: {
    type: Boolean,
    default: true
  },
  isLunchVeg: {
    type: Boolean,
    default: true
  },
  isDinnerVeg: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

messMenuSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('MessMenu', messMenuSchema);
