(async () => {
  try {
    const payload = { email: 'admin@pgmanagement.com', password: 'admin123' };
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
    process.exit(res.status === 200 ? 0 : 1);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();