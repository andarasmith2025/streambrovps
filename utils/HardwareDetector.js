const { spawn } = require('child_process');
const fs = require('fs');

/**
 * HardwareDetector - Detects available hardware encoders for FFmpeg
 * 
 * This utility detects hardware acceleration capabilities (NVIDIA NVENC, Intel Quick Sync, Apple VideoToolbox)
 * and provides the appropriate encoder and preset settings for optimal performance.
 */
class HardwareDetector {
  // Cache detection results to avoid repeated FFmpeg calls
  static detectionCache = null;
  static detectionPromise = null;

  /**
   * Detect available hardware encoders
   * @param {string} ffmpegPath - Path to FFmpeg binary (optional, will try to find it)
   * @returns {Promise<{nvidia: boolean, intelQSV: boolean, appleVT: boolean, preferred: string|null}>}
   */
  static async detectEncoders(ffmpegPath = null) {
    // Return cached result if available
    if (this.detectionCache) {
      return this.detectionCache;
    }

    // If detection is already in progress, wait for it
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    // Start new detection
    this.detectionPromise = this._performDetection(ffmpegPath);
    
    try {
      this.detectionCache = await this.detectionPromise;
      return this.detectionCache;
    } finally {
      this.detectionPromise = null;
    }
  }

  /**
   * Internal method to perform actual hardware detection
   * @private
   */
  static async _performDetection(ffmpegPath) {
    console.log('[HardwareDetector] Starting hardware encoder detection...');

    // Find FFmpeg path if not provided
    if (!ffmpegPath) {
      if (fs.existsSync('/usr/bin/ffmpeg')) {
        ffmpegPath = '/usr/bin/ffmpeg';
      } else {
        try {
          const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
          ffmpegPath = ffmpegInstaller.path;
        } catch (error) {
          console.error('[HardwareDetector] Could not find FFmpeg:', error.message);
          return {
            nvidia: false,
            intelQSV: false,
            appleVT: false,
            preferred: null
          };
        }
      }
    }

    console.log(`[HardwareDetector] Using FFmpeg at: ${ffmpegPath}`);

    // Get list of available encoders
    const encoders = await this._getEncoderList(ffmpegPath);

    // Check for specific hardware encoders
    const nvidia = encoders.includes('h264_nvenc');
    const intelQSV = encoders.includes('h264_qsv');
    const appleVT = encoders.includes('h264_videotoolbox');

    // Determine preferred encoder (priority: NVIDIA > Intel QSV > Apple VT)
    let preferred = null;
    if (nvidia) {
      preferred = 'h264_nvenc';
    } else if (intelQSV) {
      preferred = 'h264_qsv';
    } else if (appleVT) {
      preferred = 'h264_videotoolbox';
    }

    const result = {
      nvidia,
      intelQSV,
      appleVT,
      preferred
    };

    // Log detection results
    console.log('[HardwareDetector] Detection complete:');
    console.log(`  - NVIDIA NVENC: ${nvidia ? 'Available' : 'Not available'}`);
    console.log(`  - Intel Quick Sync: ${intelQSV ? 'Available' : 'Not available'}`);
    console.log(`  - Apple VideoToolbox: ${appleVT ? 'Available' : 'Not available'}`);
    console.log(`  - Preferred encoder: ${preferred || 'None (will use software encoding)'}`);

    return result;
  }

  /**
   * Get list of available encoders from FFmpeg
   * @private
   */
  static async _getEncoderList(ffmpegPath) {
    return new Promise((resolve) => {
      const encoders = [];
      
      const ffmpeg = spawn(ffmpegPath, ['-encoders']);
      
      let output = '';
      
      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffmpeg.stderr.on('data', (data) => {
        output += data.toString();
      });

      ffmpeg.on('close', () => {
        // Parse encoder list
        const lines = output.split('\n');
        
        for (const line of lines) {
          // Look for h264 encoder lines
          // Format: " V..... h264_nvenc           NVIDIA NVENC H.264 encoder (codec h264)"
          if (line.includes('h264_nvenc') || 
              line.includes('h264_qsv') || 
              line.includes('h264_videotoolbox')) {
            
            // Extract encoder name
            const match = line.match(/\s+(h264_\w+)/);
            if (match) {
              encoders.push(match[1]);
            }
          }
        }
        
        resolve(encoders);
      });

      ffmpeg.on('error', (error) => {
        console.error('[HardwareDetector] Error running FFmpeg:', error.message);
        resolve([]);
      });
    });
  }

  /**
   * Get the encoder to use based on detection results
   * @param {boolean} preferHardware - Whether to prefer hardware encoding (default: true)
   * @returns {Promise<string>} Encoder name (e.g., 'h264_nvenc', 'libx264')
   */
  static async getEncoder(preferHardware = true) {
    const detection = await this.detectEncoders();
    
    if (preferHardware && detection.preferred) {
      return detection.preferred;
    }
    
    // Fallback to software encoder
    return 'libx264';
  }

  /**
   * Get the appropriate preset for a given encoder
   * @param {string} encoder - Encoder name
   * @returns {string} Preset value
   */
  static getPreset(encoder) {
    switch (encoder) {
      case 'h264_nvenc':
        // NVENC presets: default, slow, medium, fast, hp, hq, bd, ll, llhq, llhp, lossless, losslesshp
        return 'fast';
      
      case 'h264_qsv':
        // QSV presets: veryfast, faster, fast, medium, slow, slower, veryslow
        return 'fast';
      
      case 'h264_videotoolbox':
        // VideoToolbox doesn't use traditional presets
        return null;
      
      case 'libx264':
      default:
        // Software encoder presets: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
        return 'ultrafast';
    }
  }

  /**
   * Get encoder-specific options for FFmpeg arguments
   * @param {string} encoder - Encoder name
   * @returns {Array<string>} Array of FFmpeg arguments
   */
  static getEncoderOptions(encoder) {
    const options = [];

    switch (encoder) {
      case 'h264_nvenc':
        // NVENC-specific options
        options.push('-rc', 'cbr'); // Constant bitrate
        options.push('-cbr', 'true');
        options.push('-b:v', '2500k'); // Will be overridden by stream settings
        break;
      
      case 'h264_qsv':
        // QSV-specific options
        options.push('-look_ahead', '0');
        break;
      
      case 'h264_videotoolbox':
        // VideoToolbox-specific options
        options.push('-allow_sw', '1'); // Allow software fallback
        break;
      
      case 'libx264':
      default:
        // Software encoder options (already handled in buildFFmpegArgs)
        break;
    }

    return options;
  }

  /**
   * Check if a specific encoder is available
   * @param {string} encoderName - Name of the encoder to check
   * @returns {Promise<boolean>}
   */
  static async isEncoderAvailable(encoderName) {
    const detection = await this.detectEncoders();
    
    switch (encoderName) {
      case 'h264_nvenc':
        return detection.nvidia;
      case 'h264_qsv':
        return detection.intelQSV;
      case 'h264_videotoolbox':
        return detection.appleVT;
      case 'libx264':
        return true; // Software encoder is always available
      default:
        return false;
    }
  }

  /**
   * Clear the detection cache (useful for testing or if hardware changes)
   */
  static clearCache() {
    console.log('[HardwareDetector] Clearing detection cache');
    this.detectionCache = null;
    this.detectionPromise = null;
  }

  /**
   * Get a summary of hardware capabilities
   * @returns {Promise<Object>}
   */
  static async getSummary() {
    const detection = await this.detectEncoders();
    const encoder = await this.getEncoder(true);
    const preset = this.getPreset(encoder);

    return {
      hasHardwareAcceleration: detection.preferred !== null,
      availableEncoders: {
        nvidia: detection.nvidia,
        intelQSV: detection.intelQSV,
        appleVT: detection.appleVT
      },
      recommendedEncoder: encoder,
      recommendedPreset: preset,
      preferredHardware: detection.preferred
    };
  }
}

module.exports = HardwareDetector;
