// The 12 Chronicles — Authentication UI Controller

(function () {
  "use strict";

  const els = {};

  function refreshElements() {
    els.heading = document.getElementById("auth-heading");
    els.subheading = document.getElementById("auth-subheading");
    els.modeBadge = document.getElementById("auth-mode-badge");
    els.notice = document.getElementById("auth-notice");
    els.modeLogin = document.getElementById("auth-mode-login");
    els.modeSignup = document.getElementById("auth-mode-signup");
    els.loginForm = document.getElementById("login-form");
    els.signupForm = document.getElementById("signup-form");
    els.forgotForm = document.getElementById("forgot-form");
    els.loginSubmit = document.getElementById("login-submit");
    els.signupSubmit = document.getElementById("signup-submit");
    els.forgotSubmit = document.getElementById("forgot-submit");
    els.loginEmail = document.getElementById("login-email");
    els.loginPassword = document.getElementById("login-password");
    els.signupFullName = document.getElementById("signup-fullname");
    els.signupEmail = document.getElementById("signup-email");
    els.signupPassword = document.getElementById("signup-password");
    els.signupConfirm = document.getElementById("signup-confirm");
    els.signupInvite = document.getElementById("signup-invite");
    els.signupRole = document.getElementById("signup-role");
    els.validateInviteBtn = document.getElementById("validate-invite-btn");
    els.inviteStatus = document.getElementById("signup-invite-status");
    els.signupDetails = document.getElementById("signup-details");
    els.signupRoleDisplay = document.getElementById("signup-role-display");
    els.signupRoleNote = document.getElementById("signup-role-note");
    els.signupPhoto = document.getElementById("signup-photo");
    els.signupPhotoPreview = document.getElementById("signup-photo-preview");
    els.forgotEmail = document.getElementById("forgot-email");
    els.forgotLink = document.getElementById("forgot-password-link");
    els.backToLogin = document.getElementById("back-to-login");
    els.localAdminSetup = document.getElementById("local-admin-setup");
    els.adminSetupForm = document.getElementById("admin-setup-form");
    els.adminFullName = document.getElementById("admin-fullname");
    els.adminEmail = document.getElementById("admin-email");
    els.adminPassword = document.getElementById("admin-password");
    els.adminConfirm = document.getElementById("admin-confirm");
    els.adminSetupSubmit = document.getElementById("admin-setup-submit");
    els.adminSetupBack = document.getElementById("admin-setup-back");
    els.adminFirstInviteCode = document.getElementById("admin-first-invite-code");
    els.adminRegenerateCodeBtn = document.getElementById("admin-regenerate-code-btn");
    els.adminFirstInviteUses = document.getElementById("admin-first-invite-uses");
    els.adminFirstInviteExpires = document.getElementById("admin-first-invite-expires");
    els.adminSetupSuccess = document.getElementById("admin-setup-success");
    els.adminSuccessCode = document.getElementById("admin-success-code");
    els.adminSuccessRoleBadge = document.getElementById("admin-success-role-badge");
    els.adminSuccessCopyBtn = document.getElementById("admin-success-copy-btn");
    els.adminSuccessCopyText = document.getElementById("admin-success-copy-text");
    els.adminSuccessDetails = document.getElementById("admin-success-details");
    els.adminSuccessRedirectBtn = document.getElementById("admin-success-redirect-btn");
    els.resetForm = document.getElementById("reset-password-form");
    els.resetPasswordInput = document.getElementById("reset-password");
    els.resetConfirmInput = document.getElementById("reset-confirm");
    els.resetSubmit = document.getElementById("reset-submit");
    els.resetBackToLogin = document.getElementById("reset-back-to-login");
    els.ownerSetupWrapper = document.getElementById("owner-setup-wrapper");
    els.triggerOwnerAdminBtn = document.getElementById("trigger-owner-admin-btn");
    els.ownerSetupStatusMsg = document.getElementById("owner-setup-status-msg");
    els.modeTabsContainer = els.modeLogin ? els.modeLogin.parentElement : (document.getElementById("auth-mode-login") ? document.getElementById("auth-mode-login").parentElement : null);
  }
  refreshElements();

  let activeMode = "login";
  let photoDataUrl = "";
  let submitting = false;
  let validatedInvite = null;
  let isAdminSetupMode = false;

  function safeRedirectTarget(user) {
    const currentUser = user || (window.authService ? window.authService.getCurrentUser() : null);
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("redirect");
    if (raw) {
      let decoded = raw;
      try { decoded = decodeURIComponent(raw); } catch (error) { /* keep raw */ }
      const cleanPath = decoded.split("?")[0].toLowerCase();
      if (cleanPath === "admin" || cleanPath === "admin.html") {
        if (currentUser && currentUser.role === "Admin" && currentUser.roleStatus === "approved") {
          return decoded;
        }
        return "index.html";
      }
      if (cleanPath !== "auth" && cleanPath !== "auth.html") {
        return decoded;
      }
    }

    if (currentUser) {
      if (currentUser.role === "Admin" && currentUser.roleStatus === "approved") {
        return "admin.html";
      }
      if (currentUser.role === "Treasurer" && currentUser.roleStatus === "approved") {
        return "expenses.html";
      }
      return "index.html";
    }
    return "index.html";
  }

  function setFlash(message, type) {
    try {
      sessionStorage.setItem("chronicles_flash", JSON.stringify({
        message: message,
        type: type || "success"
      }));
    } catch (error) {
      /* sessionStorage may be unavailable */
    }
  }

  function showNotice(message, type) {
    if (!els.notice) return;
    if (!message) {
      els.notice.className = "hidden mb-4 p-3 rounded-xl border text-xs leading-relaxed";
      els.notice.textContent = "";
      return;
    }
    const styles = {
      error: "mb-4 p-3 rounded-xl border text-xs leading-relaxed bg-[#C76B4A]/10 border-[#C76B4A]/30 text-[#8f3f26]",
      success: "mb-4 p-3 rounded-xl border text-xs leading-relaxed bg-[#354B3A]/10 border-[#354B3A]/30 text-[#354B3A]",
      info: "mb-4 p-3 rounded-xl border text-xs leading-relaxed bg-[#F7F4EC] border-[#A4A88A]/40 text-[#282824]/80"
    };
    els.notice.className = styles[type] || styles.info;
    els.notice.textContent = message;
  }

  function showInviteStatus(message, type) {
    if (!els.inviteStatus) return;
    if (!message) {
      els.inviteStatus.className = "hidden p-3 rounded-lg border text-[11px] leading-relaxed";
      els.inviteStatus.textContent = "";
      return;
    }
    const styles = {
      error: "p-3 rounded-lg border text-[11px] leading-relaxed bg-[#C76B4A]/10 border-[#C76B4A]/30 text-[#8f3f26]",
      success: "p-3 rounded-lg border text-[11px] leading-relaxed bg-[#354B3A]/10 border-[#354B3A]/30 text-[#354B3A]",
      info: "p-3 rounded-lg border text-[11px] leading-relaxed bg-white border-[#A4A88A]/40 text-[#282824]/75"
    };
    els.inviteStatus.className = styles[type] || styles.info;
    els.inviteStatus.textContent = message;
  }

  function resetInviteValidation(keepMessage) {
    validatedInvite = null;
    if (els.signupDetails) els.signupDetails.classList.add("hidden");
    if (els.signupRole) els.signupRole.value = "Member";
    if (els.signupRoleDisplay) {
      els.signupRoleDisplay.textContent = "Role issued by invitation.";
    }
    if (!keepMessage) showInviteStatus("");
  }

  function applyValidatedInvite(invite) {
    validatedInvite = invite;
    if (els.signupRole) els.signupRole.value = invite.role;
    if (els.signupRoleDisplay) {
      els.signupRoleDisplay.innerHTML = '<strong class="text-[#354B3A]">Invitation valid.</strong> ' +
        'Your role: <span class="font-bold">' + (invite.role === "Treasurer" ? "Treasurer" : "Member") + '</span>. ' +
        (invite.role === "Treasurer"
          ? "You will get Member access until the Admin approves Treasurer access."
          : "Your account will be approved immediately.");
    }
    if (els.signupRoleNote) {
      els.signupRoleNote.textContent = invite.role === "Treasurer"
        ? "Treasurer invitations are reviewed by the Admin after registration. You can use the site as a Member while your request is pending."
        : "Member access is activated as soon as this invitation is redeemed.";
    }
    showInviteStatus(
      "Invitation accepted for " + invite.role + ". " +
      (invite.remainingUses === 1 ? "1 use remaining." : invite.remainingUses + " uses remaining."),
      "success"
    );
    if (els.signupDetails) els.signupDetails.classList.remove("hidden");
    if (els.signupFullName) window.setTimeout(function () { els.signupFullName.focus(); }, 60);
  }

  async function validateInvite() {
    if (submitting) return;
    const code = els.signupInvite ? els.signupInvite.value : "";
    if (!code.trim()) {
      resetInviteValidation();
      showInviteStatus("Enter the invitation code the Admin gave you.", "error");
      return;
    }

    setSubmitting(true, els.validateInviteBtn, "Checking…");
    showInviteStatus("");
    try {
      const invite = await window.authService.previewInvite(code);
      applyValidatedInvite(invite);
    } catch (error) {
      resetInviteValidation();
      showInviteStatus(error.message, "error");
    } finally {
      setSubmitting(false, els.validateInviteBtn);
    }
  }

  function setSubmitting(state, button, label) {
    submitting = state;
    if (!button) return;
    button.disabled = state;
    if (state) {
      button.dataset.originalLabel = button.textContent;
      button.textContent = label || "Please wait…";
    } else if (button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel;
    }
  }

  function setMode(mode, event) {
    if (event) {
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    }
    refreshElements();
    activeMode = (mode === "signup" || mode === "forgot" || mode === "admin-setup" || mode === "reset") ? mode : "login";
    const isLogin = activeMode === "login";
    const isSignup = activeMode === "signup";
    const isForgot = activeMode === "forgot";
    const isAdminSetup = activeMode === "admin-setup";
    const isReset = activeMode === "reset";

    if (els.loginForm) els.loginForm.classList.toggle("hidden", !isLogin);
    if (els.signupForm) els.signupForm.classList.toggle("hidden", !isSignup);
    if (els.forgotForm) els.forgotForm.classList.toggle("hidden", !isForgot);
    if (els.adminSetupForm) els.adminSetupForm.classList.toggle("hidden", !isAdminSetup);
    if (els.resetForm) els.resetForm.classList.toggle("hidden", !isReset);

    if (els.modeTabsContainer) {
      els.modeTabsContainer.classList.toggle("hidden", isAdminSetup || isReset);
    }

    if (els.modeLogin) {
      els.modeLogin.className = isLogin
        ? "py-2.5 rounded-lg text-xs font-bold transition-colors bg-white text-[#354B3A] shadow-sm"
        : "py-2.5 rounded-lg text-xs font-bold transition-colors text-[#282824]/60 hover:text-[#354B3A]";
    }
    if (els.modeSignup) {
      els.modeSignup.className = isSignup
        ? "py-2.5 rounded-lg text-xs font-bold transition-colors bg-white text-[#354B3A] shadow-sm"
        : "py-2.5 rounded-lg text-xs font-bold transition-colors text-[#282824]/60 hover:text-[#354B3A]";
    }

    if (els.heading) {
      els.heading.textContent = isLogin
        ? "Welcome Back"
        : isSignup
          ? "Join The 12 Chronicles"
          : isForgot
            ? "Reset Password"
            : isReset
              ? "Set New Password"
              : "Trip Owner / Admin Setup";
    }
    if (els.subheading) {
      els.subheading.textContent = isLogin
        ? "Section A — Log in with your registered account."
        : isSignup
          ? "Section B — Enter your invitation code to unlock registration."
          : isForgot
            ? "We will email you a secure reset link."
            : isReset
              ? "Enter your new secure password below to regain access."
              : "Dedicated initialization and status for harshitvaidya28@gmail.com";
    }

    if (els.adminSetupSuccess) {
      els.adminSetupSuccess.classList.add("hidden");
    }

    if (els.ownerSetupWrapper) {
      els.ownerSetupWrapper.classList.toggle("hidden", isAdminSetup || isReset);
    }

    if (isAdminSetup) {
      checkAdminStatus();
      if (els.adminEmail) {
        els.adminEmail.value = (window.supabaseConfig && window.supabaseConfig.initialAdminEmail) || "harshitvaidya28@gmail.com";
      }
      if (els.adminFullName && !els.adminFullName.value) {
        els.adminFullName.value = "Harshit Vaidya (Admin)";
      }
      if (els.adminFirstInviteCode && !els.adminFirstInviteCode.value) {
        els.adminFirstInviteCode.value = (window.chroniclesUtils && window.chroniclesUtils.randomInviteCode)
          ? window.chroniclesUtils.randomInviteCode("Member")
          : "CHRONICLES-M" + Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    }

    showNotice("");

    const focusTarget = isLogin
      ? els.loginEmail
      : isSignup
        ? els.signupInvite
        : isForgot
          ? els.forgotEmail
          : els.adminPassword;
    if (focusTarget) {
      window.setTimeout(function () { focusTarget.focus(); }, 60);
    }

    try {
      const url = new URL(window.location.href);
      if (isLogin) {
        url.searchParams.delete("mode");
      } else {
        url.searchParams.set("mode", activeMode);
      }
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  // Globally expose setMode for fail-safe inline click handlers
  
  // Globally expose core helpers for fail-safe inline handlers and external calls
  window.setAuthMode = setMode;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.handleAuthLogin = handleLogin;
  window.validateInviteCode = validateInvite;


  function updateModeBadge() {
    if (!els.modeBadge) return;
    const mode = window.authService ? window.authService.mode : "unconfigured";
    if (mode === "supabase") {
      els.modeBadge.textContent = "⚡ Supabase Live";
      els.modeBadge.className = "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#354B3A]/10 text-[#354B3A]";
    } else if (mode === "error") {
      els.modeBadge.textContent = "⚡ Supabase Error";
      els.modeBadge.className = "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#C76B4A]/15 text-[#C76B4A]";
    } else {
      els.modeBadge.textContent = "⚡ Supabase Not Connected";
      els.modeBadge.className = "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#C76B4A]/15 text-[#C76B4A]";
    }
  }

  
  function togglePasswordVisibility(targetId, button, event) {
    if (event) {
      if (event._pwToggled) return;
      event._pwToggled = true;
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    }
    const id = targetId || (button && button.getAttribute("data-toggle-password"));
    if (!id) return;
    const input = document.getElementById(id);
    if (!input) return;
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    const text = reveal ? "Hide" : "Show";
    if (button) button.textContent = text;
    document.querySelectorAll('[data-toggle-password="' + id + '"]').forEach(function (btn) {
      btn.textContent = text;
    });
  }

  function wirePasswordToggles() {
    document.querySelectorAll("[data-toggle-password]").forEach(function (button) {
      button.onclick = function (e) {
        togglePasswordVisibility(button.getAttribute("data-toggle-password"), button, e);
      };
    });
  }

  function wirePhotoPreview() {
    if (!els.signupPhoto) return;
    els.signupPhoto.addEventListener("change", async function () {
      const file = els.signupPhoto.files && els.signupPhoto.files[0];
      if (!file) {
        photoDataUrl = "";
        return;
      }
      try {
        photoDataUrl = await window.chroniclesUtils.fileToDataUrl(file, 320, 0.82);
        if (els.signupPhotoPreview) els.signupPhotoPreview.src = photoDataUrl;
      } catch (error) {
        photoDataUrl = "";
        showNotice(error.message, "error");
        els.signupPhoto.value = "";
      }
    });
  }

  function resetPhotoPreview() {
    photoDataUrl = "";
    if (els.signupPhotoPreview) {
      if (window.chroniclesUtils && typeof window.chroniclesUtils.defaultAvatar === "function") {
        els.signupPhotoPreview.src = window.chroniclesUtils.defaultAvatar("12");
      } else {
        els.signupPhotoPreview.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Crect%20width%3D%22160%22%20height%3D%22160%22%20rx%3D%2280%22%20fill%3D%22%23354B3A%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2254%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20font-family%3D%22Georgia%2C%20serif%22%20font-size%3D%2262%22%20fill%3D%22%23F7F4EC%22%3E12%3C%2Ftext%3E%3C%2Fsvg%3E";
      }
    }
  }

  async function handleLogin(event) {
    if (event) {
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    }
    refreshElements();
    if (submitting) return;

    const email = els.loginEmail ? els.loginEmail.value.trim() : "";
    const password = els.loginPassword ? els.loginPassword.value : "";
    showNotice("");

    if (!email) {
      showNotice("Please enter your registered email address.", "error");
      if (els.loginEmail) els.loginEmail.focus();
      return;
    }
    if (!password) {
      showNotice("Please enter your password.", "error");
      if (els.loginPassword) els.loginPassword.focus();
      return;
    }

    setSubmitting(true, els.loginSubmit, "Logging in…");
    try {
      if (!window.authService) {
        throw new Error("Authentication service is initializing. Please wait a moment and try again.");
      }
      const user = await window.authService.login(email, password);
      setFlash("Welcome back, " + (user ? user.fullName : "friend") + "!", "success");
      const target = safeRedirectTarget(user);
      window.location.replace(target);
    } catch (error) {
      showNotice(error.message, "error");
      setSubmitting(false, els.loginSubmit);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    if (submitting) return;

    if (isAdminSetupMode) {
      showNotice("");
      setSubmitting(true, els.signupSubmit, "Configuring Admin account…");
      try {
        const adminEmail = els.signupEmail ? els.signupEmail.value : "";
        const adminPassword = els.signupPassword ? els.signupPassword.value : "";
        const adminConfirm = els.signupConfirm ? els.signupConfirm.value : "";
        const adminFullName = els.signupFullName ? els.signupFullName.value : "Harshit Vaidya";

        await window.authService.signUpAdmin({
          fullName: adminFullName,
          email: adminEmail,
          password: adminPassword,
          confirmPassword: adminConfirm
        });

        setFlash("Welcome, Chief Commander! Your exclusive Admin account is active.", "success");
        window.location.replace("admin.html");
      } catch (error) {
        showNotice(error.message, "error");
        setSubmitting(false, els.signupSubmit);
      }
      return;
    }

    const inviteCode = els.signupInvite ? els.signupInvite.value.trim().toUpperCase() : "";
    if (!validatedInvite || validatedInvite.code !== inviteCode) {
      showNotice("Validate your Admin-issued invitation code before creating your account.", "error");
      resetInviteValidation();
      return;
    }

    showNotice("");
    setSubmitting(true, els.signupSubmit, "Creating account…");
    try {
      const result = await window.authService.signUp({
        fullName: els.signupFullName ? els.signupFullName.value : "",
        email: els.signupEmail ? els.signupEmail.value : "",
        password: els.signupPassword ? els.signupPassword.value : "",
        confirmPassword: els.signupConfirm ? els.signupConfirm.value : "",
        inviteCode: inviteCode,
        photoDataUrl: photoDataUrl
      });

      if (result.pendingTreasurer) {
        setFlash("Account created. Your Treasurer invitation is pending Admin approval — you currently have Member access.", "info");
      } else {
        setFlash("Welcome aboard, " + result.user.fullName + "! Your member account is ready.", "success");
      }
      window.location.replace(safeRedirectTarget());
    } catch (error) {
      showNotice(error.message, "error");
      setSubmitting(false, els.signupSubmit);
    }
  }

  async function handleForgot(event) {
    event.preventDefault();
    if (submitting) return;
    showNotice("");
    setSubmitting(true, els.forgotSubmit, "Sending…");
    try {
      await window.authService.resetPassword(els.forgotEmail ? els.forgotEmail.value : "");
      showNotice("Reset link sent. Check your inbox (and spam folder).", "success");
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setSubmitting(false, els.forgotSubmit);
    }
  }

  async function handleResetPasswordSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const password = els.resetPasswordInput ? els.resetPasswordInput.value : "";
    const confirm = els.resetConfirmInput ? els.resetConfirmInput.value : "";

    if (!password || password.length < 6) {
      showNotice("Password must be at least 6 characters long.", "error");
      if (els.resetPasswordInput) els.resetPasswordInput.focus();
      return;
    }

    if (password !== confirm) {
      showNotice("Passwords do not match.", "error");
      if (els.resetConfirmInput) els.resetConfirmInput.focus();
      return;
    }

    showNotice("");
    setSubmitting(true, els.resetSubmit, "Updating password…");

    try {
      const user = await window.authService.updatePassword(password);
      setFlash("Password updated successfully! Welcome back.", "success");
      const target = safeRedirectTarget(user);
      window.location.replace(target);
    } catch (error) {
      showNotice(error.message || "Failed to update password.", "error");
      setSubmitting(false, els.resetSubmit);
    }
  }

  async function handleAdminSetupSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const email = els.adminEmail ? els.adminEmail.value.trim() : "harshitvaidya28@gmail.com";
    const fullName = els.adminFullName ? els.adminFullName.value.trim() : "Harshit Vaidya (Admin)";
    const password = els.adminPassword ? els.adminPassword.value : "";
    const confirmPassword = els.adminConfirm ? els.adminConfirm.value : "";
    const firstInviteCode = els.adminFirstInviteCode ? els.adminFirstInviteCode.value.trim().toUpperCase() : "";
    const firstInviteUses = els.adminFirstInviteUses ? Math.max(1, parseInt(els.adminFirstInviteUses.value, 10) || 12) : 12;
    const firstInviteExpires = (els.adminFirstInviteExpires && els.adminFirstInviteExpires.value)
      ? new Date(els.adminFirstInviteExpires.value).toISOString()
      : null;

    if (!password || password.length < 6) {
      showNotice("Password must be at least 6 characters long.", "error");
      if (els.adminPassword) els.adminPassword.focus();
      return;
    }

    if (password !== confirmPassword) {
      showNotice("Password and confirm password do not match.", "error");
      if (els.adminConfirm) els.adminConfirm.focus();
      return;
    }

    showNotice("");
    setSubmitting(true, els.adminSetupSubmit, "Initializing Admin & generating squad code…");

    try {
      const res = await window.authService.signUpAdmin({
        fullName: fullName,
        email: email,
        password: password,
        confirmPassword: confirmPassword,
        firstInviteCode: firstInviteCode,
        firstInviteMaxUses: firstInviteUses,
        firstInviteExpires: firstInviteExpires,
        generateFirstInvite: true
      });

      if (res && res.confirmed === false) {
        showNotice(res.message, "info");
        setMode("login");
        if (els.loginEmail) els.loginEmail.value = email;
        setSubmitting(false, els.adminSetupSubmit);
        return;
      }

      setFlash("Welcome, Chief Commander! Your Admin account is live.", "success");

      // Show generated invitation code clearly with a Copy button before redirect
      if (res && res.firstInvite && els.adminSetupSuccess) {
        if (els.adminSetupForm) els.adminSetupForm.classList.add("hidden");
        if (els.adminSuccessCode) els.adminSuccessCode.textContent = res.firstInvite.code;
        if (els.adminSuccessRoleBadge) els.adminSuccessRoleBadge.textContent = res.firstInvite.role || "Member";
        if (els.adminSuccessDetails) {
          const uses = res.firstInvite.maxUses || 12;
          const exp = res.firstInvite.expiresAt ? " • Expires: " + new Date(res.firstInvite.expiresAt).toLocaleDateString() : "";
          els.adminSuccessDetails.textContent = `Up to ${uses} uses${exp} • Share with squad members to register`;
        }
        els.adminSetupSuccess.classList.remove("hidden");
        showNotice("Admin setup complete! Your first group invitation code is ready.", "success");
        setSubmitting(false, els.adminSetupSubmit);
        return;
      }

      window.location.replace("admin.html");
    } catch (error) {
      showNotice(error.message || "Failed to initialize Admin account.", "error");
      setSubmitting(false, els.adminSetupSubmit);
    }
  }

  async function checkAdminStatus() {
    if (!window.authService) return;
    try {
      const adminExists = await window.authService.hasActiveAdmin();
      if (adminExists) {
        if (els.ownerSetupStatusMsg) {
          els.ownerSetupStatusMsg.innerHTML = '<span class="text-xs text-[#354B3A] font-semibold">🔒 Admin account established. Click below to view status or log in.</span>';
        }

        // Inside admin setup form, show the dedicated established card with direct Admin Log In button
        let establishedCard = document.getElementById("admin-established-status-card");
        if (!establishedCard && els.adminSetupForm) {
          establishedCard = document.createElement("div");
          establishedCard.id = "admin-established-status-card";
          establishedCard.className = "p-4 bg-white rounded-xl border border-[#354B3A]/30 shadow-sm space-y-3 mb-4";
          establishedCard.innerHTML = `
            <div class="flex items-center gap-2 text-[#354B3A] font-bold">
              <span class="text-lg">👑</span>
              <span class="text-sm">Admin Account Established</span>
            </div>
            <p class="text-xs text-[#282824]/80 leading-relaxed">
              The sole Administrator account for <strong>The 12 Chronicles</strong> is already active for <strong>harshitvaidya28@gmail.com</strong>.
            </p>
            <div class="pt-2 flex flex-col gap-2">
              <button type="button" id="admin-established-login-btn" class="w-full py-3 rounded-xl bg-[#354B3A] hover:bg-[#243428] text-white text-xs font-bold transition-colors shadow-sm">
                Log In to Admin Dashboard →
              </button>
            </div>
          `;
          els.adminSetupForm.prepend(establishedCard);
          document.getElementById("admin-established-login-btn").addEventListener("click", function (e) {
            e.preventDefault();
            // If already logged in as Admin, redirect immediately
            if (window.authService && window.authService.isAdmin()) {
              window.location.replace("admin.html");
              return;
            }
            setMode("login");
            if (els.loginEmail) els.loginEmail.value = "harshitvaidya28@gmail.com";
            if (els.loginPassword) els.loginPassword.focus();
            showNotice("Enter your Admin password to access the Control Panel.", "info");
          });
        }
      }
    } catch (e) {
      console.warn("Could not check admin existence:", e);
    }
  }

  function wireLocalAdminSetup() {
    if (!els.localAdminSetup) return;
    els.localAdminSetup.addEventListener("click", async function () {
      if (!window.authService || window.authService.mode !== "local") return;
      const current = window.authService.getCurrentUser();
      const fullName = window.prompt("Local sandbox Admin name:", current ? current.fullName : "Trip Admin");
      if (fullName === null) return;
      const email = window.prompt("Local sandbox Admin email:", current ? current.email : "admin@12chronicles.local");
      if (email === null) return;
      const password = window.prompt("Local sandbox Admin password (min 6 characters):", "chronicles-admin");
      if (password === null) return;

      try {
        await window.chroniclesLocalAdmin.bootstrap({
          fullName: fullName,
          email: email,
          password: password
        });
        setFlash("Local sandbox Admin ready. This bypass exists only in local preview mode.", "info");
        window.location.replace("admin.html");
      } catch (error) {
        showNotice(error.message, "error");
      }
    });
  }

  
  // Fail-safe global document click delegation for all authentication actions
  function handleDocumentClick(e) {
    // 1. Password reveal toggles (Show / Hide)
    const toggleBtn = e.target.closest("[data-toggle-password]");
    if (toggleBtn) {
      if (e._pwToggled) return;
      togglePasswordVisibility(toggleBtn.getAttribute("data-toggle-password"), toggleBtn, e);
      return;
    }

    // 2. Auth mode switcher: Section A (login) and Section B (signup)
    const modeBtn = e.target.closest("#auth-mode-login, #auth-mode-signup, [data-auth-mode]");
    if (modeBtn) {
      e.preventDefault();
      const mode = modeBtn.getAttribute("data-auth-mode") || (modeBtn.id === "auth-mode-signup" ? "signup" : "login");
      setMode(mode, e);
      return;
    }

    // 3. Trip owner admin setup button
    const ownerBtn = e.target.closest("#trigger-owner-admin-btn, .trigger-owner-setup-link, #trigger-admin-setup-btn");
    if (ownerBtn) {
      e.preventDefault();
      setMode("admin-setup", e);
      return;
    }

    // 4. Back to login / Cancel buttons
    const backBtn = e.target.closest("#back-to-login, #admin-setup-back, #reset-back-to-login");
    if (backBtn) {
      e.preventDefault();
      setMode("login", e);
      return;
    }

    // 5. Forgot password link
    const forgotLink = e.target.closest("#forgot-password-link");
    if (forgotLink) {
      e.preventDefault();
      setMode("forgot", e);
      return;
    }

    // 6. Verify invitation code button
    const verifyInviteBtn = e.target.closest("#validate-invite-btn");
    if (verifyInviteBtn) {
      e.preventDefault();
      validateInvite();
      return;
    }

    // 7. Regenerate admin invitation code
    const regenBtn = e.target.closest("#admin-regenerate-code-btn");
    if (regenBtn) {
      e.preventDefault();
      if (els.adminFirstInviteCode && window.chroniclesUtils && window.chroniclesUtils.randomInviteCode) {
        els.adminFirstInviteCode.value = window.chroniclesUtils.randomInviteCode("Member");
      }
      return;
    }

    // 8. Admin established login button
    const establishedLoginBtn = e.target.closest("#admin-established-login-btn");
    if (establishedLoginBtn) {
      e.preventDefault();
      if (window.authService && window.authService.isAdmin()) {
        window.location.replace("admin.html");
        return;
      }
      setMode("login", e);
      if (els.loginEmail) els.loginEmail.value = "harshitvaidya28@gmail.com";
      if (els.loginPassword) els.loginPassword.focus();
      showNotice("Enter your Admin password to access the Control Panel.", "info");
      return;
    }

    // 9. Admin success copy button
    const copyBtn = e.target.closest("#admin-success-copy-btn");
    if (copyBtn) {
      e.preventDefault();
      const code = els.adminSuccessCode ? els.adminSuccessCode.textContent.trim() : "";
      if (!code) return;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(code).then(function () {
          if (els.adminSuccessCopyText) els.adminSuccessCopyText.textContent = "Copied!";
          if (window.showToast) window.showToast("Invitation code copied: " + code, "success");
          setTimeout(function () {
            if (els.adminSuccessCopyText) els.adminSuccessCopyText.textContent = "Copy Code";
          }, 2500);
        }).catch(function () {
          showNotice("Code: " + code, "info");
        });
      } else {
        showNotice("Code: " + code, "info");
      }
      return;
    }

    // 10. Admin success redirect button
    const redirectBtn = e.target.closest("#admin-success-redirect-btn");
    if (redirectBtn) {
      e.preventDefault();
      window.location.replace("admin.html");
      return;
    }

    // 11. Login submit button
    const loginSubmitBtn = e.target.closest("#login-submit");
    if (loginSubmitBtn) {
      e.preventDefault();
      handleLogin(e);
      return;
    }

    // 12. Signup submit button
    const signupSubmitBtn = e.target.closest("#signup-submit");
    if (signupSubmitBtn) {
      e.preventDefault();
      handleSignup(e);
      return;
    }

    // 13. Admin setup submit button
    const adminSubmitBtn = e.target.closest("#admin-setup-submit");
    if (adminSubmitBtn) {
      e.preventDefault();
      handleAdminSetupSubmit(e);
      return;
    }

    // 14. Forgot password submit button
    const forgotSubmitBtn = e.target.closest("#forgot-submit");
    if (forgotSubmitBtn) {
      e.preventDefault();
      handleForgot(e);
      return;
    }

    // 15. Reset password submit button
    const resetSubmitBtn = e.target.closest("#reset-submit");
    if (resetSubmitBtn) {
      e.preventDefault();
      handleResetPasswordSubmit(e);
      return;
    }
  }

  document.addEventListener("click", handleDocumentClick);

  function wireEvents() {
    refreshElements();
    if (els.modeLogin) {
      els.modeLogin.onclick = function (e) { setMode("login", e); };
    }
    if (els.modeSignup) {
      els.modeSignup.onclick = function (e) { setMode("signup", e); };
    }
    if (els.forgotLink) els.forgotLink.addEventListener("click", function (e) { setMode("forgot", e); });
    if (els.backToLogin) els.backToLogin.addEventListener("click", function (e) { setMode("login", e); });
    if (els.validateInviteBtn) els.validateInviteBtn.addEventListener("click", validateInvite);
    if (els.signupInvite) {
      els.signupInvite.addEventListener("input", function () {
        if (!validatedInvite) return;
        if (els.signupInvite.value.trim().toUpperCase() !== validatedInvite.code) {
          resetInviteValidation();
          showInviteStatus("Invitation changed. Validate the new code to continue.", "info");
        }
      });
      els.signupInvite.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          validateInvite();
        }
      });
    }

    if (els.loginForm) els.loginForm.addEventListener("submit", handleLogin);
    if (els.signupForm) els.signupForm.addEventListener("submit", handleSignup);
    if (els.forgotForm) els.forgotForm.addEventListener("submit", handleForgot);
    if (els.adminSetupForm) els.adminSetupForm.addEventListener("submit", handleAdminSetupSubmit);
    if (els.adminSetupBack) els.adminSetupBack.addEventListener("click", function (e) { setMode("login", e); });
    if (els.triggerOwnerAdminBtn) {
      els.triggerOwnerAdminBtn.onclick = function (e) { setMode("admin-setup", e); };
    }
    document.querySelectorAll(".trigger-owner-setup-link").forEach(function (el) {
      el.addEventListener("click", function (e) { setMode("admin-setup", e); });
    });
    if (els.adminRegenerateCodeBtn) {
      els.adminRegenerateCodeBtn.addEventListener("click", function () {
        if (els.adminFirstInviteCode && window.chroniclesUtils && window.chroniclesUtils.randomInviteCode) {
          els.adminFirstInviteCode.value = window.chroniclesUtils.randomInviteCode("Member");
        }
      });
    }
    if (els.adminSuccessCopyBtn) {
      els.adminSuccessCopyBtn.addEventListener("click", async function () {
        const code = els.adminSuccessCode ? els.adminSuccessCode.textContent.trim() : "";
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
          if (els.adminSuccessCopyText) els.adminSuccessCopyText.textContent = "Copied!";
          if (window.showToast) window.showToast("Invitation code copied: " + code, "success");
          setTimeout(function () {
            if (els.adminSuccessCopyText) els.adminSuccessCopyText.textContent = "Copy Code";
          }, 2500);
        } catch (e) {
          showNotice("Code: " + code, "info");
        }
      });
    }
    if (els.adminSuccessRedirectBtn) {
      els.adminSuccessRedirectBtn.addEventListener("click", function () {
        window.location.replace("admin.html");
      });
    }
    if (els.resetForm) els.resetForm.addEventListener("submit", handleResetPasswordSubmit);
    if (els.resetBackToLogin) els.resetBackToLogin.addEventListener("click", function (e) { setMode("login", e); });

    window.addEventListener("chronicles:passwordRecovery", function () {
      setMode("reset");
      showNotice("Recovery session detected! Please set your new password below.", "info");
    });
    wireLocalAdminSetup();

    const triggerAdminBtn = document.getElementById("trigger-admin-setup-btn");
    if (triggerAdminBtn) {
      triggerAdminBtn.addEventListener("click", function (e) { setMode("admin-setup", e); });
    }

    window.addEventListener("chronicles:authChanged", function (event) {
      const detail = event.detail || {};
      if (detail.user && activeMode !== "forgot") {
        const params = new URLSearchParams(window.location.search);
        if (!params.get("stay")) {
          window.location.replace(safeRedirectTarget(detail.user));
        }
      }
    });
  }

  async function init() {
    try {
      refreshElements();
      resetPhotoPreview();
      wirePasswordToggles();
      wirePhotoPreview();
      wireEvents();

      const params = new URLSearchParams(window.location.search);
      const requested = params.get("mode");
      const hash = window.location.hash || "";

      if (hash.includes("type=recovery") || hash.includes("access_token")) {
        setMode("reset");
        showNotice("Recovery session detected! Please set your new password below.", "info");
      } else {
        setMode(
          requested === "signup" ? "signup" :
          requested === "forgot" ? "forgot" :
          requested === "reset" ? "reset" :
          requested === "admin-setup" ? "admin-setup" : "login"
        );
      }

      if (window.authService) {
        await Promise.race([window.authService.ready, new Promise(function (resolve) { setTimeout(resolve, 3500); })]);
        updateModeBadge();
        await checkAdminStatus();
        if (els.localAdminSetup) {
          els.localAdminSetup.classList.toggle("hidden", window.authService.mode !== "local");
        }
        const notice = window.authService.getAuthNotice();
        if (notice) {
          showNotice(notice, window.authService.mode === "supabase" ? "info" : "error");
          window.authService.clearAuthNotice();
        } else if (window.authService.mode === "error") {
          showNotice("Supabase client connection error. Please verify project credentials.", "error");
        }
        if (window.authService.isPendingTreasurer()) {
          showNotice("Your Treasurer request is pending Admin approval. You currently have Member access.", "info");
        }
      }
    } catch (e) {
      console.error("Auth UI initialization error:", e);
      updateModeBadge();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
