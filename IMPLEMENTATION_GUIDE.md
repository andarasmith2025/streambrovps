# Implementation Guide: Stream Modal Fixes

## 1. Manual RTMP: Add "Load from YouTube" Button & Dropdown

### Step 1.1: Update `views/dashboard.ejs` - Manual RTMP Section

Find the Manual RTMP stream key input section (around line 560-572) and replace it with:

```html
<!-- Stream Key with Load Button (Manual RTMP) -->
<div>
  <label class="text-sm font-medium text-white block mb-2">Stream Key</label>
  <div class="flex gap-2">
    <div class="relative flex-1">
      <input type="password" id="streamKey" name="streamKey"
        class="w-full pl-10 pr-12 py-2.5 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
        placeholder="Enter stream key or load from YouTube">
      <i class="ti ti-key absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
      <button type="button" onclick="toggleStreamKeyVisibility()"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
        <i class="ti ti-eye" id="streamKeyToggle"></i>
      </button>
    </div>
    <button type="button" onclick="toggleManualRTMPStreamKeysDropdown()"
      class="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors whitespace-nowrap">
      <i class="ti ti-download text-sm"></i>
      <span>Load</span>
    </button>
  </div>
  
  <!-- Dropdown for Stream Keys (Manual RTMP) -->
  <div id="manualRTMPStreamKeysDropdown" class="hidden mt-2 bg-dark-700 border border-gray-600 rounded-lg shadow-lg">
    <div class="p-2">
      <!-- Header -->
      <div class="flex items-center justify-between mb-2 px-2 pb-2 border-b border-gray-600">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-gray-300">Stream Keys</span>
          <span id="manualStreamKeysCount" class="text-xs text-gray-500"></span>
        </div>
        <div class="flex items-center gap-2">
          <span id="manualStreamKeysCacheInfo" class="text-xs text-gray-500"></span>
          <button type="button" onclick="refreshManualRTMPStreamKeys()"
            class="p-1 text-gray-400 hover:text-primary transition-colors rounded hover:bg-gray-600" 
            title="Refresh stream keys">
            <i class="ti ti-refresh text-sm"></i>
          </button>
          <button type="button" onclick="toggleManualRTMPStreamKeysDropdown()"
            class="p-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-600"
            title="Close">
            <i class="ti ti-x text-sm"></i>
          </button>
        </div>
      </div>
      
      <!-- List Container with max height and scroll -->
      <div class="max-h-64 overflow-y-auto">
        <div id="manualRTMPStreamKeysList" class="space-y-1">
          <div class="text-center py-4 text-gray-400">
            <i class="ti ti-loader animate-spin text-xl mb-2"></i>
            <p class="text-xs">Loading stream keys...</p>
          </div>
        </div>
      </div>
      
      <!-- Footer with legend -->
      <div class="mt-2 pt-2 border-t border-gray-600 px-2">
        <div class="flex items-center gap-3 text-xs text-gray-500">
          <span class="flex items-center gap-1">
            <i class="ti ti-link text-blue-400"></i> RTMP
          </span>
          <span class="flex items-center gap-1">
            <i class="ti ti-key text-yellow-400"></i> Key
          </span>
          <span class="flex items-center gap-1">
            <i class="ti ti-check text-green-400"></i> Select
          </span>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Step 1.2: Update `public/js/stream-modal.js` - Add Manual RTMP Functions

Add these functions after the YouTube stream keys functions (around line 1100):

```javascript
// Manual RTMP Stream Keys Dropdown Functions
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

async function loadManualRTMPStreamKeys(forceRefresh = false) {
  try {
    // Check cache first (reuse YouTube cache)
    const now = Date.now();
    if (!forceRefresh && youtubeStreamKeysCache && youtubeStreamKeysCacheTime) {
      const cacheAge = now - youtubeStreamKeysCacheTime;
      if (cacheAge < STREAM_KEYS_CACHE_DURATION) {
        console.log('[loadManualRTMPStreamKeys] Using cached stream keys');
        displayManualRTMPStreamKeys(youtubeStreamKeysCache);
        
        if (typeof showToast === 'function') {
          const minutes = Math.floor(cacheAge / 60000);
          showToast('info', `Using cached data (${minutes}m old)`);
        }
        return;
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
    
    console.log('[loadManualRTMPStreamKeys] Fetching stream keys...');
    const response = await fetch('/oauth2/youtube/stream-keys');
    const data = await response.json();
    
    if (data.success && data.streamKeys) {
      // Update cache (shared with YouTube API tab)
      youtubeStreamKeysCache = data.streamKeys;
      youtubeStreamKeysCacheTime = now;
      
      displayManualRTMPStreamKeys(data.streamKeys);
      
      if (typeof showToast === 'function') {
        showToast('success', `Loaded ${data.streamKeys.length} stream key(s)`);
      }
    } else {
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
  
  // Close dropdown
  toggleManualRTMPStreamKeysDropdown();
  
  // Show success message
  if (typeof showToast === 'function') {
    showToast('success', `Stream key loaded: ${streamKey.title || 'Untitled'}`);
  }
}

function refreshManualRTMPStreamKeys() {
  loadManualRTMPStreamKeys(true);
}

// Expose functions globally
window.toggleManualRTMPStreamKeysDropdown = toggleManualRTMPStreamKeysDropdown;
window.loadManualRTMPStreamKeys = loadManualRTMPStreamKeys;
window.selectStreamKeyForManualRTMP = selectStreamKeyForManualRTMP;
window.refreshManualRTMPStreamKeys = refreshManualRTMPStreamKeys;
```

### Step 1.3: Update `switchStreamTab` Function

Update the `switchStreamTab` function to populate Manual RTMP dropdown from cache when switching to manual tab:

```javascript
function switchStreamTab(tab) {
  console.log('[switchStreamTab] Switching to tab:', tab);
  currentStreamTab = tab;
  window.currentStreamTab = tab;
  
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
    
    // If cache exists, pre-populate Manual RTMP dropdown (but don't show it)
    // User will click "Load" button to see the dropdown
    
  } else if (tab === 'youtube') {
    // ... existing YouTube tab code ...
  }
}
```

## 2. Template Export Feature

### Step 2.1: Update `views/partials/stream-templates-ui.ejs`

Replace the template selector modal header and content sections:

```html
<!-- Template Selector Modal -->
<div id="templateSelectorModal" class="fixed inset-0 bg-black/50 z-50 hidden modal-overlay">
  <div class="flex min-h-screen items-center justify-center p-4">
    <div class="bg-dark-800 rounded-lg shadow-xl w-full max-w-2xl modal-container transform transition-all duration-200 scale-95 opacity-0">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <i class="ti ti-template text-primary"></i>
            My Templates
          </h3>
          <span id="selectedTemplatesCount" class="hidden text-xs px-2 py-1 bg-primary/20 text-primary rounded">
            0 selected
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="exportSelectedTemplates()" id="exportSelectedBtn"
            class="hidden flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors">
            <i class="ti ti-download text-sm"></i>
            <span>Export Selected</span>
          </button>
          <button onclick="exportAllTemplates()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors">
            <i class="ti ti-file-export text-sm"></i>
            <span>Export All</span>
          </button>
          <button onclick="closeTemplateSelector()" class="text-gray-400 hover:text-white transition-colors">
            <i class="ti ti-x text-xl"></i>
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
        <div id="templateListContainer" class="space-y-3">
          <!-- Templates will be loaded here -->
          <div class="text-center py-8">
            <i class="ti ti-loader animate-spin text-3xl text-gray-400"></i>
            <p class="text-gray-400 mt-2">Loading templates...</p>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-dark-900">
        <p class="text-xs text-gray-400">
          <i class="ti ti-info-circle mr-1"></i>
          Click template to load, or select multiple to export
        </p>
        <button onclick="closeTemplateSelector()" 
          class="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded transition-colors">
          Close
        </button>
      </div>
    </div>
  </div>
</div>
```

### Step 2.2: Update `public/js/stream-templates.js`

Add these functions for template selection and export:

```javascript
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
    if (typeof showToast === 'function') {
      showToast('warning', 'Please select at least one template to export');
    }
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
    
    if (typeof showToast === 'function') {
      showToast('success', `Exported ${ids.length} template(s)`);
    }
    
    // Clear selection
    selectedTemplateIds.clear();
    updateTemplateSelectionUI();
    
    // Uncheck all checkboxes
    document.querySelectorAll('.template-checkbox').forEach(cb => cb.checked = false);
    
  } catch (error) {
    console.error('[exportSelectedTemplates] Error:', error);
    if (typeof showToast === 'function') {
      showToast('error', 'Failed to export templates');
    }
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
    
    if (typeof showToast === 'function') {
      showToast('success', 'All templates exported successfully');
    }
    
  } catch (error) {
    console.error('[exportAllTemplates] Error:', error);
    if (typeof showToast === 'function') {
      showToast('error', 'Failed to export templates');
    }
  }
}

// Expose functions globally
window.toggleTemplateSelection = toggleTemplateSelection;
window.exportSelectedTemplates = exportSelectedTemplates;
window.exportAllTemplates = exportAllTemplates;
```

Update the `displayTemplates` function to add checkboxes:

```javascript
function displayTemplates(templates) {
  const container = document.getElementById('templateListContainer');
  
  if (!templates || templates.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <i class="ti ti-template-off text-4xl text-gray-600 mb-3"></i>
        <p class="text-gray-400 font-medium">No templates found</p>
        <p class="text-gray-500 text-sm mt-1">Save your first template to get started</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = templates.map(template => `
    <div class="template-card bg-dark-700 border border-gray-600 rounded-lg p-4 hover:border-primary transition-all">
      <div class="flex items-start gap-3">
        <!-- Checkbox -->
        <input type="checkbox" 
          class="template-checkbox w-4 h-4 mt-1 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0 bg-dark-700 cursor-pointer"
          onchange="toggleTemplateSelection('${template.id}', this)">
        
        <!-- Template Content (clickable) -->
        <div class="flex-1 cursor-pointer" onclick="loadTemplate('${template.id}')">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <h4 class="font-semibold text-white mb-1">${template.name}</h4>
              ${template.description ? `<p class="text-sm text-gray-400">${template.description}</p>` : ''}
            </div>
          </div>
          
          <div class="flex flex-wrap gap-2 text-xs">
            ${template.config?.platform ? `
              <span class="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                <i class="ti ti-brand-${template.config.platform.toLowerCase()} mr-1"></i>
                ${template.config.platform}
              </span>
            ` : ''}
            ${template.config?.schedules?.length > 0 ? `
              <span class="px-2 py-1 bg-green-500/20 text-green-300 rounded">
                <i class="ti ti-clock mr-1"></i>
                ${template.config.schedules.length} schedule(s)
              </span>
            ` : ''}
            <span class="px-2 py-1 bg-gray-600/50 text-gray-300 rounded">
              <i class="ti ti-calendar mr-1"></i>
              ${new Date(template.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <!-- Delete Button -->
        <button onclick="event.stopPropagation(); deleteTemplate('${template.id}')" 
          class="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
          title="Delete template">
          <i class="ti ti-trash text-sm"></i>
        </button>
      </div>
    </div>
  `).join('');
}
```

### Step 2.3: Update `routes/templates.js`

Add export endpoints:

```javascript
// Export selected templates
router.post('/export', async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.session.userId;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No template IDs provided' });
    }
    
    console.log(`[Templates] Exporting ${ids.length} template(s) for user ${userId}`);
    
    // Get templates by IDs
    const templates = await Template.findByIds(ids, userId);
    
    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'No templates found' });
    }
    
    // Create export data
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: templates.map(t => ({
        name: t.name,
        description: t.description,
        config: t.config,
        created_at: t.created_at
      }))
    };
    
    // Send as JSON file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="templates-export-${Date.now()}.json"`);
    res.json(exportData);
    
  } catch (error) {
    console.error('[Templates] Export error:', error);
    res.status(500).json({ error: 'Failed to export templates' });
  }
});

// Export all templates
router.get('/export-all', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    console.log(`[Templates] Exporting all templates for user ${userId}`);
    
    // Get all templates for user
    const templates = await Template.findByUserId(userId);
    
    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'No templates found' });
    }
    
    // Create export data
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: templates.map(t => ({
        name: t.name,
        description: t.description,
        config: t.config,
        created_at: t.created_at
      }))
    };
    
    // Send as JSON file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="all-templates-export-${Date.now()}.json"`);
    res.json(exportData);
    
  } catch (error) {
    console.error('[Templates] Export all error:', error);
    res.status(500).json({ error: 'Failed to export templates' });
  }
});
```

### Step 2.4: Update `models/Template.js`

Add `findByIds` method if it doesn't exist:

```javascript
static async findByIds(ids, userId) {
  return new Promise((resolve, reject) => {
    const placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT * FROM stream_templates 
      WHERE id IN (${placeholders}) AND user_id = ?
      ORDER BY created_at DESC
    `;
    
    db.all(query, [...ids, userId], (err, rows) => {
      if (err) {
        console.error('[Template.findByIds] Error:', err);
        reject(err);
      } else {
        const templates = rows.map(row => ({
          ...row,
          config: JSON.parse(row.config)
        }));
        resolve(templates);
      }
    });
  });
}
```

## Testing Checklist

### Manual RTMP
- [ ] "Load" button appears next to stream key input
- [ ] Clicking "Load" shows dropdown with stream keys
- [ ] Dropdown shows cached data if available
- [ ] Dropdown shows cache age
- [ ] Refresh button works
- [ ] Selecting a stream key fills both RTMP URL and Stream Key
- [ ] Can still type manually after loading from dropdown
- [ ] Form submits correctly with manual input
- [ ] Form submits correctly with dropdown selection

### Template Export
- [ ] Checkbox appears on each template card
- [ ] Selecting templates shows count
- [ ] "Export Selected" button appears when templates selected
- [ ] "Export All" button always visible
- [ ] Export Selected downloads JSON file
- [ ] Export All downloads JSON file
- [ ] JSON file contains correct data
- [ ] Selection clears after export

### Cache Behavior
- [ ] Cache persists when switching between tabs
- [ ] Cache expires after 5 minutes
- [ ] Refresh button forces new fetch
- [ ] Cache age displays correctly

## Deployment

1. Commit all changes
2. Push to repository
3. SSH to server
4. Pull latest changes
5. Restart PM2: `pm2 restart streambro`
6. Test all features

## Notes

- Cache is shared between YouTube API tab and Manual RTMP tab
- Export format is JSON for easy import later (future feature)
- Template checkboxes don't interfere with clicking to load template
- Stream key visibility toggle works independently of dropdown
