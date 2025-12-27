const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING HEALING EARTH OAUTH TOKEN ===\n');

db.get(`
  SELECT 
    id,
    user_id,
    channel_id,
    channel_title,
    access_token,
    refresh_token,
    expiry_date,
    is_default,
    created_at,
    updated_at
  FROM youtube_channels
  WHERE channel_title LIKE '%Healing Earth%'
  LIMIT 1
`, (err, channel) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!channel) {
    console.log('❌ Healing Earth channel not found\n');
    
    // Show all channels
    db.all(`
      SELECT channel_id, channel_title, is_default, created_at
      FROM youtube_channels
      ORDER BY created_at DESC
    `, (err, channels) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }
      
      console.log(`Found ${channels.length} channel(s):\n`);
      channels.forEach((ch, idx) => {
        console.log(`[${idx + 1}] ${ch.channel_title}`);
        console.log(`    Channel ID: ${ch.channel_id}`);
        console.log(`    Default: ${ch.is_default ? 'YES' : 'NO'}`);
        console.log(`    Created: ${ch.created_at}`);
        console.log('');
      });
      
      db.close();
    });
    return;
  }

  console.log(`✅ Channel: ${channel.channel_title}`);
  console.log(`   ID: ${channel.channel_id}`);
  console.log(`   User ID: ${channel.user_id}`);
  console.log(`   Is Default: ${channel.is_default ? 'YES' : 'NO'}`);
  console.log(`   Created: ${channel.created_at}`);
  console.log(`   Updated: ${channel.updated_at}\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🔑 OAUTH TOKEN STATUS:\n');
  
  if (!channel.access_token) {
    console.log('❌ ACCESS TOKEN: NOT SET');
    console.log('   → Channel is NOT authenticated');
    console.log('   → Cannot create YouTube broadcasts');
    console.log('   → User must authenticate via OAuth\n');
  } else {
    console.log(`✅ ACCESS TOKEN: SET`);
    console.log(`   Token: ${channel.access_token.substring(0, 30)}...`);
    console.log(`   Length: ${channel.access_token.length} characters\n`);
  }

  if (!channel.refresh_token) {
    console.log('❌ REFRESH TOKEN: NOT SET');
    console.log('   → Cannot refresh expired access token');
    console.log('   → User must re-authenticate when token expires\n');
  } else {
    console.log(`✅ REFRESH TOKEN: SET`);
    console.log(`   Token: ${channel.refresh_token.substring(0, 30)}...`);
    console.log(`   Length: ${channel.refresh_token.length} characters\n`);
  }

  if (!channel.expiry_date) {
    console.log('⚠️  EXPIRY DATE: NOT SET');
    console.log('   → Cannot determine if token is expired\n');
  } else {
    const expiry = new Date(channel.expiry_date);
    const now = new Date();
    
    console.log(`📅 EXPIRY DATE: ${expiry.toLocaleString()}`);
    console.log(`   Current Time: ${now.toLocaleString()}`);
    
    if (expiry < now) {
      const minutesAgo = Math.floor((now - expiry) / 60000);
      const hoursAgo = Math.floor(minutesAgo / 60);
      const daysAgo = Math.floor(hoursAgo / 24);
      
      console.log(`\n❌ TOKEN EXPIRED!`);
      if (daysAgo > 0) {
        console.log(`   Expired ${daysAgo} day(s) ago`);
      } else if (hoursAgo > 0) {
        console.log(`   Expired ${hoursAgo} hour(s) ago`);
      } else {
        console.log(`   Expired ${minutesAgo} minute(s) ago`);
      }
      console.log('   → Broadcasts CANNOT be created');
      console.log('   → Token must be refreshed immediately\n');
    } else {
      const minutesLeft = Math.floor((expiry - now) / 60000);
      const hoursLeft = Math.floor(minutesLeft / 60);
      const daysLeft = Math.floor(hoursLeft / 24);
      
      console.log(`\n✅ TOKEN VALID`);
      if (daysLeft > 0) {
        console.log(`   Valid for ${daysLeft} more day(s)`);
      } else if (hoursLeft > 0) {
        console.log(`   Valid for ${hoursLeft} more hour(s)`);
      } else {
        console.log(`   Valid for ${minutesLeft} more minute(s)`);
      }
      console.log('   → Broadcasts can be created\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if there are failed broadcast creations
  db.all(`
    SELECT COUNT(*) as count
    FROM streams
    WHERE youtube_channel_id = ?
      AND use_youtube_api = 1
      AND youtube_broadcast_id IS NULL
      AND status = 'live'
  `, [channel.channel_id], (err, result) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    const failedCount = result[0].count;
    
    console.log('📊 BROADCAST CREATION STATUS:\n');
    console.log(`   Failed Broadcasts: ${failedCount}`);
    
    if (failedCount > 0) {
      console.log(`\n⚠️  ${failedCount} stream(s) are live but have NO broadcast ID`);
      console.log('   → These streams are NOT visible in YouTube Studio');
      console.log('   → Possible causes:');
      
      if (!channel.access_token || !channel.refresh_token) {
        console.log('      ❌ Missing OAuth tokens');
      } else if (channel.expiry_date && new Date(channel.expiry_date) < new Date()) {
        console.log('      ❌ OAuth token expired');
      } else {
        console.log('      ⚠️  YouTube API quota exceeded');
        console.log('      ⚠️  YouTube API service error');
        console.log('      ⚠️  Missing required fields (thumbnail, etc)');
      }
    } else {
      console.log('\n✅ All streams have broadcast IDs');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    console.log('💡 RECOMMENDATIONS:\n');
    
    if (!channel.access_token || !channel.refresh_token) {
      console.log('   1. ❌ AUTHENTICATE CHANNEL');
      console.log('      → Go to YouTube Manage page');
      console.log('      → Click "Authenticate with Google"');
      console.log('      → Grant permissions to YouTube API\n');
    } else if (channel.expiry_date && new Date(channel.expiry_date) < new Date()) {
      console.log('   1. ❌ REFRESH TOKEN');
      console.log('      → Token refresh should happen automatically');
      console.log('      → If not working, re-authenticate the channel\n');
    } else {
      console.log('   1. ✅ Token is valid');
      console.log('      → Check YouTube API quota in Google Cloud Console');
      console.log('      → Check PM2 logs for API errors');
      console.log('      → Verify all required fields are set (thumbnail, etc)\n');
    }

    db.close();
  });
});
