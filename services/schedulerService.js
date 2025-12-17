const Stream = require('../models/Stream');
const StreamSchedule = require('../models/StreamSchedule');
const scheduledTerminations = new Map();
const SCHEDULE_LOOKAHEAD_SECONDS = 60;
let streamingService = null;
let initialized = false;
let scheduleIntervalId = null;
let durationIntervalId = null;
function init(streamingServiceInstance) {
  if (initialized) {
    console.log('Stream scheduler already initialized');
    return;
  }
  streamingService = streamingServiceInstance;
  initialized = true;
  console.log('Stream scheduler initialized');
  scheduleIntervalId = setInterval(checkScheduledStreams, 60 * 1000);
  durationIntervalId = setInterval(checkStreamDurations, 60 * 1000);
  checkScheduledStreams();
  checkStreamDurations();
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
            
            // Only start if current time is AT or AFTER schedule time (within 1 minute window)
            // This prevents starting before the scheduled time
            if (scheduleHour === nowHour && timeDiff >= 0 && timeDiff <= 1) {
              // Check if stream is not already live
              const stream = await Stream.findById(schedule.stream_id);
              if (stream && stream.status !== 'live') {
                schedulesToStart.push(schedule);
                console.log(`[Scheduler] ✓ Recurring schedule matched: ${schedule.stream_id} on ${getDayName(currentDay)} at ${currentTime} (diff: ${timeDiff}m)`);
              } else {
                console.log(`[Scheduler] ✗ Stream ${schedule.stream_id} is already live or not found`);
              }
            } else {
              console.log(`[Scheduler] ✗ Time does not match (difference: ${Math.abs(timeDiff)} minutes, too ${timeDiff < 0 ? 'early' : 'late'})`);
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
        
        const lookAheadTime = new Date(now.getTime() + SCHEDULE_LOOKAHEAD_SECONDS * 1000);
        
        console.log(`[Scheduler] One-time schedule check: ${schedule.stream_id}, schedule=${scheduleTime.toLocaleString()}, now=${now.toLocaleString()}`);
        
        if (scheduleTime >= now && scheduleTime <= lookAheadTime) {
          const stream = await Stream.findById(schedule.stream_id);
          if (stream && stream.status !== 'live') {
            schedulesToStart.push(schedule);
            console.log(`[Scheduler] ✓ One-time schedule matched: ${schedule.stream_id} at ${scheduleTime.toLocaleString()}`);
          } else {
            console.log(`[Scheduler] ✗ Stream ${schedule.stream_id} is already live or not found`);
          }
        } else {
          console.log(`[Scheduler] ✗ Schedule time not in range (${Math.round((scheduleTime - now) / 1000)}s away)`);
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
        
        // Update stream duration and active_schedule_id to match this specific schedule
        // This ensures auto-stop uses the correct duration and we know which schedule is active
        await Stream.update(schedule.stream_id, { 
          duration: schedule.duration,
          active_schedule_id: schedule.id
        });
        
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
    
    const liveStreams = await Stream.findAll(null, 'live');
    console.log(`[Duration Check] Found ${liveStreams.length} live stream(s)`);
    
    for (const stream of liveStreams) {
      console.log(`[Duration Check] Checking stream ${stream.id}: duration=${stream.duration}, start_time=${stream.start_time}`);
      
      if (stream.duration && stream.start_time) {
        const startTime = new Date(stream.start_time);
        const durationMs = stream.duration * 60 * 1000;
        const shouldEndAt = new Date(startTime.getTime() + durationMs);
        const now = new Date();
        
        const elapsedMs = now.getTime() - startTime.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const remainingMs = shouldEndAt.getTime() - now.getTime();
        const remainingMinutes = Math.floor(remainingMs / 60000);
        
        console.log(`[Duration Check] Stream ${stream.id}: elapsed=${elapsedMinutes}m, remaining=${remainingMinutes}m, shouldEnd=${shouldEndAt.toLocaleString()}`);
        
        if (shouldEndAt <= now) {
          console.log(`[Duration Check] ⚠️ Stream ${stream.id} exceeded duration by ${Math.abs(remainingMinutes)} minutes, stopping now!`);
          await streamingService.stopStream(stream.id);
          scheduledTerminations.delete(stream.id);
        } else if (!scheduledTerminations.has(stream.id)) {
          const timeUntilEnd = shouldEndAt.getTime() - now.getTime();
          scheduleStreamTermination(stream.id, timeUntilEnd / 60000);
        }
      } else {
        console.log(`[Duration Check] Stream ${stream.id} missing duration or start_time, skipping`);
      }
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
