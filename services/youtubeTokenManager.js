// services/youtubeTokenManager.js
const { google } = require('googleapis');
const { db } = require('../db/database');

/**
 * Create OAuth2 Client with credentials
 */
const createOAuthClient = (credentials) => {
  return new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri
  );
};

/**
 * Get tokens from database for a specific user and channel
 * If channelId is not provided, returns the default channel
 */
const getTokensFromDB = async (userId, channelId = null) => {
  // ⭐ DEBUG: Log parameter yang diterima
  console.log(`[getTokensFromDB] ========== DEBUG ==========`);
  console.log(`[getTokensFromDB] userId:`, userId);
  console.log(`[getTokensFromDB] channelId (raw):`, channelId);
  console.log(`[getTokensFromDB] channelId type:`, typeof channelId);
  console.log(`[getTokensFromDB] channelId truthy?:`, !!channelId);
  console.log(`[getTokensFromDB] =====================================`);
  
  return new Promise((resolve, reject) => {
    let query, params;
    
    if (channelId) {
      // Get specific channel
      console.log(`[getTokensFromDB] Using specific channel query`);
      query = 'SELECT * FROM youtube_channels WHERE user_id = ? AND channel_id = ?';
      params = [userId, channelId];
    } else {
      // Get default channel or first available channel
      console.log(`[getTokensFromDB] Using default channel query`);
      query = `SELECT * FROM youtube_channels WHERE user_id = ? 
               ORDER BY is_default DESC, created_at ASC LIMIT 1`;
      params = [userId];
    }
    
    console.log(`[getTokensFromDB] Query:`, query);
    console.log(`[getTokensFromDB] Params:`, params);
    
    db.get(query, params, (err, row) => {
      if (err) {
        console.error('[TokenManager] Error getting tokens from DB:', err);
        reject(err);
      } else {
        console.log(`[getTokensFromDB] Result:`, row ? `Found channel: ${row.channel_title || row.channel_id}` : 'Not found');
        resolve(row);
      }
    });
  });
};

/**
 * Get all YouTube channels for a user
 */
const getUserChannels = async (userId) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM youtube_channels WHERE user_id = ? ORDER BY is_default DESC, channel_title ASC',
      [userId],
      (err, rows) => {
        if (err) {
          console.error('[TokenManager] Error getting user channels:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
};

/**
 * Update tokens in database for multi-channel support
 * Only updates refresh_token if Google sends it (usually only once)
 */
const updateTokensInDB = async (userId, channelId, tokens) => {
  return new Promise((resolve, reject) => {
    // Only update refresh_token if provided by Google
    const query = tokens.refresh_token
      ? `UPDATE youtube_channels 
         SET access_token = ?, refresh_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND channel_id = ?`
      : `UPDATE youtube_channels 
         SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND channel_id = ?`;

    const params = tokens.refresh_token
      ? [tokens.access_token, tokens.refresh_token, tokens.expiry_date, userId, channelId]
      : [tokens.access_token, tokens.expiry_date, userId, channelId];

    db.run(query, params, (err) => {
      if (err) {
        console.error('[TokenManager] Error updating tokens in DB:', err);
        reject(err);
      } else {
        console.log(`[TokenManager] ✅ Tokens updated for user ${userId}, channel ${channelId}`);
        resolve();
      }
    });
  });
};

/**
 * Save new channel tokens to database
 */
const saveChannelTokens = async (userId, channelInfo, tokens) => {
  return new Promise((resolve, reject) => {
    const channelId = channelInfo.id;
    
    // First, check how many channels this user already has
    db.get('SELECT COUNT(*) as count FROM youtube_channels WHERE user_id = ?', [userId], (err, row) => {
      if (err) {
        console.error('[TokenManager] Error checking existing channels:', err);
        reject(err);
        return;
      }
      
      const existingChannelCount = row.count || 0;
      const isFirstChannel = existingChannelCount === 0;
      
      console.log(`[TokenManager] User ${userId} has ${existingChannelCount} existing channels, isFirstChannel: ${isFirstChannel}`);
      
      // If this is the first channel, make it default
      // If not, don't make it default (user can change it later)
      db.run(`INSERT OR REPLACE INTO youtube_channels 
              (id, user_id, channel_id, channel_title, channel_avatar, subscriber_count, 
               access_token, refresh_token, expiry_date, is_default, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          `${userId}_${channelId}`,
          userId,
          channelId,
          channelInfo.title,
          channelInfo.avatar,
          channelInfo.subscriberCount || 0,
          tokens.access_token,
          tokens.refresh_token,
          tokens.expiry_date,
          isFirstChannel ? 1 : 0
        ],
        (err) => {
          if (err) {
            console.error('[TokenManager] Error saving channel tokens:', err);
            reject(err);
          } else {
            console.log(`[TokenManager] ✅ Channel tokens saved for ${channelInfo.title} (${channelId}), default: ${isFirstChannel}`);
            resolve();
          }
        }
      );
    });
  });
};

/**
 * Delete tokens from database (used when client is deleted or revoked)
 */
const deleteTokensFromDB = async (userId, channelId = null) => {
  return new Promise((resolve, reject) => {
    let query, params;
    
    if (channelId) {
      // Delete specific channel
      query = 'DELETE FROM youtube_channels WHERE user_id = ? AND channel_id = ?';
      params = [userId, channelId];
    } else {
      // Delete all channels for user (backward compatibility)
      query = 'DELETE FROM youtube_channels WHERE user_id = ?';
      params = [userId];
    }
    
    db.run(query, params, (err) => {
      if (err) {
        console.error('[TokenManager] Error deleting tokens from DB:', err);
        reject(err);
      } else {
        const target = channelId ? `channel ${channelId}` : 'all channels';
        console.log(`[TokenManager] ✅ Tokens deleted for user ${userId}, ${target}`);
        resolve();
      }
    });
  });
};

/**
 * Get user's YouTube credentials from database
 */
const getUserCredentials = async (userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT youtube_client_id, youtube_client_secret, youtube_redirect_uri FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) {
          console.error('[TokenManager] Error getting user credentials:', err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
};

/**
 * Get OAuth2 client with valid tokens for a user and specific channel
 * This is the main function to use for getting authenticated client
 */
const getAuthenticatedClient = async (userId, channelId = null) => {
  if (!userId) {
    console.error('[TokenManager] No userId provided');
    return null;
  }

  console.log(`[TokenManager] Getting authenticated client for userId: ${userId}, channelId: ${channelId || 'default'}`);

  try {
    // 1. Get user's YouTube credentials
    const user = await getUserCredentials(userId);
    console.log(`[TokenManager] User credentials query result:`, user ? 'Found' : 'Not found');
    
    if (!user?.youtube_client_id) {
      console.error(`[TokenManager] ❌ User ${userId} has no YouTube credentials configured`);
      console.error(`[TokenManager] User needs to set up YouTube OAuth in user settings`);
      return null;
    }

    // 2. Get tokens from database (multi-channel support)
    const tokenRow = await getTokensFromDB(userId, channelId);
    if (!tokenRow) {
      console.error(`[TokenManager] ❌ No tokens found for user ${userId}, channel ${channelId || 'default'}`);
      console.error(`[TokenManager] User needs to connect YouTube account first`);
      return null;
    }

    console.log(`[TokenManager] Found tokens for channel: ${tokenRow.channel_title || tokenRow.channel_id}`);

    // 3. Create OAuth2 client
    const oauth2Client = createOAuthClient({
      client_id: user.youtube_client_id,
      client_secret: user.youtube_client_secret,
      redirect_uri: user.youtube_redirect_uri
    });

    // 4. Set credentials
    oauth2Client.setCredentials({
      access_token: tokenRow.access_token,
      refresh_token: tokenRow.refresh_token,
      expiry_date: tokenRow.expiry_date
    });

    // 5. ⭐ EVENT LISTENER: Auto-save tokens when Google refreshes them
    oauth2Client.on('tokens', async (tokens) => {
      console.log(`[TokenManager] 🔄 Auto-refresh detected for user ${userId}, channel ${tokenRow.channel_id}, saving to DB...`);
      try {
        await updateTokensInDB(userId, tokenRow.channel_id, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || tokenRow.refresh_token, // Keep old refresh_token if not provided
          expiry_date: tokens.expiry_date
        });
      } catch (err) {
        console.error('[TokenManager] Failed to save auto-refreshed tokens:', err);
      }
    });

    // 6. Check if token needs refresh (5 min buffer)
    const now = Date.now();
    if (tokenRow.expiry_date && now > (tokenRow.expiry_date - 300000)) {
      console.log('[TokenManager] Token expiring soon, forcing refresh...');
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('[TokenManager] ✅ Token refreshed successfully');
        // Tokens automatically saved via event listener
        return oauth2Client;
      } catch (err) {
        if (err.message && err.message.includes('deleted_client')) {
          console.error('[TokenManager] ❌ OAuth Client deleted by Google/User. Cleaning up...');
          await deleteTokensFromDB(userId, tokenRow.channel_id);
          return null;
        }
        if (err.message && err.message.includes('invalid_grant')) {
          console.error('[TokenManager] ❌ Invalid grant (token revoked). Cleaning up...');
          await deleteTokensFromDB(userId, tokenRow.channel_id);
          return null;
        }
        throw err;
      }
    }

    return oauth2Client;
  } catch (err) {
    console.error('[TokenManager] Error getting authenticated client:', err);
    return null;
  }
};

module.exports = {
  createOAuthClient,
  getTokensFromDB,
  getUserChannels,
  updateTokensInDB,
  saveChannelTokens,
  deleteTokensFromDB,
  getUserCredentials,
  getAuthenticatedClient
};
