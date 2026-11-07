// The 12 Chronicles — Mumbai Explorer Controller

(function () {
  let destinations = [];
  let activeCategory = 'all';
  let searchQuery = '';

  const gridContainer = document.getElementById('destinations-grid');
  const searchInput = document.getElementById('explore-search');
  const filterPills = document.getElementById('category-filters');
  const statsSummary = document.getElementById('explorer-stats');

  async function loadDestinations() {
    destinations = await window.chroniclesData.getDestinations();
    renderDestinations();
    renderStats();
  }

  function getFilteredDestinations() {
    return destinations.filter(item => {
      let matchCategory = true;
      if (activeCategory === 'visited') {
        matchCategory = item.visited === true;
      } else if (activeCategory === 'unvisited') {
        matchCategory = !item.visited;
      } else if (activeCategory !== 'all') {
        matchCategory = item.category.toLowerCase() === activeCategory.toLowerCase();
      }

      const matchSearch = searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCategory && matchSearch;
    });
  }

  function renderDestinations() {
    if (!gridContainer) return;
    const items = getFilteredDestinations();

    if (items.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full text-center py-16 bg-white rounded-2xl border border-[#A4A88A]/30 p-8">
          <p class="font-serif text-lg font-bold text-[#282824]">No destinations match your filter</p>
          <p class="text-xs text-[#282824]/60 mt-1">Try resetting the category filter or changing your search terms.</p>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = items.map(dest => `
      <div class="journal-card overflow-hidden flex flex-col group transition-all duration-300">
        <!-- Image Container -->
        <div class="relative h-52 sm:h-60 overflow-hidden bg-gray-100">
          <img src="${dest.image}" alt="${dest.name}" 
               loading="lazy"
               class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          
          <!-- Category Tag -->
          <div class="absolute top-3 left-3">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#282824]/75 text-white backdrop-blur-sm shadow-sm">
              ${dest.category}
            </span>
          </div>

          <!-- Visited Toggle Button -->
          <button data-action="toggle-visited" data-id="${dest.id}" 
                  class="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                    dest.visited 
                      ? 'bg-[#354B3A] text-white hover:bg-[#243428]' 
                      : 'bg-white/90 text-[#282824] hover:bg-white border border-[#A4A88A]/40'
                  }">
            <span>${dest.visited ? '✓ Visited' : '○ Not Visited'}</span>
          </button>
        </div>

        <!-- Content Body -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <h3 class="font-serif text-xl font-bold text-[#282824] group-hover:text-[#354B3A] transition-colors">
                ${dest.name}
              </h3>
            </div>

            <p class="text-xs text-[#282824]/80 leading-relaxed mb-4">
              ${dest.shortDesc}
            </p>

            <!-- Key metadata bullets -->
            <div class="space-y-2 text-xs border-t border-[#A4A88A]/20 pt-3">
              <div class="flex items-center text-[#282824]/70 gap-2">
                <svg class="w-4 h-4 text-[#C76B4A] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span class="truncate">${dest.location}</span>
              </div>
              <div class="flex items-center justify-between text-[#282824]/70">
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-[#354B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>${dest.hours}</span>
                </span>
                <span class="font-medium text-[#282824]">${dest.duration}</span>
              </div>
              <div class="flex items-center justify-between text-[#282824]/70">
                <span class="text-xs font-semibold text-[#354B3A]">Entry:</span>
                <span class="text-xs font-semibold text-[#282824]">${dest.fees}</span>
              </div>
            </div>

            ${dest.tips ? `
              <div class="mt-3 p-2.5 bg-[#F7F4EC] rounded-lg text-[11px] text-[#282824]/80 border-l-2 border-[#C76B4A]">
                <strong>Squad Note:</strong> ${dest.tips}
              </div>
            ` : ''}
          </div>

          <!-- Action Footer -->
          <div class="mt-5 pt-3 border-t border-[#A4A88A]/20 flex items-center justify-between">
            <a href="${dest.mapUrl}" target="_blank" rel="noopener noreferrer" 
               class="inline-flex items-center gap-1 text-xs font-semibold text-[#354B3A] hover:text-[#C76B4A] transition-colors">
              <span>Open in Google Maps</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
            <span class="text-[11px] text-[#A4A88A] font-medium">
              ${dest.visited ? 'Explored by Squad' : 'On Itinerary'}
            </span>
          </div>
        </div>
      </div>
    `).join('');

    attachListeners();
  }

  function renderStats() {
    if (!statsSummary) return;
    const total = destinations.length;
    const visited = destinations.filter(d => d.visited).length;
    const percent = total > 0 ? Math.round((visited / total) * 100) : 0;

    statsSummary.innerHTML = `
      <div class="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-[#A4A88A]/30 shadow-sm">
        <div class="flex flex-col">
          <span class="text-[11px] uppercase tracking-wider font-bold text-[#A4A88A]">Mumbai Exploration Progress</span>
          <span class="text-sm font-serif font-bold text-[#282824]">${visited} of ${total} Destinations Explored (${percent}%)</span>
        </div>
        <div class="w-28 bg-[#F7F4EC] h-2 rounded-full overflow-hidden border border-[#A4A88A]/30">
          <div class="bg-[#354B3A] h-full transition-all duration-500" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }

  function attachListeners() {
    gridContainer.querySelectorAll('[data-action="toggle-visited"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const isVisited = await window.chroniclesData.toggleDestinationVisited(id);
        window.showToast(isVisited ? 'Marked destination as Visited!' : 'Marked destination as Not Visited', 'info');
        loadDestinations();
      });
    });
  }

  function initFilters() {
    if (filterPills) {
      filterPills.querySelectorAll('[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          filterPills.querySelectorAll('[data-cat]').forEach(b => {
            b.classList.remove('bg-[#354B3A]', 'text-white');
            b.classList.add('bg-white', 'text-[#282824]');
          });
          btn.classList.add('bg-[#354B3A]', 'text-white');
          btn.classList.remove('bg-white', 'text-[#282824]');
          activeCategory = btn.getAttribute('data-cat');
          renderDestinations();
        });
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderDestinations();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    loadDestinations();

    window.addEventListener('chronicles:destinationsUpdated', () => {
      loadDestinations();
    });
  });
})();
