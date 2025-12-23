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
const STREAM_KEYS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

function switchStreamTab(tab) {
  console.log('[switchStreamTab] Switching to tab:', tab);
  currentStreamTab = tab;
  window.currentStreamTab = tab; // Update global reference
  
  const tabManual = document.getElementById('tabManual');
  const tabYouTube = document.getElementById('tabYouTube');
  const youtubeApiFields = document.getElementById('youtubeApiFields');
  const manualRtmpFields = document.getElementById('manualRtmpFields');
  
  if (tab === 'manual') {
    // Activate Manual tab
    tabManual.classList.add('bg-primary', 'text-white');
    tabManual.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-dark-700');
    
    // Deactivate YouTube tab
    tabYouTube.classList.remove('bg-primary', 'text-white');
    tabYouTube.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-dark-700');
    
    // Show/Hide fields
    if (youtubeApiFields) youtubeApiFields.classList.add('hidden');
    if (manualRtmpFields) manualRtmpFields.classList.remove('hidden');
    
    // Make RTMP fields required
    const rtmpUrl = document.getElementById('rtmpUrl');
    const streamKey = document.getElementById('streamKey');
    if (rtmpUrl) rtmpUrl.required = true;
    if (streamKey) streamKey.required = true;
    
  } else if (tab === 'youtube') {
    // Activate YouTube tab
    tabYouTube.classList.add('bg-primary', 'text-white');
    tabYouTube.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-dark-700');
    
    // Deactivate Manual tab
    tabManual.classList.remove('bg-primary', 'text-white');
    tabManual.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-dark-700');
    
    // Show/Hide fields
    if (youtubeApiFields) youtubeApiFields.classList.remove('hidden');
    if (manualRtmpFields) manualRtmpFields.classList.add('hidden');
    
    // Make RTMP fields not required
    const rtmpUrl = document.getElementById('rtmpUrl');
    const streamKey = document.getElementById('streamKey');
    if (rtmpUrl) rtmpUrl.required = false;
    if (streamKey) streamKey.required = false;
    
    // Don't auto-load stream keys - user will click Load button
    // loadYouTubeStreamKeys();
  }
}

// Make sure switchStreamTab is available globally
window.switchStreamTab = switchStreamTab;
console.log('[stream-modal.js] switchStreamTab function defined and exposed globally:', typeof window.switchStreamTab);

// Load YouTube stream keys from OAuth (with caching)
async function loadYouTubeStreamKeys(forceRefresh = false) {
  try {
    // Check cache first (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && youtubeStreamKeysCache && youtubeStreamKeysCacheTime) {
      const cacheAge = now - youtubeStreamKeysCacheTime;
      if (cacheAge < STREAM_KEYS_CACHE_DURATION) {
        console.log('[loadYouTubeStreamKeys] Using cached stream keys (age:', Math.round(cacheAge / 1000), 'seconds)');
        youtubeStreamKeys = youtubeStreamKeysCache;
        displayYouTubeStreamKeys(youtubeStreamKeysCache);
        
        // Show cache info
        if (typeof showToast === 'function') {
          const minutes = Math.floor(cacheAge / 60000);
          showToast('info', `Using cached data (${minutes}m old). Click refresh to update.`);
        }
        return;
      } else {
        console.log('[loadYouTubeStreamKeys] Cache expired (age:', Math.round(cacheAge / 1000), 'seconds), fetching fresh data...');
      }
    }
    
    // Show loading state
    const container = document.getElementById('youtubeStreamKeysList');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-4 text-gray-400">
          <i class="ti ti-loader animate-spin text-xl mb-2"></i>
          <p class="text-xs">Loading stream keys from YouTube...</p>
        </div>
      `;
    }
    
    console.log('[loadYouTubeStreamKeys] Fetching stream keys from YouTube API...');
    const response = await fetch('/oauth2/youtube/stream-keys');
    console.log('[loadYouTubeStreamKeys] Response status:', response.status);
    const data = await response.json();
    console.log('[loadYouTubeStreamKeys] Data received:', data);
    
    if (data.success && data.streamKeys) {
      // Update cache
      youtubeStreamKeys = data.streamKeys;
      youtubeStreamKeysCache = data.streamKeys;
      youtubeStreamKeysCacheTime = now;
      console.log('[loadYouTubeStreamKeys] Stream keys cached for', STREAM_KEYS_CACHE_DURATION / 1000, 'seconds');
      
      displayYouTubeStreamKeys(data.streamKeys);
      
      // Show success message
      if (typeof showToast === 'function') {
        showToast('success', `Loaded ${data.streamKeys.length} stream key(s) from YouTube`);
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
