const { db } = require('../db/database');
const youtubeService = require('./youtubeService');
const { getTokensForUser } = require('../routes/youtube');

/**
 * Broadcast Scheduler Service
 * Handles lazy creation of YouTube broadcasts for scheduled streams
 * 
 * Flow:
 * 1. Check schedules 10 minutes before execution
 * 2. Create broadcast if not exists
 * 3. Bind to existing stream key
 * 4. Mark as ready for execution
 */
class BroadcastScheduler {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * Start the broadcast scheduler
   * Checks every 1 minute for upcoming schedules
   */
  start() {
    if (this.isRunning) {
      console.log('[BroadcastScheduler] Already running');
      return;
    }

    console.log('[BroadcastScheduler] Starting broadcast scheduler...');
    this.isRunning = true;

    // Check immediately on start
    this.checkUpcomingSchedules();

    // Then check every 1 minute
    this.checkInterval = setInterval(() => {
      this.checkUpcomingSchedules();
    }, 60 * 1000); // 1 minute

    console.log('[BroadcastScheduler] ✅ Broadcast scheduler started');
  }

  /**
   * Stop the broadcast scheduler
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[BroadcastScheduler] Stopped');
  }

  /**
   * Check for schedules that need broadcast creation
   * Creates broadcasts 10 minutes before scheduled time
   */
  async checkUpcomingSchedules() {
    try {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      
      // ⭐ UPDATED: Create broadcast 3-5 minutes before schedule time (closer to stream start)
      const threeMinutesLater = currentTimeMinutes + 3;
      const fiveMinutesLater = currentTimeMinutes + 5;

      console.log(`[BroadcastScheduler] Checking schedules at ${currentHour}:${String(currentMinute).padStart(2, '0')}`);
      console.log(`[BroadcastScheduler] Looking for schedules between ${Math.floor(threeMinutesLater/60)}:${String(threeMinutesLater%60).padStart(2, '0')} and ${Math.floor(fiveMinutesLater/60)}:${String(fiveMinutesLater%60).padStart(2, '0')}`);

      // Get all pending schedules (both one-time and recurring)
      const query = `
        SELECT 
          ss.*,
          s.title,
          s.youtube_description,
          s.youtube_privacy,
          s.youtube_made_for_kids,
          s.youtube_age_restricted,
          s.youtube_auto_start,
          s.youtube_auto_end,
          s.youtube_tags,
          s.youtube_category_id,
          s.youtube_language,
          s.video_thumbnail,
          s.youtube_thumbnail_path,
          s.user_id
        FROM stream_schedules ss
        JOIN streams s ON ss.stream_id = s.id
        WHERE ss.status = 'pending'
          AND (ss.broadcast_status IS NULL OR ss.broadcast_status = 'pending' OR ss.broadcast_status = 'failed')
          AND ss.broadcast_status != 'failed_invalid_stream'
          AND s.use_youtube_api = 1
        ORDER BY ss.schedule_time ASC
      `;

      db.all(query, [], async (err, schedules) => {
        if (err) {
          console.error('[BroadcastScheduler] Error fetching schedules:', err);
          return;
        }

        if (!schedules || schedules.length === 0) {
          return;
        }

        let matchedSchedules = [];

        for (const schedule of schedules) {
          let shouldCreateBroadcast = false;

          if (schedule.is_recurring) {
            // Recurring schedule - check if today is allowed day and time is in window
            if (schedule.recurring_days) {
              const allowedDays = schedule.recurring_days.split(',').map(d => parseInt(d));
              
              if (allowedDays.includes(currentDay)) {
                // Extract time from schedule_time
                const scheduleDate = new Date(schedule.schedule_time);
                const scheduleHour = scheduleDate.getHours();
                const scheduleMinute = scheduleDate.getMinutes();
                const scheduleTimeMinutes = scheduleHour * 60 + scheduleMinute;
                
                // Check if schedule time is in the 3-5 minute window
                if (scheduleTimeMinutes >= threeMinutesLater && scheduleTimeMinutes <= fiveMinutesLater) {
                  shouldCreateBroadcast = true;
                  console.log(`[BroadcastScheduler] ✓ Recurring schedule matched: ${schedule.title} at ${scheduleHour}:${String(scheduleMinute).padStart(2, '0')}`);
                }
              }
            }
          } else {
            // One-time schedule - check if schedule_time is in window
            const scheduleTime = new Date(schedule.schedule_time);
            const threeMinutesLaterDate = new Date(now.getTime() + 3 * 60 * 1000);
            const fiveMinutesLaterDate = new Date(now.getTime() + 5 * 60 * 1000);
            
            if (scheduleTime >= threeMinutesLaterDate && scheduleTime <= fiveMinutesLaterDate) {
              shouldCreateBroadcast = true;
              console.log(`[BroadcastScheduler] ✓ One-time schedule matched: ${schedule.title} at ${scheduleTime.toISOString()}`);
            }
          }

          if (shouldCreateBroadcast) {
            matchedSchedules.push(schedule);
          }
        }

        if (matchedSchedules.length > 0) {
          console.log(`[BroadcastScheduler] Found ${matchedSchedules.length} schedule(s) needing broadcast creation`);
          
          for (const schedule of matchedSchedules) {
            await this.createBroadcastForSchedule(schedule);
          }
        }
      });
    } catch (error) {
      console.error('[BroadcastScheduler] Error in checkUpcomingSchedules:', error);
    }
  }

  /**
   * Create YouTube broadcast for a specific schedule
   * @param {Object} schedule - Schedule object with stream data
   */
  async createBroadcastForSchedule(schedule) {
    try {
      console.log(`[BroadcastScheduler] Creating broadcast for schedule ${schedule.id}`);
      console.log(`[BroadcastScheduler] - Stream: ${schedule.title}`);
      console.log(`[BroadcastScheduler] - Scheduled: ${schedule.schedule_time}`);
      console.log(`[BroadcastScheduler] - Recurring: ${schedule.is_recurring ? 'Yes' : 'No'}`);

      // ⭐ CRITICAL FIX: Check if broadcast already exists for THIS schedule
      if (schedule.youtube_broadcast_id) {
        console.log(`[BroadcastScheduler] ⚠️ Broadcast already exists for schedule ${schedule.id}: ${schedule.youtube_broadcast_id}`);
        return;
      }

      // ⭐ NEW: Check if stream already has an active broadcast from another schedule
      // This prevents creating duplicate broadcasts for the same stream
      const existingBroadcast = await this.checkExistingBroadcastForStream(schedule.stream_id);
      
      if (existingBroadcast) {
        console.log(`[BroadcastScheduler] ✓ Found existing broadcast for stream ${schedule.stream_id}: ${existingBroadcast.youtube_broadcast_id}`);
        console.log(`[BroadcastScheduler] ✓ Reusing broadcast from schedule ${existingBroadcast.schedule_id}`);
        console.log(`[BroadcastScheduler] ✓ Broadcast status: ${existingBroadcast.broadcast_status}`);
        
        // Reuse the existing broadcast ID for this schedule
        await this.updateScheduleBroadcast(schedule.id, existingBroadcast.youtube_broadcast_id, 'ready');
        
        console.log(`[BroadcastScheduler] ✅ Schedule ${schedule.id} linked to existing broadcast ${existingBroadcast.youtube_broadcast_id}`);
        return existingBroadcast.youtube_broadcast_id;
      }

      // Mark as creating to prevent duplicate attempts
      await this.updateScheduleBroadcastStatus(schedule.id, 'creating');

      // Calculate scheduled start time
      let scheduledStartTime;
      if (schedule.is_recurring) {
        // For recurring: use today's date with schedule time
        const scheduleDate = new Date(schedule.schedule_time);
        const now = new Date();
        scheduledStartTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          scheduleDate.getHours(),
          scheduleDate.getMinutes(),
          0,
          0
        );
        console.log(`[BroadcastScheduler] - Recurring schedule time: ${scheduledStartTime.toISOString()}`);
      } else {
        // For one-time: use exact schedule_time
        scheduledStartTime = new Date(schedule.schedule_time);
        console.log(`[BroadcastScheduler] - One-time schedule time: ${scheduledStartTime.toISOString()}`);
      }

      // Parse tags if exists
      let tags = null;
      if (schedule.youtube_tags) {
        try {
          tags = JSON.parse(schedule.youtube_tags);
        } catch (e) {
          console.warn('[BroadcastScheduler] Failed to parse tags:', e);
        }
      }

      // Get thumbnail path - check youtube_thumbnail_path first, then video_thumbnail, then video's thumbnail
      let thumbnailPath = schedule.youtube_thumbnail_path || schedule.video_thumbnail;
      
      // If thumbnail path exists, convert to full path
      if (thumbnailPath) {
        const path = require('path');
        const fs = require('fs');
        
        // If path starts with /, it's relative to public folder
        if (thumbnailPath.startsWith('/')) {
          thumbnailPath = path.join(__dirname, '..', 'public', thumbnailPath);
        }
        
        // Check if file exists
        if (fs.existsSync(thumbnailPath)) {
          console.log(`[BroadcastScheduler] Using saved thumbnail: ${thumbnailPath}`);
        } else {
          console.warn(`[BroadcastScheduler] Saved thumbnail not found: ${thumbnailPath}, checking video...`);
          thumbnailPath = null;
        }
      }
      
      // If no thumbnail or file doesn't exist, try to get from video
      if (!thumbnailPath) {
        console.log(`[BroadcastScheduler] No saved thumbnail, checking video...`);
        
        // Get video info from database
        const video = await new Promise((resolve, reject) => {
          db.get(
            'SELECT thumbnail_path FROM videos WHERE id = (SELECT video_id FROM streams WHERE id = ?)',
            [schedule.stream_id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        if (video && video.thumbnail_path) {
          // Video thumbnail is relative path like '/uploads/thumbnails/xxx.jpg'
          const path = require('path');
          thumbnailPath = path.join(__dirname, '..', 'public', video.thumbnail_path);
          
          // Check if file exists
          const fs = require('fs');
          if (fs.existsSync(thumbnailPath)) {
            console.log(`[BroadcastScheduler] Using video thumbnail: ${thumbnailPath}`);
          } else {
            console.warn(`[BroadcastScheduler] Thumbnail file not found: ${thumbnailPath}`);
            thumbnailPath = null;
          }
        } else {
          console.warn(`[BroadcastScheduler] No thumbnail available for this stream`);
          thumbnailPath = null;
        }
      }

      // ⭐ Get stream_key and youtube_channel_id from database
      const streamData = await new Promise((resolve, reject) => {
        db.get(
          'SELECT stream_key, youtube_channel_id FROM streams WHERE id = ?',
          [schedule.stream_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!streamData) {
        throw new Error('Stream not found in database');
      }

      const channelId = streamData.youtube_channel_id || null;
      console.log(`[BroadcastScheduler] Stream config: stream_key=${streamData.stream_key ? streamData.stream_key.substring(0, 8) + '...' : 'none'}, channel_id=${channelId || 'default'}`);

      // ⭐ MULTI-CHANNEL: Get user's YouTube tokens for specific channel
      const tokens = await getTokensForUser(schedule.user_id, channelId);
      if (!tokens || !tokens.access_token) {
        throw new Error(`YouTube tokens not found for user ${schedule.user_id}, channel ${channelId || 'default'}`);
      }
      console.log(`[BroadcastScheduler] ✓ Got tokens for channel: ${channelId || 'default'}`);

      // Prepare broadcast options
      let broadcastOptions = {
        title: schedule.title,
        description: schedule.youtube_description || '',
        privacyStatus: schedule.youtube_privacy || 'unlisted',
        scheduledStartTime: scheduledStartTime.toISOString(),
        enableAutoStart: schedule.youtube_auto_start || false,
        enableAutoStop: schedule.youtube_auto_end || false,
        tags: tags,
        category: schedule.youtube_category_id || null,
        language: schedule.youtube_language || null,
        thumbnailPath: thumbnailPath
      };

      // ⚠️ CRITICAL FIX: Always use stream_key, NEVER use youtube_stream_id
      // Reason: youtube_stream_id can become invalid if stream is deleted from YouTube
      // stream_key is more reliable and always works
      if (streamData.stream_key) {
        broadcastOptions.streamKey = streamData.stream_key;
        console.log(`[BroadcastScheduler] Using stream_key from database: ${streamData.stream_key.substring(0, 8)}...`);
      } else {
        throw new Error('No stream_key found - user must configure stream first');
      }

      // Create broadcast via YouTube API
      const broadcastResult = await youtubeService.scheduleLive(tokens, broadcastOptions);

      if (broadcastResult && broadcastResult.broadcast && broadcastResult.broadcast.id) {
        const broadcastId = broadcastResult.broadcast.id;

        // Save broadcast ID to schedule
        await this.updateScheduleBroadcast(schedule.id, broadcastId, 'ready');

        console.log(`[BroadcastScheduler] ✅ Broadcast created: ${broadcastId}`);
        console.log(`[BroadcastScheduler] - Schedule: ${schedule.id}`);
        console.log(`[BroadcastScheduler] - Channel: ${channelId || 'default'}`);
        console.log(`[BroadcastScheduler] - Using user's stream key: ${streamData.stream_key}`);
        console.log(`[BroadcastScheduler] - Start Time: ${scheduledStartTime.toISOString()}`);
        console.log(`[BroadcastScheduler] - Thumbnail: ${thumbnailPath ? 'Uploaded' : 'Not provided'}`);

        // Set audience settings if needed
        if (typeof schedule.youtube_made_for_kids === 'number' || schedule.youtube_age_restricted) {
          try {
            await youtubeService.setAudience(tokens, {
              videoId: broadcastId,
              selfDeclaredMadeForKids: schedule.youtube_made_for_kids === 1,
              ageRestricted: schedule.youtube_age_restricted === 1
            });
            console.log(`[BroadcastScheduler] ✅ Audience settings applied (Made for Kids: ${schedule.youtube_made_for_kids === 1}, Age Restricted: ${schedule.youtube_age_restricted === 1})`);
          } catch (audienceError) {
            console.error('[BroadcastScheduler] Error setting audience:', audienceError);
          }
        }

        return broadcastId;
      } else {
        throw new Error('Failed to create broadcast - no broadcast ID returned');
      }
    } catch (error) {
      console.error(`[BroadcastScheduler] ❌ Error creating broadcast for schedule ${schedule.id}:`, error);
      
      // Check if error is due to invalid stream
      if (error.message && error.message.includes('Stream not found')) {
        console.error(`[BroadcastScheduler] ❌ CRITICAL: Stream not found in YouTube`);
        console.error(`[BroadcastScheduler] Stream Key: ${schedule.stream_key || 'none'}`);
        console.error(`[BroadcastScheduler] User must check stream key is correct`);
        
        // Mark as failed permanently to prevent retry loop
        await this.updateScheduleBroadcastStatus(schedule.id, 'failed_invalid_stream');
        await this.logBroadcastError(schedule.id, 'Invalid stream ID - stream not found in YouTube channel');
        return null;
      }
      
      // Mark as failed
      await this.updateScheduleBroadcastStatus(schedule.id, 'failed');
      
      // Log error to database for debugging
      await this.logBroadcastError(schedule.id, error.message);
      
      return null;
    }
  }

  /**
   * Check if stream already has an active broadcast from another schedule
   * Returns the broadcast info if found, null otherwise
   */
  checkExistingBroadcastForStream(streamId) {
    return new Promise((resolve, reject) => {
      // Look for any schedule of this stream that already has a broadcast
      // Only consider broadcasts that are still active (not completed)
      const query = `
        SELECT 
          id as schedule_id,
          youtube_broadcast_id,
          broadcast_status
        FROM stream_schedules
        WHERE stream_id = ?
          AND youtube_broadcast_id IS NOT NULL
          AND broadcast_status IN ('ready', 'creating', 'live')
        ORDER BY 
          CASE 
            WHEN broadcast_status = 'live' THEN 1
            WHEN broadcast_status = 'ready' THEN 2
            WHEN broadcast_status = 'creating' THEN 3
            ELSE 4
          END
        LIMIT 1
      `;
      
      db.get(query, [streamId], (err, row) => {
        if (err) {
          console.error('[BroadcastScheduler] Error checking existing broadcast:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Update schedule with broadcast ID and status
   */
  updateScheduleBroadcast(scheduleId, broadcastId, status) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE stream_schedules 
         SET youtube_broadcast_id = ?, 
             broadcast_status = ?
         WHERE id = ?`,
        [broadcastId, status, scheduleId],
        (err) => {
          if (err) {
            console.error('[BroadcastScheduler] Error updating schedule broadcast:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Update broadcast status only
   */
  updateScheduleBroadcastStatus(scheduleId, status) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE stream_schedules 
         SET broadcast_status = ?
         WHERE id = ?`,
        [status, scheduleId],
        (err) => {
          if (err) {
            console.error('[BroadcastScheduler] Error updating broadcast status:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Log broadcast creation error
   */
  logBroadcastError(scheduleId, errorMessage) {
    return new Promise((resolve) => {
      db.run(
        `UPDATE stream_schedules 
         SET broadcast_status = 'failed'
         WHERE id = ?`,
        [scheduleId],
        () => {
          console.log(`[BroadcastScheduler] Logged error for schedule ${scheduleId}: ${errorMessage}`);
          resolve();
        }
      );
    });
  }

  /**
   * Get broadcast ID for a schedule
   * Returns null if not created yet
   */
  getBroadcastIdForSchedule(scheduleId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT youtube_broadcast_id, broadcast_status 
         FROM stream_schedules 
         WHERE id = ?`,
        [scheduleId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }
}

// Export singleton instance
module.exports = new BroadcastScheduler();
