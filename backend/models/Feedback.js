const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  tenantName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Service', 'Cleanliness', 'Food', 'Management', 'Other'],
    default: 'Other'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['Submitted', 'Reviewed', 'Replied'],
    default: 'Submitted'
  },
  adminReply: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  repliedAt: {
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
feedbackSchema.index({ tenantId: 1, createdAt: -1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ rating: 1 });

// Virtual for feedback ID
feedbackSchema.virtual('feedbackId').get(function() {
  return this._id.toString().slice(-6).toUpperCase();
});

// Ensure virtual fields are serialized
feedbackSchema.set('toJSON', { virtuals: true });
feedbackSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Feedback', feedbackSchema);