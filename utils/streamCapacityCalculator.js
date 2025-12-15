/**
 * Stream Capacity Calculator
 * Menghitung berapa banyak stream yang bisa jalan berdasarkan resource tersedia
 */

/**
 * Calculate stream capacity based on available resources
 * @param {Object} systemStats - Current system stats
 * @param {Object} options - Calculation options
 * @returns {Object} Capacity calculation result
 */
function calculateStreamCapacity(systemStats, options = {}) {
  const {
    cpuThreshold = 80,        // Max CPU usage (%)
    memoryThreshold = 85,     // Max memory usage (%)
    networkThreshold = 80,    // Max network usage (Mbps)
    streamMode = 'streamcopy' // 'streamcopy' or 'reencode'
  } = options;

  // Parse memory values (remove units and convert to MB)
  const parseMemory = (memStr) => {
    if (!memStr) return 0;
    const match = memStr.match(/([\d.]+)\s*(MB|GB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return unit === 'GB' ? value * 1024 : value;
  };

  const totalMemoryMB = parseMemory(systemStats.memory.total);
  const usedMemoryMB = parseMemory(systemStats.memory.used);
  const availableMemoryMB = totalMemoryMB - usedMemoryMB;

  // Resource per stream estimates
  const resourcePerStream = {
    streamcopy: {
      cpu: 5,           // 5% CPU per stream
      memory: 200,      // 200 MB RAM per stream
      network: 3        // 3 Mbps upload per stream (avg)
    },
    reencode: {
      cpu: 25,          // 25% CPU per stream (with NVENC)
      memory: 300,      // 300 MB RAM per stream
      network: 3        // 3 Mbps upload per stream
    }
  };

  const perStream = resourcePerStream[streamMode] || resourcePerStream.streamcopy;

  // Calculate capacity based on each resource
  const cpuCapacity = Math.floor((cpuThreshold - systemStats.cpu.usage) / perStream.cpu);
  const memoryCapacity = Math.floor((totalMemoryMB * (memoryThreshold / 100) - usedMemoryMB) / perStream.memory);
  
  // Network capacity (if network stats available)
  let networkCapacity = Infinity;
  if (systemStats.network && systemStats.network.available) {
    // Assume 100 Mbps upload bandwidth (adjust based on your VPS)
    const maxUploadMbps = 100;
    const currentUploadMbps = parseFloat(systemStats.network.uploadFormatted) || 0;
    networkCapacity = Math.floor((maxUploadMbps * (networkThreshold / 100) - currentUploadMbps) / perStream.network);
  }

  // Limiting factor is the minimum capacity
  const maxStreams = Math.max(0, Math.min(cpuCapacity, memoryCapacity, networkCapacity));
  const currentStreams = systemStats.activeStreams || 0;
  const availableSlots = Math.max(0, maxStreams - currentStreams);

  // Determine bottleneck
  let bottleneck = 'none';
  if (maxStreams === cpuCapacity) bottleneck = 'cpu';
  else if (maxStreams === memoryCapacity) bottleneck = 'memory';
  else if (maxStreams === networkCapacity) bottleneck = 'network';

  // Calculate resource usage per stream
  const avgCpuPerStream = currentStreams > 0 ? systemStats.cpu.usage / currentStreams : perStream.cpu;
  const avgMemoryPerStream = currentStreams > 0 ? usedMemoryMB / (currentStreams + 1) : perStream.memory;

  return {
    current: {
      streams: currentStreams,
      cpu: systemStats.cpu.usage,
      memory: usedMemoryMB,
      memoryPercent: Math.round((usedMemoryMB / totalMemoryMB) * 100)
    },
    capacity: {
      maxStreams,
      availableSlots,
      cpuCapacity,
      memoryCapacity,
      networkCapacity: networkCapacity === Infinity ? 'unlimited' : networkCapacity
    },
    bottleneck,
    perStream: {
      cpu: Math.round(avgCpuPerStream * 10) / 10,
      memory: Math.round(avgMemoryPerStream),
      network: perStream.network
    },
    recommendations: generateRecommendations(maxStreams, availableSlots, bottleneck, systemStats),
    mode: streamMode
  };
}

function generateRecommendations(maxStreams, availableSlots, bottleneck, systemStats) {
  const recommendations = [];

  if (availableSlots === 0) {
    recommendations.push({
      type: 'warning',
      message: 'Server at maximum capacity',
      action: 'Stop some streams or upgrade server resources'
    });
  } else if (availableSlots <= 2) {
    recommendations.push({
      type: 'warning',
      message: `Only ${availableSlots} stream slot(s) available`,
      action: 'Consider upgrading server soon'
    });
  } else if (availableSlots <= 5) {
    recommendations.push({
      type: 'info',
      message: `${availableSlots} stream slots available`,
      action: 'Monitor resource usage'
    });
  } else {
    recommendations.push({
      type: 'success',
      message: `${availableSlots} stream slots available`,
      action: 'Server has good capacity'
    });
  }

  // Bottleneck-specific recommendations
  if (bottleneck === 'cpu') {
    recommendations.push({
      type: 'tip',
      message: 'CPU is the limiting factor',
      action: 'Use streamcopy mode or upgrade CPU'
    });
  } else if (bottleneck === 'memory') {
    recommendations.push({
      type: 'tip',
      message: 'Memory is the limiting factor',
      action: 'Upgrade RAM or optimize buffer settings'
    });
  } else if (bottleneck === 'network') {
    recommendations.push({
      type: 'tip',
      message: 'Network bandwidth is the limiting factor',
      action: 'Upgrade network or reduce bitrate'
    });
  }

  // High usage warnings
  if (systemStats.cpu.usage > 70) {
    recommendations.push({
      type: 'warning',
      message: 'High CPU usage detected',
      action: 'Avoid starting new streams with re-encode'
    });
  }

  const memoryPercent = systemStats.memory.usagePercent;
  if (memoryPercent > 80) {
    recommendations.push({
      type: 'warning',
      message: 'High memory usage detected',
      action: 'Consider stopping some streams'
    });
  }

  return recommendations;
}

/**
 * Get stream capacity for display
 * @param {Object} systemStats - Current system stats
 * @returns {Object} Formatted capacity info
 */
function getStreamCapacityInfo(systemStats) {
  const streamcopyCapacity = calculateStreamCapacity(systemStats, { streamMode: 'streamcopy' });
  const reencodeCapacity = calculateStreamCapacity(systemStats, { streamMode: 'reencode' });

  return {
    streamcopy: streamcopyCapacity,
    reencode: reencodeCapacity,
    recommended: streamcopyCapacity.availableSlots > reencodeCapacity.availableSlots ? 'streamcopy' : 'reencode'
  };
}

module.exports = {
  calculateStreamCapacity,
  getStreamCapacityInfo
};
