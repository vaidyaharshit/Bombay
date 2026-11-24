// The 12 Chronicles — Trip Planner, Logistics, Tasks & Polls Controller

(function () {
  let tasks = [];
  let polls = [];
  let logistics = null;
  let activeTaskFilter = 'all'; // 'all' or memberId

  // Tab switching
  const tabs = document.querySelectorAll('[data-planner-tab]');
  const sections = {
    logistics: document.getElementById('section-logistics'),
    tasks: document.getElementById('section-tasks'),
    polls: document.getElementById('section-polls')
  };

  async function initPlanner() {
    tasks = await window.chroniclesData.getTasks();
    polls = await window.chroniclesData.getPolls();
    logistics = await window.chroniclesData.getLogistics();

    renderLogistics();
    renderTasks();
    renderPolls();
  }

  // 1. Logistics Rendering (Train, Hotel, Room Allocations)
  function renderLogistics() {
    if (!sections.logistics || !logistics) return;

    const { train, hotel, rooms } = logistics;

    document.getElementById('train-name').innerText = train.trainName;
    document.getElementById('train-route').innerText = `${train.departureStation} ➔ ${train.arrivalStation}`;
    document.getElementById('train-dep').innerText = train.departureTime;
    document.getElementById('train-arr').innerText = train.arrivalTime;
    document.getElementById('train-pnr').innerText = train.pnrNumber;
    document.getElementById('train-coach').innerText = train.coach;

    document.getElementById('hotel-name').innerText = hotel.hotelName;
    document.getElementById('hotel-address').innerText = hotel.address;
    document.getElementById('hotel-checkin').innerText = hotel.checkIn;
    document.getElementById('hotel-checkout').innerText = hotel.checkOut;
    document.getElementById('hotel-contact').innerText = hotel.contact;
    document.getElementById('hotel-map-link').href = hotel.mapUrl;

    const roomsContainer = document.getElementById('rooms-grid');
    if (roomsContainer && rooms) {
      roomsContainer.innerHTML = rooms.map(room => `
        <div class="journal-card p-5 bg-white border border-[#A4A88A]/30">
          <div class="flex items-center justify-between mb-3 border-b border-[#A4A88A]/20 pb-2">
            <h4 class="font-serif font-bold text-base text-[#282824]">${room.roomNumber}</h4>
            <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#354B3A]/10 text-[#354B3A]">
              ${room.label}
            </span>
          </div>
          <div class="space-y-2">
            ${room.members.map(name => {
              const member = window.authService.getAllMembers().find(m => m.name === name);
              return `
                <div class="flex items-center gap-2.5 text-xs text-[#282824]">
                  <img src="${member ? member.avatar : ''}" class="w-6 h-6 rounded-full object-cover" />
                  <span class="font-medium">${name}</span>
                  ${member ? `<span class="text-[10px] text-[#A4A88A]">(${member.nickname})</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('');
    }
  }

  // 2. Tasks & Preparation Checklist Rendering
  function renderTasks() {
    const tasksContainer = document.getElementById('tasks-list');
    const tasksStats = document.getElementById('tasks-stats');
    if (!tasksContainer) return;

    const currentUser = window.authService.getCurrentUser();
    const filteredTasks = tasks.filter(t => {
      if (activeTaskFilter === 'mine') return t.assignedToId === (currentUser ? currentUser.id : '');
      if (activeTaskFilter !== 'all') return t.assignedToId === activeTaskFilter;
      return true;
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    if (tasksStats) {
      tasksStats.innerHTML = `
        <div class="flex items-center justify-between text-xs font-semibold text-[#282824] mb-1.5">
          <span>Preparation Progress (${completedTasks}/${totalTasks} Tasks Completed)</span>
          <span>${taskPercent}%</span>
        </div>
        <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div class="bg-[#354B3A] h-full transition-all duration-500" style="width: ${taskPercent}%"></div>
        </div>
      `;
    }

    if (filteredTasks.length === 0) {
      tasksContainer.innerHTML = `
        <div class="text-center py-12 bg-white rounded-xl border border-[#A4A88A]/30 p-6">
          <p class="font-serif text-base font-bold text-[#282824]">No tasks assigned in this view</p>
          <p class="text-xs text-[#282824]/60 mt-1">Add a new task using the button above.</p>
        </div>
      `;
      return;
    }

    tasksContainer.innerHTML = filteredTasks.map(task => {
      const isDone = task.status === 'Done';
      const assignedMember = window.authService.getMemberById(task.assignedToId);

      return `
        <div class="journal-card p-4 flex items-center justify-between gap-4 transition-all ${isDone ? 'bg-gray-50/70 opacity-80' : 'bg-white'}">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <input type="checkbox" data-task-toggle="${task.id}" ${isDone ? 'checked' : ''} 
                   class="journal-checkbox mt-1 cursor-pointer" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded ${
                  task.priority === 'High' ? 'bg-[#C76B4A]/15 text-[#C76B4A]' :
                  task.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                }">
                  ${task.priority} Priority
                </span>
                <span class="text-[10px] px-2 py-0.2 rounded-full bg-[#A4A88A]/20 text-[#354B3A] font-semibold">
                  ${task.category}
                </span>
                <span class="text-[11px] text-[#A4A88A]">Due: ${task.deadline}</span>
              </div>
              <h4 class="text-sm font-semibold text-[#282824] ${isDone ? 'line-through text-gray-400' : ''} truncate">
                ${task.title}
              </h4>
            </div>
          </div>

          <!-- Assigned Member Avatar & Delete -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2" title="Assigned to ${task.assignedToName}">
              <img src="${assignedMember ? assignedMember.avatar : ''}" class="w-7 h-7 rounded-full object-cover ring-1 ring-[#354B3A]/20" />
              <span class="hidden sm:inline text-xs font-medium text-[#282824]">${task.assignedToName.split(' ')[0]}</span>
            </div>
            <button data-task-delete="${task.id}" class="text-gray-400 hover:text-red-500 p-1" title="Delete Task">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    tasksContainer.querySelectorAll('[data-task-toggle]').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = chk.getAttribute('data-task-toggle');
        const newStatus = chk.checked ? 'Done' : 'To Do';
        await window.chroniclesData.updateTaskStatus(id, newStatus);
        tasks = await window.chroniclesData.getTasks();
        renderTasks();
      });
    });

    tasksContainer.querySelectorAll('[data-task-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-task-delete');
        if (confirm('Delete this task?')) {
          await window.chroniclesData.deleteTask(id);
          tasks = await window.chroniclesData.getTasks();
          renderTasks();
          window.showToast('Task deleted', 'info');
        }
      });
    });
  }

  // 3. Group Polls Rendering & Voting
  function renderPolls() {
    const pollsContainer = document.getElementById('polls-container');
    if (!pollsContainer) return;

    const currentUser = window.authService.getCurrentUser();
    const currentUserId = currentUser ? currentUser.id : null;

    if (polls.length === 0) {
      pollsContainer.innerHTML = `
        <div class="text-center py-12 bg-white rounded-xl border border-[#A4A88A]/30 p-6">
          <p class="font-serif text-base font-bold text-[#282824]">No active polls</p>
          <p class="text-xs text-[#282824]/60 mt-1">Create a group poll below to decide restaurants, spots, or activities.</p>
        </div>
      `;
      return;
    }

    pollsContainer.innerHTML = polls.map(poll => {
      // Calculate total votes
      let totalVotes = 0;
      poll.options.forEach(opt => {
        totalVotes += (opt.votes ? opt.votes.length : 0);
      });

      return `
        <div class="journal-card p-6 bg-white border border-[#A4A88A]/30">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#354B3A]/10 text-[#354B3A]">
                Group Decision Poll
              </span>
              <h3 class="font-serif text-lg font-bold text-[#282824] mt-1">${poll.question}</h3>
              <p class="text-xs text-[#A4A88A] mt-0.5">Created by ${poll.createdBy} • Total votes: ${totalVotes}</p>
            </div>
          </div>

          <!-- Options -->
          <div class="space-y-3">
            ${poll.options.map((option, optIdx) => {
              const votesCount = option.votes ? option.votes.length : 0;
              const percent = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
              const hasVotedForThis = option.votes && option.votes.includes(currentUserId);

              return `
                <div class="relative overflow-hidden rounded-xl border transition-all ${
                  hasVotedForThis ? 'border-[#354B3A] bg-[#354B3A]/5 shadow-sm' : 'border-gray-200 hover:border-[#A4A88A]'
                }">
                  <!-- Percentage background fill -->
                  <div class="absolute inset-y-0 left-0 bg-[#A4A88A]/20 transition-all duration-500" style="width: ${percent}%;"></div>

                  <div class="relative p-3.5 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <button data-vote-poll="${poll.id}" data-opt-idx="${optIdx}"
                              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                hasVotedForThis ? 'border-[#354B3A] bg-[#354B3A] text-white' : 'border-gray-300 bg-white hover:border-[#354B3A]'
                              }">
                        ${hasVotedForThis ? '<span class="text-[9px]">✓</span>' : ''}
                      </button>
                      <span class="text-xs sm:text-sm font-medium text-[#282824] truncate">${option.text}</span>
                    </div>

                    <div class="flex items-center gap-3">
                      <!-- Voter avatars preview -->
                      <div class="flex -space-x-1.5 overflow-hidden">
                        ${(option.votes || []).map(voterId => {
                          const m = window.authService.getMemberById(voterId);
                          return m ? `<img src="${m.avatar}" title="${m.name}" class="inline-block h-5 w-5 rounded-full ring-1 ring-white object-cover" />` : '';
                        }).join('')}
                      </div>
                      <span class="text-xs font-bold text-[#282824] min-w-[36px] text-right">${percent}%</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Attach vote listeners
    pollsContainer.querySelectorAll('[data-vote-poll]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pollId = btn.getAttribute('data-vote-poll');
        const optIdx = parseInt(btn.getAttribute('data-opt-idx'));
        const user = window.authService.getCurrentUser();
        await window.chroniclesData.votePoll(pollId, optIdx, user.id);
        polls = await window.chroniclesData.getPolls();
        renderPolls();
        window.showToast(`Vote recorded for ${user.nickname}!`, 'success');
      });
    });
  }

  // Modals & Creation
  function initModals() {
    // Add Task Modal
    const addTaskBtn = document.getElementById('open-add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    const taskForm = document.getElementById('task-form');
    const taskMemberSelect = document.getElementById('task-assigned-select');

    if (taskMemberSelect) {
      taskMemberSelect.innerHTML = window.authService.getAllMembers().map(m => `
        <option value="${m.id}">${m.name} (${m.nickname})</option>
      `).join('');
    }

    if (addTaskBtn && taskModal) {
      addTaskBtn.addEventListener('click', () => {
        taskModal.classList.remove('hidden');
      });
    }

    if (cancelTaskBtn && taskModal) {
      cancelTaskBtn.addEventListener('click', () => {
        taskModal.classList.add('hidden');
        taskForm.reset();
      });
    }

    if (taskForm) {
      taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const category = document.getElementById('task-category').value;
        const assignedToId = document.getElementById('task-assigned-select').value;
        const deadline = document.getElementById('task-deadline').value;
        const priority = document.getElementById('task-priority').value;
        const assignedMember = window.authService.getMemberById(assignedToId);

        await window.chroniclesData.addTask({
          title,
          category,
          assignedToId,
          assignedToName: assignedMember ? assignedMember.name : 'Squad',
          deadline,
          priority
        });

        tasks = await window.chroniclesData.getTasks();
        renderTasks();
        taskModal.classList.add('hidden');
        taskForm.reset();
        window.showToast('Preparation task added!', 'success');
      });
    }

    // Create Poll Modal
    const createPollBtn = document.getElementById('open-create-poll-btn');
    const pollModal = document.getElementById('poll-modal');
    const cancelPollBtn = document.getElementById('cancel-poll-btn');
    const pollForm = document.getElementById('poll-form');

    if (createPollBtn && pollModal) {
      createPollBtn.addEventListener('click', () => {
        pollModal.classList.remove('hidden');
      });
    }

    if (cancelPollBtn && pollModal) {
      cancelPollBtn.addEventListener('click', () => {
        pollModal.classList.add('hidden');
        pollForm.reset();
      });
    }

    if (pollForm) {
      pollForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = document.getElementById('poll-question').value.trim();
        const opt1 = document.getElementById('poll-opt-1').value.trim();
        const opt2 = document.getElementById('poll-opt-2').value.trim();
        const opt3 = document.getElementById('poll-opt-3').value.trim();

        const options = [{ text: opt1, votes: [] }, { text: opt2, votes: [] }];
        if (opt3) options.push({ text: opt3, votes: [] });

        const user = window.authService.getCurrentUser();
        await window.chroniclesData.createPoll({
          question,
          options,
          createdBy: user ? user.name : 'Squad'
        });

        polls = await window.chroniclesData.getPolls();
        renderPolls();
        pollModal.classList.add('hidden');
        pollForm.reset();
        window.showToast('Group poll created!', 'success');
      });
    }

    // Filter tasks buttons
    const filterTaskSelect = document.getElementById('filter-task-member');
    if (filterTaskSelect) {
      filterTaskSelect.innerHTML = `<option value="all">All Tasks</option><option value="mine">Assigned to Me</option>` +
        window.authService.getAllMembers().map(m => `
          <option value="${m.id}">${m.name}</option>
        `).join('');

      filterTaskSelect.addEventListener('change', (e) => {
        activeTaskFilter = e.target.value;
        renderTasks();
      });
    }
  }

  // Navigation tab switching
  function initTabs() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('border-[#354B3A]', 'text-[#354B3A]', 'font-bold');
          t.classList.add('border-transparent', 'text-[#282824]/70');
        });
        tab.classList.add('border-[#354B3A]', 'text-[#354B3A]', 'font-bold');
        tab.classList.remove('border-transparent', 'text-[#282824]/70');

        const target = tab.getAttribute('data-planner-tab');
        Object.keys(sections).forEach(k => {
          if (sections[k]) {
            sections[k].classList.toggle('hidden', k !== target);
          }
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (window.authService) {
      await window.authService.ready;
    }
    initTabs();
    initModals();
    initPlanner();

    window.addEventListener('chronicles:tasksUpdated', () => {
      initPlanner();
    });
    window.addEventListener('chronicles:pollsUpdated', () => {
      initPlanner();
    });
    window.addEventListener('chronicles:membersChanged', () => {
      initPlanner();
    });
    window.addEventListener('chronicles:authChanged', () => {
      initPlanner();
    });
  });
})();

