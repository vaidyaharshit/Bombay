// The 12 Chronicles — Admin Control Panel Controller
// Handles invitation code generation, code revocation, treasurer approvals, and member role management.

(function () {
  "use strict";

  let currentFilter = "all";
  let cachedInvites = [];
  let cachedUsers = [];

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

  function formatDate(isoString) {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatDateTime(isoString) {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    }) + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  function getInviteComputedStatus(invite) {
    if (invite.status === "revoked") return "revoked";
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
      return "expired";
    }
    const maxUses = Math.max(1, Number(invite.maxUses || 1));
    const usageCount = Number(invite.usageCount || 0);
    if (usageCount >= maxUses) return "depleted";
    return "active";
  }

  function statusBadge(status) {
    switch (status) {
      case "active":
        return '<span class="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#354B3A]/10 text-[#354B3A]"><span class="w-1.5 h-1.5 rounded-full bg-[#354B3A]"></span>Active</span>';
      case "depleted":
        return '<span class="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#282824]/10 text-[#282824]/70">Depleted</span>';
      case "expired":
        return '<span class="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C76B4A]/15 text-[#C76B4A]">Expired</span>';
      case "revoked":
        return '<span class="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">Revoked</span>';
      default:
        return '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">' + escapeHtml(status) + '</span>';
    }
  }

  function roleBadge(role, isPending) {
    if (role === "Admin") {
      return '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#C76B4A] text-white">Admin Owner</span>';
    }
    if (role === "Treasurer") {
      if (isPending) {
        return '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#C76B4A]/15 text-[#C76B4A]">Treasurer (Pending)</span>';
      }
      return '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#354B3A] text-white">Treasurer</span>';
    }
    return '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#A4A88A]/30 text-[#354B3A]">Member</span>';
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand("copy");
    textArea.remove();
    return success;
  }

  class AdminController {
    constructor() {
      this.initElements();
      this.bindEvents();
    }

    initElements() {
      this.deniedEl = document.getElementById("admin-access-denied");
      this.mainEl = document.getElementById("admin-main-interface");
      this.modePill = document.getElementById("admin-mode-pill");

      this.adminAvatar = document.getElementById("admin-avatar");
      this.adminName = document.getElementById("admin-name");
      this.adminEmail = document.getElementById("admin-email");

      this.statTotalMembers = document.getElementById("stat-total-members");
      this.statActiveMembers = document.getElementById("stat-active-members");
      this.statPendingTreasurers = document.getElementById("stat-pending-treasurers");
      this.pendingBadge = document.getElementById("pending-badge");
      this.statActiveInvites = document.getElementById("stat-active-invites");
      this.statUsedInvites = document.getElementById("stat-used-invites");

      this.pendingSection = document.getElementById("treasurer-approvals-section");
      this.pendingList = document.getElementById("pending-treasurers-list");
      this.pendingPill = document.getElementById("pending-treasurer-pill");

      this.generateForm = document.getElementById("generate-invite-form");
      this.roleSelect = document.getElementById("invite-role");
      this.maxUsesInput = document.getElementById("invite-max-uses");
      this.expiresInput = document.getElementById("invite-expires");
      this.noteInput = document.getElementById("invite-note");
      this.generateBtn = document.getElementById("generate-code-btn");

      this.generatedBanner = document.getElementById("generated-code-banner");
      this.generatedCodeText = document.getElementById("generated-code-text");
      this.generatedCodeRole = document.getElementById("generated-code-role-badge");
      this.generatedCodeDetails = document.getElementById("generated-code-details");
      this.copyGeneratedBtn = document.getElementById("copy-generated-code-btn");
      this.copyBtnText = document.getElementById("copy-btn-text");
      this.dismissBannerBtn = document.getElementById("dismiss-generated-banner-btn");

      this.invitesTableBody = document.getElementById("invites-table-body");
      this.membersTableBody = document.getElementById("members-table-body");
      this.refreshBtn = document.getElementById("refresh-admin-btn");
    }

    bindEvents() {
      if (this.generateForm) {
        this.generateForm.addEventListener("submit", (e) => this.handleGenerateInvite(e));
      }

      if (this.copyGeneratedBtn) {
        this.copyGeneratedBtn.addEventListener("click", () => this.handleCopyGeneratedCode());
      }

      if (this.dismissBannerBtn) {
        this.dismissBannerBtn.addEventListener("click", () => {
          if (this.generatedBanner) this.generatedBanner.classList.add("hidden");
        });
      }

      if (this.refreshBtn) {
        this.refreshBtn.addEventListener("click", () => {
          this.refreshData(true);
        });
      }

      document.querySelectorAll(".invite-filter-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          document.querySelectorAll(".invite-filter-btn").forEach((b) => {
            b.classList.remove("font-bold", "text-[#354B3A]", "bg-white", "shadow-xs");
            b.classList.add("font-semibold", "text-[#282824]/70");
          });
          btn.classList.add("font-bold", "text-[#354B3A]", "bg-white", "shadow-xs");
          btn.classList.remove("text-[#282824]/70");
          currentFilter = btn.dataset.filter || "all";
          this.renderInvitesTable();
        });
      });

      window.addEventListener("chronicles:authChanged", () => this.checkAccessAndLoad());
      window.addEventListener("chronicles:membersChanged", () => this.refreshData(false));
    }

    async checkAccessAndLoad() {
      if (!window.authService) return;

      const user = window.authService.getCurrentUser();
      const isAdmin = window.authService.isAdmin();

      if (!user) {
        // Redirect to login with redirect param
        window.location.replace("auth.html?mode=login&redirect=admin.html");
        return;
      }

      if (!isAdmin) {
        if (this.mainEl) this.mainEl.classList.add("hidden");
        if (this.deniedEl) this.deniedEl.classList.remove("hidden");
        return;
      }

      // User is verified Admin
      if (this.deniedEl) this.deniedEl.classList.add("hidden");
      if (this.mainEl) this.mainEl.classList.remove("hidden");

      // Update admin identity
      if (this.adminAvatar) this.adminAvatar.src = user.avatar || user.photoURL || "";
      if (this.adminName) this.adminName.textContent = user.fullName || "Admin";
      if (this.adminEmail) this.adminEmail.textContent = user.email || "";
      if (this.modePill) {
        this.modePill.textContent = window.authService.mode === "supabase" ? "⚡ Supabase Protected" : "Supabase Not Connected";
      }

      await this.refreshData(false);
    }

    async refreshData(showToastFeedback) {
      if (!window.authService || !window.authService.isAdmin()) return;

      try {
        if (this.refreshBtn) {
          this.refreshBtn.classList.add("animate-pulse");
        }

        cachedUsers = window.authService.getAllUsersForAdmin();
        cachedInvites = await window.authService.getInvites();

        this.renderStats();
        this.renderPendingTreasurers();
        this.renderInvitesTable();
        this.renderMembersTable();

        if (showToastFeedback && window.showToast) {
          window.showToast("Admin data updated successfully.", "success");
        }
      } catch (error) {
        console.error("Error refreshing admin data:", error);
        if (window.showToast) {
          window.showToast(error.message || "Failed to load admin data.", "error");
        }
      } finally {
        if (this.refreshBtn) {
          this.refreshBtn.classList.remove("animate-pulse");
        }
      }
    }

    renderStats() {
      const activeMembers = cachedUsers.filter((u) => u.accountStatus === "active");
      const pendingTreasurers = cachedUsers.filter(
        (u) => u.accountStatus === "active" && u.role === "Treasurer" && u.roleStatus === "pending"
      );

      let activeInvitesCount = 0;
      let usedOrExpiredCount = 0;

      cachedInvites.forEach((inv) => {
        const computed = getInviteComputedStatus(inv);
        if (computed === "active") {
          activeInvitesCount += 1;
        } else {
          usedOrExpiredCount += 1;
        }
      });

      if (this.statTotalMembers) this.statTotalMembers.textContent = String(cachedUsers.length);
      if (this.statActiveMembers) this.statActiveMembers.textContent = String(activeMembers.length);
      if (this.statPendingTreasurers) this.statPendingTreasurers.textContent = String(pendingTreasurers.length);
      if (this.pendingBadge) {
        if (pendingTreasurers.length > 0) {
          this.pendingBadge.classList.remove("hidden");
        } else {
          this.pendingBadge.classList.add("hidden");
        }
      }
      if (this.statActiveInvites) this.statActiveInvites.textContent = String(activeInvitesCount);
      if (this.statUsedInvites) this.statUsedInvites.textContent = String(usedOrExpiredCount);
    }

    renderPendingTreasurers() {
      if (!this.pendingList) return;

      const pending = cachedUsers.filter(
        (u) => u.accountStatus === "active" && u.role === "Treasurer" && u.roleStatus === "pending"
      );

      if (this.pendingPill) {
        this.pendingPill.textContent = pending.length + " Pending";
      }

      if (!pending.length) {
        this.pendingList.innerHTML = `
          <div class="py-6 text-center text-xs text-[#282824]/60 bg-[#F7F4EC]/50 rounded-xl border border-dashed border-[#A4A88A]/30">
            <svg class="w-8 h-8 mx-auto text-[#A4A88A] mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            No pending Treasurer applications. All squad members are currently up to date.
          </div>
        `;
        return;
      }

      this.pendingList.innerHTML = pending.map((user) => {
        return `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#C76B4A]/30 bg-[#C76B4A]/5">
            <div class="flex items-center gap-3">
              <img src="${escapeHtml(user.avatar || user.photoURL)}" alt="${escapeHtml(user.fullName)}" class="w-11 h-11 rounded-full object-cover border border-[#C76B4A]" />
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-[#282824]">${escapeHtml(user.fullName)}</span>
                  ${user.nickname ? `<span class="text-[10px] text-[#A4A88A]">"${escapeHtml(user.nickname)}"</span>` : ""}
                  <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-[#C76B4A] text-white">Pending Approval</span>
                </div>
                <div class="text-xs text-[#282824]/70 mt-0.5">
                  <span>${escapeHtml(user.email)}</span>
                  ${user.inviteCode ? `<span class="text-[#A4A88A] ml-2">• Code: <code class="font-mono text-[#354B3A] font-bold">${escapeHtml(user.inviteCode)}</code></span>` : ""}
                  <span class="text-[#A4A88A] ml-2">• Applied: ${escapeHtml(formatDate(user.createdAt))}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 self-end sm:self-auto">
              <button data-action="reject-treasurer" data-uid="${escapeHtml(user.uid)}"
                      class="px-3.5 py-2 rounded-xl border border-[#A4A88A]/40 text-[#282824] text-xs font-semibold hover:bg-white transition-colors">
                Reject &amp; Set as Member
              </button>
              <button data-action="approve-treasurer" data-uid="${escapeHtml(user.uid)}"
                      class="px-4 py-2 rounded-xl bg-[#354B3A] hover:bg-[#243428] text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Approve as Treasurer
              </button>
            </div>
          </div>
        `;
      }).join("");

      this.pendingList.querySelectorAll('[data-action="approve-treasurer"]').forEach((btn) => {
        btn.addEventListener("click", () => this.handleApproveTreasurer(btn.dataset.uid));
      });

      this.pendingList.querySelectorAll('[data-action="reject-treasurer"]').forEach((btn) => {
        btn.addEventListener("click", () => this.handleRejectTreasurer(btn.dataset.uid));
      });
    }

    async handleApproveTreasurer(uid) {
      if (!confirm("Grant this member full Treasurer privileges (manage and settle expenses)?")) return;
      try {
        await window.authService.approveTreasurer(uid);
        if (window.showToast) window.showToast("Treasurer application approved.", "success");
        await this.refreshData(false);
      } catch (error) {
        if (window.showToast) window.showToast(error.message || "Failed to approve Treasurer.", "error");
      }
    }

    async handleRejectTreasurer(uid) {
      if (!confirm("Relegate this member to regular Member status (read-only expenses)?")) return;
      try {
        await window.authService.rejectTreasurer(uid);
        if (window.showToast) window.showToast("Application rejected. User set as Member.", "info");
        await this.refreshData(false);
      } catch (error) {
        if (window.showToast) window.showToast(error.message || "Failed to update role.", "error");
      }
    }

    async handleGenerateInvite(e) {
      e.preventDefault();
      const role = this.roleSelect.value;
      const maxUses = parseInt(this.maxUsesInput.value, 10) || 1;
      const expiresAt = this.expiresInput.value ? new Date(this.expiresInput.value).toISOString() : "";
      const note = this.noteInput.value.trim();

      try {
        if (this.generateBtn) {
          this.generateBtn.disabled = true;
          this.generateBtn.textContent = "Generating...";
        }

        const invite = await window.authService.createInvite({
          role: role,
          maxUses: maxUses,
          expiresAt: expiresAt,
          note: note
        });

        // Show banner
        if (this.generatedBanner) {
          this.generatedCodeText.textContent = invite.code;
          this.generatedCodeRole.textContent = invite.role;
          this.generatedCodeRole.className = invite.role === "Treasurer"
            ? "text-xs font-bold px-2 py-0.5 rounded bg-[#C76B4A] text-white"
            : "text-xs font-bold px-2 py-0.5 rounded bg-[#354B3A] text-white";

          const expiryText = invite.expiresAt ? "Expires: " + formatDate(invite.expiresAt) : "No expiration";
          const usageText = invite.maxUses === 1 ? "Single-use" : "Up to " + invite.maxUses + " uses";
          this.generatedCodeDetails.textContent = `${usageText} • ${expiryText}${invite.note ? " • Note: " + invite.note : ""}`;

          this.generatedBanner.classList.remove("hidden");
        }

        if (window.showToast) {
          window.showToast("New " + role + " invite code generated: " + invite.code, "success");
        }

        // Reset form
        this.noteInput.value = "";
        this.expiresInput.value = "";
        this.maxUsesInput.value = "1";

        await this.refreshData(false);
      } catch (error) {
        if (window.showToast) window.showToast(error.message || "Failed to create invitation.", "error");
      } finally {
        if (this.generateBtn) {
          this.generateBtn.disabled = false;
          this.generateBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Generate Invitation Code
          `;
        }
      }
    }

    async handleCopyGeneratedCode() {
      const code = this.generatedCodeText ? this.generatedCodeText.textContent.trim() : "";
      if (!code) return;

      const success = await copyToClipboard(code);
      if (success) {
        if (this.copyBtnText) this.copyBtnText.textContent = "Copied!";
        if (window.showToast) window.showToast("Invitation code copied to clipboard: " + code, "success");
        setTimeout(() => {
          if (this.copyBtnText) this.copyBtnText.textContent = "Copy Code";
        }, 2500);
      }
    }

    renderInvitesTable() {
      if (!this.invitesTableBody) return;

      let filtered = cachedInvites.slice();
      if (currentFilter === "active") {
        filtered = filtered.filter((i) => getInviteComputedStatus(i) === "active");
      } else if (currentFilter === "used") {
        filtered = filtered.filter((i) => getInviteComputedStatus(i) === "depleted");
      } else if (currentFilter === "expired") {
        filtered = filtered.filter((i) => getInviteComputedStatus(i) === "expired");
      } else if (currentFilter === "revoked") {
        filtered = filtered.filter((i) => getInviteComputedStatus(i) === "revoked");
      }

      if (!filtered.length) {
        this.invitesTableBody.innerHTML = `
          <tr>
            <td colspan="8" class="py-8 text-center text-xs text-[#282824]/60">
              No invitation codes found for this filter.
            </td>
          </tr>
        `;
        return;
      }

      this.invitesTableBody.innerHTML = filtered.map((inv) => {
        const computed = getInviteComputedStatus(inv);
        const isActive = computed === "active";
        const rolePill = inv.role === "Treasurer"
          ? '<span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#C76B4A]/15 text-[#C76B4A]">Treasurer</span>'
          : '<span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#354B3A]/10 text-[#354B3A]">Member</span>';

        const redeemedUsers = (inv.usedBy || []).map((u) => escapeHtml(u.name || u.email)).join(", ") || "—";

        return `
          <tr class="hover:bg-[#F7F4EC]/60 transition-colors">
            <td class="py-3 px-3">
              <div class="flex items-center gap-2">
                <code class="font-mono font-bold text-xs text-[#282824] bg-[#F7F4EC] px-2 py-1 rounded border border-[#A4A88A]/30">
                  ${escapeHtml(inv.code)}
                </code>
                <button data-action="copy-code" data-code="${escapeHtml(inv.code)}"
                        class="text-[#A4A88A] hover:text-[#354B3A] p-1 rounded transition-colors" title="Copy code">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                  </svg>
                </button>
              </div>
            </td>
            <td class="py-3 px-3">${rolePill}</td>
            <td class="py-3 px-3">${statusBadge(computed)}</td>
            <td class="py-3 px-3 font-medium">
              <span class="${inv.usageCount >= inv.maxUses ? "text-[#C76B4A] font-bold" : "text-[#282824]"}">
                ${inv.usageCount || 0} / ${inv.maxUses || 1}
              </span>
            </td>
            <td class="py-3 px-3 max-w-[150px] truncate" title="${escapeHtml(redeemedUsers)}">
              ${redeemedUsers}
            </td>
            <td class="py-3 px-3 text-[#282824]/70">${formatDate(inv.expiresAt)}</td>
            <td class="py-3 px-3 text-[#A4A88A] italic max-w-[120px] truncate" title="${escapeHtml(inv.note || "")}">
              ${escapeHtml(inv.note || "—")}
            </td>
            <td class="py-3 px-3 text-right">
              ${isActive ? `
                <button data-action="revoke-code" data-code="${escapeHtml(inv.code)}"
                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#C76B4A] hover:bg-[#C76B4A]/10 transition-colors">
                  Revoke
                </button>
              ` : `
                <span class="text-[11px] text-[#A4A88A]">Inert</span>
              `}
            </td>
          </tr>
        `;
      }).join("");

      this.invitesTableBody.querySelectorAll('[data-action="copy-code"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
          const code = btn.dataset.code;
          const success = await copyToClipboard(code);
          if (success && window.showToast) {
            window.showToast("Copied " + code + " to clipboard.", "success");
          }
        });
      });

      this.invitesTableBody.querySelectorAll('[data-action="revoke-code"]').forEach((btn) => {
        btn.addEventListener("click", () => this.handleRevokeInvite(btn.dataset.code));
      });
    }

    async handleRevokeInvite(code) {
      if (!confirm("Are you sure you want to revoke invitation code " + code + "? Nobody will be able to register with this code.")) return;
      try {
        await window.authService.revokeInvite(code);
        if (window.showToast) window.showToast("Invitation code revoked.", "success");
        await this.refreshData(false);
      } catch (error) {
        if (window.showToast) window.showToast(error.message || "Failed to revoke invitation.", "error");
      }
    }

    renderMembersTable() {
      if (!this.membersTableBody) return;

      const currentAdmin = window.authService.getCurrentUser();

      if (!cachedUsers.length) {
        this.membersTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="py-8 text-center text-xs text-[#282824]/60">
              No registered members found.
            </td>
          </tr>
        `;
        return;
      }

      this.membersTableBody.innerHTML = cachedUsers.map((user) => {
        const isSelf = currentAdmin && user.uid === currentAdmin.uid;
        const isAdmin = user.role === "Admin" && user.roleStatus === "approved";
        const isPending = user.role === "Treasurer" && user.roleStatus === "pending";

        return `
          <tr class="hover:bg-[#F7F4EC]/60 transition-colors">
            <td class="py-3 px-3">
              <div class="flex items-center gap-3">
                <img src="${escapeHtml(user.avatar || user.photoURL)}" alt="${escapeHtml(user.fullName)}" class="w-8 h-8 rounded-full object-cover border border-[#A4A88A]/40" />
                <div>
                  <div class="font-bold text-xs text-[#282824] flex items-center gap-1.5">
                    <span>${escapeHtml(user.fullName)}</span>
                    ${isSelf ? '<span class="text-[9px] bg-[#354B3A] text-white px-1.5 py-0.2 rounded font-bold uppercase">You</span>' : ""}
                  </div>
                  ${user.nickname ? `<div class="text-[10px] text-[#A4A88A]">"${escapeHtml(user.nickname)}"</div>` : ""}
                </div>
              </div>
            </td>
            <td class="py-3 px-3 text-[#282824]/80">${escapeHtml(user.email)}</td>
            <td class="py-3 px-3">${roleBadge(user.role, isPending)}</td>
            <td class="py-3 px-3">
              <span class="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${user.accountStatus === "active" ? "bg-[#354B3A]/10 text-[#354B3A]" : "bg-red-100 text-red-700"}">
                <span class="w-1.5 h-1.5 rounded-full ${user.accountStatus === "active" ? "bg-[#354B3A]" : "bg-red-600"}"></span>
                ${escapeHtml(user.accountStatus || "active")}
              </span>
            </td>
            <td class="py-3 px-3 text-[#282824]/70">${formatDate(user.createdAt)}</td>
            <td class="py-3 px-3 text-right">
              ${isAdmin ? `
                <span class="text-[11px] font-bold text-[#C76B4A] uppercase tracking-wider">Owner (Protected)</span>
              ` : `
                <select data-action="change-role" data-uid="${escapeHtml(user.uid)}"
                        class="px-2.5 py-1 rounded-lg border border-[#A4A88A]/40 bg-white text-xs font-semibold focus:outline-none focus:border-[#354B3A]">
                  <option value="Member" ${user.role === "Member" ? "selected" : ""}>Member</option>
                  <option value="Treasurer" ${user.role === "Treasurer" && user.roleStatus === "approved" ? "selected" : ""}>Treasurer (Approved)</option>
                </select>
              `}
            </td>
          </tr>
        `;
      }).join("");

      this.membersTableBody.querySelectorAll('[data-action="change-role"]').forEach((select) => {
        select.addEventListener("change", (e) => {
          const uid = select.dataset.uid;
          const newRole = e.target.value;
          this.handleChangeMemberRole(uid, newRole);
        });
      });
    }

    async handleChangeMemberRole(uid, newRole) {
      if (!confirm("Are you sure you want to change this member's role to " + newRole + "?")) {
        await this.refreshData(false);
        return;
      }

      try {
        await window.authService.setMemberRole(uid, newRole);
        if (window.showToast) {
          window.showToast("Member role updated to " + newRole + ".", "success");
        }
        await this.refreshData(false);
      } catch (error) {
        if (window.showToast) window.showToast(error.message || "Failed to update member role.", "error");
        await this.refreshData(false);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const adminCtrl = new AdminController();
    adminCtrl.checkAccessAndLoad();
  });
})();
