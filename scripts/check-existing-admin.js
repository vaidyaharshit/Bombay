const https = require('https');

const supabaseUrl = 'https://taadgybxbhgsschluqla.supabase.co';
const anonKey = 'sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE';

function checkProfiles() {
  const url = new URL(`${supabaseUrl}/rest/v1/profiles?select=id,full_name,email,role,role_status,account_status`);

  const req = https.get(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('HTTP Status:', res.statusCode);
      try {
        const data = JSON.parse(body);
        console.log('Profiles currently in Supabase:', data);
      } catch (e) {
        console.log('Raw response:', body);
      }
    });
  });

  req.on('error', console.error);
}

checkProfiles();
