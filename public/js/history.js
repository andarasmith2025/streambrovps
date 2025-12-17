// Pagination state
let currentPage = 1;
let pageSize = 50;
let totalRecords = 0;
let allHistory = [];
let filteredHistory = [];
let selectedIds = new Set();

// Load history on page load
document.addEventListener('DOMContentLoaded', function() {
  loadHistory();
  
  // Setup filters
  document.getElementById('history-search').addEventListener('input', filterHistory);
  document.getElementById('platform-filter').addEventListener('change', filterHistory);
});

async function loadHistory() {
  try {
    const response = await fetch('/api/history?limit=1000');
    const data = await response.json();
    
    if (data.success) {
      allHistory = data.history || [];
      filteredHistory = [...allHistory];
      totalRecords = filteredHistory.length;
      renderHistory();
    }
  } catch (error) {
    console.error('Error loading history:', error);
    showEmptyState('Failed to load history');
  }
}

function filterHistory() {
  const searchTerm = document.getElementById('history-search').value.toLowerCase();
  const platform = document.getElementById('platform-filter').value;
  
  filteredHistory = allHistory.filter(entry => {
    const matchesSearch = !searchTerm || entry.title.toLowerCase().includes(searchTerm);
    const matchesPlatform = platform === 'all' || entry.platform === platform;
    return matchesSearch && matchesPlatform;
  });
  
  totalRecords = filteredHistory.length;
  currentPage = 1;
  renderHistory();
}

function renderHistory() {
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalRecords);
  const pageData = filteredHistory.slice(start, end);
  
  // Update pagination info
  document.getElementById('showingStart').textContent = totalRecords > 0 ? start + 1 : 0;
  document.getElementById('showingEnd').textContent = end;
  document.getElementById('totalRecords').textContent = totalRecords;
  
  // Render desktop table
  renderDesktopTable(pageData);
  
  // Render mobile cards
  renderMobileCards(pageData);
  
  // Update pagination buttons
  updatePaginationButtons();
}

function renderDesktopTable(data) {
  const tbody = document.getElementById('history-table-body');
  
  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-10 text-center text-gray-400">
          <div class="flex flex-col items-center">
            <i class="ti ti-history text-3xl mb-2"></i>
            <p>No stream history found</p>
            <p class="text-xs mt-1">Your completed streams will appear here</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = data.map(entry => `
    <tr class="hover:bg-dark-700/50 transition-colors" data-id="${entry.id}">
      <td class="px-4 py-4">
        <input type="checkbox" class="history-checkbox w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0 bg-dark-700 cursor-pointer" 
          value="${entry.id}" onchange="updateSelection()">
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="w-10 h-6 bg-dark-700 rounded flex-shrink-0 overflow-hidden mr-3">
            ${entry.thumbnail_path 
              ? `<img src="${entry.thumbnail_path}" class="w-full h-full object-cover" onerror="this.src='/images/default-thumbnail.jpg'">` 
              : `<div class="w-full h-full bg-dark-600 flex items-center justify-center"><i class="ti ti-video text-gray-400 text-xs"></i></div>`
            }
          </div>
          <div class="text-sm font-medium">${entry.title}</div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <i class="ti ti-brand-${getPlatformIcon(entry.platform)} text-${getPlatformColor(entry.platform)} mr-1.5"></i>
          <span class="text-sm">${entry.platform || 'Custom'}</span>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
        ${formatDateTime(entry.start_time)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        ${formatDuration(entry.duration)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right">
        <button onclick="deleteHistoryEntry('${entry.id}', '${entry.title.replace(/'/g, "\\'")}')"
          class="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
          <i class="ti ti-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function renderMobileCards(data) {
  const container = document.getElementById('history-mobile-view');
  
  if (data.length === 0) {
    container.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-8 text-center">
        <i class="ti ti-history text-4xl text-gray-500 mb-3"></i>
        <p class="text-gray-400 font-medium">No stream history found</p>
        <p class="text-xs text-gray-500 mt-1">Your completed streams will appear here</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = data.map(entry => `
    <div class="bg-gray-800 rounded-lg p-4 shadow-md" data-id="${entry.id}">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center flex-1 min-w-0">
          <input type="checkbox" class="history-checkbox w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0 bg-dark-700 cursor-pointer mr-3" 
            value="${entry.id}" onchange="updateSelection()">
          <div class="w-12 h-8 bg-dark-700 rounded flex-shrink-0 overflow-hidden mr-3">
            ${entry.thumbnail_path 
              ? `<img src="${entry.thumbnail_path}" class="w-full h-full object-cover" onerror="this.src='/images/default-thumbnail.jpg'">` 
              : `<div class="w-full h-full bg-dark-600 flex items-center justify-center"><i class="ti ti-video text-gray-400 text-xs"></i></div>`
            }
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">${entry.title}</div>
            <div class="flex items-center text-xs text-gray-400 mt-1">
              <i class="ti ti-brand-${getPlatformIcon(entry.platform)} text-${getPlatformColor(entry.platform)} mr-1"></i>
              <span>${entry.platform || 'Custom'}</span>
            </div>
          </div>
        </div>
        <button onclick="deleteHistoryEntry('${entry.id}', '${entry.title.replace(/'/g, "\\'")}')"
          class="ml-2 p-2 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">
          <i class="ti ti-trash text-lg"></i>
        </button>
      </div>
      
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div class="text-gray-500 mb-1">Start Time</div>
          <div class="text-gray-300">${formatDateTime(entry.start_time)}</div>
        </div>
        <div>
          <div class="text-gray-500 mb-1">Duration</div>
          <div class="text-primary font-medium">${formatDuration(entry.duration)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function updatePaginationButtons() {
  const totalPages = Math.ceil(totalRecords / pageSize);
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageNumbers = document.getElementById('pageNumbers');
  
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  
  // Generate page numbers
  let pages = [];
  if (totalPages <= 7) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (currentPage <= 4) {
      pages = [1, 2, 3, 4, 5, '...', totalPages];
    } else if (currentPage >= totalPages - 3) {
      pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }
  
  pageNumbers.innerHTML = pages.map(page => {
    if (page === '...') {
      return '<span class="px-3 py-1 text-gray-400">...</span>';
    }
    return `<button onclick="goToPage(${page})" class="px-3 py-1 ${page === currentPage ? 'bg-primary text-white' : 'bg-dark-700 hover:bg-dark-600 text-gray-300'} rounded transition-colors">${page}</button>`;
  }).join('');
}

function changePage(direction) {
  const totalPages = Math.ceil(totalRecords / pageSize);
  
  if (direction === 'prev' && currentPage > 1) {
    currentPage--;
    renderHistory();
  } else if (direction === 'next' && currentPage < totalPages) {
    currentPage++;
    renderHistory();
  }
}

function goToPage(page) {
  currentPage = page;
  renderHistory();
}

function toggleSelectAll() {
  const selectAll = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('.history-checkbox');
  
  checkboxes.forEach(cb => {
    cb.checked = selectAll.checked;
    if (selectAll.checked) {
      selectedIds.add(cb.value);
    } else {
      selectedIds.delete(cb.value);
    }
  });
  
  updateSelectionUI();
}

function updateSelection() {
  const checkboxes = document.querySelectorAll('.history-checkbox');
  selectedIds.clear();
  
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selectedIds.add(cb.value);
    }
  });
  
  // Update select all checkbox
  const selectAll = document.getElementById('selectAll');
  const visibleCheckboxes = Array.from(checkboxes);
  selectAll.checked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
  selectAll.indeterminate = visibleCheckboxes.some(cb => cb.checked) && !selectAll.checked;
  
  updateSelectionUI();
}

function updateSelectionUI() {
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const selectedCount = document.getElementById('selectedCount');
  
  selectedCount.textContent = selectedIds.size;
  
  if (selectedIds.size > 0) {
    bulkDeleteBtn.classList.remove('hidden');
  } else {
    bulkDeleteBtn.classList.add('hidden');
  }
}

async function bulkDeleteHistory() {
  if (selectedIds.size === 0) return;
  
  if (!confirm(`Are you sure you want to delete ${selectedIds.size} history entries?`)) return;
  
  try {
    const response = await fetch('/api/history/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(`${selectedIds.size} history entries deleted successfully`);
      selectedIds.clear();
      updateSelectionUI();
      loadHistory();
    } else {
      showToast('Error: ' + (data.error || 'Failed to delete history entries'));
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('An error occurred while deleting history entries');
  }
}

async function deleteHistoryEntry(id, title) {
  if (!confirm(`Are you sure you want to delete the history entry for "${title}"?`)) return;
  
  try {
    const response = await fetch(`/api/history/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('History entry deleted successfully');
      selectedIds.delete(id);
      loadHistory();
    } else {
      showToast('Error: ' + (data.error || 'Failed to delete history entry'));
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('An error occurred while deleting history entry');
  }
}

function getPlatformIcon(platform) {
  const icons = {
    'YouTube': 'youtube',
    'Facebook': 'facebook',
    'Twitch': 'twitch',
    'TikTok': 'tiktok',
    'Instagram': 'instagram',
    'Shopee Live': 'shopping-bag',
    'Restream.io': 'live-photo'
  };
  return icons[platform] || 'broadcast';
}

function getPlatformColor(platform) {
  const colors = {
    'YouTube': 'red-500',
    'Facebook': 'blue-500',
    'Twitch': 'purple-500',
    'TikTok': 'gray-100',
    'Instagram': 'pink-500',
    'Shopee Live': 'orange-500',
    'Restream.io': 'teal-500'
  };
  return colors[platform] || 'gray-400';
}

function formatDateTime(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(seconds) {
  if (!seconds) return '--';
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-dark-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
  toast.innerHTML = `
    <div class="flex items-center">
      <i class="ti ti-check text-green-400 mr-2"></i>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('animate-fade-in');
    toast.classList.add('animate-fade-out');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}
