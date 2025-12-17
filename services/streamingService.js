const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const schedulerService = require('./schedulerService');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const Stream = require('../models/Stream');
const Playlist = require('../models/Playlist');
const StreamLimiter = require('../utils/StreamLimiter');
const ResourceMonitor = require('../utils/ResourceMonitor');
const HardwareDetector = require('../utils/HardwareDetector');
let ffmpegPath;
if (fs.existsSync('/usr/bin/ffmpeg')) {
  ffmpegPath = '/usr/bin/ffmpeg';
  console.log('Using system FFmpeg at:', ffmpegPath);
} else {
  ffmpegPath = ffmpegInstaller.path;
  console.log('Using bundled FFmpeg at:', ffmpegPath);
}
const Video = require('../models/Video');
const activeStreams = new Map();
const streamLogs = new Map();
const streamRetryCount = new Map();
const MAX_RETRY_ATTEMPTS = 3;
const manuallyStoppingStreams = new Set();
const MAX_LOG_LINES = 100;
const FORCE_KILL_TIMEOUT_MS = parseInt(process.env.FORCE_KILL_TIMEOUT_MS) || 5000;

// Map to store force kill timeouts
const forceKillTimeouts = new Map();

// Initialize StreamLimiter with configuration
const MAX_CONCURRENT_STREAMS_PER_USER = parseInt(process.env.MAX_CONCURRENT_STREAMS_PER_USER) || 5;
const MAX_CONCURRENT_STREAMS_GLOBAL = parseInt(process.env.MAX_CONCURRENT_STREAMS_GLOBAL) || 20;
const streamLimiter = new StreamLimiter(MAX_CONCURRENT_STREAMS_PER_USER, MAX_CONCURRENT_STREAMS_GLOBAL);

// Initialize ResourceMonitor with configuration
const RESOURCE_WARNING_CPU_PERCENT = parseInt(process.env.RESOURCE_WARNING_CPU_PERCENT) || 80;
const RESOURCE_WARNING_MEMORY_MB = parseInt(process.env.RESOURCE_WARNING_MEMORY_MB) || 500;
const RESOURCE_MONITOR_INTERVAL_MS = parseInt(process.env.RESOURCE_MONITOR_INTERVAL_MS) || 30000;
const resourceMonitor = new ResourceMonitor(RESOURCE_WARNING_CPU_PERCENT, RESOURCE_WARNING_MEMORY_MB, RESOURCE_MONITOR_INTERVAL_MS);

// Hardware encoding configuration
const PREFER_HARDWARE_ENCODING = process.env.PREFER_HARDWARE_ENCODING !== 'false'; // Default true
const HARDWARE_ENCODER_FALLBACK = process.env.HARDWARE_ENCODER_FALLBACK !== 'false'; // Default true

// Detect hardware encoders on startup
let hardwareEncoderInfo = null;
(async () => {
  try {
    hardwareEncoderInfo = await HardwareDetector.detectEncoders(ffmpegPath);
    console.log('[StreamingService] Hardware encoder detection complete');
  } catch (error) {
    console.error('[StreamingService] Failed to detect hardware encoders:', error.message);
    hardwareEncoderInfo = {
      nvidia: false,
      intelQSV: false,
      appleVT: false,
      preferred: null
    };
  }
})();
function normalizeRtmpUrl(stream) {
  if (!stream || !stream.rtmp_url || !stream.stream_key) {
    throw new Error('RTMP URL or stream key is missing');
  }
  const baseRaw = String(stream.rtmp_url).trim();
  const keyRaw = String(stream.stream_key).trim();
  if (!baseRaw || !keyRaw) {
    throw new Error('RTMP URL or stream key is empty');
  }
  if (/[\s]/.test(baseRaw)) {
    throw new Error(`RTMP server URL contains spaces: "${baseRaw}"`);
  }
  if (/[\s#]/.test(keyRaw)) {
    throw new Error('Stream key contains invalid characters (space or # are not allowed)');
  }
  // Ensure protocol
  const base = /^(rtmps?:)\/\//i.test(baseRaw) ? baseRaw : `rtmp://${baseRaw}`;
  const sanitizedBase = base.replace(/\/$/, '');
  return `${sanitizedBase}/${keyRaw}`;
}
function addStreamLog(streamId, message) {
  if (!streamLogs.has(streamId)) {
    streamLogs.set(streamId, []);
  }
  const logs = streamLogs.get(streamId);
  logs.push({
    timestamp: new Date().toISOString(),
    message
  });
  if (logs.length > MAX_LOG_LINES) {
    logs.shift();
  }
}
async function buildFFmpegArgsForPlaylist(stream, playlist) {
  if (!playlist.videos || playlist.videos.length === 0) {
    throw new Error(`Playlist is empty for playlist_id: ${stream.video_id}`);
  }
  
  const projectRoot = path.resolve(__dirname, '..');
  const rtmpUrl = normalizeRtmpUrl(stream);
  
  let videoPaths = [];
  
  if (playlist.is_shuffle || playlist.shuffle) {
    const shuffledVideos = [...playlist.videos].sort(() => Math.random() - 0.5);
    videoPaths = shuffledVideos.map(video => {
      const relativeVideoPath = video.filepath.startsWith('/') ? video.filepath.substring(1) : video.filepath;
      return path.join(projectRoot, 'public', relativeVideoPath);
    });
  } else {
    videoPaths = playlist.videos.map(video => {
      const relativeVideoPath = video.filepath.startsWith('/') ? video.filepath.substring(1) : video.filepath;
      return path.join(projectRoot, 'public', relativeVideoPath);
    });
  }
  
  for (const videoPath of videoPaths) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
  }
  
  const concatFile = path.join(projectRoot, 'temp', `playlist_${stream.id}.txt`);
  
  const tempDir = path.dirname(concatFile);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  let concatContent = '';
  if (stream.loop_video) {
    for (let i = 0; i < 1000; i++) {
      videoPaths.forEach(videoPath => {
        concatContent += `file '${videoPath.replace(/\\/g, '/')}'\n`;
      });
    }
  } else {
    videoPaths.forEach(videoPath => {
      concatContent += `file '${videoPath.replace(/\\/g, '/')}'\n`;
    });
  }
  
  fs.writeFileSync(concatFile, concatContent);
  
  if (!stream.use_advanced_settings) {
    // Stream copy mode for playlist - optimized for low memory
    return [
      '-hwaccel', 'auto',
      '-loglevel', 'error',
      '-re',
      '-fflags', '+genpts+igndts+discardcorrupt',
      '-avoid_negative_ts', 'make_zero',
      '-probesize', '5M',           // Limit probe size
      '-analyzeduration', '5M',     // Limit analyze duration
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-bsf:v', 'h264_mp4toannexb,dump_extra',
      '-flags', '+global_header',
      '-bufsize', '1M',              // Reduce to 1MB
      '-max_muxing_queue_size', '512', // Reduce queue
      '-f', 'flv',
      rtmpUrl
    ];
  }
  
  const resolution = stream.resolution || '1280x720';
  const bitrate = stream.bitrate || 2500;
  const fps = stream.fps || 30;
  
  // Determine encoder to use
  let encoder = 'libx264';
  let preset = 'ultrafast';
  
  if (PREFER_HARDWARE_ENCODING && hardwareEncoderInfo && hardwareEncoderInfo.preferred) {
    encoder = hardwareEncoderInfo.preferred;
    preset = HardwareDetector.getPreset(encoder);
    console.log(`[StreamingService] Using hardware encoder: ${encoder} with preset: ${preset || 'default'}`);
  } else {
    console.log(`[StreamingService] Using software encoder: ${encoder} with preset: ${preset}`);
  }
  
  const args = [
    '-hwaccel', 'auto',
    '-loglevel', 'error',
    '-re',
    '-fflags', '+genpts',
    '-avoid_negative_ts', 'make_zero',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-c:v', encoder
  ];
  
  // Add preset if available
  if (preset) {
    args.push('-preset', preset);
  }
  
  // Add encoder-specific options
  if (encoder === 'libx264') {
    args.push('-tune', 'zerolatency');
  }
  
  // Common encoding options
  args.push(
    '-b:v', `${bitrate}k`,
    '-maxrate', `${bitrate}k`,
    '-bufsize', `${bitrate * 2}k`,
    '-pix_fmt', 'yuv420p',
    '-g', `${fps * 2}`,
    '-keyint_min', fps.toString(),
    '-sc_threshold', '0',
    '-force_key_frames', `expr:gte(t,n_forced*2)`, // Force keyframe every 2 seconds
    '-s', resolution,
    '-r', fps.toString(),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-max_muxing_queue_size', '1024',
    '-muxdelay', '0',
    '-muxpreload', '0',
    '-f', 'flv',
    rtmpUrl
  );
  
  return args;
}

async function buildFFmpegArgs(stream) {
  const streamWithVideo = await Stream.getStreamWithVideo(stream.id);
  
  if (streamWithVideo && streamWithVideo.video_type === 'playlist') {
    const Playlist = require('../models/Playlist');
    const playlist = await Playlist.findByIdWithVideos(stream.video_id);
    
    if (!playlist) {
      throw new Error(`Playlist not found for playlist_id: ${stream.video_id}`);
    }
    
    return await buildFFmpegArgsForPlaylist(stream, playlist);
  }
  
  const video = await Video.findById(stream.video_id);
  if (!video) {
    throw new Error(`Video record not found in database for video_id: ${stream.video_id}`);
  }
  
  const relativeVideoPath = video.filepath.startsWith('/') ? video.filepath.substring(1) : video.filepath;
  const projectRoot = path.resolve(__dirname, '..');
  const videoPath = path.join(projectRoot, 'public', relativeVideoPath);
  
  if (!fs.existsSync(videoPath)) {
    console.error(`[StreamingService] CRITICAL: Video file not found on disk.`);
    console.error(`[StreamingService] Checked path: ${videoPath}`);
    console.error(`[StreamingService] stream.video_id: ${stream.video_id}`);
    console.error(`[StreamingService] video.filepath (from DB): ${video.filepath}`);
    console.error(`[StreamingService] Calculated relativeVideoPath: ${relativeVideoPath}`);
    console.error(`[StreamingService] process.cwd(): ${process.cwd()}`);
    throw new Error('Video file not found on disk. Please check paths and file existence.');
  }
  
  const rtmpUrl = normalizeRtmpUrl(stream);
  const loopValue = stream.loop_video ? '-1' : '0';
  if (!stream.use_advanced_settings) {
    // Stream copy mode - video must be pre-encoded with proper bitrate
    // Recommended: 2500-4000 kbps for 720p, 4000-6000 kbps for 1080p
    return [
      '-hwaccel', 'auto',
      '-loglevel', 'error',
      '-re',
      '-stream_loop', loopValue,
      '-fflags', '+genpts+igndts',
      '-avoid_negative_ts', 'make_zero',
      '-i', videoPath,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-bsf:v', 'h264_mp4toannexb,dump_extra',
      '-flags', '+global_header',
      '-bufsize', '2M',
      '-max_muxing_queue_size', '1024',
      '-f', 'flv',
      rtmpUrl
    ];
  }
  const resolution = stream.resolution || '1280x720';
  const bitrate = stream.bitrate || 2500;
  const fps = stream.fps || 30;
  
  // Determine encoder to use
  let encoder = 'libx264';
  let preset = 'ultrafast';
  
  if (PREFER_HARDWARE_ENCODING && hardwareEncoderInfo && hardwareEncoderInfo.preferred) {
    encoder = hardwareEncoderInfo.preferred;
    preset = HardwareDetector.getPreset(encoder);
    console.log(`[StreamingService] Using hardware encoder: ${encoder} with preset: ${preset || 'default'}`);
  } else {
    console.log(`[StreamingService] Using software encoder: ${encoder} with preset: ${preset}`);
  }
  
  const args = [
    '-hwaccel', 'auto',
    '-loglevel', 'error',
    '-re',  // Read input at native frame rate
    '-stream_loop', loopValue,
    '-fflags', '+genpts',
    '-avoid_negative_ts', 'make_zero',
    '-i', videoPath,
    '-c:v', encoder
  ];
  
  // Add preset if available
  if (preset) {
    args.push('-preset', preset);
  }
  
  // Add encoder-specific options
  if (encoder === 'libx264') {
    args.push('-tune', 'zerolatency');
  }
  
  // Common encoding options
  args.push(
    '-b:v', `${bitrate}k`,
    '-maxrate', `${bitrate}k`,  // Match bitrate to prevent bursts
    '-bufsize', `${bitrate * 2}k`,
    '-pix_fmt', 'yuv420p',
    '-g', `${fps * 2}`,
    '-keyint_min', fps.toString(),  // Minimum keyframe interval
    '-sc_threshold', '0',  // Disable scene change detection
    '-force_key_frames', `expr:gte(t,n_forced*2)`, // Force keyframe every 2 seconds
    '-s', resolution,
    '-r', fps.toString(),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-max_muxing_queue_size', '1024',
    '-muxdelay', '0',
    '-muxpreload', '0',
    '-f', 'flv',
    rtmpUrl
  );
  
  return args;
}
async function startStream(streamId, options = {}) {
  try {
    const { isRecovery = false, skipStatusCheck = false, duration = null } = options;
    
    streamRetryCount.set(streamId, 0);
    
    // Skip active check if this is a recovery
    if (!skipStatusCheck && activeStreams.has(streamId)) {
      return { success: false, error: 'Stream is already active' };
    }
    
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return { success: false, error: 'Stream not found' };
    }
    
    // Skip limit check for recovery
    if (!isRecovery) {
      // Check stream limits
      const limitCheck = await streamLimiter.canStartStream(stream.user_id);
      if (!limitCheck.allowed) {
        console.log(`[StreamingService] Stream ${streamId} rejected: ${limitCheck.reason}`);
        return { success: false, error: limitCheck.reason };
      }
    } else {
      console.log(`[StreamingService] Recovery mode - skipping limit check for stream ${streamId}`);
    }
    const startTimeIso = new Date().toISOString();
    const streamStartTime = new Date(startTimeIso);
    const ffmpegArgs = await buildFFmpegArgs(stream);
    const fullCommand = `${ffmpegPath} ${ffmpegArgs.join(' ')}`;
    addStreamLog(streamId, `Starting stream with command: ${fullCommand}`);
    console.log(`Starting stream: ${fullCommand}`);
    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Unref the process so Node.js doesn't wait for it
    // This allows FFmpeg to continue running even if Node.js exits
    ffmpegProcess.unref();
    
    activeStreams.set(streamId, ffmpegProcess);
    await Stream.updateStatus(streamId, 'live', stream.user_id, { startTimeOverride: startTimeIso });
    
    // Register stream in limiter
    streamLimiter.registerStream(streamId, stream.user_id);
    
    // Start resource monitoring
    resourceMonitor.startMonitoring(streamId, ffmpegProcess.pid);
    
    ffmpegProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        addStreamLog(streamId, `[OUTPUT] ${message}`);
        console.log(`[FFMPEG_STDOUT] ${streamId}: ${message}`);
      }
    });
    ffmpegProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        addStreamLog(streamId, `[FFmpeg] ${message}`);
        if (!message.includes('frame=')) {
          console.error(`[FFMPEG_STDERR] ${streamId}: ${message}`);
        }
      }
    });
    ffmpegProcess.on('exit', async (code, signal) => {
      addStreamLog(streamId, `Stream ended with code ${code}, signal: ${signal}`);
      console.log(`[FFMPEG_EXIT] ${streamId}: Code=${code}, Signal=${signal}`);
      
      // Clear force kill timeout if exists
      if (forceKillTimeouts.has(streamId)) {
        clearTimeout(forceKillTimeouts.get(streamId));
        forceKillTimeouts.delete(streamId);
        console.log(`[StreamingService] Cleared force kill timeout for stream ${streamId}`);
      }
      
      const wasActive = activeStreams.delete(streamId);
      const isManualStop = manuallyStoppingStreams.has(streamId);
      if (isManualStop) {
        console.log(`[StreamingService] Stream ${streamId} was manually stopped, not restarting`);
        manuallyStoppingStreams.delete(streamId);
        if (wasActive) {
          try {
            await Stream.updateStatus(streamId, 'offline');
            if (typeof schedulerService !== 'undefined' && schedulerService.cancelStreamTermination) {
              schedulerService.handleStreamStopped(streamId);
            }
          } catch (error) {
            console.error(`[StreamingService] Error updating stream status after manual stop: ${error.message}`);
          }
        }
        // Cleanup memory
        const logCount = streamLogs.has(streamId) ? streamLogs.get(streamId).length : 0;
        const hadRetryCount = streamRetryCount.has(streamId);
        
        streamLogs.delete(streamId);
        streamRetryCount.delete(streamId);
        streamLimiter.unregisterStream(streamId);
        
        // Stop resource monitoring
        resourceMonitor.stopMonitoring(streamId);
        
        // Log detailed cleanup information
        console.log(`[StreamingService] Memory cleanup completed for manually stopped stream ${streamId}:`);
        console.log(`  - Removed ${logCount} log entries from streamLogs`);
        console.log(`  - Removed retry count: ${hadRetryCount ? 'yes' : 'no'}`);
        console.log(`  - Unregistered from stream limiter`);
        console.log(`  - Stopped resource monitoring`);
        return;
      }
      if (signal === 'SIGSEGV') {
        const retryCount = streamRetryCount.get(streamId) || 0;
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          streamRetryCount.set(streamId, retryCount + 1);
          console.log(`[StreamingService] FFmpeg crashed with SIGSEGV. Attempting restart #${retryCount + 1} for stream ${streamId}`);
          addStreamLog(streamId, `FFmpeg crashed with SIGSEGV. Attempting restart #${retryCount + 1}`);
          setTimeout(async () => {
            try {
              const streamInfo = await Stream.findById(streamId);
              if (streamInfo) {
                const result = await startStream(streamId);
                if (!result.success) {
                  console.error(`[StreamingService] Failed to restart stream: ${result.error}`);
                  await Stream.updateStatus(streamId, 'offline');
                }
              } else {
                console.error(`[StreamingService] Cannot restart stream ${streamId}: not found in database`);
              }
            } catch (error) {
              console.error(`[StreamingService] Error during stream restart: ${error.message}`);
              try {
                await Stream.updateStatus(streamId, 'offline');
              } catch (dbError) {
                console.error(`Error updating stream status: ${dbError.message}`);
              }
            }
          }, 3000);
          return;
        } else {
          console.error(`[StreamingService] Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached for stream ${streamId}`);
          addStreamLog(streamId, `Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached, stopping stream`);
        }
      }
      else {
        let errorMessage = '';
        if (code !== 0 && code !== null) {
          errorMessage = `FFmpeg process exited with error code ${code}`;
          addStreamLog(streamId, errorMessage);
          console.error(`[StreamingService] ${errorMessage} for stream ${streamId}`);
          
          // Check if this might be a hardware encoder failure (common error codes: 1, 255)
          const logs = streamLogs.get(streamId) || [];
          const recentLogs = logs.slice(-10).map(l => l.message).join(' ');
          const isEncoderError = recentLogs.includes('encoder') || 
                                 recentLogs.includes('codec') || 
                                 recentLogs.includes('nvenc') ||
                                 recentLogs.includes('qsv') ||
                                 recentLogs.includes('videotoolbox');
          
          if (isEncoderError && HARDWARE_ENCODER_FALLBACK && hardwareEncoderInfo && hardwareEncoderInfo.preferred) {
            console.warn(`[StreamingService] Hardware encoder failure detected for stream ${streamId}, falling back to software encoding`);
            addStreamLog(streamId, 'Hardware encoder failed, falling back to software encoding');
            // Temporarily disable hardware encoding for this retry
            const originalPreferred = hardwareEncoderInfo.preferred;
            hardwareEncoderInfo.preferred = null;
            
            const retryCount = streamRetryCount.get(streamId) || 0;
            if (retryCount < MAX_RETRY_ATTEMPTS) {
              streamRetryCount.set(streamId, retryCount + 1);
              console.log(`[StreamingService] Attempting restart with software encoding #${retryCount + 1} for stream ${streamId}`);
              setTimeout(async () => {
                try {
                  const streamInfo = await Stream.findById(streamId);
                  if (streamInfo) {
                    const result = await startStream(streamId);
                    if (!result.success) {
                      console.error(`[StreamingService] Failed to restart stream: ${result.error}`);
                      await Stream.updateStatus(streamId, 'offline');
                    }
                  }
                } catch (error) {
                  console.error(`[StreamingService] Error during stream restart: ${error.message}`);
                  await Stream.updateStatus(streamId, 'offline');
                } finally {
                  // Restore hardware encoder preference
                  hardwareEncoderInfo.preferred = originalPreferred;
                }
              }, 3000);
              return;
            }
          } else {
            const retryCount = streamRetryCount.get(streamId) || 0;
            if (retryCount < MAX_RETRY_ATTEMPTS) {
              streamRetryCount.set(streamId, retryCount + 1);
              console.log(`[StreamingService] FFmpeg exited with code ${code}. Attempting restart #${retryCount + 1} for stream ${streamId}`);
              setTimeout(async () => {
                try {
                  const streamInfo = await Stream.findById(streamId);
                  if (streamInfo) {
                    const result = await startStream(streamId);
                    if (!result.success) {
                      console.error(`[StreamingService] Failed to restart stream: ${result.error}`);
                      await Stream.updateStatus(streamId, 'offline');
                    }
                  }
                } catch (error) {
                  console.error(`[StreamingService] Error during stream restart: ${error.message}`);
                  await Stream.updateStatus(streamId, 'offline');
                }
              }, 3000);
              return;
            }
          }
        }
        if (wasActive) {
          try {
            console.log(`[StreamingService] Updating stream ${streamId} status to offline after FFmpeg exit`);
            await Stream.updateStatus(streamId, 'offline');
            if (typeof schedulerService !== 'undefined' && schedulerService.cancelStreamTermination) {
              schedulerService.handleStreamStopped(streamId);
            }
          } catch (error) {
            console.error(`[StreamingService] Error updating stream status after exit: ${error.message}`);
          }
          // Cleanup memory
          const logCount = streamLogs.has(streamId) ? streamLogs.get(streamId).length : 0;
          const hadRetryCount = streamRetryCount.has(streamId);
          
          streamLogs.delete(streamId);
          streamRetryCount.delete(streamId);
          streamLimiter.unregisterStream(streamId);
          
          // Stop resource monitoring
          resourceMonitor.stopMonitoring(streamId);
          
          // Log detailed cleanup information
          console.log(`[StreamingService] Memory cleanup completed for stream ${streamId} after FFmpeg exit:`);
          console.log(`  - Removed ${logCount} log entries from streamLogs`);
          console.log(`  - Removed retry count: ${hadRetryCount ? 'yes' : 'no'}`);
          console.log(`  - Unregistered from stream limiter`);
          console.log(`  - Stopped resource monitoring`);
        }
      }
    });
    ffmpegProcess.on('error', async (err) => {
      addStreamLog(streamId, `Error in stream process: ${err.message}`);
      console.error(`[FFMPEG_PROCESS_ERROR] ${streamId}: ${err.message}`);
      
      // Check if this might be a hardware encoder failure
      if (HARDWARE_ENCODER_FALLBACK && 
          hardwareEncoderInfo && 
          hardwareEncoderInfo.preferred &&
          (err.message.includes('encoder') || err.message.includes('codec'))) {
        console.warn(`[StreamingService] Possible hardware encoder failure for stream ${streamId}, will use software fallback on retry`);
        addStreamLog(streamId, 'Hardware encoder may have failed, will try software encoding on retry');
      }
      
      activeStreams.delete(streamId);
      try {
        await Stream.updateStatus(streamId, 'offline');
      } catch (error) {
        console.error(`Error updating stream status: ${error.message}`);
      }
    });
    if (typeof schedulerService !== 'undefined') {
      const durationMinutes = Number(stream.duration);
      if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
        const totalDurationMs = durationMinutes * 60 * 1000;
        const elapsedMs = Math.max(0, Date.now() - streamStartTime.getTime());
        const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
        const remainingMinutes = remainingMs / 60000;
        schedulerService.scheduleStreamTermination(streamId, remainingMinutes);
      }
    }
    return {
      success: true,
      message: 'Stream started successfully',
      isAdvancedMode: stream.use_advanced_settings
    };
  } catch (error) {
    addStreamLog(streamId, `Failed to start stream: ${error.message}`);
    console.error(`Error starting stream ${streamId}:`, error);
    return { success: false, error: error.message };
  }
}
async function stopStream(streamId) {
  try {
    const ffmpegProcess = activeStreams.get(streamId);
    const isActive = ffmpegProcess !== undefined;
    console.log(`[StreamingService] Stop request for stream ${streamId}, isActive: ${isActive}`);
    if (!isActive) {
      const stream = await Stream.findById(streamId);
      if (stream && stream.status === 'live') {
        console.log(`[StreamingService] Stream ${streamId} not active in memory but status is 'live' in DB. Fixing status.`);
        await Stream.updateStatus(streamId, 'offline', stream.user_id);
        if (typeof schedulerService !== 'undefined' && schedulerService.cancelStreamTermination) {
          schedulerService.handleStreamStopped(streamId);
        }
        return { success: true, message: 'Stream status fixed (was not active but marked as live)' };
      }
      return { success: false, error: 'Stream is not active' };
    }
    addStreamLog(streamId, 'Stopping stream...');
    console.log(`[StreamingService] Stopping active stream ${streamId}`);
    manuallyStoppingStreams.add(streamId);
    
    try {
      ffmpegProcess.kill('SIGTERM');
      console.log(`[StreamingService] Sent SIGTERM to stream ${streamId}`);
      
      // Set up force kill timeout
      const forceKillTimeout = setTimeout(() => {
        if (activeStreams.has(streamId)) {
          console.warn(`[StreamingService] Stream ${streamId} did not respond to SIGTERM after ${FORCE_KILL_TIMEOUT_MS}ms, force killing with SIGKILL`);
          addStreamLog(streamId, `Force killing stream after ${FORCE_KILL_TIMEOUT_MS}ms timeout`);
          
          try {
            ffmpegProcess.kill('SIGKILL');
            console.log(`[StreamingService] Sent SIGKILL to stream ${streamId}`);
          } catch (forceKillError) {
            console.error(`[StreamingService] Error force killing stream ${streamId}: ${forceKillError.message}`);
          }
        }
        forceKillTimeouts.delete(streamId);
      }, FORCE_KILL_TIMEOUT_MS);
      
      forceKillTimeouts.set(streamId, forceKillTimeout);
      
    } catch (killError) {
      console.error(`[StreamingService] Error killing FFmpeg process: ${killError.message}`);
      // Keep in manuallyStoppingStreams to prevent restart attempts
    }
    const stream = await Stream.findById(streamId);
    activeStreams.delete(streamId);
    
    const tempConcatFile = path.join(__dirname, '..', 'temp', `playlist_${streamId}.txt`);
    try {
      if (fs.existsSync(tempConcatFile)) {
        fs.unlinkSync(tempConcatFile);
        console.log(`[StreamingService] Cleaned up temporary playlist file: ${tempConcatFile}`);
      }
    } catch (cleanupError) {
      console.error(`[StreamingService] Error cleaning up temporary file: ${cleanupError.message}`);
    }
    
    if (stream) {
      // Clear active_schedule_id when stopping
      await Stream.update(streamId, { active_schedule_id: null });
      await Stream.updateStatus(streamId, 'offline', stream.user_id);
      const updatedStream = await Stream.findById(streamId);
      await saveStreamHistory(updatedStream);
    }
    if (typeof schedulerService !== 'undefined' && schedulerService.cancelStreamTermination) {
      schedulerService.handleStreamStopped(streamId);
    }
    
    // Cleanup memory: logs, retry counts, and manual stop flag
    const logCount = streamLogs.has(streamId) ? streamLogs.get(streamId).length : 0;
    const hadRetryCount = streamRetryCount.has(streamId);
    const hadForceKillTimeout = forceKillTimeouts.has(streamId);
    
    streamLogs.delete(streamId);
    streamRetryCount.delete(streamId);
    manuallyStoppingStreams.delete(streamId);
    
    // Clear force kill timeout if exists
    if (forceKillTimeouts.has(streamId)) {
      clearTimeout(forceKillTimeouts.get(streamId));
      forceKillTimeouts.delete(streamId);
    }
    
    // Unregister from limiter
    streamLimiter.unregisterStream(streamId);
    
    // Stop resource monitoring
    resourceMonitor.stopMonitoring(streamId);
    
    // Log detailed cleanup information
    console.log(`[StreamingService] Memory cleanup completed for stream ${streamId}:`);
    console.log(`  - Removed ${logCount} log entries from streamLogs`);
    console.log(`  - Removed retry count: ${hadRetryCount ? 'yes' : 'no'}`);
    console.log(`  - Cleared force kill timeout: ${hadForceKillTimeout ? 'yes' : 'no'}`);
    console.log(`  - Unregistered from stream limiter`);
    console.log(`  - Stopped resource monitoring`);
    
    return { success: true, message: 'Stream stopped successfully' };
  } catch (error) {
    // Ensure cleanup even on error
    const logCount = streamLogs.has(streamId) ? streamLogs.get(streamId).length : 0;
    const hadRetryCount = streamRetryCount.has(streamId);
    const hadForceKillTimeout = forceKillTimeouts.has(streamId);
    
    streamLogs.delete(streamId);
    streamRetryCount.delete(streamId);
    manuallyStoppingStreams.delete(streamId);
    
    // Clear force kill timeout if exists
    if (forceKillTimeouts.has(streamId)) {
      clearTimeout(forceKillTimeouts.get(streamId));
      forceKillTimeouts.delete(streamId);
    }
    
    streamLimiter.unregisterStream(streamId);
    
    // Stop resource monitoring
    resourceMonitor.stopMonitoring(streamId);
    
    // Log detailed cleanup information even on error
    console.log(`[StreamingService] Memory cleanup completed (after error) for stream ${streamId}:`);
    console.log(`  - Removed ${logCount} log entries from streamLogs`);
    console.log(`  - Removed retry count: ${hadRetryCount ? 'yes' : 'no'}`);
    console.log(`  - Cleared force kill timeout: ${hadForceKillTimeout ? 'yes' : 'no'}`);
    console.log(`  - Unregistered from stream limiter`);
    console.log(`  - Stopped resource monitoring`);
    
    console.error(`[StreamingService] Error stopping stream ${streamId}:`, error);
    return { success: false, error: error.message };
  }
}
async function syncStreamStatuses() {
  try {
    console.log('[StreamingService] Syncing stream statuses...');
    const liveStreams = await Stream.findAll(null, 'live');
    for (const stream of liveStreams) {
      const isReallyActive = activeStreams.has(stream.id);
      if (!isReallyActive) {
        console.log(`[StreamingService] Found inconsistent stream ${stream.id}: marked as 'live' in DB but not active in memory`);
        await Stream.updateStatus(stream.id, 'offline');
        console.log(`[StreamingService] Updated stream ${stream.id} status to 'offline'`);
      }
    }
    const activeStreamIds = Array.from(activeStreams.keys());
    for (const streamId of activeStreamIds) {
      const stream = await Stream.findById(streamId);
      if (!stream || stream.status !== 'live') {
        console.log(`[StreamingService] Found inconsistent stream ${streamId}: active in memory but not 'live' in DB`);
        if (stream) {
          await Stream.updateStatus(streamId, 'live');
          console.log(`[StreamingService] Updated stream ${streamId} status to 'live'`);
        } else {
          console.log(`[StreamingService] Stream ${streamId} not found in DB, removing from active streams`);
          const process = activeStreams.get(streamId);
          if (process) {
            try {
              process.kill('SIGTERM');
            } catch (error) {
              console.error(`[StreamingService] Error killing orphaned process: ${error.message}`);
            }
          }
          activeStreams.delete(streamId);
        }
      }
    }
    console.log(`[StreamingService] Stream status sync completed. Active streams: ${activeStreamIds.length}`);
  } catch (error) {
    console.error('[StreamingService] Error syncing stream statuses:', error);
  }
}
setInterval(syncStreamStatuses, 5 * 60 * 1000);
function isStreamActive(streamId) {
  return activeStreams.has(streamId);
}
function getActiveStreams() {
  return Array.from(activeStreams.keys());
}
function getStreamLogs(streamId) {
  return streamLogs.get(streamId) || [];
}
async function saveStreamHistory(stream) {
  try {
    if (!stream.start_time) {
      console.log(`[StreamingService] Not saving history for stream ${stream.id} - no start time recorded`);
      return false;
    }
    const startTime = new Date(stream.start_time);
    const endTime = stream.end_time ? new Date(stream.end_time) : new Date();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    if (durationSeconds < 1) {
      console.log(`[StreamingService] Not saving history for stream ${stream.id} - duration too short (${durationSeconds}s)`);
      return false;
    }
    const videoDetails = stream.video_id ? await Video.findById(stream.video_id) : null;
    const historyData = {
      id: uuidv4(),
      stream_id: stream.id,
      title: stream.title,
      platform: stream.platform || 'Custom',
      platform_icon: stream.platform_icon,
      video_id: stream.video_id,
      video_title: videoDetails ? videoDetails.title : null,
      resolution: stream.resolution,
      bitrate: stream.bitrate,
      fps: stream.fps,
      start_time: stream.start_time,
      end_time: stream.end_time || new Date().toISOString(),
      duration: durationSeconds,
      use_advanced_settings: stream.use_advanced_settings ? 1 : 0,
      user_id: stream.user_id
    };
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO stream_history (
          id, stream_id, title, platform, platform_icon, video_id, video_title,
          resolution, bitrate, fps, start_time, end_time, duration, use_advanced_settings, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyData.id, historyData.stream_id, historyData.title,
          historyData.platform, historyData.platform_icon, historyData.video_id, historyData.video_title,
          historyData.resolution, historyData.bitrate, historyData.fps,
          historyData.start_time, historyData.end_time, historyData.duration,
          historyData.use_advanced_settings, historyData.user_id
        ],
        function (err) {
          if (err) {
            console.error('[StreamingService] Error saving stream history:', err.message);
            return reject(err);
          }
          console.log(`[StreamingService] Stream history saved for stream ${stream.id}, duration: ${durationSeconds}s`);
          resolve(historyData);
        }
      );
    });
  } catch (error) {
    console.error('[StreamingService] Failed to save stream history:', error);
    return false;
  }
}
async function getAllActiveStreams() {
  try {
    const activeStreamIds = Array.from(activeStreams.keys());
    const streams = [];
    
    for (const streamId of activeStreamIds) {
      const stream = await Stream.findById(streamId);
      if (stream) {
        streams.push(stream);
      }
    }
    
    return streams;
  } catch (error) {
    console.error('[StreamingService] Error getting all active streams:', error);
    return [];
  }
}

/**
 * Cleanup orphaned temporary playlist files from previous sessions
 * @returns {Promise<number>} Number of files cleaned up
 */
async function cleanupOrphanedTempFiles() {
  const timestamp = new Date().toISOString();
  console.log(`[Cleanup] ${timestamp} - Starting cleanup of orphaned temporary files...`);
  
  try {
    const tempDir = path.join(__dirname, '..', 'temp');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`[Cleanup] ${timestamp} - Created temp directory at ${tempDir}`);
      return 0;
    }
    
    const files = fs.readdirSync(tempDir);
    const playlistFiles = files.filter(f => f.startsWith('playlist_') && f.endsWith('.txt'));
    let cleanedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log(`[Cleanup] Found ${playlistFiles.length} playlist file(s) in temp directory`);
    console.log(`[Cleanup] Currently ${activeStreams.size} active stream(s)`);
    
    for (const file of playlistFiles) {
      // Extract stream ID from filename
      const streamId = file.replace('playlist_', '').replace('.txt', '');
      
      // Check if stream is currently active
      if (!activeStreams.has(streamId)) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = fs.statSync(filePath);
          const fileSizeKB = (stats.size / 1024).toFixed(2);
          fs.unlinkSync(filePath);
          cleanedCount++;
          console.log(`[Cleanup] Removed orphaned temp file: ${file} (${fileSizeKB} KB, stream ID: ${streamId})`);
        } catch (err) {
          errorCount++;
          console.error(`[Cleanup] Failed to remove ${file}: ${err.message}`);
        }
      } else {
        skippedCount++;
        console.log(`[Cleanup] Skipped active stream file: ${file} (stream ID: ${streamId})`);
      }
    }
    
    console.log(`[Cleanup] ${timestamp} - Cleanup complete:`);
    console.log(`  - Total playlist files found: ${playlistFiles.length}`);
    console.log(`  - Orphaned files removed: ${cleanedCount}`);
    console.log(`  - Active stream files skipped: ${skippedCount}`);
    console.log(`  - Errors encountered: ${errorCount}`);
    
    return cleanedCount;
  } catch (error) {
    console.error(`[Cleanup] ${timestamp} - Error during orphaned file cleanup:`, error);
    return 0;
  }
}

async function recoverActiveStreams() {
  console.log('[Recovery] Starting auto-recovery for active streams...');
  
  try {
    const StreamSchedule = require('../models/StreamSchedule');
    const now = new Date();
    
    // Step 1: Recover manual streams (Stream Now mode)
    console.log('[Recovery] Checking for manual streams to recover...');
    const manualStreams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM streams 
         WHERE status = 'live' 
         AND start_time IS NOT NULL
         ORDER BY start_time DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    let manualRecoveredCount = 0;
    for (const stream of manualStreams) {
      try {
        const startTime = new Date(stream.start_time);
        const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
        
        // If stream was started less than 24 hours ago, try to recover
        if (elapsedMinutes < 1440) { // 24 hours
          console.log(`[Recovery] Recovering manual stream ${stream.id} (${stream.title}), elapsed: ${elapsedMinutes} minutes`);
          
          // Restart stream
          await startStream(stream.id, {
            isRecovery: true,
            skipStatusCheck: true
          });
          
          manualRecoveredCount++;
          console.log(`[Recovery] ✓ Successfully recovered manual stream ${stream.id}`);
        } else {
          // Stream too old, mark as offline
          console.log(`[Recovery] Stream ${stream.id} too old (${elapsedMinutes} minutes), marking as offline`);
          await Stream.updateStatus(stream.id, 'offline');
        }
      } catch (err) {
        console.error(`[Recovery] Failed to recover manual stream ${stream.id}:`, err.message);
        // Mark as offline if recovery fails
        await Stream.updateStatus(stream.id, 'offline').catch(() => {});
      }
    }
    
    if (manualRecoveredCount > 0) {
      console.log(`[Recovery] ✓ Recovered ${manualRecoveredCount} manual stream(s)`);
    }
    
    // Step 2: Recover scheduled streams
    console.log('[Recovery] Checking for scheduled streams to recover...');
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();
    
    // Get all pending or active schedules
    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ss.*, s.* 
         FROM stream_schedules ss
         JOIN streams s ON ss.stream_id = s.id
         WHERE ss.status IN ('pending', 'active')
         ORDER BY ss.schedule_time ASC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    if (!schedules || schedules.length === 0) {
      console.log('[Recovery] No active schedules found to recover');
      return;
    }
    
    console.log(`[Recovery] Found ${schedules.length} schedule(s) to check`);
    
    let recoveredCount = 0;
    
    for (const schedule of schedules) {
      try {
        const scheduleTime = new Date(schedule.schedule_time);
        const scheduleHours = scheduleTime.getHours();
        const scheduleMinutes = scheduleTime.getMinutes();
        const scheduleTimeStr = `${scheduleHours.toString().padStart(2, '0')}:${scheduleMinutes.toString().padStart(2, '0')}`;
        
        let shouldRecover = false;
        
        if (schedule.is_recurring) {
          // For recurring schedules, check if current time is within schedule window
          const allowedDays = schedule.recurring_days ? schedule.recurring_days.split(',').map(d => parseInt(d)) : [];
          
          if (allowedDays.includes(currentDay)) {
            // Parse schedule time as local time (not UTC)
            let scheduleLocalHours, scheduleLocalMinutes;
            
            if (!schedule.schedule_time) {
              console.log(`[Recovery] Schedule ${schedule.id} has no schedule_time, skipping`);
              continue;
            }
            
            if (schedule.schedule_time.endsWith('Z')) {
              // UTC format - convert to local
              scheduleLocalHours = scheduleTime.getHours();
              scheduleLocalMinutes = scheduleTime.getMinutes();
            } else {
              // Local format - extract directly
              const timePart = schedule.schedule_time.split('T')[1].split('.')[0];
              const [h, m] = timePart.split(':').map(Number);
              scheduleLocalHours = h;
              scheduleLocalMinutes = m;
            }
            
            // Calculate end time in local
            const durationMs = schedule.duration * 60 * 1000;
            const scheduleStartMs = scheduleLocalHours * 60 * 60 * 1000 + scheduleLocalMinutes * 60 * 1000;
            const scheduleEndMs = scheduleStartMs + durationMs;
            
            const currentMs = now.getHours() * 60 * 60 * 1000 + now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000;
            
            if (currentMs >= scheduleStartMs && currentMs < scheduleEndMs) {
              shouldRecover = true;
              const endHours = Math.floor(scheduleEndMs / (60 * 60 * 1000));
              const endMinutes = Math.floor((scheduleEndMs % (60 * 60 * 1000)) / (60 * 1000));
              console.log(`[Recovery] Recurring schedule ${schedule.id} should be active now (${scheduleLocalHours}:${scheduleLocalMinutes} - ${endHours}:${endMinutes})`);
            } else {
              console.log(`[Recovery] Recurring schedule ${schedule.id} NOT in active window. Current: ${now.getHours()}:${now.getMinutes()}, Schedule: ${scheduleLocalHours}:${scheduleLocalMinutes} - ${Math.floor(scheduleEndMs / (60 * 60 * 1000))}:${Math.floor((scheduleEndMs % (60 * 60 * 1000)) / (60 * 1000))}`);
            }
          }
        } else {
          // For one-time schedules, check if we're within the schedule window
          const endTime = new Date(scheduleTime.getTime() + (schedule.duration * 60 * 1000));
          
          if (now >= scheduleTime && now < endTime) {
            shouldRecover = true;
            console.log(`[Recovery] One-time schedule ${schedule.id} should be active now`);
          }
        }
        
        if (shouldRecover) {
          console.log(`[Recovery] Recovering stream ${schedule.stream_id} (${schedule.title})`);
          
          // Calculate remaining duration
          const scheduleTime = new Date(schedule.schedule_time);
          const endTime = new Date(scheduleTime.getTime() + (schedule.duration * 60 * 1000));
          const remainingMs = endTime - now;
          const remainingMinutes = Math.max(1, Math.floor(remainingMs / 60000));
          
          // Start the stream
          await startStream(schedule.stream_id, {
            duration: remainingMinutes,
            isRecovery: true
          });
          
          // Update schedule status
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE stream_schedules SET status = ?, executed_at = ? WHERE id = ?',
              ['active', new Date().toISOString(), schedule.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          recoveredCount++;
          console.log(`[Recovery] ✓ Successfully recovered stream ${schedule.stream_id}, remaining: ${remainingMinutes} minutes`);
        }
      } catch (err) {
        console.error(`[Recovery] Failed to recover schedule ${schedule.id}:`, err.message);
      }
    }
    
    if (recoveredCount > 0) {
      console.log(`[Recovery] ✓ Successfully recovered ${recoveredCount} stream(s)`);
    } else {
      console.log('[Recovery] No streams needed recovery');
    }
    
  } catch (error) {
    console.error('[Recovery] Error during auto-recovery:', error);
  }
}

/**
 * Get stream limiter statistics
 * @returns {object} Statistics about stream limits and usage
 */
function getStreamLimiterStats() {
  return streamLimiter.getStats();
}

module.exports = {
  startStream,
  stopStream,
  isStreamActive,
  getActiveStreams,
  getAllActiveStreams,
  getStreamLogs,
  syncStreamStatuses,
  saveStreamHistory,
  recoverActiveStreams,
  cleanupOrphanedTempFiles,
  getStreamLimiterStats
};
