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
      
      const prompt = `Generate 15-20 highly relevant, SEO-optimized YouTube tags for this video.
Return ONLY comma-separated tags, no explanation, no numbering, no quotes.

Title: ${title}
Description: ${description || 'No description provided'}

CRITICAL TAG REQUIREMENTS:
- Total: 15-20 tags (optimal for YouTube SEO)
- Language: MUST match title language (Indonesian title = Indonesian tags, English title = English tags)
- Each tag max 30 characters
- Mix of SPECIFIC (niche) and GLOBAL (broad) keywords
- Order: Start with SPECIFIC tags first (3-5 tags), then GLOBAL tags (10-15 remaining)
- NO special characters except spaces and hyphens
- NO hashtags (# symbol)
- All tags must be searchable and discoverable

TAG STRATEGY (CRITICAL ORDER - SPECIFIC TO GLOBAL):
1. SPECIFIC/NICHE TAGS FIRST (3-5 tags):
   - Exact match from title (e.g., "432hz tibetan flute")
   - Very specific long-tail keywords (e.g., "tibetan flute healing")
   - Unique combinations (e.g., "432hz healing frequency")
   - Target specific audience (e.g., "healing flute music")
   
2. GLOBAL/BROAD TAGS NEXT (10-15 tags):
   - Category keywords (e.g., "meditation music", "healing music")
   - Related topics (e.g., "sound healing", "frequency healing")
   - Common search terms (e.g., "relaxation music", "sleep music")
   - Synonym variations (e.g., "calming music", "peaceful music")
   - Use cases (e.g., "yoga music", "study music", "spa music")

TAG CATEGORIES TO INCLUDE (IN ORDER):
✓ Exact title keywords (1-2 tags) - SPECIFIC
✓ Specific niche terms (2-3 tags) - SPECIFIC
✓ Content type (1-2 tags: "healing music", "meditation sounds") - GLOBAL
✓ Frequency/technical terms (1-2 tags: "432hz", "binaural beats") - GLOBAL
✓ Use cases (3-4 tags: "sleep music", "yoga music", "study music") - GLOBAL
✓ Mood/emotion (2-3 tags: "relaxing", "calming", "peaceful") - GLOBAL
✓ Related topics (2-3 tags: "sound healing", "stress relief") - GLOBAL
✓ Broad category (1-2 tags: "ambient music", "instrumental") - GLOBAL

EXAMPLE (English - Specific to Global order):
432hz tibetan flute, tibetan flute healing, 432hz healing frequency, healing flute music, tibetan meditation flute, 432hz music, healing frequency, meditation music, relaxation music, sleep music, stress relief music, calming music, ambient music, yoga music, spa music, peaceful music, sound healing, frequency healing, binaural beats, therapeutic music

EXAMPLE (Indonesian - Specific to Global order):
musik flute tibet 432hz, flute tibet penyembuhan, frekuensi penyembuhan 432hz, musik flute penyembuhan, flute meditasi tibet, musik 432hz, frekuensi penyembuhan, musik meditasi, musik relaksasi, musik tidur, musik penghilang stres, musik menenangkan, musik ambient, musik yoga, musik spa, musik damai, terapi suara, penyembuhan frekuensi, binaural beats, musik terapi

Return format: specific_tag1, specific_tag2, specific_tag3, global_tag1, global_tag2, global_tag3...`;
      
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
        .slice(0, 20); // Max 20 tags
      
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

CRITICAL REQUIREMENTS:
- MAXIMUM 100 characters (YouTube STRICT limit - titles longer than 100 will be rejected!)
- Aim for 60-90 characters for optimal display
- Include the main keywords naturally
- Make it engaging and clickable
- Use title case (capitalize important words)
- No clickbait or misleading content
- Professional and clear
- Return ONLY the title, no explanation, no quotes, no extra text

IMPORTANT: Count characters carefully! If your title is close to 100, make it shorter!

Example good titles (all under 100 chars):
- "432Hz Tibetan Flute | Deep Healing Music for Meditation & Sleep" (65 chars)
- "How to Master JavaScript in 30 Days | Complete Beginner Guide" (62 chars)
- "Top 10 Gaming Tips Every Player Should Know in 2024" (52 chars)
- "Live Stream: Building a Full Stack App from Scratch" (52 chars)

Return ONLY the title text, nothing else.`;
      
      console.log('[GeminiService] Generating title with model:', modelName);
      console.log('[GeminiService] Keywords:', keywords);
      
      const result = await model.generateContent(prompt);
      let title = result.response.text().trim();
      
      // Clean up the response
      title = title.replace(/^["']|["']$/g, ''); // Remove quotes
      title = title.replace(/^Title:\s*/i, ''); // Remove "Title:" prefix
      title = title.replace(/\n/g, ' '); // Replace newlines with space
      title = title.trim();
      
      // STRICT: Ensure it's not too long (YouTube HARD limit: 100 characters)
      if (title.length > 100) {
        console.warn(`[GeminiService] Title too long (${title.length} chars), truncating to 100`);
        // Try to cut at last space before 97 chars to avoid cutting words
        const truncated = title.substring(0, 97);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 80) {
          title = truncated.substring(0, lastSpace) + '...';
        } else {
          title = truncated + '...';
        }
      }
      
      console.log('[GeminiService] Generated title:', title);
      console.log('[GeminiService] Title length:', title.length, 'characters');
      
      if (title.length === 0) {
        throw new Error('No valid title generated. Please try again.');
      }
      
      if (title.length > 100) {
        throw new Error(`Generated title is too long (${title.length} characters). YouTube limit is 100 characters.`);
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
      
      const prompt = `Generate a comprehensive, SEO-optimized YouTube video description for this title: "${title}"${keywordsContext}

CRITICAL REQUIREMENTS:
- Length: 800-1500 characters (YouTube allows 5000, but aim for detailed yet focused)
- Language: MUST match the title language (if title is Indonesian, write in Indonesian; if English, write in English)
- First 150 characters are CRITICAL (shown in search results and mobile)
- Include main keywords from title in first 2 sentences
- Structure: Hook → Value → Details → Call-to-Action
- Professional, engaging, and informative tone
- NO hashtags in description body (hashtags go separately)
- NO links, NO emojis, NO promotional spam
- Use natural language, avoid keyword stuffing
- Include related keywords and synonyms throughout

STRUCTURE TEMPLATE (800-1500 characters):
1. Opening Hook (2-3 sentences, ~150 chars): Start with main keyword, describe what viewers will experience
2. Value Proposition (2-3 sentences, ~200 chars): Explain benefits and what makes this content special
3. Detailed Description (3-4 sentences, ~300 chars): Elaborate on content, features, use cases
4. Additional Context (2-3 sentences, ~200 chars): Related topics, therapeutic benefits, or background info
5. Engagement & CTA (2-3 sentences, ~150 chars): Encourage engagement (subscribe, comment, share)

SEO BEST PRACTICES:
✓ Front-load important keywords in first 150 characters
✓ Use keyword variations and synonyms naturally
✓ Include specific use cases (meditation, yoga, sleep, study, etc.)
✓ Mention benefits and outcomes
✓ Write for humans first, search engines second
✓ Use complete, grammatically correct sentences
✓ Add context about the content type and purpose
✓ Include emotional triggers and sensory language
✓ Use power words that drive engagement

EXAMPLE (English - 1200+ characters):
"Experience the profound healing power of 432Hz Tibetan Flute music, carefully crafted to restore balance and harmony to your body, mind, and spirit. This deeply relaxing soundscape combines ancient Tibetan healing traditions with the scientifically-backed 432Hz frequency, known as the natural tuning of the universe.

Immerse yourself in the soothing melodies of the Tibetan flute, tuned to the beneficial 432Hz frequency that resonates with your body's natural vibrations. This healing music is specifically designed to promote deep relaxation, reduce stress and anxiety, enhance meditation practices, and support your overall well-being. Let the calming tones wash over you, releasing tension and promoting a profound sense of peace and tranquility.

Perfect for meditation sessions, yoga practice, deep sleep, study and focus, stress relief, or simply unwinding after a long day. The 432Hz frequency is believed to help repair DNA, release toxins from the body, boost the immune system, and promote cellular healing. Many listeners report feeling more centered, grounded, and connected to their inner peace after experiencing this transformative soundscape.

Discover the therapeutic benefits of sound healing and vibrational medicine. The Tibetan flute has been used for centuries in healing ceremonies and spiritual practices across the Himalayas. Combined with ambient nature sounds and gentle harmonics, this track creates a truly immersive healing experience that transports you to a state of deep relaxation and inner calm.

Ready to experience the transformative power of 432Hz healing music? Subscribe to our channel for more relaxing soundscapes, healing frequencies, and meditation music. Share this video with someone who needs peace and healing in their life. Let us know in the comments how this music makes you feel and what benefits you experience!"

EXAMPLE (Indonesian - 1200+ characters):
"Rasakan kekuatan penyembuhan mendalam dari musik Flute Tibet 432Hz, yang dirancang khusus untuk memulihkan keseimbangan dan harmoni tubuh, pikiran, dan jiwa Anda. Soundscape yang sangat menenangkan ini menggabungkan tradisi penyembuhan Tibet kuno dengan frekuensi 432Hz yang didukung secara ilmiah, dikenal sebagai tuning alami alam semesta.

Tenggelamlah dalam melodi menenangkan dari flute Tibet, disetel ke frekuensi 432Hz yang bermanfaat dan beresonansi dengan getaran alami tubuh Anda. Musik penyembuhan ini dirancang khusus untuk meningkatkan relaksasi mendalam, mengurangi stres dan kecemasan, meningkatkan praktik meditasi, dan mendukung kesejahteraan Anda secara keseluruhan. Biarkan nada yang menenangkan membasuh Anda, melepaskan ketegangan dan mendorong rasa damai dan ketenangan yang mendalam.

Sempurna untuk sesi meditasi, praktik yoga, tidur nyenyak, belajar dan fokus, menghilangkan stres, atau sekadar bersantai setelah hari yang panjang. Frekuensi 432Hz dipercaya dapat membantu memperbaiki DNA, melepaskan racun dari tubuh, meningkatkan sistem kekebalan tubuh, dan mendorong penyembuhan seluler. Banyak pendengar melaporkan merasa lebih terpusat, membumi, dan terhubung dengan kedamaian batin mereka setelah mengalami soundscape transformatif ini.

Temukan manfaat terapeutik dari penyembuhan suara dan pengobatan vibrasi. Flute Tibet telah digunakan selama berabad-abad dalam upacara penyembuhan dan praktik spiritual di seluruh Himalaya. Dikombinasikan dengan suara alam ambient dan harmonik lembut, track ini menciptakan pengalaman penyembuhan yang benar-benar imersif yang membawa Anda ke keadaan relaksasi mendalam dan ketenangan batin.

Siap merasakan kekuatan transformatif dari musik penyembuhan 432Hz? Berlangganan channel kami untuk lebih banyak soundscape relaksasi, frekuensi penyembuhan, dan musik meditasi. Bagikan video ini dengan seseorang yang membutuhkan kedamaian dan penyembuhan dalam hidup mereka. Beri tahu kami di komentar bagaimana musik ini membuat Anda merasa dan manfaat apa yang Anda alami!"

Return ONLY the description text, no explanation, no quotes, no formatting, no hashtags.`;
      
      console.log('[GeminiService] Generating description with model:', modelName);
      console.log('[GeminiService] Title:', title.substring(0, 50));
      
      const result = await model.generateContent(prompt);
      let description = result.response.text().trim();
      
      // Clean up the response
      description = description.replace(/^["']|["']$/g, ''); // Remove quotes
      description = description.replace(/^Description:\s*/i, ''); // Remove "Description:" prefix
      
      // Ensure reasonable length (YouTube allows 5000, aim for 800-1500 for SEO)
      if (description.length > 5000) {
        description = description.substring(0, 4997) + '...';
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
