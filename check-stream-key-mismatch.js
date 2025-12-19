const { db } = require('./db/database');

console.log('Checking stream key mismatch...\n');

// Get the latest stream
db.get(`SELECT id, title, rtmp_url, stream_key, youtube_broadcast_id, created_at 
        FROM streams 
        WHERE use_youtube_api = 1 
        ORDER BY created_at DESC 
        LIMIT 1`, 
  (err, stream) => {
    if (err || !stream) {
      console.error('No YouTube API stream found');
      process.exit(1);
    }
    
    console.log('=== LATEST YOUTUBE API STREAM ===');
    console.log(`Title: ${stream.title}`);
    console.log(`Broadcast ID: ${stream.youtube_broadcast_id || 'NULL'}`);
    console.log(`RTMP URL: ${stream.rtmp_url}`);
    console.log(`Stream Key: ${stream.stream_key}`);
    console.log(`Created: ${stream.created_at}`);
    console.log('');
    
    if (!stream.youtube_broadcast_id) {
      console.log('❌ No broadcast ID - broadcast was not created!');
      process.exit(1);
    }
    
    console.log('✓ Broadcast was created');
    console.log('');
    console.log('PROBLEM DIAGNOSIS:');
    console.log('If "Go Live" button stuck, it means NO DATA is streaming to YouTube.');
    console.log('This happens when:');
    console.log('1. Stream key in database is DIFFERENT from the one in YouTube broadcast');
    console.log('2. FFmpeg is not running');
    console.log('3. FFmpeg is streaming to wrong RTMP URL');
    console.log('');
    console.log('SOLUTION:');
    console.log('Check YouTube Studio → Go Live → Stream Settings');
    console.log('Compare the Stream Key there with the one above.');
    console.log('If DIFFERENT = stream key was created NEW (not reused)');
    console.log('');
    
    db.close();
    process.exit(0);
  }
);
