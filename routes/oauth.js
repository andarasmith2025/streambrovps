const express = require('express');
const crypto = require('crypto');
const { getAuthUrl, exchangeCodeForTokens, getYouTubeClient } = require('../config/google');
const { db } = require('../db/database');

const router = express.Router();

// GET /oauth2/login - start OAuth flow
router.get('/login', async (req, res) => {
  try {
    const userId = req.session && (req.session.userId || req.session.user_id);
    
    // Check if user has configured their own API credentials
    if (!userId) {
      return res.status(401).render('error', { 
        title: 'Error', 
        message: 'Anda harus login terlebih dahulu', 
        error: { message: 'Unauthorized' } 
      });
    }
    
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauth_state = state;
    
    // Use user-specific credentials if available
    const url = await getAuthUrl(state, userId);
    return res.redirect(url);
  } catch (error) {
    console.error('[OAuth] Login error:', error);
    return res.status(500).render('error', { 
      title: 'Error', 
      message: 'Gagal memulai OAuth flow. Pastikan Anda sudah mengkonfigurasi YouTube API credentials di Settings.', 
      error: error 
    });
  }
});

// GET /oauth2/callback - handle Google OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.status(400).render('error', { title: 'OAuth Error', message: error, error: { message: String(error) } });
    }
    if (!code || !state || state !== req.session.oauth_state) {
      return res.status(400).render('error', { title: 'OAuth Error', message: 'Invalid state or code', error: { message: 'Invalid state or code' } });
    }

    const userId = req.session && (req.session.userId || req.session.user_id);
    const tokens = await exchangeCodeForTokens(code, userId);

    // Attach user credentials to tokens for later use
    const { attachUserCredentials } = require('../config/google');
    await attachUserCredentials(tokens, userId);

    // Persist tokens to session for now; also save to DB if userId available
    req.session.youtubeTokens = tokens;
    if (userId) {
      const expiry = tokens.expiry_date || (tokens.expiry_date === 0 ? 0 : null);
      db.run(`INSERT INTO youtube_tokens(user_id, access_token, refresh_token, expiry_date)
              VALUES(?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
                access_token=excluded.access_token,
                refresh_token=COALESCE(excluded.refresh_token, youtube_tokens.refresh_token),
                expiry_date=excluded.expiry_date,
                updated_at=CURRENT_TIMESTAMP`,
        [userId, tokens.access_token || null, tokens.refresh_token || null, expiry],
        (err) => {
          if (err) console.warn('[OAuth] Failed to persist youtube_tokens:', err.message);
        }
      );
    }

    // Fetch channel basic info for UI badge
    try {
      const yt = getYouTubeClient(tokens, userId);
      const me = await yt.channels.list({ mine: true, part: ['snippet','statistics'] });
      const channel = me?.data?.items?.[0];
      if (channel) {
        req.session.youtubeChannel = {
          id: channel.id,
          title: channel.snippet?.title,
          avatar: channel.snippet?.thumbnails?.default?.url || channel.snippet?.thumbnails?.high?.url || null,
          subs: channel.statistics?.subscriberCount || null
        };
      }
    } catch (apiErr) {
      // ignore here; tokens may still be valid
      console.warn('YouTube API test failed:', apiErr?.message);
    }

    // Flash success and redirect to dashboard
    req.session.flash = { type: 'success', message: 'YouTube connected' };
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.status(500).render('error', { title: 'Error', message: 'OAuth callback failed', error: err });
  }
});

// GET /oauth2/youtube/me - test endpoint to fetch channel info
router.get('/youtube/me', async (req, res) => {
  try {
    if (!req.session.youtubeTokens) return res.status(401).json({ error: 'Not connected' });
    const userId = req.session && (req.session.userId || req.session.user_id);
    const yt = getYouTubeClient(req.session.youtubeTokens, userId);
    const response = await yt.channels.list({ mine: true, part: ['snippet','statistics'] });
    return res.json(response.data);
  } catch (err) {
    console.error('YouTube me error:', err);
    return res.status(500).json({ error: 'Failed to fetch channel info' });
  }
});

// GET /oauth2/youtube/stream-keys - fetch available stream keys
router.get('/youtube/stream-keys', async (req, res) => {
  try {
    if (!req.session.youtubeTokens) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not connected to YouTube. Please connect your YouTube account first.' 
      });
    }
    
    const userId = req.session && (req.session.userId || req.session.user_id);
    const yt = getYouTubeClient(req.session.youtubeTokens, userId);
    
    // Fetch live broadcasts (streams)
    const response = await yt.liveBroadcasts.list({
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
          const streamResponse = await yt.liveStreams.list({
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
    
  } catch (err) {
    console.error('YouTube stream-keys error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stream keys from YouTube API',
      details: err.message 
    });
  }
});

module.exports = router;

// GET /oauth2/disconnect - revoke local session (simple disconnect)
router.get('/disconnect', async (req, res) => {
  try {
    const userId = req.session && (req.session.userId || req.session.user_id);
    if (userId) {
      try {
        db.run('DELETE FROM youtube_tokens WHERE user_id = ?', [userId], (err) => {
          if (err) console.warn('[OAuth] Failed to delete youtube_tokens on disconnect:', err.message);
        });
      } catch (e) {
        console.warn('[OAuth] Disconnect DB cleanup error:', e?.message);
      }
    }
    delete req.session.youtubeTokens;
    delete req.session.youtubeChannel;
    req.session.flash = { type: 'info', message: 'YouTube disconnected' };
  } catch {}
  return res.redirect('/dashboard');
});
