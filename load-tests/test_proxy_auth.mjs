async function testProxyAuth() {
  const ts = Date.now();
  console.log("=== 1. TESTING INVALID ACTIVATION KEY VIA NGINX ===");
  const badRes = await fetch("http://localhost:80/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.10" },
    body: JSON.stringify({
      displayName: "Bad Key User",
      email: `bad_${ts}@test.local`,
      password: "Password123!",
      activationKey: "SMART-DEPLOY-2026"
    })
  });
  const badBody = await badRes.json();
  console.log("Status:", badRes.status, "Body:", badBody);

  console.log("\n=== 2. TESTING VALID ROTATED KEY VIA NGINX ===");
  const goodRes = await fetch("http://localhost:80/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.11" },
    body: JSON.stringify({
      displayName: "Good Key User",
      email: `good_${ts}@test.local`,
      password: "Password123!",
      activationKey: "SMART-STAGE-825881097B854931"
    })
  });
  const goodBody = await goodRes.json();
  console.log("Status:", goodRes.status, "User Tier:", goodBody.user?.tier);

  console.log("\n=== 3. TESTING RATE LIMITING VIA NGINX (Real IP Tracking) ===");
  const clientIp = "198.51.100.99";
  for (let i = 1; i <= 7; i++) {
    const r = await fetch("http://localhost:80/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": clientIp },
      body: JSON.stringify({
        displayName: `Rate User ${i}`,
        email: `rate_${i}_${ts}@test.local`,
        password: "Password123!",
        activationKey: "SMART-STAGE-825881097B854931"
      })
    });
    console.log(`Request #${i}: status = ${r.status}`);
  }
}

testProxyAuth().catch(console.error);
