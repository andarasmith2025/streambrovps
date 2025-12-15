/**
 * StreamLimiter - Manages concurrent stream limits per user and globally
 * 
 * Prevents server overload by enforcing limits on how many streams
 * can run simultaneously per user and across the entire system.
 */

class StreamLimiter {
  /**
   * @param {number} maxPerUser - Maximum concurrent streams per user
   * @param {number} maxGlobal - Maximum concurrent streams globally
   */
  constructor(maxPerUser = 5, maxGlobal = 20) {
    this.maxPerUser = maxPerUser;
    this.maxGlobal = maxGlobal;
    
    // Map of userId -> Set of streamIds
    this.userStreams = new Map();
    
    // Set of all active streamIds
    this.allStreams = new Set();
    
    console.log(`[StreamLimiter] Initialized with limits: ${maxPerUser} per user, ${maxGlobal} global`);
  }
  
  /**
   * Check if a user can start a new stream
   * @param {string} userId - User ID
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async canStartStream(userId) {
    const globalCount = this.allStreams.size;
    const userStreamCount = this.getUserStreamCount(userId);
    
    // Check global limit
    if (globalCount >= this.maxGlobal) {
      const reason = `Server at maximum capacity (${this.maxGlobal} streams). Please try again later.`;
      console.warn(`[StreamLimiter] Stream rejected for user ${userId}: ${reason}`);
      console.warn(`[StreamLimiter] Current counts - Global: ${globalCount}/${this.maxGlobal}`);
      return {
        allowed: false,
        reason
      };
    }
    
    // Get user-specific limit from database
    let userLimit = this.maxPerUser; // Default fallback
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (user && user.max_concurrent_streams !== undefined && user.max_concurrent_streams !== null) {
        userLimit = user.max_concurrent_streams;
      }
    } catch (error) {
      console.error(`[StreamLimiter] Error fetching user limit for ${userId}, using default:`, error.message);
    }
    
    // Check user-specific limit
    if (userStreamCount >= userLimit) {
      const reason = `You have reached your concurrent stream limit (${userStreamCount}/${userLimit} streams active). Please stop a stream before starting a new one.`;
      console.warn(`[StreamLimiter] Stream rejected for user ${userId}: ${reason}`);
      console.warn(`[StreamLimiter] Current counts - Global: ${globalCount}/${this.maxGlobal}, User: ${userStreamCount}/${userLimit}`);
      return {
        allowed: false,
        reason
      };
    }
    
    console.info(`[StreamLimiter] Stream allowed for user ${userId}. Current counts - Global: ${globalCount}/${this.maxGlobal}, User: ${userStreamCount}/${userLimit}`);
    return { allowed: true };
  }
  
  /**
   * Register a new active stream
   * @param {string} streamId - Stream ID
   * @param {string} userId - User ID
   */
  registerStream(streamId, userId) {
    // Add to global set
    this.allStreams.add(streamId);
    
    // Add to user's set
    if (!this.userStreams.has(userId)) {
      this.userStreams.set(userId, new Set());
    }
    this.userStreams.get(userId).add(streamId);
    
    console.log(`[StreamLimiter] Registered stream ${streamId} for user ${userId}. User: ${this.getUserStreamCount(userId)}/${this.maxPerUser}, Global: ${this.getGlobalStreamCount()}/${this.maxGlobal}`);
  }
  
  /**
   * Unregister a stopped stream
   * @param {string} streamId - Stream ID
   */
  unregisterStream(streamId) {
    // Remove from global set
    this.allStreams.delete(streamId);
    
    // Remove from user's set
    for (const [userId, streams] of this.userStreams.entries()) {
      if (streams.has(streamId)) {
        streams.delete(streamId);
        
        // Clean up empty user entries
        if (streams.size === 0) {
          this.userStreams.delete(userId);
        }
        
        console.log(`[StreamLimiter] Unregistered stream ${streamId} for user ${userId}. User: ${this.getUserStreamCount(userId)}/${this.maxPerUser}, Global: ${this.getGlobalStreamCount()}/${this.maxGlobal}`);
        break;
      }
    }
  }
  
  /**
   * Get current stream count for a user
   * @param {string} userId - User ID
   * @returns {number}
   */
  getUserStreamCount(userId) {
    const streams = this.userStreams.get(userId);
    return streams ? streams.size : 0;
  }
  
  /**
   * Get current global stream count
   * @returns {number}
   */
  getGlobalStreamCount() {
    return this.allStreams.size;
  }
  
  /**
   * Get all active stream IDs for a user
   * @param {string} userId - User ID
   * @returns {string[]}
   */
  getUserStreams(userId) {
    const streams = this.userStreams.get(userId);
    return streams ? Array.from(streams) : [];
  }
  
  /**
   * Get all active stream IDs globally
   * @returns {string[]}
   */
  getAllStreams() {
    return Array.from(this.allStreams);
  }
  
  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      globalCount: this.getGlobalStreamCount(),
      globalLimit: this.maxGlobal,
      globalUsagePercent: Math.round((this.getGlobalStreamCount() / this.maxGlobal) * 100),
      userCount: this.userStreams.size,
      perUserLimit: this.maxPerUser
    };
  }
}

module.exports = StreamLimiter;
