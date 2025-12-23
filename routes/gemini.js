const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const User = require('../models/User');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
};

/**
 * POST /api/gemini/generate-tags
 * Generate YouTube tags from title and description
 */
router.post('/generate-tags', isAuthenticated, async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.session.userId;
    
    console.log('[Gemini API] Generate tags request:', { title: title?.substring(0, 50), userId });
    
    // Validate input
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    
    // Get user's Gemini API key
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (!user.gemini_api_key) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key not configured. Please add it in Settings → Gemini AI Settings.'
      });
    }
    
    // Generate tags
    const tags = await geminiService.generateTags(
      title,
      description || '',
      user.gemini_api_key
    );
    
    console.log('[Gemini API] Generated tags:', tags);
    
    res.json({
      success: true,
      tags,
      count: tags.length
    });
  } catch (error) {
    console.error('[Gemini API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate tags'
    });
  }
});

/**
 * POST /api/gemini/validate-tags
 * Validate tags array
 */
router.post('/validate-tags', isAuthenticated, (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!tags) {
      return res.status(400).json({
        success: false,
        error: 'Tags array is required'
      });
    }
    
    const validation = geminiService.validateTags(tags);
    
    res.json({
      success: validation.valid,
      ...validation
    });
  } catch (error) {
    console.error('[Gemini API] Validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate tags'
    });
  }
});

/**
 * POST /api/gemini/test-key
 * Test Gemini API key validity
 */
router.post('/test-key', isAuthenticated, async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }
    
    const isValid = await geminiService.testApiKey(apiKey);
    
    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'API key is valid' : 'API key is invalid'
    });
  } catch (error) {
    console.error('[Gemini API] Test key error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test API key'
    });
  }
});

module.exports = router;
