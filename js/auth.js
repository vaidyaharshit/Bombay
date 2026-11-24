// The 12 Chronicles — Supabase Authentication & Role Controller
// Replaces Firebase Auth & Cloud Functions with Supabase Auth, PostgreSQL RLS and secure RPC functions.

(function () {
  "use strict";

  const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function cleanEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
  }

  function randomInviteCode(role) {
    const prefix = role === "Treasurer" ? "CHRONICLES-T" : "CHRONICLES-M";
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += INVITE_CHARS.charAt(Math.floor(Math.random() * INVITE_CHARS.length));
    }
    return prefix + code;
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

  function normalizeProfile(row) {
    const s = row || {};
    const role = s.role === "Admin" ? "Admin" : (s.role === "Treasurer" ? "Treasurer" : "Member");
    const roleStatus = s.role_status || s.roleStatus || (role === "Treasurer" ? "pending" : "approved");
    const effectiveRole = (role === "Admin" && roleStatus === "approved")
      ? "Admin"
      : (role === "Treasurer" && roleStatus === "approved")
        ? "Treasurer"
        : "Member";
    const fullName = s.full_name || s.fullName || s.name || "Group Member";
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
      inviteCode: s.invite_code || s.inviteCode || "",
      invitedRole: s.invited_role || s.invitedRole || role,
      approvedBy: s.approved_by || s.approvedBy || "",
      approvedByName: s.approved_by_name || s.approvedByName || "",
      approvedAt: s.approved_at || s.approvedAt || "",
      createdAt: s.created_at || s.createdAt || "",
      updatedAt: s.updated_at || s.updatedAt || ""
    };
  }

  function normalizeInvite(row) {
    const s = row || {};
    const maxUses = Math.max(1, Number(s.max_uses || s.maxUses || 1));
    const usageCount = Math.max(0, Number(s.usage_count || s.usageCount || 0));
    return {
      code: s.code || "",
      role: s.role === "Treasurer" ? "Treasurer" : "Member",
      status: s.status || "active",
      maxUses: maxUses,
      usageCount: usageCount,
      remainingUses: Math.max(0, maxUses - usageCount),
      usedBy: Array.isArray(s.used_by) ? s.used_by : (Array.isArray(s.usedBy) ? s.usedBy : []),
      note: s.note || "",
      expiresAt: s.expires_at || s.expiresAt || null,
      createdBy: s.created_by || s.createdBy || "",
      createdByName: s.created_by_name || s.createdByName || "",
      createdAt: s.created_at || s.createdAt || "",
      updatedAt: s.updated_at || s.updatedAt || ""
    };
  }

  function currentPage() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function friendlyAuthError(error) {
    const message = error && error.message ? String(error.message) : "Authentication request failed.";
    if (message.includes("Invalid login credentials") || message.includes("invalid_grant")) {
      return "Incorrect email or password, or your email has not been confirmed yet. If you recently registered, please click the confirmation link sent to your inbox, or use 'Forgot password?'.";
    }
    if (message.includes("Email not confirmed")) {
      return "Your email address has not been confirmed yet. Please check your inbox (and spam folder) for the confirmation link from Supabase.";
    }
    if (message.includes("User already registered") || message.includes("user_already_exists")) {
      return "An account with this email already exists. Please log in.";
    }
    if (message.includes("Password should be at least")) {
      return "Password must be at least 6 characters long.";
    }
    if (message.includes("rate limit") || message.includes("over_email_send_rate_limit")) {
      return "Supabase email rate limit reached. Please wait a few minutes before requesting another reset/confirmation email.";
    }
    return message;
  }

  class SupabaseAuthService {
    constructor() {
      this.supabase = null;
      this.currentUser = null;
      this.allUsers = [];
      this.members = [];
      this.mode = "unconfigured";
      this._authNotice = "";
      this.ready = this.init();
    }

    async init() {
      const page = currentPage();
      const protectedPages = new Set(["admin.html", "squad.html", "expenses.html", "planner.html", "schedule.html", "explore.html", "hall-of-fame.html", "memories.html"]);

      if (protectedPages.has(page) || page === "auth.html") {
        document.documentElement.classList.add("auth-loading");
      }

      if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
          const cfg = window.supabaseConfig;
          this.supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true
            }
          });
          this.mode = "supabase";
          await this.initSession();
          this.subscribeRealtimeProfiles();
        } catch (error) {
          console.error("Supabase client init failed:", error);
          this.mode = "error";
          this._authNotice = "Could not initialize Supabase: " + (error.message || "");
        }
      } else {
        this.mode = "unconfigured";
        this._authNotice = "Supabase is not configured yet. Connect your Supabase project URL and anon key to enable authentication.";
      }

      this.applyRouteGuard();
      this.emitAuthChanged();
      document.documentElement.classList.remove("auth-loading");
      window.dispatchEvent(new CustomEvent("chronicles:authReady", {
        detail: { user: this.currentUser, mode: this.mode }
      }));
    }

    async initSession() {
      if (!this.supabase) return;

      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) {
        console.warn("Could not get Supabase session:", error);
      }

      if (session && session.user) {
        await this.loadUserProfile(session.user.id);
      } else {
        this.currentUser = null;
      }

      await this.refreshAllUsers();

      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === "PASSWORD_RECOVERY") {
          window.dispatchEvent(new CustomEvent("chronicles:passwordRecovery", { detail: newSession }));
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (newSession && newSession.user) {
            await this.loadUserProfile(newSession.user.id);
          }
        } else if (event === "SIGNED_OUT") {
          this.currentUser = null;
        }
        await this.refreshAllUsers();
        this.applyRouteGuard();
        this.emitAuthChanged();
      });
    }

    async loadUserProfile(userId) {
      if (!this.supabase || !userId) return null;
      try {
        const { data, error } = await this.supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.warn("Error loading user profile:", error);
          return null;
        }

        if (data) {
          this.currentUser = normalizeProfile(data);
          return this.currentUser;
        }
      } catch (e) {
        console.warn("Exception loading profile:", e);
      }
      return null;
    }

    async refreshAllUsers() {
      if (!this.supabase || this.mode !== "supabase") return;
      try {
        const { data, error } = await this.supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(data)) {
          this.allUsers = data.map(normalizeProfile);
          this.members = this.allUsers.filter(u => u.accountStatus === "active" && (u.roleStatus === "approved" || u.roleStatus === "pending"));

          if (this.currentUser) {
            const latest = this.allUsers.find(u => u.uid === this.currentUser.uid);
            if (latest) this.currentUser = latest;
          }

          window.dispatchEvent(new CustomEvent("chronicles:membersChanged", {
            detail: { members: this.members.slice() }
          }));
        }
      } catch (e) {
        console.warn("Could not refresh users list:", e);
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
        console.warn("Realtime profiles subscription failed:", e);
      }
    }

    applyRouteGuard() {
      const page = currentPage();
      const protectedPages = new Set(["admin.html", "squad.html", "expenses.html", "planner.html", "schedule.html", "explore.html", "hall-of-fame.html", "memories.html"]);

      if (page === "auth.html" && this.currentUser) {
        const params = new URLSearchParams(window.location.search);
        let target = params.get("redirect") ? decodeURIComponent(params.get("redirect")) : null;
        if (!target) {
          if (this.isAdmin()) target = "admin.html";
          else if (this.isTreasurer()) target = "expenses.html";
          else target = "index.html";
        }
        window.location.replace(target);
        return;
      }

      if (protectedPages.has(page) && !this.currentUser) {
        const redirect = encodeURIComponent(page + window.location.search);
        window.location.replace("auth.html?mode=login&redirect=" + redirect);
        return;
      }

      if (page === "admin.html" && this.currentUser && !this.isAdmin()) {
        window.location.replace("index.html");
      }
    }

    emitAuthChanged() {
      window.dispatchEvent(new CustomEvent("chronicles:authChanged", {
        detail: {
          user: this.currentUser,
          isAdmin: this.isAdmin(),
          isTreasurer: this.isTreasurer(),
          canManageExpenses: this.canManageExpenses()
        }
      }));
    }

    // ------------------------------------------------------------------------
    // ROLE & PERMISSION HELPERS
    // ------------------------------------------------------------------------
    getCurrentUser() {
      return this.currentUser;
    }

    isAuthenticated() {
      return !!this.currentUser;
    }

    isAdmin() {
      return !!(
        this.currentUser &&
        this.currentUser.role === "Admin" &&
        this.currentUser.roleStatus === "approved" &&
        this.currentUser.accountStatus === "active"
      );
    }

    isTreasurer() {
      return !!(
        this.currentUser &&
        this.currentUser.role === "Treasurer" &&
        this.currentUser.roleStatus === "approved" &&
        this.currentUser.accountStatus === "active"
      );
    }

    canManageExpenses() {
      return this.isAdmin() || this.isTreasurer();
    }

    isPendingTreasurer() {
      return !!(
        this.currentUser &&
        this.currentUser.role === "Treasurer" &&
        this.currentUser.roleStatus === "pending"
      );
    }

    getAllMembers() {
      return this.members.slice();
    }

    getAllUsersForAdmin() {
      if (!this.isAdmin()) return [];
      return this.allUsers.slice();
    }

    getPendingTreasurerApplications() {
      if (!this.isAdmin()) return [];
      return this.allUsers.filter(u => u.accountStatus === "active" && u.role === "Treasurer" && u.roleStatus === "pending");
    }

    getAuthNotice() {
      return this._authNotice || "";
    }

    clearAuthNotice() {
      this._authNotice = "";
    }

    // ------------------------------------------------------------------------
    // INVITATION VALIDATION & REDEMPTION (Safe RPCs)
    // ------------------------------------------------------------------------
    async previewInvite(code) {
      const clean = String(code || "").trim().toUpperCase();
      if (!clean) {
        throw new Error("Please enter your Admin-issued invitation code.");
      }
      if (!this.supabase) {
        throw new Error("Supabase is not configured. Please connect Supabase first.");
      }

      const { data, error } = await this.supabase.rpc("preview_invitation", {
        p_code: clean
      });

      if (error) {
        throw new Error(error.message || "Invalid invitation code.");
      }
      return normalizeInvite(data);
    }

    async signUp(options) {
      const input = options || {};
      const fullName = String(input.fullName || "").trim();
      const email = cleanEmail(input.email);
      const password = String(input.password || "");
      const confirmPassword = String(input.confirmPassword || "");
      const inviteCode = String(input.inviteCode || "").trim().toUpperCase();
      const photoDataUrl = input.photoDataUrl || "";

      if (fullName.length < 2) {
        throw new Error("Please enter your full name (at least 2 characters).");
      }
      if (!isValidEmail(email)) {
        throw new Error("Please enter a valid email address.");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }
      if (password !== confirmPassword) {
        throw new Error("Password and confirm password do not match.");
      }
      if (!this.supabase) {
        throw new Error("Supabase is not configured. Please connect Supabase first.");
      }

      // 1. Validate invite
      const invite = await this.previewInvite(inviteCode);
      const role = invite.role;
      const roleStatus = role === "Treasurer" ? "pending" : "approved";
      const photoURL = photoDataUrl || defaultAvatar(fullName);

      // 2. Sign up in Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            photo_url: photoURL
          }
        }
      });

      if (authError) {
        throw new Error(friendlyAuthError(authError));
      }

      if (!authData || !authData.user) {
        throw new Error("Could not create user account. Please check your email.");
      }

      // 3. Atomically redeem invite and create profile in PostgreSQL
      const { data: redeemData, error: redeemError } = await this.supabase.rpc("redeem_invitation", {
        p_code: inviteCode,
        p_user_id: authData.user.id,
        p_full_name: fullName,
        p_email: email,
        p_photo_url: photoURL
      });

      if (redeemError) {
        throw new Error(redeemError.message || "Could not redeem invitation.");
      }

      await this.loadUserProfile(authData.user.id);
      await this.refreshAllUsers();
      this.emitAuthChanged();

      return {
        user: this.currentUser,
        pendingTreasurer: role === "Treasurer" && roleStatus === "pending"
      };
    }

    async login(email, password) {
      const clean = cleanEmail(email);
      const secret = String(password || "");
      if (!isValidEmail(clean)) {
        throw new Error("Please enter a valid email address.");
      }
      if (!secret) {
        throw new Error("Please enter your password.");
      }
      if (!this.supabase) {
        throw new Error("Supabase is not configured. Please connect Supabase first.");
      }

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: clean,
        password: secret
      });

      if (error) {
        throw new Error(friendlyAuthError(error));
      }

      if (!data || !data.user) {
        throw new Error("Login failed. No user returned.");
      }

      await this.loadUserProfile(data.user.id);

      if (!this.currentUser) {
        await this.supabase.auth.signOut();
        throw new Error("No group profile was found for this account. Please register with an Admin-issued invitation.");
      }

      if (this.currentUser.accountStatus !== "active") {
        await this.supabase.auth.signOut();
        throw new Error("This account has been deactivated. Please contact the Admin.");
      }

      await this.refreshAllUsers();
      this.emitAuthChanged();
      return this.currentUser;
    }

    async logout() {
      if (this.supabase) {
        try {
          await this.supabase.auth.signOut();
        } catch (e) {
          console.warn("SignOut error:", e);
        }
      }
      this.currentUser = null;
      this.members = [];
      this.allUsers = [];
      this.emitAuthChanged();
      window.location.href = "auth.html?mode=login";
    }

    async resetPassword(email) {
      const clean = cleanEmail(email);
      if (!isValidEmail(clean)) {
        throw new Error("Please enter a valid email address.");
      }
      if (!this.supabase) {
        throw new Error("Supabase is not configured. Real Supabase credentials are required to send password reset emails.");
      }

      const redirectUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, "auth.html?mode=reset");
      const { error } = await this.supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: redirectUrl
      });

      if (error) {
        throw new Error(friendlyAuthError(error));
      }
      return true;
    }

    async updatePassword(newPassword) {
      const secret = String(newPassword || "");
      if (secret.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }
      if (!this.supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { data, error } = await this.supabase.auth.updateUser({
        password: secret
      });

      if (error) {
        throw new Error(friendlyAuthError(error));
      }

      if (data && data.user) {
        await this.loadUserProfile(data.user.id);
        await this.refreshAllUsers();
        this.emitAuthChanged();
      }

      return this.currentUser;
    }

    async updateProfile(updates) {
      if (!this.currentUser) {
        throw new Error("Please log in to update your profile.");
      }
      if (!this.supabase) {
        throw new Error("Supabase is not connected.");
      }

      const input = updates || {};
      const payload = {
        updated_at: new Date().toISOString()
      };

      if (typeof input.fullName === "string") {
        const fn = input.fullName.trim();
        if (fn.length < 2) throw new Error("Full name must be at least 2 characters.");
        payload.full_name = fn;
      }
      if (typeof input.photoURL === "string" && input.photoURL) {
        payload.photo_url = input.photoURL;
      }
      if (typeof input.nickname === "string") payload.nickname = input.nickname.trim();
      if (typeof input.tripRole === "string") payload.trip_role = input.tripRole.trim();
      if (typeof input.funFact === "string") payload.fun_fact = input.funFact.trim();

      const { data, error } = await this.supabase
        .from("profiles")
        .update(payload)
        .eq("id", this.currentUser.uid)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || "Could not update profile.");
      }

      this.currentUser = normalizeProfile(data);
      await this.refreshAllUsers();
      this.emitAuthChanged();
      return this.currentUser;
    }

    // ------------------------------------------------------------------------
    // ADMIN FUNCTIONS (Server-side & RLS enforced)
    // ------------------------------------------------------------------------
    async getInvites() {
      if (!this.isAdmin()) {
        throw new Error("Only the Admin can view invitation codes.");
      }
      const { data, error } = await this.supabase
        .from("group_invites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Could not load invitations.");
      }
      return (data || []).map(normalizeInvite);
    }

    async createInvite(options) {
      if (!this.isAdmin()) {
        throw new Error("Only the Admin can create invitation codes.");
      }
      const input = options || {};
      const role = input.role === "Treasurer" ? "Treasurer" : "Member";
      const maxUses = Math.max(1, Math.min(100, Math.floor(Number(input.maxUses) || 1)));
      const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;
      const note = String(input.note || "").trim().slice(0, 200);

      let code = (input.code && String(input.code).trim().toUpperCase()) || randomInviteCode(role);
      if (!code.startsWith("CHRONICLES-")) {
        code = (role === "Treasurer" ? "CHRONICLES-T" : "CHRONICLES-M") + code.replace(/[^A-Z0-9]/g, "").slice(0, 8);
      }
      const payload = {
        code: code,
        role: role,
        status: "active",
        max_uses: maxUses,
        usage_count: 0,
        used_by: [],
        note: note,
        expires_at: expiresAt,
        created_by: this.currentUser.uid,
        created_by_name: this.currentUser.fullName
      };

      const { data, error } = await this.supabase
        .from("group_invites")
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || "Could not create invitation.");
      }
      return normalizeInvite(data);
    }

    async revokeInvite(code) {
      if (!this.isAdmin()) {
        throw new Error("Only the Admin can revoke invitation codes.");
      }
      const clean = String(code || "").trim().toUpperCase();
      const { data, error } = await this.supabase
        .from("group_invites")
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("code", clean)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || "Could not revoke invitation.");
      }
      return normalizeInvite(data);
    }

    async approveTreasurer(uid) {
      if (!this.isAdmin()) {
        throw new Error("Only an Admin can approve Treasurer applications.");
      }
      const { error } = await this.supabase.rpc("approve_treasurer", {
        p_uid: uid
      });
      if (error) throw new Error(error.message);
      await this.refreshAllUsers();
      this.emitAuthChanged();
    }

    async rejectTreasurer(uid) {
      if (!this.isAdmin()) {
        throw new Error("Only an Admin can review Treasurer applications.");
      }
      const { error } = await this.supabase.rpc("reject_treasurer", {
        p_uid: uid
      });
      if (error) throw new Error(error.message);
      await this.refreshAllUsers();
      this.emitAuthChanged();
    }

    async setMemberRole(uid, role) {
      if (!this.isAdmin()) {
        throw new Error("Only an Admin can change member roles.");
      }
      const nextRole = role === "Treasurer" ? "Treasurer" : "Member";
      const { error } = await this.supabase.rpc("set_member_role", {
        p_uid: uid,
        p_role: nextRole
      });
      if (error) throw new Error(error.message);
      await this.refreshAllUsers();
      this.emitAuthChanged();
    }

    async signUpAdmin(options) {
      const input = options || {};
      const fullName = String(input.fullName || "Harshit Vaidya (Admin)").trim();
      const email = cleanEmail(input.email || window.supabaseConfig.initialAdminEmail || "harshitvaidya28@gmail.com");
      const password = String(input.password || "");
      const confirmPassword = String(input.confirmPassword || "");

      if (email.toLowerCase() !== String(window.supabaseConfig.initialAdminEmail || "harshitvaidya28@gmail.com").toLowerCase()) {
        throw new Error("This email is not authorized as the trip Admin owner.");
      }
      if (password.length < 6) {
        throw new Error("Admin password must be at least 6 characters long.");
      }
      if (confirmPassword && password !== confirmPassword) {
        throw new Error("Password and confirmation do not match.");
      }
      if (!this.supabase) {
        throw new Error("Supabase is not configured.");
      }

      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            photo_url: defaultAvatar(fullName)
          }
        }
      });

      if (authError && authError.message && !authError.message.toLowerCase().includes("already registered")) {
        throw new Error(friendlyAuthError(authError));
      }

      // 2. Call bootstrap_admin RPC in PostgreSQL
      const { error: rpcError } = await this.supabase.rpc("bootstrap_admin", {
        p_email: email
      });

      if (rpcError && !rpcError.message.toLowerCase().includes("already exists")) {
        throw new Error(rpcError.message || "Could not bootstrap Admin role in database.");
      }

      // 3. Log in with the newly established admin credentials
      try {
        await this.login(email, password);

        // 4. Generate first invitation code if requested
        let firstInvite = null;
        if (input.firstInviteCode || input.generateFirstInvite) {
          try {
            firstInvite = await this.createInvite({
              code: input.firstInviteCode || "",
              role: input.firstInviteRole || "Member",
              maxUses: input.firstInviteMaxUses || 12,
              expiresAt: input.firstInviteExpires || null,
              note: input.firstInviteNote || "Initial squad invitation code"
            });
          } catch (invErr) {
            console.warn("Could not create initial invite automatically:", invErr);
          }
        }

        return { user: this.currentUser, confirmed: true, firstInvite: firstInvite };
      } catch (loginErr) {
        if (loginErr.message && loginErr.message.toLowerCase().includes("confirm")) {
          return {
            user: null,
            confirmed: false,
            message: "Admin account initialized! Please check your email inbox to confirm your address, then log in."
          };
        }
        throw loginErr;
      }
    }

    async hasActiveAdmin() {
      if (!this.supabase) return false;
      try {
        const { error } = await this.supabase.rpc("bootstrap_admin", {
          p_email: "__probe_check__@the12chronicles.com"
        });
        if (error && error.message && error.message.toLowerCase().includes("already exists")) {
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }

    async bootstrapAdmin(email) {
      if (!this.supabase) throw new Error("Supabase is not connected.");
      const { error } = await this.supabase.rpc("bootstrap_admin", {
        p_email: email
      });
      if (error) throw new Error(error.message);
      if (this.currentUser) {
        await this.loadUserProfile(this.currentUser.uid);
      }
      await this.refreshAllUsers();
      this.emitAuthChanged();
    }
  }

  window.chroniclesUtils = {
    fileToDataUrl: fileToDataUrl,
    defaultAvatar: defaultAvatar,
    isValidEmail: isValidEmail,
    randomInviteCode: randomInviteCode
  };

  window.authService = new SupabaseAuthService();
})();
