async function test() {
  console.log('Testing Rate Limiting Filter on /api/v1/auth/register (Threshold: 5/min)...');
  const fixedIp = '192.168.88.88';
  for (let i = 1; i <= 7; i++) {
    const res = await fetch('http://localhost:8080/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': fixedIp,
      },
      body: JSON.stringify({
        displayName: `RateUser ${i}`,
        email: `ratelimit_${Date.now()}_${i}@test.com`,
        password: 'Password123!',
        activationKey: 'SMART-DEPLOY-2026',
      }),
    });
    const text = await res.text();
    let body = {};
    try { body = JSON.parse(text); } catch {}
    console.log(`[Request ${i}] Status: HTTP ${res.status} | Code: ${body.code || 'SUCCESS'}`);
  }
}

test();
