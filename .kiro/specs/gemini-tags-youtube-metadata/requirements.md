# Gemini AI Tags & YouTube Metadata Enhancement

## Overview
Add Gemini AI integration to auto-generate YouTube tags and ensure all YouTube API metadata fields are properly included when creating broadcasts.

---

## Problem Statement

### Current Issues:
1. **Missing Tags:** YouTube broadcasts created without tags (SEO impact)
2. **Incomplete Metadata:** Some YouTube API fields not being sent
3. **Manual Work:** Users must manually think of relevant tags

### Solution:
1. Add Gemini AI to auto-generate tags from title + description
2. Add tags input field in YouTube API tab
3. Audit and fix all YouTube API metadata fields
4. Add Gemini API key setting per user

---

## User Stories

### US-1: Auto-Generate Tags with Gemini AI
**As a** content creator  
**I want** to auto-generate relevant tags from my title and description  
**So that** I don't have to manually think of tags and improve SEO

**Acceptance Criteria:**
- [ ] User can enter Gemini API key in settings
- [ ] "Generate Tags" button in YouTube API tab
- [ ] Gemini generates 5-10 relevant tags
- [ ] Tags are editable (add/remove/modify)
- [ ] Works without API key (manual input only)
- [ ] Shows loading state while generating
- [ ] Handles API errors gracefully

### US-2: Manual Tags Input
**As a** user  
**I want** to manually input tags  
**So that** I can customize tags even without Gemini API

**Acceptance Criteria:**
- [ ] Tags input field with chips/pills UI
- [ ] Can add tags by typing + Enter
- [ ] Can remove tags by clicking X
- [ ] Validates tag length (max 30 chars)
- [ ] Validates total tags (max 30 tags)
- [ ] Validates total length (max 500 chars)
- [ ] Shows character count

### US-3: Complete YouTube Metadata
**As a** developer  
**I want** all YouTube API fields properly included  
**So that** broadcasts are created with complete metadata

**Acceptance Criteria:**
- [ ] All snippet fields included
- [ ] All status fields included
- [ ] All contentDetails fields included
- [ ] Category ID support
- [ ] Default language support
- [ ] Recording date support (if applicable)

---

## YouTube API Fields Audit

### Current Implementation (services/youtubeService.js):

```javascript
snippet: {
  title: ✅ Included
  description: ✅ Included
  scheduledStartTime: ✅ Included
  tags: ❌ MISSING
  categoryId: ❌ MISSING
  defaultLanguage: ❌ MISSING
  defaultAudioLanguage: ❌ MISSING
}

status: {
  privacyStatus: ✅ Included
  selfDeclaredMadeForKids: ❌ MISSING (currently youtubeMadeForKids)
  madeForKids: ❌ MISSING
}

contentDetails: {
  enableAutoStart: ✅ Included
  enableAutoStop: ✅ Included
  enableMonitorStream: ✅ Included
  enableDvr: ❌ MISSING
  enableContentEncryption: ❌ MISSING
  enableEmbed: ❌ MISSING
  recordFromStart: ❌ MISSING
  startWithSlate: ❌ MISSING
  latencyPreference: ❌ MISSING
}
```

### Fields to Add:

#### High Priority (Common Use):
1. **tags** - Array of strings (SEO critical)
2. **categoryId** - Video category (default: "20" = Gaming, "22" = People & Blogs)
3. **defaultLanguage** - e.g., "en", "id"
4. **enableDvr** - Allow viewers to rewind (default: true)
5. **enableEmbed** - Allow embedding (default: true)
6. **recordFromStart** - Auto-record (default: true)
7. **latencyPreference** - "normal", "low", "ultraLow"

#### Medium Priority:
8. **defaultAudioLanguage** - Audio language
9. **startWithSlate** - Show slate before stream
10. **madeForKids** - COPPA compliance

#### Low Priority:
11. **enableContentEncryption** - DRM (rarely used)

---

## Technical Implementation

### 1. Database Changes

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN gemini_api_key TEXT;

-- Add to streams table
ALTER TABLE streams ADD COLUMN tags TEXT; -- JSON array
ALTER TABLE streams ADD COLUMN category_id TEXT DEFAULT '22';
ALTER TABLE streams ADD COLUMN default_language TEXT DEFAULT 'en';
ALTER TABLE streams ADD COLUMN enable_dvr BOOLEAN DEFAULT 1;
ALTER TABLE streams ADD COLUMN enable_embed BOOLEAN DEFAULT 1;
ALTER TABLE streams ADD COLUMN record_from_start BOOLEAN DEFAULT 1;
ALTER TABLE streams ADD COLUMN latency_preference TEXT DEFAULT 'normal';

-- Add to stream_templates table (same fields)
ALTER TABLE stream_templates ADD COLUMN tags TEXT;
ALTER TABLE stream_templates ADD COLUMN category_id TEXT DEFAULT '22';
ALTER TABLE stream_templates ADD COLUMN default_language TEXT DEFAULT 'en';
ALTER TABLE stream_templates ADD COLUMN enable_dvr BOOLEAN DEFAULT 1;
ALTER TABLE stream_templates ADD COLUMN enable_embed BOOLEAN DEFAULT 1;
ALTER TABLE stream_templates ADD COLUMN record_from_start BOOLEAN DEFAULT 1;
ALTER TABLE stream_templates ADD COLUMN latency_preference TEXT DEFAULT 'normal';
```

### 2. New Service: Gemini AI

**File:** `services/geminiService.js`

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  /**
   * Generate YouTube tags from title and description
   * @param {string} title - Video title
   * @param {string} description - Video description
   * @param {string} apiKey - Gemini API key
   * @returns {Promise<string[]>} Array of tags
   */
  async generateTags(title, description, apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Generate 8-10 relevant YouTube tags for this video. 
Return ONLY comma-separated tags, no explanation, no numbering.

Title: ${title}
Description: ${description || 'No description'}

Requirements:
- Each tag max 30 characters
- Mix of broad and specific tags
- Include relevant keywords
- No special characters except spaces and hyphens
- Tags should be searchable and relevant`;
    
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Parse tags
      const tags = text
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.length <= 30)
        .slice(0, 10); // Max 10 tags
      
      return tags;
    } catch (error) {
      console.error('[GeminiService] Error generating tags:', error);
      throw new Error(`Failed to generate tags: ${error.message}`);
    }
  }

  /**
   * Validate tags array
   * @param {string[]} tags - Array of tags
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateTags(tags) {
    const errors = [];
    
    if (!Array.isArray(tags)) {
      return { valid: false, errors: ['Tags must be an array'] };
    }
    
    if (tags.length > 30) {
      errors.push('Maximum 30 tags allowed');
    }
    
    const totalLength = tags.join(',').length;
    if (totalLength > 500) {
      errors.push(`Total tags length (${totalLength}) exceeds 500 characters`);
    }
    
    tags.forEach((tag, index) => {
      if (tag.length > 30) {
        errors.push(`Tag ${index + 1} exceeds 30 characters`);
      }
      if (tag.length === 0) {
        errors.push(`Tag ${index + 1} is empty`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new GeminiService();
```

### 3. Update YouTube Service

**File:** `services/youtubeService.js`

Add to `scheduleLive()` function:

```javascript
snippet: {
  title: title || 'Untitled Stream',
  description: description || '',
  scheduledStartTime,
  tags: tags || [], // NEW
  categoryId: categoryId || '22', // NEW - Default: People & Blogs
  defaultLanguage: defaultLanguage || 'en', // NEW
  defaultAudioLanguage: defaultAudioLanguage || 'en', // NEW
},
status: {
  privacyStatus: privacyStatus || 'private',
  selfDeclaredMadeForKids: madeForKids || false, // NEW
},
contentDetails: {
  enableAutoStart: !!enableAutoStart,
  enableAutoStop: !!enableAutoStop,
  enableDvr: enableDvr !== false, // NEW - Default true
  enableEmbed: enableEmbed !== false, // NEW - Default true
  recordFromStart: recordFromStart !== false, // NEW - Default true
  startWithSlate: startWithSlate || false, // NEW
  latencyPreference: latencyPreference || 'normal', // NEW
},
```

### 4. New API Routes

**File:** `routes/gemini.js` (NEW)

```javascript
const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const User = require('../models/User');

// Generate tags from title and description
router.post('/generate-tags', async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.session.userId;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    
    // Get user's Gemini API key
    const user = await User.findById(userId);
    if (!user || !user.gemini_api_key) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key not configured. Please add it in Settings.'
      });
    }
    
    const tags = await geminiService.generateTags(
      title,
      description || '',
      user.gemini_api_key
    );
    
    res.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('[Gemini API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate tags'
    });
  }
});

// Validate tags
router.post('/validate-tags', (req, res) => {
  try {
    const { tags } = req.body;
    const validation = geminiService.validateTags(tags);
    
    res.json({
      success: validation.valid,
      ...validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

### 5. Update Settings Page

**File:** `views/settings.ejs`

Add Gemini API Key section:

```html
<!-- Gemini AI Settings -->
<div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
  <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
    <i class="ti ti-sparkles text-purple-400"></i>
    Gemini AI Settings
  </h3>
  
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-300 mb-2">
        Gemini API Key
        <span class="text-gray-500 text-xs ml-2">(Optional - for auto-generating tags)</span>
      </label>
      <input
        type="password"
        id="geminiApiKey"
        name="gemini_api_key"
        value="<%= user.gemini_api_key || '' %>"
        class="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
        placeholder="Enter your Gemini API key"
      />
      <p class="text-xs text-gray-500 mt-1">
        Get your free API key from 
        <a href="https://makersuite.google.com/app/apikey" target="_blank" class="text-primary hover:underline">
          Google AI Studio
        </a>
      </p>
    </div>
    
    <button
      type="button"
      onclick="testGeminiApiKey()"
      class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
    >
      <i class="ti ti-test-pipe mr-1"></i>
      Test API Key
    </button>
  </div>
</div>
```

### 6. Update Stream Modal

**File:** `views/partials/modals/stream-modal-youtube-api.ejs`

Add tags input after description:

```html
<!-- Tags Input -->
<div>
  <div class="flex items-center justify-between mb-2">
    <label class="text-sm font-medium text-white">
      Tags
      <span class="text-gray-500 text-xs ml-2">(Optional - improves discoverability)</span>
    </label>
    <button
      type="button"
      onclick="generateTagsWithGemini()"
      class="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors"
    >
      <i class="ti ti-sparkles text-sm"></i>
      <span>Generate with AI</span>
    </button>
  </div>
  
  <!-- Tags Container -->
  <div id="tagsContainer" class="flex flex-wrap gap-2 p-3 bg-dark-700 border border-gray-600 rounded-lg min-h-[60px]">
    <!-- Tags will be added here dynamically -->
  </div>
  
  <!-- Tag Input -->
  <div class="mt-2 flex gap-2">
    <input
      type="text"
      id="tagInput"
      placeholder="Type a tag and press Enter"
      class="flex-1 px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-sm"
      onkeypress="handleTagInput(event)"
      maxlength="30"
    />
    <button
      type="button"
      onclick="addTag()"
      class="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
    >
      Add
    </button>
  </div>
  
  <!-- Tag Stats -->
  <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
    <span id="tagCount">0 / 30 tags</span>
    <span id="tagLength">0 / 500 characters</span>
  </div>
  
  <!-- Hidden input for form submission -->
  <input type="hidden" id="youtubeTags" name="youtubeTags" value="[]" />
</div>

<!-- Category -->
<div>
  <label class="text-sm font-medium text-white block mb-2">Category</label>
  <select
    name="youtubeCategory"
    id="youtubeCategory"
    class="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-sm"
  >
    <option value="22">People & Blogs</option>
    <option value="20">Gaming</option>
    <option value="10">Music</option>
    <option value="24">Entertainment</option>
    <option value="17">Sports</option>
    <option value="26">Howto & Style</option>
    <option value="28">Science & Technology</option>
    <option value="25">News & Politics</option>
    <option value="23">Comedy</option>
    <option value="27">Education</option>
  </select>
</div>

<!-- Language -->
<div>
  <label class="text-sm font-medium text-white block mb-2">Language</label>
  <select
    name="youtubeLanguage"
    id="youtubeLanguage"
    class="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-sm"
  >
    <option value="en">English</option>
    <option value="id">Indonesian</option>
    <option value="es">Spanish</option>
    <option value="fr">French</option>
    <option value="de">German</option>
    <option value="ja">Japanese</option>
    <option value="ko">Korean</option>
    <option value="zh">Chinese</option>
  </select>
</div>
```

### 7. Frontend JavaScript

**File:** `public/js/youtube-tags.js` (NEW)

```javascript
// Tags management
let currentTags = [];

function addTag(tagText = null) {
  const input = document.getElementById('tagInput');
  const tag = (tagText || input.value).trim();
  
  if (!tag) return;
  
  // Validate
  if (tag.length > 30) {
    showNotification('Error', 'Tag must be 30 characters or less', 'error');
    return;
  }
  
  if (currentTags.length >= 30) {
    showNotification('Error', 'Maximum 30 tags allowed', 'error');
    return;
  }
  
  if (currentTags.includes(tag)) {
    showNotification('Warning', 'Tag already added', 'warning');
    return;
  }
  
  // Check total length
  const totalLength = [...currentTags, tag].join(',').length;
  if (totalLength > 500) {
    showNotification('Error', 'Total tags length exceeds 500 characters', 'error');
    return;
  }
  
  // Add tag
  currentTags.push(tag);
  renderTags();
  updateTagStats();
  
  // Clear input
  input.value = '';
  input.focus();
}

function removeTag(index) {
  currentTags.splice(index, 1);
  renderTags();
  updateTagStats();
}

function renderTags() {
  const container = document.getElementById('tagsContainer');
  
  if (currentTags.length === 0) {
    container.innerHTML = '<span class="text-gray-500 text-sm">No tags added yet</span>';
    return;
  }
  
  container.innerHTML = currentTags.map((tag, index) => `
    <div class="flex items-center gap-1 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-sm">
      <span>${tag}</span>
      <button
        type="button"
        onclick="removeTag(${index})"
        class="text-gray-400 hover:text-white transition-colors"
      >
        <i class="ti ti-x text-xs"></i>
      </button>
    </div>
  `).join('');
  
  // Update hidden input
  document.getElementById('youtubeTags').value = JSON.stringify(currentTags);
}

function updateTagStats() {
  const totalLength = currentTags.join(',').length;
  document.getElementById('tagCount').textContent = `${currentTags.length} / 30 tags`;
  document.getElementById('tagLength').textContent = `${totalLength} / 500 characters`;
}

function handleTagInput(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTag();
  }
}

async function generateTagsWithGemini() {
  const title = document.getElementById('streamTitle').value;
  const description = document.getElementById('youtubeDescription').value;
  
  if (!title) {
    showNotification('Warning', 'Please enter a title first', 'warning');
    return;
  }
  
  const button = event.target.closest('button');
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="ti ti-loader animate-spin text-sm"></i> Generating...';
  
  try {
    const response = await fetch('/api/gemini/generate-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate tags');
    }
    
    // Add generated tags
    currentTags = data.tags;
    renderTags();
    updateTagStats();
    
    showNotification('Success', `Generated ${data.tags.length} tags`, 'success');
  } catch (error) {
    console.error('Error generating tags:', error);
    showNotification('Error', error.message, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  renderTags();
  updateTagStats();
});
```

---

## Testing Checklist

### Gemini Integration:
- [ ] Test with valid API key
- [ ] Test with invalid API key
- [ ] Test without API key (should show error)
- [ ] Test with empty title (should show error)
- [ ] Test with long title + description
- [ ] Test API rate limiting
- [ ] Test network errors

### Tags UI:
- [ ] Add tag manually
- [ ] Remove tag
- [ ] Add duplicate tag (should prevent)
- [ ] Add 31st tag (should prevent)
- [ ] Add tag > 30 chars (should prevent)
- [ ] Total length > 500 chars (should prevent)
- [ ] Tags persist in form
- [ ] Tags included in stream creation

### YouTube API:
- [ ] Broadcast created with tags
- [ ] Broadcast created with category
- [ ] Broadcast created with language
- [ ] Broadcast created with DVR enabled
- [ ] Broadcast created with embed enabled
- [ ] All fields properly saved to database
- [ ] Edit stream preserves all fields

---

## Dependencies

```json
{
  "@google/generative-ai": "^0.1.3"
}
```

Install:
```bash
npm install @google/generative-ai
```

---

## Documentation

### For Users:
1. How to get Gemini API key
2. How to use auto-generate tags
3. Tag best practices
4. YouTube category guide

### For Developers:
1. Gemini API integration guide
2. YouTube API fields reference
3. Tag validation rules
4. Error handling patterns

---

## Future Enhancements

1. **Tag Suggestions:** Show popular tags for category
2. **Tag Analytics:** Track which tags perform best
3. **Bulk Tag Generation:** Generate tags for multiple streams
4. **Tag Templates:** Save common tag sets
5. **Multi-language Tags:** Generate tags in multiple languages
6. **Trending Tags:** Suggest currently trending tags

---

## Rollout Plan

### Phase 1: Backend (Day 1)
- [ ] Database migrations
- [ ] Gemini service implementation
- [ ] API routes
- [ ] YouTube service updates

### Phase 2: Frontend (Day 2)
- [ ] Settings page updates
- [ ] Stream modal updates
- [ ] Tags UI implementation
- [ ] JavaScript functions

### Phase 3: Testing (Day 3)
- [ ] Unit tests
- [ ] Integration tests
- [ ] User acceptance testing
- [ ] Bug fixes

### Phase 4: Deployment
- [ ] Deploy to staging
- [ ] Test on production-like environment
- [ ] Deploy to production
- [ ] Monitor for issues

---

**Estimated Total Time:** 2-3 days  
**Complexity:** Medium  
**Risk:** Low (additive changes, no breaking changes)
