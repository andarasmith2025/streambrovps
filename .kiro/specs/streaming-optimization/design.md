# Design Document - Streaming System Optimization

## Overview

This design document outlines the technical approach for optimizing the StreamBro streaming system. The optimization focuses on resource management, memory leak prevention, graceful shutdown, and performance improvements through hardware acceleration.

## Architecture

### Current Architecture
```
┌─────────────┐
│   app.js    │
│  (Express)  │
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       │              │              │
┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
│ Streaming   │ │Scheduler │ │   Stream    │
│  Service    │ │ Service  │ │   Model     │
└──────┬──────┘ └────┬─────┘ └─────────────┘
       │              │
       │              │
┌──────▼──────────────▼──────┐
│   FFmpeg Processes         │
│  (Child Processes)         │
└────────────────────────────┘
```

### New Components

1. **ResourceMonitor**: Monitors CPU and memory usage per stream
2. **HardwareDetector**: Detects available hardware encoders
3. **StreamLimiter**: Enforces concurrent stream limits
4. **CleanupManager**: Manages cleanup of temporary resources

## Components and Interfaces

### 1. StreamLimiter

**Purpose:** Enforce concurrent stream limits per user and globally.

**Interface:**
```javascript
class StreamLimiter {
  constructor(maxPerUser, maxGlobal);
  
  // Check if user can start a new stream
  canStartStream(userId): Promise<{ allowed: boolean, reason?: string }>;
  
  // Register a new active stream
  registerStream(streamId, userId): void;
  
  // Unregister a stopped stream
  unregisterStream(streamId): void;
  
  // Get current counts
  getUserStreamCount(userId): number;
  getGlobalStreamCount(): number;
}
```

**Implementation Details:**
- Uses Map to track userId -> Set<streamId>
- Checks limits before allowing new streams
- Automatically updates counts on register/unregister

### 2. ResourceMonitor

**Purpose:** Monitor CPU and memory usage of FFmpeg processes.

**Interface:**
```javascript
class ResourceMonitor {
  constructor(cpuThreshold, memoryThreshold);
  
  // Start monitoring a stream
  startMonitoring(streamId, processId): void;
  
  // Stop monitoring a stream
  stopMonitoring(streamId): void;
  
  // Get current usage for a stream
  getUsage(streamId): { cpu: number, memory: number };
  
  // Get all monitored streams
  getAllUsage(): Map<streamId, { cpu: number, memory: number }>;
}
```

**Implementation Details:**
- Uses `pidusage` library to get process stats
- Monitors every 30 seconds
- Logs warnings when thresholds exceeded
- Stores data in Map<streamId, { cpu, memory, lastCheck }>

### 3. HardwareDetector

**Purpose:** Detect available hardware encoders.

**Interface:**
```javascript
class HardwareDetector {
  // Detect available encoders on startup
  static async detectEncoders(): Promise<{
    nvidia: boolean,
    intelQSV: boolean,
    appleVT: boolean,
    preferred: string
  }>;
  
  // Get encoder to use
  static getEncoder(): string;
  
  // Get preset for encoder
  static getPreset(encoder: string): string;
}
```

**Implementation Details:**
- Runs FFmpeg with `-encoders` flag to detect available encoders
- Caches result on first call
- Priority: h264_nvenc > h264_qsv > h264_videotoolbox > libx264

### 4. CleanupManager

**Purpose:** Manage cleanup of temporary resources.

**Interface:**
```javascript
class CleanupManager {
  // Cleanup logs for a stream
  static cleanupLogs(streamId): void;
  
  // Cleanup retry count for a stream
  static cleanupRetryCount(streamId): void;
  
  // Cleanup temporary files for a stream
  static cleanupTempFiles(streamId): Promise<void>;
  
  // Cleanup orphaned files on startup
  static cleanupOrphanedFiles(activeStreamIds: string[]): Promise<number>;
  
  // Full cleanup for a stream
  static fullCleanup(streamId): Promise<void>;
}
```

**Implementation Details:**
- Accesses streamLogs, streamRetryCount Maps
- Deletes temp files from filesystem
- Scans temp directory for orphaned files

### 5. GracefulShutdown

**Purpose:** Handle graceful shutdown of the server.

**Interface:**
```javascript
class GracefulShutdown {
  constructor(streamingService, schedulerService);
  
  // Register shutdown handlers
  registerHandlers(): void;
  
  // Execute shutdown
  async shutdown(signal: string): Promise<void>;
}
```

**Implementation Details:**
- Listens for SIGTERM and SIGINT
- Stops all active streams with timeout
- Clears all schedulers
- Exits with code 0

## Data Models

### StreamLimit Configuration
```javascript
{
  maxPerUser: 5,           // Max concurrent streams per user
  maxGlobal: 20,           // Max concurrent streams globally
  cpuWarningPercent: 80,   // CPU warning threshold
  memoryWarningMB: 500     // Memory warning threshold (MB)
}
```

### Resource Usage Data
```javascript
{
  streamId: string,
  processId: number,
  cpu: number,           // CPU usage percentage
  memory: number,        // Memory usage in bytes
  lastCheck: Date,       // Last check timestamp
  warnings: number       // Number of warnings triggered
}
```

### Hardware Encoder Info
```javascript
{
  nvidia: boolean,       // NVIDIA NVENC available
  intelQSV: boolean,     // Intel Quick Sync available
  appleVT: boolean,      // Apple VideoToolbox available
  preferred: string,     // Preferred encoder name
  fallback: string       // Fallback encoder name
}
```

## Error Handling

### Stream Limit Errors
- **Error Code:** `STREAM_LIMIT_EXCEEDED`
- **HTTP Status:** 429 (Too Many Requests)
- **Message:** "Maximum X concurrent streams reached"
- **Action:** Return error to user, don't start stream

### Resource Warning Errors
- **Error Code:** `RESOURCE_WARNING`
- **HTTP Status:** N/A (Warning only)
- **Message:** "Stream X using high resources: CPU Y%, Memory Z MB"
- **Action:** Log warning, continue streaming

### Force Kill Errors
- **Error Code:** `FORCE_KILL_REQUIRED`
- **HTTP Status:** N/A (Internal)
- **Message:** "Stream X did not respond to SIGTERM, force killing"
- **Action:** Send SIGKILL, log action

### Cleanup Errors
- **Error Code:** `CLEANUP_FAILED`
- **HTTP Status:** N/A (Internal)
- **Message:** "Failed to cleanup resources for stream X: error"
- **Action:** Log error, continue (non-fatal)

## Testing Strategy

### Unit Tests
1. Test StreamLimiter with various user/global limits
2. Test ResourceMonitor with mock process data
3. Test HardwareDetector with mock FFmpeg output
4. Test CleanupManager with mock filesystem
5. Test GracefulShutdown with mock services

### Integration Tests
1. Test concurrent stream limiting end-to-end
2. Test memory cleanup after stream stop
3. Test graceful shutdown with active streams
4. Test force kill mechanism with stuck process
5. Test hardware encoder fallback

### Performance Tests
1. Test system with maximum concurrent streams
2. Test memory usage over 24 hours
3. Test CPU usage with hardware vs software encoding
4. Test cleanup performance with many streams

## Implementation Plan

### Phase 1: Critical Fixes (Week 1)
1. Fix bug in schedulerService.js clearAll()
2. Remove double unref in streamingService.js
3. Add memory cleanup in stopStream()
4. Implement StreamLimiter

### Phase 2: Resource Management (Week 2)
5. Implement ResourceMonitor
6. Implement CleanupManager
7. Add startup cleanup
8. Implement force kill mechanism

### Phase 3: Optimization (Week 3)
9. Implement HardwareDetector
10. Update advanced mode to use hardware encoders
11. Implement GracefulShutdown
12. Add configuration management

### Phase 4: Testing & Documentation (Week 4)
13. Write unit tests
14. Write integration tests
15. Update documentation
16. Deploy to staging

## Configuration

### Environment Variables
```bash
# Stream Limits
MAX_CONCURRENT_STREAMS_PER_USER=5
MAX_CONCURRENT_STREAMS_GLOBAL=20

# Resource Thresholds
RESOURCE_WARNING_CPU_PERCENT=80
RESOURCE_WARNING_MEMORY_MB=500

# Monitoring
RESOURCE_MONITOR_INTERVAL_MS=30000

# Force Kill
FORCE_KILL_TIMEOUT_MS=5000

# Hardware Encoding
PREFER_HARDWARE_ENCODING=true
HARDWARE_ENCODER_FALLBACK=true
```

## Monitoring and Logging

### Log Levels
- **INFO:** Normal operations (stream start/stop, cleanup)
- **WARN:** Resource warnings, limit reached
- **ERROR:** Failures (force kill, cleanup errors)

### Metrics to Track
1. Active streams count (per user, global)
2. Resource usage per stream (CPU, memory)
3. Stream start/stop rate
4. Force kill count
5. Cleanup success/failure rate
6. Hardware encoder usage rate

## Security Considerations

1. **Resource Exhaustion:** Limits prevent single user from exhausting resources
2. **Process Isolation:** Each stream runs in separate process
3. **Graceful Shutdown:** Prevents orphaned processes
4. **Input Validation:** Validate all stream parameters before starting

## Performance Considerations

1. **Streamcopy Mode:** Use by default to minimize CPU usage
2. **Hardware Encoding:** Use when available for advanced mode
3. **Memory Management:** Clean up immediately after stream stops
4. **Process Monitoring:** Monitor every 30s to avoid overhead
5. **Concurrent Limits:** Prevent server overload

## Rollback Plan

If issues occur after deployment:

1. **Immediate:** Revert to previous version
2. **Disable Features:** Use feature flags to disable new components
3. **Increase Limits:** Temporarily increase limits if too restrictive
4. **Disable Monitoring:** Disable resource monitoring if causing issues

## Success Metrics

1. **Memory Usage:** Stable over 24 hours (no growth)
2. **CPU Usage:** <10% per stream in streamcopy mode
3. **Uptime:** 99.9% uptime with graceful shutdown
4. **Stream Success Rate:** >99% streams start successfully
5. **Force Kill Rate:** <1% streams require force kill
