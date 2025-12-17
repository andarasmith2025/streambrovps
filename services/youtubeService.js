const { getYouTubeClient } = require('../config/google');
const fs = require('fs');

async function scheduleLive(tokens, { title, description, privacyStatus, scheduledStartTime, streamId: existingStreamId, enableAutoStart = false, enableAutoStop = false }) {
  const yt = getYouTubeClient(tokens);
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
  let streamRes = null;
  let streamId = existingStreamId || null;
  if (!streamId) {
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
  }

  const broadcastId = broadcastRes.data?.id;
  const createdStreamId = streamId;

  if (broadcastId && createdStreamId) {
    await yt.liveBroadcasts.bind({
      id: broadcastId,
      part: 'id,contentDetails',
      streamId: createdStreamId,
    });
  }

  return {
    broadcast: broadcastRes.data,
    stream: streamRes ? streamRes.data : null,
  };
}

module.exports = {
  scheduleLive,
  async listBroadcasts(tokens, { maxResults = 50 } = {}) {
    const yt = getYouTubeClient(tokens);
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
  async getVideoMetrics(tokens, ids = []) {
    if (!ids || (Array.isArray(ids) && ids.length === 0)) return {};
    const yt = getYouTubeClient(tokens);
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
  async listStreams(tokens, { maxResults = 50 } = {}) {
    const yt = getYouTubeClient(tokens);
    const res = await yt.liveStreams.list({
      part: 'id,snippet,cdn,contentDetails,status',
      mine: true,
      maxResults,
    });
    return res.data?.items || [];
  },
  async updateBroadcast(tokens, { broadcastId, title, description, privacyStatus, scheduledStartTime, enableAutoStart, enableAutoStop }) {
    const yt = getYouTubeClient(tokens);
    return yt.liveBroadcasts.update({
      part: 'snippet,status,contentDetails',
      requestBody: {
        id: broadcastId,
        snippet: {
          title,
          description,
          scheduledStartTime,
        },
        status: {
          privacyStatus,
        },
        contentDetails: {
          // Only include if defined to avoid overriding unintentionally
          ...(typeof enableAutoStart === 'boolean' ? { enableAutoStart } : {}),
          ...(typeof enableAutoStop === 'boolean' ? { enableAutoStop } : {}),
        },
      },
    });
  },
  async transition(tokens, { broadcastId, status }) {
    const yt = getYouTubeClient(tokens);
    return yt.liveBroadcasts.transition({
      id: broadcastId,
      part: 'status',
      broadcastStatus: status, // 'testing' | 'live' | 'complete'
    });
  },
  async setThumbnail(tokens, { broadcastId, filePath, mimeType }) {
    const yt = getYouTubeClient(tokens);
    return yt.thumbnails.set({
      videoId: broadcastId,
      media: {
        mimeType: mimeType || 'image/jpeg',
        body: fs.createReadStream(filePath),
      },
    });
  },
  async getBroadcast(tokens, { broadcastId }) {
    const yt = getYouTubeClient(tokens);
    const response = await yt.liveBroadcasts.list({
      part: 'snippet,status,contentDetails,cdn',
      id: broadcastId
    });
    return response.data.items?.[0] || null;
  },
  async deleteBroadcast(tokens, { broadcastId }) {
    const yt = getYouTubeClient(tokens);
    return yt.liveBroadcasts.delete({ id: broadcastId });
  },
  async setAudience(tokens, { videoId, selfDeclaredMadeForKids, ageRestricted }) {
    const yt = getYouTubeClient(tokens);
    
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
  }
};
