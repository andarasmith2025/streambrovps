const Stream = require('../models/Stream');
const StreamSchedule = require('../models/StreamSchedule');
const scheduledTerminations = new Map();
const SCHEDULE_LOOKAHEAD_SECONDS = 60;
let streamingService = null;
let initialized = false;
let scheduleIntervalId = null;
let durationIntervalId = null;
function init(streamingServiceInstance) {
  console.log('[SchedulerService] init() called');
  
  if (initialized) {
    console.log('[SchedulerService] ⚠️  Already initialized, skipping');
    return;
  }
  
  if (!streamingServiceInstance) {
    console.error('[SchedulerService] ❌ streamingServiceInstance is null/undefined!');
    return;
  }
  
  streamingService = streamingServiceInstance;
  initialized = true;
  console.log('[SchedulerService] ✅ Stream scheduler initialized');
  
  // Start interval for checking scheduled streams
  console.log('[SchedulerService] Starting checkScheduledStreams interval (every 60s)...');
  scheduleIntervalId = setInterval(checkScheduledStreams, 60 * 1000);
  
  // Start interval for checking stream durations
  console.log('[SchedulerService] Starting checkStreamDurations interval (every 60s)...');
  durationIntervalId = setInterval(checkStreamDurations, 60 * 1000);
  
  // Run immediately on startup
  console.log('[SchedulerService] Running initial checkScheduledStreams...');
  checkScheduledStreams();
  
  console.log('[SchedulerService] Running initial checkStreamDurations...');
  checkStreamDurations();
  
  console.log('[SchedulerService] ✅ Initialization complete');
}
async function checkScheduledStreams() {
  try {
    if (!streamingService) {
      console.error('StreamingService not initialized in scheduler');
      return;
    }
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`[Scheduler] Checking schedules at ${currentTime} on ${getDayName(currentDay)} (day ${currentDay})`);
    
    // Check stream_schedules table for schedules to start
    console.log('[Scheduler] Calling StreamSchedule.findPending()...');
    const allSchedules = await StreamSchedule.findPending();
    console.log('[Scheduler] findPending() completed');
    
    console.log(`[Scheduler] Found ${allSchedules.length} pending schedule(s)`);
    
    const schedulesToStart = [];
    
    for (const schedule of allSchedules) {
      console.log(`[Scheduler] Checking schedule ${schedule.id}: stream_id=${schedule.stream_id}, is_recurring=${schedule.is_recurring}, recurring_days=${schedule.recurring_days}, schedule_time=${schedule.schedule_time}`);
      
      if (schedule.is_recurring) {
        // Recurring schedule - check if today is allowed day
        if (schedule.recurring_days) {
          const allowedDays = schedule.recurring_days.split(',').map(d => parseInt(d));
          console.log(`[Scheduler] Recurring schedule allowed days: ${allowedDays.join(',')}, current day: ${currentDay}`);
          
          if (allowedDays.includes(currentDay)) {
            // For recurring, schedule_time might be stored as full datetime
            // We need to extract just the time part
            let scheduleHour, scheduleMinute;
            
            // Check if it's a time-only format first (HH:MM or HH:MM:SS)
            if (schedule.schedule_time.includes(':') && !schedule.schedule_time.includes('T')) {
              // Time format: "HH:MM" or "HH:MM:SS"
              const timeParts = schedule.schedule_time.split(':');
              scheduleHour = parseInt(timeParts[0]);
              scheduleMinute = parseInt(timeParts[1]);
              console.log(`[Scheduler] Parsed time string: ${schedule.schedule_time} -> ${scheduleHour}:${scheduleMinute}`);
            } else if (schedule.schedule_time.includes('T')) {
              // ISO datetime format: "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DDTHH:MM:SS.000Z"
              // IMPORTANT: If it has 'Z' at the end, it's UTC and needs conversion to local
              // If no 'Z', it's already local time
              
              if (schedule.schedule_time.endsWith('Z')) {
                // UTC format - convert to local time
                // Create Date object from UTC string - this automatically converts to local timezone
                const utcDate = new Date(schedule.schedule_time);
                
                // getHours() and getMinutes() return values in LOCAL timezone
                scheduleHour = utcDate.getHours();
                scheduleMinute = utcDate.getMinutes();
                
                console.log(`[Scheduler] Parsed datetime (UTC->Local): ${schedule.schedule_time} -> Local: ${scheduleHour}:${scheduleMinute} (Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
              } else {
                // Local format - extract time directly
                const timePart = schedule.schedule_time.split('T')[1].split('.')[0]; // Remove .000 if exists
                const timeParts = timePart.split(':');
                scheduleHour = parseInt(timeParts[0]);
                scheduleMinute = parseInt(timeParts[1]);
                console.log(`[Scheduler] Parsed datetime (local): ${schedule.schedule_time} -> ${scheduleHour}:${scheduleMinute}`);
              }
            } else {
              console.log(`[Scheduler] ✗ Could not parse schedule_time: ${schedule.schedule_time}`);
              continue;
            }
            
            const nowHour = now.getHours();
            const nowMinute = now.getMinutes();
            
            console.log(`[Scheduler] Time comparison: schedule=${scheduleHour}:${scheduleMinute}, now=${nowHour}:${nowMinute}`);
            
            // Calculate time difference in minutes
            const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute;
            const nowTimeInMinutes = nowHour * 60 + nowMinute;
            const timeDiff = nowTimeInMinutes - scheduleTimeInMinutes;
            
            // ⭐ YOUTUBE API OPTIMIZATION: Start FFmpeg 2 minutes BEFORE schedule time
            // This allows ingestion to stabilize before going live
            // For YouTube API streams: start at schedule_time - 2 minutes
            // For regular streams: start at schedule_time (as before)
            
            const stream = await Stream.findById(schedule.stream_id);
            if (!stream) {
              console.log(`[Scheduler] ✗ Stream ${schedule.stream_id} not found`);
              continue;
            }
            
            let startWindow = { min: 0, max: 1 }; // Default: start at schedule time (0-1 min window)
            
            if (stream.use_youtube_api) {
              // YouTube API: Start 2 minutes early, allow up to 10 minutes late (for restart tolerance)
              startWindow = { min: -2, max: 10 }; // Start 2 min before to 10 min after
              console.log(`[Scheduler] YouTube API stream: will start 2 minutes early for ingestion warmup`);
            }
            
            // Check if current time is within the start window
            if (timeDiff >= startWindow.min && timeDiff <= startWindow.max) {
              // ⭐ CRITICAL FIX: Check if stream has stale active_schedule_id
              // This happens when stream was stopped manually or crashed without cleanup
              if (stream.active_schedule_id && stream.active_schedule_id !== schedule.id) {
                console.log(`[Scheduler] ⚠️ Stream ${schedule.stream_id} has stale active_schedule_id: ${stream.active_schedule_id}`);
                console.log(`[Scheduler] 🔧 Clearing stale active_schedule_id to allow new schedule to start`);
                await Stream.update(schedule.stream_id, { 
                  active_schedule_id: null, 
                  scheduled_end_time: null 
                });
                // Reload stream data
                const updatedStream = await Stream.findById(schedule.stream_id);
                if (updatedStream) {
                  stream.status = updatedStream.status;
                  stream.active_schedule_id = updatedStream.active_schedule_id;
                }
              }
              
              // Check if stream is not already live
              if (stream.status !== 'live') {
                schedulesToStart.push(schedule);
                console.log(`[Scheduler] ✓ Recurring schedule matched: ${schedule.stream_id} on ${getDayName(currentDay)} at ${currentTime} (diff: ${timeDiff}m, window: ${startWindow.min} to ${startWindow.max})`);
              } else {
                console.log(`[Scheduler] ✗ Stream ${schedule.stream_id} is already live`);
              }
            } else {
              console.log(`[Scheduler] ✗ Time does not match (difference: ${timeDiff} minutes, window: ${startWindow.min} to ${startWindow.max})`);
            }
          } else {
            console.log(`[Scheduler] ✗ Today (${currentDay}) is not in allowed days`);
          }
        }
      } else {
        // One-time schedule - check exact date & time
        // Parse schedule_time as local time (not UTC)
        // Format: "YYYY-MM-DDTHH:MM:SS" without timezone
        const scheduleTime = new Date(schedule.schedule_time);
        
        // Check if parsing was successful
        if (isNaN(scheduleTime.getTime())) {
          console.log(`[Scheduler] ✗ Invalid schedule_time format: ${schedule.schedule_time}`);
          continue;
        }
        
        // ⭐ YOUTUBE API OPTIMIZATION: Start FFmpeg 2 minutes BEFORE schedule time
        const stream = await Stream.findById(schedule.stream_id);
        if (!stream) {
          console.log(`[Scheduler] ✗ Stream ${schedule.stream_id} not found`);
          continue;
        }
        
        let earlyStartMs = 0; // Default: no early start
        if (stream.use_youtube_api) {
          earlyStartMs = 2 * 60 * 1000; // 2 minutes early for YouTube API
          console.log(`[Scheduler] YouTube API stream: will start 2 minutes early for ingestion warmup`);
        }
        
        const adjustedScheduleTime = new Date(scheduleTime.getTime() - earlyStartMs);
        const lookAheadTime = new Date(now.getTime() + SCHEDULE_LOOKAHEAD_SECONDS * 1000);
        
        console.log(`[Scheduler] One-time schedule check: ${schedule.stream_id}, schedule=${scheduleTime.toLocaleString()}, adjusted=${adjustedScheduleTime.toLocaleString()}, now=${now.toLocaleString()}`);
        
        if (adjustedScheduleTime >= now && adjustedScheduleTime <= lookAheadTime) {
          // ⭐ CRITICAL FIX: Check if stream has stale active_schedule_id
          if (stream.active_schedule_id && stream.active_schedule_id !== schedule.id) {
            console.log(`[Scheduler] ⚠️ Stream ${schedule.stream_id} has stale active_schedule_id: ${stream.active_schedule_id}`);
            console.log(`[Scheduler] 🔧 Clearing stale active_schedule_id to allow new schedule to start`);
            await Stream.update(schedule.stream_id, { 
              active_schedule_id: null, 
              scheduled_end_time: null 
            });
            // Reload stream data
            const updatedStream = await Stream.findById(schedule.stream_id);
            if (updatedStream) {
              stream.status = updatedStream.status;
              stream.active_schedule_id = updatedStream.active_schedule_id;
            }
          }
          
          if (stream.status !== 'live') {
            schedulesToStart.push(schedule);
            console.log(`[Scheduler] ✓ One-time schedule matched: ${schedule.stream_id} at ${scheduleTime.toLocaleString()} (starting at ${adjustedScheduleTime.toLocaleString()})`);
          } else {
            console.log(`[Scheduler] ✗ Stream ${schedule.stream_id} is already live`);
          }
        } else {
          console.log(`[Scheduler] ✗ Schedule time not in range (${Math.round((adjustedScheduleTime - now) / 1000)}s away)`);
        }
      }
    }
    
    // Start matched schedules
    if (schedulesToStart.length > 0) {
      console.log(`[Scheduler] Starting ${schedulesToStart.length} scheduled stream(s)`);
      
      for (const schedule of schedulesToStart) {
        const stream = await Stream.findById(schedule.stream_id);
        if (!stream) continue;
        
        console.log(`[Scheduler] Starting stream: ${stream.id} - ${stream.title} with duration ${schedule.duration} minutes (schedule: ${schedule.id})`);
        
        // ⭐ CRITICAL: Refresh YouTube tokens before starting stream (for recurring schedules)
        if (stream.use_youtube_api && stream.user_id) {
          try {
            console.log(`[Scheduler] Refreshing YouTube tokens for user ${stream.user_id} before starting stream`);
            const { getTokensForUser } = require('../routes/youtube');
            const tokens = await getTokensForUser(stream.user_id);
            
            if (tokens && tokens.access_token) {
              const now = Date.now();
              const expiry = tokens.expiry_date ? Number(tokens.expiry_date) : 0;
              const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
              console.log(`[Scheduler] ✓ YouTube token valid (expires in ${minutesUntilExpiry} minutes)`);
            } else {
              console.error(`[Scheduler] ❌ Failed to get valid YouTube tokens for user ${stream.user_id}`);
              console.error(`[Scheduler] Stream ${stream.id} will NOT start - YouTube tokens missing or expired`);
              
              // Mark schedule as failed
              if (!schedule.is_recurring) {
                await StreamSchedule.updateStatus(schedule.id, 'failed');
              }
              continue; // Skip this stream
            }
          } catch (tokenError) {
            console.error(`[Scheduler] ❌ Error refreshing YouTube tokens:`, tokenError.message);
            console.error(`[Scheduler] Stream ${stream.id} will NOT start - token refresh failed`);
            
            // Mark schedule as failed
            if (!schedule.is_recurring) {
              await StreamSchedule.updateStatus(schedule.id, 'failed');
            }
            continue; // Skip this stream
          }
        }
        
        // Update stream with schedule info (end_time and active_schedule_id)
        // This ensures auto-stop uses the correct end time and we know which schedule is active
        console.log(`[Scheduler] Setting active_schedule_id=${schedule.id} for stream ${schedule.stream_id}`);
        
        // ⭐ CRITICAL FIX: Calculate end_time for TODAY, not from old schedule_time
        // For recurring schedules, schedule_time might be from weeks ago
        // We need to calculate end time based on CURRENT execution time
        let scheduleEndTime;
        
        if (schedule.is_recurring) {
          // For recurring: Use current time + duration
          const now = new Date();
          scheduleEndTime = new Date(now.getTime() + schedule.duration * 60 * 1000).toISOString();
          console.log(`[Scheduler] Recurring schedule: end_time = NOW + ${schedule.duration}m = ${scheduleEndTime}`);
        } else {
          // For one-time: Use schedule.end_time or schedule_time + duration
          scheduleEndTime = schedule.end_time || new Date(new Date(schedule.schedule_time).getTime() + schedule.duration * 60 * 1000).toISOString();
          console.log(`[Scheduler] One-time schedule: end_time = ${scheduleEndTime}`);
        }
        
        await Stream.update(schedule.stream_id, { 
          duration: schedule.duration,
          scheduled_end_time: scheduleEndTime,
          active_schedule_id: schedule.id
        });
        console.log(`[Scheduler] ✓ Stream ${schedule.stream_id} updated: active_schedule=${schedule.id}, end_time=${scheduleEndTime}`);
        
        const result = await streamingService.startStream(stream.id);
        
        if (result.success) {
          console.log(`[Scheduler] Successfully started: ${stream.id} (will auto-stop after ${schedule.duration} minutes, active_schedule: ${schedule.id})`);
          
          // Update schedule status (only for one-time schedules)
          if (!schedule.is_recurring) {
            await StreamSchedule.updateStatus(schedule.id, 'running', new Date().toISOString());
          }
        } else {
          console.error(`[Scheduler] Failed to start ${stream.id}: ${result.error}`);
          
          // Mark as failed (only for one-time schedules)
          if (!schedule.is_recurring) {
            await StreamSchedule.updateStatus(schedule.id, 'failed');
          }
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error checking scheduled streams:', error);
    console.error('[Scheduler] Error stack:', error.stack);
  }
}

function getDayName(day) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
}
async function checkStreamDurations() {
  try {
    if (!streamingService) {
      console.error('[Duration Check] StreamingService not initialized in scheduler');
      return;
    }
    
    const now = new Date();
    const currentTimeWIB = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
    console.log(`[Duration Check] ⏰ Running at ${currentTimeWIB} WIB`);
    
    const liveStreams = await Stream.findAll(null, 'live');
    console.log(`[Duration Check] Found ${liveStreams.length} live stream(s)`);
    
    if (liveStreams.length === 0) {
      console.log('[Duration Check] No live streams to check');
      return;
    }
    
    for (const stream of liveStreams) {
      console.log(`\n[Duration Check] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`[Duration Check] Checking stream: ${stream.title} (ID: ${stream.id})`);
      console.log(`[Duration Check]   scheduled_end_time: ${stream.scheduled_end_time || 'NOT SET'}`);
      console.log(`[Duration Check]   active_schedule_id: ${stream.active_schedule_id || 'NOT SET'}`);
      console.log(`[Duration Check]   duration: ${stream.duration || 'NOT SET'} minutes`);
      console.log(`[Duration Check]   start_time: ${stream.start_time || 'NOT SET'}`);
      
      // ⭐ NEW LOGIC: Use scheduled_end_time if available (most reliable)
      let endTime = stream.scheduled_end_time;
      let endTimeSource = 'scheduled_end_time';
      
      // Fallback 1: If stream has active_schedule_id, get end_time from schedule
      if (!endTime && stream.active_schedule_id) {
        console.log(`[Duration Check] No scheduled_end_time, checking active schedule ${stream.active_schedule_id}...`);
        
        const StreamSchedule = require('../models/StreamSchedule');
        const schedule = await StreamSchedule.findById(stream.active_schedule_id);
        
        if (schedule) {
          if (schedule.end_time) {
            endTime = schedule.end_time;
            endTimeSource = 'schedule.end_time';
            console.log(`[Duration Check] ✓ Using schedule.end_time: ${endTime}`);
          } else {
            // Calculate from schedule time + duration
            endTime = new Date(new Date(schedule.schedule_time).getTime() + schedule.duration * 60 * 1000).toISOString();
            endTimeSource = 'schedule.time + duration';
            console.log(`[Duration Check] ✓ Calculated from schedule: ${endTime}`);
          }
        } else {
          console.warn(`[Duration Check] ⚠️  Active schedule ${stream.active_schedule_id} not found in database!`);
        }
      }
      
      // Fallback 2: Calculate from start_time + duration (old method)
      // ⚠️ WARNING: This fallback is DANGEROUS for recovery streams!
      // Only use if stream has active_schedule_id (started by scheduler)
      if (!endTime && stream.duration && stream.start_time && stream.active_schedule_id) {
        const start = new Date(stream.start_time);
        endTime = new Date(start.getTime() + stream.duration * 60 * 1000).toISOString();
        endTimeSource = 'start_time + duration';
        console.log(`[Duration Check] ✓ Calculated from start_time + duration: ${endTime}`);
      }
      
      if (endTime) {
        const shouldEndAt = new Date(endTime);
        const shouldEndAtWIB = shouldEndAt.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
        
        const remainingMs = shouldEndAt.getTime() - now.getTime();
        const remainingMinutes = Math.floor(remainingMs / 60000);
        
        console.log(`[Duration Check] End time analysis:`);
        console.log(`[Duration Check]   Source: ${endTimeSource}`);
        console.log(`[Duration Check]   Should end at: ${shouldEndAtWIB} WIB`);
        console.log(`[Duration Check]   Current time: ${currentTimeWIB} WIB`);
        console.log(`[Duration Check]   Time remaining: ${remainingMinutes} minutes`);
        
        if (shouldEndAt <= now) {
          console.log(`[Duration Check] 🛑 Stream ${stream.id} exceeded end time by ${Math.abs(remainingMinutes)} minutes!`);
          console.log(`[Duration Check] 🛑 Stopping stream now...`);
          
          const stopResult = await streamingService.stopStream(stream.id);
          
          if (stopResult.success) {
            console.log(`[Duration Check] ✅ Stream ${stream.id} stopped successfully`);
          } else {
            console.error(`[Duration Check] ❌ Failed to stop stream ${stream.id}: ${stopResult.error}`);
            
            // ⭐ CRITICAL FIX: If stop failed, force update status to offline
            // This handles edge cases where stream is stuck in "live" status
            console.log(`[Duration Check] 🔧 Force updating stream ${stream.id} status to offline`);
            const Stream = require('../models/Stream');
            await Stream.updateStatus(stream.id, 'offline', stream.user_id);
            await Stream.update(stream.id, { active_schedule_id: null, scheduled_end_time: null });
            console.log(`[Duration Check] ✅ Stream ${stream.id} forced to offline`);
          }
        } else {
          console.log(`[Duration Check] ✓ Stream ${stream.id} will stop in ${remainingMinutes} minutes`);
        }
      } else {
        console.warn(`[Duration Check] ⚠️  Stream ${stream.id} has NO end time information!`);
        console.warn(`[Duration Check] ⚠️  Cannot determine when to stop this stream`);
      }
      console.log(`[Duration Check] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }
  } catch (error) {
    console.error('[Duration Check] Error checking stream durations:', error);
  }
}
function scheduleStreamTermination(streamId, durationMinutes) {
  if (!streamingService) {
    console.error('StreamingService not initialized in scheduler');
    return;
  }
  if (typeof durationMinutes !== 'number' || Number.isNaN(durationMinutes)) {
    console.error(`Invalid duration provided for stream ${streamId}: ${durationMinutes}`);
    return;
  }
  if (scheduledTerminations.has(streamId)) {
    clearTimeout(scheduledTerminations.get(streamId));
  }
  const clampedMinutes = Math.max(0, durationMinutes);
  const durationMs = clampedMinutes * 60 * 1000;
  console.log(`Scheduling termination for stream ${streamId} after ${clampedMinutes} minutes`);
  const timeoutId = setTimeout(async () => {
    try {
      console.log(`Terminating stream ${streamId} after ${clampedMinutes} minute duration`);
      await streamingService.stopStream(streamId);
      scheduledTerminations.delete(streamId);
    } catch (error) {
      console.error(`Error terminating stream ${streamId}:`, error);
    }
  }, durationMs);
  scheduledTerminations.set(streamId, timeoutId);
}
function cancelStreamTermination(streamId) {
  if (scheduledTerminations.has(streamId)) {
    clearTimeout(scheduledTerminations.get(streamId));
    scheduledTerminations.delete(streamId);
    console.log(`Cancelled scheduled termination for stream ${streamId}`);
    return true;
  }
  return false;
}
function handleStreamStopped(streamId) {
  return cancelStreamTermination(streamId);
}
function clearAll() {
  console.log('[SchedulerService] Clearing all schedulers...');
  
  // Clear all stream termination timers
  scheduledTerminations.forEach((timer, streamId) => {
    clearTimeout(timer);
    console.log(`[SchedulerService] Cleared termination timer for stream ${streamId}`);
  });
  scheduledTerminations.clear();
  
  // Clear schedule check intervals
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
    console.log('[SchedulerService] Cleared schedule check interval');
    scheduleIntervalId = null;
  }
  
  if (durationIntervalId) {
    clearInterval(durationIntervalId);
    console.log('[SchedulerService] Cleared duration check interval');
    durationIntervalId = null;
  }
  
  console.log('[SchedulerService] All schedulers cleared');
}

module.exports = {
  init,
  scheduleStreamTermination,
  cancelStreamTermination,
  handleStreamStopped,
  clearAll
};
