// Global variables
let allVideos = [];
let currentEditingId = null;

// Load broadcasts and videos on page load
document.addEventListener('DOMContentLoaded', function() {
  loadBroadcasts();
  loadVideos();
  
  // Setup form submissions
  document.getElementById('broadcastForm').addEventListener('submit', handleSaveBroadcast);
  document.getElementById('thumbnailForm').addEventListener('submit', handleUploadThumbnail);
  
  // Video search
  document.getElementById('videoSearch').addEventListener('input', filterVideos);
});

async function loadVideos() {
  try {
    const response = await fetch('/api/stream/content');
    const data = await response.json();
    allVideos = data;
    displayVideos(data);
  } catch (error) {
    console.error('Error loading videos:', error);
  }
}

function displayVideos(videos) {
  const videoList = document.getElementById('videoList');
  videoList.innerHTML = '';
  
  if (videos.length === 0) {
    videoList.innerHTML = '<div class="p-4 text-center text-gray-400 text-sm">No videos found</div>';
    return;
  }
  
  videos.forEach(video => {
    const item = document.createElement('div');
    item.className = 'p-3 hover:bg-dark-600 cursor-pointer transition-colors';
    item.onclick = () => selectVideo(video);
    
    item.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-16 h-10 bg-dark-800 rounded overflow-hidden flex-shrink-0">
          <img src="${video.thumbnail || '/images/default-thumbnail.jpg'}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">${video.name}</div>
          <div class="text-xs text-gray-400">${video.resolution} • ${video.duration}</div>
        </div>
      </div>
    `;
    
    videoList.appendChild(item);
  });
}

function filterVideos() {
  const search = document.getElementById('videoSearch').value.toLowerCase();
  const filtered = allVideos.filter(v => v.name.toLowerCase().includes(search));
  displayVideos(filtered);
}

function selectVideo(video) {
  document.getElementById('selectedVideoId').value = video.id;
  document.getElementById('selectedVideoText').textContent = video.name;
  document.getElementById('selectedVideoText').classList.remove('text-gray-400');
  document.getElementById('selectedVideoText').classList.add('text-white');
  toggleVideoSelector();
}

function toggleVideoSelector() {
  const dropdown = document.getElementById('videoDropdown');
  dropdown.classList.toggle('hidden');
}

async function loadBroadcasts() {
  const tableBody = document.getElementById('broadcastsTableBody');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  
  try {
    // Load from YouTube API
    const ytResponse = await fetch('/youtube/api/broadcasts');
    const ytData = await ytResponse.json();
    
    // Load from local database
    const localResponse = await fetch('/api/youtube-broadcasts');
    const localData = await localResponse.json();
    
    loadingState.classList.add('hidden');
    
    if (!ytData.items || ytData.items.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }
    
    // Merge YouTube data with local data
    const localMap = {};
    if (localData.success && localData.broadcasts) {
      localData.broadcasts.forEach(lb => {
        localMap[lb.broadcast_id] = {
          videoId: lb.video_id,
          videoName: lb.video_name,
          streamId: lb.stream_id,
          streamStatus: lb.stream_status
        };
      });
    }
    
    // Clear existing rows except states
    const existingRows = tableBody.querySelectorAll('tr:not(#loadingState):not(#emptyState)');
    existingRows.forEach(row => row.remove());
    
    // Add broadcast rows with merged data
    ytData.items.forEach(broadcast => {
      broadcast._localData = localMap[broadcast.id] || {};
      const row = createBroadcastRow(broadcast);
      tableBody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error loading broadcasts:', error);
    loadingState.innerHTML = `
      <td colspan="6" class="px-6 py-8 text-center">
        <i class="ti ti-alert-circle text-2xl text-red-400"></i>
        <p class="text-red-400 mt-2">Failed to load broadcasts</p>
      </td>
    `;
  }
}

function createBroadcastRow(broadcast) {
  const row = document.createElement('tr');
  row.className = 'hover:bg-dark-700/50 transition-colors';
  row.dataset.broadcastId = broadcast.id;
  
  const snippet = broadcast.snippet || {};
  const status = broadcast.status || {};
  const cdn = broadcast.cdn || {};
  const scheduledTime = snippet.scheduledStartTime ? new Date(snippet.scheduledStartTime) : null;
  
  // Get stream key (masked)
  const streamKey = cdn.ingestionInfo?.streamName || 'N/A';
  const maskedKey = streamKey !== 'N/A' ? streamKey.replace(/.(?=.{4}$)/g, '*') : 'N/A';
  
  // Get local broadcast data (video link, stream status)
  const localData = broadcast._localData || {};
  const videoName = localData.videoName || 'Not linked';
  const streamStatus = localData.streamStatus || 'offline';
  
  // Status badge
  let statusBadge = '';
  const lifeCycleStatus = status.lifeCycleStatus || 'created';
  if (lifeCycleStatus === 'live' || streamStatus === 'live') {
    statusBadge = '<span class="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded">● Live</span>';
  } else if (lifeCycleStatus === 'complete') {
    statusBadge = '<span class="px-2 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded">Completed</span>';
  } else {
    statusBadge = '<span class="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded">Upcoming</span>';
  }
  
  // Start/Stop button
  let actionButton = '';
  if (localData.videoId && lifeCycleStatus !== 'complete') {
    if (streamStatus === 'live') {
      actionButton = `<button onclick="stopStream('${broadcast.id}')" class="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs font-medium transition-colors">
        <i class="ti ti-player-stop"></i> Stop
      </button>`;
    } else {
      actionButton = `<button onclick="startStream('${broadcast.id}')" class="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs font-medium transition-colors">
        <i class="ti ti-player-play"></i> Start
      </button>`;
    }
  }
  
  row.innerHTML = `
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <div class="w-20 h-12 bg-dark-700 rounded overflow-hidden flex-shrink-0">
          <img src="${snippet.thumbnails?.default?.url || '/images/default-thumbnail.jpg'}" 
            class="w-full h-full object-cover" alt="${snippet.title || 'Broadcast'}">
        </div>
        <div>
          <div class="text-sm font-medium">${snippet.title || 'Untitled'}</div>
          <div class="text-xs text-gray-400">${snippet.description ? snippet.description.substring(0, 50) + '...' : 'No description'}</div>
        </div>
      </div>
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-sm ${localData.videoId ? 'text-white' : 'text-gray-400'}">
      ${videoName}
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-sm">
      <code class="text-xs text-gray-400">${maskedKey}</code>
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-sm">
      ${scheduledTime ? scheduledTime.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : 'Not scheduled'}
    </td>
    <td class="px-6 py-4 whitespace-nowrap">
      <div class="flex items-center gap-2">
        ${statusBadge}
        ${actionButton}
      </div>
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-right">
      <div class="flex items-center justify-end gap-2">
        <button onclick="editBroadcast('${broadcast.id}')" class="p-2 hover:bg-dark-700 rounded transition-colors" title="Edit">
          <i class="ti ti-edit text-gray-400 hover:text-white"></i>
        </button>
        <button onclick="duplicateBroadcast('${broadcast.id}')" class="p-2 hover:bg-dark-700 rounded transition-colors" title="Duplicate">
          <i class="ti ti-copy text-gray-400 hover:text-white"></i>
        </button>
        <button onclick="changeThumbnail('${broadcast.id}')" class="p-2 hover:bg-dark-700 rounded transition-colors" title="Change Thumbnail">
          <i class="ti ti-photo text-gray-400 hover:text-white"></i>
        </button>
        <button onclick="deleteBroadcast('${broadcast.id}')" class="p-2 hover:bg-dark-700 rounded transition-colors" title="Delete">
          <i class="ti ti-trash text-gray-400 hover:text-red-400"></i>
        </button>
      </div>
    </td>
  `;
  
  return row;
}

function openNewBroadcastModal() {
  try {
    currentEditingId = null;
    
    const modalTitle = document.getElementById('modalTitle');
    const submitButton = document.getElementById('submitButton');
    const broadcastForm = document.getElementById('broadcastForm');
    const selectedVideoText = document.getElementById('selectedVideoText');
    const streamKeyInfo = document.getElementById('streamKeyInfo');
    const broadcastScheduledTime = document.getElementById('broadcastScheduledTime');
    const modal = document.getElementById('broadcastModal');
    
    if (!modal) {
      console.error('Modal element not found');
      return;
    }
    
    if (modalTitle) modalTitle.textContent = 'Create YouTube Live Broadcast';
    if (submitButton) submitButton.textContent = 'Create Broadcast';
    if (broadcastForm) broadcastForm.reset();
    
    if (selectedVideoText) {
      selectedVideoText.textContent = 'Choose a video...';
      selectedVideoText.classList.add('text-gray-400');
      selectedVideoText.classList.remove('text-white');
    }
    
    if (streamKeyInfo) streamKeyInfo.classList.add('hidden');
    
    // Set default scheduled time to 1 hour from now
    if (broadcastScheduledTime) {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      broadcastScheduledTime.value = now.toISOString().slice(0, 16);
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  } catch (error) {
    console.error('Error opening modal:', error);
    alert('Error opening modal. Please refresh the page.');
  }
}

function closeBroadcastModal() {
  const modal = document.getElementById('broadcastModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = 'auto';
  document.getElementById('videoDropdown').classList.add('hidden');
}

async function handleSaveBroadcast(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const videoId = document.getElementById('selectedVideoId').value;
  
  if (!videoId) {
    alert('Please select a video source');
    return;
  }
  
  const data = {
    title: formData.get('title'),
    description: formData.get('description'),
    privacyStatus: formData.get('privacyStatus'),
    scheduledStartTime: new Date(formData.get('scheduledStartTime')).toISOString(),
    enableAutoStart: formData.get('enableAutoStart') === 'on',
    enableAutoStop: formData.get('enableAutoStop') === 'on',
    videoId: videoId
  };
  
  try {
    let response;
    if (currentEditingId) {
      // Update existing broadcast
      response = await fetch(`/youtube/broadcasts/${currentEditingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      // Create new broadcast via YouTube API
      response = await fetch('/youtube/schedule-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save broadcast');
    }
    
    const broadcastId = currentEditingId || result.broadcast?.id;
    
    // Save to local database (link broadcast with video)
    if (!currentEditingId && broadcastId) {
      await fetch('/api/youtube-broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId: broadcastId,
          videoId: videoId,
          title: data.title,
          description: data.description,
          scheduledStartTime: data.scheduledStartTime,
          streamKey: result.stream?.cdn?.ingestionInfo?.streamName || null,
          rtmpUrl: result.stream?.cdn?.ingestionInfo?.ingestionAddress || null
        })
      });
    }
    
    // Handle thumbnail upload if provided
    const thumbnailFile = formData.get('thumbnail');
    if (thumbnailFile && thumbnailFile.size > 0 && broadcastId) {
      await uploadThumbnail(broadcastId, thumbnailFile);
    }
    
    // Handle audience settings
    const madeForKids = formData.get('madeForKids') === 'yes';
    const ageRestricted = formData.get('ageRestricted') === 'on';
    if (broadcastId) {
      await setAudience(broadcastId, madeForKids, ageRestricted);
    }
    
    alert(currentEditingId ? 'Broadcast updated successfully!' : 'Broadcast created successfully!');
    closeBroadcastModal();
    loadBroadcasts();
    
  } catch (error) {
    console.error('Error saving broadcast:', error);
    alert('Error: ' + error.message);
  }
}

async function editBroadcast(id) {
  try {
    const response = await fetch(`/youtube/broadcasts/${id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to load broadcast');
    }
    
    const broadcast = data.broadcast;
    const snippet = broadcast.snippet || {};
    const status = broadcast.status || {};
    
    currentEditingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Broadcast';
    document.getElementById('submitButton').textContent = 'Update Broadcast';
    document.getElementById('broadcastId').value = id;
    document.getElementById('broadcastTitle').value = snippet.title || '';
    document.getElementById('broadcastDescription').value = snippet.description || '';
    document.getElementById('broadcastPrivacy').value = status.privacyStatus || 'unlisted';
    
    if (snippet.scheduledStartTime) {
      const date = new Date(snippet.scheduledStartTime);
      document.getElementById('broadcastScheduledTime').value = date.toISOString().slice(0, 16);
    }
    
    const modal = document.getElementById('broadcastModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('Error loading broadcast:', error);
    alert('Error: ' + error.message);
  }
}

async function duplicateBroadcast(id) {
  try {
    const response = await fetch(`/youtube/broadcasts/${id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to load broadcast');
    }
    
    const broadcast = data.broadcast;
    const snippet = broadcast.snippet || {};
    const status = broadcast.status || {};
    
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = 'Duplicate Broadcast';
    document.getElementById('submitButton').textContent = 'Create Broadcast';
    document.getElementById('broadcastTitle').value = (snippet.title || '') + ' (Copy)';
    document.getElementById('broadcastDescription').value = snippet.description || '';
    document.getElementById('broadcastPrivacy').value = status.privacyStatus || 'unlisted';
    
    // Set scheduled time to 1 hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1);
    document.getElementById('broadcastScheduledTime').value = now.toISOString().slice(0, 16);
    
    const modal = document.getElementById('broadcastModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('Error duplicating broadcast:', error);
    alert('Error: ' + error.message);
  }
}

function changeThumbnail(id) {
  document.getElementById('thumbnailBroadcastId').value = id;
  const modal = document.getElementById('thumbnailModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeThumbnailModal() {
  const modal = document.getElementById('thumbnailModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.getElementById('thumbnailForm').reset();
}

async function handleUploadThumbnail(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const broadcastId = document.getElementById('thumbnailBroadcastId').value;
  const file = formData.get('thumbnail');
  
  if (!file || file.size === 0) {
    alert('Please select a thumbnail file');
    return;
  }
  
  try {
    await uploadThumbnail(broadcastId, file);
    alert('Thumbnail uploaded successfully!');
    closeThumbnailModal();
    loadBroadcasts();
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    alert('Error: ' + error.message);
  }
}

async function uploadThumbnail(broadcastId, file) {
  const formData = new FormData();
  formData.append('thumbnail', file);
  
  const response = await fetch(`/youtube/broadcasts/${broadcastId}/thumbnail`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload thumbnail');
  }
}

async function setAudience(broadcastId, madeForKids, ageRestricted) {
  try {
    const response = await fetch(`/youtube/broadcasts/${broadcastId}/audience`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selfDeclaredMadeForKids: madeForKids,
        ageRestricted: ageRestricted
      })
    });
    
    if (!response.ok) {
      console.error('Failed to set audience');
    }
  } catch (error) {
    console.error('Error setting audience:', error);
  }
}

async function deleteBroadcast(id) {
  if (!confirm('Are you sure you want to delete this broadcast?')) return;
  
  try {
    const response = await fetch(`/youtube/broadcasts/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete broadcast');
    }
    
    alert('Broadcast deleted successfully!');
    loadBroadcasts();
    
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    alert('Error: ' + error.message);
  }
}

function copyStreamKey() {
  const streamKey = document.getElementById('streamKeyDisplay').textContent;
  navigator.clipboard.writeText(streamKey);
  alert('Stream key copied to clipboard!');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  const videoDropdown = document.getElementById('videoDropdown');
  const videoButton = e.target.closest('[onclick="toggleVideoSelector()"]');
  
  if (!videoButton && !videoDropdown.contains(e.target)) {
    videoDropdown.classList.add('hidden');
  }
});


async function startStream(broadcastId) {
  try {
    const response = await fetch(`/api/youtube-broadcasts/${broadcastId}/start`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to start stream');
    }
    
    alert('Stream started successfully!');
    loadBroadcasts();
    
  } catch (error) {
    console.error('Error starting stream:', error);
    alert('Error: ' + error.message);
  }
}

async function stopStream(broadcastId) {
  if (!confirm('Are you sure you want to stop this stream?')) return;
  
  try {
    const response = await fetch(`/api/youtube-broadcasts/${broadcastId}/stop`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to stop stream');
    }
    
    alert('Stream stopped successfully!');
    loadBroadcasts();
    
  } catch (error) {
    console.error('Error stopping stream:', error);
    alert('Error: ' + error.message);
  }
}
