// Test connection to user's Supabase project
const https = require('https');

const supabaseUrl = 'https://taadgybxbhgsschluqla.supabase.co';
const anonKey = 'sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE';

async function testConnection() {
  console.log('Testing connection to Supabase:', supabaseUrl);

  // Test 1: Check Auth health
  const authUrl = `${supabaseUrl}/auth/v1/settings`;
  
  const req = https.get(authUrl, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log(`Auth endpoint response status: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(data);
        console.log('Auth endpoint settings/version response:', Object.keys(parsed));
      } catch (e) {
        console.log('Raw response:', data.slice(0, 200));
      }

      // Test 2: Check REST API for explore_destinations or profiles table
      testRestApi();
    });
  });

  req.on('error', (err) => {
    console.error('Connection failed:', err.message);
  });
}

function testRestApi() {
  const restUrl = `${supabaseUrl}/rest/v1/explore_destinations?select=count`;
  const req = https.get(restUrl, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Range-Unit': 'items',
      'Prefer': 'count=exact'
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log(`REST table check status: ${res.statusCode}`);
      console.log(`Content-Range / response:`, res.headers['content-range'] || data.slice(0, 200));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ Supabase connection verified successfully! Schema is accessible.');
      } else {
        console.log('Response code detail:', res.statusCode, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('REST request error:', err.message);
  });
}

testConnection();
