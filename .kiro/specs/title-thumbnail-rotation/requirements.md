# Requirements Document: Title & Thumbnail Rotation for A/B Testing

## Introduction

This feature enables users to perform A/B testing on their YouTube live streams by rotating between multiple title and thumbnail variants. The system will automatically or manually switch between variants during a live stream, track performance metrics for each variant, and provide analytics to help users identify the most effective combinations for maximizing views and engagement.

## Glossary

- **Variant**: A unique combination of stream title and thumbnail image used for A/B testing
- **Rotation**: The process of switching from one variant to another during a live stream
- **Active Variant**: The currently displayed title and thumbnail on the YouTube broadcast
- **Rotation Interval**: The time duration between automatic variant switches
- **Performance Metrics**: Quantitative data measuring variant effectiveness (views, engagement, watch time)
- **YouTube Broadcast**: A live streaming session on YouTube platform
- **Stream Configuration**: The settings and parameters for a scheduled or active stream
- **A/B Testing**: A method of comparing two or more variants to determine which performs better

## Requirements

### Requirement 1: Variant Management

**User Story:** As a content creator, I want to create and manage multiple title and thumbnail variants for my stream, so that I can test different combinations to optimize viewer engagement.

#### Acceptance Criteria

1. WHEN a user creates a new stream with YouTube API, THE system SHALL provide an option to enable title and thumbnail rotation
2. WHEN rotation is enabled, THE system SHALL allow the user to add between 2 and 5 variants
3. WHEN adding a variant, THE system SHALL require a title with minimum 10 characters and maximum 100 characters
4. WHEN adding a variant, THE system SHALL allow the user to upload a thumbnail image with 16:9 aspect ratio and maximum 2MB file size
5. WHEN a user uploads a thumbnail, THE system SHALL validate the image dimensions and display a warning if not 16:9 ratio
6. WHEN a user saves variants, THE system SHALL store all variants in the database with unique identifiers
7. WHEN a user edits an existing stream, THE system SHALL allow modification of existing variants and addition of new variants up to the maximum limit
8. WHEN a user deletes a variant, THE system SHALL prevent deletion if only 2 variants remain and rotation is enabled

### Requirement 2: Automatic Rotation

**User Story:** As a content creator, I want the system to automatically rotate between my variants at specified intervals, so that I can test different titles and thumbnails without manual intervention.

#### Acceptance Criteria

1. WHEN a user enables automatic rotation, THE system SHALL provide interval options of 5 minutes, 15 minutes, 30 minutes, 1 hour, and 2 hours
2. WHEN a stream starts with automatic rotation enabled, THE system SHALL activate the first variant immediately
3. WHEN the rotation interval elapses, THE system SHALL automatically switch to the next variant in sequence
4. WHEN switching variants, THE system SHALL update the YouTube broadcast title via YouTube API liveBroadcasts.update method
5. WHEN switching variants, THE system SHALL update the YouTube broadcast thumbnail via YouTube API thumbnails.set method
6. WHEN a rotation occurs, THE system SHALL record the timestamp, previous variant, and new variant in the rotation history
7. WHEN the last variant is reached, THE system SHALL cycle back to the first variant
8. WHEN automatic rotation fails due to API errors, THE system SHALL log the error and retry after 1 minute up to 3 attempts

### Requirement 3: Manual Rotation Control

**User Story:** As a content creator, I want to manually switch between variants during a live stream, so that I can react to real-time performance data and audience behavior.

#### Acceptance Criteria

1. WHEN a stream is live with rotation enabled, THE system SHALL display a variant switcher control on the stream card
2. WHEN a user clicks the variant switcher, THE system SHALL show a dropdown list of all available variants with their titles
3. WHEN a user selects a different variant, THE system SHALL immediately update the YouTube broadcast title and thumbnail
4. WHEN a manual switch occurs, THE system SHALL record the switch in rotation history with a "manual" flag
5. WHEN automatic rotation is enabled and a manual switch occurs, THE system SHALL reset the rotation timer to start from the new variant
6. WHEN a manual switch fails, THE system SHALL display an error notification and maintain the current variant
7. WHEN a user disables automatic rotation during a live stream, THE system SHALL stop scheduled rotations but maintain the current active variant

### Requirement 4: Performance Tracking

**User Story:** As a content creator, I want to track performance metrics for each variant, so that I can identify which titles and thumbnails generate the most views and engagement.

#### Acceptance Criteria

1. WHEN a variant becomes active, THE system SHALL start tracking the timestamp and initial view count
2. WHEN a variant is rotated out, THE system SHALL record the final view count and calculate views gained during that period
3. WHEN tracking metrics, THE system SHALL store views gained, duration active, and average views per minute for each rotation session
4. WHEN a stream ends, THE system SHALL calculate total views, total active time, and average performance for each variant
5. WHEN multiple streams use the same variants, THE system SHALL aggregate performance data across all streams
6. WHEN displaying variant performance, THE system SHALL show total views gained, average views per minute, and total active time
7. WHEN comparing variants, THE system SHALL calculate and display the performance difference as a percentage
8. WHEN a variant consistently underperforms (50% below average), THE system SHALL flag it with a warning indicator

### Requirement 5: Analytics Dashboard

**User Story:** As a content creator, I want to view detailed analytics comparing variant performance, so that I can make data-driven decisions about my stream titles and thumbnails.

#### Acceptance Criteria

1. WHEN a user accesses the analytics dashboard, THE system SHALL display a list of all streams with rotation enabled
2. WHEN viewing stream analytics, THE system SHALL show a comparison chart of views gained per variant
3. WHEN displaying variant data, THE system SHALL include variant title, thumbnail preview, total views, active time, and views per minute
4. WHEN multiple rotation sessions exist, THE system SHALL show a timeline graph of variant switches and corresponding view changes
5. WHEN a clear winner emerges (variant with 30% or more views than others), THE system SHALL highlight it as "Best Performer"
6. WHEN viewing analytics, THE system SHALL provide an export button to download data as CSV format
7. WHEN exporting data, THE system SHALL include all variant details, rotation history, and performance metrics
8. WHEN no rotation data exists, THE system SHALL display a helpful message explaining how to enable rotation

### Requirement 6: YouTube API Integration

**User Story:** As a system administrator, I want the rotation system to reliably update YouTube broadcasts via API, so that variant changes are reflected immediately on the live stream.

#### Acceptance Criteria

1. WHEN updating a broadcast title, THE system SHALL use the YouTube API liveBroadcasts.update method with the broadcast ID
2. WHEN updating a thumbnail, THE system SHALL use the YouTube API thumbnails.set method with the video ID and image file
3. WHEN making API calls, THE system SHALL use the user's OAuth token with appropriate scopes (youtube, youtube.force-ssl)
4. WHEN an API call fails with 401 Unauthorized, THE system SHALL prompt the user to reconnect their YouTube account
5. WHEN an API call fails with 403 Forbidden, THE system SHALL log the error and notify the user of insufficient permissions
6. WHEN an API call fails with 429 Rate Limit, THE system SHALL implement exponential backoff and retry after calculated delay
7. WHEN an API call succeeds, THE system SHALL update the local database with the new active variant and timestamp
8. WHEN the YouTube API is unavailable, THE system SHALL queue rotation requests and process them when the API becomes available

### Requirement 7: User Interface Integration

**User Story:** As a content creator, I want the rotation feature to integrate seamlessly with the existing stream creation modal, so that I can easily configure variants without disrupting my workflow.

#### Acceptance Criteria

1. WHEN creating a stream with YouTube API, THE system SHALL display a "Title & Thumbnail Rotation" collapsible section in Additional Settings
2. WHEN the rotation section is collapsed, THE system SHALL show a summary indicating if rotation is enabled and the number of variants
3. WHEN the rotation section is expanded, THE system SHALL display the enable toggle, interval selector, and variant list
4. WHEN adding a variant, THE system SHALL show a form with title input, thumbnail upload, and preview area
5. WHEN a thumbnail is uploaded, THE system SHALL display a preview with dimensions and file size information
6. WHEN viewing the variant list, THE system SHALL show each variant with title, thumbnail preview, edit button, and delete button
7. WHEN the maximum variant limit is reached, THE system SHALL disable the "Add Variant" button and display a message
8. WHEN saving the stream, THE system SHALL validate all variants and display specific error messages for any validation failures

### Requirement 8: Database Schema and Data Persistence

**User Story:** As a system architect, I want variant and rotation data to be properly structured and persisted, so that the system can reliably track and analyze performance over time.

#### Acceptance Criteria

1. WHEN a variant is created, THE system SHALL store variant_id, stream_id, variant_number, title, thumbnail_path, and timestamps
2. WHEN a rotation occurs, THE system SHALL create a rotation record with rotation_id, stream_id, variant_id, started_at, ended_at, and views_gained
3. WHEN storing thumbnails, THE system SHALL save files in the uploads/thumbnails directory with unique filenames
4. WHEN a stream is deleted, THE system SHALL cascade delete all associated variants and rotation records
5. WHEN querying variant performance, THE system SHALL efficiently aggregate rotation data using database indexes
6. WHEN a variant is updated, THE system SHALL maintain historical rotation data for the old version
7. WHEN the database is backed up, THE system SHALL include all variant and rotation tables
8. WHEN migrating data, THE system SHALL provide scripts to safely update the schema without data loss

### Requirement 9: Error Handling and Resilience

**User Story:** As a content creator, I want the rotation system to handle errors gracefully, so that my live stream continues smoothly even if rotation encounters issues.

#### Acceptance Criteria

1. WHEN a rotation fails, THE system SHALL log detailed error information including timestamp, variant IDs, and error message
2. WHEN YouTube API is unreachable, THE system SHALL continue the stream with the current variant and retry rotation later
3. WHEN a thumbnail file is missing, THE system SHALL skip thumbnail update and only update the title
4. WHEN database connection fails during rotation, THE system SHALL cache the rotation event and persist it when connection is restored
5. WHEN multiple rotation requests occur simultaneously, THE system SHALL queue them and process sequentially
6. WHEN a user's OAuth token expires during rotation, THE system SHALL notify the user and pause automatic rotation
7. WHEN system resources are low, THE system SHALL prioritize stream stability over rotation execution
8. WHEN an error occurs, THE system SHALL display user-friendly error messages without exposing technical details

### Requirement 10: Performance and Scalability

**User Story:** As a system administrator, I want the rotation system to perform efficiently at scale, so that it can handle multiple concurrent streams without degrading performance.

#### Acceptance Criteria

1. WHEN processing rotations, THE system SHALL complete each rotation within 5 seconds under normal conditions
2. WHEN multiple streams are rotating simultaneously, THE system SHALL handle up to 50 concurrent rotations without performance degradation
3. WHEN storing rotation history, THE system SHALL implement data retention policies to archive records older than 90 days
4. WHEN querying analytics, THE system SHALL use database indexes to return results within 2 seconds for datasets up to 10,000 records
5. WHEN uploading thumbnails, THE system SHALL compress images to optimize storage while maintaining visual quality
6. WHEN the system is under heavy load, THE system SHALL prioritize active stream rotations over analytics queries
7. WHEN caching is enabled, THE system SHALL cache variant data for 5 minutes to reduce database queries
8. WHEN monitoring system health, THE system SHALL expose metrics for rotation success rate, API latency, and error frequency
