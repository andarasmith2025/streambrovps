/**
 * GracefulShutdown - Utility class for handling graceful server shutdown
 * 
 * This class manages the graceful shutdown process by:
 * - Stopping all active streams with timeout
 * - Clearing all schedulers and timers
 * - Resetting stream statuses in database
 * - Closing database connections
 * - Logging shutdown progress
 * 
 * @class GracefulShutdown
 */

const Stream = require('../models/Stream');

class GracefulShutdown {
  /**
   * Create a GracefulShutdown instance
   * 
   * @param {Object} options - Configuration options
   * @param {Object} options.streamingService - The streaming service instance
   * @param {Object} options.schedulerService - The scheduler service instance
   * @param {Object} options.server - The HTTP server instance
   * @param {Object} options.db - The database connection instance
   * @param {number} [options.shutdownTimeout=30000] - Maximum time to wait for shutdown (ms)
   */
  constructor(options) {
    if (!options.streamingService) {
      throw new Error('streamingService is required');
    }
    if (!options.schedulerService) {
      throw new Error('schedulerService is required');
    }
    if (!options.server) {
      throw new Error('server is required');
    }
    
    this.streamingService = options.streamingService;
    this.schedulerService = options.schedulerService;
    this.server = options.server;
    this.db = options.db;
    this.shutdownTimeout = options.shutdownTimeout || 30000;
    this.isShuttingDown = false;
  }
  
  /**
   * Register signal handlers for graceful shutdown
   * 
   * Listens for SIGTERM, SIGINT, and SIGUSR2 signals
   */
  registerHandlers() {
    // Handle SIGTERM (e.g., from Docker, Kubernetes, systemd)
    process.on('SIGTERM', () => {
      this.shutdown('SIGTERM');
    });
    
    // Handle SIGINT (e.g., Ctrl+C in terminal)
    process.on('SIGINT', () => {
      this.shutdown('SIGINT');
    });
    
    // Handle SIGUSR2 (e.g., nodemon restart)
    process.on('SIGUSR2', () => {
      this.shutdown('SIGUSR2');
    });
    
    console.log('[GracefulShutdown] Signal handlers registered');
  }
  
  /**
   * Execute graceful shutdown process
   * 
   * @param {string} signal - The signal that triggered the shutdown
   * @returns {Promise<void>}
   */
  async shutdown(signal) {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      console.log('[GracefulShutdown] Shutdown already in progress, ignoring signal');
      return;
    }
    
    this.isShuttingDown = true;
    console.log(`\n[GracefulShutdown] ${signal} received. Starting graceful shutdown...`);
    
    // Set a hard timeout for the entire shutdown process
    const shutdownTimer = setTimeout(() => {
      console.error('[GracefulShutdown] Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);
    
    try {
      // Step 1: Stop accepting new connections
      console.log('[GracefulShutdown] Step 1/5: Closing HTTP server...');
      await this._closeServer();
      console.log('[GracefulShutdown] HTTP server closed');
      
      // Step 2: Stop all active streams
      console.log('[GracefulShutdown] Step 2/5: Stopping all active streams...');
      await this._stopAllStreams();
      console.log('[GracefulShutdown] All streams stopped');
      
      // Step 3: Clear all schedulers
      console.log('[GracefulShutdown] Step 3/5: Clearing schedulers...');
      this._clearSchedulers();
      console.log('[GracefulShutdown] Schedulers cleared');
      
      // Step 4: Reset stream statuses in database
      console.log('[GracefulShutdown] Step 4/5: Resetting stream statuses in database...');
      await this._resetStreamStatuses();
      console.log('[GracefulShutdown] Stream statuses reset');
      
      // Step 5: Close database connection
      console.log('[GracefulShutdown] Step 5/5: Closing database connection...');
      await this._closeDatabase();
      console.log('[GracefulShutdown] Database connection closed');
      
      // Clear the shutdown timer
      clearTimeout(shutdownTimer);
      
      console.log('[GracefulShutdown] Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('[GracefulShutdown] Error during graceful shutdown:', error);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }
  
  /**
   * Close the HTTP server
   * 
   * @private
   * @returns {Promise<void>}
   */
  _closeServer() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close(() => {
        resolve();
      });
      
      // Force close after 5 seconds if server doesn't close gracefully
      setTimeout(() => {
        resolve();
      }, 5000);
    });
  }
  
  /**
   * Stop all active streams with timeout
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _stopAllStreams() {
    try {
      const activeStreams = await this.streamingService.getAllActiveStreams();
      
      if (!activeStreams || activeStreams.length === 0) {
        console.log('[GracefulShutdown] No active streams to stop');
        return;
      }
      
      console.log(`[GracefulShutdown] Found ${activeStreams.length} active stream(s) to stop`);
      
      // Stop all streams in parallel with individual timeouts
      const stopPromises = activeStreams.map(async (stream) => {
        try {
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
              console.warn(`[GracefulShutdown] Timeout stopping stream ${stream.id}`);
              resolve();
            }, 10000); // 10 second timeout per stream
          });
          
          // Pass isGracefulShutdown flag to prevent setting manual_stop
          const stopPromise = this.streamingService.stopStream(stream.id, { isGracefulShutdown: true });
          
          await Promise.race([stopPromise, timeoutPromise]);
          console.log(`[GracefulShutdown] Stopped stream: ${stream.id}`);
        } catch (err) {
          console.error(`[GracefulShutdown] Error stopping stream ${stream.id}:`, err.message);
        }
      });
      
      await Promise.all(stopPromises);
    } catch (error) {
      console.error('[GracefulShutdown] Error getting active streams:', error.message);
    }
  }
  
  /**
   * Clear all schedulers and timers
   * 
   * @private
   */
  _clearSchedulers() {
    try {
      this.schedulerService.clearAll();
      
      // Stop broadcast scheduler
      const broadcastScheduler = require('../services/broadcastScheduler');
      broadcastScheduler.stop();
      console.log('[GracefulShutdown] Broadcast scheduler stopped');
    } catch (error) {
      console.error('[GracefulShutdown] Error clearing schedulers:', error.message);
    }
  }
  
  /**
   * Reset all live streams to offline status in database
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _resetStreamStatuses() {
    try {
      const liveStreams = await Stream.findAll(null, 'live');
      
      if (!liveStreams || liveStreams.length === 0) {
        console.log('[GracefulShutdown] No live streams to reset');
        return;
      }
      
      console.log(`[GracefulShutdown] Resetting ${liveStreams.length} stream(s) to offline`);
      
      for (const stream of liveStreams) {
        try {
          await Stream.updateStatus(stream.id, 'offline');
        } catch (err) {
          console.error(`[GracefulShutdown] Error resetting stream ${stream.id}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[GracefulShutdown] Error resetting stream statuses:', error.message);
    }
  }
  
  /**
   * Close database connection
   * 
   * @private
   * @returns {Promise<void>}
   */
  _closeDatabase() {
    return new Promise((resolve) => {
      if (!this.db || !this.db.close) {
        resolve();
        return;
      }
      
      this.db.close((err) => {
        if (err) {
          console.error('[GracefulShutdown] Error closing database:', err.message);
        }
        resolve();
      });
    });
  }
}

module.exports = GracefulShutdown;
