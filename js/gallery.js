// The 12 Chronicles — Hall of Fame Photo Gallery Controller

(function () {
  let photos = [];
  let activeMemberFilter = 'all';
  let activeDayFilter = 'all';
  let activeAlbumFilter = 'all';
  let onlyFavorites = false;
  let activeLightboxIndex = 0;

  const galleryGrid = document.getElementById('gallery-grid');
  const featuredContainer = document.getElementById('featured-memories-container');
  const memberFilterSelect = document.getElementById('filter-member');
  const dayFilterSelect = document.getElementById('filter-day');
  const albumFilterSelect = document.getElementById('filter-album');
  const favoritesToggleBtn = document.getElementById('filter-favorites-btn');

  // Uploader elements
  const uploadBtn = document.getElementById('open-upload-modal-btn');
  const uploadModal = document.getElementById('upload-modal');
  const cancelUploadBtn = document.getElementById('cancel-upload-btn');
  const uploadForm = document.getElementById('gallery-upload-form');
  const fileInput = document.getElementById('photo-file-input');
  const previewContainer = document.getElementById('upload-preview');
  const uploadProgressBar = document.getElementById('upload-progress-bar');
  const uploadProgressWrap = document.getElementById('upload-progress-wrap');

  // Lightbox elements
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxMeta = document.getElementById('lightbox-meta');
  const lightboxPrevBtn = document.getElementById('lightbox-prev');
  const lightboxNextBtn = document.getElementById('lightbox-next');
  const lightboxCloseBtn = document.getElementById('lightbox-close');
  const lightboxLikeBtn = document.getElementById('lightbox-like-btn');
  const lightboxDownloadBtn = document.getElementById('lightbox-download-btn');

  async function loadPhotos() {
    photos = await window.chroniclesData.getPhotos();
    renderFeatured();
    renderGallery();
  }

  function getFilteredPhotos() {
    const currentUserId = window.authService.getCurrentUser() ? window.authService.getCurrentUser().id : null;
    return photos.filter(p => {
      const matchMember = (activeMemberFilter === 'all') || (p.uploaderId === activeMemberFilter);
      const matchDay = (activeDayFilter === 'all') || (p.day === parseInt(activeDayFilter));
      const matchAlbum = (activeAlbumFilter === 'all') || (p.album === activeAlbumFilter);
      const matchFav = !onlyFavorites || (p.likedBy && p.likedBy.includes(currentUserId));
      return matchMember && matchDay && matchAlbum && matchFav;
    });
  }

  function renderFeatured() {
    if (!featuredContainer) return;
    const featured = photos.filter(p => p.featured);
    if (featured.length === 0) {
      featuredContainer.classList.add('hidden');
      return;
    }
    featuredContainer.classList.remove('hidden');

    const heroPhoto = featured[0];
    const otherFeatured = featured.slice(1, 4);

    featuredContainer.innerHTML = `
      <div class="mb-10">
        <div class="flex items-center justify-between mb-4">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-widest text-[#C76B4A]">Editorial Highlights</span>
            <h2 class="font-serif text-2xl font-bold text-[#282824]">Featured Moments</h2>
          </div>
          <span class="text-xs text-[#A4A88A] hidden sm:inline">Selected by the 12 squad members</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Main Hero Photo -->
          <div class="lg:col-span-2 relative h-80 sm:h-96 rounded-2xl overflow-hidden cursor-pointer group shadow-sm"
               onclick="window.openLightboxById('${heroPhoto.id}')">
            <img src="${heroPhoto.url}" alt="${heroPhoto.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#282824]/90 via-[#282824]/30 to-transparent flex flex-col justify-end p-6 text-white">
              <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#C76B4A] w-max mb-1.5">${heroPhoto.album} • Day ${heroPhoto.day}</span>
              <h3 class="font-serif text-xl sm:text-2xl font-bold">${heroPhoto.title}</h3>
              <p class="text-xs text-white/80 line-clamp-2 mt-1">${heroPhoto.caption}</p>
              <div class="flex items-center gap-2 mt-3 text-[11px] text-white/70">
                <span>By ${heroPhoto.uploaderName}</span>
                <span>•</span>
                <span>${heroPhoto.date}</span>
                <span>•</span>
                <span>❤️ ${heroPhoto.likes || 0}</span>
              </div>
            </div>
          </div>

          <!-- Stacked Side Photos -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            ${otherFeatured.map(item => `
              <div class="relative h-44 sm:h-44 rounded-2xl overflow-hidden cursor-pointer group shadow-sm"
                   onclick="window.openLightboxById('${item.id}')">
                <img src="${item.url}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div class="absolute inset-0 bg-gradient-to-t from-[#282824]/85 to-transparent flex flex-col justify-end p-4 text-white">
                  <span class="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#354B3A] w-max mb-1">${item.album}</span>
                  <h4 class="font-serif text-sm font-bold truncate">${item.title}</h4>
                  <p class="text-[11px] text-white/70">By ${item.uploaderName} • Day ${item.day}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderGallery() {
    if (!galleryGrid) return;
    const items = getFilteredPhotos();
    const currentUserId = window.authService.getCurrentUser() ? window.authService.getCurrentUser().id : null;

    if (items.length === 0) {
      galleryGrid.innerHTML = `
        <div class="col-span-full text-center py-20 bg-white rounded-2xl border border-[#A4A88A]/30 p-8">
          <div class="w-12 h-12 mx-auto rounded-full bg-[#F7F4EC] flex items-center justify-center text-[#A4A88A] mb-3">
            📷
          </div>
          <p class="font-serif text-lg font-bold text-[#282824]">No memories found in this filter</p>
          <p class="text-xs text-[#282824]/60 mt-1">Be the first to upload a photo or reset filters above!</p>
          <button onclick="document.getElementById('open-upload-modal-btn').click()" 
                  class="mt-4 px-4 py-2 bg-[#354B3A] text-white text-xs font-semibold rounded-lg hover:bg-[#243428] transition-colors">
            Upload A Photo
          </button>
        </div>
      `;
      return;
    }

    galleryGrid.innerHTML = items.map((photo, idx) => {
      const isLiked = photo.likedBy && photo.likedBy.includes(currentUserId);
      return `
        <div class="masonry-item">
          <div class="journal-card overflow-hidden group bg-white flex flex-col">
            <!-- Clickable image to open lightbox -->
            <div class="relative overflow-hidden cursor-pointer" onclick="window.openLightboxById('${photo.id}')">
              <img src="${photo.url}" alt="${photo.title}" 
                   loading="lazy"
                   class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-103" />
              
              <!-- Subtle overlay on hover -->
              <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="px-3 py-1.5 rounded-full bg-white/90 text-xs font-semibold text-[#282824] shadow-md flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  View Fullscreen
                </span>
              </div>

              <!-- Day & Album Badge -->
              <div class="absolute top-2.5 left-2.5">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#282824]/80 text-white backdrop-blur-sm">
                  Day ${photo.day} • ${photo.album}
                </span>
              </div>
            </div>

            <!-- Card Meta -->
            <div class="p-4">
              <div class="flex items-start justify-between gap-2">
                <h4 class="font-serif font-bold text-sm text-[#282824] group-hover:text-[#354B3A] transition-colors leading-snug">
                  ${photo.title}
                </h4>
                <!-- Favorite button -->
                <button data-action="like-photo" data-id="${photo.id}" 
                        class="text-xs flex items-center gap-1 text-[#282824]/70 hover:text-[#C76B4A] transition-colors p-1"
                        title="${isLiked ? 'Unlike' : 'Like'} photo">
                  <span class="${isLiked ? 'text-[#C76B4A]' : ''}">${isLiked ? '❤️' : '🤍'}</span>
                  <span class="text-[11px] font-semibold">${photo.likes || 0}</span>
                </button>
              </div>

              <p class="text-xs text-[#282824]/80 mt-1 leading-relaxed">
                ${photo.caption}
              </p>

              <div class="flex items-center justify-between text-[11px] text-[#A4A88A] pt-3 mt-3 border-t border-[#A4A88A]/20">
                <span class="font-medium text-[#282824]/70">By ${photo.uploaderName}</span>
                <span>${photo.date}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    attachCardListeners();
  }

  function attachCardListeners() {
    galleryGrid.querySelectorAll('[data-action="like-photo"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const user = window.authService.getCurrentUser();
        await window.chroniclesData.toggleLikePhoto(id, user.id);
        loadPhotos();
      });
    });
  }

  // Lightbox functions exposed to window
  window.openLightboxById = function (id) {
    const filtered = getFilteredPhotos();
    const idx = filtered.findIndex(p => p.id === id);
    if (idx !== -1) {
      activeLightboxIndex = idx;
      updateLightboxContent();
      lightboxModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  };

  function updateLightboxContent() {
    const filtered = getFilteredPhotos();
    const photo = filtered[activeLightboxIndex];
    if (!photo) return;

    lightboxImg.src = photo.url;
    lightboxTitle.innerText = photo.title;
    lightboxCaption.innerText = photo.caption;
    lightboxMeta.innerText = `Uploaded by ${photo.uploaderName} • Day ${photo.day} (${photo.album}) • ${photo.date}`;

    const currentUserId = window.authService.getCurrentUser() ? window.authService.getCurrentUser().id : null;
    const isLiked = photo.likedBy && photo.likedBy.includes(currentUserId);
    lightboxLikeBtn.innerHTML = `<span>${isLiked ? '❤️' : '🤍'}</span> <span>${photo.likes || 0}</span>`;
    lightboxLikeBtn.setAttribute('data-id', photo.id);

    // Set download link
    lightboxDownloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = photo.url;
      a.download = `The12Chronicles-${photo.title.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
  }

  function initLightbox() {
    if (!lightboxModal) return;

    lightboxCloseBtn.addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });

    lightboxPrevBtn.addEventListener('click', () => {
      const filtered = getFilteredPhotos();
      activeLightboxIndex = (activeLightboxIndex - 1 + filtered.length) % filtered.length;
      updateLightboxContent();
    });

    lightboxNextBtn.addEventListener('click', () => {
      const filtered = getFilteredPhotos();
      activeLightboxIndex = (activeLightboxIndex + 1) % filtered.length;
      updateLightboxContent();
    });

    document.addEventListener('keydown', (e) => {
      if (lightboxModal.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lightboxPrevBtn.click();
      if (e.key === 'ArrowRight') lightboxNextBtn.click();
    });

    lightboxLikeBtn.addEventListener('click', async () => {
      const id = lightboxLikeBtn.getAttribute('data-id');
      const user = window.authService.getCurrentUser();
      await window.chroniclesData.toggleLikePhoto(id, user.id);
      await loadPhotos();
      updateLightboxContent();
    });
  }

  function closeLightbox() {
    if (lightboxModal) {
      lightboxModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  // Upload Handling with Multi-File & Progress
  function initUploader() {
    if (!uploadModal) return;

    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        // Populate uploader select with squad members
        const uploaderSelect = document.getElementById('upload-member-select');
        const currentUser = window.authService.getCurrentUser();
        if (uploaderSelect) {
          uploaderSelect.innerHTML = window.authService.getAllMembers().map(m => `
            <option value="${m.id}" ${currentUser && m.id === currentUser.id ? 'selected' : ''}>
              ${m.name} (${m.nickname})
            </option>
          `).join('');
        }
        uploadModal.classList.remove('hidden');
      });
    }

    if (cancelUploadBtn) {
      cancelUploadBtn.addEventListener('click', () => {
        uploadModal.classList.add('hidden');
        uploadForm.reset();
        previewContainer.innerHTML = '';
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        previewContainer.innerHTML = '';
        if (files.length > 0) {
          files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (re) => {
              const div = document.createElement('div');
              div.className = 'w-16 h-16 rounded-lg overflow-hidden border border-[#A4A88A]/30 flex-shrink-0';
              div.innerHTML = `<img src="${re.target.result}" class="w-full h-full object-cover" />`;
              previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
          });
        }
      });
    }

    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = fileInput.files;
        if (!files || files.length === 0) {
          window.showToast('Please select at least one photo to upload.', 'error');
          return;
        }

        const title = document.getElementById('upload-title').value.trim();
        const caption = document.getElementById('upload-caption').value.trim();
        const day = parseInt(document.getElementById('upload-day').value);
        const album = document.getElementById('upload-album').value;
        const memberId = document.getElementById('upload-member-select').value;
        const member = window.authService.getMemberById(memberId);

        // Show progress bar animation
        uploadProgressWrap.classList.remove('hidden');
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 20;
          uploadProgressBar.style.width = `${Math.min(progress, 90)}%`;
        }, 100);

        // Process all selected files
        const fileList = Array.from(files);
        let completedCount = 0;

        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (re) => {
              const photoTitle = fileList.length > 1 ? `${title} (${i + 1})` : title;
              await window.chroniclesData.addPhoto({
                title: photoTitle,
                caption,
                day,
                album,
                uploaderId: member ? member.id : 'mem_1',
                uploaderName: member ? member.name : 'Squad Member',
                url: re.target.result
              });
              completedCount++;
              const percent = Math.round((completedCount / fileList.length) * 100);
              uploadProgressBar.style.width = `${percent}%`;
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }

        clearInterval(progressInterval);
        uploadProgressBar.style.width = '100%';

        setTimeout(() => {
          uploadProgressWrap.classList.add('hidden');
          uploadProgressBar.style.width = '0%';
          uploadModal.classList.add('hidden');
          uploadForm.reset();
          previewContainer.innerHTML = '';

          window.showToast(`${fileList.length} photo(s) uploaded to Hall of Fame!`, 'success');
          loadPhotos();
        }, 300);
      });
    }
  }

  // Filter Selects
  function initFilterSelects() {
    if (memberFilterSelect) {
      memberFilterSelect.innerHTML = `<option value="all">All 12 Members</option>` + 
        window.authService.getAllMembers().map(m => `
          <option value="${m.id}">${m.name} (${m.nickname})</option>
        `).join('');

      memberFilterSelect.addEventListener('change', (e) => {
        activeMemberFilter = e.target.value;
        renderGallery();
      });
    }

    if (dayFilterSelect) {
      dayFilterSelect.addEventListener('change', (e) => {
        activeDayFilter = e.target.value;
        renderGallery();
      });
    }

    if (albumFilterSelect) {
      albumFilterSelect.addEventListener('change', (e) => {
        activeAlbumFilter = e.target.value;
        renderGallery();
      });
    }

    if (favoritesToggleBtn) {
      favoritesToggleBtn.addEventListener('click', () => {
        onlyFavorites = !onlyFavorites;
        favoritesToggleBtn.classList.toggle('bg-[#C76B4A]', onlyFavorites);
        favoritesToggleBtn.classList.toggle('text-white', onlyFavorites);
        favoritesToggleBtn.classList.toggle('border-[#C76B4A]', onlyFavorites);
        renderGallery();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (window.authService) {
      await window.authService.ready;
    }
    initFilterSelects();
    initUploader();
    initLightbox();
    loadPhotos();

    window.addEventListener('chronicles:photosUpdated', () => {
      loadPhotos();
    });

    window.addEventListener('chronicles:membersChanged', () => {
      initFilterSelects();
      loadPhotos();
    });
  });
})();

