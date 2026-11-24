// The 12 Chronicles — Supabase Admin Bootstrap Tool
const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL || 'https://taadgybxbhgsschluqla.supabase.co';
const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE';
const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'harshitvaidya28@gmail.com';

function callRpc(name, params) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(params);
    const url = new URL(`${supabaseUrl}/rest/v1/rpc/${name}`);

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
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: body });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('THE 12 CHRONICLES — ADMIN BOOTSTRAP TOOL');
  console.log('====================================================');
  console.log(`Target Supabase URL: ${supabaseUrl}`);
  console.log(`Target Admin Email:  ${adminEmail}`);
  console.log('');

  console.log('Calling PostgreSQL bootstrap_admin()...');
  const res = await callRpc('bootstrap_admin', { p_email: adminEmail });

  if (res.status >= 200 && res.status < 300) {
    console.log(`✅ Success! Admin profile for "${adminEmail}" is approved and active in PostgreSQL.`);
    console.log('You can now log in at http://localhost:3000/auth.html and access http://localhost:3000/admin.html.');
  } else {
    try {
      const err = JSON.parse(res.data);
      console.log(`ℹ️ Response (${res.status}): ${err.message}`);
      if (err.message.includes('User account not found')) {
        console.log('');
        console.log('👉 Next Step: Sign up the account first:');
        console.log(`1. Open http://localhost:3000/auth.html`);
        console.log(`2. Click "👑 Trip Owner? Set Up Admin Account" or enter ${adminEmail} and choose your password.`);
        console.log(`3. Your Admin account will be immediately authenticated and granted sole ownership!`);
      } else if (err.message.includes('already exists')) {
        console.log('✅ The Admin account is already configured. Simply log in with your credentials at /auth.html.');
      }
    } catch (e) {
      console.log('Raw response:', res.data);
    }
  }
}

run().catch(console.error);
