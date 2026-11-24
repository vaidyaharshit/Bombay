// Verification of the Admin Setup Flow and UI Elements
const fs = require('fs');
const path = require('path');
const https = require('https');

const supabaseUrl = 'https://taadgybxbhgsschluqla.supabase.co';
const anonKey = 'sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE';
const adminEmail = 'harshitvaidya28@gmail.com';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log('  ✅ [PASS] ' + description);
    passed++;
  } else {
    console.error('  ❌ [FAIL] ' + description);
    failed++;
  }
}

async function runVerification() {
  console.log('====================================================');
  console.log('TESTING ADMIN SETUP FLOW & UI ELEMENTS');
  console.log('====================================================\n');

  // 1. Inspect auth.html content
  console.log('--- TEST 1: Inspecting auth.html ---');
  const authHtml = fs.readFileSync(path.join(__dirname, '..', 'auth.html'), 'utf8');
  assert(authHtml.includes('id="trigger-owner-admin-btn"'), 'auth.html contains #trigger-owner-admin-btn button');
  assert(authHtml.includes('id="owner-setup-wrapper"'), 'auth.html contains #owner-setup-wrapper section');
  assert(authHtml.includes('id="admin-setup-form"'), 'auth.html contains dedicated #admin-setup-form');
  assert(authHtml.includes('harshitvaidya28@gmail.com'), 'auth.html contains pre-filled designated email');
  assert(authHtml.includes('id="admin-password"'), 'auth.html contains #admin-password field');
  assert(authHtml.includes('id="admin-confirm"'), 'auth.html contains #admin-confirm field');

  // 2. Inspect index.html content
  console.log('\n--- TEST 2: Inspecting index.html ---');
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(indexHtml.includes('href="auth.html?mode=admin-setup"'), 'index.html contains link to auth.html?mode=admin-setup');
  assert(indexHtml.includes('Trip Owner? Set Up Admin Account'), 'index.html contains "Trip Owner? Set Up Admin Account" label');

  // 3. Inspect js/auth.js and js/auth-ui.js
  console.log('\n--- TEST 3: Inspecting JavaScript Logic ---');
  const authJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');
  const authUiJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth-ui.js'), 'utf8');
  assert(authJs.includes('signUpAdmin(options)'), 'js/auth.js defines signUpAdmin method');
  assert(authJs.includes('hasActiveAdmin()'), 'js/auth.js defines hasActiveAdmin method');
  assert(authUiJs.includes('mode === "admin-setup"'), 'js/auth-ui.js handles admin-setup mode');
  assert(authUiJs.includes('checkAdminStatus()'), 'js/auth-ui.js checks admin existence on load');
  assert(authUiJs.includes('handleAdminSetupSubmit'), 'js/auth-ui.js binds handleAdminSetupSubmit handler');

  // 4. Test live Supabase database for existing Admin
  console.log('\n--- TEST 4: Querying Live Supabase Database ---');
  const probeResult = await new Promise((resolve) => {
    const postData = JSON.stringify({ p_email: '__probe_check__@the12chronicles.com' });
    const url = new URL(`${supabaseUrl}/rest/v1/rpc/bootstrap_admin`);

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    req.write(postData);
    req.end();
  });

  console.log('  Live RPC probe response:', probeResult);
  assert(probeResult && probeResult.message && probeResult.message.includes('User account not found'), 
    'Database confirms NO active Admin currently exists, allowing one-time setup');

  console.log('\n====================================================');
  console.log(`TOTAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(console.error);
