// The 12 Chronicles — Main Shared Controller & Global Navigation

(function () {
  // Setup Global Navigation Bar across all pages
  function initNavigation() {
    const navContainer = document.getElementById('global-nav');
    if (!navContainer) return;

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    const isAdmin = window.authService ? window.authService.isAdmin() : false;
    const squad = window.authService ? window.authService.getAllMembers() : [];

    const navLinks = [
      { name: "Home", href: "index.html" },
      { name: "Schedule", href: "schedule.html" },
      { name: "Explore", href: "explore.html" },
      { name: "Hall of Fame", href: "hall-of-fame.html" },
      { name: "Planner", href: "planner.html" },
      { name: "Squad", href: "squad.html" },
      { name: "Expenses", href: "expenses.html" },
      { name: "Memories", href: "memories.html" }
    ];

    navContainer.innerHTML = `
      <header class="sticky top-0 z-40 bg-[#F7F4EC]/90 backdrop-blur-md border-b border-[#A4A88A]/30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            <!-- Brand Logo -->
            <a href="index.html" class="flex items-center gap-3 group">
              <div class="w-10 h-10 rounded-full bg-[#354B3A] text-white flex items-center justify-center font-serif text-lg font-bold group-hover:bg-[#C76B4A] transition-colors shadow-sm">
                12
              </div>
              <div>
                <span class="font-serif font-bold text-xl sm:text-2xl text-[#282824] tracking-tight group-hover:text-[#354B3A] transition-colors">
                  The 12 Chronicles
                </span>
                <span class="hidden md:block text-[11px] uppercase tracking-widest text-[#A4A88A] font-semibold">
                  IIT Bombay Techfest × Mumbai 2026
                </span>
              </div>
            </a>

            <!-- Desktop Navigation Links -->
            <nav class="hidden lg:flex items-center space-x-1">
              ${navLinks.map(link => {
                const isActive = (currentPath === link.href) || (currentPath === '' && link.href === 'index.html');
                return `
                  <a href="${link.href}" 
                     class="px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                       isActive 
                         ? 'text-[#354B3A] bg-[#354B3A]/10 font-semibold' 
                         : 'text-[#282824]/80 hover:text-[#354B3A] hover:bg-[#A4A88A]/15'
                     }">
                    ${link.name}
                  </a>
                `;
              }).join('')}
            </nav>

            <!-- User / Squad Profile Switcher -->
            <div class="hidden sm:flex items-center gap-3">
              <div class="relative" id="squad-dropdown-container">
                <button id="squad-dropdown-btn" 
                        class="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#A4A88A]/40 bg-white hover:border-[#354B3A] transition-all shadow-sm">
                  <img src="${currentUser ? currentUser.avatar : ''}" alt="${currentUser ? currentUser.name : ''}" 
                       class="w-7 h-7 rounded-full object-cover ring-1 ring-[#354B3A]/20" />
                  <div class="text-left">
                    <div class="text-xs font-semibold text-[#282824] leading-tight flex items-center gap-1.5">
                      <span>${currentUser ? currentUser.nickname : 'Squad Member'}</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider ${isAdmin ? 'bg-[#C76B4A] text-white' : 'bg-[#A4A88A]/30 text-[#354B3A]'} font-bold">
                        ${currentUser ? currentUser.role : 'Member'}
                      </span>
                    </div>
                  </div>
                  <svg class="w-3.5 h-3.5 text-[#282824]/60 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>

                <!-- Dropdown Menu for all 12 Squad Members -->
                <div id="squad-dropdown-menu" 
                     class="hidden absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#A4A88A]/30 py-2 z-50 animate-fade-in max-h-96 overflow-y-auto">
                  <div class="px-4 py-2 border-b border-gray-100">
                    <p class="text-[11px] uppercase tracking-wider font-bold text-[#A4A88A]">Switch Member Identity</p>
                    <p class="text-xs text-[#282824]/70">Test roles & admin features instantly</p>
                  </div>
                  <div class="py-1">
                    ${squad.map(m => `
                      <button data-switch-id="${m.id}" 
                              class="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[#F7F4EC] transition-colors ${m.id === (currentUser ? currentUser.id : '') ? 'bg-[#F7F4EC] font-semibold' : ''}">
                        <img src="${m.avatar}" class="w-7 h-7 rounded-full object-cover" />
                        <div class="flex-1 min-w-0">
                          <p class="text-xs text-[#282824] truncate flex items-center justify-between">
                            <span>${m.name}</span>
                            <span class="text-[9px] px-1.5 py-0.2 rounded-full ${m.role === 'Admin' ? 'bg-[#C76B4A]/15 text-[#C76B4A]' : 'bg-gray-100 text-gray-600'} font-bold">${m.role}</span>
                          </p>
                          <p class="text-[10px] text-[#A4A88A] truncate">"${m.nickname}" • ${m.tripRole}</p>
                        </div>
                      </button>
                    `).join('')}
                  </div>
                  <div class="border-t border-gray-100 px-4 py-2">
                    <button id="open-invite-modal-btn" class="w-full text-center text-xs text-[#354B3A] font-semibold hover:underline">
                      🔑 Enter Squad Invite Code
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mobile Hamburger Button -->
            <div class="flex items-center lg:hidden gap-2">
              <button id="mobile-menu-btn" 
                      class="p-2 rounded-lg text-[#282824] hover:bg-[#A4A88A]/20 transition-colors"
                      aria-label="Toggle Navigation">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path id="hamburger-icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Drawer -->
        <div id="mobile-nav" class="hidden lg:hidden border-t border-[#A4A88A]/20 bg-[#F7F4EC] px-4 pt-3 pb-6 space-y-1">
          ${navLinks.map(link => {
            const isActive = (currentPath === link.href) || (currentPath === '' && link.href === 'index.html');
            return `
              <a href="${link.href}" 
                 class="block px-3 py-2 text-base font-medium rounded-md ${
                   isActive 
                     ? 'text-[#354B3A] bg-[#354B3A]/10 font-bold' 
                     : 'text-[#282824]/80 hover:text-[#354B3A] hover:bg-[#A4A88A]/10'
                 }">
                ${link.name}
              </a>
            `;
          }).join('')}
          
          <!-- Mobile Member Switcher -->
          <div class="pt-4 border-t border-[#A4A88A]/20 mt-3">
            <p class="text-xs uppercase tracking-wider text-[#A4A88A] font-bold px-3 mb-2">Active Squad Member</p>
            <div class="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-[#A4A88A]/30">
              <img src="${currentUser ? currentUser.avatar : ''}" class="w-9 h-9 rounded-full object-cover" />
              <div>
                <p class="text-sm font-semibold text-[#282824]">${currentUser ? currentUser.name : ''}</p>
                <p class="text-xs text-[#A4A88A]">${currentUser ? currentUser.nickname : ''} (${currentUser ? currentUser.role : ''})</p>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;

    // Dropdown toggle logic
    const dropdownBtn = document.getElementById('squad-dropdown-btn');
    const dropdownMenu = document.getElementById('squad-dropdown-menu');
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !dropdownBtn.contains(e.target)) {
          dropdownMenu.classList.add('hidden');
        }
      });

      // Member switch click
      dropdownMenu.querySelectorAll('[data-switch-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-switch-id');
          window.authService.switchMember(id);
          showToast(`Switched active squad member to ${window.authService.getCurrentUser().name}`, 'info');
          initNavigation();
          dropdownMenu.classList.add('hidden');
        });
      });
    }

    // Mobile menu toggle logic
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileBtn && mobileNav) {
      mobileBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('hidden');
      });
    }

    // Invite code modal button
    const inviteBtn = document.getElementById('open-invite-modal-btn');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', () => {
        if (dropdownMenu) dropdownMenu.classList.add('hidden');
        openInviteModal();
      });
    }
  }

  // Toast Notification System
  window.showToast = function (message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-3 opacity-0 ${
      type === 'success' 
        ? 'bg-[#354B3A] text-white border-[#354B3A]' 
        : type === 'error'
        ? 'bg-[#C76B4A] text-white border-[#C76B4A]'
        : 'bg-[#282824] text-white border-[#282824]'
    }`;

    toast.innerHTML = `
      <span class="flex-1">${message}</span>
      <button class="text-white/70 hover:text-white" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-3');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  };

  // Invite Code Modal
  window.openInviteModal = function () {
    let modal = document.getElementById('squad-invite-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'squad-invite-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#A4A88A]/30">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-serif text-xl font-bold text-[#282824]">Enter Squad Invite Code</h3>
            <button onclick="document.getElementById('squad-invite-modal').remove()" class="text-gray-400 hover:text-[#282824]">✕</button>
          </div>
          <p class="text-xs text-[#282824]/70 mb-4">
            "The 12 Chronicles" is private to the 12 verified members. Enter your group passkey:
          </p>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-[#A4A88A] mb-1">Squad Passkey</label>
              <input id="invite-code-input" type="password" value="TECHFEST2026" placeholder="Enter passkey (e.g. TECHFEST2026)"
                     class="w-full px-3.5 py-2.5 rounded-lg border border-[#A4A88A]/40 text-sm focus:outline-none focus:border-[#354B3A]" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-[#A4A88A] mb-1">Select Your Name</label>
              <select id="invite-member-select" class="w-full px-3.5 py-2.5 rounded-lg border border-[#A4A88A]/40 text-sm focus:outline-none focus:border-[#354B3A]">
                ${window.authService.getAllMembers().map(m => `
                  <option value="${m.id}">${m.name} (${m.nickname}) — ${m.role}</option>
                `).join('')}
              </select>
            </div>
            <div class="p-3 bg-[#F7F4EC] rounded-lg text-xs text-[#354B3A]">
              💡 <strong>Squad Tip:</strong> Default passkey is <code class="font-mono bg-white px-1.5 py-0.5 rounded">TECHFEST2026</code>.
            </div>
            <div class="flex gap-2 pt-2">
              <button onclick="document.getElementById('squad-invite-modal').remove()" 
                      class="flex-1 px-4 py-2.5 rounded-lg border border-[#A4A88A]/40 text-xs font-semibold text-[#282824] hover:bg-gray-50">
                Cancel
              </button>
              <button id="submit-invite-btn" 
                      class="flex-1 px-4 py-2.5 rounded-lg bg-[#354B3A] hover:bg-[#243428] text-white text-xs font-semibold transition-colors">
                Unlock Access
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('submit-invite-btn').addEventListener('click', () => {
        const code = document.getElementById('invite-code-input').value;
        const memberId = document.getElementById('invite-member-select').value;
        try {
          window.authService.loginWithInviteCode(code, memberId);
          showToast(`Welcome aboard, ${window.authService.getCurrentUser().name}!`, 'success');
          modal.remove();
          initNavigation();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  };

  // Live Countdown Timer to IIT Bombay Techfest 2026
  window.initCountdownTimer = function () {
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');

    if (!daysEl) return;

    // Techfest 2026 starts Dec 25, 2026 09:00 AM IST
    const targetDate = new Date('2026-12-25T09:00:00+05:30').getTime();

    function update() {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
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

      if (daysEl) daysEl.innerText = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.innerText = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.innerText = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.innerText = String(seconds).padStart(2, '0');
    }

    update();
    setInterval(update, 1000);
  };

  // Firebase Configuration Modal
  window.openFirebaseSettingsModal = function () {
    let modal = document.getElementById('firebase-settings-modal');
    if (!modal) {
      const cfg = window.firebaseConfig || {};
      modal = document.createElement('div');
      modal.id = 'firebase-settings-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#A4A88A]/30">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">🔥</span>
              <h3 class="font-serif text-xl font-bold text-[#282824]">Firebase Cloud Integration</h3>
            </div>
            <button onclick="document.getElementById('firebase-settings-modal').remove()" class="text-gray-400 hover:text-[#282824]">✕</button>
          </div>
          <p class="text-xs text-[#282824]/70 mb-4">
            The website currently operates with a high-fidelity local real-time sync layer. To connect to your live Firebase project (Firestore + Storage + Auth), paste your credentials:
          </p>
          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-semibold text-[#A4A88A] uppercase mb-1">API Key</label>
              <input id="fb-apikey" class="w-full px-3 py-2 border rounded-lg" value="${cfg.apiKey || ''}" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-[#A4A88A] uppercase mb-1">Project ID</label>
                <input id="fb-projid" class="w-full px-3 py-2 border rounded-lg" value="${cfg.projectId || ''}" />
              </div>
              <div>
                <label class="block font-semibold text-[#A4A88A] uppercase mb-1">Auth Domain</label>
                <input id="fb-domain" class="w-full px-3 py-2 border rounded-lg" value="${cfg.authDomain || ''}" />
              </div>
            </div>
            <div>
              <label class="block font-semibold text-[#A4A88A] uppercase mb-1">Storage Bucket</label>
              <input id="fb-bucket" class="w-full px-3 py-2 border rounded-lg" value="${cfg.storageBucket || ''}" />
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button onclick="document.getElementById('firebase-settings-modal').remove()" class="flex-1 py-2 rounded-lg border text-xs font-semibold">
              Close
            </button>
            <button id="save-firebase-cfg-btn" class="flex-1 py-2 rounded-lg bg-[#354B3A] text-white text-xs font-semibold hover:bg-[#243428]">
              Save & Connect
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('save-firebase-cfg-btn').addEventListener('click', () => {
        const newCfg = {
          apiKey: document.getElementById('fb-apikey').value.trim(),
          projectId: document.getElementById('fb-projid').value.trim(),
          authDomain: document.getElementById('fb-domain').value.trim(),
          storageBucket: document.getElementById('fb-bucket').value.trim(),
          messagingSenderId: "123456789012",
          appId: "1:123456789012:web:demo"
        };
        localStorage.setItem('chronicles_firebase_config', JSON.stringify(newCfg));
        showToast('Firebase configuration saved successfully!', 'success');
        modal.remove();
        setTimeout(() => window.location.reload(), 1000);
      });
    }
  };

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCountdownTimer();

    // Listen for auth change
    window.addEventListener('chronicles:authChanged', () => {
      initNavigation();
    });
  });
})();
