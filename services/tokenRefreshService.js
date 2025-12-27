// services/tokenRefreshService.js
const { db } = require('../db/database');
const { google } = require('googleapis');

let refreshInterval = null;
const CHECK_INTERVAL = 10 * 60 * 1000; // Check every 10 minutes
const REFRESH_BUFFER = 30 * 60 * 1000; // Refresh if expiring within 30 minutes

/**
 * Start the token refresh service
 */
function start() {
  if (refreshInterval) {
    console.log('[TokenRefresh] Service already running');
    return;
  }

  console.log('[TokenRefresh] Starting token refresh service...');
  console.log(`[TokenRefresh] Will check tokens every ${CHECK_INTERVAL / 60000} minutes`);
  console.log(`[TokenRefresh] Will refresh tokens expiring within ${REFRESH_BUFFER / 60000} minutes`);

  // Run immediately on start
  checkAndRefreshTokens();

  // Then run periodically
  refreshInterval = setInterval(() => {
    checkAndRefreshTokens();
  }, CHECK_INTERVAL);

  console.log('[TokenRefresh] ✅ Service started');
}

/**
 * Stop the token refresh service
 */
function stop() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[TokenRefresh] Service stopped');
  }
}

/**
 * Check all channels and refresh tokens if needed
 */
async function checkAndRefreshTokens() {
  const now = Date.now();
  const refreshThreshold = now + REFRESH_BUFFER;

  console.log(`[TokenRefresh] Checking tokens at ${new Date().toLocaleString()}`);

  try {
    // Get all channels with tokens
    const channels = await new Promise((resolve, reject) => {
      db.all(
        `SELECT yc.*, u.youtube_client_id, u.youtube_client_secret, u.youtube_redirect_uri
         FROM youtube_channels yc
         JOIN users u ON yc.user_id = u.id
         WHERE yc.access_token IS NOT NULL 
         AND yc.refresh_token IS NOT NULL
         AND yc.expiry_date IS NOT NULL`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    if (channels.length === 0) {
      console.log('[TokenRefresh] No channels with tokens found');
      return;
    }

    console.log(`[TokenRefresh] Found ${channels.length} channel(s) to check`);

    let refreshedCount = 0;
    let errorCount = 0;

    for (const channel of channels) {
      try {
        // ⭐ VALIDATION: Skip if user doesn't have OAuth credentials configured
        if (!channel.youtube_client_id || !channel.youtube_client_secret) {
          console.log(`[TokenRefresh] ⚠️  Skipping channel ${channel.channel_title || channel.channel_id} - User has not configured OAuth credentials`);
          console.log(`[TokenRefresh]   User needs to setup YouTube OAuth in user settings`);
          continue;
        }
        
        const expiryDate = channel.expiry_date;
        const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);

        console.log(`[TokenRefresh] Channel: ${channel.channel_title || channel.channel_id}`);
        console.log(`[TokenRefresh]   User ID: ${channel.user_id}`);
        console.log(`[TokenRefresh]   Has OAuth Config: YES`);
        console.log(`[TokenRefresh]   Expires: ${new Date(expiryDate).toLocaleString()}`);
        console.log(`[TokenRefresh]   Hours until expiry: ${hoursUntilExpiry.toFixed(2)}`);

        // Check if token needs refresh
        if (expiryDate <= refreshThreshold) {
          console.log(`[TokenRefresh]   ⚠️  Token expiring soon, refreshing...`);

          // Create OAuth2 client
          const oauth2Client = new google.auth.OAuth2(
            channel.youtube_client_id,
            channel.youtube_client_secret,
            channel.youtube_redirect_uri
          );

          oauth2Client.setCredentials({
            access_token: channel.access_token,
            refresh_token: channel.refresh_token,
            expiry_date: channel.expiry_date
          });

          // Refresh token
          const { credentials } = await oauth2Client.refreshAccessToken();

          // Update database
          await new Promise((resolve, reject) => {
            const query = credentials.refresh_token
              ? `UPDATE youtube_channels 
                 SET access_token = ?, refresh_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`
              : `UPDATE youtube_channels 
                 SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`;

            const params = credentials.refresh_token
              ? [credentials.access_token, credentials.refresh_token, credentials.expiry_date, channel.id]
              : [credentials.access_token, credentials.expiry_date, channel.id];

            db.run(query, params, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          const newExpiryHours = (credentials.expiry_date - now) / (1000 * 60 * 60);
          console.log(`[TokenRefresh]   ✅ Token refreshed! New expiry: ${new Date(credentials.expiry_date).toLocaleString()} (${newExpiryHours.toFixed(2)}h from now)`);
          refreshedCount++;
        } else {
          console.log(`[TokenRefresh]   ✅ Token still valid`);
        }
      } catch (error) {
        errorCount++;
        console.error(`[TokenRefresh]   ❌ Error refreshing token for ${channel.channel_title || channel.channel_id}:`, error.message);

        // Handle specific errors
        if (error.message && (error.message.includes('deleted_client') || error.message.includes('invalid_grant'))) {
          console.error(`[TokenRefresh]   ⚠️  Token invalid or revoked. User needs to re-authenticate.`);
          // Optionally: Mark channel as needing re-auth
        }
      }
    }

    console.log(`[TokenRefresh] Check complete: ${refreshedCount} refreshed, ${errorCount} errors`);
  } catch (error) {
    console.error('[TokenRefresh] Error in checkAndRefreshTokens:', error);
  }
}

/**
 * Manually trigger token refresh check (for testing)
 */
async function triggerRefresh() {
  console.log('[TokenRefresh] Manual refresh triggered');
  await checkAndRefreshTokens();
}

module.exports = {
  start,
  stop,
  triggerRefresh
};
