const mongoose = require('mongoose');

const messMenuSchema = new mongoose.Schema({
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
  snacks: {
    type: String,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
messMenuSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MessMenu', messMenuSchema);
