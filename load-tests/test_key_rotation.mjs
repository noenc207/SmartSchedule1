async function testKeyRotation() {
  console.log('--- Testing Activation Key Rotation ---');
  const oldKey = 'SMART-DEPLOY-2026';
  const newKey = 'SMART-STAGE-825881097B854931';

  // 1. Attempt register with OLD compromised key
  const oldRes = await fetch('http://localhost:8080/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.50.0.1' },
    body: JSON.stringify({
      displayName: 'Old Key User',
      email: 'old_key@example.com',
      password: 'Password123!',
      activationKey: oldKey,
    }),
  });
  const oldBody = await oldRes.json().catch(() => ({}));
  console.log(`[OLD KEY] Status: HTTP ${oldRes.status} | Code: ${oldBody.code || 'UNKNOWN'}`);

  // 2. Attempt register with NEW rotated key
  const newRes = await fetch('http://localhost:8080/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.50.0.2' },
    body: JSON.stringify({
      displayName: 'Staging Admin User',
      email: 'staging_admin@smartschedule.local',
      password: 'Password123!',
      activationKey: newKey,
    }),
  });
  const newBody = await newRes.json().catch(() => ({}));
  console.log(`[NEW KEY] Status: HTTP ${newRes.status} | User Tier: ${newBody.user?.tier} | AccessToken: ${!!newBody.accessToken}`);

  // 3. Verify Rate Limiter on staging backend (5 allowed, 6th blocked)
  console.log('\n--- Verifying Rate Limiting on Staging Backend ---');
  const fixedIp = '10.60.0.99';
  for (let i = 1; i <= 7; i++) {
    const r = await fetch('http://localhost:8080/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': fixedIp },
      body: JSON.stringify({
        displayName: `Rate VU ${i}`,
        email: `rate_${Date.now()}_${i}@example.com`,
        password: 'Password123!',
        activationKey: newKey,
      }),
    });
    const b = await r.json().catch(() => ({}));
    console.log(`[Rate Test Req ${i}] HTTP ${r.status} | Code: ${b.code || 'SUCCESS'}`);
  }
}

testKeyRotation();
