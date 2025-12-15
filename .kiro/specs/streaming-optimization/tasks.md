# Implementation Plan - Streaming System Optimization

## Phase 1: Critical Bug Fixes and Memory Leaks

- [x] 1. Fix critical bugs in existing code


  - Fix bug in schedulerService.js clearAll() function
  - Remove double unref in streamingService.js
  - Fix manuallyStoppingStreams cleanup in error paths
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Implement memory cleanup in stopStream()


  - Add cleanup for streamLogs Map
  - Add cleanup for streamRetryCount Map
  - Add cleanup for temporary playlist files
  - Ensure cleanup happens in all exit paths
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 3. Implement startup cleanup for orphaned files


  - Create cleanupOrphanedTempFiles() function
  - Scan temp directory for playlist_*.txt files
  - Check if corresponding stream is active
  - Delete orphaned files
  - Call on server startup
  - _Requirements: 2.4, 8.1, 8.2, 8.3, 8.4, 8.5_

## Phase 2: Concurrent Stream Limiting

- [x] 4. Create StreamLimiter utility class


  - Create utils/StreamLimiter.js file
  - Implement constructor with maxPerUser and maxGlobal
  - Implement canStartStream() method
  - Implement registerStream() method
  - Implement unregisterStream() method
  - Implement getUserStreamCount() method
  - Implement getGlobalStreamCount() method
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5. Integrate StreamLimiter into streamingService


  - Import StreamLimiter in streamingService.js
  - Initialize StreamLimiter with config values
  - Check limits before starting stream
  - Register stream after successful start
  - Unregister stream after stop
  - Return appropriate error messages
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Add configuration for stream limits


  - Add MAX_CONCURRENT_STREAMS_PER_USER to .env.example
  - Add MAX_CONCURRENT_STREAMS_GLOBAL to .env.example
  - Load config in streamingService.js
  - Use defaults if not set (5 per user, 20 global)
  - _Requirements: 9.1, 9.2, 9.3_

## Phase 3: Force Kill Mechanism

- [x] 7. Implement force kill timeout in stopStream()



  - Add FORCE_KILL_TIMEOUT_MS constant (5000ms)
  - Start timeout after sending SIGTERM
  - Send SIGKILL if timeout expires
  - Clear timeout if process exits normally
  - Log force kill actions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

## Phase 4: Resource Monitoring

- [x] 8. Create ResourceMonitor utility class







  - Create utils/ResourceMonitor.js file
  - Install pidusage package
  - Implement constructor with thresholds
  - Implement startMonitoring() method
  - Implement stopMonitoring() method
  - Implement getUsage() method
  - Implement getAllUsage() method
  - Add warning logging for high usage
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Integrate ResourceMonitor into streamingService





  - Import ResourceMonitor in streamingService.js
  - Initialize ResourceMonitor with config values
  - Start monitoring after stream starts
  - Stop monitoring when stream stops
  - Add configuration for thresholds
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Add resource monitoring configuration





  - Add RESOURCE_WARNING_CPU_PERCENT to .env.example
  - Add RESOURCE_WARNING_MEMORY_MB to .env.example
  - Add RESOURCE_MONITOR_INTERVAL_MS to .env.example
  - Load config in streamingService.js
  - Use defaults if not set (80%, 500MB, 30000ms)
  - _Requirements: 9.4, 9.5_

## Phase 5: Hardware Encoder Detection

- [x] 11. Create HardwareDetector utility class








  - Create utils/HardwareDetector.js file
  - Implement detectEncoders() static method
  - Check for h264_nvenc (NVIDIA)
  - Check for h264_qsv (Intel Quick Sync)
  - Check for h264_videotoolbox (Apple)
  - Implement getEncoder() static method
  - Implement getPreset() static method
  - Cache detection results
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 12. Update buildFFmpegArgs to use hardware encoders





  - Import HardwareDetector in streamingService.js
  - Call detectEncoders() on startup
  - Use hardware encoder in advanced mode if available
  - Fall back to libx264 with ultrafast if not available
  - Log which encoder is being used
  - Handle encoder failures gracefully
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 13. Add hardware encoding configuration





  - Add PREFER_HARDWARE_ENCODING to .env.example
  - Add HARDWARE_ENCODER_FALLBACK to .env.example
  - Load config in streamingService.js
  - Allow disabling hardware encoding via config
  - _Requirements: 9.1_

## Phase 6: Graceful Shutdown



- [x] 14. Create GracefulShutdown utility class



  - Create utils/GracefulShutdown.js file
  - Implement constructor with services
  - Implement registerHandlers() method
  - Implement shutdown() method
  - Handle SIGTERM signal
  - Handle SIGINT signal
  - Stop all active streams with timeout
  - Clear all schedulers
  - Log shutdown progress
  - Exit with code 0
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 15. Integrate GracefulShutdown into app.js





  - Import GracefulShutdown in app.js
  - Initialize after services are ready
  - Register signal handlers
  - Test with Ctrl+C
  - Test with kill command
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

## Phase 7: Improved Logging

- [x] 16. Add detailed logging for resource operations





  - Log stream rejection with reason and counts
  - Log memory cleanup with details
  - Log graceful shutdown steps
  - Log resource warnings with stream ID and usage
  - Log hardware encoder detection results
  - Use consistent log format with timestamps
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Phase 8: Testing and Documentation

- [ ] 17. Write unit tests for new utilities
  - Test StreamLimiter with various scenarios
  - Test ResourceMonitor with mock data
  - Test HardwareDetector with mock FFmpeg output
  - Test GracefulShutdown with mock services
  - Achieve >80% code coverage
  - _Requirements: All_

- [ ] 18. Write integration tests
  - Test concurrent stream limiting end-to-end
  - Test memory cleanup after stream stop
  - Test graceful shutdown with active streams
  - Test force kill with stuck process
  - Test hardware encoder fallback
  - _Requirements: All_

- [ ] 19. Update documentation
  - Update README.md with new features
  - Update DEPLOYMENT.md with new env vars
  - Create OPTIMIZATION.md with performance tips
  - Document configuration options
  - Add troubleshooting guide
  - _Requirements: All_

- [ ] 20. Final testing and deployment
  - Test on staging environment
  - Monitor memory usage over 24 hours
  - Monitor CPU usage with various stream counts
  - Test with maximum concurrent streams
  - Deploy to production
  - Monitor production metrics
  - _Requirements: All_

## Checkpoint Tasks

- [ ] 21. Checkpoint 1 - After Phase 1
  - Ensure all tests pass
  - Verify no memory leaks in basic scenarios
  - Verify bugs are fixed
  - Ask user if questions arise

- [ ] 22. Checkpoint 2 - After Phase 3
  - Ensure stream limiting works correctly
  - Verify force kill mechanism works
  - Test with multiple concurrent streams
  - Ask user if questions arise

- [ ] 23. Checkpoint 3 - After Phase 5
  - Ensure resource monitoring works
  - Verify hardware encoder detection
  - Test advanced mode with hardware encoding
  - Ask user if questions arise

- [ ] 24. Checkpoint 4 - After Phase 7
  - Ensure graceful shutdown works
  - Verify all logging is correct
  - Test complete system end-to-end
  - Ask user if questions arise

## Notes

- Each task should be completed in order within its phase
- Phases can be worked on sequentially or in parallel (if resources allow)
- All code changes should include appropriate error handling
- All new functions should have JSDoc comments
- Configuration values should have sensible defaults
- Backward compatibility should be maintained where possible
