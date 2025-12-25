console.log('[stream-modal.js] Loading...');

let selectedVideoData = null;
let currentOrientation = 'horizontal';
let isDropdownOpen = false;
const videoSelectorDropdown = document.getElementById('videoSelectorDropdown');
let desktopVideoPlayer = null;
let streamKeyTimeout = null;
let isStreamKeyValid = true;
let currentPlatform = 'Custom';

console.log('[stream-modal.js] Variables initialized');

function openNewStreamModal() {
  const modal = document.getElementById('newStreamModal');
  document.body.style.overflow = 'hidden';
  modal.classList.remove('hidden');
  
  const advancedSettingsContent = document.getElementById('advancedSettingsContent');
  const advancedSettingsToggle = document.getElementById('advancedSettingsToggle');
  if (advancedSettingsContent && advancedSettingsToggle) {
    advancedSettingsContent.classList.add('hidden');
    const icon = advancedSettingsToggle.querySelector('i');
    if (icon) icon.style.transform = '';
  }
  
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
  
  // Scroll to top when opening
  const modalContent = modal.querySelector('.overflow-y-auto');
  if (modalContent) {
    modalContent.scrollTop = 0;
  }
  
  // Initialize tags
  if (typeof initializeTags === 'function') {
    initializeTags();
  }
  
  // Set default tab to Manual and set required fields
  switchStreamTab('manual');
  
  loadGalleryVideos();
  
  // Check if there's a selected YouTube stream from sessionStorage
  const selectedStreamId = sessionStorage.getItem('selectedYouTubeStreamId');
  if (selectedStreamId) {
    console.log('[openNewStreamModal] Found selected YouTube stream in sessionStorage:', selectedStreamId);
    
    // Switch to YouTube tab
    switchStreamTab('youtube');
    
    // Fill in the form fields
    const youtubeStreamKey = document.getElementById('youtubeStreamKey');
    const youtubeStreamTitle = document.getElementById('youtubeStreamTitle');
    const youtubeDescription = document.getElementById('youtubeDescription');
    const streamTitle = document.getElementById('streamTitle');
    
    const streamKey = sessionStorage.getItem('selectedYouTubeStreamKey');
    const streamTitleValue = sessionStorage.getItem('selectedYouTubeStreamTitle');
    const description = sessionStorage.getItem('selectedYouTubeStreamDescription');
    
    if (youtubeStreamKey && streamKey) {
      youtubeStreamKey.value = streamKey;
    }
    if (youtubeStreamTitle && streamTitleValue) {
      youtubeStreamTitle.value = streamTitleValue;
    }
    if (youtubeDescription && description) {
      youtubeDescription.value = description;
    }
    if (streamTitle && streamTitleValue) {
      streamTitle.value = streamTitleValue;
    }
    
    // Create hidden input for YouTube stream ID
    let youtubeStreamIdInput = document.getElementById('youtubeStreamId');
    if (!youtubeStreamIdInput) {
      const form = document.getElementById('newStreamForm');
      if (form) {
        youtubeStreamIdInput = document.createElement('input');
        youtubeStreamIdInput.type = 'hidden';
        youtubeStreamIdInput.id = 'youtubeStreamId';
        youtubeStreamIdInput.name = 'youtubeStreamId';
        form.appendChild(youtubeStreamIdInput);
      }
    }
    if (youtubeStreamIdInput) {
      youtubeStreamIdInput.value = selectedStreamId;
      console.log('[openNewStreamModal] Set youtubeStreamId to:', selectedStreamId);
    }
    
    // DON'T clear sessionStorage yet - keep it as fallback until form is submitted
    // sessionStorage will be cleared in dashboard.ejs after successful form submission
    
    // Show success message
    if (typeof showToast === 'function') {
      showToast('success', 'YouTube stream key loaded successfully');
    }
  }
}

function closeNewStreamModal() {
  const modal = document.getElementById('newStreamModal');
  modal.classList.remove('active');
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';
  
  resetModalForm();
  
  const advancedSettingsContent = document.getElementById('advancedSettingsContent');
  const advancedSettingsToggle = document.getElementById('advancedSettingsToggle');
  if (advancedSettingsContent && advancedSettingsToggle) {
    advancedSettingsContent.classList.add('hidden');
    const icon = advancedSettingsToggle.querySelector('i');
    if (icon) icon.style.transform = '';
  }
  
  if (desktopVideoPlayer) {
    desktopVideoPlayer.pause();
    desktopVideoPlayer.dispose();
    desktopVideoPlayer = null;
  }
}

function toggleVideoSelector() {
  const dropdown = document.getElementById('videoSelectorDropdown');
  if (dropdown.classList.contains('hidden')) {
    dropdown.classList.remove('hidden');
    if (!dropdown.dataset.loaded) {
      loadGalleryVideos();
      dropdown.dataset.loaded = 'true';
    }
    const searchInput = document.getElementById('videoSearchInput');
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 10);
    }
  } else {
    dropdown.classList.add('hidden');
    const searchInput = document.getElementById('videoSearchInput');
    if (searchInput) {
      searchInput.value = '';
    }
  }
}

function selectVideo(video) {
  selectedVideoData = video;
  const displayText = video.type === 'playlist' ? `[Playlist] ${video.name}` : video.name;
  document.getElementById('selectedVideo').textContent = displayText;
  
  const videoSelector = document.querySelector('[onclick="toggleVideoSelector()"]');
  videoSelector.classList.remove('border-red-500');
  videoSelector.classList.add('border-gray-600');
  
  const preview = document.getElementById('videoPreview');
  const emptyPreview = document.getElementById('emptyPreview');
  
  if (desktopVideoPlayer) {
    desktopVideoPlayer.pause();
    desktopVideoPlayer.dispose();
    desktopVideoPlayer = null;
  }
  
  if (video.type === 'playlist') {
    if (preview) preview.classList.add('hidden');
    if (emptyPreview) {
      emptyPreview.classList.remove('hidden');
      emptyPreview.innerHTML = `
        <i class="ti ti-playlist text-4xl text-blue-400 mb-2"></i>
        <p class="text-sm text-gray-300 font-medium">${video.name}</p>
        <p class="text-xs text-blue-300 mt-1">Playlist selected • ${video.duration || 'Unknown duration'}</p>
      `;
    }
  } else {
    if (preview) preview.classList.remove('hidden');
    if (emptyPreview) emptyPreview.classList.add('hidden');
    
    const videoContainer = document.getElementById('videoPreview');
    
    if (videoContainer) {
      videoContainer.innerHTML = `
        <video id="videojs-preview" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto">
          <source src="${video.url}" type="video/mp4">
        </video>
      `;
      
      setTimeout(() => {
        desktopVideoPlayer = videojs('videojs-preview', {
          controls: true,
          autoplay: false,
          preload: 'auto',
          fluid: true
        });
      }, 10);
    }
  }
  
  document.getElementById('videoSelectorDropdown').classList.add('hidden');
  
  const hiddenVideoInput = document.getElementById('selectedVideoId');
  if (hiddenVideoInput) {
    hiddenVideoInput.value = video.id;
  }
}

async function loadGalleryVideos() {
  try {
    const container = document.getElementById('videoListContainer');
    if (!container) {
      console.error("Video list container not found");
      return;
    }
    
    container.innerHTML = '<div class="text-center py-3"><i class="ti ti-loader animate-spin mr-2"></i>Loading content...</div>';
    
    const response = await fetch('/api/stream/content');
    const content = await response.json();
    
    window.allStreamVideos = content;
    displayFilteredVideos(content);
    
    const searchInput = document.getElementById('videoSearchInput');
    if (searchInput) {
      searchInput.removeEventListener('input', handleVideoSearch);
      searchInput.addEventListener('input', handleVideoSearch);
      setTimeout(() => searchInput.focus(), 10);
    } else {
      console.error("Search input element not found");
    }
  } catch (error) {
    console.error('Error loading gallery content:', error);
    const container = document.getElementById('videoListContainer');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-5 text-red-400">
          <i class="ti ti-alert-circle text-2xl mb-2"></i>
          <p>Failed to load content</p>
          <p class="text-xs text-gray-500 mt-1">Please try again</p>
        </div>
      `;
    }
  }
}

function handleVideoSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  console.log("Searching for:", searchTerm);
  
  if (!window.allStreamVideos) {
    console.error("No content available for search");
    return;
  }
  
  if (searchTerm === '') {
    displayFilteredVideos(window.allStreamVideos);
    return;
  }
  
  const filteredContent = window.allStreamVideos.filter(item =>
    item.name.toLowerCase().includes(searchTerm) ||
    (item.type === 'playlist' && item.description && item.description.toLowerCase().includes(searchTerm))
  );
  
  console.log(`Found ${filteredContent.length} matching items`);
  displayFilteredVideos(filteredContent);
}

function displayFilteredVideos(videos) {
  const container = document.getElementById('videoListContainer');
  container.innerHTML = '';
  
  if (videos && videos.length > 0) {
    videos.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'w-full flex items-start space-x-3 p-2 rounded hover:bg-dark-600 transition-colors text-left';
      button.onclick = () => selectVideo(item);
      
      if (item.type === 'playlist') {
        button.innerHTML = `
          <div class="w-16 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex-shrink-0 overflow-hidden relative">
            <img src="${item.thumbnail}" alt="" 
              class="w-full h-full object-cover rounded" 
              onerror="this.src='/images/playlist-thumbnail.svg'">
            <div class="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl text-[8px] font-bold">PL</div>
          </div>
          <div class="flex-1 min-w-0 ml-3 text-left">
            <p class="text-sm font-medium text-white truncate flex items-center">
              <i class="ti ti-playlist text-blue-400 mr-1 text-xs"></i>
              ${item.name}
            </p>
            <p class="text-xs text-blue-300">${item.resolution} • ${item.duration}</p>
          </div>
        `;
      } else {
        button.innerHTML = `
          <div class="w-16 h-12 bg-dark-800 rounded flex-shrink-0 overflow-hidden">
            <img src="${item.thumbnail || '/images/default-thumbnail.jpg'}" alt="" 
              class="w-full h-full object-cover rounded" 
              onerror="this.src='/images/default-thumbnail.jpg'">
          </div>
          <div class="flex-1 min-w-0 ml-3 text-left">
            <p class="text-sm font-medium text-white truncate">${item.name}</p>
            <p class="text-xs text-gray-400">${item.resolution} • ${item.duration}</p>
          </div>
        `;
      }
      
      container.appendChild(button);
    });
  } else {
    container.innerHTML = `
      <div class="text-center py-5 text-gray-400">
        <i class="ti ti-search-off text-2xl mb-2"></i>
        <p>No matching content found</p>
        <p class="text-xs text-gray-500 mt-1">Try different keywords</p>
      </div>
    `;
  }
}

function resetModalForm() {
  const form = document.getElementById('newStreamForm');
  form.reset();
  
  selectedVideoData = null;
  document.getElementById('selectedVideo').textContent = 'Choose a video...';
  
  const preview = document.getElementById('videoPreview');
  const emptyPreview = document.getElementById('emptyPreview');
  
  if (preview) preview.classList.add('hidden');
  if (emptyPreview) {
    emptyPreview.classList.remove('hidden');
    emptyPreview.innerHTML = `
      <i class="ti ti-video text-3xl text-gray-600 mb-2"></i>
      <p class="text-xs text-gray-500">Select a video to preview</p>
    `;
  }
  
  if (isDropdownOpen) {
    toggleVideoSelector();
  }
}

function initModal() {
  const modal = document.getElementById('newStreamModal');
  if (!modal) return;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeNewStreamModal();
    }
  });
  
  if (videoSelectorDropdown) {
    document.addEventListener('click', (e) => {
      const isClickInsideDropdown = videoSelectorDropdown.contains(e.target);
      const isClickOnButton = e.target.closest('[onclick="toggleVideoSelector()"]');
      
      if (!isClickInsideDropdown && !isClickOnButton && isDropdownOpen) {
        toggleVideoSelector();
      }
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isDropdownOpen) {
        toggleVideoSelector();
      } else if (!modal.classList.contains('hidden')) {
        closeNewStreamModal();
      }
    }
  });
  
  modal.addEventListener('touchmove', (e) => {
    if (e.target === modal) {
      e.preventDefault();
    }
  }, { passive: false });
}

function setVideoOrientation(orientation) {
  currentOrientation = orientation;
  
  const buttons = document.querySelectorAll('[onclick^="setVideoOrientation"]');
  buttons.forEach(button => {
    if (button.getAttribute('onclick').includes(orientation)) {
      button.classList.add('bg-primary', 'border-primary', 'text-white');
      button.classList.remove('bg-dark-700', 'border-gray-600');
    } else {
      button.classList.remove('bg-primary', 'border-primary', 'text-white');
      button.classList.add('bg-dark-700', 'border-gray-600');
    }
  });
  
  updateResolutionDisplay();
}

function updateResolutionDisplay() {
  const select = document.getElementById('resolutionSelect');
  const option = select.options[select.selectedIndex];
  const resolution = option.getAttribute(`data-${currentOrientation}`);
  const quality = option.textContent;
  
  document.getElementById('currentResolution').textContent = `${resolution} (${quality})`;
}

function toggleStreamKeyVisibility() {
  const streamKeyInput = document.getElementById('streamKey');
  const streamKeyToggle = document.getElementById('streamKeyToggle');
  
  if (!streamKeyInput || !streamKeyToggle) return;
  
  if (streamKeyInput.type === 'password') {
    streamKeyInput.type = 'text';
    streamKeyToggle.classList.remove('ti-eye');
    streamKeyToggle.classList.add('ti-eye-off');
  } else {
    streamKeyInput.type = 'password';
    streamKeyToggle.classList.remove('ti-eye-off');
    streamKeyToggle.classList.add('ti-eye');
  }
}

function validateStreamKeyForPlatform(streamKey, platform) {
  // Allow duplicate stream keys - user can use the same key for multiple streams
  // Only one stream can be active at a time (handled by streaming platform)
  isStreamKeyValid = true;
  
  // Remove any existing error messages
  const streamKeyInput = document.getElementById('streamKey');
  if (streamKeyInput) {
    streamKeyInput.classList.remove('border-red-500');
    streamKeyInput.classList.add('border-gray-600', 'focus:border-primary');
    
    const errorMsg = document.getElementById('streamKeyError');
    if (errorMsg) {
      errorMsg.remove();
    }
  }
}

// Duration calculation functions
function calculateDurationFromEndTime(input) {
  const slot = input.closest('.schedule-slot');
  const startInput = slot.querySelector('.schedule-time');
  const endInput = slot.querySelector('.schedule-endtime');
  const hoursInput = slot.querySelector('.duration-hours');
  const minutesInput = slot.querySelector('.duration-minutes');
  const durationInput = slot.querySelector('.schedule-duration');
  
  if (!startInput.value || !endInput.value) return;
  
  // Parse times
  const [startHour, startMin] = startInput.value.split(':').map(Number);
  const [endHour, endMin] = endInput.value.split(':').map(Number);
  
  // Calculate duration in minutes
  let durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  
  // Handle overnight streams
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  
  // Update duration inputs
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hoursInput) hoursInput.value = hours;
  if (minutesInput) minutesInput.value = minutes;
  if (durationInput) durationInput.value = durationMinutes;
}

// Alias for calculateEndTimeFromDuration - used by dashboard.ejs
function calculateEndTimeFromDuration(input) {
  calculateFromDuration(input);
}

function calculateFromDuration(input) {
  const slot = input.closest('.schedule-slot');
  const startInput = slot.querySelector('.schedule-time');
  const endInput = slot.querySelector('.schedule-endtime');
  const hoursInput = slot.querySelector('.duration-hours');
  const minutesInput = slot.querySelector('.duration-minutes');
  const durationInput = slot.querySelector('.schedule-duration');
  
  if (!startInput.value) return;
  
  // Get duration in minutes
  const hours = parseInt(hoursInput.value) || 0;
  const minutes = parseInt(minutesInput.value) || 0;
  const totalMinutes = hours * 60 + minutes;
  
  // Update hidden duration input
  if (durationInput) durationInput.value = totalMinutes;
  
  // Parse start time
  const [startHour, startMin] = startInput.value.split(':').map(Number);
  
  // Calculate end time
  let endMinutes = startHour * 60 + startMin + totalMinutes;
  
  // Handle overflow to next day
  if (endMinutes >= 24 * 60) {
    endMinutes = endMinutes % (24 * 60);
  }
  
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  
  // Format and set end time
  if (endInput) {
    endInput.value = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  }
}



function toggleScheduleSettings() {
  const scheduleSection = document.getElementById('scheduleSettingsSection');
  const toggleIcon = document.getElementById('scheduleToggleIcon');
  
  if (scheduleSection && toggleIcon) {
    if (scheduleSection.classList.contains('hidden')) {
      scheduleSection.classList.remove('hidden');
      toggleIcon.style.transform = 'rotate(180deg)';
    } else {
      scheduleSection.classList.add('hidden');
      toggleIcon.style.transform = 'rotate(0deg)';
    }
  }
}

// Expose to window for onclick
window.toggleScheduleSettings = toggleScheduleSettings;

function updateServerTime() {
  const serverTimeDisplay = document.getElementById('serverTimeDisplay');
  if (serverTimeDisplay) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    serverTimeDisplay.textContent = `Server time: ${timeString}`;
  }
}

// Recurring day button handlers
function attachRecurringDayListeners() {
  const container = document.getElementById('scheduleSlotsContainer');
  if (!container) return;

  container.querySelectorAll('.recurring-day').forEach(button => {
    button.removeEventListener('click', handleRecurringDayClick);
    button.addEventListener('click', handleRecurringDayClick);
  });
}

function handleRecurringDayClick(e) {
  e.preventDefault();
  const button = e.currentTarget;
  button.classList.toggle('bg-primary');
  button.classList.toggle('border-primary');
  button.classList.toggle('text-white');
}

// Select all days in first schedule slot (for initial modal)
function selectAllDays(button) {
  const slot = button.closest('.schedule-slot') || document.querySelector('#scheduleSlotsContainer .schedule-slot');
  if (!slot) return;
  
  const dayButtons = slot.querySelectorAll('.recurring-day');
  const allSelected = Array.from(dayButtons).every(btn => btn.classList.contains('bg-primary'));
  
  dayButtons.forEach(btn => {
    if (allSelected) {
      // Deselect all
      btn.classList.remove('bg-primary', 'border-primary', 'text-white');
    } else {
      // Select all
      btn.classList.add('bg-primary', 'border-primary', 'text-white');
    }
  });
}

// Select all days in specific slot (for added slots)
function selectAllDaysInSlot(button) {
  const slot = button.closest('.schedule-slot');
  if (!slot) return;
  
  const dayButtons = slot.querySelectorAll('.recurring-day');
  const allSelected = Array.from(dayButtons).every(btn => btn.classList.contains('bg-primary'));
  
  dayButtons.forEach(btn => {
    if (allSelected) {
      // Deselect all
      btn.classList.remove('bg-primary', 'border-primary', 'text-white');
    } else {
      // Select all
      btn.classList.add('bg-primary', 'border-primary', 'text-white');
    }
  });
}

// Select all days in first schedule slot (for initial modal)
function selectAllDays(button) {
  const slot = button.closest('.schedule-slot') || document.querySelector('#scheduleSlotsContainer .schedule-slot');
  if (!slot) return;
  
  const dayButtons = slot.querySelectorAll('.recurring-day');
  const allSelected = Array.from(dayButtons).every(btn => btn.classList.contains('bg-primary'));
  
  dayButtons.forEach(btn => {
    if (allSelected) {
      // Deselect all
      btn.classList.remove('bg-primary', 'border-primary', 'text-white');
    } else {
      // Select all
      btn.classList.add('bg-primary', 'border-primary', 'text-white');
    }
  });
}

// Add schedule slot function
function addScheduleSlot() {
  console.log('[addScheduleSlot] Adding new schedule slot...');
  const container = document.getElementById('scheduleSlotsContainer');
  const slotCount = container.querySelectorAll('.schedule-slot').length;

  const slotHTML = `
    <div class="schedule-slot p-3 bg-dark-700/50 rounded-lg border border-gray-600">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div>
          <label class="text-xs text-gray-400 mb-1 block">Start</label>
          <input type="time" class="schedule-time w-full h-[36px] px-2 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary text-xs [color-scheme:dark]" onchange="calculateDurationFromEndTime(this)">
        </div>
        <div>
          <label class="text-xs text-gray-400 mb-1 block">End</label>
          <input type="time" class="schedule-endtime w-full h-[36px] px-2 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary text-xs [color-scheme:dark]" onchange="calculateDurationFromEndTime(this)">
        </div>
        <div>
          <label class="text-xs text-gray-400 mb-1 block">Duration</label>
          <div class="flex gap-1">
            <input type="number" min="0" max="23" value="1" class="duration-hours w-full h-[36px] px-1 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary text-xs text-center" placeholder="H" onchange="calculateFromDuration(this)">
            <span class="text-xs text-gray-400 flex items-center">:</span>
            <input type="number" min="0" max="59" value="0" class="duration-minutes w-full h-[36px] px-1 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary text-xs text-center" placeholder="M" onchange="calculateFromDuration(this)">
          </div>
          <input type="hidden" class="schedule-duration" value="60">
        </div>
        <div>
          <label class="text-xs text-gray-400 mb-1 block opacity-0">Del</label>
          <button type="button" onclick="removeScheduleSlot(this)" class="w-full h-[36px] flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded-lg transition-colors">
            <i class="ti ti-trash text-sm"></i>
          </button>
        </div>
      </div>
      
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs text-gray-400">Recurring Days:</label>
          <button type="button" onclick="selectAllDaysInSlot(this)" class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
            All Days
          </button>
        </div>
        <div class="flex gap-1 flex-wrap">
          <button type="button" class="recurring-day px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-colors" data-day="0">Sun</button>
          <button type="button" class="recurring-day px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-colors" data-day="1">Mon</button>
          <button type="button" class="recurring-day px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-colors" data-day="2">Tue</button>
          <button type="button" class="recurring-day px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-colors" data-day="3">Wed</button>
          <button type="button" class="recurring-day px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-colors" data-day="4">Thu</button>
          <button type="button" class="recurring-day px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-colors" data-day="5">Fri</button>
          <button type="button" class="recurring-day px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-colors" data-day="6">Sat</button>
        </div>
      </div>
    </div>
  `;
  
  console.log('[addScheduleSlot] Inserting HTML...');
  container.insertAdjacentHTML('beforeend', slotHTML);
  console.log('[addScheduleSlot] Attaching recurring day listeners...');
  attachRecurringDayListeners();
  console.log('[addScheduleSlot] Schedule slot added successfully');
}

function removeScheduleSlot(button) {
  const slot = button.closest('.schedule-slot');
  const container = document.getElementById('scheduleSlotsContainer');

  // Don't allow removing if only one slot left
  if (container.querySelectorAll('.schedule-slot').length > 1) {
    slot.remove();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
  initModal();
  
  const resolutionSelect = document.getElementById('resolutionSelect');
  if (resolutionSelect) {
    resolutionSelect.addEventListener('change', updateResolutionDisplay);
    setVideoOrientation('horizontal');
  }
  
  // Attach recurring day listeners on page load
  attachRecurringDayListeners();
  
  // Update server time every second
  setInterval(updateServerTime, 1000);
  updateServerTime();
  
  // Platform selector
  const platformSelector = document.getElementById('platformSelector');
  const platformDropdown = document.getElementById('platformDropdown');
  const rtmpInput = document.getElementById('rtmpUrl');
  
  if (platformSelector && platformDropdown && rtmpInput) {
    platformSelector.addEventListener('click', function (e) {
      e.stopPropagation();
      platformDropdown.classList.toggle('hidden');
    });
    
    const platformOptions = document.querySelectorAll('.platform-option');
    platformOptions.forEach(option => {
      option.addEventListener('click', function () {
        const platformUrl = this.getAttribute('data-url');
        const platformName = this.querySelector('span').textContent;
        rtmpInput.value = platformUrl;
        platformDropdown.classList.add('hidden');
        updatePlatformIcon(this.querySelector('i').className);
      });
    });
    
    document.addEventListener('click', function (e) {
      if (platformDropdown && !platformDropdown.contains(e.target) &&
        !platformSelector.contains(e.target)) {
        platformDropdown.classList.add('hidden');
      }
    });
    
    function updatePlatformIcon(iconClass) {
      const currentIcon = platformSelector.querySelector('i');
      const iconParts = iconClass.split(' ');
      const brandIconPart = iconParts.filter(part => part.startsWith('ti-'))[0];
      
      currentIcon.className = `ti ${brandIconPart} text-center`;
      
      if (brandIconPart.includes('youtube')) {
        currentIcon.classList.add('text-red-500');
      } else if (brandIconPart.includes('twitch')) {
        currentIcon.classList.add('text-purple-500');
      } else if (brandIconPart.includes('facebook')) {
        currentIcon.classList.add('text-blue-500');
      } else if (brandIconPart.includes('instagram')) {
        currentIcon.classList.add('text-pink-500');
      } else if (brandIconPart.includes('tiktok')) {
        currentIcon.classList.add('text-white');
      } else if (brandIconPart.includes('shopee')) {
        currentIcon.classList.add('text-orange-500');
      } else if (brandIconPart.includes('live-photo')) {
        currentIcon.classList.add('text-teal-500');
      }
    }
  }
  
  // Stream key validation
  const streamKeyInput = document.getElementById('streamKey');
  if (streamKeyInput && rtmpInput) {
    rtmpInput.addEventListener('input', function () {
      const url = this.value.toLowerCase();
      
      if (url.includes('youtube.com')) {
        currentPlatform = 'YouTube';
      } else if (url.includes('facebook.com')) {
        currentPlatform = 'Facebook';
      } else if (url.includes('twitch.tv')) {
        currentPlatform = 'Twitch';
      } else if (url.includes('tiktok.com')) {
        currentPlatform = 'TikTok';
      } else if (url.includes('instagram.com')) {
        currentPlatform = 'Instagram';
      } else if (url.includes('shopee.io')) {
        currentPlatform = 'Shopee Live';
      } else if (url.includes('restream.io')) {
        currentPlatform = 'Restream.io';
      } else {
        currentPlatform = 'Custom';
      }
      
      if (streamKeyInput.value) {
        validateStreamKeyForPlatform(streamKeyInput.value, currentPlatform);
      }
    });
    
    streamKeyInput.addEventListener('input', function () {
      clearTimeout(streamKeyTimeout);
      const streamKey = this.value.trim();
      
      if (!streamKey) {
        return;
      }
      
      streamKeyTimeout = setTimeout(() => {
        validateStreamKeyForPlatform(streamKey, currentPlatform);
      }, 500);
    });
  }
  
  if (typeof showToast !== 'function') {
    window.showToast = function (type, message) {
      console.log(`${type}: ${message}`);
    }
  }
  
  // Expose functions globally for onclick handlers
  window.openNewStreamModal = openNewStreamModal;
  window.closeNewStreamModal = closeNewStreamModal;
  window.toggleVideoSelector = toggleVideoSelector;
  window.selectVideo = selectVideo;
  window.setVideoOrientation = setVideoOrientation;
  window.toggleStreamKeyVisibility = toggleStreamKeyVisibility;
  // Note: toggleStreamMode, calculateDurationFromEndTime, calculateFromDuration, calculateEndTimeFromDuration
  // selectAllDays, selectAllDaysInSlot, addScheduleSlot, removeScheduleSlot are defined in dashboard.ejs inline
  
  console.log('[stream-modal.js] All functions exposed globally');
  
  // Setup scroll to top button for modals
  setupScrollToTopButton();
});

// Scroll to top functionality
function scrollModalToTop(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const modalContent = modal.querySelector('.overflow-y-auto');
  if (modalContent) {
    modalContent.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

function setupScrollToTopButton() {
  // Setup for New Stream Modal
  const newStreamModal = document.getElementById('newStreamModal');
  const scrollBtn = document.getElementById('scrollToTopBtn');
  
  if (newStreamModal && scrollBtn) {
    const modalContent = newStreamModal.querySelector('.overflow-y-auto');
    if (modalContent) {
      modalContent.addEventListener('scroll', function() {
        if (this.scrollTop > 300) {
          scrollBtn.classList.remove('hidden');
          scrollBtn.classList.add('flex');
        } else {
          scrollBtn.classList.add('hidden');
          scrollBtn.classList.remove('flex');
        }
      });
    }
  }
  
  // Setup for Edit Stream Modal
  const editStreamModal = document.getElementById('editStreamModal');
  const scrollBtnEdit = document.getElementById('scrollToTopBtnEdit');
  
  if (editStreamModal && scrollBtnEdit) {
    const modalContentEdit = editStreamModal.querySelector('.overflow-y-auto');
    if (modalContentEdit) {
      modalContentEdit.addEventListener('scroll', function() {
        if (this.scrollTop > 300) {
          scrollBtnEdit.classList.remove('hidden');
          scrollBtnEdit.classList.add('flex');
        } else {
          scrollBtnEdit.classList.add('hidden');
          scrollBtnEdit.classList.remove('flex');
        }
      });
    }
  }
}

// Expose scroll function globally
window.scrollModalToTop = scrollModalToTop;

// Tab switching functionality
let currentStreamTab = 'manual'; // 'manual' or 'youtube'
window.currentStreamTab = currentStreamTab; // Expose globally
let youtubeStreamKeys = [];
let youtubeStreamKeysCache = null; // Cache for stream keys
let youtubeStreamKeysCacheTime = null; // Cache timestamp
let youtubeChannels = []; // Store user's YouTube channels
let selectedChannelId = null; // Currently selected channel
const STREAM_KEYS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Load user's YouTube channels
async function loadYouTubeChannels() {
  try {
    console.log('[loadYouTubeChannels] Fetching user YouTube channels...');
    const response = await fetch('/youtube/api/channels');
    const data = await response.json();
    
    if (data.success && data.channels) {
      youtubeChannels = data.channels;
      console.log('[loadYouTubeChannels] Loaded', data.channels.length, 'channels:', data.channels);
      
      // Update channel selector
      updateChannelSelector(data.channels, data.hasMultipleChannels);
      
      // Set default channel
      const defaultChannel = data.channels.find(ch => ch.isDefault) || data.channels[0];
      if (defaultChannel) {
        selectedChannelId = defaultChannel.id;
        console.log('[loadYouTubeChannels] Default channel set:', defaultChannel.title);
      }
      
      return data;
    } else {
      console.error('[loadYouTubeChannels] Failed to load channels:', data.error);
      showChannelSelectorError(data.error || 'Failed to load YouTube channels');
      return null;
    }
  } catch (error) {
    console.error('[loadYouTubeChannels] Error:', error);
    showChannelSelectorError('Error connecting to YouTube API');
    return null;
  }
}

// Update channel selector dropdown
function updateChannelSelector(channels, hasMultipleChannels) {
  const selector = document.getElementById('youtubeChannelSelect');
  const container = document.getElementById('youtubeChannelSelector');
  
  if (!selector || !container) {
    console.warn('[updateChannelSelector] Channel selector elements not found');
    return;
  }
  
  // Show/hide channel selector based on number of channels
  if (hasMultipleChannels) {
    container.classList.remove('hidden');
    console.log('[updateChannelSelector] Showing channel selector (multiple channels)');
  } else {
    container.classList.add('hidden');
    console.log('[updateChannelSelector] Hiding channel selector (single channel)');
  }
  
  // Sort channels: default first, then alphabetically
  const sortedChannels = [...channels].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.title.localeCompare(b.title);
  });
  
  // Populate dropdown with clear default indication
  selector.innerHTML = sortedChannels.map(channel => `
    <option value="${channel.id}" ${channel.isDefault ? 'selected' : ''} style="background-color: #374151 !important; color: white !important;">
      ${channel.isDefault ? '⭐ ' : ''}${channel.title}${channel.isDefault ? ' (Default)' : ''} 
      ${channel.subscriberCount ? `• ${formatSubscriberCount(channel.subscriberCount)} subs` : ''}
    </option>
  `).join('');
  
  // Add event listener for channel selection
  selector.removeEventListener('change', handleChannelSelection);
  selector.addEventListener('change', handleChannelSelection);
  
  // Auto-select default channel
  const defaultChannel = channels.find(ch => ch.isDefault);
  if (defaultChannel) {
    selector.value = defaultChannel.id;
    selectedChannelId = defaultChannel.id;
    console.log('[updateChannelSelector] Auto-selected default channel:', defaultChannel.title);
  }
}

// Handle channel selection change
function handleChannelSelection(event) {
  const newChannelId = event.target.value;
  const oldChannelId = selectedChannelId;
  
  console.log('[handleChannelSelection] Channel changed:', oldChannelId, '→', newChannelId);
  
  selectedChannelId = newChannelId;
  
  // Clear stream keys cache when channel changes
  if (oldChannelId !== newChannelId) {
    youtubeStreamKeysCache = null;
    youtubeStreamKeysCacheTime = null;
    console.log('[handleChannelSelection] Stream keys cache cleared due to channel change');
    
    // Clear current stream key selection
    const streamKeyInput = document.getElementById('youtubeStreamKey');
    const streamIdInput = document.getElementById('youtubeStreamId');
    if (streamKeyInput) streamKeyInput.value = '';
    if (streamIdInput) streamIdInput.value = '';
    
    // Show message about channel change
    if (typeof showToast === 'function') {
      const selectedChannel = youtubeChannels.find(ch => ch.id === newChannelId);
      showToast('info', `Switched to ${selectedChannel?.title || 'selected channel'}. Stream keys cleared.`);
    }
  }
}

// Format subscriber count for display
function formatSubscriberCount(count) {
  if (!count || count === 0) return '0';
  
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  } else {
    return count.toString();
  }
}

// Show error in channel selector
function showChannelSelectorError(message) {
  const selector = document.getElementById('youtubeChannelSelect');
  const container = document.getElementById('youtubeChannelSelector');
  
  if (selector && container) {
    container.classList.remove('hidden');
    
    // Show helpful message based on error type
    if (message.includes('not connected') || message.includes('Not authenticated')) {
      selector.innerHTML = `
        <option value="" disabled selected>
          ⚠️ No YouTube channels connected
        </option>
      `;
      
      // Add connect button or link
      const connectHtml = `
        <div class="mt-2 p-3 bg-yellow-500/10 border border-yellow-600/30 rounded-lg">
          <div class="flex items-center gap-2 text-yellow-300 text-sm">
            <i class="ti ti-alert-triangle"></i>
            <span>No YouTube channels connected</span>
          </div>
          <div class="mt-2">
            <a href="/oauth2/login" class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
              <i class="ti ti-brand-youtube"></i>
              Connect YouTube Channel
            </a>
          </div>
        </div>
      `;
      
      // Insert after the selector
      const existingError = container.querySelector('.youtube-connect-error');
      if (existingError) {
        existingError.remove();
      }
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'youtube-connect-error';
      errorDiv.innerHTML = connectHtml;
      container.appendChild(errorDiv);
      
    } else {
      selector.innerHTML = `<option value="">Error: ${message}</option>`;
    }
    
    selector.disabled = true;
  }
}

function switchStreamTab(tab) {
  console.log('[switchStreamTab] ========== START ==========');
  console.log('[switchStreamTab] Switching to tab:', tab);
  currentStreamTab = tab;
  window.currentStreamTab = tab; // Update global reference
  
  // Auto-detect which modal is open (New Stream or Edit Stream)
  const editModal = document.getElementById('editStreamModal');
  const newModal = document.getElementById('newStreamModal');
  
  console.log('[switchStreamTab] Edit modal element:', editModal ? 'found' : 'NOT FOUND');
  console.log('[switchStreamTab] Edit modal hidden class:', editModal?.classList.contains('hidden'));
  
  // Check if edit modal is visible (not hidden AND has active class)
  const isEditModal = editModal && !editModal.classList.contains('hidden');
  
  const tabPrefix = isEditModal ? 'editTab' : 'tab';
  console.log('[switchStreamTab] Modal type:', isEditModal ? 'Edit' : 'New', 'tabPrefix:', tabPrefix);
  
  // Set the appropriate global variable based on modal type
  if (isEditModal) {
    window.currentEditStreamTab = tab;
    console.log('[switchStreamTab] Set currentEditStreamTab:', tab);
  } else {
    window.currentStreamTab = tab;
  }
  
  const tabManual = document.getElementById(tabPrefix + 'Manual');
  const tabYouTube = document.getElementById(tabPrefix + 'YouTube');
  
  // Use different IDs for edit modal vs new modal
  const youtubeApiFields = isEditModal ? 
    document.getElementById('editYoutubeApiFields') : 
    document.getElementById('youtubeApiFields');
  const manualRtmpFields = document.getElementById('manualRtmpFields');
  
  console.log('[switchStreamTab] Elements found:', {
    tabManual: tabManual ? 'YES' : 'NO',
    tabYouTube: tabYouTube ? 'YES' : 'NO',
    youtubeApiFields: youtubeApiFields ? 'YES' : 'NO',
    youtubeApiFieldsId: isEditModal ? 'editYoutubeApiFields' : 'youtubeApiFields',
    manualRtmpFields: manualRtmpFields ? 'YES' : 'NO'
  });
  
  if (!tabManual || !tabYouTube) {
    console.error('[switchStreamTab] ❌ Tab buttons not found:', { 
      expectedManualId: tabPrefix + 'Manual',
      expectedYouTubeId: tabPrefix + 'YouTube',
      tabManual, 
      tabYouTube 
    });
    return;
  }
  
  if (tab === 'manual') {
    console.log('[switchStreamTab] 📝 Activating Manual RTMP tab');
    // Activate Manual tab
    tabManual.classList.add('bg-primary', 'text-white');
    tabManual.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-dark-700');
    
    // Deactivate YouTube tab
    tabYouTube.classList.remove('bg-primary', 'text-white');
    tabYouTube.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-dark-700');
    
    // Show/Hide fields
    if (youtubeApiFields) {
      youtubeApiFields.classList.add('hidden');
      console.log('[switchStreamTab] ✅ YouTube API fields hidden');
    }
    if (manualRtmpFields) {
      manualRtmpFields.classList.remove('hidden');
      console.log('[switchStreamTab] ✅ Manual RTMP fields shown');
    }
    
    // Make RTMP fields required (only for New Stream Modal)
    if (!isEditModal) {
      const rtmpUrl = document.getElementById('rtmpUrl');
      const streamKey = document.getElementById('streamKey');
      if (rtmpUrl) rtmpUrl.required = true;
      if (streamKey) streamKey.required = true;
    }
    
  } else if (tab === 'youtube') {
    console.log('[switchStreamTab] 🎥 Activating YouTube API tab');
    // Activate YouTube tab
    tabYouTube.classList.add('bg-primary', 'text-white');
    tabYouTube.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-dark-700');
    
    // Deactivate Manual tab
    tabManual.classList.remove('bg-primary', 'text-white');
    tabManual.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-dark-700');
    
    // Show/Hide fields
    if (youtubeApiFields) {
      youtubeApiFields.classList.remove('hidden');
      console.log('[switchStreamTab] ✅ YouTube API fields shown');
    }
    if (manualRtmpFields) {
      manualRtmpFields.classList.add('hidden');
      console.log('[switchStreamTab] ✅ Manual RTMP fields hidden');
    }
    
    // Make RTMP fields not required (only for New Stream Modal)
    if (!isEditModal) {
      const rtmpUrl = document.getElementById('rtmpUrl');
      const streamKey = document.getElementById('streamKey');
      if (rtmpUrl) rtmpUrl.required = false;
      if (streamKey) streamKey.required = false;
    }
    
    // Initialize YouTube stream key validation
    setupYouTubeStreamKeyValidation();
    
    // Load YouTube channels when switching to YouTube tab
    loadYouTubeChannels();
    
    // Don't auto-load stream keys - user will click Load button
    // loadYouTubeStreamKeys();
  }
  
  console.log('[switchStreamTab] ========== END ==========');
}

// Make sure switchStreamTab is available globally
window.switchStreamTab = switchStreamTab;
console.log('[stream-modal.js] switchStreamTab function defined and exposed globally:', typeof window.switchStreamTab);

// Load YouTube stream keys from OAuth (with caching)
async function loadYouTubeStreamKeys(forceRefresh = false) {
  try {
    // Check if a channel is selected, if not try to load channels first
    if (!selectedChannelId) {
      console.warn('[loadYouTubeStreamKeys] No channel selected, loading channels first...');
      const channelData = await loadYouTubeChannels();
      if (!channelData || !selectedChannelId) {
        // For single channel users, try without channelId parameter (backward compatibility)
        console.log('[loadYouTubeStreamKeys] Trying without channelId for backward compatibility...');
      }
    }
    
    // Check cache first (unless force refresh)
    const now = Date.now();
    const cacheKey = `${selectedChannelId || 'default'}_streamkeys`;
    if (!forceRefresh && youtubeStreamKeysCache && youtubeStreamKeysCacheTime) {
      const cacheAge = now - youtubeStreamKeysCacheTime;
      if (cacheAge < STREAM_KEYS_CACHE_DURATION) {
        console.log('[loadYouTubeStreamKeys] Using cached stream keys for channel', selectedChannelId || 'default', '(age:', Math.round(cacheAge / 1000), 'seconds)');
        youtubeStreamKeys = youtubeStreamKeysCache;
        displayYouTubeStreamKeys(youtubeStreamKeysCache);
        
        // Show cache info
        if (typeof showToast === 'function') {
          const minutes = Math.floor(cacheAge / 60000);
          const selectedChannel = youtubeChannels.find(ch => ch.id === selectedChannelId);
          showToast('info', `Using cached data for ${selectedChannel?.title || 'selected channel'} (${minutes}m old)`);
        }
        return;
      } else {
        console.log('[loadYouTubeStreamKeys] Cache expired (age:', Math.round(cacheAge / 1000), 'seconds), fetching fresh data...');
      }
    }
    
    // Show loading state
    const container = document.getElementById('youtubeStreamKeysList');
    if (container) {
      const selectedChannel = youtubeChannels.find(ch => ch.id === selectedChannelId);
      container.innerHTML = `
        <div class="text-center py-4 text-gray-400">
          <i class="ti ti-loader animate-spin text-xl mb-2"></i>
          <p class="text-xs">Loading stream keys from ${selectedChannel?.title || 'YouTube'}...</p>
        </div>
      `;
    }
    
    console.log('[loadYouTubeStreamKeys] Fetching stream keys for channel:', selectedChannelId || 'default');
    
    // Build URL with optional channel ID parameter
    let url = '/oauth2/youtube/stream-keys';
    if (selectedChannelId) {
      url += `?channelId=${encodeURIComponent(selectedChannelId)}`;
    }
    
    const response = await fetch(url);
    console.log('[loadYouTubeStreamKeys] Response status:', response.status);
    const data = await response.json();
    console.log('[loadYouTubeStreamKeys] Data received:', data);
    
    if (response.status === 401 && data.needsReconnect) {
      // Handle case where YouTube is not connected
      console.log('[loadYouTubeStreamKeys] YouTube not connected, showing connect message');
      showYouTubeStreamKeysError('No YouTube channels connected. Please connect your YouTube account first.');
      
      // Show connect button in the stream keys area
      const container = document.getElementById('youtubeStreamKeysList');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8">
            <div class="mb-4">
              <i class="ti ti-brand-youtube text-red-500 text-4xl"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-300 mb-2">No YouTube Channels Connected</h3>
            <p class="text-gray-400 text-sm mb-4">Connect your YouTube channel to load stream keys</p>
            <a href="/oauth2/login" class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              <i class="ti ti-brand-youtube"></i>
              Connect YouTube Channel
            </a>
          </div>
        `;
      }
      
      if (typeof showToast === 'function') {
        showToast('warning', 'Please connect your YouTube channel first');
      }
      return;
    }
    
    if (data.success && data.streamKeys) {
      // Update cache with channel-specific key
      youtubeStreamKeys = data.streamKeys;
      youtubeStreamKeysCache = data.streamKeys;
      youtubeStreamKeysCacheTime = now;
      console.log('[loadYouTubeStreamKeys] Stream keys cached for channel', selectedChannelId || 'default', 'for', STREAM_KEYS_CACHE_DURATION / 1000, 'seconds');
      
      displayYouTubeStreamKeys(data.streamKeys);
      
      // Show success message
      if (typeof showToast === 'function') {
        const selectedChannel = youtubeChannels.find(ch => ch.id === selectedChannelId);
        showToast('success', `Loaded ${data.streamKeys.length} stream key(s) from ${selectedChannel?.title || 'YouTube'}`);
      }
    } else {
      console.error('Failed to load YouTube stream keys:', data.error);
      showYouTubeStreamKeysError(data.error || 'Failed to load stream keys');
      
      if (typeof showToast === 'function') {
        showToast('error', data.error || 'Failed to load stream keys');
      }
    }
  } catch (error) {
    console.error('Error loading YouTube stream keys:', error);
    showYouTubeStreamKeysError('Error connecting to YouTube API');
    
    if (typeof showToast === 'function') {
      showToast('error', 'Error connecting to YouTube API');
    }
  }
}

// Display YouTube stream keys
function displayYouTubeStreamKeys(streamKeys) {
  const container = document.getElementById('youtubeStreamKeysList');
  if (!container) return;
  
  // Update count
  const countElement = document.getElementById('streamKeysCount');
  if (countElement) {
    countElement.textContent = `(${streamKeys.length})`;
  }
  
  // Update cache info
  const cacheInfoElement = document.getElementById('streamKeysCacheInfo');
  if (cacheInfoElement && youtubeStreamKeysCacheTime) {
    const cacheAge = Math.floor((Date.now() - youtubeStreamKeysCacheTime) / 1000);
    const minutes = Math.floor(cacheAge / 60);
    const seconds = cacheAge % 60;
    
    if (minutes > 0) {
      cacheInfoElement.textContent = `Cached ${minutes}m ago`;
    } else {
      cacheInfoElement.textContent = `Cached ${seconds}s ago`;
    }
    cacheInfoElement.classList.remove('hidden');
  }
  
  if (streamKeys.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-400">
        <i class="ti ti-alert-circle text-2xl mb-2"></i>
        <p class="text-sm">No stream keys found</p>
        <p class="text-xs text-gray-500 mt-1">Create a stream in YouTube Studio first</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = streamKeys.map(key => `
    <button type="button" onclick="selectYouTubeStreamKey('${key.id}')" 
      class="w-full flex items-center gap-2 p-2.5 bg-dark-800 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all text-left group">
      <i class="ti ti-key text-red-500 text-lg flex-shrink-0"></i>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">${key.title || 'Untitled Stream'}</p>
        <p class="text-xs text-gray-400 mt-0.5 truncate">${key.ingestionInfo?.rtmpsIngestionAddress || 'N/A'}</p>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <button type="button" onclick="event.stopPropagation(); copyStreamKeyToClipboard('${key.id}', 'rtmp')" 
          class="p-1.5 hover:bg-gray-600 rounded transition-colors" 
          title="Copy RTMP URL">
          <i class="ti ti-link text-gray-400 hover:text-blue-400 text-sm"></i>
        </button>
        <button type="button" onclick="event.stopPropagation(); copyStreamKeyToClipboard('${key.id}', 'key')" 
          class="p-1.5 hover:bg-gray-600 rounded transition-colors" 
          title="Copy Stream Key">
          <i class="ti ti-key text-gray-400 hover:text-yellow-400 text-sm"></i>
        </button>
        <button type="button" onclick="event.stopPropagation(); copyToManualRTMP('${key.id}')" 
          class="p-1.5 hover:bg-gray-600 rounded transition-colors" 
          title="Copy to Manual RTMP">
          <i class="ti ti-copy text-gray-400 hover:text-green-400 text-sm"></i>
        </button>
        <i class="ti ti-chevron-right text-gray-400 group-hover:text-primary transition-colors text-sm"></i>
      </div>
    </button>
  `).join('');
}

// Show error message for YouTube stream keys
function showYouTubeStreamKeysError(message) {
  const container = document.getElementById('youtubeStreamKeysList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-4 text-red-400">
      <i class="ti ti-alert-triangle text-2xl mb-2"></i>
      <p class="text-sm">${message}</p>
      <p class="text-xs text-gray-500 mt-1">Make sure you're connected to YouTube</p>
    </div>
  `;
}

// Copy stream key data to clipboard
function copyStreamKeyToClipboard(keyId, type) {
  const selectedKey = youtubeStreamKeys.find(k => k.id === keyId);
  if (!selectedKey) return;
  
  let textToCopy = '';
  let successMessage = '';
  
  if (type === 'rtmp') {
    textToCopy = selectedKey.ingestionInfo?.rtmpsIngestionAddress || '';
    successMessage = 'RTMP URL copied to clipboard!';
  } else if (type === 'key') {
    textToCopy = selectedKey.ingestionInfo?.streamName || '';
    successMessage = 'Stream Key copied to clipboard!';
  }
  
  if (!textToCopy) {
    if (typeof showToast === 'function') {
      showToast('error', 'No data to copy');
    }
    return;
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(textToCopy).then(() => {
    if (typeof showToast === 'function') {
      showToast('success', successMessage);
    } else {
      console.log(successMessage, textToCopy);
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
    if (typeof showToast === 'function') {
      showToast('error', 'Failed to copy to clipboard');
    }
  });
}

// Copy YouTube stream key to Manual RTMP tab
function copyToManualRTMP(keyId) {
  const selectedKey = youtubeStreamKeys.find(k => k.id === keyId);
  if (!selectedKey) return;
  
  // Close the list modal
  const listModal = document.getElementById('youtubeStreamKeysModal');
  if (listModal) {
    listModal.classList.add('hidden');
  }
  
  // Switch to Manual tab
  switchStreamTab('manual');
  
  // Fill Manual RTMP fields
  const rtmpUrl = document.getElementById('rtmpUrl');
  const streamKey = document.getElementById('streamKey');
  const streamTitle = document.getElementById('streamTitle');
  
  if (rtmpUrl && selectedKey.ingestionInfo?.rtmpsIngestionAddress) {
    rtmpUrl.value = selectedKey.ingestionInfo.rtmpsIngestionAddress;
  }
  
  if (streamKey && selectedKey.ingestionInfo?.streamName) {
    streamKey.value = selectedKey.ingestionInfo.streamName;
  }
  
  if (streamTitle && selectedKey.title) {
    streamTitle.value = selectedKey.title;
  }
  
  // Show success message
  if (typeof showToast === 'function') {
    showToast('success', 'Stream key copied to Manual RTMP tab');
  }
  
  console.log('[copyToManualRTMP] Copied stream key to Manual tab:', selectedKey.id);
}

// Make copyToManualRTMP available globally
window.copyToManualRTMP = copyToManualRTMP;

// Select YouTube stream key
function selectYouTubeStreamKey(keyId) {
  const selectedKey = youtubeStreamKeys.find(k => k.id === keyId);
  if (!selectedKey) return;
  
  // Auto-fill YouTube API specific fields
  const youtubeRtmpUrl = document.getElementById('youtubeRtmpUrl');
  const youtubeStreamKey = document.getElementById('youtubeStreamKey');
  const youtubeStreamTitle = document.getElementById('youtubeStreamTitle');
  const youtubeDescription = document.getElementById('youtubeDescription');
  
  // Fill RTMP URL (read-only)
  if (youtubeRtmpUrl && selectedKey.ingestionInfo?.rtmpsIngestionAddress) {
    youtubeRtmpUrl.value = selectedKey.ingestionInfo.rtmpsIngestionAddress;
  }
  
  // Fill Stream Key (read-only)
  if (youtubeStreamKey && selectedKey.ingestionInfo?.streamName) {
    youtubeStreamKey.value = selectedKey.ingestionInfo.streamName;
  }
  
  // Fill Stream Title (editable)
  if (youtubeStreamTitle && selectedKey.title) {
    youtubeStreamTitle.value = selectedKey.title;
  }
  
  // Store YouTube stream ID in hidden field for backend
  let youtubeStreamIdInput = document.getElementById('youtubeStreamId');
  if (!youtubeStreamIdInput) {
    console.error('[selectYouTubeStreamKey] ❌ Hidden field #youtubeStreamId not found! This should not happen.');
    // Create hidden input as fallback
    const form = document.getElementById('newStreamForm');
    if (!form) {
      console.warn('[selectYouTubeStreamKey] Form not found! Storing in sessionStorage for later');
      // Store in sessionStorage to be retrieved when form is opened
      sessionStorage.setItem('selectedYouTubeStreamId', selectedKey.id);
      sessionStorage.setItem('selectedYouTubeStreamKey', selectedKey.ingestionInfo?.streamName || '');
      sessionStorage.setItem('selectedYouTubeStreamTitle', selectedKey.title || '');
      sessionStorage.setItem('selectedYouTubeStreamDescription', selectedKey.snippet?.description || '');
      console.log('[selectYouTubeStreamKey] Stored in sessionStorage - ID:', selectedKey.id);
      
      // Close the list modal and show success message
      const listModal = document.getElementById('youtubeStreamKeysModal');
      if (listModal) {
        listModal.classList.add('hidden');
      }
      if (typeof showToast === 'function') {
        showToast('success', 'YouTube stream key selected. Open "New Stream" to use it.');
      }
      return;
    }
    youtubeStreamIdInput = document.createElement('input');
    youtubeStreamIdInput.type = 'hidden';
    youtubeStreamIdInput.id = 'youtubeStreamId';
    youtubeStreamIdInput.name = 'youtubeStreamId';
    form.appendChild(youtubeStreamIdInput);
  }
  youtubeStreamIdInput.value = selectedKey.id; // Store YouTube stream ID
  
  // Also store in sessionStorage as backup
  sessionStorage.setItem('selectedYouTubeStreamId', selectedKey.id);
  
  console.log('[selectYouTubeStreamKey] ✓ Selected stream ID:', selectedKey.id, 'for stream key:', selectedKey.ingestionInfo?.streamName);
  console.log('[selectYouTubeStreamKey] ✓ Hidden field value set to:', youtubeStreamIdInput.value);
  
  // Fill Description if available (editable)
  if (youtubeDescription && selectedKey.snippet?.description) {
    youtubeDescription.value = selectedKey.snippet.description;
  }
  
  // Also fill the main stream title field
  const streamTitle = document.getElementById('streamTitle');
  if (streamTitle && !streamTitle.value && selectedKey.title) {
    streamTitle.value = selectedKey.title;
  }
  
  // Show notification
  if (typeof showToast === 'function') {
    showToast('success', 'YouTube stream key loaded from your channel');
  }
  
  // Highlight selected key
  const buttons = document.querySelectorAll('#youtubeStreamKeysList button');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick').includes(keyId)) {
      btn.classList.add('border-primary', 'bg-primary/10');
    } else {
      btn.classList.remove('border-primary', 'bg-primary/10');
    }
  });
  
  // Close dropdown after selection
  const dropdown = document.getElementById('youtubeStreamKeysDropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}

// Toggle YouTube stream key visibility
function toggleYouTubeStreamKeyVisibility() {
  const streamKeyInput = document.getElementById('youtubeStreamKey');
  const streamKeyToggle = document.getElementById('youtubeStreamKeyToggle');
  
  if (!streamKeyInput || !streamKeyToggle) return;
  
  if (streamKeyInput.type === 'password') {
    streamKeyInput.type = 'text';
    streamKeyToggle.classList.remove('ti-eye');
    streamKeyToggle.classList.add('ti-eye-off');
  } else {
    streamKeyInput.type = 'password';
    streamKeyToggle.classList.remove('ti-eye-off');
    streamKeyToggle.classList.add('ti-eye');
  }
}

// Validate YouTube stream key
async function validateYouTubeStreamKey(streamKey) {
  if (!streamKey || streamKey.trim().length === 0) {
    return { valid: false, message: 'Stream key is required' };
  }
  
  try {
    console.log(`[validateYouTubeStreamKey] Validating stream key: ${streamKey.substring(0, 8)}...`);
    
    const response = await fetch('/youtube/validate-stream-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ streamKey: streamKey.trim() })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return data;
    } else {
      return { valid: false, message: data.error || 'Validation failed' };
    }
  } catch (error) {
    console.error('[validateYouTubeStreamKey] Error:', error);
    return { valid: false, message: 'Error validating stream key' };
  }
}

// Add stream key validation on input change
function setupYouTubeStreamKeyValidation() {
  const streamKeyInput = document.getElementById('youtubeStreamKey');
  if (!streamKeyInput) return;
  
  let validationTimeout;
  let lastValidatedKey = '';
  
  // Add validation indicator container
  const container = streamKeyInput.parentElement;
  let validationDiv = container.querySelector('.stream-key-validation');
  if (!validationDiv) {
    validationDiv = document.createElement('div');
    validationDiv.className = 'stream-key-validation mt-2';
    validationDiv.style.display = 'none';
    container.appendChild(validationDiv);
  }
  
  streamKeyInput.addEventListener('input', function() {
    const streamKey = this.value.trim();
    
    // Clear previous timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    // Clear previous validation state
    this.classList.remove('border-green-500', 'border-red-500', 'border-yellow-500');
    
    if (streamKey.length === 0) {
      validationDiv.style.display = 'none';
      lastValidatedKey = '';
      return;
    }
    
    // Don't validate if same as last validated key
    if (streamKey === lastValidatedKey) {
      return;
    }
    
    // Show loading state
    validationDiv.innerHTML = `
      <div class="flex items-center gap-2 text-gray-400 text-xs">
        <i class="ti ti-loader animate-spin"></i>
        <span>Validating stream key...</span>
      </div>
    `;
    validationDiv.style.display = 'block';
    
    // Validate after 1 second of no typing
    validationTimeout = setTimeout(async () => {
      const result = await validateYouTubeStreamKey(streamKey);
      lastValidatedKey = streamKey;
      
      if (result.valid) {
        if (result.hasExistingBroadcast) {
          // Stream key is bound to existing broadcast
          streamKeyInput.classList.add('border-yellow-500');
          streamKeyInput.classList.remove('border-red-500', 'border-green-500');
          
          validationDiv.innerHTML = `
            <div class="p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg text-xs">
              <div class="flex items-center gap-2 text-yellow-400 mb-2">
                <i class="ti ti-alert-triangle"></i>
                <span class="font-medium">Existing Broadcast Found</span>
              </div>
              <div class="text-gray-300 mb-2">
                This stream key is bound to: <strong>"${result.broadcast.title}"</strong>
              </div>
              <div class="flex items-center gap-4 text-gray-400 mb-2">
                <span>Status: ${result.broadcast.status}</span>
                ${result.broadcast.thumbnailUrl ? `<img src="${result.broadcast.thumbnailUrl}" alt="Thumbnail" class="w-8 h-6 object-cover rounded">` : ''}
              </div>
              <div class="text-yellow-300">
                ✓ StreamBro will reuse this existing broadcast instead of creating a new one
              </div>
            </div>
          `;
          
          if (typeof showToast === 'function') {
            showToast(`Found existing broadcast: "${result.broadcast.title}"`, 'warning');
          }
        } else {
          // Stream key is valid but not bound to any broadcast
          streamKeyInput.classList.add('border-green-500');
          streamKeyInput.classList.remove('border-red-500', 'border-yellow-500');
          
          validationDiv.innerHTML = `
            <div class="flex items-center gap-2 text-green-400 text-xs">
              <i class="ti ti-check-circle"></i>
              <span>Valid stream key - ready for new broadcast</span>
            </div>
          `;
          
          if (typeof showToast === 'function') {
            showToast(`✓ Stream key validated: ${result.stream?.title || 'Valid stream'}`, 'success');
          }
        }
      } else {
        // Invalid stream key
        streamKeyInput.classList.add('border-red-500');
        streamKeyInput.classList.remove('border-green-500', 'border-yellow-500');
        
        validationDiv.innerHTML = `
          <div class="flex items-center gap-2 text-red-400 text-xs">
            <i class="ti ti-x-circle"></i>
            <span>${result.message || 'Stream key not found in your YouTube channel'}</span>
          </div>
        `;
        
        if (typeof showToast === 'function') {
          showToast(`✗ ${result.message}`, 'error');
        }
      }
    }, 1000);
  });
}

// Toggle YouTube stream keys dropdown
function toggleYouTubeStreamKeysDropdown() {
  const dropdown = document.getElementById('youtubeStreamKeysDropdown');
  if (!dropdown) return;
  
  if (dropdown.classList.contains('hidden')) {
    dropdown.classList.remove('hidden');
    // Load stream keys (will use cache if available)
    loadYouTubeStreamKeys();
  } else {
    dropdown.classList.add('hidden');
  }
}

// Force refresh YouTube stream keys (bypass cache)
function refreshYouTubeStreamKeys() {
  console.log('[refreshYouTubeStreamKeys] Force refreshing stream keys...');
  loadYouTubeStreamKeys(true); // Force refresh
}

// Toggle YouTube additional settings
function toggleYouTubeAdditionalSettings() {
  console.log('[toggleYouTubeAdditionalSettings] Called');
  const settings = document.getElementById('youtubeAdditionalSettings');
  const icon = document.getElementById('youtubeAdditionalSettingsIcon');
  
  console.log('[toggleYouTubeAdditionalSettings] Settings:', settings);
  console.log('[toggleYouTubeAdditionalSettings] Icon:', icon);
  
  if (!settings || !icon) {
    console.log('[toggleYouTubeAdditionalSettings] Settings or icon not found!');
    return;
  }
  
  if (settings.classList.contains('hidden')) {
    console.log('[toggleYouTubeAdditionalSettings] Showing settings');
    settings.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';
  } else {
    console.log('[toggleYouTubeAdditionalSettings] Hiding settings');
    settings.classList.add('hidden');
    icon.style.transform = '';
  }
}

// Toggle schedule section (Stream Mode & Schedule Settings)
function toggleScheduleSection() {
  console.log('[toggleScheduleSection] Called');
  const content = document.getElementById('scheduleSectionContent');
  const icon = document.getElementById('scheduleSectionIcon');
  
  if (!content || !icon) {
    console.log('[toggleScheduleSection] Content or icon not found!');
    return;
  }
  
  if (content.classList.contains('hidden')) {
    console.log('[toggleScheduleSection] Showing schedule section');
    content.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';
  } else {
    console.log('[toggleScheduleSection] Hiding schedule section');
    content.classList.add('hidden');
    icon.style.transform = '';
  }
}

// Expose YouTube API functions globally
window.selectYouTubeStreamKey = selectYouTubeStreamKey;
window.toggleYouTubeStreamKeyVisibility = toggleYouTubeStreamKeyVisibility;
window.toggleYouTubeStreamKeysDropdown = toggleYouTubeStreamKeysDropdown;
window.refreshYouTubeStreamKeys = refreshYouTubeStreamKeys;
window.copyStreamKeyToClipboard = copyStreamKeyToClipboard;
window.copyToManualRTMP = copyToManualRTMP;
window.toggleYouTubeAdditionalSettings = toggleYouTubeAdditionalSettings;
window.toggleScheduleSection = toggleScheduleSection;

console.log('[stream-modal.js] YouTube API functions exposed globally');

// ============================================================================
// MANUAL RTMP STREAM KEYS DROPDOWN FUNCTIONS
// ============================================================================

// Toggle Manual RTMP Stream Keys Dropdown
function toggleManualRTMPStreamKeysDropdown() {
  const dropdown = document.getElementById('manualRTMPStreamKeysDropdown');
  if (!dropdown) return;
  
  if (dropdown.classList.contains('hidden')) {
    dropdown.classList.remove('hidden');
    // Load stream keys if not already loaded or cache expired
    loadManualRTMPStreamKeys();
  } else {
    dropdown.classList.add('hidden');
  }
}

// Load Manual RTMP Stream Keys (reuses YouTube cache)
async function loadManualRTMPStreamKeys(forceRefresh = false) {
  try {
    // Check cache first (reuse YouTube cache)
    const now = Date.now();
    if (!forceRefresh && youtubeStreamKeysCache && youtubeStreamKeysCacheTime) {
      const cacheAge = now - youtubeStreamKeysCacheTime;
      if (cacheAge < STREAM_KEYS_CACHE_DURATION) {
        console.log('[loadManualRTMPStreamKeys] Using cached stream keys (age:', Math.round(cacheAge / 1000), 'seconds)');
        displayManualRTMPStreamKeys(youtubeStreamKeysCache);
        
        if (typeof showToast === 'function') {
          const minutes = Math.floor(cacheAge / 60000);
          showToast('info', `Using cached data (${minutes}m old)`);
        }
        return;
      } else {
        console.log('[loadManualRTMPStreamKeys] Cache expired, fetching fresh data...');
      }
    }
    
    // Show loading state
    const container = document.getElementById('manualRTMPStreamKeysList');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-4 text-gray-400">
          <i class="ti ti-loader animate-spin text-xl mb-2"></i>
          <p class="text-xs">Loading stream keys from YouTube...</p>
        </div>
      `;
    }
    
    console.log('[loadManualRTMPStreamKeys] Fetching stream keys from YouTube API...');
    const response = await fetch('/oauth2/youtube/stream-keys');
    const data = await response.json();
    
    if (data.success && data.streamKeys) {
      // Update cache (shared with YouTube API tab)
      youtubeStreamKeysCache = data.streamKeys;
      youtubeStreamKeysCacheTime = now;
      console.log('[loadManualRTMPStreamKeys] Stream keys cached');
      
      displayManualRTMPStreamKeys(data.streamKeys);
      
      if (typeof showToast === 'function') {
        showToast('success', `Loaded ${data.streamKeys.length} stream key(s)`);
      }
    } else {
      console.error('[loadManualRTMPStreamKeys] Failed:', data.error);
      showManualRTMPStreamKeysError(data.error || 'Failed to load stream keys');
      if (typeof showToast === 'function') {
        showToast('error', data.error || 'Failed to load stream keys');
      }
    }
  } catch (error) {
    console.error('[loadManualRTMPStreamKeys] Error:', error);
    showManualRTMPStreamKeysError('Error connecting to YouTube API');
    if (typeof showToast === 'function') {
      showToast('error', 'Error connecting to YouTube API');
    }
  }
}

// Display Manual RTMP Stream Keys
function displayManualRTMPStreamKeys(streamKeys) {
  const container = document.getElementById('manualRTMPStreamKeysList');
  if (!container) return;
  
  // Update count
  const countElement = document.getElementById('manualStreamKeysCount');
  if (countElement) {
    countElement.textContent = `(${streamKeys.length})`;
  }
  
  // Update cache info
  const cacheInfoElement = document.getElementById('manualStreamKeysCacheInfo');
  if (cacheInfoElement && youtubeStreamKeysCacheTime) {
    const cacheAge = Math.floor((Date.now() - youtubeStreamKeysCacheTime) / 1000);
    const minutes = Math.floor(cacheAge / 60);
    const seconds = cacheAge % 60;
    
    if (minutes > 0) {
      cacheInfoElement.textContent = `Cached ${minutes}m ago`;
    } else {
      cacheInfoElement.textContent = `Cached ${seconds}s ago`;
    }
  }
  
  if (streamKeys.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-400">
        <i class="ti ti-alert-circle text-2xl mb-2"></i>
        <p class="text-sm">No stream keys found</p>
        <p class="text-xs text-gray-500 mt-1">Create a stream in YouTube Studio first</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = streamKeys.map(key => `
    <button type="button" onclick="selectStreamKeyForManualRTMP('${key.id}')" 
      class="w-full flex items-center gap-2 p-2.5 bg-dark-800 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all text-left group">
      <i class="ti ti-key text-red-500 text-lg flex-shrink-0"></i>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">${key.title || 'Untitled Stream'}</p>
        <p class="text-xs text-gray-400 mt-0.5 truncate">${key.ingestionInfo?.streamName || 'N/A'}</p>
      </div>
      <i class="ti ti-chevron-right text-gray-400 group-hover:text-primary transition-colors text-sm"></i>
    </button>
  `).join('');
}

// Show error message for Manual RTMP stream keys
function showManualRTMPStreamKeysError(message) {
  const container = document.getElementById('manualRTMPStreamKeysList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-4 text-red-400">
      <i class="ti ti-alert-circle text-2xl mb-2"></i>
      <p class="text-sm">${message}</p>
      <button type="button" onclick="loadManualRTMPStreamKeys(true)" 
        class="mt-3 px-3 py-1.5 bg-primary hover:bg-blue-600 text-white rounded text-xs transition-colors">
        Try Again
      </button>
    </div>
  `;
}

// Select stream key for Manual RTMP
function selectStreamKeyForManualRTMP(keyId) {
  console.log('[selectStreamKeyForManualRTMP] Selecting key:', keyId);
  
  // Find the stream key from cache
  const streamKey = youtubeStreamKeysCache?.find(k => k.id === keyId);
  if (!streamKey) {
    console.error('[selectStreamKeyForManualRTMP] Stream key not found in cache');
    return;
  }
  
  // Fill RTMP URL
  const rtmpUrlInput = document.getElementById('rtmpUrl');
  if (rtmpUrlInput && streamKey.ingestionInfo?.rtmpsIngestionAddress) {
    rtmpUrlInput.value = streamKey.ingestionInfo.rtmpsIngestionAddress;
  }
  
  // Fill Stream Key
  const streamKeyInput = document.getElementById('streamKey');
  if (streamKeyInput && streamKey.ingestionInfo?.streamName) {
    streamKeyInput.value = streamKey.ingestionInfo.streamName;
  }
  
  // Fill Stream Title (optional)
  const streamTitleInput = document.getElementById('streamTitle');
  if (streamTitleInput && streamKey.title && !streamTitleInput.value) {
    streamTitleInput.value = streamKey.title;
  }
  
  // Close dropdown
  toggleManualRTMPStreamKeysDropdown();
  
  // Show success message
  if (typeof showToast === 'function') {
    showToast('success', `Stream key loaded: ${streamKey.title || 'Untitled'}`);
  }
  
  console.log('[selectStreamKeyForManualRTMP] Stream key loaded successfully');
}

// Refresh Manual RTMP stream keys
function refreshManualRTMPStreamKeys() {
  console.log('[refreshManualRTMPStreamKeys] Force refreshing stream keys...');
  loadManualRTMPStreamKeys(true);
}

// Expose Manual RTMP functions globally
window.toggleManualRTMPStreamKeysDropdown = toggleManualRTMPStreamKeysDropdown;
window.loadManualRTMPStreamKeys = loadManualRTMPStreamKeys;
window.selectStreamKeyForManualRTMP = selectStreamKeyForManualRTMP;
window.refreshManualRTMPStreamKeys = refreshManualRTMPStreamKeys;

console.log('[stream-modal.js] Manual RTMP functions exposed globally');
console.log('[stream-modal.js] Loaded successfully');

// Note: YouTube platform selector is handled by event delegation in dashboard.ejs inline JavaScript


// ============================================================================
// EDIT MODAL FUNCTIONS
// ============================================================================

// Edit Modal - Toggle Manual RTMP Stream Keys Dropdown
function toggleEditManualRTMPStreamKeysDropdown() {
  const dropdown = document.getElementById('editManualRTMPStreamKeysDropdown');
  if (!dropdown) return;
  
  if (dropdown.classList.contains('hidden')) {
    dropdown.classList.remove('hidden');
    // Load stream keys if not already loaded or cache expired
    loadEditManualRTMPStreamKeys();
  } else {
    dropdown.classList.add('hidden');
  }
}

// Edit Modal - Load Manual RTMP Stream Keys
async function loadEditManualRTMPStreamKeys(forceRefresh = false) {
  console.log('[loadEditManualRTMPStreamKeys] Loading stream keys...', { forceRefresh });
  
  const container = document.getElementById('editManualRTMPStreamKeysList');
  if (!container) {
    console.error('[loadEditManualRTMPStreamKeys] Container not found');
    return;
  }
  
  // Check cache (5 minutes)
  const cacheExpiry = 5 * 60 * 1000;
  const now = Date.now();
  
  if (!forceRefresh && youtubeStreamKeysCache && youtubeStreamKeysCacheTime && (now - youtubeStreamKeysCacheTime < cacheExpiry)) {
    console.log('[loadEditManualRTMPStreamKeys] Using cached stream keys');
    displayEditManualRTMPStreamKeys(youtubeStreamKeysCache);
    return;
  }
  
  // Show loading
  container.innerHTML = `
    <div class="text-center py-4 text-gray-400">
      <i class="ti ti-loader animate-spin text-xl mb-2"></i>
      <p class="text-xs">Loading stream keys...</p>
    </div>
  `;
  
  try {
    const response = await fetch('/oauth2/youtube/stream-keys');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load stream keys');
    }
    
    if (!data.streamKeys || data.streamKeys.length === 0) {
      showEditManualRTMPStreamKeysError('No stream keys found. Create a stream in YouTube Studio first.');
      return;
    }
    
    // Update cache
    youtubeStreamKeysCache = data.streamKeys;
    youtubeStreamKeysCacheTime = now;
    
    console.log('[loadEditManualRTMPStreamKeys] Loaded stream keys:', data.streamKeys.length);
    displayEditManualRTMPStreamKeys(data.streamKeys);
    
    if (typeof showToast === 'function') {
      showToast('success', `Loaded ${data.streamKeys.length} stream key(s)`);
    }
  } catch (error) {
    console.error('[loadEditManualRTMPStreamKeys] Error:', error);
    showEditManualRTMPStreamKeysError(error.message || 'Failed to load stream keys');
    
    if (typeof showToast === 'function') {
      showToast('error', 'Failed to load stream keys');
    }
  }
}

// Edit Modal - Display Manual RTMP Stream Keys
function displayEditManualRTMPStreamKeys(streamKeys) {
  const container = document.getElementById('editManualRTMPStreamKeysList');
  if (!container) return;
  
  // Update count
  const countElement = document.getElementById('editManualStreamKeysCount');
  if (countElement) {
    countElement.textContent = `(${streamKeys.length})`;
  }
  
  // Update cache info
  const cacheInfoElement = document.getElementById('editManualStreamKeysCacheInfo');
  if (cacheInfoElement && youtubeStreamKeysCacheTime) {
    const cacheAge = Math.floor((Date.now() - youtubeStreamKeysCacheTime) / 1000);
    const minutes = Math.floor(cacheAge / 60);
    const seconds = cacheAge % 60;
    
    if (minutes > 0) {
      cacheInfoElement.textContent = `Cached ${minutes}m ago`;
    } else {
      cacheInfoElement.textContent = `Cached ${seconds}s ago`;
    }
  }
  
  if (streamKeys.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-400">
        <i class="ti ti-alert-circle text-2xl mb-2"></i>
        <p class="text-sm">No stream keys found</p>
        <p class="text-xs text-gray-500 mt-1">Create a stream in YouTube Studio first</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = streamKeys.map(key => `
    <button type="button" onclick="selectEditManualStreamKey('${key.id}')" 
      class="w-full flex items-center gap-2 p-2.5 bg-dark-800 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all text-left group">
      <i class="ti ti-key text-red-500 text-lg flex-shrink-0"></i>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">${key.title || 'Untitled Stream'}</p>
        <p class="text-xs text-gray-400 mt-0.5 truncate">${key.ingestionInfo?.streamName || 'N/A'}</p>
      </div>
      <i class="ti ti-chevron-right text-gray-400 group-hover:text-primary transition-colors text-sm"></i>
    </button>
  `).join('');
}

// Edit Modal - Show error message for Manual RTMP stream keys
function showEditManualRTMPStreamKeysError(message) {
  const container = document.getElementById('editManualRTMPStreamKeysList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-4 text-red-400">
      <i class="ti ti-alert-circle text-2xl mb-2"></i>
      <p class="text-sm">${message}</p>
      <button type="button" onclick="refreshEditManualRTMPStreamKeys()" 
        class="mt-2 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors">
        Try Again
      </button>
    </div>
  `;
}

// Edit Modal - Refresh Manual RTMP stream keys
function refreshEditManualRTMPStreamKeys() {
  console.log('[refreshEditManualRTMPStreamKeys] Force refreshing stream keys...');
  loadEditManualRTMPStreamKeys(true);
}

// Edit Modal - Select Manual Stream Key
function selectEditManualStreamKey(streamKeyId) {
  console.log('[selectEditManualStreamKey] Selecting stream key:', streamKeyId);
  
  if (!youtubeStreamKeysCache) {
    console.error('[selectEditManualStreamKey] No cached stream keys');
    return;
  }
  
  const streamKey = youtubeStreamKeysCache.find(key => key.id === streamKeyId);
  if (!streamKey) {
    console.error('[selectEditManualStreamKey] Stream key not found:', streamKeyId);
    return;
  }
  
  // Fill in the form fields
  const rtmpUrlInput = document.getElementById('editRtmpUrl');
  const streamKeyInput = document.getElementById('editStreamKey');
  
  if (rtmpUrlInput && streamKey.ingestionInfo?.ingestionAddress) {
    rtmpUrlInput.value = streamKey.ingestionInfo.ingestionAddress;
  }
  
  if (streamKeyInput && streamKey.ingestionInfo?.streamName) {
    streamKeyInput.value = streamKey.ingestionInfo.streamName;
  }
  
  // Close dropdown
  toggleEditManualRTMPStreamKeysDropdown();
  
  if (typeof showToast === 'function') {
    showToast('success', 'Stream key loaded successfully');
  }
}

// Edit Modal - Toggle YouTube Stream Key Visibility
function toggleEditYouTubeStreamKeyVisibility() {
  const streamKeyInput = document.getElementById('editYoutubeStreamKey');
  const streamKeyToggle = document.getElementById('editYoutubeStreamKeyToggle');
  
  if (!streamKeyInput || !streamKeyToggle) return;
  
  if (streamKeyInput.type === 'password') {
    streamKeyInput.type = 'text';
    streamKeyToggle.classList.remove('ti-eye');
    streamKeyToggle.classList.add('ti-eye-off');
  } else {
    streamKeyInput.type = 'password';
    streamKeyToggle.classList.remove('ti-eye-off');
    streamKeyToggle.classList.add('ti-eye');
  }
}

// Edit Modal - Toggle Edit Stream Key Visibility (for Manual RTMP)
function toggleEditStreamKeyVisibility() {
  const streamKeyInput = document.getElementById('editStreamKey');
  const streamKeyToggle = document.getElementById('editStreamKeyToggle');
  
  if (!streamKeyInput || !streamKeyToggle) return;
  
  if (streamKeyInput.type === 'password') {
    streamKeyInput.type = 'text';
    streamKeyToggle.classList.remove('ti-eye');
    streamKeyToggle.classList.add('ti-eye-off');
  } else {
    streamKeyInput.type = 'password';
    streamKeyToggle.classList.remove('ti-eye-off');
    streamKeyToggle.classList.add('ti-eye');
  }
}

// Edit Modal - Load YouTube API Stream Keys
async function loadEditYouTubeStreamKeys() {
  console.log('[loadEditYouTubeStreamKeys] Loading YouTube stream keys...');
  
  const container = document.getElementById('editYoutubeStreamKeysList');
  if (!container) {
    console.error('[loadEditYouTubeStreamKeys] Container not found');
    return;
  }
  
  // Show loading
  container.innerHTML = `
    <div class="text-center py-4 text-gray-400">
      <i class="ti ti-loader animate-spin text-xl mb-2"></i>
      <p class="text-xs">Loading stream keys...</p>
    </div>
  `;
  
  try {
    const response = await fetch('/oauth2/youtube/stream-keys');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load stream keys');
    }
    
    if (!data.streamKeys || data.streamKeys.length === 0) {
      showEditYouTubeStreamKeysError('No stream keys found. Create a stream in YouTube Studio first.');
      return;
    }
    
    // Update cache
    youtubeStreamKeysCache = data.streamKeys;
    youtubeStreamKeysCacheTime = Date.now();
    
    console.log('[loadEditYouTubeStreamKeys] Loaded stream keys:', data.streamKeys.length);
    displayEditYouTubeStreamKeys(data.streamKeys);
    
    if (typeof showToast === 'function') {
      showToast('success', `Loaded ${data.streamKeys.length} stream key(s)`);
    }
  } catch (error) {
    console.error('[loadEditYouTubeStreamKeys] Error:', error);
    showEditYouTubeStreamKeysError(error.message || 'Failed to load stream keys');
    
    if (typeof showToast === 'function') {
      showToast('error', 'Failed to load stream keys');
    }
  }
}

// Edit Modal - Display YouTube Stream Keys
function displayEditYouTubeStreamKeys(streamKeys) {
  const container = document.getElementById('editYoutubeStreamKeysList');
  if (!container) return;
  
  if (streamKeys.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-400">
        <i class="ti ti-alert-circle text-2xl mb-2"></i>
        <p class="text-sm">No stream keys found</p>
        <p class="text-xs text-gray-500 mt-1">Create a stream in YouTube Studio first</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = streamKeys.map(key => `
    <button type="button" onclick="selectEditYouTubeStreamKey('${key.id}')" 
      class="w-full flex items-center gap-2 p-2.5 bg-dark-800 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all text-left group">
      <i class="ti ti-brand-youtube text-red-500 text-lg flex-shrink-0"></i>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">${key.title || 'Untitled Stream'}</p>
        <p class="text-xs text-gray-400 mt-0.5 truncate">${key.ingestionInfo?.streamName || 'N/A'}</p>
      </div>
      <i class="ti ti-chevron-right text-gray-400 group-hover:text-primary transition-colors text-sm"></i>
    </button>
  `).join('');
}

// Edit Modal - Show error message for YouTube stream keys
function showEditYouTubeStreamKeysError(message) {
  const container = document.getElementById('editYoutubeStreamKeysList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-4 text-red-400">
      <i class="ti ti-alert-circle text-2xl mb-2"></i>
      <p class="text-sm">${message}</p>
      <button type="button" onclick="loadEditYouTubeStreamKeys()" 
        class="mt-2 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors">
        Try Again
      </button>
    </div>
  `;
}

// Edit Modal - Select YouTube Stream Key
function selectEditYouTubeStreamKey(streamKeyId) {
  console.log('[selectEditYouTubeStreamKey] Selecting stream key:', streamKeyId);
  
  if (!youtubeStreamKeysCache) {
    console.error('[selectEditYouTubeStreamKey] No cached stream keys');
    return;
  }
  
  const streamKey = youtubeStreamKeysCache.find(key => key.id === streamKeyId);
  if (!streamKey) {
    console.error('[selectEditYouTubeStreamKey] Stream key not found:', streamKeyId);
    return;
  }
  
  // Fill in the form fields
  const rtmpUrlInput = document.getElementById('editYoutubeRtmpUrl');
  const streamKeyInput = document.getElementById('editYoutubeStreamKey');
  const streamIdInput = document.getElementById('editYoutubeStreamId');
  const titleInput = document.getElementById('editStreamTitle');
  const descriptionInput = document.getElementById('editYoutubeDescription');
  
  if (rtmpUrlInput && streamKey.ingestionInfo?.ingestionAddress) {
    rtmpUrlInput.value = streamKey.ingestionInfo.ingestionAddress;
  }
  
  if (streamKeyInput && streamKey.ingestionInfo?.streamName) {
    streamKeyInput.value = streamKey.ingestionInfo.streamName;
  }
  
  if (streamIdInput) {
    streamIdInput.value = streamKeyId;
  }
  
  if (titleInput && streamKey.title) {
    titleInput.value = streamKey.title;
  }
  
  if (descriptionInput && streamKey.description) {
    descriptionInput.value = streamKey.description;
  }
  
  // Close dropdown
  const dropdown = document.getElementById('editYoutubeStreamKeysDropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  if (typeof showToast === 'function') {
    showToast('success', 'YouTube stream key loaded successfully');
  }
}

// ============================================================================
// EDIT MODAL FUNCTIONS (Mirror of New Stream Modal functions)
// ============================================================================

// Edit Modal - Toggle YouTube Stream Key Visibility (already exists, just expose)
// (Function already defined above at line 1840)

// Edit Modal - Toggle YouTube Stream Keys Dropdown
function toggleEditYouTubeStreamKeysDropdown() {
  const dropdown = document.getElementById('editYoutubeStreamKeysDropdown');
  if (!dropdown) return;
  
  dropdown.classList.toggle('hidden');
  
  // Load stream keys when opening dropdown
  if (!dropdown.classList.contains('hidden')) {
    loadEditYouTubeStreamKeys();
  }
}

// Edit Modal - Load YouTube Stream Keys
async function loadEditYouTubeStreamKeys(forceRefresh = false) {
  try {
    // Check cache first (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && youtubeStreamKeysCache && youtubeStreamKeysCacheTime) {
      const cacheAge = now - youtubeStreamKeysCacheTime;
      if (cacheAge < STREAM_KEYS_CACHE_DURATION) {
        console.log('[loadEditYouTubeStreamKeys] Using cached stream keys (age:', Math.round(cacheAge / 1000), 'seconds)');
        youtubeStreamKeys = youtubeStreamKeysCache;
        displayEditYouTubeStreamKeys(youtubeStreamKeysCache);
        return;
      }
    }
    
    const container = document.getElementById('editYoutubeStreamKeysList');
    const countSpan = document.getElementById('editStreamKeysCount');
    const cacheInfo = document.getElementById('editStreamKeysCacheInfo');
    
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4 text-gray-400"><i class="ti ti-loader animate-spin text-xl mb-2"></i><p class="text-xs">Loading stream keys...</p></div>';
    
    const response = await fetch('/oauth2/youtube/stream-keys');
    const data = await response.json();
    
    if (data.success && data.streamKeys) {
      youtubeStreamKeys = data.streamKeys;
      youtubeStreamKeysCache = data.streamKeys;
      youtubeStreamKeysCacheTime = now;
      
      displayEditYouTubeStreamKeys(data.streamKeys);
      
      if (countSpan) {
        countSpan.textContent = `(${data.streamKeys.length})`;
      }
      
      if (cacheInfo) {
        cacheInfo.textContent = 'Just loaded';
      }
    } else {
      showEditYouTubeStreamKeysError(data.error || 'Failed to load stream keys');
    }
  } catch (error) {
    console.error('[loadEditYouTubeStreamKeys] Error:', error);
    showEditYouTubeStreamKeysError('Network error. Please try again.');
  }
}

// Edit Modal - Display YouTube Stream Keys
function displayEditYouTubeStreamKeys(streamKeys) {
  const container = document.getElementById('editYoutubeStreamKeysList');
  if (!container) return;
  
  if (!streamKeys || streamKeys.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-400">
        <i class="ti ti-inbox text-2xl mb-2"></i>
        <p class="text-xs">No stream keys found</p>
        <p class="text-xs text-gray-500 mt-1">Create a stream in YouTube Studio first</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  streamKeys.forEach(key => {
    const keyItem = document.createElement('div');
    keyItem.className = 'p-2 hover:bg-dark-600 rounded cursor-pointer transition-colors';
    keyItem.onclick = () => selectEditYouTubeStreamKey(key.id);
    
    keyItem.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-white truncate">${key.title || 'Untitled Stream'}</div>
          <div class="text-xs text-gray-400 mt-1">
            <span class="inline-flex items-center gap-1">
              <i class="ti ti-calendar text-xs"></i>
              ${key.scheduledStartTime ? new Date(key.scheduledStartTime).toLocaleString() : 'Not scheduled'}
            </span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <button onclick="event.stopPropagation(); copyEditStreamKeyToClipboard('${key.id}', 'rtmp')" 
              class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              title="Copy RTMP URL">
              <i class="ti ti-link text-xs"></i>
              RTMP
            </button>
            <button onclick="event.stopPropagation(); copyEditStreamKeyToClipboard('${key.id}', 'key')" 
              class="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
              title="Copy Stream Key">
              <i class="ti ti-key text-xs"></i>
              Key
            </button>
            <button onclick="event.stopPropagation(); copyEditStreamKeyToClipboard('${key.id}', 'all')" 
              class="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
              title="Copy Both">
              <i class="ti ti-copy text-xs"></i>
              Both
            </button>
          </div>
        </div>
        <div class="flex-shrink-0">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs ${
            key.status === 'active' ? 'bg-green-500/20 text-green-400' :
            key.status === 'ready' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }">
            ${key.status || 'unknown'}
          </span>
        </div>
      </div>
    `;
    
    container.appendChild(keyItem);
  });
}

// Edit Modal - Show Error
function showEditYouTubeStreamKeysError(message) {
  const container = document.getElementById('editYoutubeStreamKeysList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-4 text-red-400">
      <i class="ti ti-alert-circle text-2xl mb-2"></i>
      <p class="text-xs">${message}</p>
    </div>
  `;
}

// Edit Modal - Copy Stream Key to Clipboard
function copyEditStreamKeyToClipboard(keyId, type) {
  const selectedKey = youtubeStreamKeys.find(k => k.id === keyId);
  if (!selectedKey) return;
  
  let textToCopy = '';
  let successMessage = '';
  
  switch(type) {
    case 'rtmp':
      textToCopy = selectedKey.rtmpUrl;
      successMessage = 'RTMP URL copied!';
      break;
    case 'key':
      textToCopy = selectedKey.streamKey;
      successMessage = 'Stream key copied!';
      break;
    case 'all':
      textToCopy = `RTMP URL: ${selectedKey.rtmpUrl}\nStream Key: ${selectedKey.streamKey}`;
      successMessage = 'RTMP URL and Stream Key copied!';
      break;
  }
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    if (typeof showToast === 'function') {
      showToast('success', successMessage);
    } else {
      console.log(successMessage);
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
    if (typeof showToast === 'function') {
      showToast('error', 'Failed to copy to clipboard');
    }
  });
}

// Edit Modal - Select YouTube Stream Key
function selectEditYouTubeStreamKey(keyId) {
  const selectedKey = youtubeStreamKeys.find(k => k.id === keyId);
  if (!selectedKey) return;
  
  // Fill in the form fields - USE EDIT FORM IDs (with 'edit' prefix)
  const rtmpUrlInput = document.getElementById('editYoutubeRtmpUrl');
  const streamKeyInput = document.getElementById('editYoutubeStreamKey');
  const streamIdInput = document.getElementById('editYoutubeStreamId'); // ⭐ FIX: Use correct edit form ID
  
  console.log('[selectEditYouTubeStreamKey] Setting form fields:');
  console.log('  - RTMP URL input found:', !!rtmpUrlInput);
  console.log('  - Stream Key input found:', !!streamKeyInput);
  console.log('  - Stream ID input found:', !!streamIdInput);
  console.log('  - Selected stream ID:', selectedKey.id);
  
  if (rtmpUrlInput) rtmpUrlInput.value = selectedKey.rtmpUrl;
  if (streamKeyInput) streamKeyInput.value = selectedKey.streamKey;
  if (streamIdInput) {
    streamIdInput.value = selectedKey.id;
    console.log('[selectEditYouTubeStreamKey] ✓ Set editYoutubeStreamId to:', streamIdInput.value);
  } else {
    console.error('[selectEditYouTubeStreamKey] ❌ editYoutubeStreamId field not found!');
  }
  
  // Close dropdown
  const dropdown = document.getElementById('editYoutubeStreamKeysDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  
  // Show success message
  if (typeof showToast === 'function') {
    showToast('success', `Stream key loaded: ${selectedKey.title || 'Untitled'}`);
  }
  
  console.log('[selectEditYouTubeStreamKey] Selected stream:', selectedKey.title, selectedKey.id);
}

// Edit Modal - Refresh Stream Keys
function refreshEditYouTubeStreamKeys() {
  console.log('[refreshEditYouTubeStreamKeys] Force refreshing stream keys...');
  loadEditYouTubeStreamKeys(true); // Force refresh
}

// Edit Modal - Tags System
let editTags = [];

function handleEditTagInput(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addEditTag();
  }
}

function addEditTag() {
  const input = document.getElementById('editTagInput');
  if (!input) return;
  
  const tag = input.value.trim();
  if (!tag) return;
  
  // Check if tag already exists
  if (editTags.includes(tag)) {
    if (typeof showToast === 'function') {
      showToast('warning', 'Tag already added');
    }
    return;
  }
  
  // Check tag limit
  if (editTags.length >= 20) {
    if (typeof showToast === 'function') {
      showToast('warning', 'Maximum 20 tags allowed');
    }
    return;
  }
  
  // Check total character limit
  const totalChars = editTags.join(',').length + tag.length + (editTags.length > 0 ? 1 : 0);
  if (totalChars > 500) {
    if (typeof showToast === 'function') {
      showToast('warning', 'Total tags length cannot exceed 500 characters');
    }
    return;
  }
  
  editTags.push(tag);
  input.value = '';
  updateEditTagsDisplay();
}

function removeEditTag(tag) {
  editTags = editTags.filter(t => t !== tag);
  updateEditTagsDisplay();
}

function updateEditTagsDisplay() {
  const container = document.getElementById('editTagsContainer');
  const countSpan = document.getElementById('editTagCount');
  const lengthSpan = document.getElementById('editTagLength');
  const hiddenInput = document.getElementById('editYoutubeTags'); // ✅ FIXED: Use edit modal hidden input
  
  if (!container) return;
  
  if (editTags.length === 0) {
    container.innerHTML = '<span class="text-gray-500 text-sm">No tags added yet. Click "Generate with AI" or add manually.</span>';
  } else {
    container.innerHTML = '';
    editTags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded text-sm';
      tagElement.innerHTML = `
        ${tag}
        <button type="button" onclick="removeEditTag('${tag.replace(/'/g, "\\'")}')" class="hover:text-emerald-400 transition-colors">
          <i class="ti ti-x text-xs"></i>
        </button>
      `;
      container.appendChild(tagElement);
    });
  }
  
  // Update stats
  if (countSpan) {
    const isOverLimit = editTags.length > 20;
    countSpan.textContent = `${editTags.length} / 20 tags`;
    countSpan.className = isOverLimit ? 'text-orange-400' : 'text-gray-400';
  }
  
  const totalLength = editTags.join(',').length;
  if (lengthSpan) {
    lengthSpan.textContent = `${totalLength} / 500 characters`;
    lengthSpan.className = totalLength > 500 ? 'text-orange-400' : 'text-gray-400';
  }
  
  // Update hidden input
  if (hiddenInput) {
    hiddenInput.value = JSON.stringify(editTags);
  }
}

// Edit Modal - AI Generate Description
async function generateEditDescriptionWithGemini() {
  console.log('[Edit Modal] generateEditDescriptionWithGemini called');
  
  const titleInput = document.getElementById('editStreamTitle');
  const descriptionTextarea = document.getElementById('editYoutubeDescription');
  
  if (!titleInput || !descriptionTextarea) {
    console.error('[Edit Modal] Elements not found:', {
      titleInput: !!titleInput,
      descriptionTextarea: !!descriptionTextarea
    });
    return;
  }
  
  const title = titleInput.value.trim();
  if (!title || title.length < 5) {
    if (typeof showNotification === 'function') {
      showNotification('Info', 'Please enter a stream title first', 'info');
    }
    titleInput.focus();
    return;
  }
  
  console.log('[Edit Modal] Generating description for:', title);
  
  // Show loading state
  const originalValue = descriptionTextarea.value;
  descriptionTextarea.value = 'Generating description with AI...';
  descriptionTextarea.disabled = true;
  
  try {
    const response = await fetch('/api/gemini/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title,
        keywords: '' // Optional: could add keywords field later
      })
    });
    
    const data = await response.json();
    
    console.log('[Edit Modal] Response:', data);
    
    if (data.success && data.description) {
      descriptionTextarea.value = data.description;
      
      console.log('[Edit Modal] ✅ Description set successfully');
      console.log('[Edit Modal] Length:', data.description.length, 'characters');
      
      if (typeof showNotification === 'function') {
        showNotification('Success', 'Description generated successfully!', 'success');
      }
    } else {
      throw new Error(data.error || 'Failed to generate description');
    }
  } catch (error) {
    console.error('[Edit Modal] Error generating description:', error);
    descriptionTextarea.value = originalValue; // Restore original value on error
    
    if (typeof showNotification === 'function') {
      if (error.message.includes('API key')) {
        showNotification('Error', 'Gemini API key not configured. Please add it in Settings.', 'error');
      } else {
        showNotification('Error', error.message || 'Failed to generate description', 'error');
      }
    }
  } finally {
    descriptionTextarea.disabled = false;
  }
}

// Edit Modal - AI Generate Tags
async function generateEditTagsWithGemini() {
  const titleInput = document.getElementById('editStreamTitle');
  const descriptionTextarea = document.getElementById('youtubeDescription');
  
  if (!titleInput) return;
  
  const title = titleInput.value.trim();
  const description = descriptionTextarea ? descriptionTextarea.value.trim() : '';
  
  if (!title) {
    if (typeof showToast === 'function') {
      showToast('warning', 'Please enter a stream title first');
    }
    return;
  }
  
  console.log('[generateEditTagsWithGemini] Generating tags for:', { title, description: description.substring(0, 50) });
  
  // Show loading state
  const container = document.getElementById('editTagsContainer');
  if (container) {
    container.innerHTML = '<span class="text-gray-400 text-sm"><i class="ti ti-loader animate-spin mr-1"></i>Generating tags with AI...</span>';
  }
  
  try {
    const response = await fetch('/api/gemini/generate-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    
    const data = await response.json();
    
    console.log('[generateEditTagsWithGemini] Response:', data);
    
    if (data.success && data.tags && Array.isArray(data.tags)) {
      editTags = data.tags.slice(0, 20); // Limit to 20 tags
      updateEditTagsDisplay();
      if (typeof showToast === 'function') {
        showToast('success', `Generated ${editTags.length} tags!`);
      }
    } else {
      throw new Error(data.error || 'Failed to generate tags');
    }
  } catch (error) {
    console.error('[generateEditTagsWithGemini] Error:', error);
    if (typeof showToast === 'function') {
      showToast('error', 'Failed to generate tags: ' + error.message);
    }
    updateEditTagsDisplay(); // Reset to previous state
  }
}

// Expose Edit Modal functions globally
window.toggleEditYouTubeStreamKeysDropdown = toggleEditYouTubeStreamKeysDropdown;
window.loadEditYouTubeStreamKeys = loadEditYouTubeStreamKeys;
window.refreshEditYouTubeStreamKeys = refreshEditYouTubeStreamKeys;
window.selectEditYouTubeStreamKey = selectEditYouTubeStreamKey;
window.copyEditStreamKeyToClipboard = copyEditStreamKeyToClipboard;
window.handleEditTagInput = handleEditTagInput;
window.addEditTag = addEditTag;
window.removeEditTag = removeEditTag;
window.generateEditDescriptionWithGemini = generateEditDescriptionWithGemini;
window.generateEditTagsWithGemini = generateEditTagsWithGemini;

console.log('[stream-modal.js] Edit modal functions loaded and exposed globally');

// ============================================================================
// EDIT MODAL - POPULATE YOUTUBE API FIELDS
// ============================================================================

/**
 * Populate Edit Modal YouTube API fields with existing stream data
 * This function should be called AFTER modal is opened and tab is switched
 * @param {Object} stream - Stream object from database
 */
function populateEditYouTubeAPIFields(stream) {
  console.log('[populateEditYouTubeAPIFields] Populating fields with:', stream);
  
  try {
    // Helper function to safely set element value
    const safeSetValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = value || '';
        return true;
      }
      console.warn(`[populateEditYouTubeAPIFields] Element not found: ${id}`);
      return false;
    };
    
    // Helper function to safely set element value ONLY if empty (don't overwrite user input)
    const safeSetValueIfEmpty = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        // Only set if field is empty (don't overwrite AI-generated content)
        if (!el.value || el.value.trim() === '') {
          el.value = value || '';
        }
        return true;
      }
      console.warn(`[populateEditYouTubeAPIFields] Element not found: ${id}`);
      return false;
    };
    
    const safeSetChecked = (id, checked) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = !!checked;
        return true;
      }
      console.warn(`[populateEditYouTubeAPIFields] Element not found: ${id}`);
      return false;
    };
    
    // Populate basic fields with EDIT prefix
    // Use safeSetValueIfEmpty for description to not overwrite AI-generated content
    safeSetValueIfEmpty('editYoutubeDescription', stream.youtube_description);
    safeSetValue('editYoutubeRtmpUrl', stream.rtmp_url);
    safeSetValue('editYoutubeStreamKey', stream.stream_key);
    // ⚠️ REMOVED: editYoutubeStreamId (no longer used)
    
    // Populate Additional Settings with EDIT prefix
    safeSetValue('editYoutubePrivacy', stream.youtube_privacy || 'unlisted');
    
    // Parse and populate tags
    if (stream.youtube_tags) {
      try {
        let parsedTags = [];
        if (typeof stream.youtube_tags === 'string') {
          // Try to parse as JSON first
          try {
            parsedTags = JSON.parse(stream.youtube_tags);
          } catch (e) {
            // If not JSON, split by comma
            parsedTags = stream.youtube_tags.split(',').map(t => t.trim()).filter(t => t);
          }
        } else if (Array.isArray(stream.youtube_tags)) {
          parsedTags = stream.youtube_tags;
        }
        
        // Set editTags array and update display
        editTags = parsedTags.slice(0, 30); // Limit to 30 tags
        updateEditTagsDisplay();
        console.log(`[populateEditYouTubeAPIFields] Populated ${editTags.length} tags`);
      } catch (error) {
        console.error('[populateEditYouTubeAPIFields] Error parsing tags:', error);
        editTags = [];
        updateEditTagsDisplay();
      }
    } else {
      editTags = [];
      updateEditTagsDisplay();
    }
    
    // Made for Kids radio buttons with EDIT prefix
    const madeForKidsYes = document.querySelector('input[name="editYoutubeMadeForKids"][value="yes"]');
    const madeForKidsNo = document.querySelector('input[name="editYoutubeMadeForKids"][value="no"]');
    if (stream.youtube_made_for_kids === 1 || stream.youtube_made_for_kids === true) {
      if (madeForKidsYes) madeForKidsYes.checked = true;
    } else {
      if (madeForKidsNo) madeForKidsNo.checked = true;
    }
    
    // Checkboxes with EDIT prefix
    safeSetChecked('editYoutubeAgeRestricted', stream.youtube_age_restricted === 1 || stream.youtube_age_restricted === true);
    safeSetChecked('editYoutubeSyntheticContent', stream.youtube_synthetic_content === 1 || stream.youtube_synthetic_content === true);
    safeSetChecked('editYoutubeAutoStart', stream.youtube_auto_start === 1 || stream.youtube_auto_start === true);
    safeSetChecked('editYoutubeAutoEnd', stream.youtube_auto_end === 1 || stream.youtube_auto_end === true);
    
    // Load existing thumbnail if exists
    if (stream.youtube_thumbnail_path) {
      const thumbnailPreview = document.getElementById('editYoutubeThumbnailPreview');
      const thumbnailImg = document.getElementById('editYoutubeThumbnailImg');
      const thumbnailInfo = document.getElementById('editYoutubeThumbnailInfo');
      
      if (thumbnailPreview && thumbnailImg) {
        thumbnailImg.src = stream.youtube_thumbnail_path;
        thumbnailPreview.classList.remove('hidden');
        if (thumbnailInfo) {
          thumbnailInfo.innerHTML = '<span class="text-green-400">Current thumbnail loaded</span>';
        }
        console.log('[populateEditYouTubeAPIFields] Loaded existing thumbnail');
      }
    }
    
    console.log('[populateEditYouTubeAPIFields] ✅ All fields populated successfully');
  } catch (error) {
    console.error('[populateEditYouTubeAPIFields] Error:', error);
  }
}

// Expose function globally
window.populateEditYouTubeAPIFields = populateEditYouTubeAPIFields;

console.log('[stream-modal.js] Edit modal populate function loaded');

// ============================================================================
// EDIT MODAL - THUMBNAIL & ADDITIONAL SETTINGS
// ============================================================================

/**
 * Preview Edit Modal YouTube Thumbnail
 */
function previewEditYoutubeThumbnail(input) {
  const preview = document.getElementById('editYoutubeThumbnailPreview');
  const img = document.getElementById('editYoutubeThumbnailImg');
  const info = document.getElementById('editYoutubeThumbnailInfo');
  
  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      if (info) info.innerHTML = '<span class="text-red-400">Please select an image file</span>';
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      if (info) info.innerHTML = '<span class="text-red-400">Image must be less than 2MB</span>';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      if (img) img.src = e.target.result;
      if (preview) preview.classList.remove('hidden');
      if (info) info.innerHTML = `<span class="text-green-400">${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>`;
    };
    reader.readAsDataURL(file);
  }
}

/**
 * Clear Edit Modal YouTube Thumbnail
 */
function clearEditYoutubeThumbnail() {
  const input = document.getElementById('editYoutubeThumbnail');
  const preview = document.getElementById('editYoutubeThumbnailPreview');
  const img = document.getElementById('editYoutubeThumbnailImg');
  const info = document.getElementById('editYoutubeThumbnailInfo');
  
  if (input) input.value = '';
  if (img) img.src = '';
  if (preview) preview.classList.add('hidden');
  if (info) info.innerHTML = '';
}

/**
 * Toggle Edit Modal YouTube Additional Settings
 */
function toggleEditYouTubeAdditionalSettings() {
  const content = document.getElementById('editYoutubeAdditionalSettings');
  const icon = document.getElementById('editYoutubeAdditionalSettingsIcon');
  
  if (content && icon) {
    const isHidden = content.classList.contains('hidden');
    
    if (isHidden) {
      content.classList.remove('hidden');
      icon.classList.add('rotate-180');
    } else {
      content.classList.add('hidden');
      icon.classList.remove('rotate-180');
    }
  }
}

// Expose functions globally
window.previewEditYoutubeThumbnail = previewEditYoutubeThumbnail;
window.clearEditYoutubeThumbnail = clearEditYoutubeThumbnail;
window.toggleEditYouTubeAdditionalSettings = toggleEditYouTubeAdditionalSettings;

console.log('[stream-modal.js] Edit modal thumbnail and settings functions loaded');
