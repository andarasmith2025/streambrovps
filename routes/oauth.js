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
    
    // Store current redirect URI
    const protocol = req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/oauth2/callback`;
    
    // ⭐ SAVE STATE TO DATABASE (not session!)
    await new Promise((resolve, reject) => {
      db.run(`INSERT OR REPLACE INTO oauth_states (state, user_id, redirect_uri, created_at) 
              VALUES (?, ?, ?, datetime('now'))`,
        [state, userId, redirectUri],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log('[OAuth] State saved to database:', state, 'for user:', userId);
    
    // Use user-specific credentials if available
    const url = await getAuthUrl(state, userId, redirectUri);
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
  console.log('[OAuth] Callback received:', { code: !!req.query.code, state: !!req.query.state, error: req.query.error });
  try {
    const { code, state, error } = req.query;
    if (error) {
      console.error('[OAuth] Callback error from Google:', error);
      return res.status(400).render('error', { title: 'OAuth Error', message: error, error: { message: String(error) } });
    }
    if (!code || !state) {
      console.error('[OAuth] Missing code or state');
      return res.status(400).render('error', { title: 'OAuth Error', message: 'Invalid state or code', error: { message: 'Invalid state or code' } });
    }

    // ⭐ LOAD STATE FROM DATABASE (not session!)
    const stateData = await new Promise((resolve, reject) => {
      db.get(`SELECT user_id, redirect_uri FROM oauth_states WHERE state = ?`, [state], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!stateData) {
      console.error('[OAuth] State not found in database:', state);
      return res.status(400).render('error', { title: 'OAuth Error', message: 'Invalid or expired state', error: { message: 'State not found' } });
    }
    
    const userId = stateData.user_id;
    const redirectUri = stateData.redirect_uri;
    console.log('[OAuth] State validated from database. User ID:', userId);
    console.log('[OAuth] Exchanging code for tokens. User ID:', userId);
    const tokens = await exchangeCodeForTokens(code, userId, redirectUri);

    // Attach user credentials to tokens for later use
    const { attachUserCredentials } = require('../config/google');
    await attachUserCredentials(tokens, userId);

    // Persist tokens to session for now; also save to DB if userId available
    req.session.youtubeTokens = tokens;
    console.log('[OAuth] Tokens saved to session. Has access_token:', !!tokens.access_token, 'Has refresh_token:', !!tokens.refresh_token);
    if (userId) {
      const expiry = tokens.expiry_date || (tokens.expiry_date === 0 ? 0 : null);
      console.log('[OAuth] Saving tokens to database for user:', userId);
      db.run(`INSERT INTO youtube_tokens(user_id, access_token, refresh_token, expiry_date)
              VALUES(?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
                access_token=excluded.access_token,
                refresh_token=COALESCE(excluded.refresh_token, youtube_tokens.refresh_token),
                expiry_date=excluded.expiry_date,
                updated_at=CURRENT_TIMESTAMP`,
        [userId, tokens.access_token || null, tokens.refresh_token || null, expiry],
        (err) => {
          if (err) {
            console.error('[OAuth] Failed to persist youtube_tokens:', err.message);
          } else {
            console.log('[OAuth] ✓ Tokens successfully saved to database for user:', userId);
          }
        }
      );
    } else {
      console.warn('[OAuth] No userId in session, tokens not saved to database');
    }

    // Fetch channel basic info for UI badge
    try {
      console.log('[OAuth] Fetching YouTube channel info...');
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
        console.log('[OAuth] ✓ Channel info saved:', channel.snippet?.title);
      } else {
        console.warn('[OAuth] No channel found for this account');
      }
    } catch (apiErr) {
      // ignore here; tokens may still be valid
      console.warn('[OAuth] YouTube API test failed:', apiErr?.message);
    }

    // Flash success and redirect to dashboard
    req.session.flash = { type: 'success', message: 'YouTube connected' };
    console.log('[OAuth] ✓ OAuth callback completed successfully, redirecting to dashboard');
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
    console.log('[OAuth] /youtube/stream-keys called');
    
    if (!req.session.youtubeTokens) {
      console.log('[OAuth] No YouTube tokens in session');
      return res.status(401).json({ 
        success: false, 
        error: 'Not connected to YouTube. Please connect your YouTube account first.' 
      });
    }
    
    const userId = req.session && (req.session.userId || req.session.user_id);
    console.log('[OAuth] Fetching stream keys for user:', userId);
    const yt = getYouTubeClient(req.session.youtubeTokens, userId);
    
    // Fetch live streams directly (this contains the stream keys)
    console.log('[OAuth] Calling YouTube API liveStreams.list...');
    const response = await yt.liveStreams.list({
      part: ['snippet', 'cdn', 'status'],
      mine: true,
      maxResults: 50
    });
    
    const streams = response.data.items || [];
    console.log('[OAuth] Found', streams.length, 'live streams');
    
    // Extract unique stream keys (deduplicate by streamName)
    // Multiple broadcasts can use the same stream key, we only want unique keys
    const streamKeys = [];
    const seenStreamNames = new Set();
    
    for (const stream of streams) {
      try {
        const streamStatus = stream.status?.streamStatus;
        const hasIngestionInfo = stream.cdn?.ingestionInfo;
        const streamName = stream.cdn?.ingestionInfo?.streamName;
        
        console.log(`[OAuth] Processing stream: ${stream.snippet?.title} - Status: ${streamStatus}, Has Ingestion: ${!!hasIngestionInfo}`);
        
        if (!hasIngestionInfo || !streamName) {
          console.log(`[OAuth] Skipping ${stream.id} - no ingestion info or stream name`);
          continue;
        }
        
        // Skip if we already have this stream key
        if (seenStreamNames.has(streamName)) {
          console.log(`[OAuth] ✗ Skipped ${stream.snippet?.title} - duplicate stream key`);
          continue;
        }
        
        // Only include stream keys that are ready to use (not active broadcasts)
        // Status can be: 'inactive', 'ready', 'active', 'error', 'created'
        // We want 'inactive' and 'ready' - these are reusable stream keys
        if (streamStatus === 'inactive' || streamStatus === 'ready' || streamStatus === 'created') {
          seenStreamNames.add(streamName);
          streamKeys.push({
            id: stream.id,
            streamId: stream.id,
            title: stream.snippet?.title || 'Untitled Stream',
            description: stream.snippet?.description || '',
            status: streamStatus,
            ingestionInfo: {
              rtmpsIngestionAddress: stream.cdn.ingestionInfo.ingestionAddress,
              streamName: streamName,
              rtmpsBackupIngestionAddress: stream.cdn.ingestionInfo.backupIngestionAddress
            }
          });
          console.log(`[OAuth] ✓ Added unique stream key: ${stream.snippet?.title} (${streamStatus})`);
        } else {
          console.log(`[OAuth] ✗ Skipped ${stream.snippet?.title} - status: ${streamStatus} (active/error)`);
        }
      } catch (streamErr) {
        console.warn('[OAuth] Failed to process stream:', stream.id, streamErr.message);
      }
    }
    
    console.log('[OAuth] Finished processing, found', streamKeys.length, 'unique reusable stream keys');
    
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
