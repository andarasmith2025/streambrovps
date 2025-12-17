const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ success: false, error: 'Not authenticated' });
};

// GET: YouTube API Setup Page
router.get('/setup', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const credentials = await User.getYouTubeCredentials(req.session.userId);
    
    const protocol = req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/oauth2/callback`;
    
    res.render('youtube-api-setup-id', {
      title: 'Konfigurasi YouTube API',
      active: 'settings',
      user: user,
      credentials: credentials,
      redirectUri: redirectUri,
      youtubeConfigured: !!(credentials.youtube_client_id && credentials.youtube_client_secret)
    });
  } catch (error) {
    console.error('Error loading YouTube API setup page:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: 'Failed to load YouTube API setup page'
    });
  }
});

// POST: Save YouTube API Credentials
router.post('/credentials', isAuthenticated, async (req, res) => {
  try {
    const { client_id, client_secret, redirect_uri } = req.body;
    
    if (!client_id || !client_secret) {
      return res.status(400).json({
        success: false,
        error: 'Client ID and Client Secret are required'
      });
    }
    
    // Validate format
    if (!client_id.includes('.apps.googleusercontent.com')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Client ID format. Should end with .apps.googleusercontent.com'
      });
    }
    
    if (!client_secret.startsWith('GOCSPX-')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Client Secret format. Should start with GOCSPX-'
      });
    }
    
    await User.updateYouTubeCredentials(req.session.userId, {
      client_id: client_id.trim(),
      client_secret: client_secret.trim(),
      redirect_uri: redirect_uri.trim()
    });
    
    console.log(`[YouTube API] User ${req.session.userId} configured YouTube API credentials`);
    
    res.json({
      success: true,
      message: 'YouTube API credentials saved successfully'
    });
  } catch (error) {
    console.error('Error saving YouTube API credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save credentials'
    });
  }
});

// DELETE: Clear YouTube API Credentials
router.delete('/credentials', isAuthenticated, async (req, res) => {
  try {
    await User.updateYouTubeCredentials(req.session.userId, {
      client_id: null,
      client_secret: null,
      redirect_uri: null
    });
    
    // Also clear YouTube tokens
    const { db } = require('../db/database');
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM youtube_tokens WHERE user_id = ?',
        [req.session.userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // Clear session tokens
    if (req.session.youtubeTokens) {
      delete req.session.youtubeTokens;
    }
    if (req.session.youtubeChannel) {
      delete req.session.youtubeChannel;
    }
    
    console.log(`[YouTube API] User ${req.session.userId} cleared YouTube API credentials`);
    
    res.json({
      success: true,
      message: 'YouTube API credentials cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing YouTube API credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear credentials'
    });
  }
});

// GET: Test YouTube API Connection
router.get('/test-connection', isAuthenticated, async (req, res) => {
  try {
    const credentials = await User.getYouTubeCredentials(req.session.userId);
    
    if (!credentials.youtube_client_id || !credentials.youtube_client_secret) {
      return res.status(400).json({
        success: false,
        error: 'YouTube API credentials not configured'
      });
    }
    
    // Check if user has connected their YouTube account
    if (!req.session.youtubeTokens) {
      return res.json({
        success: false,
        error: 'Akun YouTube belum terkoneksi. Silakan connect akun YouTube Anda terlebih dahulu di Settings → YouTube Account Connection.',
        needsConnection: true
      });
    }
    
    // Try to get YouTube client with user's credentials
    const { getYouTubeClient } = require('../config/google');
    const youtube = getYouTubeClient(req.session.youtubeTokens, req.session.userId);
    
    // Test API call - get channel info
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true
    });
    
    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      res.json({
        success: true,
        message: 'Connection successful',
        channel: {
          title: channel.snippet.title,
          subscribers: channel.statistics.subscriberCount
        },
        quotaRemaining: 'Check Google Cloud Console for quota details'
      });
    } else {
      res.json({
        success: false,
        error: 'No channel found for this account'
      });
    }
  } catch (error) {
    console.error('Error testing YouTube API connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test connection'
    });
  }
});

// GET: Fetch YouTube Stream Keys
router.get('/stream-keys', isAuthenticated, async (req, res) => {
  try {
    // Check if user has connected their YouTube account
    if (!req.session.youtubeTokens) {
      return res.json({
        success: false,
        error: 'YouTube account not connected. Please connect your YouTube account first.'
      });
    }
    
    const { getYouTubeClient } = require('../config/google');
    const youtube = getYouTubeClient(req.session.youtubeTokens, req.session.userId);
    
    // Fetch live broadcasts (streams)
    const response = await youtube.liveBroadcasts.list({
      part: ['snippet', 'contentDetails', 'status'],
      mine: true,
      maxResults: 50
    });
    
    const broadcasts = response.data.items || [];
    
    // For each broadcast, get the stream details (which contains ingestion info)
    const streamKeys = [];
    for (const broadcast of broadcasts) {
      try {
        const streamId = broadcast.contentDetails?.boundStreamId;
        if (streamId) {
          const streamResponse = await youtube.liveStreams.list({
            part: ['snippet', 'cdn', 'status'],
            id: [streamId]
          });
          
          const stream = streamResponse.data.items?.[0];
          if (stream && stream.cdn?.ingestionInfo) {
            streamKeys.push({
              id: broadcast.id,
              streamId: streamId,
              title: broadcast.snippet?.title || 'Untitled Stream',
              description: broadcast.snippet?.description || '',
              scheduledStartTime: broadcast.snippet?.scheduledStartTime,
              status: broadcast.status?.lifeCycleStatus,
              privacyStatus: broadcast.status?.privacyStatus,
              ingestionInfo: {
                rtmpsIngestionAddress: stream.cdn.ingestionInfo.ingestionAddress,
                streamName: stream.cdn.ingestionInfo.streamName,
                rtmpsBackupIngestionAddress: stream.cdn.ingestionInfo.backupIngestionAddress
              }
            });
          }
        }
      } catch (streamErr) {
        console.warn('Failed to fetch stream details for broadcast:', broadcast.id, streamErr.message);
      }
    }
    
    return res.json({
      success: true,
      streamKeys: streamKeys,
      count: streamKeys.length
    });
    
  } catch (error) {
    console.error('Error fetching YouTube stream keys:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stream keys from YouTube API',
      details: error.message
    });
  }
});

module.exports = router;
