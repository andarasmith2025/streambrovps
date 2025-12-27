// Dashboard Stats and Quota Management

// Load User Quota
function loadQuota() {
  fetch('/api/users/quota')
    .then(response => response.json())
    .then(data => {
      if (data.success && data.quota) {
        const streams = data.quota.streams;
        const storage = data.quota.storage;
        
        // Compact Indicators
        const quotaStreamsEl = document.getElementById('quota-streams');
        const quotaStorageEl = document.getElementById('quota-storage');
        
        if (quotaStreamsEl) {
          quotaStreamsEl.textContent = `${streams.used} / ${streams.limit}`;
        }
        
        if (quotaStorageEl) {
          quotaStorageEl.textContent = `${storage.used.toFixed(1)} / ${storage.limit} GB`;
        }
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

// Custom Confirm Dialog (styled, returns Promise)
function showCustomConfirm(title, message, confirmText = 'OK', cancelText = 'Cancel') {
  return new Promise((resolve) => {
    // Create modal HTML if not exists
    let modal = document.getElementById('customConfirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'customConfirmModal';
      modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] hidden';
      modal.innerHTML = `
        <div id="customConfirmContent" class="bg-dark-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full mx-4 transform transition-all duration-200 scale-95 opacity-0">
          <div class="p-6">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/20 border-2 border-blue-500">
                <i class="ti ti-help text-2xl text-blue-400"></i>
              </div>
              <div class="flex-1 min-w-0">
                <h3 id="customConfirmTitle" class="text-lg font-semibold text-white mb-2"></h3>
                <div id="customConfirmMessage" class="text-gray-300 text-sm leading-relaxed"></div>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 px-6 py-4 bg-dark-700/50 rounded-b-xl border-t border-gray-700">
            <button id="customConfirmCancel" class="px-4 py-2 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors">
              Cancel
            </button>
            <button id="customConfirmOk" class="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white font-medium transition-colors">
              OK
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    // Set content
    document.getElementById('customConfirmTitle').textContent = title;
    document.getElementById('customConfirmMessage').innerHTML = message;
    document.getElementById('customConfirmOk').textContent = confirmText;
    document.getElementById('customConfirmCancel').textContent = cancelText;
    
    // Show modal
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      document.getElementById('customConfirmContent').classList.remove('scale-95', 'opacity-0');
      document.getElementById('customConfirmContent').classList.add('scale-100', 'opacity-100');
    });
    
    // Handle buttons
    const handleOk = () => {
      closeCustomConfirm();
      resolve(true);
    };
    
    const handleCancel = () => {
      closeCustomConfirm();
      resolve(false);
    };
    
    const closeCustomConfirm = () => {
      const content = document.getElementById('customConfirmContent');
      content.classList.remove('scale-100', 'opacity-100');
      content.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 200);
    };
    
    // Remove old listeners
    const okBtn = document.getElementById('customConfirmOk');
    const cancelBtn = document.getElementById('customConfirmCancel');
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Add new listeners
    newOkBtn.addEventListener('click', handleOk);
    newCancelBtn.addEventListener('click', handleCancel);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
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
