const fetch = globalThis.fetch || require('node-fetch');
const db = require('../db');

(async () => {
  try {
    await db();

    // 1) Signup as tenant
    const email = `signup_test_${Date.now()}@example.com`;
    const signupResRaw = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Signup Test', email, password: 'password123', role: 'tenant' })
    });
    const signup = await signupResRaw.json();
    console.log('Signup status:', signupResRaw.status, signup);

    // 2) Login as admin
    const loginResRaw = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pgmanagement.com', password: 'admin123' })
    });
    const login = await loginResRaw.json();
    const token = login.token;
    if (!token) {
      console.error('Admin login failed:', login);
      process.exit(1);
    }

    // 3) Get pending
    const pendingRaw = await fetch('http://localhost:5000/api/users/pending', { headers: { Authorization: `Bearer ${token}` } });
    const pending = await pendingRaw.json();
    console.log('Pending count:', pending.length);

    const match = pending.find(p => p.email === email);
    if (!match) {
      console.error('Signup not found in pending list');
      process.exit(1);
    }

    // 4) Approve
    const approveRaw = await fetch(`http://localhost:5000/api/users/${match._id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const approve = await approveRaw.json();
    console.log('Approve status:', approveRaw.status, approve);

    // 5) Fetch tenants
    const tenantsRaw = await fetch('http://localhost:5000/api/tenants', { headers: { Authorization: `Bearer ${token}` } });
    const tenants = await tenantsRaw.json();
    console.log('Tenants count:', tenants.length, tenants.find(t => t.email === email) ? 'New tenant present' : 'Not found');

    // Cleanup: delete created tenant and user
    const created = tenants.find(t => t.email === email);
    if (created) {
      await fetch(`http://localhost:5000/api/tenants/${created._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }

    await fetch(`http://localhost:5000/api/users/${match._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

    process.exit(0);
  } catch (err) {
    console.error('Error in test:', err);
    process.exit(1);
  }
})();