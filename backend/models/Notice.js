const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  priority: {
    type: String,
    required: true,
    enum: ['Normal', 'Important', 'Urgent'],
    default: 'Normal'
  },
  targetAudience: {
    type: String,
    required: true,
    enum: ['All Tenants', 'Selected Rooms'],
    default: 'All Tenants'
  },
  targetRooms: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['Published', 'Updated', 'Deleted'],
    default: 'Published'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: {
    type: String,
    required: true,
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
noticeSchema.index({ createdAt: -1 });
noticeSchema.index({ priority: 1, createdAt: -1 });
noticeSchema.index({ isDeleted: 1, status: 1 });
noticeSchema.index({ targetRooms: 1 });

module.exports = mongoose.model('Notice', noticeSchema);