const tokenManager = require('./youtubeTokenManager'); // ⭐ Auto-refresh dengan event listener
const fs = require('fs');

// ⭐ Helper untuk mendapatkan YouTube client dari tokens atau userId
// ⭐ MULTI-CHANNEL: Tambahkan parameter channelId
async function getYouTubeClientFromTokensOrUserId(tokensOrUserId, channelId = null) {
  // Jika parameter adalah string (userId), gunakan token manager dengan channelId
  if (typeof tokensOrUserId === 'string') {
    console.log(`[YouTubeService] Getting client for userId: ${tokensOrUserId}, channelId: ${channelId || 'default'}`);
    return await tokenManager.getAuthenticatedClient(tokensOrUserId, channelId);
  }
  
  // Jika parameter adalah object (tokens), gunakan cara lama untuk backward compatibility
  const { getYouTubeClient } = require('../config/google');
  return getYouTubeClient(tokensOrUserId);
}

async function scheduleLive(tokensOrUserId, { channelId = null, title, description, privacyStatus, scheduledStartTime, streamId: existingStreamId, streamKey: manualStreamKey, enableAutoStart = false, enableAutoStop = false, tags = null, category = null, language = null, thumbnailPath = null }) {
  // ⭐ MULTI-CHANNEL: Pass channelId to get correct channel client
  const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId, channelId);
  
  console.log(`[YouTubeService.scheduleLive] Called with:`);
  console.log(`[YouTubeService.scheduleLive] - Channel ID: ${channelId || 'default'}`);
  console.log(`[YouTubeService.scheduleLive] - Title: ${title}`);
  console.log(`[YouTubeService.scheduleLive] - Existing Stream ID: ${existingStreamId || 'NOT PROVIDED'}`);
  console.log(`[YouTubeService.scheduleLive] - Manual Stream Key: ${manualStreamKey ? manualStreamKey.substring(0, 8) + '...' : 'NOT PROVIDED'}`);
  console.log(`[YouTubeService.scheduleLive] - Tags: ${tags ? tags.length : 0} tags`);
  console.log(`[YouTubeService.scheduleLive] - Thumbnail: ${thumbnailPath || 'NOT PROVIDED'}`);
  
  // ⭐ VALIDATION: Check thumbnail exists before creating broadcast
  if (thumbnailPath) {
    const fs = require('fs');
    const path = require('path');
    
    // Resolve full path
    const fullThumbnailPath = path.isAbsolute(thumbnailPath) 
      ? thumbnailPath 
      : path.join(process.cwd(), thumbnailPath);
    
    if (!fs.existsSync(fullThumbnailPath)) {
      const error = new Error(`❌ THUMBNAIL VALIDATION FAILED: File not found at ${fullThumbnailPath}`);
      error.code = 'THUMBNAIL_NOT_FOUND';
      console.error(`[YouTubeService.scheduleLive] ${error.message}`);
      console.error(`[YouTubeService.scheduleLive] ⚠️  BROADCAST CREATION SKIPPED to save API quota`);
      console.error(`[YouTubeService.scheduleLive] 💡 Please upload thumbnail and try again`);
      throw error;
    }
    
    // Check file size (YouTube limit: 2MB)
    const stats = fs.statSync(fullThumbnailPath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    if (fileSizeInMB > 2) {
      const error = new Error(`❌ THUMBNAIL VALIDATION FAILED: File too large (${fileSizeInMB.toFixed(2)}MB, max 2MB)`);
      error.code = 'THUMBNAIL_TOO_LARGE';
      console.error(`[YouTubeService.scheduleLive] ${error.message}`);
      console.error(`[YouTubeService.scheduleLive] ⚠️  BROADCAST CREATION SKIPPED to save API quota`);
      throw error;
    }
    
    console.log(`[YouTubeService.scheduleLive] ✅ Thumbnail validated: ${(fileSizeInMB * 1024).toFixed(2)}KB`);
  } else {
    console.warn(`[YouTubeService.scheduleLive] ⚠️  No thumbnail provided - broadcast will be created without thumbnail`);
  }
  // ✅ CORRECTED LOGIC: YouTube API ALWAYS creates new broadcast
  // But uses either existing stream ID (dropdown) OR finds stream ID by manual stream key
  let finalStreamId = existingStreamId;
  
  // If manual stream key provided but no existing stream ID, find the stream ID
  if (manualStreamKey && !existingStreamId) {
    console.log(`[YouTubeService.scheduleLive] 🔍 Manual stream key provided, finding stream ID...`);
    
    try {
      finalStreamId = await module.exports.findStreamIdByStreamKey(tokensOrUserId, { streamKey: manualStreamKey, channelId });
      
      if (!finalStreamId) {
        throw new Error(`Stream key not found in your YouTube channel. Please check the stream key or create it in YouTube Studio first.`);
      }
      
      console.log(`[YouTubeService.scheduleLive] ✓ Found stream ID for manual key: ${finalStreamId}`);
    } catch (err) {
      console.error(`[YouTubeService.scheduleLive] ❌ Error finding stream ID for manual key:`, err.message);
      throw new Error(`Failed to find stream for manual key: ${err.message}`);
    }
  }
  
  console.log(`[YouTubeService.scheduleLive] - Final Stream ID: ${finalStreamId || 'WILL CREATE NEW'}`);
  console.log(`[YouTubeService.scheduleLive] - Will create new stream: ${!finalStreamId ? 'YES ❌' : 'NO ✓'}`);
  console.log(`[YouTubeService.scheduleLive] - Will create new broadcast: YES ✓ (YouTube API always creates new broadcast)`);
  
  // Build snippet with optional metadata
  const snippet = {
    title: title || 'Untitled Stream',
    description: description || '',
    scheduledStartTime,
  };
  
  // Add tags if provided (max 500 characters total, YouTube limit)
  if (tags && Array.isArray(tags) && tags.length > 0) {
    snippet.tags = tags;
    console.log(`[YouTubeService.scheduleLive] - Adding ${tags.length} tags to broadcast`);
  }
  
  // Add category if provided
  if (category) {
    snippet.categoryId = category;
    console.log(`[YouTubeService.scheduleLive] - Category ID: ${category}`);
  }
  
  // Add language if provided
  if (language) {
    snippet.defaultLanguage = language;
    snippet.defaultAudioLanguage = language;
    console.log(`[YouTubeService.scheduleLive] - Language: ${language}`);
  }
  
  // ✅ ALWAYS CREATE NEW BROADCAST (YouTube API behavior)
  const broadcastRes = await yt.liveBroadcasts.insert({
    part: 'snippet,status,contentDetails',
    requestBody: {
      snippet,
      status: {
        privacyStatus: privacyStatus || 'private',
      },
      contentDetails: {
        enableAutoStart: true,  // ✅ Let YouTube auto-transition when FFmpeg connects
        enableAutoStop: false,  // ❌ Node.js controls stop manually
        enableMonitorStream: false, // ❌ Instant go live
      },
    },
  });
  
  console.log(`[YouTubeService.scheduleLive] ✓ NEW broadcast created: ${broadcastRes.data?.id}`);
  
  let streamRes = null;
  let streamId = finalStreamId;
  
  // Create new stream only if no stream ID available (neither dropdown nor manual key)
  if (!streamId) {
    console.log(`[YouTubeService.scheduleLive] ⚠️ Creating NEW stream because no stream ID available...`);
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
    console.log(`[YouTubeService.scheduleLive] ✓ Using existing stream: ${streamId} (from ${existingStreamId ? 'dropdown' : 'manual key'})`);
  }

  const broadcastId = broadcastRes.data?.id;
  const createdStreamId = streamId;

  if (broadcastId && createdStreamId) {
    console.log(`[YouTubeService.scheduleLive] Binding NEW broadcast ${broadcastId} to stream ${createdStreamId}...`);
    await yt.liveBroadcasts.bind({
      id: broadcastId,
      part: 'id,contentDetails',
      streamId: createdStreamId,
    });
    console.log(`[YouTubeService.scheduleLive] ✓ NEW broadcast bound to stream successfully`);
  }

  // Upload thumbnail if provided
  if (thumbnailPath && broadcastId) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (fs.existsSync(thumbnailPath)) {
        console.log(`[YouTubeService.scheduleLive] Uploading thumbnail: ${thumbnailPath}`);
        
        // Get mime type from file extension
        const ext = path.extname(thumbnailPath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        
        await yt.thumbnails.set({
          videoId: broadcastId,
          media: {
            mimeType: mimeType,
            body: fs.createReadStream(thumbnailPath)
          }
        });
        
        console.log(`[YouTubeService.scheduleLive] ✓ Thumbnail uploaded successfully`);
      } else {
        console.warn(`[YouTubeService.scheduleLive] ⚠️ Thumbnail file not found: ${thumbnailPath}`);
      }
    } catch (thumbnailError) {
      console.error(`[YouTubeService.scheduleLive] ❌ Error uploading thumbnail:`, thumbnailError.message);
      // Don't fail the broadcast creation, just log the error
    }
  }

  return {
    broadcast: broadcastRes.data,
    stream: streamRes ? streamRes.data : null, // null if reused existing stream
    isNewBroadcast: true // Always true for YouTube API
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
  
  /**
   * Find broadcast by stream key
   * Searches for existing broadcast that is bound to a stream with the given stream key
   */
  async findBroadcastByStreamKey(tokensOrUserId, { streamKey }) {
    console.log(`[YouTubeService.findBroadcastByStreamKey] Searching for broadcast with stream key: ${streamKey.substring(0, 8)}...`);
    
    try {
      // Step 1: Get all user's streams and find the one with matching stream key
      const streams = await module.exports.listStreams(tokensOrUserId, { maxResults: 50 });
      const matchingStream = streams.find(stream => {
        const ingestionInfo = stream.cdn?.ingestionInfo;
        const streamName = ingestionInfo?.streamName;
        return streamName === streamKey;
      });
      
      if (!matchingStream) {
        console.log(`[YouTubeService.findBroadcastByStreamKey] ❌ No stream found with key: ${streamKey.substring(0, 8)}...`);
        return null;
      }
      
      console.log(`[YouTubeService.findBroadcastByStreamKey] ✓ Found matching stream: ${matchingStream.id}`);
      
      // Step 2: Get all user's broadcasts and find the one bound to this stream
      const broadcasts = await module.exports.listBroadcasts(tokensOrUserId, { maxResults: 50 });
      const matchingBroadcast = broadcasts.find(broadcast => {
        const boundStreamId = broadcast.contentDetails?.boundStreamId;
        return boundStreamId === matchingStream.id;
      });
      
      if (!matchingBroadcast) {
        console.log(`[YouTubeService.findBroadcastByStreamKey] ❌ No broadcast found bound to stream: ${matchingStream.id}`);
        return null;
      }
      
      console.log(`[YouTubeService.findBroadcastByStreamKey] ✅ Found matching broadcast: ${matchingBroadcast.id}`);
      console.log(`[YouTubeService.findBroadcastByStreamKey] - Title: ${matchingBroadcast.snippet?.title}`);
      console.log(`[YouTubeService.findBroadcastByStreamKey] - Status: ${matchingBroadcast.status?.lifeCycleStatus}`);
      
      return {
        broadcast: matchingBroadcast,
        stream: matchingStream
      };
    } catch (error) {
      console.error(`[YouTubeService.findBroadcastByStreamKey] Error:`, error.message);
      throw error;
    }
  },
  
  /**
   * Get video metrics (viewers, likes, comments)
   */
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
  async listStreams(tokensOrUserId, { maxResults = 50, channelId = null } = {}) {
    // ⭐ MULTI-CHANNEL: Pass channelId to get correct channel client
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId, channelId);
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
  async transition(tokensOrUserId, { broadcastId, status, channelId = null }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId, channelId);
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
  async setAudience(tokensOrUserId, { videoId, selfDeclaredMadeForKids, ageRestricted, syntheticContent }) {
    const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
    
    console.log(`[YouTubeService.setAudience] Setting audience for video ${videoId}:`);
    console.log(`[YouTubeService.setAudience] - Made for Kids: ${selfDeclaredMadeForKids}`);
    console.log(`[YouTubeService.setAudience] - Age Restricted: ${ageRestricted}`);
    console.log(`[YouTubeService.setAudience] - Synthetic Content: ${syntheticContent}`);
    
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
    
    // Add synthetic content flag (YouTube API may not support this yet, but we'll try)
    if (typeof syntheticContent === 'boolean' && syntheticContent) {
      // Note: This is a placeholder - YouTube API may not have this field yet
      // We'll log it for now and implement when API supports it
      console.log(`[YouTubeService.setAudience] ⚠️ Synthetic content flag noted but may not be supported by YouTube API yet`);
    }
    
    // If no parts to update, just return success
    if (parts.length === 0) {
      console.log(`[YouTubeService.setAudience] No audience settings to update`);
      return { success: true, message: 'No audience settings to update' };
    }
    
    console.log(`[YouTubeService.setAudience] Updating parts: ${parts.join(', ')}`);
    return yt.videos.update({
      part: parts.join(','),
      requestBody: body,
    });
  },
  
  /**
   * Find stream ID by stream key (streamName)
   * Returns stream ID if found, null if not found
   */
  async findStreamIdByStreamKey(tokensOrUserId, { streamKey, channelId = null }) {
    try {
      // ⭐ MULTI-CHANNEL: Pass channelId to listStreams
      const streams = await module.exports.listStreams(tokensOrUserId, { maxResults: 50, channelId });
      
      for (const stream of streams) {
        const ingestionInfo = stream.cdn?.ingestionInfo || {};
        const streamName = ingestionInfo.streamName || '';
        
        if (streamName === streamKey) {
          console.log(`[YouTubeService] ✓ Found stream ID ${stream.id} for stream key ${streamKey.substring(0, 8)}... in channel ${channelId || 'default'}`);
          return stream.id;
        }
      }
      
      console.log(`[YouTubeService] ✗ Stream key ${streamKey.substring(0, 8)}... not found in channel ${channelId || 'default'}`);
      return null;
    } catch (err) {
      console.error(`[YouTubeService] Error finding stream by key:`, err.message);
      return null;
    }
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
  async transitionBroadcastSmart(tokensOrUserId, { broadcastId, streamId, targetStatus = 'live', channelId = null }) {
    console.log(`[YouTubeService] ========== SMART TRANSITION START ==========`);
    console.log(`[YouTubeService] Broadcast ID: ${broadcastId}`);
    console.log(`[YouTubeService] Stream ID: ${streamId || 'NOT PROVIDED'}`);
    console.log(`[YouTubeService] Target Status: ${targetStatus}`);
    console.log(`[YouTubeService] Channel ID: ${channelId || 'default'}`);
    
    // ⭐ CRITICAL: Verify broadcast is bound to stream BEFORE transition
    if (streamId) {
      console.log(`[YouTubeService] Verifying broadcast is bound to stream...`);
      const broadcast = await module.exports.getBroadcast(tokensOrUserId, broadcastId);
      
      if (!broadcast.contentDetails.boundStreamId) {
        console.error(`[YouTubeService] ❌ Broadcast is NOT bound to any stream!`);
        console.error(`[YouTubeService] ❌ This will cause "Invalid transition" error`);
        throw new Error('Broadcast must be bound to a stream before transition');
      }
      
      console.log(`[YouTubeService] ✓ Broadcast is bound to stream: ${broadcast.contentDetails.boundStreamId}`);
    }
    
    // Step 1: Wait for stream to become active (if streamId provided)
    if (streamId) {
      console.log(`[YouTubeService] Waiting for stream to become active...`);
      const streamActive = await module.exports.waitForStreamActive(tokensOrUserId, { 
        streamId, 
        maxRetries: 40,  // ⭐ INCREASED from 20 to 40 (2 minutes total)
        delayMs: 3000,
        channelId
      });
      
      if (!streamActive) {
        console.error(`[YouTubeService] ❌ Stream did not become active after 2 minutes`);
        console.error(`[YouTubeService] ❌ This usually means FFmpeg failed to connect to YouTube`);
        console.error(`[YouTubeService] ❌ Check FFmpeg logs for connection errors`);
        throw new Error('Stream did not become active - cannot transition broadcast');
      }
      
      console.log(`[YouTubeService] ✅ Stream is active, proceeding with transition`);
      
      // ⭐ NO WAIT HERE - already waited in streamingService.js (10 seconds)
      // This prevents double waiting which causes transition to fail
      console.log(`[YouTubeService] Attempting transition immediately (already waited in streamingService)...`);
    } else {
      // If no streamId, wait for FFmpeg to connect
      console.log(`[YouTubeService] ⚠️ No streamId provided, waiting 10 seconds for FFmpeg connection...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Step 2: Try transition (NO RETRY - handled by caller)
    // Retry logic is now in streamingService.js (5×6 seconds)
    try {
      // For 'live' status, try testing → live flow first
      if (targetStatus === 'live') {
        try {
          console.log(`[YouTubeService] Attempting testing → live transition...`);
          await module.exports.transition(tokensOrUserId, {
            broadcastId,
            status: 'testing',
            channelId
          });
          console.log(`[YouTubeService] ✓ Transitioned to testing`);
          
          // Wait 10 seconds before going live
          console.log(`[YouTubeService] Waiting 10 seconds before going live...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          await module.exports.transition(tokensOrUserId, {
            broadcastId,
            status: 'live',
            channelId
          });
          console.log(`[YouTubeService] ✅ Transitioned to live`);
          console.log(`[YouTubeService] ========== SMART TRANSITION SUCCESS ==========`);
          return true;
        } catch (testingErr) {
          // If testing fails, try direct to live
          if (testingErr.message && testingErr.message.includes('Invalid transition')) {
            console.log(`[YouTubeService] Testing transition failed, trying direct to live...`);
            await module.exports.transition(tokensOrUserId, {
              broadcastId,
              status: 'live',
              channelId
            });
            console.log(`[YouTubeService] ✅ Transitioned to live (direct)`);
            console.log(`[YouTubeService] ========== SMART TRANSITION SUCCESS ==========`);
            return true;
          }
          throw testingErr;
        }
      } else {
        // For other statuses, direct transition
        await module.exports.transition(tokensOrUserId, {
          broadcastId,
          status: targetStatus,
          channelId
        });
        console.log(`[YouTubeService] ✅ Transitioned to ${targetStatus}`);
        console.log(`[YouTubeService] ========== SMART TRANSITION SUCCESS ==========`);
        return true;
      }
    } catch (err) {
      console.error(`[YouTubeService] ❌ Transition failed: ${err.message}`);
      console.error(`[YouTubeService] ========== SMART TRANSITION FAILED ==========`);
      throw err;
    }
  },
  
  /**
   * Find broadcast by stream key (manual stream key lookup)
   * Returns broadcast info if found, null if not found
   */
  async findBroadcastByStreamKey(tokensOrUserId, { streamKey }) {
    console.log(`[YouTubeService] Looking for broadcast with stream key: ${streamKey?.substring(0, 8)}...`);
    
    try {
      const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
      
      // Step 1: Get all user's streams
      const streams = await yt.liveStreams.list({
        part: 'id,snippet,cdn,status',
        mine: true,
        maxResults: 50
      });
      
      // Step 2: Find stream with matching stream key
      const matchingStream = (streams.data?.items || []).find(stream => {
        const streamName = stream.cdn?.ingestionInfo?.streamName;
        return streamName === streamKey;
      });
      
      if (!matchingStream) {
        console.log(`[YouTubeService] No stream found with key: ${streamKey?.substring(0, 8)}...`);
        return null;
      }
      
      console.log(`[YouTubeService] ✓ Found matching stream: ${matchingStream.id}`);
      
      // Step 3: Get all broadcasts and find one bound to this stream
      const broadcasts = await yt.liveBroadcasts.list({
        part: 'id,snippet,status,contentDetails',
        mine: true,
        maxResults: 50
      });
      
      const matchingBroadcast = (broadcasts.data?.items || []).find(broadcast => {
        return broadcast.contentDetails?.boundStreamId === matchingStream.id;
      });
      
      if (!matchingBroadcast) {
        console.log(`[YouTubeService] No broadcast found bound to stream: ${matchingStream.id}`);
        return null;
      }
      
      console.log(`[YouTubeService] ✅ Found broadcast bound to stream: ${matchingBroadcast.id}`);
      
      return {
        broadcast: matchingBroadcast,
        stream: matchingStream,
        streamKey: streamKey
      };
      
    } catch (err) {
      console.error(`[YouTubeService] Error finding broadcast by stream key:`, err.message);
      throw err;
    }
  },
  
  /**
   * Validate stream key and return stream info
   * Returns stream info if valid, null if not found
   */
  async validateStreamKey(tokensOrUserId, { streamKey }) {
    console.log(`[YouTubeService] Validating stream key: ${streamKey?.substring(0, 8)}...`);
    
    try {
      const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
      
      // Get all user's streams
      const streams = await yt.liveStreams.list({
        part: 'id,snippet,cdn,status',
        mine: true,
        maxResults: 50
      });
      
      // Find stream with matching stream key
      const matchingStream = (streams.data?.items || []).find(stream => {
        const streamName = stream.cdn?.ingestionInfo?.streamName;
        return streamName === streamKey;
      });
      
      if (!matchingStream) {
        console.log(`[YouTubeService] ❌ Invalid stream key: ${streamKey?.substring(0, 8)}...`);
        return null;
      }
      
      console.log(`[YouTubeService] ✅ Valid stream key: ${matchingStream.id}`);
      
      return {
        id: matchingStream.id,
        title: matchingStream.snippet?.title || 'Untitled Stream',
        status: matchingStream.status?.streamStatus || 'unknown',
        ingestionAddress: matchingStream.cdn?.ingestionInfo?.ingestionAddress || '',
        streamKey: streamKey
      };
      
    } catch (err) {
      console.error(`[YouTubeService] Error validating stream key:`, err.message);
      throw err;
    }
  }
};