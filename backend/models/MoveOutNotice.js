const mongoose = require('mongoose');

const moveOutNoticeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moveOutDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    trim: true,
    default: ''
  },
  roomNumber: {
    type: String,
    trim: true
  },
  noticePeriodAcknowledgement: {
    type: Boolean,
    required: true,
    default: false
  },
  adminReply: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
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

moveOutNoticeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (typeof next === 'function') {
    next();
  }
});

module.exports = mongoose.model('MoveOutNotice', moveOutNoticeSchema);
