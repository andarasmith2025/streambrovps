const pidusage = require('pidusage');

/**
 * ResourceMonitor - Monitors CPU and memory usage of FFmpeg processes
 * 
 * This utility monitors resource usage of streaming processes and logs warnings
 * when thresholds are exceeded.
 */
class ResourceMonitor {
  /**
   * Create a ResourceMonitor instance
   * @param {number} cpuThreshold - CPU usage percentage threshold for warnings (default: 80)
   * @param {number} memoryThreshold - Memory usage in MB threshold for warnings (default: 500)
   * @param {number} intervalMs - Monitoring interval in milliseconds (default: 30000)
   */
  constructor(cpuThreshold = 80, memoryThreshold = 500, intervalMs = 30000) {
    this.cpuThreshold = cpuThreshold;
    this.memoryThreshold = memoryThreshold;
    this.intervalMs = intervalMs;
    
    // Map to store monitoring data: streamId -> { pid, interval, lastUsage }
    this.monitoredStreams = new Map();
    
    console.info(`[ResourceMonitor] Initialized with thresholds: CPU ${cpuThreshold}%, Memory ${memoryThreshold}MB, Interval ${intervalMs}ms`);
  }

  /**
   * Start monitoring a stream's resource usage
   * @param {string} streamId - The stream identifier
   * @param {number} processId - The FFmpeg process ID to monitor
   */
  startMonitoring(streamId, processId) {
    if (!streamId || !processId) {
      console.error('[ResourceMonitor] Cannot start monitoring - invalid streamId or processId');
      return;
    }

    // Stop existing monitoring if any
    if (this.monitoredStreams.has(streamId)) {
      this.stopMonitoring(streamId);
    }

    console.info(`[ResourceMonitor] Starting monitoring for stream ${streamId} (PID: ${processId})`);

    // Create monitoring interval
    const interval = setInterval(async () => {
      try {
        const stats = await pidusage(processId);
        
        const usage = {
          cpu: stats.cpu,
          memory: stats.memory / (1024 * 1024), // Convert bytes to MB
          timestamp: new Date()
        };

        // Store last usage
        const monitorData = this.monitoredStreams.get(streamId);
        if (monitorData) {
          monitorData.lastUsage = usage;
        }

        // Check thresholds and log warnings
        if (usage.cpu > this.cpuThreshold) {
          console.warn(`[ResourceMonitor] Stream ${streamId} high CPU usage: ${usage.cpu.toFixed(2)}% (threshold: ${this.cpuThreshold}%)`);
        }

        if (usage.memory > this.memoryThreshold) {
          console.warn(`[ResourceMonitor] Stream ${streamId} high memory usage: ${usage.memory.toFixed(2)}MB (threshold: ${this.memoryThreshold}MB)`);
        }

      } catch (error) {
        // Process might have ended or be inaccessible
        if (error.code === 'ENOENT' || error.message.includes('No such process')) {
          console.info(`[ResourceMonitor] Process ${processId} for stream ${streamId} no longer exists, stopping monitoring`);
          this.stopMonitoring(streamId);
        } else {
          console.error(`[ResourceMonitor] Error monitoring stream ${streamId}:`, error.message);
        }
      }
    }, this.intervalMs);

    // Store monitoring data
    this.monitoredStreams.set(streamId, {
      pid: processId,
      interval: interval,
      lastUsage: null
    });
  }

  /**
   * Stop monitoring a stream's resource usage
   * @param {string} streamId - The stream identifier
   */
  stopMonitoring(streamId) {
    const monitorData = this.monitoredStreams.get(streamId);
    
    if (!monitorData) {
      return;
    }

    console.info(`[ResourceMonitor] Stopping monitoring for stream ${streamId}`);

    // Clear the interval
    if (monitorData.interval) {
      clearInterval(monitorData.interval);
    }

    // Remove from map
    this.monitoredStreams.delete(streamId);
  }

  /**
   * Get current resource usage for a specific stream
   * @param {string} streamId - The stream identifier
   * @returns {Object|null} Usage data { cpu, memory, timestamp } or null if not monitored
   */
  getUsage(streamId) {
    const monitorData = this.monitoredStreams.get(streamId);
    
    if (!monitorData || !monitorData.lastUsage) {
      return null;
    }

    return {
      cpu: monitorData.lastUsage.cpu,
      memory: monitorData.lastUsage.memory,
      timestamp: monitorData.lastUsage.timestamp
    };
  }

  /**
   * Get resource usage for all monitored streams
   * @returns {Map<string, Object>} Map of streamId to usage data
   */
  getAllUsage() {
    const allUsage = new Map();

    for (const [streamId, monitorData] of this.monitoredStreams.entries()) {
      if (monitorData.lastUsage) {
        allUsage.set(streamId, {
          cpu: monitorData.lastUsage.cpu,
          memory: monitorData.lastUsage.memory,
          timestamp: monitorData.lastUsage.timestamp
        });
      }
    }

    return allUsage;
  }

  /**
   * Get the number of currently monitored streams
   * @returns {number} Number of monitored streams
   */
  getMonitoredCount() {
    return this.monitoredStreams.size;
  }

  /**
   * Stop monitoring all streams (useful for cleanup/shutdown)
   */
  stopAll() {
    console.info(`[ResourceMonitor] Stopping all monitoring (${this.monitoredStreams.size} streams)`);
    
    for (const streamId of this.monitoredStreams.keys()) {
      this.stopMonitoring(streamId);
    }
  }
}

module.exports = ResourceMonitor;
