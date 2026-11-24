// The 12 Chronicles — Main Shared Controller & Global Navigation

(function () {
  "use strict";

  const NAV_LINKS = [
    { name: "Home", href: "index.html" },
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

  function initNavigation() {
    const navContainer = document.getElementById("global-nav");
    if (!navContainer) return;

    const rawPath = window.location.pathname.split("/").pop() || "index.html";
    const currentPath = (!rawPath || rawPath === "/") ? "index.html" : (rawPath.endsWith(".html") ? rawPath : (rawPath + ".html"));

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
              ${NAV_LINKS.map(function (link) { return linkMarkup(link, false); }).join("")}
            </nav>

            <div class="hidden sm:flex items-center gap-3">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#354B3A]/10 text-[#354B3A] text-xs font-semibold border border-[#354B3A]/20">
                <span class="w-2 h-2 rounded-full bg-[#354B3A]"></span>
                The 12 Fellowship
              </span>
              <a href="expenses.html" class="px-3.5 py-1.5 rounded-lg bg-[#354B3A] text-white text-xs font-semibold hover:bg-[#243428] transition-colors shadow-sm">
                Expenses
              </a>
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
          ${NAV_LINKS.map(function (link) { return linkMarkup(link, true); }).join("")}
        </div>
      </header>
    `;

    const mobileBtn = document.getElementById("mobile-menu-btn");
    const mobileNav = document.getElementById("mobile-nav");
    if (mobileBtn && mobileNav) {
      mobileBtn.addEventListener("click", function () {
        const hidden = mobileNav.classList.toggle("hidden");
        mobileBtn.setAttribute("aria-expanded", hidden ? "false" : "true");
      });
    }
  }

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
  function initCountdownTimer() {
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
  }
  window.initCountdownTimer = initCountdownTimer;

  function runWhenReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  runWhenReady(function () {
    try { initNavigation(); } catch (e) { console.error("Navigation init error:", e); }
    try { initCountdownTimer(); } catch (e) { console.error("Countdown timer error:", e); }
    try { showStoredFlash(); } catch (e) { console.error("Flash notice error:", e); }
  });
})();
