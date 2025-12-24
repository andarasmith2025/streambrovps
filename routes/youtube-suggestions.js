/**
 * YouTube Title Suggestions API Proxy
 * Proxies requests to YouTube autocomplete API to avoid CORS issues
 */

const express = require('express');
const router = express.Router();
const https = require('https');

/**
 * GET /api/youtube-suggestions?q=query
 * Fetch YouTube title suggestions
 */
router.get('/', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim().length < 2) {
      return res.json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }
    
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodedQuery}`;
    
    // Make request to YouTube API
    https.get(url, (apiRes) => {
      let data = '';
      
      apiRes.on('data', (chunk) => {
        data += chunk;
      });
      
      apiRes.on('end', () => {
        try {
          // Parse JSONP response
          // Response format: window.google.ac.h(["query", [["suggestion1"], ["suggestion2"], ...]])
          const jsonMatch = data.match(/\[.*\]/);
          
          if (!jsonMatch) {
            return res.json({
              success: false,
              error: 'Invalid response format'
            });
          }
          
          const parsed = JSON.parse(jsonMatch[0]);
          const suggestions = parsed[1] || [];
          
          // Extract suggestion strings
          const suggestionStrings = suggestions
            .map(s => s[0])
            .filter(s => s && s.trim())
            .slice(0, 10); // Limit to 10 suggestions
          
          res.json({
            success: true,
            query: query,
            suggestions: suggestionStrings
          });
          
        } catch (error) {
          console.error('[YouTube Suggestions] Parse error:', error);
          res.json({
            success: false,
            error: 'Failed to parse suggestions'
          });
        }
      });
      
    }).on('error', (error) => {
      console.error('[YouTube Suggestions] Request error:', error);
      res.json({
        success: false,
        error: 'Failed to fetch suggestions'
      });
    });
    
  } catch (error) {
    console.error('[YouTube Suggestions] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
