const tokenManager = require('./youtubeTokenManager'); // ⭐ Auto-refresh dengan event listener
const fs = require('fs');

// ⭐ Helper untuk mendapatkan YouTube client dari tokens atau userId
async function getYouTubeClientFromTokensOrUserId(tokensOrUserId) {
  // Jika parameter adalah string (userId), gunakan token manager
  if (typeof tokensOrUserId === 'string') {
    return await tokenManager.getYouTubeClient(tokensOrUserId);
  }
  
  // Jika parameter adalah object (tokens), gunakan cara lama untuk backward compatibility
  const { getYouTubeClient } = require('../config/google');
  return getYouTubeClient(tokensOrUserId);
}

async function scheduleLive(tokensOrUserId, { title, description, privacyStatus, scheduledStartTime, streamId: existingStreamId, enableAutoStart = false, enableAutoStop = false }) {
  const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
  
  console.log(`[YouTubeService.scheduleLive] Called with:`);
  console.log(`[YouTubeService.scheduleLive] - Title: ${title}`);
  console.log(`[YouTubeService.scheduleLive] - Existing Stream ID: ${existingStreamId || 'NOT PROVIDED'}`);
  console.log(`[YouTubeService.scheduleLive] - Will create new stream: ${!existingStreamId ? 'YES ❌' : 'NO ✓'}`);
  
  const broadcastRes = await yt.liveBroadcasts.insert({
    part: 'snippet,status,contentDetails',
    requestBody: {
      snippet: {
        title: title || 'Untitled Stream',
        description: description || '',
        scheduledStartTime,
      },
      status: {
        privacyStatus: privacyStatus || 'private',
      },
      contentDetails: {
        enableAutoStart: !!enableAutoStart,
        enableAutoStop: !!enableAutoStop,
      },
    },
  });
  
  console.log(`[YouTubeService.scheduleLive] ✓ Broadcast created: ${broadcastRes.data?.id}`);
  
  let streamRes = null;
  let streamId = existingStreamId || null;
  if (!streamId) {
    console.log(`[YouTubeService.scheduleLive] ⚠️ Creating NEW stream because streamId was not provided...`);
    streamRes = await yt.liveStreams.insert({
      part: 'snippet,cdn,contentDetails,status',
      requestBody: {
        snippet: {
          title: `${title || 'Untitled Stream'} Stream`,
        },
        cdn: {
          frameRate: 'variable',
          ingestionType: 'rtmp',
          resolution: 'variable',
        },
      },
    });
    streamId = streamRes.data?.id;
    console.log(`[YouTubeService.scheduleLive] ❌ NEW stream created: ${streamId}`);
  } else {
    console.log(`[YouTubeService.scheduleLive] ✓ Using existing stream: ${streamId}`);
  }

  const broadcastId = broadcastRes.data?.id;
  const createdStreamId = streamId;

  if (broadcastId && createdStreamId) {
    console.log(`[YouTubeService.scheduleLive] Binding broadcast ${broadcastId} to stream ${createdStreamId}...`);
    await yt.liveBroadcasts.bind({
      id: broadcastId,
      part: 'id,contentDetails',
      streamId: createdStreamId,
    });
    console.log(`[YouTubeService.scheduleLive] ✓ Broadcast bound to stream successfully`);
  }

  return {
    broadcast: broadcastRes.data,
    stream: streamRes ? streamRes.data : null, // null if reused existing stream
  };
}

module.exports = {
  scheduleLive,
  async listBroadcasts(tokensOrUserId, { maxResults = 50 } = {}) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    const params = {
      part: 'id,snippet,status,contentDetails',
      mine: true,
      maxResults,
      // broadcastType: 'event' // optional
    };
    try {
      const res = await yt.liveBroadcasts.list(params);
      return res.data?.items || [];
    } catch (err) {
      try {
        console.error('[YouTubeService] liveBroadcasts.list failed', {
          params,
          message: err?.message,
          detail: err?.response?.data || null,
        });
      } catch {}
      throw err;
    }
  },
  async getVideoMetrics(tokensOrUserId, ids = []) {
    if (!ids || (Array.isArray(ids) && ids.length === 0)) return {};
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    const list = Array.isArray(ids) ? ids : String(ids).split(',').map(s => s.trim()).filter(Boolean);
    if (!list.length) return {};
    const res = await yt.videos.list({ part: 'id,liveStreamingDetails,statistics', id: list.join(',') });
    const out = {};
    (res.data?.items || []).forEach(v => {
      out[v.id] = {
        viewers: v.liveStreamingDetails?.concurrentViewers ? Number(v.liveStreamingDetails.concurrentViewers) : 0,
        likeCount: v.statistics?.likeCount ? Number(v.statistics.likeCount) : 0,
        commentCount: v.statistics?.commentCount ? Number(v.statistics.commentCount) : 0,
        activeLiveChatId: v.liveStreamingDetails?.activeLiveChatId || null,
        actualStartTime: v.liveStreamingDetails?.actualStartTime || null,
        actualEndTime: v.liveStreamingDetails?.actualEndTime || null,
      };
    });
    return out;
  },
  async listStreams(tokensOrUserId, { maxResults = 50 } = {}) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    const res = await yt.liveStreams.list({
      part: 'id,snippet,cdn,contentDetails,status',
      mine: true,
      maxResults,
    });
    return res.data?.items || [];
  },
  async updateBroadcast(tokensOrUserId, { broadcastId, title, description, privacyStatus, scheduledStartTime, enableAutoStart, enableAutoStop }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    
    // Get current broadcast to preserve existing values
    const currentBroadcast = await this.getBroadcast(tokensOrUserId, { broadcastId });
    
    if (!currentBroadcast) {
      throw new Error('Broadcast not found');
    }
    
    // Build request body - start with current values
    const requestBody = {
      id: broadcastId,
      snippet: {
        title: currentBroadcast.snippet?.title || 'Untitled',
        description: currentBroadcast.snippet?.description || '',
        scheduledStartTime: currentBroadcast.snippet?.scheduledStartTime,
      },
      status: {
        privacyStatus: currentBroadcast.status?.privacyStatus || 'unlisted',
      },
      contentDetails: {
        // CRITICAL: Always include these required fields with proper defaults
        enableAutoStart: currentBroadcast.contentDetails?.enableAutoStart ?? false,
        enableAutoStop: currentBroadcast.contentDetails?.enableAutoStop ?? false,
        enableMonitorStream: currentBroadcast.contentDetails?.enableMonitorStream !== undefined 
          ? currentBroadcast.contentDetails.enableMonitorStream 
          : true, // Default to true if not set
      },
    };
    
    // Only update fields that are explicitly provided (not undefined)
    if (title !== undefined && title !== '(unchanged)') {
      requestBody.snippet.title = title;
    }
    if (description !== undefined) {
      requestBody.snippet.description = description;
    }
    if (privacyStatus !== undefined && privacyStatus !== '(unchanged)') {
      requestBody.status.privacyStatus = privacyStatus;
    }
    if (scheduledStartTime !== undefined) {
      requestBody.snippet.scheduledStartTime = scheduledStartTime;
    }
    
    // CRITICAL: Only update boolean fields if explicitly provided as boolean
    if (typeof enableAutoStart === 'boolean') {
      requestBody.contentDetails.enableAutoStart = enableAutoStart;
    }
    if (typeof enableAutoStop === 'boolean') {
      requestBody.contentDetails.enableAutoStop = enableAutoStop;
    }
    
    console.log(`[YouTubeService] Updating broadcast ${broadcastId}:`, {
      title: requestBody.snippet.title,
      privacyStatus: requestBody.status.privacyStatus,
      enableAutoStart: requestBody.contentDetails.enableAutoStart,
      enableAutoStop: requestBody.contentDetails.enableAutoStop,
      enableMonitorStream: requestBody.contentDetails.enableMonitorStream,
      hasContentDetails: !!currentBroadcast.contentDetails,
    });
    
    // CRITICAL: Only send snippet, status, and contentDetails - NEVER cdn
    return yt.liveBroadcasts.update({
      part: 'snippet,status,contentDetails',
      requestBody,
    });
  },
  async transition(tokensOrUserId, { broadcastId, status }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    return yt.liveBroadcasts.transition({
      id: broadcastId,
      part: 'status',
      broadcastStatus: status, // 'testing' | 'live' | 'complete'
    });
  },
  async setThumbnail(tokensOrUserId, { broadcastId, filePath, mimeType }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    return yt.thumbnails.set({
      videoId: broadcastId,
      media: {
        mimeType: mimeType || 'image/jpeg',
        body: fs.createReadStream(filePath),
      },
    });
  },
  async getBroadcast(tokensOrUserId, { broadcastId }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    const response = await yt.liveBroadcasts.list({
      part: 'snippet,status,contentDetails',
      id: broadcastId
    });
    return response.data.items?.[0] || null;
  },
  async deleteBroadcast(tokensOrUserId, { broadcastId }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    return yt.liveBroadcasts.delete({ id: broadcastId });
  },
  async setAudience(tokensOrUserId, { videoId, selfDeclaredMadeForKids, ageRestricted }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    
    // Build parts array based on what we're updating
    const parts = [];
    const body = { id: videoId };
    
    // Add status if selfDeclaredMadeForKids is provided
    if (typeof selfDeclaredMadeForKids === 'boolean') {
      body.status = { selfDeclaredMadeForKids };
      parts.push('status');
    }
    
    // Add contentRating only if ageRestricted is true
    if (typeof ageRestricted === 'boolean' && ageRestricted) {
      body.contentRating = { ytRating: 'ytAgeRestricted' };
      parts.push('contentRating');
    }
    
    // If no parts to update, just return success
    if (parts.length === 0) {
      return { success: true, message: 'No audience settings to update' };
    }
    
    return yt.videos.update({
      part: parts.join(','),
      requestBody: body,
    });
  },
  
  /**
   * Get stream status by stream ID
   * Returns stream object with status information
   */
  async getStreamStatus(tokensOrUserId, { streamId }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    const response = await yt.liveStreams.list({
      part: 'id,snippet,cdn,status',
      id: streamId
    });
    return response.data.items?.[0] || null;
  },
  
  /**
   * Check if stream is active and ready for broadcast transition
   * Returns true if stream status is 'active'
   */
  async isStreamActive(tokensOrUserId, { streamId }) {
    try {
      const stream = await module.exports.getStreamStatus(tokensOrUserId, { streamId });
      if (!stream) {
        console.log(`[YouTubeService] Stream ${streamId} not found`);
        return false;
      }
      
      const status = stream.status?.streamStatus;
      console.log(`[YouTubeService] Stream ${streamId} status: ${status}`);
      return status === 'active';
    } catch (err) {
      console.error(`[YouTubeService] Error checking stream status:`, err.message);
      return false;
    }
  },
  
  /**
   * Wait for stream to become active with retry logic
   * Returns true if stream becomes active, false if timeout
   */
  async waitForStreamActive(tokensOrUserId, { streamId, maxRetries = 20, delayMs = 3000 }) {
    console.log(`[YouTubeService] Waiting for stream ${streamId} to become active...`);
    
    for (let i = 0; i < maxRetries; i++) {
      const isActive = await module.exports.isStreamActive(tokensOrUserId, { streamId });
      
      if (isActive) {
        console.log(`[YouTubeService] ✅ Stream ${streamId} is active after ${i + 1} attempts`);
        return true;
      }
      
      if (i < maxRetries - 1) {
        console.log(`[YouTubeService] Stream not active yet, waiting ${delayMs}ms... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.warn(`[YouTubeService] ⚠️ Stream ${streamId} did not become active after ${maxRetries} attempts`);
    return false;
  },
  
  /**
   * Transition broadcast with smart retry logic
   * Waits for stream to be active before attempting transition
   */
  async transitionBroadcastSmart(tokensOrUserId, { broadcastId, streamId, targetStatus = 'live' }) {
    console.log(`[YouTubeService] Smart transition: ${broadcastId} → ${targetStatus}`);
    
    // Step 1: Wait for stream to become active (if streamId provided)
    if (streamId) {
      const streamActive = await module.exports.waitForStreamActive(tokensOrUserId, { 
        streamId, 
        maxRetries: 20, 
        delayMs: 3000 
      });
      
      if (!streamActive) {
        throw new Error('Stream did not become active - cannot transition broadcast');
      }
    } else {
      // If no streamId, just wait a bit for FFmpeg to connect
      console.log(`[YouTubeService] No streamId provided, waiting 10 seconds for FFmpeg connection...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Step 2: Try transition with retry logic
    let retries = 5;
    let lastError = null;
    
    while (retries > 0) {
      try {
        // For 'live' status, try testing → live flow first
        if (targetStatus === 'live') {
          try {
            console.log(`[YouTubeService] Attempting testing → live transition...`);
            await module.exports.transition(tokensOrUserId, {
              broadcastId,
              status: 'testing'
            });
            console.log(`[YouTubeService] ✓ Transitioned to testing`);
            
            // Wait 2 seconds before going live
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await module.exports.transition(tokensOrUserId, {
              broadcastId,
              status: 'live'
            });
            console.log(`[YouTubeService] ✅ Transitioned to live`);
            return true;
          } catch (testingErr) {
            // If testing fails, try direct to live
            if (testingErr.message && testingErr.message.includes('Invalid transition')) {
              console.log(`[YouTubeService] Testing transition failed, trying direct to live...`);
              await module.exports.transition(tokensOrUserId, {
                broadcastId,
                status: 'live'
              });
              console.log(`[YouTubeService] ✅ Transitioned to live (direct)`);
              return true;
            }
            throw testingErr;
          }
        } else {
          // For other statuses, direct transition
          await module.exports.transition(tokensOrUserId, {
            broadcastId,
            status: targetStatus
          });
          console.log(`[YouTubeService] ✅ Transitioned to ${targetStatus}`);
          return true;
        }
      } catch (err) {
        lastError = err;
        const errorMsg = err.message || '';
        
        if (errorMsg.includes('inactive') || errorMsg.includes('Invalid transition')) {
          retries--;
          if (retries > 0) {
            console.log(`[YouTubeService] Transition failed: ${errorMsg}, retrying in 3s... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } else {
          // Other error, don't retry
          throw err;
        }
      }
    }
    
    throw new Error(`Failed to transition after retries: ${lastError?.message || 'Unknown error'}`);
  }
};

