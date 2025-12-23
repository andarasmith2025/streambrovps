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
      // Get schedules in next 10-15 minutes that don't have broadcasts yet
      const now = new Date();
      const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
      const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

      const query = `
        SELECT 
          ss.*,
          s.title,
          s.youtube_description,
          s.youtube_privacy,
          s.youtube_stream_id,
          s.youtube_made_for_kids,
          s.youtube_age_restricted,
          s.youtube_auto_start,
          s.youtube_auto_end,
          s.youtube_tags,
          s.youtube_category_id,
          s.youtube_language,
          s.video_thumbnail,
          s.user_id
        FROM stream_schedules ss
        JOIN streams s ON ss.stream_id = s.id
        WHERE ss.schedule_time BETWEEN ? AND ?
          AND ss.status = 'pending'
          AND (ss.broadcast_status IS NULL OR ss.broadcast_status = 'pending')
          AND s.use_youtube_api = 1
        ORDER BY ss.schedule_time ASC
      `;

      db.all(query, [tenMinutesLater.toISOString(), fifteenMinutesLater.toISOString()], async (err, schedules) => {
        if (err) {
          console.error('[BroadcastScheduler] Error fetching schedules:', err);
          return;
        }

        if (schedules && schedules.length > 0) {
          console.log(`[BroadcastScheduler] Found ${schedules.length} schedule(s) needing broadcast creation`);
          
          for (const schedule of schedules) {
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

      // Mark as creating to prevent duplicate attempts
      await this.updateScheduleBroadcastStatus(schedule.id, 'creating');

      // Get user's YouTube tokens
      const tokens = await getTokensForUser(schedule.user_id);
      if (!tokens || !tokens.access_token) {
        throw new Error('YouTube tokens not found for user');
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

      // Create broadcast via YouTube API
      const broadcastResult = await youtubeService.scheduleLive(tokens, {
        title: schedule.title,
        description: schedule.youtube_description || '',
        privacyStatus: schedule.youtube_privacy || 'unlisted',
        scheduledStartTime: new Date(schedule.schedule_time).toISOString(),
        streamId: schedule.youtube_stream_id, // Use existing stream key!
        enableAutoStart: schedule.youtube_auto_start || false,
        enableAutoStop: schedule.youtube_auto_end || false,
        tags: tags,
        category: schedule.youtube_category_id || null,
        language: schedule.youtube_language || null,
        thumbnailPath: schedule.video_thumbnail || null // Use saved thumbnail
      });

      if (broadcastResult && broadcastResult.broadcast && broadcastResult.broadcast.id) {
        const broadcastId = broadcastResult.broadcast.id;

        // Save broadcast ID to schedule
        await this.updateScheduleBroadcast(schedule.id, broadcastId, 'ready');

        console.log(`[BroadcastScheduler] ✅ Broadcast created: ${broadcastId}`);
        console.log(`[BroadcastScheduler] - Schedule: ${schedule.id}`);
        console.log(`[BroadcastScheduler] - Stream Key: ${schedule.youtube_stream_id}`);

        // Set audience settings if needed
        if (typeof schedule.youtube_made_for_kids === 'number' || schedule.youtube_age_restricted) {
          try {
            await youtubeService.setAudience(tokens, {
              videoId: broadcastId,
              selfDeclaredMadeForKids: schedule.youtube_made_for_kids === 1,
              ageRestricted: schedule.youtube_age_restricted === 1
            });
            console.log(`[BroadcastScheduler] ✅ Audience settings applied`);
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
      
      // Mark as failed
      await this.updateScheduleBroadcastStatus(schedule.id, 'failed');
      
      // Log error to database for debugging
      await this.logBroadcastError(schedule.id, error.message);
      
      return null;
    }
  }

  /**
   * Update schedule with broadcast ID and status
   */
  updateScheduleBroadcast(scheduleId, broadcastId, status) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE stream_schedules 
         SET youtube_broadcast_id = ?, 
             broadcast_status = ?,
             updated_at = CURRENT_TIMESTAMP
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
         SET broadcast_status = ?,
             updated_at = CURRENT_TIMESTAMP
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
         SET broadcast_status = 'failed',
             updated_at = CURRENT_TIMESTAMP
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
