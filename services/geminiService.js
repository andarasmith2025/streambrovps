const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Gemini AI Service for generating YouTube tags and content
 */
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

    if (!title || title.trim().length === 0) {
      throw new Error('Title is required to generate tags');
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Try Gemini 3 Flash first, fallback to 2.5 Flash if not available
      let model;
      let modelName = 'gemini-3-flash-preview';
      
      try {
        model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        console.log('[GeminiService] Using model: gemini-3-flash-preview');
      } catch (e) {
        console.log('[GeminiService] Gemini 3 not available, falling back to 2.5 Flash');
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
        modelName = 'gemini-2.5-flash-preview-05-20';
      }
      
      const prompt = `Generate 8-10 relevant YouTube tags for this video. 
Return ONLY comma-separated tags, no explanation, no numbering, no quotes.

Title: ${title}
Description: ${description || 'No description provided'}

Requirements:
- Each tag max 30 characters
- Mix of broad and specific tags
- Include relevant keywords from title and description
- No special characters except spaces and hyphens
- Tags should be searchable and relevant
- Focus on content, topic, and category
- Include both general and niche tags

Example format: tag1, tag2, tag3, tag4`;
      
      console.log('[GeminiService] Generating tags with model:', modelName);
      console.log('[GeminiService] Title:', title.substring(0, 50));
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      console.log('[GeminiService] Model used:', modelName);
      console.log('[GeminiService] Raw response:', text);
      
      // Parse tags - handle various formats
      const tags = text
        .split(/[,\n]/) // Split by comma or newline
        .map(t => t.trim())
        .map(t => t.replace(/^["']|["']$/g, '')) // Remove quotes
        .map(t => t.replace(/^\d+\.\s*/, '')) // Remove numbering like "1. "
        .filter(t => t.length > 0 && t.length <= 30)
        .filter(t => !t.toLowerCase().includes('tag')) // Remove meta tags like "Tag 1"
        .slice(0, 10); // Max 10 tags
      
      console.log('[GeminiService] Generated tags:', tags);
      
      if (tags.length === 0) {
        throw new Error('No valid tags generated. Please try again.');
      }
      
      return tags;
    } catch (error) {
      console.error('[GeminiService] Error generating tags:', error);
      
      // Provide more specific error messages
      if (error.message && error.message.includes('API key')) {
        throw new Error('Invalid Gemini API key. Please check your API key in Settings.');
      } else if (error.message && error.message.includes('quota')) {
        throw new Error('Gemini API quota exceeded. Please try again later or check your quota.');
      } else if (error.message && error.message.includes('SAFETY')) {
        throw new Error('Content was flagged by safety filters. Please try different title/description.');
      }
      
      throw new Error(`Failed to generate tags: ${error.message}`);
    }
  }

  /**
   * Generate SEO-optimized YouTube title from keywords
   * @param {string} keywords - 2-3 keywords or short phrase
   * @param {string} apiKey - Gemini API key
   * @returns {Promise<string>} Generated title
   */
  async generateTitle(keywords, apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    if (!keywords || keywords.trim().length === 0) {
      throw new Error('Keywords are required to generate title');
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      let model;
      let modelName = 'gemini-3-flash-preview';
      
      try {
        model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      } catch (e) {
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
        modelName = 'gemini-2.5-flash-preview-05-20';
      }
      
      const prompt = `Generate a catchy, SEO-optimized YouTube video title based on these keywords: "${keywords}"

Requirements:
- Maximum 100 characters (YouTube limit - STRICT!)
- Include the main keywords naturally
- Make it engaging and clickable
- Use title case (capitalize important words)
- No clickbait or misleading content
- Professional and clear
- Return ONLY the title, no explanation, no quotes

Example good titles:
- "How to Master JavaScript in 30 Days | Complete Guide"
- "Top 10 Gaming Tips Every Player Should Know"
- "Live Stream: Building a Full Stack App from Scratch"`;
      
      console.log('[GeminiService] Generating title with model:', modelName);
      console.log('[GeminiService] Keywords:', keywords);
      
      const result = await model.generateContent(prompt);
      let title = result.response.text().trim();
      
      // Clean up the response
      title = title.replace(/^["']|["']$/g, ''); // Remove quotes
      title = title.replace(/^Title:\s*/i, ''); // Remove "Title:" prefix
      
      // Ensure it's not too long (YouTube limit: 100 characters)
      if (title.length > 100) {
        title = title.substring(0, 97) + '...';
      }
      
      console.log('[GeminiService] Generated title:', title);
      
      if (title.length === 0) {
        throw new Error('No valid title generated. Please try again.');
      }
      
      return title;
    } catch (error) {
      console.error('[GeminiService] Error generating title:', error);
      
      if (error.message && error.message.includes('API key')) {
        throw new Error('Invalid Gemini API key. Please check your API key in Settings.');
      } else if (error.message && error.message.includes('quota')) {
        throw new Error('Gemini API quota exceeded. Please try again later.');
      } else if (error.message && error.message.includes('SAFETY')) {
        throw new Error('Content was flagged by safety filters. Please try different keywords.');
      }
      
      throw new Error(`Failed to generate title: ${error.message}`);
    }
  }

  /**
   * Generate SEO-optimized YouTube description
   * @param {string} title - Video title
   * @param {string} keywords - Additional keywords or context
   * @param {string} apiKey - Gemini API key
   * @returns {Promise<string>} Generated description
   */
  async generateDescription(title, keywords, apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Title is required to generate description');
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      let model;
      let modelName = 'gemini-3-flash-preview';
      
      try {
        model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      } catch (e) {
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
        modelName = 'gemini-2.5-flash-preview-05-20';
      }
      
      const keywordsContext = keywords ? `\nAdditional context: ${keywords}` : '';
      
      const prompt = `Generate an SEO-optimized YouTube video description for this title: "${title}"${keywordsContext}

Requirements:
- 150-300 characters (concise but informative)
- Include relevant keywords naturally
- First 2-3 lines are most important (shown in search)
- Professional and engaging tone
- No hashtags, no links, no emojis
- Focus on what viewers will learn/see
- Return ONLY the description, no explanation, no quotes

Example good descriptions:
"Learn the essential JavaScript concepts every developer needs to know. This comprehensive guide covers variables, functions, async/await, and modern ES6+ features. Perfect for beginners and intermediate developers looking to level up their skills."`;
      
      console.log('[GeminiService] Generating description with model:', modelName);
      console.log('[GeminiService] Title:', title.substring(0, 50));
      
      const result = await model.generateContent(prompt);
      let description = result.response.text().trim();
      
      // Clean up the response
      description = description.replace(/^["']|["']$/g, ''); // Remove quotes
      description = description.replace(/^Description:\s*/i, ''); // Remove "Description:" prefix
      
      // Ensure reasonable length (YouTube allows 5000, but we want concise)
      if (description.length > 500) {
        description = description.substring(0, 497) + '...';
      }
      
      console.log('[GeminiService] Generated description:', description.substring(0, 100) + '...');
      
      if (description.length === 0) {
        throw new Error('No valid description generated. Please try again.');
      }
      
      return description;
    } catch (error) {
      console.error('[GeminiService] Error generating description:', error);
      
      if (error.message && error.message.includes('API key')) {
        throw new Error('Invalid Gemini API key. Please check your API key in Settings.');
      } else if (error.message && error.message.includes('quota')) {
        throw new Error('Gemini API quota exceeded. Please try again later.');
      } else if (error.message && error.message.includes('SAFETY')) {
        throw new Error('Content was flagged by safety filters. Please try different title.');
      }
      
      throw new Error(`Failed to generate description: ${error.message}`);
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
      if (typeof tag !== 'string') {
        errors.push(`Tag ${index + 1} must be a string`);
        return;
      }
      
      if (tag.length > 30) {
        errors.push(`Tag "${tag.substring(0, 20)}..." exceeds 30 characters`);
      }
      
      if (tag.length === 0) {
        errors.push(`Tag ${index + 1} is empty`);
      }
      
      // Check for invalid characters
      if (/[<>]/.test(tag)) {
        errors.push(`Tag "${tag}" contains invalid characters (< or >)`);
      }
    });
    
    // Check for duplicates
    const uniqueTags = new Set(tags.map(t => t.toLowerCase()));
    if (uniqueTags.size < tags.length) {
      errors.push('Duplicate tags found');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test API key validity
   * @param {string} apiKey - Gemini API key to test
   * @returns {Promise<Object>} { valid: boolean, model: string }
   */
  async testApiKey(apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Try Gemini 3 Flash first, fallback to 2.5 Flash
      let model;
      let modelName = 'gemini-3-flash-preview';
      
      try {
        model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      } catch (e) {
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
        modelName = 'gemini-2.5-flash-preview-05-20';
      }
      
      // Simple test prompt
      const result = await model.generateContent("Say 'OK' if you can read this.");
      const text = result.response.text();
      
      return {
        valid: text.length > 0,
        model: modelName
      };
    } catch (error) {
      console.error('[GeminiService] API key test failed:', error.message);
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new GeminiService();
