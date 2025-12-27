/**
 * YouTube Title Autocomplete
 * Provides title suggestions as user types, similar to YouTube search
 */

let titleAutocompleteTimeout = null;
let currentTitleSuggestions = [];

/**
 * Initialize title autocomplete for a specific input field
 * @param {string} inputId - ID of the title input field
 * @param {string} dropdownId - ID of the dropdown container
 */
function initTitleAutocomplete(inputId, dropdownId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  
  console.log(`[TitleAutocomplete] Initializing for ${inputId}, ${dropdownId}`);
  console.log(`[TitleAutocomplete] Input found:`, !!input);
  console.log(`[TitleAutocomplete] Dropdown found:`, !!dropdown);
  
  if (!input || !dropdown) {
    console.warn(`[TitleAutocomplete] Elements not found: ${inputId}, ${dropdownId}`);
    return;
  }
  
  console.log(`[TitleAutocomplete] ✓ Successfully initialized for ${inputId}`);
  
  // Listen for input changes
  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    console.log(`[TitleAutocomplete] Input event: "${query}"`);
    
    // Clear previous timeout
    if (titleAutocompleteTimeout) {
      clearTimeout(titleAutocompleteTimeout);
    }
    
    // Hide dropdown if query is too short
    if (query.length < 2) {
      dropdown.classList.add('hidden');
      console.log(`[TitleAutocomplete] Query too short, hiding dropdown`);
      return;
    }
    
    console.log(`[TitleAutocomplete] Will fetch suggestions in 300ms...`);
    
    // Debounce: wait 300ms after user stops typing
    titleAutocompleteTimeout = setTimeout(() => {
      fetchTitleSuggestions(query, inputId, dropdownId);
    }, 300);
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
  
  // Handle keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (dropdown.classList.contains('hidden')) return;
    
    const items = dropdown.querySelectorAll('.title-suggestion-item');
    const activeItem = dropdown.querySelector('.title-suggestion-item.active');
    let currentIndex = Array.from(items).indexOf(activeItem);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentIndex = Math.min(currentIndex + 1, items.length - 1);
      setActiveSuggestion(items, currentIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentIndex = Math.max(currentIndex - 1, 0);
      setActiveSuggestion(items, currentIndex);
    } else if (e.key === 'Enter' && activeItem) {
      e.preventDefault();
      activeItem.click();
    } else if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
    }
  });
}

/**
 * Fetch title suggestions from YouTube
 * @param {string} query - Search query
 * @param {string} inputId - ID of the input field
 * @param {string} dropdownId - ID of the dropdown
 */
async function fetchTitleSuggestions(query, inputId, dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  
  console.log(`[TitleAutocomplete] Fetching suggestions for: "${query}"`);
  
  try {
    // Show loading state
    dropdown.innerHTML = `
      <div class="p-3 text-center text-gray-400 text-sm">
        <i class="ti ti-loader animate-spin mr-1"></i>
        Loading suggestions...
      </div>
    `;
    dropdown.classList.remove('hidden');
    
    const url = `/api/youtube-suggestions?q=${encodeURIComponent(query)}`;
    console.log(`[TitleAutocomplete] Fetching from: ${url}`);
    
    // Use backend proxy to avoid CORS issues
    const response = await fetch(url);
    
    console.log(`[TitleAutocomplete] Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch suggestions');
    }
    
    const data = await response.json();
    console.log(`[TitleAutocomplete] Response data:`, data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch suggestions');
    }
    
    currentTitleSuggestions = data.suggestions || [];
    console.log(`[TitleAutocomplete] Got ${currentTitleSuggestions.length} suggestions`);
    
    if (currentTitleSuggestions.length === 0) {
      dropdown.innerHTML = `
        <div class="p-3 text-center text-gray-400 text-sm">
          No suggestions found
        </div>
      `;
      return;
    }
    
    // Display suggestions
    displayTitleSuggestions(currentTitleSuggestions, inputId, dropdownId);
    
  } catch (error) {
    console.error('[TitleAutocomplete] Error fetching suggestions:', error);
    dropdown.innerHTML = `
      <div class="p-3 text-center text-gray-400 text-sm">
        <i class="ti ti-alert-circle mr-1"></i>
        Failed to load suggestions
      </div>
    `;
  }
}

/**
 * Display title suggestions in dropdown
 * @param {Array} suggestions - Array of suggestion strings
 * @param {string} inputId - ID of the input field
 * @param {string} dropdownId - ID of the dropdown
 */
function displayTitleSuggestions(suggestions, inputId, dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  const input = document.getElementById(inputId);
  
  if (!dropdown || !input) return;
  
  const html = suggestions.map((suggestion, index) => `
    <button
      type="button"
      class="title-suggestion-item w-full text-left px-4 py-3 hover:bg-dark-600 transition-all duration-150 flex items-center gap-3 border-b border-gray-700/30 last:border-b-0 group"
      onclick="selectTitleSuggestion('${inputId}', '${dropdownId}', ${index})"
    >
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <i class="ti ti-search text-gray-400 text-sm group-hover:text-primary transition-colors"></i>
      </div>
      <span class="text-sm text-gray-200 flex-1 group-hover:text-white transition-colors leading-relaxed">${escapeHtml(suggestion)}</span>
      <i class="ti ti-arrow-up-left text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
    </button>
  `).join('');
  
  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');
}

/**
 * Select a title suggestion
 * @param {string} inputId - ID of the input field
 * @param {string} dropdownId - ID of the dropdown
 * @param {number} index - Index of the selected suggestion
 */
function selectTitleSuggestion(inputId, dropdownId, index) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  
  if (!input || !dropdown) return;
  
  const suggestion = currentTitleSuggestions[index];
  if (suggestion) {
    input.value = suggestion;
    dropdown.classList.add('hidden');
    
    // Trigger input event to update any listeners
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Show success feedback
    if (typeof showToast === 'function') {
      showToast('success', 'Title selected');
    }
  }
}

/**
 * Set active suggestion for keyboard navigation
 * @param {NodeList} items - List of suggestion items
 * @param {number} index - Index to activate
 */
function setActiveSuggestion(items, index) {
  items.forEach((item, i) => {
    if (i === index) {
      item.classList.add('active', 'bg-dark-600');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active', 'bg-dark-600');
    }
  });
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

// Expose functions globally
window.initTitleAutocomplete = initTitleAutocomplete;
window.selectTitleSuggestion = selectTitleSuggestion;

console.log('[youtube-title-autocomplete.js] Title autocomplete loaded');
