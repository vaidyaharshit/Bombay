const https = require('https');

const supabaseUrl = 'https://taadgybxbhgsschluqla.supabase.co';
const anonKey = 'sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE';
const adminEmail = 'harshitvaidya28@gmail.com';

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

async function check() {
  console.log(`Checking bootstrap_admin for ${adminEmail}...`);
  try {
    const result = await callRpc('bootstrap_admin', { p_email: adminEmail });
    console.log('RPC Result status:', result.status);
    console.log('RPC Result body:', result.data);
  } catch (err) {
    console.error('Error calling RPC:', err);
  }
}

check();
