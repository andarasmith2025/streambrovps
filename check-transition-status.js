require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getTokensForUser } = require('./routes/youtube');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

async function checkTransitionStatus() {
  try {
    console.log('\n=== CHECKING TRANSITION STATUS ===\n');
    
    const streamId = 'a90c2d49-b09c-4c90-ad94-e0bc38037316'; // multi jadwal
    
    // Get stream from DB
    const stream = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, title, status, youtube_broadcast_id, start_time, created_at
        FROM streams 
        WHERE id = ?
      `, [streamId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!stream) {
      console.log('❌ Stream not found');
      return;
    }
    
    console.log('📺 DATABASE STATUS:');
    console.log('   Title:', stream.title);
    console.log('   Status:', stream.status);
    console.log('   Broadcast ID:', stream.youtube_broadcast_id || 'None');
    console.log('   Start Time:', stream.start_time);
    console.log('   Created:', stream.created_at);
    
    if (stream.youtube_broadcast_id) {
      console.log('\n📡 CHECKING YOUTUBE API...\n');
      
      const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
      const tokens = await getTokensForUser(userId);
      
      if (tokens && tokens.access_token) {
        const { google } = require('googleapis');
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token
        });
        
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        
        const response = await youtube.liveBroadcasts.list({
          part: 'id,snippet,status,contentDetails',
          id: stream.youtube_broadcast_id
        });
        
        if (response.data.items && response.data.items.length > 0) {
          const broadcast = response.data.items[0];
          
          console.log('📺 YOUTUBE BROADCAST:');
          console.log('   Life Cycle Status:', broadcast.status.lifeCycleStatus);
          console.log('   Privacy:', broadcast.status.privacyStatus);
          console.log('   Recording:', broadcast.status.recordingStatus);
          
          if (broadcast.contentDetails && broadcast.contentDetails.boundStreamId) {
            const streamResponse = await youtube.liveStreams.list({
              part: 'id,status',
              id: broadcast.contentDetails.boundStreamId
            });
            
            if (streamResponse.data.items && streamResponse.data.items.length > 0) {
              const ytStream = streamResponse.data.items[0];
              console.log('\n📡 YOUTUBE STREAM:');
              console.log('   Stream Status:', ytStream.status.streamStatus);
              console.log('   Health Status:', ytStream.status.healthStatus?.status || 'N/A');
            }
          }
          
          // Calculate time
          const startTime = new Date(stream.start_time);
          const now = new Date();
          const minutesRunning = Math.floor((now - startTime) / 1000 / 60);
          
          console.log('\n⏱️  TIME INFO:');
          console.log('   Running for:', minutesRunning, 'minutes');
          console.log('   Current time:', now.toLocaleTimeString('en-US', { hour12: false }));
          
          if (broadcast.status.lifeCycleStatus === 'live') {
            console.log('\n✅ BROADCAST IS LIVE!');
          } else {
            console.log('\n⚠️  BROADCAST NOT LIVE YET');
            console.log('   Status:', broadcast.status.lifeCycleStatus);
          }
        }
      }
    } else {
      console.log('\n⚠️  No broadcast ID - broadcast not created yet');
    }
    
    console.log('\n=== END ===\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    db.close();
  }
}

checkTransitionStatus();
