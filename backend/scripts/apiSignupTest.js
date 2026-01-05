(async () => {
  try {
    const email = `apitest_${Date.now()}@example.com`;
    const payload = {
      name: 'API Test User',
      email,
      address: 'API Test Address',
      idType: 'pan',
      idNumber: 'ABCDE1234F',
      password: 'testpass',
      role: 'tenant'
    };

    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);

    // Clean up: delete created user directly using mongoose
    if (data?.user?.email) {
      // Wait briefly for DB consistency
      const mongoose = require('mongoose');
      const db = require('../db');
      await db();
      const User = require('../models/User');
      await User.deleteOne({ email: data.user.email });
      console.log('Cleaned up test user:', data.user.email);
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();