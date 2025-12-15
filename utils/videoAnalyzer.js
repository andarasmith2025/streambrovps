const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

/**
 * Analyze video quality and streaming compatibility
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} Analysis result with recommendations
 */
async function analyzeVideo(videoPath) {
  try {
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    
    // Get video metadata using ffprobe
    const { stdout } = await execFileAsync(ffprobePath, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate,bit_rate,codec_name:format=duration,bit_rate',
      '-show_entries', 'packet=pts_time,flags',
      '-read_intervals', '%+#100', // Read first 100 packets to detect GOP
      '-of', 'json',
      videoPath
    ]);

    const data = JSON.parse(stdout);
    const stream = data.streams?.[0];
    const format = data.format;
    const packets = data.packets || [];

    if (!stream) {
      throw new Error('No video stream found');
    }

    // Parse resolution
    const width = parseInt(stream.width);
    const height = parseInt(stream.height);
    const resolution = `${width}x${height}`;

    // Parse FPS
    const fpsMatch = stream.r_frame_rate?.match(/(\d+)\/(\d+)/);
    const fps = fpsMatch ? Math.round(parseInt(fpsMatch[1]) / parseInt(fpsMatch[2])) : 30;

    // Parse bitrate (prefer stream bitrate, fallback to format bitrate)
    const bitrate = parseInt(stream.bit_rate || format.bit_rate || 0) / 1000; // Convert to kbps

    // Calculate GOP size (keyframe interval)
    let gopSize = 0;
    let keyframeCount = 0;
    let lastKeyframeIndex = -1;

    packets.forEach((packet, index) => {
      if (packet.flags && packet.flags.includes('K')) {
        keyframeCount++;
        if (lastKeyframeIndex >= 0) {
          gopSize = Math.max(gopSize, index - lastKeyframeIndex);
        }
        lastKeyframeIndex = index;
      }
    });

    const gopSeconds = gopSize > 0 ? gopSize / fps : 0;

    // Determine quality tier
    let qualityTier = 'unknown';
    if (height >= 2160) qualityTier = '4K';
    else if (height >= 1440) qualityTier = '1440p';
    else if (height >= 1080) qualityTier = '1080p';
    else if (height >= 720) qualityTier = '720p';
    else if (height >= 480) qualityTier = '480p';
    else qualityTier = '360p';

    // Recommended bitrate ranges (kbps)
    const bitrateRecommendations = {
      '4K': { min: 13000, recommended: 20000, max: 51000 },
      '1440p': { min: 6000, recommended: 9000, max: 24000 },
      '1080p': { min: 4000, recommended: 6000, max: 12000 },
      '720p': { min: 2500, recommended: 4000, max: 7500 },
      '480p': { min: 1000, recommended: 2000, max: 4000 },
      '360p': { min: 500, recommended: 1000, max: 2000 }
    };

    const recommended = bitrateRecommendations[qualityTier] || bitrateRecommendations['720p'];

    // Check if video meets streaming requirements
    const issues = [];
    const warnings = [];

    // Check bitrate
    if (bitrate < recommended.min) {
      issues.push({
        type: 'bitrate_low',
        severity: 'error',
        message: `Bitrate too low (${Math.round(bitrate)} kbps). Minimum ${recommended.min} kbps recommended for ${qualityTier}.`,
        recommendation: 'Re-encode video with higher bitrate or use Advanced Settings when streaming.'
      });
    } else if (bitrate < recommended.recommended) {
      warnings.push({
        type: 'bitrate_suboptimal',
        severity: 'warning',
        message: `Bitrate is below recommended (${Math.round(bitrate)} kbps). Recommended: ${recommended.recommended} kbps for ${qualityTier}.`,
        recommendation: 'Consider re-encoding for better quality.'
      });
    }

    // Check GOP size (keyframe interval)
    if (gopSeconds > 4) {
      issues.push({
        type: 'gop_too_large',
        severity: 'error',
        message: `Keyframe interval too large (${gopSeconds.toFixed(1)} seconds). YouTube requires ≤4 seconds.`,
        recommendation: 'Enable "Advanced Settings" when creating stream, or re-encode video with GOP ≤2 seconds.'
      });
    } else if (gopSeconds > 2) {
      warnings.push({
        type: 'gop_suboptimal',
        severity: 'warning',
        message: `Keyframe interval is ${gopSeconds.toFixed(1)} seconds. Recommended: ≤2 seconds for best compatibility.`,
        recommendation: 'Consider enabling "Advanced Settings" for YouTube streaming.'
      });
    }

    // Check codec
    if (stream.codec_name !== 'h264') {
      warnings.push({
        type: 'codec_compatibility',
        severity: 'warning',
        message: `Video codec is ${stream.codec_name}. H.264 is recommended for best compatibility.`,
        recommendation: 'Video will be re-encoded to H.264 when using Advanced Settings.'
      });
    }

    return {
      success: true,
      video: {
        resolution,
        width,
        height,
        fps,
        bitrate: Math.round(bitrate),
        codec: stream.codec_name,
        duration: parseFloat(format.duration),
        qualityTier,
        gopSize,
        gopSeconds: parseFloat(gopSeconds.toFixed(2))
      },
      recommendations: {
        minBitrate: recommended.min,
        recommendedBitrate: recommended.recommended,
        maxBitrate: recommended.max
      },
      compatibility: {
        streamcopyReady: issues.length === 0,
        youtubeReady: gopSeconds <= 4 && bitrate >= recommended.min,
        requiresAdvancedSettings: gopSeconds > 4 || bitrate < recommended.min
      },
      issues,
      warnings
    };

  } catch (error) {
    console.error('Video analysis error:', error);
    return {
      success: false,
      error: error.message,
      video: null,
      issues: [{
        type: 'analysis_failed',
        severity: 'error',
        message: 'Failed to analyze video',
        recommendation: 'Video may still work, but quality cannot be verified.'
      }]
    };
  }
}

module.exports = { analyzeVideo };
