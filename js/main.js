// The 12 Chronicles — Main Shared Controller & Global Navigation

(function () {
  "use strict";

  const PRIVATE_LINKS = [
    { name: "Schedule", href: "schedule.html" },
    { name: "Explore", href: "explore.html" },
    { name: "Hall of Fame", href: "hall-of-fame.html" },
    { name: "Planner", href: "planner.html" },
    { name: "Squad", href: "squad.html" },
    { name: "Expenses", href: "expenses.html" },
    { name: "Memories", href: "memories.html" }
  ];

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  function roleBadge(user) {
    if (!user) return "";
    const label = user.effectiveRole || "Member";
    const isAdmin = label === "Admin";
    const isPending = user.role === "Treasurer" && user.roleStatus === "pending";
    const classes = isAdmin
      ? "bg-[#C76B4A] text-white"
      : isPending
        ? "bg-[#C76B4A]/15 text-[#C76B4A]"
        : label === "Treasurer"
          ? "bg-[#354B3A] text-white"
          : "bg-[#A4A88A]/30 text-[#354B3A]";
    return '<span class="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider ' +
      classes + ' font-bold whitespace-nowrap">' + escapeHtml(isPending ? "Treasurer pending" : label) + "</span>";
  }

  function initNavigation() {
    const navContainer = document.getElementById("global-nav");
    if (!navContainer) return;

    const rawPath = window.location.pathname.split("/").pop() || "index.html";
    const currentPath = (!rawPath || rawPath === "/") ? "index.html" : (rawPath.endsWith(".html") ? rawPath : (rawPath + ".html"));
    const user = window.authService ? window.authService.getCurrentUser() : null;
    const authenticated = !!user;
    const isAdmin = !!(window.authService && window.authService.isAdmin());
    const privateLinks = PRIVATE_LINKS.concat(isAdmin ? [{ name: "Admin", href: "admin.html" }] : []);
    const navLinks = [{ name: "Home", href: "index.html" }].concat(authenticated ? privateLinks : []);
    const avatar = user && user.avatar ? user.avatar : "";
    const displayName = user ? (user.nickname || user.fullName) : "";
    const pending = user && user.role === "Treasurer" && user.roleStatus === "pending";

    const linkMarkup = function (link, mobile) {
      const isActive = currentPath === link.href || (currentPath === "" && link.href === "index.html");
      if (mobile) {
        return '<a href="' + link.href + '" class="block px-3 py-2 text-base font-medium rounded-md ' +
          (isActive ? "text-[#354B3A] bg-[#354B3A]/10 font-bold" : "text-[#282824]/80 hover:text-[#354B3A] hover:bg-[#A4A88A]/10") +
          '">' + escapeHtml(link.name) + "</a>";
      }
      return '<a href="' + link.href + '" class="px-3.5 py-2 text-sm font-medium rounded-lg transition-all ' +
        (isActive
          ? "text-[#354B3A] bg-[#354B3A]/10 font-semibold"
          : "text-[#282824]/80 hover:text-[#354B3A] hover:bg-[#A4A88A]/15") +
        '">' + escapeHtml(link.name) + "</a>";
    };

    const guestActions = `
      <div class="flex items-center gap-2">
        <a href="auth.html?mode=login" class="px-3.5 py-2 text-sm font-semibold text-[#354B3A] rounded-lg hover:bg-[#354B3A]/10 transition-colors">
          Log In
        </a>
        <a href="auth.html?mode=signup" class="px-4 py-2 text-sm font-semibold text-white bg-[#354B3A] hover:bg-[#243428] rounded-lg transition-colors shadow-sm">
          Join with Invite
        </a>
      </div>
    `;

    const memberActions = authenticated ? `
      <div class="relative" id="member-dropdown-container">
        <button id="member-dropdown-btn" class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-full border border-[#A4A88A]/40 bg-white hover:border-[#354B3A] transition-all shadow-sm">
          <img src="${escapeHtml(avatar)}" alt="${escapeHtml(user.fullName)}" class="w-8 h-8 rounded-full object-cover ring-1 ring-[#354B3A]/20" />
          <div class="text-left hidden md:block">
            <div class="text-xs font-semibold text-[#282824] leading-tight flex items-center gap-1.5 max-w-[12rem]">
              <span class="truncate">${escapeHtml(displayName)}</span>
            </div>
            <div class="mt-0.5">${roleBadge(user)}</div>
          </div>
          <svg class="w-3.5 h-3.5 text-[#282824]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <div id="member-dropdown-menu" class="hidden absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#A4A88A]/30 py-2 z-50 animate-fade-in">
          <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <img src="${escapeHtml(avatar)}" class="w-10 h-10 rounded-full object-cover" alt="" />
            <div class="min-w-0">
              <p class="text-sm font-bold text-[#282824] truncate">${escapeHtml(user.fullName)}</p>
              <p class="text-[11px] text-[#A4A88A] truncate">${escapeHtml(user.email)}</p>
              <div class="mt-1">${roleBadge(user)}</div>
            </div>
          </div>
          ${pending ? '<div class="mx-3 mt-2 p-2.5 rounded-lg bg-[#C76B4A]/10 border border-[#C76B4A]/25 text-[11px] text-[#8f3f26] leading-relaxed">Treasurer access is pending Admin approval. You have Member access for now.</div>' : ""}
          <div class="py-1">
            <a href="squad.html" class="block px-4 py-2 text-xs font-semibold text-[#282824] hover:bg-[#F7F4EC]">My Squad Profile</a>
            ${isAdmin ? '<a href="admin.html" class="block px-4 py-2 text-xs font-semibold text-[#C76B4A] hover:bg-[#F7F4EC]">Admin Control Panel</a>' : ""}
            ${window.authService && window.authService.canManageExpenses() ? '<a href="expenses.html" class="block px-4 py-2 text-xs font-semibold text-[#282824] hover:bg-[#F7F4EC]">Manage Expense Ledger</a>' : ""}
          </div>
          <div class="border-t border-gray-100 px-3 py-2">
            <button id="member-logout-btn" class="w-full text-left px-3 py-2 text-xs font-bold text-[#C76B4A] rounded-lg hover:bg-[#C76B4A]/10 transition-colors">
              Log Out
            </button>
          </div>
        </div>
      </div>
    ` : "";

    navContainer.innerHTML = `
      <header class="sticky top-0 z-40 bg-[#F7F4EC]/90 backdrop-blur-md border-b border-[#A4A88A]/30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20 gap-4">
            <a href="index.html" class="flex items-center gap-3 group flex-shrink-0">
              <div class="w-10 h-10 rounded-full bg-[#354B3A] text-white flex items-center justify-center font-serif text-lg font-bold group-hover:bg-[#C76B4A] transition-colors shadow-sm">12</div>
              <div>
                <span class="font-serif font-bold text-xl sm:text-2xl text-[#282824] tracking-tight group-hover:text-[#354B3A] transition-colors">The 12 Chronicles</span>
                <span class="hidden md:block text-[11px] uppercase tracking-widest text-[#A4A88A] font-semibold">IIT Bombay Techfest × Mumbai 2026</span>
              </div>
            </a>

            <nav class="hidden lg:flex items-center space-x-1">
              ${navLinks.map(function (link) { return linkMarkup(link, false); }).join("")}
            </nav>

            <div class="hidden sm:flex items-center gap-3">
              ${authenticated ? memberActions : guestActions}
            </div>

            <div class="flex items-center lg:hidden gap-2">
              <button id="mobile-menu-btn" class="p-2 rounded-lg text-[#282824] hover:bg-[#A4A88A]/20 transition-colors" aria-label="Toggle Navigation" aria-expanded="false">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div id="mobile-nav" class="hidden lg:hidden border-t border-[#A4A88A]/20 bg-[#F7F4EC] px-4 pt-3 pb-6 space-y-1">
          ${navLinks.map(function (link) { return linkMarkup(link, true); }).join("")}
          <div class="pt-4 mt-3 border-t border-[#A4A88A]/20">
            ${authenticated ? `
              <div class="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-[#A4A88A]/30">
                <img src="${escapeHtml(avatar)}" class="w-9 h-9 rounded-full object-cover" alt="" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-[#282824] truncate">${escapeHtml(user.fullName)}</p>
                  <p class="text-xs text-[#A4A88A] truncate">${escapeHtml(user.email)}</p>
                </div>
              </div>
              <div class="mt-2 px-3">${roleBadge(user)}</div>
              <a href="squad.html" class="block mt-3 px-3 py-2 text-sm font-semibold text-[#354B3A] rounded-lg hover:bg-[#354B3A]/10">My Squad Profile</a>
              ${isAdmin ? '<a href="admin.html" class="block px-3 py-2 text-sm font-semibold text-[#C76B4A] rounded-lg hover:bg-[#C76B4A]/10">Admin Control Panel</a>' : ""}
              <button id="mobile-logout-btn" class="w-full text-left mt-1 px-3 py-2 text-sm font-bold text-[#C76B4A] rounded-lg hover:bg-[#C76B4A]/10">Log Out</button>
            ` : `
              <a href="auth.html?mode=login" class="block px-3 py-2.5 text-sm font-semibold text-[#354B3A] rounded-lg hover:bg-[#354B3A]/10">Log In</a>
              <a href="auth.html?mode=signup" class="block mt-1 px-3 py-2.5 text-sm font-semibold text-white bg-[#354B3A] rounded-lg text-center">Join with Invite</a>
            `}
          </div>
        </div>
      </header>
    `;

    const dropdownBtn = document.getElementById("member-dropdown-btn");
    const dropdownMenu = document.getElementById("member-dropdown-menu");
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        dropdownMenu.classList.toggle("hidden");
      });
    }

    const logoutBtn = document.getElementById("member-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        window.authService.logout();
      });
    }

    const mobileLogoutBtn = document.getElementById("mobile-logout-btn");
    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener("click", function () {
        window.authService.logout();
      });
    }

    const mobileBtn = document.getElementById("mobile-menu-btn");
    const mobileNav = document.getElementById("mobile-nav");
    if (mobileBtn && mobileNav) {
      mobileBtn.addEventListener("click", function () {
        const hidden = mobileNav.classList.toggle("hidden");
        mobileBtn.setAttribute("aria-expanded", hidden ? "false" : "true");
      });
    }
  }

  document.addEventListener("click", function (event) {
    const dropdownMenu = document.getElementById("member-dropdown-menu");
    const dropdownBtn = document.getElementById("member-dropdown-btn");
    if (!dropdownMenu || !dropdownBtn) return;
    if (!dropdownMenu.contains(event.target) && !dropdownBtn.contains(event.target)) {
      dropdownMenu.classList.add("hidden");
    }
  });

  // Toast Notification System
  window.showToast = function (message, type) {
    const kind = type || "success";
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "fixed bottom-5 right-5 z-[70] flex flex-col gap-2 max-w-sm pointer-events-none";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-3 opacity-0 " +
      (kind === "success"
        ? "bg-[#354B3A] text-white border-[#354B3A]"
        : kind === "error"
          ? "bg-[#C76B4A] text-white border-[#C76B4A]"
          : "bg-[#282824] text-white border-[#282824]");

    toast.innerHTML = '<span class="flex-1">' + escapeHtml(message) + '</span>' +
      '<button class="text-white/70 hover:text-white" aria-label="Dismiss">✕</button>';
    toast.querySelector("button").addEventListener("click", function () { toast.remove(); });

    container.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.remove("translate-y-3", "opacity-0");
    });

    setTimeout(function () {
      toast.classList.add("opacity-0", "translate-y-3");
      setTimeout(function () { toast.remove(); }, 300);
    }, 4200);
  };

  function showStoredFlash() {
    try {
      const raw = sessionStorage.getItem("chronicles_flash");
      if (!raw) return;
      sessionStorage.removeItem("chronicles_flash");
      const flash = JSON.parse(raw);
      if (flash && flash.message) {
        window.showToast(flash.message, flash.type || "success");
      }
    } catch (error) {
      /* ignore malformed flash messages */
    }
  }

  // Live Countdown Timer to IIT Bombay Techfest 2026
  window.initCountdownTimer = function () {
    const daysEl = document.getElementById("countdown-days");
    const hoursEl = document.getElementById("countdown-hours");
    const minutesEl = document.getElementById("countdown-minutes");
    const secondsEl = document.getElementById("countdown-seconds");

    if (!daysEl) return;

    // Dec 25, 2026 09:00:00 IST = Dec 25, 2026 03:30:00 UTC
    const targetDate = Date.UTC(2026, 11, 25, 3, 30, 0);

    function update() {
      const distance = targetDate - Date.now();

      if (isNaN(distance) || distance < 0) {
        if (daysEl) daysEl.innerText = "00";
        if (hoursEl) hoursEl.innerText = "00";
        if (minutesEl) minutesEl.innerText = "00";
        if (secondsEl) secondsEl.innerText = "00";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (daysEl) daysEl.innerText = String(days).padStart(2, "0");
      if (hoursEl) hoursEl.innerText = String(hours).padStart(2, "0");
      if (minutesEl) minutesEl.innerText = String(minutes).padStart(2, "0");
      if (secondsEl) secondsEl.innerText = String(seconds).padStart(2, "0");
    }

    update();
    if (!window._countdownTimerInterval) {
      window._countdownTimerInterval = setInterval(update, 1000);
    }
  };

  // Supabase Configuration Modal
  window.openSupabaseSettingsModal = function () {
    let modal = document.getElementById("supabase-settings-modal");
    if (!modal) {
      const cfg = window.supabaseConfig || {};
      modal = document.createElement("div");
      modal.id = "supabase-settings-modal";
      modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in";
      modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#A4A88A]/30 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚡</span>
              <h3 class="font-serif text-xl font-bold text-[#282824]">Supabase Connection</h3>
            </div>
            <button id="close-supabase-cfg-btn" class="text-gray-400 hover:text-[#282824]">✕</button>
          </div>
          <p class="text-xs text-[#282824]/70 mb-4 leading-relaxed">
            The 12 Chronicles uses Supabase for Authentication, PostgreSQL, Realtime sync, and Storage. Enter your Project URL and public anon key below.
          </p>
          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-semibold text-[#A4A88A] uppercase mb-1">Supabase Project URL</label>
              <input id="sb-url" class="w-full px-3 py-2 border rounded-lg font-mono text-xs" placeholder="https://your-project-id.supabase.co" value="${escapeHtml(cfg.supabaseUrl || "")}" />
            </div>
            <div>
              <label class="block font-semibold text-[#A4A88A] uppercase mb-1">Supabase Anon Public Key</label>
              <textarea id="sb-key" rows="3" class="w-full px-3 py-2 border rounded-lg font-mono text-xs" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">${escapeHtml(cfg.supabaseAnonKey || "")}</textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button id="clear-supabase-cfg-btn" class="px-3 py-2 rounded-lg border text-xs font-semibold text-[#C76B4A] hover:bg-[#C76B4A]/10">
              Clear Keys
            </button>
            <button id="save-supabase-cfg-btn" class="flex-1 py-2 rounded-lg bg-[#354B3A] text-white text-xs font-semibold hover:bg-[#243428]">
              Connect &amp; Reload
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById("close-supabase-cfg-btn").addEventListener("click", function () { modal.remove(); });
      document.getElementById("clear-supabase-cfg-btn").addEventListener("click", function () {
        localStorage.removeItem("chronicles_supabase_config");
        window.location.reload();
      });
      document.getElementById("save-supabase-cfg-btn").addEventListener("click", function () {
        const newCfg = {
          supabaseUrl: document.getElementById("sb-url").value.trim(),
          supabaseAnonKey: document.getElementById("sb-key").value.trim()
        };
        localStorage.setItem("chronicles_supabase_config", JSON.stringify(newCfg));
        window.showToast("Supabase configuration saved. Connecting…", "success");
        setTimeout(function () { window.location.reload(); }, 700);
      });
    }
  };

  // Backward compatibility alias
  window.openFirebaseSettingsModal = window.openSupabaseSettingsModal;

  function runWhenReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  runWhenReady(function () {
    initNavigation();
    initCountdownTimer();
    showStoredFlash();

    window.addEventListener("chronicles:authChanged", initNavigation);
    window.addEventListener("chronicles:membersChanged", initNavigation);
  });
})();
