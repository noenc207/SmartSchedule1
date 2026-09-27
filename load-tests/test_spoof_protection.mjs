async function testSpoofProtection() {
  console.log("=== TESTING X-FORWARDED-FOR SPOOFING PREVENTION THROUGH NGINX ===");
  const ts = Date.now();
  const responses = [];

  // Attacker tries to bypass rate limit by sending a different fake X-Forwarded-For on every request:
  for (let i = 1; i <= 8; i++) {
    const fakeIp = `203.0.113.${100 + i}`;
    const r = await fetch("http://localhost:80/api/v1/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": fakeIp, // Attacker spoofed header
        "X-Real-IP": fakeIp        // Attacker spoofed header
      },
      body: JSON.stringify({
        displayName: `Attacker ${i}`,
        email: `attacker_${i}_${ts}@evil.test`,
        password: "Password123!",
        activationKey: "SMART-STAGE-825881097B854931"
      })
    });
    responses.push({ requestNum: i, spoofedIp: fakeIp, status: r.status });
  }

  console.table(responses);
  const blocked = responses.filter(r => r.status === 429).length;
  if (blocked > 0) {
    console.log(`\nSUCCESS: Attacker was blocked (${blocked} requests received HTTP 429).`);
    console.log("Nginx stripped spoofed client headers and enforced rate limit on real TCP peer IP.");
  } else {
    console.log("\nFAILURE: Attacker successfully bypassed rate limiter with spoofed IP!");
  }
}

testSpoofProtection().catch(console.error);
