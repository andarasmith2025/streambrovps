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
            
            // Try parsing as ISO datetime first
            const scheduleTime = new Date(schedule.schedule_time);
            if (!isNaN(scheduleTime.getTime())) {
              // Valid datetime - extract local time
              scheduleHour = scheduleTime.getHours();
              scheduleMinute = scheduleTime.getMinutes();
              console.log(`[Scheduler] Parsed datetime: ${schedule.schedule_time} -> ${scheduleHour}:${scheduleMinute}`);
            } else if (schedule.schedule_time.includes(':')) {
              // Time format: "HH:MM" or "HH:MM:SS"
              const timeParts = schedule.schedule_time.split(':');
              scheduleHour = parseInt(timeParts[0]);
              scheduleMinute = parseInt(timeParts[1]);
              console.log(`[Scheduler] Parsed time string: ${schedule.schedule_time} -> ${scheduleHour}:${scheduleMinute}`);
            } else {
              console.log(`[Scheduler] ✗ Could not parse schedule_time: ${schedule.schedule_time}`);
              continue;
            }
            
            const nowHour = now.getHours();
            const nowMinute = now.getMinutes();
            
            console.log(`[Scheduler] Time comparison: schedule=${scheduleHour}:${scheduleMinute}, now=${nowHour}:${nowMinute}`);
            
            if (scheduleHour === nowHour && Math.abs(scheduleMinute - nowMinute) <= 1) {
              // Check if stream is not already live
              const stream = await Stream.findById(schedule.stream_id);
              if (stream && stream.status !== 'live') {
                schedulesToStart.push(schedule);
                console.log(`[Scheduler] ✓ Recurring schedule matched: ${schedule.stream_id} on ${getDayName(currentDay)} at ${currentTime}`);
              } else {
                console.log(`[Scheduler] ✗ Stream ${schedule.stream_id} is already live or not found`);
              }
            } else {
              console.log(`[Scheduler] ✗ Time does not match (difference: ${Math.abs((scheduleHour * 60 + scheduleMinute) - (nowHour * 60 + nowMinute))} minutes)`);
            }
          } else {
            console.log(`[Scheduler] ✗ Today (${currentDay}) is not in allowed days`);
          }
        }
      } else {
        // One-time schedule - check exact date & time
        const lookAheadTime = new Date(now.getTime() + SCHEDULE_LOOKAHEAD_SECONDS * 1000);
        
        if (scheduleTime >= now && scheduleTime <= lookAheadTime) {
          const stream = await Stream.findById(schedule.stream_id);
          if (stream && stream.status !== 'live') {
            schedulesToStart.push(schedule);
            console.log(`[Scheduler] One-time schedule matched: ${schedule.stream_id} at ${scheduleTime.toISOString()}`);
          }
        }
      }
    }
    
    // Start matched schedules
    if (schedulesToStart.length > 0) {
      console.log(`[Scheduler] Starting ${schedulesToStart.length} scheduled stream(s)`);
      
      for (const schedule of schedulesToStart) {
        const stream = await Stream.findById(schedule.stream_id);
        if (!stream) continue;
        
        console.log(`[Scheduler] Starting stream: ${stream.id} - ${stream.title}`);
        const result = await streamingService.startStream(stream.id);
        
        if (result.success) {
          console.log(`[Scheduler] Successfully started: ${stream.id}`);
          
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
      console.error('StreamingService not initialized in scheduler');
      return;
    }
    const liveStreams = await Stream.findAll(null, 'live');
    for (const stream of liveStreams) {
      if (stream.duration && stream.start_time && !scheduledTerminations.has(stream.id)) {
        const startTime = new Date(stream.start_time);
        const durationMs = stream.duration * 60 * 1000;
        const shouldEndAt = new Date(startTime.getTime() + durationMs);
        const now = new Date();
        if (shouldEndAt <= now) {
          console.log(`Stream ${stream.id} exceeded duration, stopping now`);
          await streamingService.stopStream(stream.id);
        } else {
          const timeUntilEnd = shouldEndAt.getTime() - now.getTime();
          scheduleStreamTermination(stream.id, timeUntilEnd / 60000);
        }
      }
    }
  } catch (error) {
    console.error('Error checking stream durations:', error);
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
