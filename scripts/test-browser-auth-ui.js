// Browser-accurate DOM simulation test for auth-ui.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'auth.html'), 'utf8');

// DOM elements store
const elements = new Map();

function createMockElement(id, tagName = 'div') {
  const classListSet = new Set();
  const listeners = {};
  
  const el = {
    id: id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    readOnly: false,
    type: 'text',
    style: {},
    dataset: {},
    classList: {
      add: (c) => classListSet.add(c),
      remove: (c) => classListSet.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classListSet.has(c)) classListSet.delete(c);
          else classListSet.add(c);
        } else if (force) {
          classListSet.add(c);
        } else {
          classListSet.delete(c);
        }
      },
      contains: (c) => classListSet.has(c)
    },
    addEventListener: (evt, fn) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    dispatchEvent: (evt) => {
      const fns = listeners[evt.type] || [];
      for (const fn of fns) fn(evt);
    },
    click: () => {
      el.dispatchEvent({ type: 'click', preventDefault: () => {} });
    },
    focus: () => {}
  };

  // Add initial classes from HTML if present
  const regex = new RegExp(`id="${id}"[^>]*class="([^"]*)"`);
  const match = html.match(regex);
  if (match) {
    match[1].split(/\s+/).forEach(c => classListSet.add(c));
  }

  elements.set(id, el);
  return el;
}

// Setup simulated window and document
global.window = global;
global.window.addEventListener = (evt, fn) => {};
global.window.removeEventListener = (evt, fn) => {};
global.document = {
  readyState: 'complete',
  documentElement: createMockElement('html'),
  getElementById: (id) => {
    if (elements.has(id)) return elements.get(id);
    if (html.includes(`id="${id}"`)) {
      return createMockElement(id);
    }
    return null;
  },
  querySelectorAll: (selector) => {
    if (selector.includes('toggle-password')) return [];
    if (selector.includes('trigger-owner-setup-link')) return [];
    return [];
  },
  addEventListener: () => {}
};

global.location = {
  pathname: '/auth.html',
  search: '',
  href: 'http://localhost:3000/auth.html'
};
global.history = {
  replaceState: (s, t, url) => { global.location.search = url.includes('?') ? url.split('?')[1] : ''; }
};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.CustomEvent = class { constructor(t, d) { this.type = t; this.detail = d ? d.detail : null; } };
global.dispatchEvent = () => {};

// Mock Supabase
global.window.supabase = {
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({
        order: () => ({ limit: async () => ({ data: [], error: null }) })
      })
    }),
    rpc: async (name, params) => {
      if (name === 'bootstrap_admin') {
        // Probe returns no active admin exists
        return { error: { message: 'User account not found in auth.users. Please sign up or create the account first.' } };
      }
      return { data: null, error: null };
    }
  })
};

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

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING BROWSER AUTH UI INTERACTION TESTS');
  console.log('====================================================\n');

  // Load scripts
  require('../js/supabase-config.js');
  const authCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');
  eval(authCode);
  const authUiCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth-ui.js'), 'utf8');
  eval(authUiCode);

  // Wait for init
  await window.authService.ready;
  // Trigger DOMContentLoaded
  await new Promise(r => setTimeout(r, 100));

  // TEST 1: Supabase Live Badge
  console.log('--- TEST 1: Mode Badge Verification ---');
  const badge = document.getElementById('auth-mode-badge');
  assert(badge.textContent.includes('Supabase Live'), `Mode badge updated to "⚡ Supabase Live" (actual: "${badge.textContent}")`);

  // TEST 2: Tab Switching to "Create Account"
  console.log('\n--- TEST 2: Click "Create Account" Tab ---');
  const createAccountTab = document.getElementById('auth-mode-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const adminForm = document.getElementById('admin-setup-form');

  assert(createAccountTab !== null, 'Create Account tab exists in DOM');
  createAccountTab.click();

  assert(loginForm.classList.contains('hidden'), 'Login form is hidden after clicking Create Account tab');
  assert(!signupForm.classList.contains('hidden'), 'Signup form is VISIBLE after clicking Create Account tab');
  assert(adminForm.classList.contains('hidden'), 'Admin setup form is hidden in signup mode');

  // TEST 3: Click "Trip Owner? Set Up Admin Account"
  console.log('\n--- TEST 3: Click "Trip Owner? Set Up Admin Account" ---');
  const adminOwnerBtn = document.getElementById('trigger-owner-admin-btn');
  assert(adminOwnerBtn !== null, 'Admin setup button exists in DOM');
  
  adminOwnerBtn.click();

  assert(!adminForm.classList.contains('hidden'), 'Admin setup form is VISIBLE after clicking Admin Setup button');
  assert(loginForm.classList.contains('hidden'), 'Login form is hidden in admin-setup mode');
  assert(signupForm.classList.contains('hidden'), 'Signup form is hidden in admin-setup mode');

  const adminEmailField = document.getElementById('admin-email');
  assert(adminEmailField && adminEmailField.value === 'harshitvaidya28@gmail.com', 
    `Admin email is pre-filled with authorized address: ${adminEmailField ? adminEmailField.value : 'missing'}`);

  // TEST 4: Click "Cancel & Return to Member Log In" from Admin Setup
  console.log('\n--- TEST 4: Return to Login ---');
  const backToLoginBtn = document.getElementById('admin-setup-back');
  assert(backToLoginBtn !== null, 'Back to login button exists');
  backToLoginBtn.click();

  assert(!loginForm.classList.contains('hidden'), 'Login form is VISIBLE after clicking Back to Login');
  assert(adminForm.classList.contains('hidden'), 'Admin setup form is hidden after returning to Login');

  // TEST 5: Verify window.chroniclesUtils exists and does not crash
  console.log('\n--- TEST 5: window.chroniclesUtils Verification ---');
  assert(typeof window.chroniclesUtils === 'object', 'window.chroniclesUtils is defined');
  assert(typeof window.chroniclesUtils.defaultAvatar === 'function', 'window.chroniclesUtils.defaultAvatar is a function');
  assert(typeof window.chroniclesUtils.fileToDataUrl === 'function', 'window.chroniclesUtils.fileToDataUrl is a function');

  console.log('\n====================================================');
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
