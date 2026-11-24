// The 12 Chronicles — The Squad Controller

(function () {
  "use strict";

  const squadContainer = document.getElementById("squad-grid");
  const editModal = document.getElementById("edit-profile-modal");
  const editForm = document.getElementById("edit-profile-form");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const saveProfileBtn = document.getElementById("save-profile-btn");
  const memberCountEl = document.getElementById("squad-member-count");
  const roleNoticeEl = document.getElementById("squad-role-notice");
  const adminSection = document.getElementById("admin-approvals");
  const adminList = document.getElementById("admin-approvals-list");
  const pendingCountEl = document.getElementById("pending-application-count");

  let editPhotoDataUrl = "";

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

  function rolePill(user) {
    const pending = user.role === "Treasurer" && user.roleStatus === "pending";
    const label = pending ? "Treasurer pending" : (user.effectiveRole || "Member");
    const classes = user.effectiveRole === "Admin"
      ? "bg-[#C76B4A] text-white"
      : pending
        ? "bg-[#C76B4A]/15 text-[#C76B4A]"
        : user.effectiveRole === "Treasurer"
          ? "bg-[#354B3A] text-white"
          : "bg-white/20 text-white backdrop-blur-sm";
    return '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ' + classes + '">' +
      escapeHtml(label) + "</span>";
  }

  function formatMemberSince(value) {
    if (!value) return "Recently joined";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Recently joined";
    return "Member since " + date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function renderSquad() {
    if (!squadContainer) return;

    const squad = window.authService.getAllMembers();
    const currentUser = window.authService.getCurrentUser();

    if (memberCountEl) {
      memberCountEl.textContent = squad.length + " / 12 Registered Members";
    }

    const adminPanelLink = document.getElementById("admin-panel-link");
    if (adminPanelLink) {
      if (window.authService && window.authService.isAdmin()) {
        adminPanelLink.classList.remove("hidden");
      } else {
        adminPanelLink.classList.add("hidden");
      }
    }

    if (!squad.length) {
      squadContainer.innerHTML = `
        <div class="sm:col-span-2 lg:col-span-4 text-center py-14 bg-white rounded-xl border border-[#A4A88A]/30">
          <p class="font-serif text-lg font-bold text-[#282824]">No members registered yet</p>
          <p class="text-xs text-[#282824]/60 mt-1">Share the invitation code with the squad to get everyone onboard.</p>
        </div>
      `;
      return;
    }

    squadContainer.innerHTML = squad.map(function (member) {
      const isMe = currentUser && member.uid === currentUser.uid;
      const nickname = member.nickname ? '"' + member.nickname + '"' : "Squad Member";
      const tripRole = member.tripRole || "Trip role not set yet";
      const funFact = member.funFact || "No fun fact shared yet.";
      const ringClass = isMe ? "ring-2 ring-[#C76B4A] ring-offset-2 ring-offset-[#F7F4EC]" : "";
      const statusText = member.accountStatus === "active" ? "Active Member" : "Registered";

      return `
        <div class="journal-card overflow-hidden bg-white flex flex-col group border border-[#A4A88A]/30 ${ringClass}">
          <div class="relative h-64 overflow-hidden bg-[#F7F4EC]">
            <img src="${escapeHtml(member.avatar)}" alt="${escapeHtml(member.fullName)}"
                 class="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />

            <div class="absolute inset-0 bg-gradient-to-t from-[#282824]/90 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
              <div class="flex items-end justify-between gap-2">
                <div class="min-w-0">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C76B4A] inline-block max-w-full truncate">
                    ${escapeHtml(nickname)}
                  </span>
                  <h3 class="font-serif text-xl font-bold mt-1 text-white truncate">${escapeHtml(member.fullName)}</h3>
                  ${isMe ? '<span class="text-[10px] text-white/80 font-semibold">This is you</span>' : ""}
                </div>
                ${rolePill(member)}
              </div>
            </div>
          </div>

          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3 pb-2.5 border-b border-[#A4A88A]/20">
                <span class="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[#354B3A]">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#354B3A]"></span>
                  ${escapeHtml(statusText)}
                </span>
                <span class="text-[10px] font-semibold text-[#A4A88A]">
                  ${member.effectiveRole === "Admin" ? "Owner & Admin" : member.effectiveRole === "Treasurer" ? "Treasurer" : "Member"}
                </span>
              </div>

              <div class="mb-3">
                <span class="text-[11px] uppercase tracking-wider font-bold text-[#354B3A]">Trip Responsibility</span>
                <p class="text-xs font-semibold text-[#282824] mt-0.5">${escapeHtml(tripRole)}</p>
              </div>

              <div class="p-3 bg-[#F7F4EC] rounded-xl border border-[#A4A88A]/20 mb-4">
                <span class="text-[10px] uppercase tracking-wider font-bold text-[#A4A88A] block mb-1">Squad Signature / Fun Fact</span>
                <p class="text-xs text-[#282824]/80 italic leading-relaxed line-clamp-3">"${escapeHtml(funFact)}"</p>
              </div>
            </div>

            <div class="pt-3 border-t border-[#A4A88A]/20 flex items-center justify-between gap-2">
              <span class="text-[10px] text-[#A4A88A] truncate">${escapeHtml(formatMemberSince(member.createdAt))}</span>
              ${isMe ? `
                <button data-action="edit-me"
                        class="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F7F4EC] text-[#354B3A] hover:bg-[#354B3A] hover:text-white transition-colors flex-shrink-0">
                  Edit Profile
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");

    squadContainer.querySelectorAll('[data-action="edit-me"]').forEach(function (button) {
      button.addEventListener("click", openEditModal);
    });
  }

  function renderRoleNotice() {
    if (!roleNoticeEl) return;
    const user = window.authService.getCurrentUser();
    if (!user) {
      roleNoticeEl.classList.add("hidden");
      return;
    }

    let message = "";
    if (user.role === "Treasurer" && user.roleStatus === "pending") {
      message = '<div class="p-4 rounded-xl bg-[#C76B4A]/10 border border-[#C76B4A]/30 text-xs text-[#8f3f26] leading-relaxed">' +
        "<strong>Treasurer request pending.</strong> An Admin needs to approve your request before you can manage the shared expense ledger. You currently have Member access." +
        "</div>";
    } else if (user.effectiveRole === "Admin") {
      message = '<div class="p-4 rounded-xl bg-[#354B3A]/10 border border-[#354B3A]/30 text-xs text-[#354B3A] leading-relaxed">' +
        "<strong>Admin access active.</strong> You can review Treasurer applications below and manage the shared expense ledger." +
        "</div>";
    } else if (user.effectiveRole === "Treasurer") {
      message = '<div class="p-4 rounded-xl bg-[#354B3A]/10 border border-[#354B3A]/30 text-xs text-[#354B3A] leading-relaxed">' +
        "<strong>Treasurer access approved.</strong> You can add, edit and settle shared expenses from the Expenses page." +
        "</div>";
    }

    if (message) {
      roleNoticeEl.innerHTML = message;
      roleNoticeEl.classList.remove("hidden");
    } else {
      roleNoticeEl.innerHTML = "";
      roleNoticeEl.classList.add("hidden");
    }
  }

  function renderAdminPanel() {
    if (!adminSection || !adminList) return;

    const isAdmin = window.authService.isAdmin();
    const applications = isAdmin ? window.authService.getPendingTreasurerApplications() : [];

    if (!isAdmin) {
      adminSection.classList.add("hidden");
      return;
    }

    adminSection.classList.remove("hidden");
    if (pendingCountEl) {
      pendingCountEl.textContent = applications.length + " pending";
    }

    if (!applications.length) {
      adminList.innerHTML = `
        <div class="p-4 bg-[#F7F4EC] rounded-xl border border-[#A4A88A]/30 text-xs text-[#282824]/70 text-center">
          No Treasurer applications are waiting for review.
        </div>
      `;
      return;
    }

    adminList.innerHTML = applications.map(function (member) {
      return `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F7F4EC] rounded-xl border border-[#A4A88A]/30">
          <div class="flex items-center gap-3 min-w-0">
            <img src="${escapeHtml(member.avatar)}" alt="" class="w-10 h-10 rounded-full object-cover" />
            <div class="min-w-0">
              <p class="text-sm font-bold text-[#282824] truncate">${escapeHtml(member.fullName)}</p>
              <p class="text-[11px] text-[#282824]/60 truncate">${escapeHtml(member.email)}</p>
              <p class="text-[10px] text-[#A4A88A] mt-0.5">Requested Treasurer access ${escapeHtml(formatMemberSince(member.createdAt).replace("Member since ", "since "))}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button data-approve="${escapeHtml(member.uid)}"
                    class="px-3 py-1.5 rounded-lg bg-[#354B3A] hover:bg-[#243428] text-white text-xs font-semibold transition-colors">
              Approve
            </button>
            <button data-reject="${escapeHtml(member.uid)}"
                    class="px-3 py-1.5 rounded-lg border border-[#A4A88A]/50 hover:bg-white text-[#282824] text-xs font-semibold transition-colors">
              Reject
            </button>
          </div>
        </div>
      `;
    }).join("");

    adminList.querySelectorAll("[data-approve]").forEach(function (button) {
      button.addEventListener("click", async function () {
        button.disabled = true;
        try {
          await window.authService.approveTreasurer(button.getAttribute("data-approve"));
          window.showToast("Treasurer access approved.", "success");
          refresh();
        } catch (error) {
          window.showToast(error.message, "error");
          button.disabled = false;
        }
      });
    });

    adminList.querySelectorAll("[data-reject]").forEach(function (button) {
      button.addEventListener("click", async function () {
        button.disabled = true;
        try {
          await window.authService.rejectTreasurer(button.getAttribute("data-reject"));
          window.showToast("Treasurer request rejected. The member keeps Member access.", "info");
          refresh();
        } catch (error) {
          window.showToast(error.message, "error");
          button.disabled = false;
        }
      });
    });
  }

  function openEditModal() {
    const user = window.authService.getCurrentUser();
    if (!user || !editModal) return;

    editPhotoDataUrl = "";
    const preview = document.getElementById("edit-photo-preview");
    if (preview) preview.src = user.avatar;

    const fullName = document.getElementById("edit-fullname");
    const email = document.getElementById("edit-email");
    const nickname = document.getElementById("edit-nickname");
    const tripRole = document.getElementById("edit-triprole");
    const funFact = document.getElementById("edit-funfact");

    if (fullName) fullName.value = user.fullName;
    if (email) email.value = user.email;
    if (nickname) nickname.value = user.nickname || "";
    if (tripRole) tripRole.value = user.tripRole || "";
    if (funFact) funFact.value = user.funFact || "";

    const photoInput = document.getElementById("edit-photo");
    if (photoInput) photoInput.value = "";

    editModal.classList.remove("hidden");
  }

  function initEditForm() {
    if (cancelEditBtn && editModal) {
      cancelEditBtn.addEventListener("click", function () {
        editModal.classList.add("hidden");
      });
    }

    const photoInput = document.getElementById("edit-photo");
    if (photoInput) {
      photoInput.addEventListener("change", async function () {
        const file = photoInput.files && photoInput.files[0];
        if (!file) {
          editPhotoDataUrl = "";
          return;
        }
        try {
          editPhotoDataUrl = await window.chroniclesUtils.fileToDataUrl(file, 320, 0.82);
          const preview = document.getElementById("edit-photo-preview");
          if (preview) preview.src = editPhotoDataUrl;
        } catch (error) {
          editPhotoDataUrl = "";
          photoInput.value = "";
          window.showToast(error.message, "error");
        }
      });
    }

    if (!editForm) return;

    editForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (saveProfileBtn) {
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Saving…";
      }
      try {
        const updates = {
          fullName: document.getElementById("edit-fullname").value,
          nickname: document.getElementById("edit-nickname").value,
          tripRole: document.getElementById("edit-triprole").value,
          funFact: document.getElementById("edit-funfact").value
        };
        if (editPhotoDataUrl) updates.photoURL = editPhotoDataUrl;
        await window.authService.updateProfile(updates);
        window.showToast("Profile updated successfully.", "success");
        if (editModal) editModal.classList.add("hidden");
        refresh();
      } catch (error) {
        window.showToast(error.message, "error");
      } finally {
        if (saveProfileBtn) {
          saveProfileBtn.disabled = false;
          saveProfileBtn.textContent = "Save Changes";
        }
      }
    });
  }

  function refresh() {
    renderRoleNotice();
    renderAdminPanel();
    renderSquad();
  }

  async function init() {
    if (window.authService) {
      await window.authService.ready;
    }
    initEditForm();
    refresh();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("chronicles:authChanged", refresh);
  window.addEventListener("chronicles:membersChanged", refresh);
})();
