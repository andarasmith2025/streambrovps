/**
 * YouTube AI Generator
 * Handles AI-powered title, description, and tags generation using Gemini AI
 */

/**
 * Generate SEO-optimized title from keywords
 * @param {string} titleFieldId - ID of the title input field
 */
async function generateTitleWithGemini(titleFieldId = 'streamTitle') {
  console.log('[AI Generator] generateTitleWithGemini called with titleFieldId:', titleFieldId);
  
  const titleInput = document.getElementById(titleFieldId);
  
  if (!titleInput) {
    console.error('[AI Generator] Title input not found:', titleFieldId);
    return;
  }
  
  // Get current value as keywords
  const keywords = titleInput.value.trim();
  
  if (!keywords || keywords.length < 2) {
    showNotification('Info', 'Please enter at least 2-3 keywords first (e.g., "gaming tutorial")', 'info');
    titleInput.focus();
    return;
  }
  
  // Warn if title is already long (might be a full title, not keywords)
  if (keywords.length > 50) {
    const shouldRegenerate = await showCustomConfirm(
      'Regenerate Title?',
      `The current title seems complete. Do you want to regenerate it?<br><br><strong>Current:</strong> ${keywords.substring(0, 80)}${keywords.length > 80 ? '...' : ''}<br><br>Click <strong>OK</strong> to generate a new title, or <strong>Cancel</strong> to keep the current one.`,
      'OK',
      'Cancel'
    );
    
    if (!shouldRegenerate) {
      return;
    }
  }
  
  // Show loading state
  const originalValue = titleInput.value;
  titleInput.value = 'Generating title with AI...';
  titleInput.disabled = true;
  
  try {
    const response = await fetch('/api/gemini/generate-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keywords })
    });
    
    const data = await response.json();
    
    if (data.success && data.title) {
      titleInput.value = data.title;
      showNotification('Success', 'Title generated successfully!', 'success');
      
      // Note: Removed dispatchEvent to prevent potential auto-trigger issues
    } else {
      throw new Error(data.error || 'Failed to generate title');
    }
  } catch (error) {
    console.error('[AI Generator] Error generating title:', error);
    titleInput.value = originalValue;
    
    if (error.message.includes('API key')) {
      showNotification('Error', 'Gemini API key not configured. Please add it in Settings.', 'error');
    } else {
      showNotification('Error', error.message || 'Failed to generate title', 'error');
    }
  } finally {
    titleInput.disabled = false;
  }
}

/**
 * Generate SEO-optimized description from title
 */
async function generateDescriptionWithGemini() {
  console.log('[AI Generator] generateDescriptionWithGemini called');
  
  const titleInput = document.getElementById('streamTitle');
  const descriptionInput = document.getElementById('youtubeDescription');
  
  if (!titleInput || !descriptionInput) {
    console.error('[AI Generator] Title or description input not found');
    return;
  }
  
  const title = titleInput.value.trim();
  
  if (!title || title.length < 5) {
    showNotification('Info', 'Please enter a stream title first', 'info');
    titleInput.focus();
    return;
  }
  
  // Show loading state
  const originalValue = descriptionInput.value;
  descriptionInput.value = 'Generating description with AI...';
  descriptionInput.disabled = true;
  
  try {
    const response = await fetch('/api/gemini/generate-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title,
        keywords: '' // Optional: could add keywords field later
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.description) {
      descriptionInput.value = data.description;
      showNotification('Success', 'Description generated successfully!', 'success');
      
      // Note: Removed dispatchEvent to prevent potential issues
    } else {
      throw new Error(data.error || 'Failed to generate description');
    }
  } catch (error) {
    console.error('[AI Generator] Error generating description:', error);
    descriptionInput.value = originalValue;
    
    if (error.message.includes('API key')) {
      showNotification('Error', 'Gemini API key not configured. Please add it in Settings.', 'error');
    } else {
      showNotification('Error', error.message || 'Failed to generate description', 'error');
    }
  } finally {
    descriptionInput.disabled = false;
  }
}

console.log('[AI Generator] YouTube AI Generator loaded');
