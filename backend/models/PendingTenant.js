const mongoose = require('mongoose');

const pendingTenantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  idType: { type: String, enum: ['aadhaar', 'pan'], default: '' },
  idNumber: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PendingTenant', pendingTenantSchema);
