// Dashboard Stats and Quota Management

// Load User Quota
function loadQuota() {
  fetch('/api/users/quota')
    .then(response => response.json())
    .then(data => {
      if (data.success && data.quota) {
        const streams = data.quota.streams;
        const storage = data.quota.storage;
        
        // Streams - Desktop & Mobile
        document.getElementById('quota-stream-used').textContent = streams.used;
        document.getElementById('quota-stream-limit').textContent = streams.limit;
        document.getElementById('quota-stream-used-mobile').textContent = streams.used;
        document.getElementById('quota-stream-limit-mobile').textContent = streams.limit;

        // Storage - Desktop & Mobile
        document.getElementById('quota-storage-used').textContent = storage.used.toFixed(1);
        document.getElementById('quota-storage-limit').textContent = storage.limit;
        document.getElementById('quota-storage-used-mobile').textContent = storage.used.toFixed(1);
        document.getElementById('quota-storage-limit-mobile').textContent = storage.limit;
      }
    })
    .catch(error => {
      console.error('Error loading quota:', error);
    });
}

function refreshQuota() {
  loadQuota();
}

// Load quota on page load
document.addEventListener('DOMContentLoaded', function() {
  loadQuota();
  // Refresh quota every 30 seconds
  setInterval(loadQuota, 30000);
});

// Custom Notification System
function showNotification(title, message, type = 'success') {
  const modal = document.getElementById('notificationModal');
  const content = document.getElementById('notificationContent');
  const icon = document.getElementById('notificationIcon');
  const titleEl = document.getElementById('notificationTitle');
  const messageEl = document.getElementById('notificationMessage');

  // Set content
  titleEl.textContent = title;
  messageEl.textContent = message;

  // Set icon and colors based on type
  if (type === 'success') {
    icon.className = 'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-green-500/20 border-2 border-green-500';
    icon.innerHTML = '<i class="ti ti-check text-2xl text-green-400"></i>';
  } else if (type === 'error') {
    icon.className = 'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-red-500/20 border-2 border-red-500';
    icon.innerHTML = '<i class="ti ti-x text-2xl text-red-400"></i>';
  } else if (type === 'warning') {
    icon.className = 'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-yellow-500/20 border-2 border-yellow-500';
    icon.innerHTML = '<i class="ti ti-alert-triangle text-2xl text-yellow-400"></i>';
  } else if (type === 'info') {
    icon.className = 'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/20 border-2 border-blue-500';
    icon.innerHTML = '<i class="ti ti-info-circle text-2xl text-blue-400"></i>';
  }

  // Show modal with animation
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    content.classList.remove('scale-95', 'opacity-0');
    content.classList.add('scale-100', 'opacity-100');
  });
}

function closeNotification() {
  const modal = document.getElementById('notificationModal');
  const content = document.getElementById('notificationContent');

  content.classList.remove('scale-100', 'opacity-100');
  content.classList.add('scale-95', 'opacity-0');

  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

function openTipsStreaming() {
  const tipsModal = document.getElementById('tipsStreamingModal');
  const newModal = document.getElementById('newStreamModal');
  const editModal = document.getElementById('editStreamModal');
  window._tipsPrevModal = null;
  if (newModal && !newModal.classList.contains('hidden')) {
    window._tipsPrevModal = 'new';
    newModal.classList.remove('active');
    newModal.classList.add('hidden');
  } else if (editModal && !editModal.classList.contains('hidden')) {
    window._tipsPrevModal = 'edit';
    editModal.classList.remove('active');
    editModal.classList.add('hidden');
  }
  if (tipsModal) {
    document.body.style.overflow = 'hidden';
    tipsModal.classList.remove('hidden');
    requestAnimationFrame(() => tipsModal.classList.add('active'));
  }
}

function closeTipsStreaming() {
  const tipsModal = document.getElementById('tipsStreamingModal');
  if (tipsModal) {
    tipsModal.classList.remove('active');
    setTimeout(() => tipsModal.classList.add('hidden'), 200);
  }
  document.body.style.overflow = 'auto';
  window._tipsPrevModal = null;
}

function backFromTipsStreaming() {
  const tipsModal = document.getElementById('tipsStreamingModal');
  const newModal = document.getElementById('newStreamModal');
  const editModal = document.getElementById('editStreamModal');
  if (tipsModal) {
    tipsModal.classList.remove('active');
    tipsModal.classList.add('hidden');
  }
  if (window._tipsPrevModal === 'new' && newModal) {
    newModal.classList.remove('hidden');
    requestAnimationFrame(() => newModal.classList.add('active'));
    document.body.style.overflow = 'hidden';
  } else if (window._tipsPrevModal === 'edit' && editModal) {
    editModal.classList.remove('hidden');
    requestAnimationFrame(() => editModal.classList.add('active'));
    document.body.style.overflow = 'hidden';
  }
  window._tipsPrevModal = null;
}
