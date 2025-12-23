// Stream Templates Management

let allTemplates = [];

// Load all templates
async function loadTemplates() {
  try {
    const response = await fetch('/api/templates');
    if (!response.ok) throw new Error('Failed to load templates');
    allTemplates = await response.json();
    return allTemplates;
  } catch (error) {
    console.error('Error loading templates:', error);
    showNotification('Error', 'Failed to load templates', 'error');
    return [];
  }
}

// Open template selector modal
async function openTemplateSelector() {
  const modal = document.getElementById('templateSelectorModal');
  if (!modal) return;

  // Load templates
  const templates = await loadTemplates();
  
  // Populate template list
  const container = document.getElementById('templateListContainer');
  container.innerHTML = '';

  if (templates.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <i class="ti ti-template-off text-4xl mb-2"></i>
        <p>No templates saved yet</p>
        <p class="text-xs text-gray-500 mt-1">Create a stream configuration and save it as a template</p>
      </div>
    `;
  } else {
    templates.forEach(template => {
      const templateCard = document.createElement('div');
      templateCard.className = 'template-card p-3 bg-dark-700 rounded-lg border border-gray-600 hover:border-primary transition-colors';
      templateCard.innerHTML = `
        <div class="flex items-start gap-3">
          <!-- Checkbox -->
          <input type="checkbox" 
            class="template-checkbox w-4 h-4 mt-1 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0 bg-dark-700 cursor-pointer"
            onchange="toggleTemplateSelection('${template.id}', this)">
          
          <!-- Template Content (clickable) -->
          <div class="flex-1 cursor-pointer" onclick="loadTemplate('${template.id}')">
            <h4 class="font-medium text-white mb-1">${template.name}</h4>
            ${template.description ? `<p class="text-xs text-gray-400 mb-2">${template.description}</p>` : ''}
            <div class="flex flex-wrap gap-2 text-xs">
              ${template.video_name ? `<span class="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded"><i class="ti ti-video text-xs mr-1"></i>${template.video_name}</span>` : ''}
              ${template.platform ? `<span class="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded"><i class="ti ti-brand-${template.platform.toLowerCase()} text-xs mr-1"></i>${template.platform}</span>` : ''}
            </div>
          </div>
          
          <!-- Delete Button -->
          <button type="button" onclick="event.stopPropagation(); deleteTemplate('${template.id}')" 
            class="w-7 h-7 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors flex-shrink-0" 
            title="Delete">
            <i class="ti ti-trash text-sm"></i>
          </button>
        </div>
      `;
      container.appendChild(templateCard);
    });
  }

  // Show modal
  document.body.style.overflow = 'hidden';
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('active'));
}

// Close template selector
function closeTemplateSelector() {
  const modal = document.getElementById('templateSelectorModal');
  if (!modal) return;
  
  modal.classList.remove('active');
  setTimeout(() => {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }, 200);
}

// Load template into form
async function loadTemplate(templateId) {
  try {
    const response = await fetch(`/api/templates/${templateId}`);
    if (!response.ok) throw new Error('Failed to load template');
    
    const template = await response.json();
    
    // Close template selector
    closeTemplateSelector();
    
    // Open Create New Stream modal
    setTimeout(() => {
      openNewStreamModal();
    }, 300);
    
    // Wait for modal to open before populating
    setTimeout(() => {
      // Switch to correct tab first
      const isYouTubeMode = template.use_youtube_api === true || template.use_youtube_api === 1;
      if (isYouTubeMode) {
        switchStreamTab('youtube');
      } else {
        switchStreamTab('manual');
      }
      
      // Populate form fields
      if (template.video_id) {
        // Find and select video
        const video = window.allStreamVideos?.find(v => v.id === template.video_id);
        if (video) {
          selectVideo(video);
        }
      }
      
      // Set stream title
      if (template.stream_title) {
        document.getElementById('streamTitle').value = template.stream_title;
      }
      
      // Set RTMP URL and Stream Key based on mode
      if (isYouTubeMode) {
        // YouTube API mode
        if (template.rtmp_url) {
          const youtubeRtmpUrl = document.getElementById('youtubeRtmpUrl');
          if (youtubeRtmpUrl) youtubeRtmpUrl.value = template.rtmp_url;
        }
        if (template.stream_key) {
          const youtubeStreamKey = document.getElementById('youtubeStreamKey');
          if (youtubeStreamKey) youtubeStreamKey.value = template.stream_key;
        }
        if (template.youtube_description) {
          const youtubeDescription = document.getElementById('youtubeDescription');
          if (youtubeDescription) youtubeDescription.value = template.youtube_description;
        }
        if (template.youtube_privacy) {
          const youtubePrivacy = document.getElementById('youtubePrivacy');
          if (youtubePrivacy) youtubePrivacy.value = template.youtube_privacy;
        }
        if (template.youtube_made_for_kids !== undefined) {
          const madeForKidsRadio = document.querySelector(`input[name="youtubeMadeForKids"][value="${template.youtube_made_for_kids ? 'yes' : 'no'}"]`);
          if (madeForKidsRadio) madeForKidsRadio.checked = true;
        }
        if (template.youtube_age_restricted !== undefined) {
          const ageRestricted = document.getElementById('youtubeAgeRestricted');
          if (ageRestricted) ageRestricted.checked = template.youtube_age_restricted;
        }
        if (template.youtube_auto_start !== undefined) {
          const autoStart = document.getElementById('youtubeAutoStart');
          if (autoStart) autoStart.checked = template.youtube_auto_start;
        }
        if (template.youtube_auto_end !== undefined) {
          const autoEnd = document.getElementById('youtubeAutoEnd');
          if (autoEnd) autoEnd.checked = template.youtube_auto_end;
        }
      } else {
        // Manual RTMP mode
        if (template.rtmp_url) {
          const rtmpUrl = document.getElementById('rtmpUrl');
          if (rtmpUrl) rtmpUrl.value = template.rtmp_url;
        }
        if (template.stream_key) {
          const streamKey = document.getElementById('streamKey');
          if (streamKey) streamKey.value = template.stream_key;
        }
      }
      
      // Set loop video
      if (template.loop_video !== undefined) {
        document.getElementById('loopVideo').checked = template.loop_video;
      }
    
    // Load schedules
    if (template.schedules && template.schedules.length > 0) {
      const container = document.getElementById('scheduleSlotsContainer');
      container.innerHTML = ''; // Clear existing slots
      
      template.schedules.forEach(schedule => {
        addScheduleSlot();
        const slots = container.querySelectorAll('.schedule-slot');
        const slot = slots[slots.length - 1];
        
        // Set time
        if (schedule.time) {
          slot.querySelector('.schedule-time').value = schedule.time;
        }
        
        // Set duration
        if (schedule.duration) {
          const hours = Math.floor(schedule.duration / 60);
          const minutes = schedule.duration % 60;
          slot.querySelector('.duration-hours').value = hours;
          slot.querySelector('.duration-minutes').value = minutes;
          slot.querySelector('.schedule-duration').value = schedule.duration;
          
          // Calculate end time
          calculateFromDuration(slot.querySelector('.duration-hours'));
        }
        
        // Set recurring days (using buttons now, not checkboxes)
        if (schedule.is_recurring && schedule.recurring_days) {
          const days = schedule.recurring_days.split(',');
          days.forEach(day => {
            const dayButton = slot.querySelector(`.recurring-day[data-day="${day}"]`);
            if (dayButton) {
              dayButton.classList.add('bg-primary', 'border-primary', 'text-white');
            }
          });
        }
      });
    }
    
    }, 400); // End of setTimeout for populating fields
    
    showNotification('Template Loaded', `"${template.name}" has been loaded successfully`, 'success');
  } catch (error) {
    console.error('Error loading template:', error);
    showNotification('Error', 'Failed to load template', 'error');
  }
}

// Save current configuration as template
async function saveAsTemplate() {
  // Check which tab is active
  const isYouTubeMode = window.currentStreamTab === 'youtube';
  console.log('[saveAsTemplate] Current tab:', window.currentStreamTab, 'isYouTubeMode:', isYouTubeMode);
  
  // Get current form data
  const videoId = document.getElementById('selectedVideoId')?.value;
  const videoName = document.getElementById('selectedVideo')?.textContent;
  const streamTitle = document.getElementById('streamTitle')?.value;
  const loopVideo = document.getElementById('loopVideo')?.checked;
  
  // Get RTMP URL and Stream Key based on mode
  let rtmpUrl, streamKey, youtubeDescription, youtubePrivacy, youtubeMadeForKids, youtubeAgeRestricted, youtubeAutoStart, youtubeAutoEnd;
  
  if (isYouTubeMode) {
    rtmpUrl = document.getElementById('youtubeRtmpUrl')?.value;
    streamKey = document.getElementById('youtubeStreamKey')?.value;
    youtubeDescription = document.getElementById('youtubeDescription')?.value;
    youtubePrivacy = document.getElementById('youtubePrivacy')?.value;
    youtubeMadeForKids = document.querySelector('input[name="youtubeMadeForKids"]:checked')?.value === 'yes';
    youtubeAgeRestricted = document.getElementById('youtubeAgeRestricted')?.checked;
    youtubeAutoStart = document.getElementById('youtubeAutoStart')?.checked;
    youtubeAutoEnd = document.getElementById('youtubeAutoEnd')?.checked;
  } else {
    rtmpUrl = document.getElementById('rtmpUrl')?.value;
    streamKey = document.getElementById('streamKey')?.value;
  }
  
  // Get schedules
  const schedules = [];
  document.querySelectorAll('.schedule-slot').forEach(slot => {
    const time = slot.querySelector('.schedule-time')?.value;
    
    // Get duration from hours and minutes inputs
    const hoursInput = slot.querySelector('.duration-hours');
    const minutesInput = slot.querySelector('.duration-minutes');
    const hours = parseInt(hoursInput?.value) || 0;
    const minutes = parseInt(minutesInput?.value) || 0;
    const duration = hours * 60 + minutes;
    
    // Check if any recurring day button is selected
    const selectedDayButtons = Array.from(slot.querySelectorAll('.recurring-day.bg-primary'));
    const isRecurring = selectedDayButtons.length > 0;
    
    let recurringDays = '';
    if (isRecurring) {
      const selectedDays = selectedDayButtons.map(btn => btn.getAttribute('data-day'));
      recurringDays = selectedDays.join(',');
    }
    
    if (time) {
      schedules.push({
        time,
        duration,
        is_recurring: isRecurring,
        recurring_days: recurringDays
      });
    }
  });
  
  // Detect platform from RTMP URL
  let platform = 'Custom';
  if (rtmpUrl) {
    const url = rtmpUrl.toLowerCase();
    if (url.includes('youtube')) platform = 'YouTube';
    else if (url.includes('facebook')) platform = 'Facebook';
    else if (url.includes('twitch')) platform = 'Twitch';
    else if (url.includes('tiktok')) platform = 'TikTok';
    else if (url.includes('shopee')) platform = 'Shopee';
  }
  
  // Prompt for template name
  const modal = document.getElementById('saveTemplateModal');
  if (!modal) return;
  
  // Pre-fill with stream title if available
  const templateNameInput = document.getElementById('templateName');
  const templateDescInput = document.getElementById('templateDescription');
  
  if (streamTitle) {
    templateNameInput.value = streamTitle + ' Template';
  }
  
  // Store data temporarily
  window._templateData = {
    video_id: videoId || null,
    video_name: videoName !== 'Choose a video...' ? videoName : '',
    stream_title: streamTitle || '',
    rtmp_url: rtmpUrl || '',
    stream_key: streamKey || '',
    platform: platform,
    loop_video: loopVideo,
    schedules: schedules,
    use_youtube_api: isYouTubeMode,
    youtube_description: youtubeDescription || '',
    youtube_privacy: youtubePrivacy || 'unlisted',
    youtube_made_for_kids: youtubeMadeForKids || false,
    youtube_age_restricted: youtubeAgeRestricted || false,
    youtube_auto_start: youtubeAutoStart || false,
    youtube_auto_end: youtubeAutoEnd || false
  };
  
  // Show modal
  document.body.style.overflow = 'hidden';
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('active'));
  
  setTimeout(() => templateNameInput.focus(), 100);
}

// Confirm save template
async function confirmSaveTemplate() {
  const name = document.getElementById('templateName')?.value.trim();
  const description = document.getElementById('templateDescription')?.value.trim();
  
  if (!name) {
    showNotification('Error', 'Please enter a template name', 'warning');
    return;
  }
  
  const templateData = {
    ...window._templateData,
    name,
    description
  };
  
  try {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateData)
    });
    
    if (!response.ok) throw new Error('Failed to save template');
    
    const result = await response.json();
    
    closeSaveTemplateModal();
    showNotification('Template Saved', `"${name}" has been saved successfully`, 'success');
    
    // Clear temporary data
    delete window._templateData;
  } catch (error) {
    console.error('Error saving template:', error);
    showNotification('Error', 'Failed to save template', 'error');
  }
}

// Close save template modal
function closeSaveTemplateModal() {
  const modal = document.getElementById('saveTemplateModal');
  if (!modal) return;
  
  modal.classList.remove('active');
  setTimeout(() => {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Clear form
    document.getElementById('templateName').value = '';
    document.getElementById('templateDescription').value = '';
  }, 200);
}

// Delete template
async function deleteTemplate(templateId) {
  // Show custom confirmation modal
  showConfirmDialog(
    'Delete Template',
    'Are you sure you want to delete this template? This action cannot be undone.',
    'Delete',
    'Cancel',
    async () => {
      try {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete template');
        
        showNotification('Template Deleted', 'Template has been deleted successfully', 'success');
        
        // Reload template list
        openTemplateSelector();
      } catch (error) {
        console.error('Error deleting template:', error);
        showNotification('Error', 'Failed to delete template', 'error');
      }
    }
  );
}

// Custom Confirm Dialog
function showConfirmDialog(title, message, confirmText, cancelText, onConfirm) {
  const modal = document.getElementById('confirmDialog');
  if (!modal) {
    // Create modal if not exists
    const modalHTML = `
      <div id="confirmDialog" class="fixed inset-0 bg-black/50 z-[60] hidden flex items-center justify-center p-4">
        <div class="bg-dark-800 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-200 scale-95 opacity-0" id="confirmDialogContent">
          <div class="px-6 py-4 border-b border-gray-700">
            <h3 class="text-lg font-semibold flex items-center gap-2" id="confirmDialogTitle">
              <i class="ti ti-alert-circle text-yellow-400"></i>
              Confirm Action
            </h3>
          </div>
          <div class="px-6 py-4">
            <p class="text-gray-300" id="confirmDialogMessage">Are you sure?</p>
          </div>
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700 bg-dark-900">
            <button onclick="closeConfirmDialog()" class="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded transition-colors" id="confirmDialogCancel">
              Cancel
            </button>
            <button onclick="confirmDialogAction()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors" id="confirmDialogConfirm">
              Confirm
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  const confirmModal = document.getElementById('confirmDialog');
  const confirmContent = document.getElementById('confirmDialogContent');
  const titleEl = document.getElementById('confirmDialogTitle');
  const messageEl = document.getElementById('confirmDialogMessage');
  const confirmBtn = document.getElementById('confirmDialogConfirm');
  const cancelBtn = document.getElementById('confirmDialogCancel');
  
  // Set content
  titleEl.innerHTML = `<i class="ti ti-alert-circle text-yellow-400"></i>${title}`;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;
  
  // Store callback
  window._confirmCallback = onConfirm;
  
  // Show modal
  confirmModal.classList.remove('hidden');
  confirmModal.classList.add('flex');
  requestAnimationFrame(() => {
    confirmContent.classList.remove('scale-95', 'opacity-0');
    confirmContent.classList.add('scale-100', 'opacity-100');
  });
}

function closeConfirmDialog() {
  const modal = document.getElementById('confirmDialog');
  const content = document.getElementById('confirmDialogContent');
  
  content.classList.remove('scale-100', 'opacity-100');
  content.classList.add('scale-95', 'opacity-0');
  
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    window._confirmCallback = null;
  }, 200);
}

function confirmDialogAction() {
  if (window._confirmCallback) {
    window._confirmCallback();
  }
  closeConfirmDialog();
}

// Export template as JSON
async function exportTemplate(templateId) {
  try {
    const response = await fetch(`/api/templates/${templateId}/export`);
    if (!response.ok) throw new Error('Failed to export template');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'template.json';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('Template Exported', 'Template has been downloaded', 'success');
  } catch (error) {
    console.error('Error exporting template:', error);
    showNotification('Error', 'Failed to export template', 'error');
  }
}

// Import template from JSON file
function openImportTemplate() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const templateData = JSON.parse(text);
      
      const response = await fetch('/api/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) throw new Error('Failed to import template');
      
      showNotification('Template Imported', 'Template has been imported successfully', 'success');
      
      // Reload template list if modal is open
      const modal = document.getElementById('templateSelectorModal');
      if (modal && !modal.classList.contains('hidden')) {
        openTemplateSelector();
      }
    } catch (error) {
      console.error('Error importing template:', error);
      showNotification('Error', 'Failed to import template. Please check the file format.', 'error');
    }
  };
  input.click();
}

// ============================================================================
// TEMPLATE EXPORT FUNCTIONS
// ============================================================================

// Template selection state
let selectedTemplateIds = new Set();

// Toggle template selection
function toggleTemplateSelection(templateId, checkbox) {
  if (checkbox.checked) {
    selectedTemplateIds.add(templateId);
  } else {
    selectedTemplateIds.delete(templateId);
  }
  
  updateTemplateSelectionUI();
}

// Update UI based on selection
function updateTemplateSelectionUI() {
  const count = selectedTemplateIds.size;
  const countElement = document.getElementById('selectedTemplatesCount');
  const exportBtn = document.getElementById('exportSelectedBtn');
  
  if (count > 0) {
    if (countElement) {
      countElement.textContent = `${count} selected`;
      countElement.classList.remove('hidden');
    }
    if (exportBtn) {
      exportBtn.classList.remove('hidden');
    }
  } else {
    if (countElement) {
      countElement.classList.add('hidden');
    }
    if (exportBtn) {
      exportBtn.classList.add('hidden');
    }
  }
}

// Export selected templates
async function exportSelectedTemplates() {
  if (selectedTemplateIds.size === 0) {
    showNotification('Warning', 'Please select at least one template to export', 'warning');
    return;
  }
  
  try {
    const ids = Array.from(selectedTemplateIds);
    console.log('[exportSelectedTemplates] Exporting templates:', ids);
    
    const response = await fetch('/api/templates/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids })
    });
    
    if (!response.ok) {
      throw new Error('Failed to export templates');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `templates-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('Success', `Exported ${ids.length} template(s)`, 'success');
    
    // Clear selection
    selectedTemplateIds.clear();
    updateTemplateSelectionUI();
    
    // Uncheck all checkboxes
    document.querySelectorAll('.template-checkbox').forEach(cb => cb.checked = false);
    
  } catch (error) {
    console.error('[exportSelectedTemplates] Error:', error);
    showNotification('Error', 'Failed to export templates', 'error');
  }
}

// Export all templates
async function exportAllTemplates() {
  try {
    console.log('[exportAllTemplates] Exporting all templates...');
    
    const response = await fetch('/api/templates/export-all');
    
    if (!response.ok) {
      throw new Error('Failed to export templates');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-templates-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('Success', 'All templates exported successfully', 'success');
    
  } catch (error) {
    console.error('[exportAllTemplates] Error:', error);
    showNotification('Error', 'Failed to export templates', 'error');
  }
}

// Expose functions globally
window.toggleTemplateSelection = toggleTemplateSelection;
window.exportSelectedTemplates = exportSelectedTemplates;
window.exportAllTemplates = exportAllTemplates;

console.log('[stream-templates.js] Export functions loaded');
