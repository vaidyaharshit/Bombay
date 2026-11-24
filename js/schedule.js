// The 12 Chronicles — Trip Schedule Controller

(function () {
  let allScheduleItems = [];
  let activeDayFilter = 'all';
  let searchQuery = '';

  const timelineContainer = document.getElementById('timeline-container');
  const dayTabsContainer = document.getElementById('day-tabs');
  const searchInput = document.getElementById('schedule-search');
  const addActivityBtn = document.getElementById('add-activity-btn');
  const activityModal = document.getElementById('activity-modal');
  const activityForm = document.getElementById('activity-form');
  const modalTitle = document.getElementById('modal-title');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const upcomingBanner = document.getElementById('upcoming-banner');

  async function loadSchedule() {
    allScheduleItems = await window.chroniclesData.getSchedule();
    renderSchedule();
    renderUpcomingHighlight();
  }

  function getFilteredItems() {
    return allScheduleItems.filter(item => {
      const matchDay = (activeDayFilter === 'all') || (item.day === parseInt(activeDayFilter));
      const matchSearch = searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDay && matchSearch;
    });
  }

  function renderSchedule() {
    if (!timelineContainer) return;
    const items = getFilteredItems();
    const isAdmin = window.authService.isAdmin();

    if (items.length === 0) {
      timelineContainer.innerHTML = `
        <div class="text-center py-16 bg-white rounded-2xl border border-[#A4A88A]/30 p-8">
          <div class="w-12 h-12 mx-auto rounded-full bg-[#F7F4EC] flex items-center justify-center text-[#A4A88A] mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <p class="font-serif text-lg font-bold text-[#282824]">No activities found</p>
          <p class="text-xs text-[#282824]/60 mt-1">Try selecting a different day or clearing your search.</p>
        </div>
      `;
      return;
    }

    // Group items by day for editorial timeline
    let currentDayGroup = null;
    let html = '';

    items.forEach((item, index) => {
      const isNewDay = item.day !== currentDayGroup;
      if (isNewDay) {
        currentDayGroup = item.day;
        html += `
          <div class="pt-8 pb-4 first:pt-0">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#354B3A] text-white text-xs font-semibold tracking-wide shadow-sm">
              <span>Day ${item.day}</span>
              <span class="text-white/60">•</span>
              <span class="text-white/80 font-normal">Dec ${23 + item.day}, 2026</span>
            </div>
          </div>
        `;
      }

      const isCompleted = item.status === 'Completed';

      html += `
        <div class="relative pl-8 pb-8 last:pb-2 group">
          <!-- Timeline line -->
          <div class="absolute left-3 top-3 bottom-0 w-0.5 bg-[#A4A88A]/30 group-last:hidden"></div>

          <!-- Timeline node dot -->
          <button data-action="toggle-status" data-id="${item.id}" title="Toggle completed status"
                  class="absolute left-1 top-1.5 w-4 h-4 rounded-full border-2 transition-transform transform hover:scale-125 ${
                    isCompleted 
                      ? 'bg-[#354B3A] border-[#354B3A]' 
                      : 'bg-white border-[#C76B4A]'
                  }">
            ${isCompleted ? '<svg class="w-2.5 h-2.5 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
          </button>

          <!-- Card Content -->
          <div class="journal-card p-5 transition-all ${isCompleted ? 'opacity-85 bg-gray-50/70' : 'bg-white'}">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                  <span class="text-xs font-mono font-bold text-[#C76B4A] bg-[#C76B4A]/10 px-2 py-0.5 rounded">
                    ${item.time}
                  </span>
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    item.category === 'Techfest' ? 'badge-forest' : 
                    item.category === 'Sightseeing' ? 'badge-terracotta' : 
                    item.category === 'Food' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'badge-olive'
                  }">
                    ${item.category}
                  </span>
                  <span class="text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-50 text-blue-800'
                  }">
                    ${item.status}
                  </span>
                </div>

                <h3 class="font-serif text-lg font-bold text-[#282824] ${isCompleted ? 'line-through text-gray-500' : ''}">
                  ${item.title}
                </h3>

                <p class="text-xs text-[#282824]/80 mt-1 leading-relaxed">
                  ${item.description}
                </p>

                <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#282824]/70">
                  <a href="${item.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(item.location)}`}" 
                     target="_blank" rel="noopener noreferrer"
                     class="inline-flex items-center gap-1.5 text-[#354B3A] font-semibold hover:underline">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span>${item.location}</span>
                  </a>
                  ${item.addedBy ? `<span class="text-[11px] text-[#A4A88A]">• Added by ${item.addedBy}</span>` : ''}
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2 self-end sm:self-start pt-2 sm:pt-0">
                <button data-action="toggle-status" data-id="${item.id}"
                        class="text-xs px-2.5 py-1 rounded-md border border-[#A4A88A]/40 hover:bg-[#F7F4EC] text-[#282824]">
                  ${isCompleted ? 'Mark Pending' : 'Mark Done'}
                </button>
                ${isAdmin ? `
                  <button data-action="edit" data-id="${item.id}" title="Edit Activity"
                          class="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-[#354B3A]">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  <button data-action="delete" data-id="${item.id}" title="Delete Activity"
                          class="p-1.5 rounded-md hover:bg-red-50 text-gray-600 hover:text-red-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    });

    timelineContainer.innerHTML = html;
    attachActionListeners();
  }

  function renderUpcomingHighlight() {
    if (!upcomingBanner) return;
    const upcoming = allScheduleItems.find(i => i.status !== 'Completed') || allScheduleItems[0];
    if (upcoming) {
      upcomingBanner.innerHTML = `
        <div class="bg-[#354B3A] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-start sm:items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg flex-shrink-0">
              🧭
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] uppercase tracking-wider font-bold text-[#F7F4EC]/80">Up Next On Schedule</span>
                <span class="text-[10px] px-2 py-0.2 bg-[#C76B4A] text-white rounded-full font-bold">Day ${upcoming.day} • ${upcoming.time}</span>
              </div>
              <h4 class="font-serif text-lg font-bold text-white mt-0.5">${upcoming.title}</h4>
              <p class="text-xs text-white/80 line-clamp-1">${upcoming.location}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <a href="${upcoming.mapUrl}" target="_blank" rel="noopener noreferrer" 
               class="px-4 py-2 bg-white text-[#354B3A] rounded-xl text-xs font-bold hover:bg-[#F7F4EC] transition-colors flex items-center gap-1.5 shadow-sm">
              <span>Directions</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
          </div>
        </div>
      `;
    }
  }

  function attachActionListeners() {
    timelineContainer.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const item = allScheduleItems.find(i => i.id === id);

        if (action === 'toggle-status') {
          const newStatus = item.status === 'Completed' ? 'Upcoming' : 'Completed';
          await window.chroniclesData.updateScheduleItem(id, { status: newStatus });
          window.showToast(`Activity marked as ${newStatus}`, 'success');
          loadSchedule();
        } else if (action === 'delete') {
          if (confirm(`Delete "${item.title}" from trip schedule?`)) {
            await window.chroniclesData.deleteScheduleItem(id);
            window.showToast('Activity deleted from schedule', 'info');
            loadSchedule();
          }
        } else if (action === 'edit') {
          openEditModal(item);
        }
      });
    });
  }

  function openEditModal(item = null) {
    if (!activityModal) return;
    const isEdit = !!item;
    modalTitle.innerText = isEdit ? 'Edit Schedule Activity' : 'Add Trip Activity';
    
    document.getElementById('act-id').value = isEdit ? item.id : '';
    document.getElementById('act-title').value = isEdit ? item.title : '';
    document.getElementById('act-day').value = isEdit ? item.day : '1';
    document.getElementById('act-time').value = isEdit ? item.time : '10:00 AM';
    document.getElementById('act-category').value = isEdit ? item.category : 'Techfest';
    document.getElementById('act-location').value = isEdit ? item.location : '';
    document.getElementById('act-mapurl').value = isEdit ? (item.mapUrl || '') : '';
    document.getElementById('act-desc').value = isEdit ? item.description : '';

    activityModal.classList.remove('hidden');
  }

  function initTabs() {
    if (!dayTabsContainer) return;
    dayTabsContainer.querySelectorAll('[data-day]').forEach(btn => {
      btn.addEventListener('click', () => {
        dayTabsContainer.querySelectorAll('[data-day]').forEach(b => {
          b.classList.remove('bg-[#354B3A]', 'text-white');
          b.classList.add('bg-white', 'text-[#282824]', 'border-[#A4A88A]/30');
        });
        btn.classList.add('bg-[#354B3A]', 'text-white');
        btn.classList.remove('bg-white', 'text-[#282824]');

        activeDayFilter = btn.getAttribute('data-day');
        renderSchedule();
      });
    });
  }

  function initForm() {
    if (!activityForm) return;

    activityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('act-id').value;
      const title = document.getElementById('act-title').value.trim();
      const day = parseInt(document.getElementById('act-day').value);
      const time = document.getElementById('act-time').value.trim();
      const category = document.getElementById('act-category').value;
      const location = document.getElementById('act-location').value.trim();
      const mapUrl = document.getElementById('act-mapurl').value.trim() || `https://maps.google.com/?q=${encodeURIComponent(location)}`;
      const description = document.getElementById('act-desc').value.trim();
      const currentUser = window.authService.getCurrentUser();

      if (id) {
        await window.chroniclesData.updateScheduleItem(id, {
          title, day, time, category, location, mapUrl, description
        });
        window.showToast('Schedule activity updated successfully', 'success');
      } else {
        await window.chroniclesData.addScheduleItem({
          title, day, time, category, location, mapUrl, description,
          addedBy: currentUser ? currentUser.name : 'Squad'
        });
        window.showToast('New activity added to the schedule!', 'success');
      }

      activityModal.classList.add('hidden');
      activityForm.reset();
      loadSchedule();
    });

    if (cancelModalBtn) {
      cancelModalBtn.addEventListener('click', () => {
        activityModal.classList.add('hidden');
      });
    }

    if (addActivityBtn) {
      addActivityBtn.addEventListener('click', () => {
        openEditModal();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderSchedule();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (window.authService) {
      await window.authService.ready;
    }
    initTabs();
    initForm();
    loadSchedule();

    window.addEventListener('chronicles:authChanged', () => {
      renderSchedule();
    });

    window.addEventListener('chronicles:membersChanged', () => {
      renderSchedule();
    });

    window.addEventListener('chronicles:scheduleUpdated', () => {
      loadSchedule();
    });
  });
})();

