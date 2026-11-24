// Diagnose JavaScript execution errors in auth.html scripts
const fs = require('fs');
const path = require('path');

// Setup DOM globals
const html = fs.readFileSync(path.join(__dirname, '..', 'auth.html'), 'utf8');

global.window = global;
global.document = {
  readyState: 'loading',
  documentElement: {
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    }
  },
  getElementById: (id) => {
    // Check if ID exists in auth.html
    const exists = html.includes(`id="${id}"`);
    if (!exists) {
      console.warn(`[WARN] getElementById('${id}') NOT found in auth.html!`);
      return null;
    }
    return {
      id: id,
      classList: {
        add: () => {},
        remove: () => {},
        toggle: (c, v) => console.log(`classList.toggle on #${id}: ${c} = ${v}`),
        contains: () => false
      },
      addEventListener: (evt, fn) => {
        // console.log(`addEventListener on #${id} for ${evt}`);
      },
      focus: () => {},
      textContent: '',
      innerHTML: '',
      value: '',
      style: {}
    };
  },
  querySelectorAll: (selector) => [],
  addEventListener: (evt, fn) => {}
};
global.location = {
  pathname: '/auth.html',
  search: '',
  href: 'http://localhost:3000/auth.html'
};
global.history = {
  replaceState: () => {}
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.CustomEvent = class { constructor(n, o) { this.type = n; this.detail = o ? o.detail : null; } };
global.dispatchEvent = () => {};

// Mock Supabase CDN
global.window.supabase = {
  createClient: (url, key) => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              limit: async () => ({ data: [], error: null })
            })
          })
        })
      })
    }),
    rpc: async (name, params) => {
      console.log(`[RPC CALL] ${name}`, params);
      return { data: null, error: null };
    }
  })
};

console.log('Loading scripts in order...');

try {
  console.log('1. Loading js/supabase-config.js');
  require('../js/supabase-config.js');
  console.log('supabaseConfig:', window.supabaseConfig);
  console.log('isSupabaseConfigured():', window.isSupabaseConfigured());

  console.log('2. Loading js/auth.js');
  const authCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');
  eval(authCode);
  console.log('authService mode:', window.authService.mode);

  console.log('3. Loading js/auth-ui.js');
  const authUiCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth-ui.js'), 'utf8');
  eval(authUiCode);
  console.log('auth-ui.js loaded successfully without syntax errors.');

} catch (err) {
  console.error('DIAGNOSTIC ERROR CAUGHT:', err);
}
