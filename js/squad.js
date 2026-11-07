// The 12 Chronicles — The Squad Controller

(function () {
  const squadContainer = document.getElementById('squad-grid');
  const editModal = document.getElementById('edit-profile-modal');
  const editForm = document.getElementById('edit-profile-form');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  function renderSquad() {
    if (!squadContainer) return;

    const squad = window.authService.getAllMembers();
    const currentUser = window.authService.getCurrentUser();

    squadContainer.innerHTML = squad.map(member => {
      const isMe = currentUser && member.id === currentUser.id;

      return `
        <div class="journal-card overflow-hidden bg-white flex flex-col group border border-[#A4A88A]/30">
          <!-- Portrait Header -->
          <div class="relative h-64 overflow-hidden bg-[#F7F4EC]">
            <img src="${member.avatar}" alt="${member.name}" 
                 class="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
            
            <div class="absolute inset-0 bg-gradient-to-t from-[#282824]/90 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C76B4A] w-max">
                    "${member.nickname}"
                  </span>
                  <h3 class="font-serif text-xl font-bold mt-1 text-white">${member.name}</h3>
                </div>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  member.role === 'Admin' ? 'bg-[#354B3A] text-white' : 'bg-white/20 text-white backdrop-blur-sm'
                }">
                  ${member.role}
                </span>
              </div>
            </div>
          </div>

          <!-- Body details -->
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="mb-3">
                <span class="text-[11px] uppercase tracking-wider font-bold text-[#354B3A]">Trip Responsibility</span>
                <p class="text-xs font-semibold text-[#282824] mt-0.5">${member.tripRole}</p>
              </div>

              <div class="p-3 bg-[#F7F4EC] rounded-xl border border-[#A4A88A]/20 mb-4">
                <span class="text-[10px] uppercase tracking-wider font-bold text-[#A4A88A] block mb-1">Squad Signature / Fun Fact</span>
                <p class="text-xs text-[#282824]/80 italic leading-relaxed">
                  "${member.funFact}"
                </p>
              </div>
            </div>

            <!-- Footer actions -->
            <div class="pt-3 border-t border-[#A4A88A]/20 flex items-center justify-between">
              <span class="text-[11px] text-[#A4A88A]">ID: ${member.collegeId}</span>
              
              <div class="flex items-center gap-2">
                ${isMe ? `
                  <button data-action="edit-me" data-id="${member.id}" 
                          class="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F7F4EC] text-[#354B3A] hover:bg-[#354B3A] hover:text-white transition-colors">
                    Edit Profile
                  </button>
                ` : `
                  <button data-action="switch-to" data-id="${member.id}" 
                          class="px-2.5 py-1 rounded-md text-xs font-semibold border border-[#A4A88A]/40 text-[#282824] hover:bg-[#F7F4EC] transition-colors">
                    Switch To
                  </button>
                `}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    attachListeners();
  }

  function attachListeners() {
    squadContainer.querySelectorAll('[data-action="switch-to"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const user = window.authService.switchMember(id);
        window.showToast(`Active session switched to ${user.name}!`, 'info');
        renderSquad();
      });
    });

    squadContainer.querySelectorAll('[data-action="edit-me"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const member = window.authService.getMemberById(id);
        if (member && editModal) {
          document.getElementById('edit-nickname').value = member.nickname;
          document.getElementById('edit-funfact').value = member.funFact;
          document.getElementById('edit-triprole').value = member.tripRole;
          editModal.classList.remove('hidden');
        }
      });
    });
  }

  function initEditForm() {
    if (cancelEditBtn && editModal) {
      cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
      });
    }

    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentUser = window.authService.getCurrentUser();
        if (currentUser) {
          currentUser.nickname = document.getElementById('edit-nickname').value.trim();
          currentUser.funFact = document.getElementById('edit-funfact').value.trim();
          currentUser.tripRole = document.getElementById('edit-triprole').value.trim();
          window.showToast('Profile updated!', 'success');
          editModal.classList.add('hidden');
          renderSquad();
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEditForm();
    renderSquad();

    window.addEventListener('chronicles:authChanged', () => {
      renderSquad();
    });
  });
})();
