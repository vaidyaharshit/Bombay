// The 12 Chronicles — Supabase Configuration
// Supports Vercel environment variables (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) and hardcoded production fallbacks.

(function () {
  "use strict";

  const STORAGE_KEY = "chronicles_supabase_config";

  const DEFAULT_CONFIG = {
    supabaseUrl: "https://taadgybxbhgsschluqla.supabase.co",
    supabaseAnonKey: "sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE",
    initialAdminEmail: "harshitvaidya28@gmail.com"
  };

  function isValid(url, key) {
    return !!(
      url && typeof url === "string" && url.trim() &&
      !url.includes("your-project-id") &&
      key && typeof key === "string" && key.trim() &&
      !key.includes("...")
    );
  }

  function getActiveConfig() {
    // 1. Check window.CHRONICLES_ENV (injected by Vercel server.js runtime)
    if (window.CHRONICLES_ENV) {
      const url = window.CHRONICLES_ENV.SUPABASE_URL;
      const key = window.CHRONICLES_ENV.SUPABASE_PUBLISHABLE_KEY || window.CHRONICLES_ENV.SUPABASE_ANON_KEY;
      if (isValid(url, key)) {
        return {
          supabaseUrl: url.trim(),
          supabaseAnonKey: key.trim(),
          initialAdminEmail: DEFAULT_CONFIG.initialAdminEmail
        };
      }
    }

    // 2. Check localStorage (only if valid, ignoring placeholders)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && isValid(parsed.supabaseUrl, parsed.supabaseAnonKey)) {
          return {
            supabaseUrl: parsed.supabaseUrl.trim(),
            supabaseAnonKey: parsed.supabaseAnonKey.trim(),
            initialAdminEmail: DEFAULT_CONFIG.initialAdminEmail
          };
        }
      }
    } catch (e) {
      console.warn("Could not read saved Supabase config from localStorage:", e);
    }

    // 3. Fallback to default real project config
    return DEFAULT_CONFIG;
  }

  window.supabaseConfig = getActiveConfig();

  window.isSupabaseConfigured = function () {
    const cfg = window.supabaseConfig;
    return !!(cfg && isValid(cfg.supabaseUrl, cfg.supabaseAnonKey));
  };
})();
