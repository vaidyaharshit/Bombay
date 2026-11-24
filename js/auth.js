// The 12 Chronicles — Squad & Supabase Data Provider
// Preserves Supabase client connection, profiles sync, and data operations without requiring login/auth gates.

(function () {
  "use strict";

  function cleanEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
  }

  function defaultAvatar(name) {
    const initials = String(name || "12")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (w) { return w.charAt(0); })
      .join("")
      .toUpperCase() || "12";
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">' +
      '<rect width="160" height="160" rx="80" fill="#354B3A"/>' +
      '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="62" fill="#F7F4EC">' +
      initials +
      '</text></svg>';
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  async function fileToDataUrl(file, maxSize, quality) {
    const limit = maxSize || 320;
    const compression = typeof quality === "number" ? quality : 0.82;
    return new Promise(function (resolve, reject) {
      if (!file) {
        resolve("");
        return;
      }
      if (!file.type || file.type.indexOf("image/") !== 0) {
        reject(new Error("Please choose an image file for your profile photo."));
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        reject(new Error("Please choose a profile photo smaller than 8 MB."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = function () {
        reject(new Error("Could not read the selected image."));
      };
      reader.onload = function () {
        const image = new Image();
        image.onerror = function () {
          reject(new Error("Could not load the selected image."));
        };
        image.onload = function () {
          const scale = Math.min(1, limit / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", compression));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const DEFAULT_SQUAD = [
    {
      id: "mem_1",
      uid: "mem_1",
      fullName: "Harshit Vaidya (Admin)",
      name: "Harshit Vaidya",
      email: "harshitvaidya28@gmail.com",
      role: "Admin",
      roleStatus: "approved",
      effectiveRole: "Admin",
      accountStatus: "active",
      nickname: "Chief",
      tripRole: "Trip Organizer & Tech Lead",
      funFact: "Can fix any merge conflict or route issue at 3 AM.",
      createdAt: "2026-10-01T00:00:00.000Z",
      avatar: defaultAvatar("Harshit Vaidya")
    },
    {
      id: "mem_2",
      uid: "mem_2",
      fullName: "Aryan Sharma",
      name: "Aryan Sharma",
      email: "aryan@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "Navigator",
      tripRole: "Schedule & Navigation Lead",
      funFact: "Knows Mumbai local train timetable better than M-Indicator.",
      createdAt: "2026-10-02T00:00:00.000Z",
      avatar: defaultAvatar("Aryan Sharma")
    },
    {
      id: "mem_3",
      uid: "mem_3",
      fullName: "Rohan Mehta",
      name: "Rohan Mehta",
      email: "rohan@the12chronicles.trip",
      role: "Treasurer",
      roleStatus: "approved",
      effectiveRole: "Treasurer",
      accountStatus: "active",
      nickname: "Bhookha",
      tripRole: "Food & Culinary Explorer",
      funFact: "Ate 9 plates of extra-butter pav bhaji across 5 days and has zero regrets.",
      createdAt: "2026-10-03T00:00:00.000Z",
      avatar: defaultAvatar("Rohan Mehta")
    },
    {
      id: "mem_4",
      uid: "mem_4",
      fullName: "Ananya Iyer",
      name: "Ananya Iyer",
      email: "ananya@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "Lenses",
      tripRole: "Photographer & Visual Chronicler",
      funFact: "Captures 350+ candid shots without making anyone pose stiffly.",
      createdAt: "2026-10-04T00:00:00.000Z",
      avatar: defaultAvatar("Ananya Iyer")
    },
    {
      id: "mem_5",
      uid: "mem_5",
      fullName: "Vihaan Joshi",
      name: "Vihaan Joshi",
      email: "vihaan@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "Robo",
      tripRole: "Techfest Competitions Lead",
      funFact: "Built a 60kg combat bot using spare parts in his dorm.",
      createdAt: "2026-10-05T00:00:00.000Z",
      avatar: defaultAvatar("Vihaan Joshi")
    },
    {
      id: "mem_6",
      uid: "mem_6",
      fullName: "Kabir Verma",
      name: "Kabir Verma",
      email: "kabir@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "DJ",
      tripRole: "Music & Vibe Coordinator",
      funFact: "Curated a 14-hour Mumbai night drive playlist.",
      createdAt: "2026-10-06T00:00:00.000Z",
      avatar: defaultAvatar("Kabir Verma")
    },
    {
      id: "mem_7",
      uid: "mem_7",
      fullName: "Diya Sen",
      name: "Diya Sen",
      email: "diya@the12chronicles.trip",
      role: "Treasurer",
      roleStatus: "approved",
      effectiveRole: "Treasurer",
      accountStatus: "active",
      nickname: "Planner",
      tripRole: "Budget & Expense Co-lead",
      funFact: "Splits bills down to 2 decimal places in under 5 seconds.",
      createdAt: "2026-10-07T00:00:00.000Z",
      avatar: defaultAvatar("Diya Sen")
    },
    {
      id: "mem_8",
      uid: "mem_8",
      fullName: "Tanvi Deshmukh",
      name: "Tanvi Deshmukh",
      email: "tanvi@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "Historian",
      tripRole: "Mumbai Heritage & Sightseeing Lead",
      funFact: "Can recite the architectural history of every building in Fort.",
      createdAt: "2026-10-08T00:00:00.000Z",
      avatar: defaultAvatar("Tanvi Deshmukh")
    },
    {
      id: "mem_9",
      uid: "mem_9",
      fullName: "Siddharth Rao",
      name: "Siddharth Rao",
      email: "siddharth@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "Hacker",
      tripRole: "Hackathon & Exhibits Lead",
      funFact: "Survives exclusively on cold brew and filter coffee.",
      createdAt: "2026-10-09T00:00:00.000Z",
      avatar: defaultAvatar("Siddharth Rao")
    },
    {
      id: "mem_10",
      uid: "mem_10",
      fullName: "Aditi Patel",
      name: "Aditi Patel",
      email: "aditi@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "First Aid",
      tripRole: "Squad Safety & Logistics",
      funFact: "Carries a first aid kit equipped to handle a minor expedition.",
      createdAt: "2026-10-10T00:00:00.000Z",
      avatar: defaultAvatar("Aditi Patel")
    },
    {
      id: "mem_11",
      uid: "mem_11",
      fullName: "Riya Nair",
      name: "Riya Nair",
      email: "riya@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "Sunset",
      tripRole: "Coastal Trail & Walk Coordinator",
      funFact: "Never misses a sunset at Marine Drive or Bandstand.",
      createdAt: "2026-10-11T00:00:00.000Z",
      avatar: defaultAvatar("Riya Nair")
    },
    {
      id: "mem_12",
      uid: "mem_12",
      fullName: "Dev Malhotra",
      name: "Dev Malhotra",
      email: "dev@the12chronicles.trip",
      role: "Member",
      roleStatus: "approved",
      effectiveRole: "Member",
      accountStatus: "active",
      nickname: "Night Owl",
      tripRole: "Midnight Strolls & Street Food",
      funFact: "Most awake between 1:00 AM and 5:00 AM at Marine Drive.",
      createdAt: "2026-10-12T00:00:00.000Z",
      avatar: defaultAvatar("Dev Malhotra")
    }
  ];

  function normalizeProfile(row) {
    const s = row || {};
    const role = s.role === "Admin" ? "Admin" : (s.role === "Treasurer" ? "Treasurer" : "Member");
    const roleStatus = s.role_status || s.roleStatus || "approved";
    const effectiveRole = role;
    const fullName = s.full_name || s.fullName || s.name || "Squad Member";
    const photoURL = s.photo_url || s.photoURL || s.avatar || defaultAvatar(fullName);

    return {
      uid: s.id || s.uid || "",
      id: s.id || s.uid || "",
      fullName: fullName,
      name: fullName,
      email: s.email || "",
      photoURL: photoURL,
      avatar: photoURL,
      role: role,
      roleStatus: roleStatus,
      effectiveRole: effectiveRole,
      accountStatus: s.account_status || s.accountStatus || "active",
      nickname: s.nickname || "",
      tripRole: s.trip_role || s.tripRole || "",
      funFact: s.fun_fact || s.funFact || "",
      createdAt: s.created_at || s.createdAt || new Date().toISOString()
    };
  }

  class SupabaseAuthService {
    constructor() {
      this.supabase = null;
      this.currentUser = DEFAULT_SQUAD[0];
      this.allUsers = DEFAULT_SQUAD.slice();
      this.members = DEFAULT_SQUAD.slice();
      this.mode = "supabase";
      this._authNotice = "";
      this.ready = this.init();
    }

    async init() {
      // Connect to Supabase project if configured
      if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
          const cfg = window.supabaseConfig;
          if (window.supabase && typeof window.supabase.createClient === "function") {
            this.supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
              auth: {
                persistSession: true,
                autoRefreshToken: true
              }
            });
            this.mode = "supabase";
            await this.refreshAllUsers();
            this.subscribeRealtimeProfiles();
          }
        } catch (error) {
          console.warn("Supabase client initialized with default configuration:", error);
        }
      }

      this.emitAuthChanged();
      window.dispatchEvent(new CustomEvent("chronicles:authReady", {
        detail: { user: this.currentUser, mode: this.mode }
      }));
    }

    async refreshAllUsers() {
      if (!this.supabase) return;
      try {
        const { data, error } = await this.supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          const loaded = data.map(normalizeProfile);
          // Combine loaded profiles with default squad
          this.allUsers = loaded;
          this.members = loaded.filter(u => u.accountStatus === "active");
          this.currentUser = this.allUsers[0] || DEFAULT_SQUAD[0];

          window.dispatchEvent(new CustomEvent("chronicles:membersChanged", {
            detail: { members: this.members.slice() }
          }));
        }
      } catch (e) {
        console.warn("Could not load database profiles, using squad registry:", e);
      }
    }

    subscribeRealtimeProfiles() {
      if (!this.supabase) return;
      try {
        this.supabase
          .channel("realtime:profiles")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "profiles" },
            async () => {
              await this.refreshAllUsers();
              this.emitAuthChanged();
            }
          )
          .subscribe();
      } catch (e) {
        /* Realtime profiles fallback */
      }
    }

    applyRouteGuard() {
      // Intentionally empty — authentication gates removed. All pages open directly.
    }

    emitAuthChanged() {
      window.dispatchEvent(new CustomEvent("chronicles:authChanged", {
        detail: {
          user: this.currentUser,
          authenticated: true,
          mode: this.mode
        }
      }));
    }

    getCurrentUser() {
      return this.currentUser;
    }

    getAllMembers() {
      return this.members.slice();
    }

    getAllUsersForAdmin() {
      return this.allUsers.slice();
    }

    getPendingTreasurerApplications() {
      return [];
    }

    getAuthNotice() {
      return "";
    }

    clearAuthNotice() {}

    isConfigured() {
      return true;
    }

    isAdmin() {
      return true;
    }

    isTreasurer() {
      return true;
    }

    canManageExpenses() {
      return true;
    }

    isPendingTreasurer() {
      return false;
    }

    async hasActiveAdmin() {
      return true;
    }

    getMemberById(id) {
      if (!id) return null;
      return this.members.find(function (member) {
        return member.id === id || member.uid === id;
      }) || null;
    }

    getMemberByName(name) {
      if (!name) return null;
      const clean = String(name).trim().toLowerCase();
      return this.members.find(function (member) {
        return member.fullName.toLowerCase() === clean || (member.name && member.name.toLowerCase() === clean);
      }) || null;
    }

    async updateMyProfile(updates) {
      if (!updates || typeof updates !== "object") return;
      const target = this.currentUser;
      if (!target) return;

      if (typeof updates.fullName === "string" && updates.fullName.trim()) {
        target.fullName = updates.fullName.trim();
        target.name = target.fullName;
      }
      if (typeof updates.nickname === "string") target.nickname = updates.nickname.trim();
      if (typeof updates.tripRole === "string") target.tripRole = updates.tripRole.trim();
      if (typeof updates.funFact === "string") target.funFact = updates.funFact.trim();
      if (typeof updates.photoDataUrl === "string" && updates.photoDataUrl) {
        target.avatar = updates.photoDataUrl;
        target.photoURL = updates.photoDataUrl;
      }

      if (this.supabase && target.id && target.id.length > 10) {
        try {
          await this.supabase.from("profiles").update({
            full_name: target.fullName,
            nickname: target.nickname,
            trip_role: target.tripRole,
            fun_fact: target.funFact,
            photo_url: target.avatar,
            updated_at: new Date().toISOString()
          }).eq("id", target.id);
        } catch (e) {
          console.warn("Could not update remote profile:", e);
        }
      }

      this.emitAuthChanged();
      window.dispatchEvent(new CustomEvent("chronicles:membersChanged", {
        detail: { members: this.members.slice() }
      }));
    }

    async logout() {}
    async login() { return this.currentUser; }
    async signUp() { return { user: this.currentUser }; }
    async resetPassword() {}
    async updatePassword() {}
    async previewInvite() { return { valid: true, role: "Member" }; }
  }

  window.chroniclesUtils = {
    fileToDataUrl: fileToDataUrl,
    defaultAvatar: defaultAvatar,
    isValidEmail: isValidEmail
  };

  window.authService = new SupabaseAuthService();
})();
