require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const MoveOutNotice = require('../models/MoveOutNotice');
const connectDB = require('../config/db');

const API_URL = 'http://localhost:5000/api';

const login = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.statusText}`);
  const data = await res.json();
  return data.token;
};

const runTest = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    // 1. Get Admin Token
    console.log('Logging in as Admin...');
    const adminToken = await login('admin@pgmanagement.com', 'admin123');
    console.log('✅ Admin logged in');

    // 2. Get/Create Tenant
    let tenant = await User.findOne({ role: 'tenant' });
    let tenantPassword = 'password123';
    
    if (!tenant) {
      console.log('Creating test tenant...');
      tenant = await User.create({
        name: 'Test Tenant',
        email: `tenant${Date.now()}@test.com`,
        password: tenantPassword,
        role: 'tenant',
        phone: '1234567890'
      });
      console.log('✅ Created test tenant:', tenant.email);
    } else {
      console.log('Using existing tenant:', tenant.email);
      // We assume the password is 'password123' for test users, but if it fails we might need to reset it
      // For now, let's reset the password to ensure we can login
      tenant.password = tenantPassword;
      await tenant.save();
      console.log('✅ Reset tenant password to known value');
    }

    // 3. Login as Tenant
    console.log('Logging in as Tenant...');
    const tenantToken = await login(tenant.email, tenantPassword);
    console.log('✅ Tenant logged in');

    // Clean up existing move-out notices for this tenant
    await MoveOutNotice.deleteMany({ user: tenant._id });
    console.log('Cleared existing notices');

    // 4. Submit Move-Out Request
    console.log('Submitting move-out request...');
    const moveOutDate = new Date();
    moveOutDate.setDate(moveOutDate.getDate() + 30);
    
    const submitRes = await fetch(`${API_URL}/moveouts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        moveOutDate: moveOutDate.toISOString(),
        reason: 'Testing move out',
        noticePeriodAcknowledgement: true
      })
    });
    
    if (!submitRes.ok) {
      const err = await submitRes.json();
      throw new Error(`Submit failed: ${JSON.stringify(err)}`);
    }
    const submitData = await submitRes.json();
    const noticeId = submitData.notice._id;
    console.log('✅ Move-out request submitted, ID:', noticeId);

    // 5. Admin Views Requests
    console.log('Admin fetching requests...');
    const adminViewRes = await fetch(`${API_URL}/moveouts`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminViewData = await adminViewRes.json();
    const foundNotice = adminViewData.notices.find(n => n._id === noticeId);
    if (!foundNotice) throw new Error('Admin could not see the new request');
    console.log('✅ Admin sees the request');

    // 6. Admin Replies
    console.log('Admin replying...');
    const replyRes = await fetch(`${API_URL}/moveouts/${noticeId}/reply`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ adminReply: 'We will process this shortly.' })
    });
    if (!replyRes.ok) throw new Error('Reply failed');
    console.log('✅ Admin replied');

    // 7. Admin Approves
    console.log('Admin approving...');
    const approveRes = await fetch(`${API_URL}/moveouts/${noticeId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'approved' })
    });
    if (!approveRes.ok) throw new Error('Approval failed');
    console.log('✅ Admin approved request');

    // 8. Tenant Checks Status
    console.log('Tenant checking status...');
    const tenantCheckRes = await fetch(`${API_URL}/moveouts/me`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    const tenantCheckData = await tenantCheckRes.json();
    const myNotice = tenantCheckData.notices.find(n => n._id === noticeId);
    
    if (myNotice.status !== 'approved') throw new Error(`Status mismatch: expected approved, got ${myNotice.status}`);
    if (myNotice.adminReply !== 'We will process this shortly.') throw new Error('Reply mismatch');
    console.log('✅ Tenant sees updated status and reply');

    // 9. Admin Deletes Request
    console.log('Admin deleting request...');
    const deleteRes = await fetch(`${API_URL}/moveouts/${noticeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!deleteRes.ok) throw new Error('Delete failed');
    console.log('✅ Admin deleted request');

    console.log('\n🎉 ALL TESTS PASSED');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

runTest();
