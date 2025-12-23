/**
 * YouTube Tags Management
 * Handles tag input, validation, and Gemini AI generation
 */

let currentTags = [];

/**
 * Add a tag to the list
 * @param {string} tagText - Tag text (optional, uses input if not provided)
 */
function addTag(tagText = null) {
  const input = document.getElementById('tagInput');
  const tag = (tagText || input.value).trim();
  
  if (!tag) return;
  
  // Validate tag length
  if (tag.length > 30) {
    showNotification('Error', 'Tag must be 30 characters or less', 'error');
    return;
  }
  
  // Check max tags
  if (currentTags.length >= 30) {
    showNotification('Error', 'Maximum 30 tags allowed', 'error');
    return;
  }
  
  // Check for duplicates (case-insensitive)
  if (currentTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
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
  if (input) {
    input.value = '';
    input.focus();
  }
}

/**
 * Remove a tag from the list
 * @param {number} index - Tag index to remove
 */
function removeTag(index) {
  currentTags.splice(index, 1);
  renderTags();
  updateTagStats();
}

/**
 * Clear all tags
 */
function clearAllTags() {
  currentTags = [];
  renderTags();
  updateTagStats();
}

/**
 * Render tags in the container
 */
function renderTags() {
  const container = document.getElementById('tagsContainer');
  
  if (!container) {
    console.error('[Tags] Container not found');
    return;
  }
  
  if (currentTags.length === 0) {
    container.innerHTML = '<span class="text-gray-500 text-sm">No tags added yet. Click "Generate with AI" or add manually.</span>';
  } else {
    container.innerHTML = currentTags.map((tag, index) => `
      <div class="flex items-center gap-1 px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-full text-sm">
        <span class="text-white">${escapeHtml(tag)}</span>
        <button
          type="button"
          onclick="removeTag(${index})"
          class="text-gray-400 hover:text-white transition-colors ml-1"
          title="Remove tag"
        >
          <i class="ti ti-x text-xs"></i>
        </button>
      </div>
    `).join('');
  }
  
  // Update hidden input for form submission
  const hiddenInput = document.getElementById('youtubeTags');
  if (hiddenInput) {
    hiddenInput.value = JSON.stringify(currentTags);
  }
}

/**
 * Update tag statistics display
 */
function updateTagStats() {
  const totalLength = currentTags.join(',').length;
  
  const countEl = document.getElementById('tagCount');
  const lengthEl = document.getElementById('tagLength');
  
  if (countEl) {
    countEl.textContent = `${currentTags.length} / 30 tags`;
    countEl.className = currentTags.length >= 30 ? 'text-red-400' : 'text-gray-500';
  }
  
  if (lengthEl) {
    lengthEl.textContent = `${totalLength} / 500 characters`;
    lengthEl.className = totalLength >= 500 ? 'text-red-400' : 'text-gray-500';
  }
}

/**
 * Handle Enter key in tag input
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleTagInput(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTag();
  }
}

/**
 * Generate tags using Gemini AI
 */
async function generateTagsWithGemini() {
  const title = document.getElementById('streamTitle').value;
  const description = document.getElementById('youtubeDescription')?.value || '';
  
  if (!title || title.trim().length === 0) {
    showNotification('Warning', 'Please enter a title first', 'warning');
    document.getElementById('streamTitle').focus();
    return;
  }
  
  const button = event.target.closest('button');
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="ti ti-loader animate-spin text-sm"></i> Generating...';
  
  try {
    console.log('[Tags] Generating tags with Gemini...');
    
    const response = await fetch('/api/gemini/generate-tags', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title: title.trim(), 
        description: description.trim() 
      })
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate tags');
    }
    
    console.log('[Tags] Generated tags:', data.tags);
    
    // Replace current tags with generated ones
    currentTags = data.tags || [];
    renderTags();
    updateTagStats();
    
    showNotification('Success', `Generated ${data.tags.length} tags successfully!`, 'success');
  } catch (error) {
    console.error('[Tags] Error generating tags:', error);
    
    // Show user-friendly error message
    let errorMessage = error.message;
    if (errorMessage.includes('API key not configured')) {
      errorMessage = 'Gemini API key not configured. Please add it in Settings.';
    } else if (errorMessage.includes('Invalid')) {
      errorMessage = 'Invalid API key. Please check your Gemini API key in Settings.';
    }
    
    showNotification('Error', errorMessage, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Initialize tags on modal open
 */
function initializeTags() {
  currentTags = [];
  renderTags();
  updateTagStats();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    renderTags();
    updateTagStats();
  });
} else {
  renderTags();
  updateTagStats();
}

// Expose functions to window for onclick handlers
window.addTag = addTag;
window.removeTag = removeTag;
window.clearAllTags = clearAllTags;
window.handleTagInput = handleTagInput;
window.generateTagsWithGemini = generateTagsWithGemini;
window.initializeTags = initializeTags;

console.log('[Tags] YouTube tags module loaded');
