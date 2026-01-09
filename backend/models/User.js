const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  gender: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  age: {
    type: Number,
    min: 18,
    max: 100
  },
  occupation: {
    type: String,
    trim: true,
    default: ''
  },
  moveOutDate: {
    type: Date
  },
  remainingRent: {
    type: Number,
    default: 0
  },
  idType: {
    type: String,
    enum: ['aadhaar', 'pan']
  },
  idNumber: {
    type: String,
    trim: true,
    default: ''
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'tenant', 'owner'],
    default: 'tenant'
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  approved: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  profileRole: {
    type: String,
    trim: true
  },
  profilePhoto: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip if password is not modified
  if (!this.isModified('password')) {
    if (typeof next === 'function') {
      return next();
    }
    return;
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (typeof next === 'function') {
      return next();
    }
  } catch (error) {
    if (typeof next === 'function') {
      return next(error);
    }
    throw error;
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
