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
 * Get tokens from database for a specific user
 */
const getTokensFromDB = async (userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM youtube_tokens WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) {
          console.error('[TokenManager] Error getting tokens from DB:', err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
};

/**
 * Update tokens in database
 * Only updates refresh_token if Google sends it (usually only once)
 */
const updateTokensInDB = async (userId, tokens) => {
  return new Promise((resolve, reject) => {
    // Only update refresh_token if provided by Google
    const query = tokens.refresh_token
      ? `UPDATE youtube_tokens 
         SET access_token = ?, refresh_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ?`
      : `UPDATE youtube_tokens 
         SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ?`;

    const params = tokens.refresh_token
      ? [tokens.access_token, tokens.refresh_token, tokens.expiry_date, userId]
      : [tokens.access_token, tokens.expiry_date, userId];

    db.run(query, params, (err) => {
      if (err) {
        console.error('[TokenManager] Error updating tokens in DB:', err);
        reject(err);
      } else {
        console.log(`[TokenManager] ✅ Tokens updated for user ${userId}`);
        resolve();
      }
    });
  });
};

/**
 * Delete tokens from database (used when client is deleted or revoked)
 */
const deleteTokensFromDB = async (userId) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM youtube_tokens WHERE user_id = ?', [userId], (err) => {
      if (err) {
        console.error('[TokenManager] Error deleting tokens from DB:', err);
        reject(err);
      } else {
        console.log(`[TokenManager] ✅ Tokens deleted for user ${userId}`);
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
 * Get OAuth2 client with valid tokens for a user
 * This is the main function to use for getting authenticated client
 */
const getAuthenticatedClient = async (userId) => {
  if (!userId) {
    console.error('[TokenManager] No userId provided');
    return null;
  }

  try {
    // 1. Get user's YouTube credentials
    const user = await getUserCredentials(userId);
    if (!user?.youtube_client_id) {
      console.error('[TokenManager] User has no YouTube credentials configured');
      return null;
    }

    // 2. Get tokens from database
    const tokenRow = await getTokensFromDB(userId);
    if (!tokenRow) {
      console.error('[TokenManager] No tokens found for user');
      return null;
    }

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
      console.log(`[TokenManager] 🔄 Auto-refresh detected for user ${userId}, saving to DB...`);
      try {
        await updateTokensInDB(userId, {
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
          await deleteTokensFromDB(userId);
          return null;
        }
        if (err.message && err.message.includes('invalid_grant')) {
          console.error('[TokenManager] ❌ Invalid grant (token revoked). Cleaning up...');
          await deleteTokensFromDB(userId);
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
  updateTokensInDB,
  deleteTokensFromDB,
  getUserCredentials,
  getAuthenticatedClient
};
