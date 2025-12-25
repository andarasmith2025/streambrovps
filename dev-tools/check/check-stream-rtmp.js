const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const streamId = '9e5a0a53-f545-42f1-bc11-861aae325707';

console.log('Checking stream RTMP configuration...\n');

db.get(
  `SELECT 
    id, 
    title, 
    rtmp_url, 
    stream_key, 
    youtube_stream_id, 
    youtube_broadcast_id, 
    use_youtube_api,
    status
  FROM streams 
  WHERE id = ?`,
  [streamId],
  (err, stream) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (!stream) {
      console.log('Stream not found!');
      db.close();
      return;
    }

    console.log('=== STREAM CONFIGURATION ===');
    console.log('ID:', stream.id);
    console.log('Title:', stream.title);
    console.log('Status:', stream.status);
    console.log('Use YouTube API:', stream.use_youtube_api);
    console.log('\n=== RTMP CONFIGURATION ===');
    console.log('RTMP URL:', stream.rtmp_url);
    console.log('Stream Key:', stream.stream_key);
    console.log('\n=== YOUTUBE API ===');
    console.log('YouTube Stream ID:', stream.youtube_stream_id);
    console.log('YouTube Broadcast ID:', stream.youtube_broadcast_id);

    // Check if using YouTube API
    if (stream.use_youtube_api === 1) {
      console.log('\n⚠️  PROBLEM DETECTED:');
      console.log('Stream is using YouTube API mode (use_youtube_api=1)');
      console.log('But RTMP URL is:', stream.rtmp_url);
      console.log('Stream Key is:', stream.stream_key);
      
      if (stream.youtube_stream_id) {
        console.log('\n✓ YouTube Stream ID exists:', stream.youtube_stream_id);
        console.log('FFmpeg should be sending to YouTube ingestion server with this stream ID');
        console.log('Expected RTMP: rtmp://a.rtmp.youtube.com/live2/' + stream.youtube_stream_id);
      } else {
        console.log('\n❌ YouTube Stream ID is NULL!');
        console.log('This is why stream is not appearing in YouTube Studio');
      }

      // Construct what FFmpeg is actually using
      const actualRtmpUrl = `${stream.rtmp_url}/${stream.stream_key}`;
      console.log('\n=== ACTUAL FFmpeg RTMP URL ===');
      console.log(actualRtmpUrl);
      
      if (!actualRtmpUrl.includes('youtube.com')) {
        console.log('\n❌ CRITICAL: FFmpeg is NOT sending to YouTube!');
        console.log('This is why broadcast exists but has no stream data');
      }
    }

    db.close();
  }
);
