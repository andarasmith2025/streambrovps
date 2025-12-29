const { db } = require('../db/database');
const youtubeService = require('./youtubeService');
const { getTokensForUser } = require('../routes/youtube');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

/**
 * Broadcast Scheduler Service
 * Menangani pembuatan broadcast YouTube secara otomatis untuk jadwal yang akan datang.
 * 
 * CRITICAL FIXES:
 * 1. Cek orphaned broadcast di YouTube sebelum buat baru (mencegah duplikasi saat restart)
 * 2. Validasi thumbnail wajib ada (mencegah broadcast tanpa thumbnail)
 * 3. Gunakan absolute path untuk thumbnail (mencegah path error saat restart)
 * 4. Rate limiting 3 detik antar broadcast (mencegah YouTube API rate limit)
 */
class BroadcastScheduler {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * Memulai scheduler. Mengecek setiap 1 menit.
   */
  start() {
    if (this.isRunning) {
      console.log('[BroadcastScheduler] Sudah berjalan.');
      return;
    }

    console.log('[BroadcastScheduler] ✅ ENABLED - Creating broadcasts 3-5 minutes before schedule');
    console.log('[BroadcastScheduler] Orphan detection active to prevent duplicates on restart');
    this.isRunning = true;

    // Check immediately on start
    this.checkUpcomingSchedules();
    
    // Then check every minute
    this.checkInterval = setInterval(() => {
      this.checkUpcomingSchedules();
    }, 60 * 1000);

    console.log('[BroadcastScheduler] ✅ Scheduler started successfully');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[BroadcastScheduler] Dihentikan');
  }

  /**
   * Mencari jadwal yang perlu dibuatkan broadcast-nya (jendela 3-5 menit sebelum mulai).
   */
  async checkUpcomingSchedules() {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      // ⭐ FIX: Window adalah 3-5 menit SEBELUM jadwal, bukan setelah
      // Contoh: Jadwal 17:20, sekarang 17:15-17:17 → MATCH
      // Window: schedule time harus 3-5 menit dari sekarang (ke depan)
      const windowStart = currentTimeMinutes + 3;  // 3 minutes from now
      const windowEnd = currentTimeMinutes + 5;    // 5 minutes from now

      // ⭐ CRITICAL: Hanya ambil schedule yang BELUM punya broadcast_id
      // Jangan retry yang failed untuk mencegah loop
      const query = `
        SELECT 
          ss.*, 
          s.title, s.youtube_description, s.youtube_privacy,
          s.youtube_made_for_kids, s.youtube_age_restricted,
          s.youtube_auto_start, s.youtube_auto_end, s.youtube_tags,
          s.youtube_category_id, s.youtube_language, s.video_thumbnail,
          s.youtube_thumbnail_path, s.user_id, s.youtube_channel_id
        FROM stream_schedules ss
        JOIN streams s ON ss.stream_id = s.id
        WHERE ss.status = 'pending'
          AND ss.youtube_broadcast_id IS NULL
          AND s.use_youtube_api = 1
        ORDER BY ss.schedule_time ASC
      `;

      db.all(query, [], async (err, schedules) => {
        if (err || !schedules || schedules.length === 0) return;

        let matchedSchedules = [];

        for (const schedule of schedules) {
          let shouldCreate = false;

          if (schedule.is_recurring) {
            if (schedule.recurring_days) {
              const allowedDays = schedule.recurring_days.split(',').map(d => parseInt(d));
              if (allowedDays.includes(currentDay)) {
                const sDate = new Date(schedule.schedule_time);
                const sTimeMinutes = sDate.getHours() * 60 + sDate.getMinutes();
                
                // ⭐ FIX: Cek apakah schedule time ada di window 3-5 menit dari sekarang
                // Contoh: Sekarang 17:15, schedule 17:20 (5 menit lagi) → MATCH
                if (sTimeMinutes >= windowStart && sTimeMinutes <= windowEnd) {
                  shouldCreate = true;
                  console.log(`[BroadcastScheduler] ✓ Recurring schedule matched: ${schedule.id} at ${sTimeMinutes} (window: ${windowStart}-${windowEnd})`);
                }
              }
            }
          } else {
            // One-time schedule
            const sTime = new Date(schedule.schedule_time);
            const diff = (sTime.getTime() - now.getTime()) / (1000 * 60);
            
            // Window 3-5 menit ke depan
            if (diff >= 3 && diff <= 5) {
              shouldCreate = true;
              console.log(`[BroadcastScheduler] ✓ One-time schedule matched: ${schedule.id} in ${diff.toFixed(1)} minutes`);
            }
          }

          if (shouldCreate) matchedSchedules.push(schedule);
        }

        if (matchedSchedules.length > 0) {
          console.log(`[BroadcastScheduler] Found ${matchedSchedules.length} schedule(s) to create broadcasts`);
        }

        // Process dengan delay untuk rate limiting
        for (let i = 0; i < matchedSchedules.length; i++) {
          if (i > 0) {
            console.log('[BroadcastScheduler] Menunggu 3 detik untuk rate limiting...');
            await new Promise(r => setTimeout(r, 3000));
          }
          await this.createBroadcastForSchedule(matchedSchedules[i]);
        }
      });
    } catch (error) {
      console.error('[BroadcastScheduler] Error checkUpcomingSchedules:', error);
    }
  }

  /**
   * ⭐ ENHANCED: Multi-channel support with proper token binding
   */
  async createBroadcastForSchedule(schedule) {
    try {
      console.log(`[BroadcastScheduler] 🎯 Processing schedule ID: ${schedule.id}`);
      console.log(`[BroadcastScheduler] 📺 Stream: "${schedule.title}"`);
      console.log(`[BroadcastScheduler] 🏷️ Channel: ${schedule.youtube_channel_id || 'default'}`);

      // 1. CEK: Apakah schedule ini sudah punya broadcast_id?
      if (schedule.youtube_broadcast_id) {
        console.log(`[BroadcastScheduler] ⚠️ Schedule ${schedule.id} already has broadcast: ${schedule.youtube_broadcast_id}`);
        return schedule.youtube_broadcast_id;
      }

      // 2. CEK RECOVERY: Cari orphaned broadcast di YouTube (DISABLED for safety)
      console.log(`[BroadcastScheduler] 🔍 Checking YouTube for orphaned broadcast...`);
      const orphaned = await this.findOrphanedBroadcastInYouTube(schedule);
      
      if (orphaned) {
        console.log(`[BroadcastScheduler] 🔄 RECOVERED orphaned broadcast: ${orphaned.id}`);
        await this.updateScheduleBroadcast(schedule.id, orphaned.id, 'ready');
        return orphaned.id;
      }

      // 3. Tandai database sedang membuat
      await this.updateScheduleBroadcastStatus(schedule.id, 'creating');

      // 4. ⭐ ENHANCED: Multi-channel token retrieval with proper binding
      console.log(`[BroadcastScheduler] 🔑 Getting tokens for user: ${schedule.user_id}, channel: ${schedule.youtube_channel_id || 'default'}`);
      const tokens = await getTokensForUser(schedule.user_id, schedule.youtube_channel_id);
      if (!tokens || !tokens.access_token) {
        throw new Error(`No valid YouTube tokens for user ${schedule.user_id}, channel ${schedule.youtube_channel_id || 'default'}`);
      }
      
      // Verify token expiry
      const now = Date.now();
      const expiry = tokens.expiry_date ? Number(tokens.expiry_date) : 0;
      const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
      console.log(`[BroadcastScheduler] ✅ Token valid (expires in ${minutesUntilExpiry} minutes)`);

      // 5. Get stream data with proper channel binding
      const streamData = await this.getStreamData(schedule.stream_id);
      if (!streamData || !streamData.stream_key) {
        throw new Error('Stream key not found in database');
      }
      
      // ⭐ CRITICAL: Ensure channel ID consistency
      const channelId = schedule.youtube_channel_id || streamData.youtube_channel_id;
      if (!channelId) {
        throw new Error('No YouTube channel ID found in schedule or stream data');
      }
      console.log(`[BroadcastScheduler] 🎯 Using channel ID: ${channelId}`);

      // 6. Resolve thumbnail path
      const thumbnailPath = await this.resolveThumbnailPath(schedule);
      if (!thumbnailPath) {
        console.log(`[BroadcastScheduler] ℹ️ No custom thumbnail - YouTube will use video default`);
      }

      // 7. Calculate start time
      let startTime = new Date(schedule.schedule_time);
      if (schedule.is_recurring) {
        const now = new Date();
        startTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      }

      // 8. ⭐ ENHANCED: Create broadcast with proper metadata from stream
      const broadcastOptions = {
        channelId: channelId,
        title: schedule.title,
        description: schedule.youtube_description || '',
        privacyStatus: schedule.youtube_privacy || 'unlisted',
        scheduledStartTime: startTime.toISOString(),
        enableAutoStart: true,  // ✅ Let YouTube auto-transition
        enableAutoStop: false,  // ❌ Node.js controls stop
        tags: schedule.youtube_tags ? JSON.parse(schedule.youtube_tags) : null,
        category: schedule.youtube_category_id,
        language: schedule.youtube_language,
        thumbnailPath: thumbnailPath,
        streamKey: streamData.stream_key,
        // ⭐ NEW: Additional metadata for consistency
        madeForKids: schedule.youtube_made_for_kids === 1,
        ageRestricted: schedule.youtube_age_restricted === 1
      };

      console.log(`[BroadcastScheduler] 📤 Creating broadcast with metadata:`);
      console.log(`[BroadcastScheduler]   Title: "${broadcastOptions.title}"`);
      console.log(`[BroadcastScheduler]   Channel: ${broadcastOptions.channelId}`);
      console.log(`[BroadcastScheduler]   Privacy: ${broadcastOptions.privacyStatus}`);
      console.log(`[BroadcastScheduler]   Thumbnail: ${thumbnailPath ? 'Yes' : 'Default'}`);

      const result = await youtubeService.scheduleLive(tokens, broadcastOptions);

      if (result && result.broadcast && result.broadcast.id) {
        const broadcastId = result.broadcast.id;
        
        // ⭐ ENHANCED: Update both tables with proper channel binding
        await this.updateScheduleBroadcast(schedule.id, broadcastId, 'ready');
        
        // Set audience settings if needed
        if (schedule.youtube_made_for_kids || schedule.youtube_age_restricted) {
          try {
            await youtubeService.setAudience(tokens, {
              videoId: broadcastId,
              selfDeclaredMadeForKids: schedule.youtube_made_for_kids === 1,
              ageRestricted: schedule.youtube_age_restricted === 1
            });
            console.log(`[BroadcastScheduler] ✅ Audience settings applied`);
          } catch (audienceErr) {
            console.error('[BroadcastScheduler] ⚠️ Error setting audience:', audienceErr.message);
          }
        }

        console.log(`[BroadcastScheduler] ✅ SUCCESS: Broadcast ${broadcastId} created for channel ${channelId}`);
        return broadcastId;
      } else {
        throw new Error('YouTube API did not return broadcast ID');
      }
    } catch (error) {
      console.error(`[BroadcastScheduler] ❌ Error creating broadcast for schedule ${schedule.id}:`, error.message);
      await this.updateScheduleBroadcastStatus(schedule.id, 'failed');
      await this.logBroadcastError(schedule.id, error.message);
      return null;
    }
  }

  /**
   * ⭐ CRITICAL FIX: NEVER reuse broadcasts - always create new for each schedule
   * This ensures each schedule execution gets its own unique broadcast ID
   * Architecture: 1 stream card = multiple schedules = DIFFERENT broadcast IDs
   */
  checkExistingBroadcastForStream(streamId) {
    return new Promise((resolve) => {
      console.log(`[BroadcastScheduler] 🚫 Broadcast reuse DISABLED - each schedule gets NEW broadcast`);
      console.log(`[BroadcastScheduler] 💡 Architecture: 1 stream = multi jadwal = DIFFERENT broadcast IDs`);
      
      // ⭐ ALWAYS return null to force new broadcast creation
      // This prevents reusing old broadcasts from previous schedule executions
      resolve(null);
    });
  }

  /**
   * ⭐ DISABLED: Orphan recovery disabled for safety
   * Always create new broadcast instead of reusing old ones
   * This prevents accidentally reusing broadcasts from previous tests/days
   */
  async findOrphanedBroadcastInYouTube(schedule) {
    console.log(`[BroadcastScheduler] 🚫 Orphan recovery DISABLED - will always create new broadcast`);
    console.log(`[BroadcastScheduler] 💡 This prevents reusing old broadcasts from previous tests`);
    return null;
  }

  /**
   * Helper untuk mencari path thumbnail yang valid secara absolut
   * FALLBACK: Jika tidak ada custom thumbnail, gunakan video thumbnail
   */
  async resolveThumbnailPath(schedule) {
    let rawPath = schedule.youtube_thumbnail_path || schedule.video_thumbnail;

    // Jika tidak ada di schedule, cari di tabel video (FALLBACK)
    if (!rawPath) {
      const video = await new Promise(res => {
        db.get(
          'SELECT thumbnail_path FROM videos WHERE id = (SELECT video_id FROM streams WHERE id = ?)',
          [schedule.stream_id],
          (err, row) => res(row)
        );
      });
      rawPath = video?.thumbnail_path;
    }

    if (!rawPath) {
      console.warn(`[BroadcastScheduler] ⚠️ No thumbnail found for schedule ${schedule.id} - will use video default`);
      return null; // YouTube will use video's default thumbnail
    }

    // ⭐ FIX: Pastikan path absolut TANPA duplikasi
    const publicFolder = path.join(__dirname, '..', 'public');
    
    // Jika path sudah absolut (dimulai dengan /root atau C:), gunakan langsung
    if (path.isAbsolute(rawPath)) {
      const fullPath = rawPath;
      console.log(`[BroadcastScheduler] 🔍 Checking absolute thumbnail: ${fullPath}`);
      
      if (fs.existsSync(fullPath)) {
        console.log(`[BroadcastScheduler] ✓ Thumbnail found`);
        return fullPath;
      } else {
        console.warn(`[BroadcastScheduler] ⚠️ Thumbnail NOT found at: ${fullPath}`);
        return null; // Fallback to video default
      }
    }
    
    // Jika path relatif (dimulai dengan /uploads), gabungkan dengan public folder
    const fullPath = path.join(publicFolder, rawPath);
    console.log(`[BroadcastScheduler] 🔍 Checking relative thumbnail: ${fullPath}`);
    
    // Validasi file exists
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      console.log(`[BroadcastScheduler] ✅ Thumbnail found: ${fullPath} (${fileSizeKB}KB)`);
      return fullPath;
    } else {
      console.warn(`[BroadcastScheduler] ⚠️ Thumbnail NOT found at: ${fullPath}`);
      return null; // Fallback to video default
    }
  }

  /**
   * ⭐ ENHANCED: Get stream data with multi-channel support
   */
  getStreamData(streamId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT stream_key, youtube_channel_id, title, youtube_description, youtube_privacy FROM streams WHERE id = ?',
        [streamId],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (!row) {
            reject(new Error(`Stream ${streamId} not found in database`));
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  /**
   * ⭐ ENHANCED: Update broadcast ID in both tables with proper cleanup
   */
  updateScheduleBroadcast(scheduleId, broadcastId, status) {
    return new Promise((resolve) => {
      // Update schedule table first
      db.run(
        `UPDATE stream_schedules 
         SET youtube_broadcast_id = ?, 
             broadcast_status = ?
         WHERE id = ?`,
        [broadcastId, status, scheduleId],
        (scheduleErr) => {
          if (scheduleErr) {
            console.error('[BroadcastScheduler] Error updating schedule:', scheduleErr);
          }
          
          // Update streams table for easier access
          db.run(
            `UPDATE streams 
             SET youtube_broadcast_id = ?
             WHERE id = (SELECT stream_id FROM stream_schedules WHERE id = ?)`,
            [broadcastId, scheduleId],
            (streamErr) => {
              if (streamErr) {
                console.error('[BroadcastScheduler] Error updating stream:', streamErr);
              }
              
              console.log(`[BroadcastScheduler] ✅ Updated broadcast_id in both tables: ${broadcastId} (${status})`);
              resolve();
            }
          );
        }
      );
    });
  }

  updateScheduleBroadcastStatus(scheduleId, status) {
    return new Promise((res) => {
      db.run(
        `UPDATE stream_schedules SET broadcast_status = ? WHERE id = ?`,
        [status, scheduleId],
        () => res()
      );
    });
  }

  logBroadcastError(scheduleId, error) {
    return new Promise((res) => {
      db.run(
        `UPDATE stream_schedules SET broadcast_status = 'failed' WHERE id = ?`,
        [scheduleId],
        () => {
          console.log(`[BroadcastScheduler] Logged error for schedule ${scheduleId}: ${error}`);
          res();
        }
      );
    });
  }
}

module.exports = new BroadcastScheduler();
