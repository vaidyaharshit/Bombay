// The 12 Chronicles — Supabase Configuration
// Configure your Supabase project credentials below or via the in-app connection modal.

(function () {
  "use strict";

  const STORAGE_KEY = "chronicles_supabase_config";

  const DEFAULT_CONFIG = {
    supabaseUrl: "https://taadgybxbhgsschluqla.supabase.co",
    supabaseAnonKey: "sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE",
    initialAdminEmail: "harshitvaidya28@gmail.com"
  };

  function getActiveConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read saved Supabase config from localStorage:", e);
    }

    if (window.CHRONICLES_ENV && window.CHRONICLES_ENV.SUPABASE_URL) {
      return {
        supabaseUrl: window.CHRONICLES_ENV.SUPABASE_URL,
        supabaseAnonKey: window.CHRONICLES_ENV.SUPABASE_ANON_KEY || ""
      };
    }

    return DEFAULT_CONFIG;
  }

  window.supabaseConfig = getActiveConfig();

  window.isSupabaseConfigured = function () {
    const cfg = window.supabaseConfig;
    return !!(
      cfg &&
      cfg.supabaseUrl &&
      cfg.supabaseUrl.trim() &&
      !cfg.supabaseUrl.includes("your-project-id") &&
      cfg.supabaseAnonKey &&
      cfg.supabaseAnonKey.trim() &&
      !cfg.supabaseAnonKey.includes("...")
    );
  };
})();
