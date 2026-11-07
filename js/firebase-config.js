// The 12 Chronicles — Firebase Configuration
// Replace these placeholders with your actual Firebase project credentials from the Firebase Console:
// https://console.firebase.google.com

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-PLACEHOLDER_KEY_HERE_FOR_IITB_CHRONICLES",
  authDomain: "the-12-chronicles-techfest.firebaseapp.com",
  projectId: "the-12-chronicles-techfest",
  storageBucket: "the-12-chronicles-techfest.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Allow runtime override via localStorage for quick testing without file edits
function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('chronicles_firebase_config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not read saved Firebase config:", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

window.firebaseConfig = getActiveFirebaseConfig();
window.isFirebaseConfigured = function() {
  const cfg = window.firebaseConfig;
  return cfg && cfg.apiKey && !cfg.apiKey.includes('PLACEHOLDER');
};
