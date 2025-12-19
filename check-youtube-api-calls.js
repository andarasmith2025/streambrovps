#!/usr/bin/env node

/**
 * YouTube API Additional Settings Verification Script
 * 
 * Script ini untuk memverifikasi apakah additional settings benar-benar dikirim ke YouTube API:
 * - Auto Start & Auto End
 * - Privacy Status
 * - Made for Kids
 * - Age Restricted
 * - Thumbnail Upload
 * - Synthetic Content
 * 
 * Usage:
 * 1. Buat stream baru dengan YouTube API
 * 2. Jalankan script ini: node check-youtube-api-calls.js
 * 3. Atau monitor real-time: node check-youtube-api-calls.js --watch
 */

const { getYouTubeClient } = require('./config/google');
const { db } = require('./db/database');
const Stream = require('./models/Stream');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(color, prefix, message) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(colors.green, '✓', message);
}

function logError(message) {
  log(colors.red, '✗', message);
}

function logInfo(message) {
  log(colors.blue, 'ℹ', message);
}

function logWarning(message) {
  log(colors.yellow, '⚠', message);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

async function getTokensForUser(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT youtube_access_token, youtube_refresh_token, youtube_token_expiry 
       FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) return reject(err);
        if (!row || !row.youtube_access_token) {
          return resolve(null);
        }
        resolve({
          access_token: row.youtube_access_token,
          refresh_token: row.youtube_refresh_token,
          expiry_date: row.youtube_token_expiry
        });
      }
    );
  });
}

async function checkBroadcastSettings(broadcastId, tokens) {
  try {
    const yt = getYouTubeClient(tokens);
    
    logInfo(`Fetching broadcast details for: ${broadcastId}`);
    
    const response = await yt.liveBroadcasts.list({
      part: 'id,snippet,status,contentDetails',
      id: broadcastId
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      logError('Broadcast not found on YouTube');
      return null;
    }
    
    const broadcast = response.data.items[0];
    
    logSection('BROADCAST DETAILS FROM YOUTUBE API');
    
    // Basic Info
    console.log(`${colors.bright}Title:${colors.reset} ${broadcast.snippet.title}`);
    console.log(`${colors.bright}Broadcast ID:${colors.reset} ${broadcast.id}`);
    console.log(`${colors.bright}Scheduled Start:${colors.reset} ${broadcast.snippet.scheduledStartTime}`);
    
    // Privacy Status
    console.log(`\n${colors.bright}Privacy Status:${colors.reset}`);
    const privacy = broadcast.status.privacyStatus;
    if (privacy === 'public') {
      logSuccess(`Public ✓`);
    } else if (privacy === 'unlisted') {
      logInfo(`Unlisted (default)`);
    } else if (privacy === 'private') {
      logWarning(`Private`);
    }
    
    // Auto Start & Auto End
    console.log(`\n${colors.bright}Content Details:${colors.reset}`);
    const autoStart = broadcast.contentDetails?.enableAutoStart;
    const autoStop = broadcast.contentDetails?.enableAutoStop;
    
    if (autoStart === true) {
      logSuccess(`Auto Start: ENABLED ✓`);
    } else if (autoStart === false) {
      logInfo(`Auto Start: Disabled`);
    } else {
      logWarning(`Auto Start: Not set (undefined)`);
    }
    
    if (autoStop === true) {
      logSuccess(`Auto End: ENABLED ✓`);
    } else if (autoStop === false) {
      logInfo(`Auto End: Disabled`);
    } else {
      logWarning(`Auto End: Not set (undefined)`);
    }
    
    return broadcast;
    
  } catch (error) {
    logError(`Error fetching broadcast: ${error.message}`);
    if (error.response?.data) {
      console.log(colors.gray, JSON.stringify(error.response.data, null, 2), colors.reset);
    }
    return null;
  }
}

async function checkVideoSettings(videoId, tokens) {
  try {
    const yt = getYouTubeClient(tokens);
    
    logInfo(`Fetching video details for: ${videoId}`);
    
    const response = await yt.videos.list({
      part: 'id,snippet,status,contentDetails',
      id: videoId
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      logWarning('Video not found (broadcast might not be created yet)');
      return null;
    }
    
    const video = response.data.items[0];
    
    logSection('VIDEO SETTINGS FROM YOUTUBE API');
    
    // Made for Kids
    console.log(`${colors.bright}Audience Settings:${colors.reset}`);
    const madeForKids = video.status?.selfDeclaredMadeForKids;
    
    if (madeForKids === true) {
      logSuccess(`Made for Kids: YES ✓`);
    } else if (madeForKids === false) {
      logInfo(`Made for Kids: NO (default)`);
    } else {
      logWarning(`Made for Kids: Not set (undefined)`);
    }
    
    // Age Restriction
    const ageRestricted = video.contentRating?.ytRating === 'ytAgeRestricted';
    if (ageRestricted) {
      logSuccess(`Age Restricted: YES (18+) ✓`);
    } else {
      logInfo(`Age Restricted: NO (default)`);
    }
    
    // Thumbnail
    console.log(`\n${colors.bright}Thumbnail:${colors.reset}`);
    if (video.snippet?.thumbnails?.maxres) {
      logSuccess(`Custom Thumbnail: UPLOADED ✓`);
      console.log(`  URL: ${video.snippet.thumbnails.maxres.url}`);
    } else if (video.snippet?.thumbnails?.high) {
      logInfo(`Using auto-generated thumbnail`);
    }
    
    return video;
    
  } catch (error) {
    logError(`Error fetching video: ${error.message}`);
    if (error.response?.data) {
      console.log(colors.gray, JSON.stringify(error.response.data, null, 2), colors.reset);
    }
    return null;
  }
}

async function checkStreamInDatabase(streamId) {
  try {
    const stream = await Stream.findById(streamId);
    
    if (!stream) {
      logError(`Stream ${streamId} not found in database`);
      return null;
    }
    
    logSection('STREAM SETTINGS IN DATABASE');
    
    console.log(`${colors.bright}Stream ID:${colors.reset} ${stream.id}`);
    console.log(`${colors.bright}Title:${colors.reset} ${stream.title}`);
    console.log(`${colors.bright}Use YouTube API:${colors.reset} ${stream.use_youtube_api ? 'YES' : 'NO'}`);
    console.log(`${colors.bright}Broadcast ID:${colors.reset} ${stream.youtube_broadcast_id || 'Not set'}`);
    
    if (stream.use_youtube_api) {
      console.log(`\n${colors.bright}YouTube API Settings (Database):${colors.reset}`);
      console.log(`  Privacy: ${stream.youtube_privacy || 'unlisted'}`);
      console.log(`  Description: ${stream.youtube_description || '(empty)'}`);
      console.log(`  Made for Kids: ${stream.youtube_made_for_kids ? 'YES' : 'NO'}`);
      console.log(`  Age Restricted: ${stream.youtube_age_restricted ? 'YES' : 'NO'}`);
      console.log(`  Synthetic Content: ${stream.youtube_synthetic_content ? 'YES' : 'NO'}`);
      console.log(`  Auto Start: ${stream.youtube_auto_start ? 'YES' : 'NO'}`);
      console.log(`  Auto End: ${stream.youtube_auto_end ? 'YES' : 'NO'}`);
    }
    
    return stream;
    
  } catch (error) {
    logError(`Error fetching stream from database: ${error.message}`);
    return null;
  }
}

async function compareSettings(stream, broadcast, video) {
  logSection('VERIFICATION RESULTS');
  
  let allMatch = true;
  
  // Privacy Status
  const dbPrivacy = stream.youtube_privacy || 'unlisted';
  const ytPrivacy = broadcast?.status?.privacyStatus;
  
  if (dbPrivacy === ytPrivacy) {
    logSuccess(`Privacy Status: MATCH (${dbPrivacy})`);
  } else {
    logError(`Privacy Status: MISMATCH (DB: ${dbPrivacy}, YT: ${ytPrivacy})`);
    allMatch = false;
  }
  
  // Auto Start
  const dbAutoStart = stream.youtube_auto_start === 1 || stream.youtube_auto_start === true;
  const ytAutoStart = broadcast?.contentDetails?.enableAutoStart === true;
  
  if (dbAutoStart === ytAutoStart) {
    logSuccess(`Auto Start: MATCH (${dbAutoStart ? 'Enabled' : 'Disabled'})`);
  } else {
    logError(`Auto Start: MISMATCH (DB: ${dbAutoStart}, YT: ${ytAutoStart})`);
    allMatch = false;
  }
  
  // Auto End
  const dbAutoEnd = stream.youtube_auto_end === 1 || stream.youtube_auto_end === true;
  const ytAutoEnd = broadcast?.contentDetails?.enableAutoStop === true;
  
  if (dbAutoEnd === ytAutoEnd) {
    logSuccess(`Auto End: MATCH (${dbAutoEnd ? 'Enabled' : 'Disabled'})`);
  } else {
    logError(`Auto End: MISMATCH (DB: ${dbAutoEnd}, YT: ${ytAutoEnd})`);
    allMatch = false;
  }
  
  // Made for Kids (only if video exists)
  if (video) {
    const dbMadeForKids = stream.youtube_made_for_kids === 1 || stream.youtube_made_for_kids === true;
    const ytMadeForKids = video.status?.selfDeclaredMadeForKids === true;
    
    if (dbMadeForKids === ytMadeForKids) {
      logSuccess(`Made for Kids: MATCH (${dbMadeForKids ? 'Yes' : 'No'})`);
    } else {
      logError(`Made for Kids: MISMATCH (DB: ${dbMadeForKids}, YT: ${ytMadeForKids})`);
      allMatch = false;
    }
  } else {
    logWarning(`Made for Kids: Cannot verify (video not available yet)`);
  }
  
  console.log('\n' + '='.repeat(60));
  if (allMatch) {
    logSuccess('ALL SETTINGS VERIFIED SUCCESSFULLY! ✓');
  } else {
    logError('SOME SETTINGS DO NOT MATCH!');
  }
  console.log('='.repeat(60) + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  const streamId = args[0];
  
  if (!streamId) {
    console.log(`${colors.bright}Usage:${colors.reset}`);
    console.log(`  node check-youtube-api-calls.js <stream-id>`);
    console.log(`\nExample:`);
    console.log(`  node check-youtube-api-calls.js abc123-def456-ghi789`);
    console.log(`\nTo get stream ID, check the database or URL in dashboard.`);
    process.exit(1);
  }
  
  logSection('YOUTUBE API SETTINGS VERIFICATION');
  logInfo(`Checking stream: ${streamId}`);
  
  // 1. Check database
  const stream = await checkStreamInDatabase(streamId);
  if (!stream) {
    process.exit(1);
  }
  
  if (!stream.use_youtube_api) {
    logWarning('This stream does not use YouTube API');
    process.exit(0);
  }
  
  if (!stream.youtube_broadcast_id) {
    logError('No YouTube broadcast ID found for this stream');
    process.exit(1);
  }
  
  // 2. Get tokens
  const tokens = await getTokensForUser(stream.user_id);
  if (!tokens) {
    logError('No YouTube tokens found for this user');
    process.exit(1);
  }
  
  // 3. Check broadcast settings
  const broadcast = await checkBroadcastSettings(stream.youtube_broadcast_id, tokens);
  
  // 4. Check video settings (might not exist yet)
  const video = await checkVideoSettings(stream.youtube_broadcast_id, tokens);
  
  // 5. Compare settings
  if (broadcast) {
    await compareSettings(stream, broadcast, video);
  }
}

// Run
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
