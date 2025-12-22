const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const youtubeService = require('../services/youtubeService');
const tokenManager = require('../services/youtubeTokenManager'); // ⭐ Token Manager dengan Event Listener
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');
const tmpDir = path.join(__dirname, '..', 'uploads', 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Set audience (made for kids, age restriction) on a video/broadcast
router.post('/broadcasts/:id/audience', async (req, res) => {
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    const { selfDeclaredMadeForKids, ageRestricted } = req.body || {};
    const resp = await youtubeService.setAudience(tokens, {
      videoId: req.params.id,
      selfDeclaredMadeForKids: typeof selfDeclaredMadeForKids === 'boolean' ? selfDeclaredMadeForKids : undefined,
      ageRestricted: typeof ageRestricted === 'boolean' ? ageRestricted : undefined,
    });
    return res.json({ success: true, result: resp.data || resp });
  } catch (err) {
    console.error('[YouTube] set audience error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to set audience' });
  }
});

// Get single broadcast
router.get('/broadcasts/:id', async (req, res) => {
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const broadcast = await youtubeService.getBroadcast(tokens, { broadcastId: id });
    return res.json({ success: true, broadcast });
  } catch (err) {
    console.error('[YouTube] get broadcast error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to get broadcast' });
  }
});

// Delete a broadcast
router.delete('/broadcasts/:id', async (req, res) => {
  try {
    console.log(`[YouTube] Attempting to delete broadcast: ${req.params.id}`);
    const tokens = await getTokensFromReq(req);
    if (!tokens) {
      console.warn('[YouTube] Delete failed - YouTube not connected');
      return res.status(401).json({ error: 'YouTube not connected' });
    }
    const id = req.params.id;
    if (!id) {
      console.warn('[YouTube] Delete failed - no broadcast ID provided');
      return res.status(400).json({ error: 'id is required' });
    }
    
    console.log(`[YouTube] Calling YouTube API to delete broadcast ${id}`);
    await youtubeService.deleteBroadcast(tokens, { broadcastId: id });
    console.log(`[YouTube] ✓ Broadcast ${id} deleted successfully from YouTube`);
    
    return res.json({ success: true, message: 'Broadcast deleted from YouTube' });
  } catch (err) {
    console.error('[YouTube] Delete broadcast error:', err?.response?.data || err.message);
    console.error('[YouTube] Full error:', err);
    return res.status(500).json({ 
      error: 'Failed to delete broadcast from YouTube', 
      details: err?.response?.data?.error?.message || err.message 
    });
  }
});

// Live metrics for videos (viewers/likes/comments)
router.get('/api/metrics', async (req, res) => {
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    const ids = String(req.query.ids || '').split(',').map(s=>s.trim()).filter(Boolean);
    if (!ids.length) return res.json({ items: {} });
    const data = await youtubeService.getVideoMetrics(tokens, ids);
    return res.json({ items: data });
  } catch (err) {
    console.error('[YouTube] metrics error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Update broadcast metadata/jadwal
router.patch('/broadcasts/:id', async (req, res) => {
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    const { title, description, privacyStatus, scheduledStartTime, enableAutoStart, enableAutoStop } = req.body || {};
    const resp = await youtubeService.updateBroadcast(tokens, {
      broadcastId: req.params.id,
      title,
      description,
      privacyStatus,
      scheduledStartTime,
      enableAutoStart,
      enableAutoStop,
    });
    return res.json({ success: true, result: resp.data || resp });
  } catch (err) {
    console.error('[YouTube] update broadcast error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to update broadcast' });
  }
});

// Bulk update broadcast (supports additional settings)
router.patch('/broadcasts/:id/bulk-update', async (req, res) => {
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    
    const { 
      title, 
      description, 
      privacyStatus, 
      scheduledStartTime, 
      enableAutoStart, 
      enableAutoStop,
      selfDeclaredMadeForKids,
      ageRestricted,
      syntheticContent
    } = req.body || {};
    
    // Update broadcast metadata
    if (title || description || privacyStatus || scheduledStartTime || 
        typeof enableAutoStart === 'boolean' || typeof enableAutoStop === 'boolean') {
      await youtubeService.updateBroadcast(tokens, {
        broadcastId: req.params.id,
        title,
        description,
        privacyStatus,
        scheduledStartTime,
        enableAutoStart,
        enableAutoStop,
      });
    }
    
    // Update audience settings (made for kids, age restricted)
    if (typeof selfDeclaredMadeForKids === 'boolean' || typeof ageRestricted === 'boolean') {
      await youtubeService.setAudience(tokens, {
        videoId: req.params.id,
        selfDeclaredMadeForKids,
        ageRestricted,
      });
    }
    
    // Note: Synthetic content is not supported by YouTube API yet
    // It's included in the UI for future compatibility
    
    return res.json({ success: true, message: 'Broadcast updated' });
  } catch (err) {
    console.error('[YouTube] bulk update broadcast error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to update broadcast', details: err?.response?.data?.error?.message || err.message });
  }
});

// Audience (made for kids) endpoint removed per API limitations

// Transition broadcast status: testing | live | complete
router.post('/broadcasts/:id/transition', async (req, res) => {
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    const { status } = req.body || {};
    if (!status || !['testing','live','complete'].includes(String(status))) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const resp = await youtubeService.transition(tokens, { broadcastId: req.params.id, status });
    return res.json({ success: true, result: resp.data || resp });
  } catch (err) {
    console.error('[YouTube] transition error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to transition broadcast' });
  }
});
const upload = multer({ dest: tmpDir });

// Root -> redirect to manage
router.get('/', (req, res) => res.redirect('/youtube/manage'));

// Manage page (simple page to manage YouTube items)
router.get('/manage', (req, res) => {
  if (!req.session || (!req.session.youtubeTokens && !(req.session.userId || req.session.user_id))) {
    return res.redirect('/dashboard');
  }
  const youtubeConnected = !!(req.session && req.session.youtubeTokens);
  return res.render('youtube_manage', { title: 'YouTube Manage', active: 'youtube-manage', youtubeConnected });
});

// List user's live streams (ingestion info + masked stream key)
router.get('/api/streams', async (req, res) => {
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    const items = await youtubeService.listStreams(tokens, { maxResults: 50 });
    const mapped = (items || []).map((it) => {
      const info = it.cdn?.ingestionInfo || {};
      const key = info.streamName || '';
      const masked = key ? key.replace(/.(?=.{4}$)/g, '*') : null;
      const ingestion = info.ingestionAddress || '';
      const rtmp = ingestion && key ? `${ingestion.replace('rtmp://', 'rtmps://')}/${key}` : null;
      return {
        id: it.id,
        title: it.snippet?.title || '',
        status: it.status?.streamStatus || it.status?.healthStatus?.status || '',
        ingestionAddress: ingestion,
        streamKeyMasked: masked,
        rtmpUrl: rtmp,
        createdAt: it.snippet?.publishedAt || null,
      };
    });
    return res.json({ items: mapped });
  } catch (err) {
    console.error('[YouTube] list streams error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to list streams' });
  }
});

// Upload and set broadcast thumbnail
router.post('/broadcasts/:id/thumbnail', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'File is required' });
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    const resp = await youtubeService.setThumbnail(tokens, { broadcastId: req.params.id, filePath: file.path, mimeType: file.mimetype });
    try { fs.unlinkSync(file.path); } catch {}
    return res.json({ success: true, result: resp.data || resp });
  } catch (err) {
    try { if (file?.path) fs.unlinkSync(file.path); } catch {}
    console.error('[YouTube] set thumbnail error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to set thumbnail' });
  }
});

async function getTokensFromReq(req) {
  const userId = req.session && (req.session.userId || req.session.user_id);
  
  if (!userId) {
    console.log('[getTokensFromReq] No userId in session');
    return null;
  }
  
  // ⭐ ALWAYS use database as source of truth for VPS/background processes
  // Session tokens are unreliable for long-running streams
  try {
    const oauth2Client = await tokenManager.getAuthenticatedClient(userId);
    
    if (!oauth2Client) {
      console.log('[getTokensFromReq] Failed to get authenticated client');
      // Clear session if exists
      if (req.session && req.session.youtubeTokens) {
        delete req.session.youtubeTokens;
      }
      return null;
    }
    
    // Get credentials from client
    const credentials = oauth2Client.credentials;
    
    // Update session for web UI consistency
    if (req.session) {
      req.session.youtubeTokens = {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expiry_date: credentials.expiry_date
      };
    }
    
    return credentials;
  } catch (err) {
    console.error('[getTokensFromReq] Error:', err.message);
    
    // Clear invalid session
    if (req.session && req.session.youtubeTokens) {
      delete req.session.youtubeTokens;
    }
    
    return null;
  }
}

router.post('/schedule-live', async (req, res) => {
  try {
    const maybeTokens = await getTokensFromReq(req);
    const tokens = maybeTokens && maybeTokens.access_token ? maybeTokens : null;
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });

    const { title, description, privacyStatus, scheduledStartTime, streamId, enableAutoStart, enableAutoStop } = req.body || {};
    if (!title || !scheduledStartTime) return res.status(400).json({ error: 'title and scheduledStartTime are required' });

    const result = await youtubeService.scheduleLive(tokens, { title, description, privacyStatus, scheduledStartTime, streamId, enableAutoStart, enableAutoStop });
    return res.json({ success: true, broadcast: result.broadcast, stream: result.stream });
  } catch (err) {
    console.error('[YouTube] schedule-live error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to schedule live', detail: err?.response?.data || err.message });
  }
});

// List upcoming broadcasts (JSON)
router.get('/api/broadcasts', async (req, res) => {
  try {
    console.log('[YouTube API] /api/broadcasts called');
    const tokens = await getTokensFromReq(req);
    if (!tokens) {
      console.log('[YouTube API] No tokens found - user not connected');
      return res.status(401).json({ 
        error: 'YouTube not connected',
        message: 'Please connect your YouTube account first',
        needsReconnect: true
      });
    }
    
    if (!tokens.access_token) {
      console.log('[YouTube API] No access token - user needs to reconnect');
      return res.status(401).json({ 
        error: 'YouTube access token missing',
        message: 'Please reconnect your YouTube account',
        needsReconnect: true
      });
    }
    
    // Log token status
    const now = Date.now();
    const expiry = tokens.expiry_date ? Number(tokens.expiry_date) : 0;
    if (expiry) {
      const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
      if (minutesUntilExpiry < 0) {
        console.log(`[YouTube API] ⚠️  Token EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
      } else {
        console.log(`[YouTube API] Token valid (expires in ${minutesUntilExpiry} minutes)`);
      }
    }
    const status = ['all','upcoming','active','completed'].includes(String(req.query.status || '').toLowerCase())
      ? String(req.query.status).toLowerCase() : 'upcoming';
    const all = await youtubeService.listBroadcasts(tokens, { maxResults: 50 });
    const debug = String(req.query.debug || '').toLowerCase() === '1' || String(req.query.debug || '').toLowerCase() === 'true';
    if (debug) {
      return res.json({ items: all || [], debug: true });
    }
    
    // If status is 'all', return all broadcasts without filtering
    if (status === 'all') {
      return res.json({ items: all || [] });
    }
    // Augment timestamps with videos.liveStreamingDetails to avoid lifecycle/timestamp inconsistencies
    let metricsMap = {};
    try {
      const ids = (all || []).map(x => x.id).filter(Boolean);
      if (ids.length) metricsMap = await youtubeService.getVideoMetrics(tokens, ids);
    } catch (e) {
      // non-fatal
      console.warn('[YouTube] metrics fetch failed, fallback to snippet timestamps only');
    }

    const items = (all || []).filter(it => {
      const life = (it.status?.lifeCycleStatus || '').toLowerCase();
      const hasLife = !!life;
      const snip = it.snippet || {};
      const m = metricsMap[it.id] || {};
      const started = !!(snip.actualStartTime || m.actualStartTime);
      const ended = !!(snip.actualEndTime || m.actualEndTime);
      const hasViewers = typeof m.viewers === 'number' ? m.viewers > 0 : false;

      if (status === 'active') {
        if (hasViewers) return true;
        return hasLife
          ? ['live','testing','livestarting','teststarting'].includes(life) || (started && !ended)
          : (started && !ended);
      }
      if (status === 'completed') {
        return hasLife
          ? ['complete','completestarting'].includes(life)
          : ended;
      }
      // upcoming: 'created' OR 'ready' but must not have started, no viewers
      if (hasLife) {
        if (life === 'created' || life === 'ready') return !started && !hasViewers;
        return false;
      }
      return (!started && !ended && !hasViewers);
    });
    return res.json({ items });
  } catch (err) {
    const detail = err?.response?.data || null;
    const errorCode = detail?.error || detail?.error_description || '';
    const message = (detail && detail.error && detail.error.message) ? detail.error.message : (err && err.message ? err.message : 'Unknown error');
    
    // ⭐ If error is "deleted_client", clear session and suggest reconnect
    if (errorCode === 'deleted_client' || message.includes('deleted_client')) {
      console.error('[YouTube API] ❌ OAuth client deleted or invalid - clearing session');
      if (req.session && req.session.youtubeTokens) {
        delete req.session.youtubeTokens;
      }
      return res.status(401).json({ 
        error: 'OAuth client invalid',
        message: 'Your YouTube connection is no longer valid. Please disconnect and reconnect your channel.',
        needsReconnect: true
      });
    }
    
    console.error('[YouTube] list broadcasts error:', detail || message);
    return res.status(500).json({ error: 'Failed to list broadcasts', message, detail });
  }
});

// Simple duplicate: create a new broadcast based on an existing one's metadata
router.post('/broadcasts/:id/duplicate', async (req, res) => {
  try {
    const tokens = await getTokensFromReq(req);
    if (!tokens) return res.status(401).json({ error: 'YouTube not connected' });
    const { scheduledStartTime } = req.body || {};
    if (!scheduledStartTime) return res.status(400).json({ error: 'scheduledStartTime is required' });

    // Find source broadcast from user's list
    const all = await youtubeService.listBroadcasts(tokens, { maxResults: 50 });
    const src = (all || []).find(x => x.id === req.params.id);
    if (!src) return res.status(404).json({ error: 'Source broadcast not found' });

    const payload = {
      title: src.snippet?.title || 'Untitled',
      description: src.snippet?.description || '',
      privacyStatus: src.status?.privacyStatus || 'unlisted',
      scheduledStartTime,
    };
    const result = await youtubeService.scheduleLive(tokens, payload);
    const newId = result?.broadcast?.id;

    // Try to copy thumbnail from source to new broadcast
    let thumbUrl = null;
    try {
      const t = src.snippet?.thumbnails || {};
      thumbUrl = t.maxres?.url || t.standard?.url || t.high?.url || t.medium?.url || t.default?.url || null;
      if (newId && thumbUrl) {
        const outPath = path.join(tmpDir, `dup_${newId}.jpg`);
        await new Promise((resolve, reject) => {
          const file = fs.createWriteStream(outPath);
          https.get(thumbUrl, (resp) => {
            if (resp.statusCode !== 200) {
              file.close(() => fs.unlink(outPath, ()=>resolve()));
              return resolve();
            }
            resp.pipe(file);
            file.on('finish', () => file.close(resolve));
          }).on('error', (e) => {
            try { file.close(()=>{}); fs.unlinkSync(outPath); } catch {}
            resolve();
          });
        });
        if (fs.existsSync(outPath)) {
          try {
            await youtubeService.setThumbnail(tokens, { broadcastId: newId, filePath: outPath, mimeType: 'image/jpeg' });
          } finally {
            try { fs.unlinkSync(outPath); } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('[YouTube] duplicate thumbnail copy skipped:', e?.message || e);
    }

    return res.json({ success: true, broadcast: result.broadcast, stream: result.stream, thumbnailCopied: !!thumbUrl });
  } catch (err) {
    const detail = err?.response?.data || null;
    const message = (detail && detail.error && detail.error.message) ? detail.error.message : (err && err.message ? err.message : 'Unknown error');
    console.error('[YouTube] duplicate broadcast error:', detail || message);
    return res.status(500).json({ error: 'Failed to duplicate broadcast', message, detail });
  }
});

// ⭐ Helper function menggunakan Token Manager dengan Event Listener
// Token akan otomatis di-refresh dan disimpan ke database
async function getTokensForUser(userId) {
  if (!userId) return null;
  
  try {
    // Use the new token manager with event listener
    const oauth2Client = await tokenManager.getAuthenticatedClient(userId);
    
    if (!oauth2Client) {
      console.log(`[getTokensForUser] No authenticated client for user ${userId}`);
      return null;
    }
    
    // Return credentials in expected format
    return oauth2Client.credentials;
  } catch (error) {
    console.error(`[getTokensForUser] Error:`, error.message);
    return null;
  }
}

// Export router and helper function
module.exports = router;
module.exports.getTokensForUser = getTokensForUser;
