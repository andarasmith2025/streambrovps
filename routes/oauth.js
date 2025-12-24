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
      console.log('[OAuth] Preparing to save tokens to database...');
      console.log('[OAuth] - User ID:', userId);
      console.log('[OAuth] - Access Token length:', tokens.access_token ? tokens.access_token.length : 0);
      console.log('[OAuth] - Refresh Token length:', tokens.refresh_token ? tokens.refresh_token.length : 0);
      console.log('[OAuth] - Expiry Date:', expiry ? new Date(expiry).toISOString() : 'null');
      
      // Use Promise to ensure token is saved before continuing
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO youtube_tokens(user_id, access_token, refresh_token, expiry_date, created_at, updated_at)
                VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                  access_token=excluded.access_token,
                  refresh_token=COALESCE(excluded.refresh_token, youtube_tokens.refresh_token),
                  expiry_date=excluded.expiry_date,
                  updated_at=CURRENT_TIMESTAMP`,
          [userId, tokens.access_token || null, tokens.refresh_token || null, expiry],
          function(err) {
            if (err) {
              console.error('[OAuth] ❌ Failed to persist youtube_tokens:', err.message);
              console.error('[OAuth] SQL Error:', err);
              reject(err);
            } else {
              console.log('[OAuth] ✅ Tokens successfully saved to database for user:', userId);
              console.log('[OAuth] - Rows affected:', this.changes);
              
              // Verify token was saved
              db.get('SELECT user_id, LENGTH(access_token) as token_len, expiry_date FROM youtube_tokens WHERE user_id = ?', 
                [userId], 
                (verifyErr, row) => {
                  if (verifyErr) {
                    console.error('[OAuth] Failed to verify token save:', verifyErr.message);
                  } else if (row) {
                    console.log('[OAuth] ✅ Verification: Token found in database');
                    console.log('[OAuth] - Token length:', row.token_len);
                    console.log('[OAuth] - Expiry:', row.expiry_date ? new Date(row.expiry_date).toISOString() : 'null');
                  } else {
                    console.error('[OAuth] ❌ Verification: Token NOT found in database!');
                  }
                }
              );
              
              resolve();
            }
          }
        );
      });
    } else {
      console.warn('[OAuth] ⚠️  No userId available, tokens not saved to database');
      console.warn('[OAuth] Session data:', { 
        userId: req.session.userId, 
        user_id: req.session.user_id,
        username: req.session.username 
      });
    }

    // Fetch channel basic info for UI badge and save to multi-channel table
    try {
      console.log('[OAuth] Fetching YouTube channel info...');
      const yt = getYouTubeClient(tokens, userId);
      const me = await yt.channels.list({ mine: true, part: ['snippet','statistics'] });
      const channel = me?.data?.items?.[0];
      if (channel) {
        // Save channel info to session for UI
        req.session.youtubeChannel = {
          id: channel.id,
          title: channel.snippet?.title,
          avatar: channel.snippet?.thumbnails?.default?.url || channel.snippet?.thumbnails?.high?.url || null,
          subs: channel.statistics?.subscriberCount || null
        };
        
        // Check if user already has channels
        const { getUserChannels, saveChannelTokens } = require('../services/youtubeTokenManager');
        const existingChannels = await getUserChannels(userId);
        
        // Check if this channel is already connected
        const channelExists = existingChannels.some(ch => ch.channel_id === channel.id);
        
        if (!channelExists) {
          // Save new channel to multi-channel table
          await saveChannelTokens(userId, {
            id: channel.id,
            title: channel.snippet?.title,
            avatar: channel.snippet?.thumbnails?.default?.url || channel.snippet?.thumbnails?.high?.url || null,
            subscriberCount: parseInt(channel.statistics?.subscriberCount || '0')
          }, tokens);
          
          console.log(`[OAuth] ✓ New channel saved: ${channel.snippet?.title} (${channel.id})`);
          req.session.flash = { 
            type: 'success', 
            message: `YouTube channel "${channel.snippet?.title}" connected successfully!` 
          };
        } else {
          console.log(`[OAuth] ✓ Channel already exists, updating tokens: ${channel.snippet?.title}`);
          const { updateTokensInDB } = require('../services/youtubeTokenManager');
          await updateTokensInDB(userId, channel.id, tokens);
          req.session.flash = { 
            type: 'info', 
            message: `YouTube channel "${channel.snippet?.title}" reconnected successfully!` 
          };
        }
      } else {
        console.warn('[OAuth] No channel found for this account');
        req.session.flash = { 
          type: 'warning', 
          message: 'YouTube connected but no channel found. Please make sure you have a YouTube channel.' 
        };
      }
    } catch (apiErr) {
      // ignore here; tokens may still be valid
      console.warn('[OAuth] YouTube API test failed:', apiErr?.message);
      req.session.flash = { 
        type: 'warning', 
        message: 'YouTube connected but could not fetch channel info. Please try again.' 
      };
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
    
    const userId = req.session && (req.session.userId || req.session.user_id);
    const channelId = req.query.channelId; // Optional channel ID parameter
    
    if (!userId) {
      console.log('[OAuth] No userId in session');
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated. Please login first.' 
      });
    }
    
    console.log('[OAuth] Fetching stream keys for user:', userId, 'channel:', channelId || 'default');
    
    // Use token manager to get authenticated client (with channel support)
    const tokenManager = require('../services/youtubeTokenManager');
    const oauth2Client = await tokenManager.getAuthenticatedClient(userId, channelId);
    
    if (!oauth2Client) {
      console.log('[OAuth] Failed to get authenticated client - no channels connected');
      return res.status(401).json({ 
        success: false, 
        error: 'YouTube not connected. Please connect your YouTube account first.',
        needsReconnect: true
      });
    }
    
    // Create YouTube client with authenticated oauth2Client
    const { google } = require('googleapis');
    const yt = google.youtube({ version: 'v3', auth: oauth2Client });
    
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
      count: streamKeys.length,
      channelId: channelId || 'default'
    });
    
  } catch (err) {
    console.error('YouTube stream-keys error:', err);
    
    // Handle specific error cases
    if (err.message && err.message.includes('deleted_client')) {
      return res.status(401).json({ 
        success: false, 
        error: 'YouTube connection is no longer valid. Please disconnect and reconnect your channel.',
        needsReconnect: true
      });
    }
    
    if (err.message && err.message.includes('invalid_grant')) {
      return res.status(401).json({ 
        success: false, 
        error: 'YouTube access token expired. Please reconnect your channel.',
        needsReconnect: true
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stream keys from YouTube API',
      details: err.message 
    });
  }
});

// GET /oauth2/youtube/channels - get user's connected YouTube channels
router.get('/youtube/channels', async (req, res) => {
  try {
    const userId = req.session && (req.session.userId || req.session.user_id);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated. Please login first.' 
      });
    }
    
    const { getUserChannels } = require('../services/youtubeTokenManager');
    const channels = await getUserChannels(userId);
    
    return res.json({
      success: true,
      channels: channels.map(ch => ({
        id: ch.channel_id,
        title: ch.channel_title,
        avatar: ch.channel_avatar,
        subscriberCount: ch.subscriber_count,
        isDefault: !!ch.is_default,
        connectedAt: ch.created_at
      })),
      count: channels.length
    });
    
  } catch (err) {
    console.error('YouTube channels error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch YouTube channels',
      details: err.message 
    });
  }
});

// POST /oauth2/youtube/channels/:channelId/set-default - set default channel
router.post('/youtube/channels/:channelId/set-default', async (req, res) => {
  try {
    const userId = req.session && (req.session.userId || req.session.user_id);
    const channelId = req.params.channelId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated. Please login first.' 
      });
    }
    
    // Reset all channels to non-default
    await new Promise((resolve, reject) => {
      db.run('UPDATE youtube_channels SET is_default = 0 WHERE user_id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Set the selected channel as default
    await new Promise((resolve, reject) => {
      db.run('UPDATE youtube_channels SET is_default = 1 WHERE user_id = ? AND channel_id = ?', 
        [userId, channelId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    return res.json({
      success: true,
      message: 'Default channel updated successfully'
    });
    
  } catch (err) {
    console.error('Set default channel error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to set default channel',
      details: err.message 
    });
  }
});

// DELETE /oauth2/youtube/channels/:channelId - disconnect a specific channel
router.delete('/youtube/channels/:channelId', async (req, res) => {
  try {
    const userId = req.session && (req.session.userId || req.session.user_id);
    const channelId = req.params.channelId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated. Please login first.' 
      });
    }
    
    const { deleteTokensFromDB, getUserChannels } = require('../services/youtubeTokenManager');
    
    // Check if this is the only channel
    const channels = await getUserChannels(userId);
    if (channels.length <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot disconnect the only connected channel. Connect another channel first.'
      });
    }
    
    // Delete the specific channel
    await deleteTokensFromDB(userId, channelId);
    
    // If this was the default channel, set another one as default
    const deletedChannel = channels.find(ch => ch.channel_id === channelId);
    if (deletedChannel && deletedChannel.is_default) {
      const remainingChannels = channels.filter(ch => ch.channel_id !== channelId);
      if (remainingChannels.length > 0) {
        await new Promise((resolve, reject) => {
          db.run('UPDATE youtube_channels SET is_default = 1 WHERE user_id = ? AND channel_id = ?', 
            [userId, remainingChannels[0].channel_id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }
    
    return res.json({
      success: true,
      message: 'Channel disconnected successfully'
    });
    
  } catch (err) {
    console.error('Disconnect channel error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to disconnect channel',
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
        // Delete from both old and new tables for backward compatibility
        db.run('DELETE FROM youtube_tokens WHERE user_id = ?', [userId], (err) => {
          if (err && !err.message.includes('no such table')) {
            console.warn('[OAuth] Failed to delete youtube_tokens on disconnect:', err.message);
          }
        });
        
        const { deleteTokensFromDB } = require('../services/youtubeTokenManager');
        await deleteTokensFromDB(userId); // Delete all channels
      } catch (e) {
        console.warn('[OAuth] Disconnect DB cleanup error:', e?.message);
      }
    }
    delete req.session.youtubeTokens;
    delete req.session.youtubeChannel;
    req.session.flash = { type: 'info', message: 'All YouTube channels disconnected' };
  } catch {}
  return res.redirect('/dashboard');
});