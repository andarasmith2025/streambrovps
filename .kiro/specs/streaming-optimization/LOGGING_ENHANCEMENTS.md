# Logging Enhancements - Task 16

## Overview

This document describes the detailed logging enhancements implemented for resource operations in the streaming system. All logging follows a consistent format with timestamps automatically added by the logger service.

## Requirements Addressed

### Requirement 10.1: Stream Rejection Logging

**Location:** `utils/StreamLimiter.js` - `canStartStream()` method

**Enhancement:** When a stream is rejected due to limits, the system now logs:
- The rejection reason
- Current user stream count vs. limit
- Current global stream count vs. limit

**Example Output:**
```
[StreamLimiter] Stream rejected for user user123: Maximum 5 concurrent streams per user reached. Please stop a stream before starting a new one.
[StreamLimiter] Current counts - Global: 15/20, User: 5/5
```

**Also logs successful stream allowance:**
```
[StreamLimiter] Stream allowed for user user123. Current counts - Global: 15/20, User: 4/5
```

### Requirement 10.2: Memory Cleanup Logging

**Location:** `services/streamingService.js` - `stopStream()` function and FFmpeg exit handlers

**Enhancement:** When memory is cleaned up, the system now logs:
- Number of log entries removed from streamLogs
- Whether retry count was removed
- Whether force kill timeout was cleared
- Confirmation of unregistration from stream limiter
- Confirmation of stopped resource monitoring

**Example Output:**
```
[StreamingService] Memory cleanup completed for stream abc123:
  - Removed 47 log entries from streamLogs
  - Removed retry count: yes
  - Cleared force kill timeout: no
  - Unregistered from stream limiter
  - Stopped resource monitoring
```

**Cleanup logging occurs in three scenarios:**
1. Manual stream stop via `stopStream()`
2. FFmpeg process exit (manual stop)
3. FFmpeg process exit (error/completion)

### Requirement 10.3: Graceful Shutdown Logging

**Location:** `utils/GracefulShutdown.js` - `shutdown()` method

**Enhancement:** Each step of the graceful shutdown process is logged with clear progress indicators.

**Example Output:**
```
[GracefulShutdown] SIGTERM received. Starting graceful shutdown...
[GracefulShutdown] Step 1/5: Closing HTTP server...
[GracefulShutdown] HTTP server closed
[GracefulShutdown] Step 2/5: Stopping all active streams...
[GracefulShutdown] Found 3 active stream(s) to stop
[GracefulShutdown] Stopped stream: stream1
[GracefulShutdown] Stopped stream: stream2
[GracefulShutdown] Stopped stream: stream3
[GracefulShutdown] All streams stopped
[GracefulShutdown] Step 3/5: Clearing schedulers...
[GracefulShutdown] Schedulers cleared
[GracefulShutdown] Step 4/5: Resetting stream statuses in database...
[GracefulShutdown] Resetting 3 stream(s) to offline
[GracefulShutdown] Stream statuses reset
[GracefulShutdown] Step 5/5: Closing database connection...
[GracefulShutdown] Database connection closed
[GracefulShutdown] Graceful shutdown completed successfully
```

### Requirement 10.4: Resource Warning Logging

**Location:** `utils/ResourceMonitor.js` - `startMonitoring()` method

**Enhancement:** Resource warnings include stream ID and current usage values with thresholds.

**Example Output:**
```
[ResourceMonitor] Stream abc123 high CPU usage: 85.42% (threshold: 80%)
[ResourceMonitor] Stream abc123 high memory usage: 523.15MB (threshold: 500MB)
```

**Also logs monitoring lifecycle:**
```
[ResourceMonitor] Initialized with thresholds: CPU 80%, Memory 500MB, Interval 30000ms
[ResourceMonitor] Starting monitoring for stream abc123 (PID: 12345)
[ResourceMonitor] Stopping monitoring for stream abc123
```

### Requirement 10.5: Hardware Encoder Detection Logging

**Location:** `utils/HardwareDetector.js` - `detectEncoders()` method

**Enhancement:** Hardware encoder detection logs all available encoders and the preferred choice.

**Example Output:**
```
[HardwareDetector] Starting hardware encoder detection...
[HardwareDetector] Using FFmpeg at: /usr/bin/ffmpeg
[HardwareDetector] Detection complete:
  - NVIDIA NVENC: Available
  - Intel Quick Sync: Not available
  - Apple VideoToolbox: Not available
  - Preferred encoder: h264_nvenc
```

**Also logs encoder usage during streaming:**
```
[StreamingService] Using hardware encoder: h264_nvenc with preset: fast
```

**Or fallback:**
```
[StreamingService] Using software encoder: libx264 with preset: ultrafast
```

### Requirement 10.6: Startup Cleanup Logging

**Location:** `services/streamingService.js` - `cleanupOrphanedTempFiles()` function

**Enhancement:** Orphaned file cleanup now logs detailed statistics.

**Example Output:**
```
[Cleanup] 2024-12-13T10:30:45.123Z - Starting cleanup of orphaned temporary files...
[Cleanup] Found 5 playlist file(s) in temp directory
[Cleanup] Currently 2 active stream(s)
[Cleanup] Removed orphaned temp file: playlist_abc123.txt (45.67 KB, stream ID: abc123)
[Cleanup] Removed orphaned temp file: playlist_def456.txt (32.15 KB, stream ID: def456)
[Cleanup] Skipped active stream file: playlist_ghi789.txt (stream ID: ghi789)
[Cleanup] 2024-12-13T10:30:45.456Z - Cleanup complete:
  - Total playlist files found: 5
  - Orphaned files removed: 2
  - Active stream files skipped: 1
  - Errors encountered: 0
```

## Consistent Log Format

All logs follow a consistent format with:
- **Timestamps:** Automatically added by the logger service (ISO 8601 format)
- **Component tags:** `[ComponentName]` prefix for easy filtering
- **Log levels:** INFO, WARN, ERROR appropriately used
- **Structured data:** Key metrics and counts clearly labeled

## Log File Location

All logs are written to:
- **Console:** Real-time output for monitoring
- **File:** `logs/app.log` for persistent storage

## Testing

A test script `test-logging.js` has been created to demonstrate all logging enhancements. Run it with:

```bash
node test-logging.js
```

## Benefits

1. **Troubleshooting:** Detailed logs make it easier to diagnose issues
2. **Monitoring:** Clear metrics help track system health
3. **Auditing:** Complete record of resource operations
4. **Performance:** Identify bottlenecks and resource-intensive streams
5. **Debugging:** Step-by-step shutdown process visibility

## Related Files

- `services/logger.js` - Base logging infrastructure
- `services/streamingService.js` - Stream lifecycle logging
- `utils/StreamLimiter.js` - Concurrent stream limit logging
- `utils/ResourceMonitor.js` - Resource usage warning logging
- `utils/HardwareDetector.js` - Hardware encoder detection logging
- `utils/GracefulShutdown.js` - Shutdown process logging

## Compliance

All logging enhancements comply with:
- Requirement 10.1: Stream rejection with reason and counts ✅
- Requirement 10.2: Memory cleanup with details ✅
- Requirement 10.3: Graceful shutdown steps ✅
- Requirement 10.4: Resource warnings with stream ID and usage ✅
- Requirement 10.5: Hardware encoder detection results ✅
- Consistent log format with timestamps ✅
