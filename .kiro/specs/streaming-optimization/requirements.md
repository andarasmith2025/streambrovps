# Requirements Document - Streaming System Optimization

## Introduction

Sistem streaming StreamBro saat ini memiliki beberapa masalah kritis terkait resource management, memory leaks, dan stabilitas. Dokumen ini mendefinisikan requirements untuk mengoptimasi sistem streaming agar lebih stabil, efisien, dan scalable.

## Glossary

- **StreamingService**: Service yang mengelola FFmpeg processes untuk live streaming
- **SchedulerService**: Service yang mengelola scheduling dan auto-termination streams
- **Concurrent Stream**: Stream yang berjalan bersamaan dalam satu waktu
- **Streamcopy Mode**: Mode streaming tanpa encoding (copy codec langsung)
- **Advanced Mode**: Mode streaming dengan encoding ulang menggunakan libx264
- **Hardware Encoder**: Encoder yang menggunakan GPU (h264_nvenc, h264_qsv, h264_videotoolbox)
- **Graceful Shutdown**: Proses shutdown yang membersihkan semua resources sebelum exit
- **Memory Leak**: Kondisi dimana memory tidak dibersihkan setelah tidak digunakan
- **Orphaned Process**: Process yang masih berjalan setelah parent process mati
- **Force Kill**: Terminasi process dengan SIGKILL setelah SIGTERM timeout

## Requirements

### Requirement 1: Concurrent Stream Limiting

**User Story:** As a system administrator, I want to limit the number of concurrent streams per user and globally, so that the server doesn't get overloaded and remains stable for all users.

#### Acceptance Criteria

1. WHEN a user attempts to start a stream THEN the system SHALL check if the user has reached their concurrent stream limit
2. WHEN a user has reached their limit (5 streams) THEN the system SHALL reject the new stream request with a clear error message
3. WHEN the total number of active streams reaches the global limit (20 streams) THEN the system SHALL reject any new stream requests regardless of user
4. WHEN a stream stops THEN the system SHALL decrement the concurrent stream count for that user
5. WHEN counting concurrent streams THEN the system SHALL only count streams with status 'live'

### Requirement 2: Memory Leak Prevention

**User Story:** As a system administrator, I want all temporary data to be cleaned up when streams stop, so that memory usage doesn't grow indefinitely over time.

#### Acceptance Criteria

1. WHEN a stream stops THEN the system SHALL delete all log entries for that stream from memory
2. WHEN a stream stops THEN the system SHALL delete the retry count for that stream from memory
3. WHEN a stream stops THEN the system SHALL delete any temporary playlist files for that stream
4. WHEN the server starts THEN the system SHALL clean up any orphaned temporary files from previous sessions
5. WHEN a stream is removed from activeStreams Map THEN the system SHALL also remove it from streamLogs and streamRetryCount Maps

### Requirement 3: Graceful Shutdown

**User Story:** As a system administrator, I want the server to shut down gracefully when receiving termination signals, so that all active streams are properly stopped and no orphaned processes remain.

#### Acceptance Criteria

1. WHEN the server receives SIGTERM signal THEN the system SHALL stop all active streams before exiting
2. WHEN the server receives SIGINT signal THEN the system SHALL stop all active streams before exiting
3. WHEN stopping streams during shutdown THEN the system SHALL wait for each stream to stop (with timeout)
4. WHEN all streams are stopped THEN the system SHALL clear all schedulers and timers
5. WHEN graceful shutdown completes THEN the system SHALL log completion message and exit with code 0

### Requirement 4: Force Kill Mechanism

**User Story:** As a system administrator, I want stuck FFmpeg processes to be force-killed after a timeout, so that streams can always be stopped even if they're unresponsive.

#### Acceptance Criteria

1. WHEN stopStream is called THEN the system SHALL send SIGTERM to the FFmpeg process
2. WHEN SIGTERM is sent THEN the system SHALL start a 5-second timeout timer
3. WHEN the timeout expires and process is still running THEN the system SHALL send SIGKILL to force termination
4. WHEN SIGKILL is sent THEN the system SHALL log the force kill action
5. WHEN the process exits (normally or forced) THEN the system SHALL clear the timeout timer

### Requirement 5: Resource Usage Monitoring

**User Story:** As a system administrator, I want to monitor CPU and memory usage of each stream, so that I can identify problematic streams and take action before they crash the server.

#### Acceptance Criteria

1. WHEN a stream starts THEN the system SHALL begin monitoring its CPU and memory usage every 30 seconds
2. WHEN CPU usage exceeds 80% for a stream THEN the system SHALL log a warning with stream details
3. WHEN memory usage exceeds 500MB for a stream THEN the system SHALL log a warning with stream details
4. WHEN a stream stops THEN the system SHALL stop monitoring that stream's resources
5. WHEN resource monitoring data is collected THEN the system SHALL store it in a Map with streamId as key

### Requirement 6: Hardware Encoder Detection

**User Story:** As a user using advanced mode, I want the system to automatically use hardware encoders when available, so that encoding is faster and uses less CPU.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL detect available hardware encoders (NVIDIA, Intel QSV, Apple VideoToolbox)
2. WHEN starting a stream in advanced mode THEN the system SHALL use hardware encoder if available
3. WHEN no hardware encoder is available THEN the system SHALL fall back to libx264 with ultrafast preset
4. WHEN using hardware encoder THEN the system SHALL log which encoder is being used
5. WHEN hardware encoder fails THEN the system SHALL fall back to software encoder and log the failure

### Requirement 7: Bug Fixes

**User Story:** As a developer, I want all identified bugs to be fixed, so that the system works correctly and reliably.

#### Acceptance Criteria

1. WHEN clearAll function is called in schedulerService THEN the system SHALL use the correct variable name 'scheduledTerminations' instead of 'terminationTimers'
2. WHEN clearAll function is called THEN the system SHALL clear the schedule check intervals (scheduleIntervalId and durationIntervalId)
3. WHEN a stream process is unref'd THEN the system SHALL only call unref() once, not twice
4. WHEN stopStream is called and kill fails THEN the system SHALL still clean up the manuallyStoppingStreams Set
5. WHEN a stream exits THEN the system SHALL ensure manuallyStoppingStreams is cleaned up in all code paths

### Requirement 8: Startup Cleanup

**User Story:** As a system administrator, I want orphaned resources from previous sessions to be cleaned up on startup, so that the system starts in a clean state.

#### Acceptance Criteria

1. WHEN the server starts THEN the system SHALL scan the temp directory for orphaned playlist files
2. WHEN an orphaned playlist file is found THEN the system SHALL check if the corresponding stream is active
3. WHEN the stream is not active THEN the system SHALL delete the orphaned file
4. WHEN cleanup completes THEN the system SHALL log the number of files cleaned up
5. WHEN cleanup encounters an error THEN the system SHALL log the error but continue startup

### Requirement 9: Configuration Management

**User Story:** As a system administrator, I want to configure stream limits and resource thresholds, so that I can adjust them based on server capacity.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL load configuration from environment variables or use defaults
2. WHEN MAX_CONCURRENT_STREAMS_PER_USER is set THEN the system SHALL use that value for per-user limit
3. WHEN MAX_CONCURRENT_STREAMS_GLOBAL is set THEN the system SHALL use that value for global limit
4. WHEN RESOURCE_WARNING_CPU_PERCENT is set THEN the system SHALL use that value for CPU warning threshold
5. WHEN RESOURCE_WARNING_MEMORY_MB is set THEN the system SHALL use that value for memory warning threshold

### Requirement 10: Improved Logging

**User Story:** As a system administrator, I want detailed logging for resource management operations, so that I can troubleshoot issues and monitor system health.

#### Acceptance Criteria

1. WHEN a stream is rejected due to limits THEN the system SHALL log the reason and current counts
2. WHEN memory is cleaned up THEN the system SHALL log what was cleaned and how much memory was freed
3. WHEN graceful shutdown starts THEN the system SHALL log each step of the shutdown process
4. WHEN resource warnings are triggered THEN the system SHALL log the stream ID and current usage
5. WHEN hardware encoder is detected THEN the system SHALL log the encoder type and capabilities
