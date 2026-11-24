const https = require('https');

const supabaseUrl = 'https://taadgybxbhgsschluqla.supabase.co';
const anonKey = 'sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE';

function probeAdminExists() {
  return new Promise((resolve) => {
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
          const msg = (parsed.message || '').toLowerCase();
          if (msg.includes('already exists')) {
            resolve({ exists: true, message: parsed.message });
          } else if (msg.includes('user account not found') || msg.includes('not found')) {
            resolve({ exists: false, message: parsed.message });
          } else {
            resolve({ exists: false, message: parsed.message });
          }
        } catch (e) {
          resolve({ exists: false, message: body });
        }
      });
    });

    req.on('error', (err) => resolve({ exists: false, error: err.message }));
    req.write(postData);
    req.end();
  });
}

probeAdminExists().then(res => {
  console.log('Probe result:', res);
});
