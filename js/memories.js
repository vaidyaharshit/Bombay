// The 12 Chronicles — Trip Memories & Trip Wrapped Controller

(function () {
  let destinations = [];
  let photos = [];
  let expenses = [];
  let schedule = [];
  let groupNotes = [
    {
      id: "note_1",
      author: "Aryan Sharma",
      date: "Dec 28, 2026",
      text: "Standing on the tetrapods at Marine Drive at 2 AM with all 11 of you singing acoustic songs is something I'll remember for the rest of my life."
    },
    {
      id: "note_2",
      author: "Ananya Iyer",
      date: "Dec 27, 2026",
      text: "The morning ferry to Elephanta with cold Arabian Sea wind blowing and everyone cheering when the dolphins showed up. Best camera roll of my year."
    },
    {
      id: "note_3",
      author: "Rohan Mehta",
      date: "Dec 26, 2026",
      text: "I ate 9 plates of butter pav bhaji across 5 days and I have zero regrets. Mumbai street food is pure poetry."
    }
  ];

  const statsContainer = document.getElementById('wrapped-stats-grid');
  const memoryBoard = document.getElementById('memory-board-list');
  const addMemoryForm = document.getElementById('add-memory-form');

  async function loadMemories() {
    destinations = await window.chroniclesData.getDestinations();
    photos = await window.chroniclesData.getPhotos();
    expenses = await window.chroniclesData.getExpenses();
    schedule = await window.chroniclesData.getSchedule();

    renderWrappedStats();
    renderMemoryBoard();
  }

  function renderWrappedStats() {
    if (!statsContainer) return;

    const visitedCount = destinations.filter(d => d.visited).length;
    const totalPhotos = photos.length;
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const completedActivities = schedule.filter(s => s.status === 'Completed').length;

    statsContainer.innerHTML = `
      <div class="journal-card p-6 bg-white border border-[#A4A88A]/30 text-center">
        <span class="text-3xl block mb-2">📍</span>
        <h3 class="font-serif text-3xl font-bold text-[#354B3A]">${visitedCount}</h3>
        <p class="text-xs uppercase tracking-wider font-bold text-[#A4A88A] mt-1">Destinations Visited</p>
        <span class="text-[11px] text-[#282824]/60 mt-0.5 block">Across Mumbai & Powai</span>
      </div>

      <div class="journal-card p-6 bg-white border border-[#A4A88A]/30 text-center">
        <span class="text-3xl block mb-2">📸</span>
        <h3 class="font-serif text-3xl font-bold text-[#C76B4A]">${totalPhotos}</h3>
        <p class="text-xs uppercase tracking-wider font-bold text-[#A4A88A] mt-1">Photos Captured</p>
        <span class="text-[11px] text-[#282824]/60 mt-0.5 block">Hall of Fame Gallery</span>
      </div>

      <div class="journal-card p-6 bg-white border border-[#A4A88A]/30 text-center">
        <span class="text-3xl block mb-2">🎯</span>
        <h3 class="font-serif text-3xl font-bold text-[#354B3A]">${completedActivities}</h3>
        <p class="text-xs uppercase tracking-wider font-bold text-[#A4A88A] mt-1">Itinerary Items Done</p>
        <span class="text-[11px] text-[#282824]/60 mt-0.5 block">100% Group Participation</span>
      </div>

      <div class="journal-card p-6 bg-white border border-[#A4A88A]/30 text-center">
        <span class="text-3xl block mb-2">💳</span>
        <h3 class="font-serif text-3xl font-bold text-[#282824]">₹${totalSpent.toLocaleString('en-IN')}</h3>
        <p class="text-xs uppercase tracking-wider font-bold text-[#A4A88A] mt-1">Total Trip Expense</p>
        <span class="text-[11px] text-[#282824]/60 mt-0.5 block">Equally Split Amongst 12</span>
      </div>
    `;
  }

  function renderMemoryBoard() {
    if (!memoryBoard) return;

    memoryBoard.innerHTML = groupNotes.map(note => {
      const authorMember = window.authService.getAllMembers().find(m => m.name === note.author);

      return `
        <div class="journal-card p-5 bg-white border border-[#A4A88A]/30 flex flex-col justify-between">
          <p class="font-serif text-sm sm:text-base text-[#282824] leading-relaxed italic mb-4">
            "${note.text}"
          </p>
          <div class="flex items-center justify-between pt-3 border-t border-[#A4A88A]/20">
            <div class="flex items-center gap-2">
              <img src="${authorMember ? authorMember.avatar : ''}" class="w-6 h-6 rounded-full object-cover" />
              <span class="text-xs font-bold text-[#354B3A]">${note.author}</span>
            </div>
            <span class="text-[10px] text-[#A4A88A]">${note.date}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function initForm() {
    if (addMemoryForm) {
      addMemoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('memory-note-text').value.trim();
        const currentUser = window.authService.getCurrentUser();

        if (text) {
          groupNotes.unshift({
            id: 'note_' + Date.now(),
            author: currentUser ? currentUser.name : 'Squad Member',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            text
          });

          renderMemoryBoard();
          addMemoryForm.reset();
          window.showToast('Your memory was added to the digital scrapbook!', 'success');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (window.authService) {
      await window.authService.ready;
    }
    initForm();
    loadMemories();

    window.addEventListener('chronicles:membersChanged', () => {
      loadMemories();
    });
  });
})();

