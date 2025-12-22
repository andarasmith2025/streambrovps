// services/youtubeAutoStartStopService.js
// Dedicated service for handling Auto Start/Stop updates
// This is a separate service due to YouTube API's strict requirements

const tokenManager = require('./youtubeTokenManager');

/**
 * Helper to get YouTube client from tokens or userId
 */
async function getYouTubeClientFromTokensOrUserId(tokensOrUserId) {
  if (typeof tokensOrUserId === 'string') {
    return await tokenManager.getYouTubeClient(tokensOrUserId);
  }
  
  const { getYouTubeClient } = require('../config/google');
  return getYouTubeClient(tokensOrUserId);
}

/**
 * Get broadcast details
 */
async function getBroadcast(tokensOrUserId, { broadcastId }) {
  const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
  const response = await yt.liveBroadcasts.list({
    part: 'snippet,status,contentDetails',
    id: broadcastId
  });
  return response.data.items?.[0] || null;
}

/**
 * Update Auto Start/Stop settings for a single broadcast
 * Uses the correct Fetch-Modify-Update pattern
 * 
 * @param {string|object} tokensOrUserId - User ID or tokens object
 * @param {object} options - Update options
 * @param {string} options.broadcastId - Broadcast ID to update
 * @param {boolean} options.enableAutoStart - Enable auto start (optional)
 * @param {boolean} options.enableAutoStop - Enable auto stop (optional)
 * @returns {Promise<object>} Updated broadcast data
 */
async function updateAutoStartStop(tokensOrUserId, { broadcastId, enableAutoStart, enableAutoStop }) {
  const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
  
  console.log(`[AutoStartStop] Updating broadcast ${broadcastId}:`, {
    enableAutoStart,
    enableAutoStop
  });
  
  // 1. FETCH: Get current broadcast data (REQUIRED)
  const current = await getBroadcast(tokensOrUserId, { broadcastId });
  
  if (!current) {
    throw new Error('Broadcast not found');
  }
  
  console.log(`[AutoStartStop] Current contentDetails:`, current.contentDetails);
  
  // 2. MODIFY: Build clean contentDetails (only writable fields)
  const contentDetails = {
    // Only include the 3 writable fields
    enableAutoStart: typeof enableAutoStart === 'boolean' 
      ? enableAutoStart 
      : (current.contentDetails?.enableAutoStart ?? false),
    enableAutoStop: typeof enableAutoStop === 'boolean' 
      ? enableAutoStop 
      : (current.contentDetails?.enableAutoStop ?? false),
    enableMonitorStream: current.contentDetails?.enableMonitorStream ?? true,
  };
  
  // 3. BUILD: Complete request body with all required fields
  const requestBody = {
    id: broadcastId,
    snippet: {
      title: current.snippet.title,
      description: current.snippet.description || '',
      scheduledStartTime: current.snippet.scheduledStartTime,
    },
    status: {
      privacyStatus: current.status.privacyStatus,
    },
    contentDetails: contentDetails
  };
  
  console.log(`[AutoStartStop] Request body:`, JSON.stringify(requestBody, null, 2));
  
  // 4. UPDATE: Send to YouTube API
  try {
    const res = await yt.liveBroadcasts.update({
      part: 'snippet,status,contentDetails',
      requestBody: requestBody
    });
    
    console.log(`[AutoStartStop] ✅ Successfully updated ${broadcastId}`);
    return res.data;
  } catch (err) {
    const errorDetail = err?.response?.data?.error;
    console.error(`[AutoStartStop] ❌ Failed to update ${broadcastId}:`, {
      code: errorDetail?.code,
      message: errorDetail?.message,
      errors: errorDetail?.errors
    });
    throw err;
  }
}

/**
 * Bulk update Auto Start/Stop for multiple broadcasts
 * Includes rate limiting and error handling
 * 
 * @param {string|object} tokensOrUserId - User ID or tokens object
 * @param {object} options - Bulk update options
 * @param {string[]} options.broadcastIds - Array of broadcast IDs
 * @param {boolean} options.enableAutoStart - Enable auto start (optional)
 * @param {boolean} options.enableAutoStop - Enable auto stop (optional)
 * @param {number} options.delayMs - Delay between requests in ms (default: 100)
 * @returns {Promise<object>} Results with success and failed arrays
 */
async function bulkUpdateAutoStartStop(tokensOrUserId, { broadcastIds, enableAutoStart, enableAutoStop, delayMs = 100 }) {
  console.log(`[AutoStartStop] Bulk update starting for ${broadcastIds.length} broadcasts`);
  
  const results = {
    success: [],
    failed: [],
    total: broadcastIds.length
  };
  
  for (let i = 0; i < broadcastIds.length; i++) {
    const broadcastId = broadcastIds[i];
    
    try {
      await updateAutoStartStop(tokensOrUserId, {
        broadcastId,
        enableAutoStart,
        enableAutoStop
      });
      
      results.success.push(broadcastId);
      console.log(`[AutoStartStop] Progress: ${i + 1}/${broadcastIds.length} - ✅ ${broadcastId}`);
    } catch (err) {
      results.failed.push({
        id: broadcastId,
        error: err.message || 'Unknown error'
      });
      console.error(`[AutoStartStop] Progress: ${i + 1}/${broadcastIds.length} - ❌ ${broadcastId}: ${err.message}`);
    }
    
    // Rate limiting: wait between requests
    if (i < broadcastIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log(`[AutoStartStop] Bulk update completed:`, {
    total: results.total,
    success: results.success.length,
    failed: results.failed.length
  });
  
  return results;
}

/**
 * Validate Auto Start/Stop parameters
 */
function validateAutoStartStopParams({ enableAutoStart, enableAutoStop }) {
  const errors = [];
  
  if (enableAutoStart !== undefined && typeof enableAutoStart !== 'boolean') {
    errors.push('enableAutoStart must be boolean');
  }
  
  if (enableAutoStop !== undefined && typeof enableAutoStop !== 'boolean') {
    errors.push('enableAutoStop must be boolean');
  }
  
  if (enableAutoStart === undefined && enableAutoStop === undefined) {
    errors.push('At least one of enableAutoStart or enableAutoStop must be provided');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  updateAutoStartStop,
  bulkUpdateAutoStartStop,
  validateAutoStartStopParams,
  getBroadcast
};
