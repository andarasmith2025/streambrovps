const si = require('systeminformation');
const { db } = require('../db/database');

let previousNetworkData = null;
let previousTimestamp = null;

async function getSystemStats() {
  try {
    const isWin = process.platform === 'win32';
    const [cpuData, memData, networkData, diskData, activeStreamsCount] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      isWin ? Promise.resolve([]) : si.networkStats(),
      getDiskUsage(),
      getActiveStreamsCount()
    ]);
    
    const cpuUsage = cpuData.currentLoad || cpuData.avg || 0;
    
    // Network speed calculation (only works on Linux/Mac)
    const networkSpeed = Array.isArray(networkData) && networkData.length > 0 
      ? calculateNetworkSpeed(networkData) 
      : { 
          download: 0, 
          upload: 0, 
          downloadFormatted: isWin ? 'N/A' : '0 Mbps', 
          uploadFormatted: isWin ? 'N/A' : '0 Mbps',
          available: !isWin
        };
    
    const formatMemory = (bytes) => {
      if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + " GB";
      } else {
        return (bytes / 1048576).toFixed(2) + " MB";
      }
    };
    
    // Get storage breakdown
    const storageData = await getStorageBreakdown();
    
    return {
      cpu: {
        usage: Math.round(cpuUsage),
        cores: cpuData.cpus ? cpuData.cpus.length : 0
      },
      memory: {
        total: formatMemory(memData.total),
        used: formatMemory(memData.active),
        free: formatMemory(memData.available),
        usagePercent: Math.round((memData.active / memData.total) * 100)
      },
      network: networkSpeed,
      disk: diskData,
      storage: storageData,
      activeStreams: activeStreamsCount || 0,
      platform: process.platform,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      cpu: { usage: 0, cores: 0 },
      memory: { total: "0 GB", used: "0 GB", free: "0 GB", usagePercent: 0 },
      network: { download: 0, upload: 0, downloadFormatted: 'N/A', uploadFormatted: 'N/A', available: false },
      disk: { total: "0 GB", used: "0 GB", free: "0 GB", usagePercent: 0, drive: "N/A" },
      activeStreams: 0,
      platform: process.platform,
      timestamp: Date.now()
    };
  }
}

async function getActiveStreamsCount() {
  try {
    const result = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM streams WHERE status = 'live'", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    return result.count || 0;
  } catch (error) {
    console.error('Error getting active streams count:', error);
    return 0;
  }
}

function calculateNetworkSpeed(networkData) {
  const currentTimestamp = Date.now();
  
  if (!previousNetworkData || !previousTimestamp) {
    previousNetworkData = networkData;
    previousTimestamp = currentTimestamp;
    return {
      download: 0,
      upload: 0,
      downloadFormatted: '0 Mbps',
      uploadFormatted: '0 Mbps',
      available: true
    };
  }
  
  const timeDiff = (currentTimestamp - previousTimestamp) / 1000;
  
  const currentTotal = networkData
    .filter(iface => !iface.iface.includes('lo') && !iface.iface.includes('Loopback'))
    .reduce((acc, iface) => ({
      rx_bytes: acc.rx_bytes + (iface.rx_bytes || 0),
      tx_bytes: acc.tx_bytes + (iface.tx_bytes || 0)
    }), { rx_bytes: 0, tx_bytes: 0 });
  
  const previousTotal = previousNetworkData
    .filter(iface => !iface.iface.includes('lo') && !iface.iface.includes('Loopback'))
    .reduce((acc, iface) => ({
      rx_bytes: acc.rx_bytes + (iface.rx_bytes || 0),
      tx_bytes: acc.tx_bytes + (iface.tx_bytes || 0)
    }), { rx_bytes: 0, tx_bytes: 0 });
  
  const downloadBps = Math.max(0, (currentTotal.rx_bytes - previousTotal.rx_bytes) / timeDiff);
  const uploadBps = Math.max(0, (currentTotal.tx_bytes - previousTotal.tx_bytes) / timeDiff);
  
  const downloadMbps = (downloadBps * 8) / (1024 * 1024);
  const uploadMbps = (uploadBps * 8) / (1024 * 1024);
  
  previousNetworkData = networkData;
  previousTimestamp = currentTimestamp;
  
  return {
    download: downloadMbps,
    upload: uploadMbps,
    downloadFormatted: formatSpeed(downloadMbps),
    uploadFormatted: formatSpeed(uploadMbps),
    available: true
  };
}

function formatSpeed(speedMbps) {
  if (speedMbps >= 1000) {
    return (speedMbps / 1000).toFixed(2) + ' Gbps';
  } else if (speedMbps >= 1) {
    return speedMbps.toFixed(2) + ' Mbps';
  } else {
    return (speedMbps * 1000).toFixed(0) + ' Kbps';
  }
}

async function getDiskUsage() {
  try {
    const fsSize = await si.fsSize();
    const platform = process.platform;
    
    let targetDisk;
    
    if (platform === 'win32') {
      const currentDrive = process.cwd().charAt(0).toUpperCase();
      targetDisk = fsSize.find(disk => disk.mount.charAt(0).toUpperCase() === currentDrive);
      
      if (!targetDisk) {
        targetDisk = fsSize.find(disk => disk.mount.charAt(0).toUpperCase() === 'C');
      }
    } else {
      targetDisk = fsSize.find(disk => disk.mount === '/');
    }
    
    if (!targetDisk) {
      targetDisk = fsSize[0];
    }
    
    if (!targetDisk) {
      return {
        total: "0 GB",
        used: "0 GB", 
        free: "0 GB",
        usagePercent: 0,
        drive: "N/A"
      };
    }
    
    const formatDisk = (bytes) => {
      if (bytes >= 1099511627776) {
        return (bytes / 1099511627776).toFixed(2) + " TB";
      } else if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + " GB";
      } else {
        return (bytes / 1048576).toFixed(2) + " MB";
      }
    };
    
    const usagePercent = targetDisk.size > 0 ? 
      Math.round(((targetDisk.size - targetDisk.available) / targetDisk.size) * 100) : 0;
    
    return {
      total: formatDisk(targetDisk.size),
      used: formatDisk(targetDisk.size - targetDisk.available),
      free: formatDisk(targetDisk.available),
      usagePercent: usagePercent,
      drive: targetDisk.mount || targetDisk.fs || "Unknown"
    };
  } catch (error) {
    console.error('Error getting disk usage:', error);
    return {
      total: "0 GB",
      used: "0 GB",
      free: "0 GB", 
      usagePercent: 0,
      drive: "N/A"
    };
  }
}

async function getStorageBreakdown() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Get disk info first
    const fsSize = await si.fsSize();
    const platform = process.platform;
    
    let targetDisk;
    if (platform === 'win32') {
      const currentDrive = process.cwd().charAt(0).toUpperCase();
      targetDisk = fsSize.find(disk => disk.mount.charAt(0).toUpperCase() === currentDrive);
      if (!targetDisk) {
        targetDisk = fsSize.find(disk => disk.mount.charAt(0).toUpperCase() === 'C');
      }
    } else {
      targetDisk = fsSize.find(disk => disk.mount === '/');
    }
    
    if (!targetDisk) {
      targetDisk = fsSize[0];
    }
    
    // Calculate videos folder size
    const videosPath = path.join(process.cwd(), 'public', 'uploads', 'videos');
    let videosSize = 0;
    let videosCount = 0;
    
    if (fs.existsSync(videosPath)) {
      const files = fs.readdirSync(videosPath);
      for (const file of files) {
        try {
          const filePath = path.join(videosPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            videosSize += stats.size;
            videosCount++;
          }
        } catch (err) {
          // Skip files that can't be accessed
          console.warn(`Could not stat file ${file}:`, err.message);
        }
      }
    }
    
    // Format size helper
    const formatSize = (bytes) => {
      if (bytes >= 1099511627776) {
        return (bytes / 1099511627776).toFixed(2) + " TB";
      } else if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + " GB";
      } else if (bytes >= 1048576) {
        return (bytes / 1048576).toFixed(2) + " MB";
      } else {
        return (bytes / 1024).toFixed(2) + " KB";
      }
    };
    
    // Calculate percentages
    const totalBytes = targetDisk ? targetDisk.size : 0;
    const usedBytes = targetDisk ? (targetDisk.size - targetDisk.available) : 0;
    const freeBytes = targetDisk ? targetDisk.available : 0;
    
    const usagePercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
    const freePercent = totalBytes > 0 ? Math.round((freeBytes / totalBytes) * 100) : 0;
    
    return {
      total: formatSize(totalBytes),
      used: formatSize(usedBytes),
      free: formatSize(freeBytes),
      usagePercent: usagePercent,
      freePercent: freePercent,
      videosSize: formatSize(videosSize),
      videosCount: videosCount
    };
  } catch (error) {
    console.error('Error getting storage breakdown:', error);
    return {
      total: "0 GB",
      used: "0 GB",
      free: "0 GB",
      usagePercent: 0,
      freePercent: 0,
      videosSize: "0 GB",
      videosCount: 0
    };
  }
}

module.exports = { getSystemStats };