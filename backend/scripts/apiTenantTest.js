const mongoose = require('mongoose');
const db = require('../db');

(async () => {
  try {
    await db();
    // Login as admin to get token
    const loginResRaw = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pgmanagement.com', password: 'admin123' })
    });
    const loginRes = await loginResRaw.json();
    const token = loginRes.token;
    if (!token) {
      console.error('Login failed', loginRes);
      process.exit(1);
    }

    // Create tenant
    const payload = {
      name: 'API Tenant',
      email: `tenant_${Date.now()}@example.com`,
      phone: '9876543210',
      roomNumber: '101',
      idType: 'aadhaar',
      idNumber: '123456789012'
    };

    const createResRaw = await fetch('http://localhost:5000/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const createRes = await createResRaw.json();
    console.log('Create status:', createResRaw.status, createRes);

    // Delete created tenant using API
    const createdId = createRes?.tenant?._id;
    if (createdId) {
      const delResRaw = await fetch(`http://localhost:5000/api/tenants/${createdId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const delRes = await delResRaw.json();
      console.log('Delete status:', delResRaw.status, delRes);
    } else {
      console.warn('No created tenant id found, skipping delete test');
    }

    // Fetch list
    const listResRaw = await fetch('http://localhost:5000/api/tenants', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = await listResRaw.json();
    console.log('Tenants count:', list.length);

    // Clean up created tenant
    const Tenant = require('../models/Tenant');
    await Tenant.deleteOne({ email: payload.email });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();