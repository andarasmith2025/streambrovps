/**
 * Monitor Schedule Test
 * Script untuk monitoring apakah scheduled stream berhasil dieksekusi
 * Usage: node monitor-schedule-test.js <schedule_time_HH:MM>
 * Example: node monitor-schedule-test.js 13:20
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Get schedule time from command line argument
const scheduleTime = process.argv[2];
if (!scheduleTime || !/^\d{1,2}:\d{2}$/.test(scheduleTime)) {
  console.error('❌ Usage: node monitor-schedule-test.js <schedule_time_HH:MM>');
  console.error('   Example: node monitor-schedule-test.js 13:20');
  process.exit(1);
}

const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);

console.log('='.repeat(70));
console.log('📊 SCHEDULE MONITORING TEST');
console.log('='.repeat(70));
console.log(`⏰ Target Schedule Time: ${scheduleTime} WIB`);
console.log(`📅 Test Date: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
console.log('='.repeat(70));

// Calculate wait time
const now = new Date();
const targetTime = new Date(now);
targetTime.setHours(scheduleHour, scheduleMinute, 0, 0);

// If target time is in the past, assume it's for tomorrow
if (targetTime <= now) {
  targetTime.setDate(targetTime.getDate() + 1);
}

const waitMs = targetTime - now;
const waitMinutes = Math.ceil(waitMs / 60000);

console.log(`\n⏳ Current Time: ${now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB`);
console.log(`⏳ Target Time: ${targetTime.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB`);
console.log(`⏳ Wait Duration: ${waitMinutes} minutes (${Math.floor(waitMinutes / 60)}h ${waitMinutes % 60}m)`);
console.log(`\n💤 Sleeping until ${scheduleTime} WIB + 5 minutes buffer...`);
console.log(`   (Will check logs at ${new Date(targetTime.getTime() + 300000).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB)\n`);

// Add 5 minutes buffer after schedule time
const checkTime = targetTime.getTime() + 300000; // +5 minutes
const totalWaitMs = checkTime - now.getTime();

// Show countdown every 10 minutes
let remainingMs = totalWaitMs;
const countdownInterval = setInterval(() => {
  remainingMs -= 600000; // 10 minutes
  if (remainingMs > 0) {
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    console.log(`⏰ ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} - Still waiting... ${remainingMinutes} minutes remaining`);
  }
}, 600000); // Every 10 minutes

// Wait until check time
setTimeout(async () => {
  clearInterval(countdownInterval);
  
  console.log('\n' + '='.repeat(70));
  console.log('🔍 CHECKING LOGS NOW...');
  console.log('='.repeat(70));
  console.log(`📅 Check Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`);

  try {
    // Check PM2 logs for schedule execution
    console.log('📋 Fetching PM2 logs...\n');
    
    const { stdout } = await execPromise('pm2 logs streambro --lines 200 --nostream');
    
    // Parse logs to find schedule execution
    const lines = stdout.split('\n');
    
    // Look for schedule-related logs
    const schedulePattern = new RegExp(`schedule.*${scheduleHour}:${scheduleMinute}|${scheduleHour}:${scheduleMinute}.*schedule`, 'i');
    const startStreamPattern = /Starting stream|Stream started|startStream/i;
    const errorPattern = /error|failed|❌/i;
    const tokenPattern = /TokenManager|YouTube.*token|OAuth/i;
    
    let foundScheduleCheck = false;
    let foundStreamStart = false;
    let foundError = false;
    let scheduleCheckLines = [];
    let streamStartLines = [];
    let errorLines = [];
    let tokenLines = [];
    
    lines.forEach((line, index) => {
      if (schedulePattern.test(line)) {
        foundScheduleCheck = true;
        scheduleCheckLines.push(line);
      }
      if (startStreamPattern.test(line)) {
        foundStreamStart = true;
        streamStartLines.push(line);
      }
      if (errorPattern.test(line)) {
        foundError = true;
        errorLines.push(line);
      }
      if (tokenPattern.test(line)) {
        tokenLines.push(line);
      }
    });
    
    // Display results
    console.log('📊 ANALYSIS RESULTS:');
    console.log('='.repeat(70));
    
    if (foundScheduleCheck) {
      console.log('✅ Schedule Check: FOUND');
      console.log('\n📝 Schedule-related logs:');
      scheduleCheckLines.slice(-5).forEach(line => console.log('   ' + line.trim()));
    } else {
      console.log('❌ Schedule Check: NOT FOUND');
    }
    
    console.log('\n' + '-'.repeat(70));
    
    if (foundStreamStart) {
      console.log('✅ Stream Start: FOUND');
      console.log('\n📝 Stream start logs:');
      streamStartLines.slice(-3).forEach(line => console.log('   ' + line.trim()));
    } else {
      console.log('❌ Stream Start: NOT FOUND');
    }
    
    console.log('\n' + '-'.repeat(70));
    
    if (tokenLines.length > 0) {
      console.log(`ℹ️  Token Manager Activity: ${tokenLines.length} entries`);
      console.log('\n📝 Recent token logs:');
      tokenLines.slice(-5).forEach(line => console.log('   ' + line.trim()));
    } else {
      console.log('⚠️  Token Manager Activity: NONE');
    }
    
    console.log('\n' + '-'.repeat(70));
    
    if (foundError) {
      console.log(`⚠️  Errors Found: ${errorLines.length} entries`);
      console.log('\n📝 Recent errors:');
      errorLines.slice(-5).forEach(line => console.log('   ' + line.trim()));
    } else {
      console.log('✅ No Errors Found');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL VERDICT:');
    console.log('='.repeat(70));
    
    if (foundScheduleCheck && foundStreamStart && !foundError) {
      console.log('✅ SUCCESS: Schedule executed and stream started successfully!');
      console.log('✅ Token auto-refresh is working correctly!');
    } else if (foundScheduleCheck && !foundStreamStart) {
      console.log('⚠️  PARTIAL: Schedule was checked but stream did not start');
      console.log('   Possible causes:');
      console.log('   - Time mismatch (too early/too late)');
      console.log('   - Token issue');
      console.log('   - Stream configuration problem');
    } else if (!foundScheduleCheck) {
      console.log('❌ FAILED: Schedule was not checked at all');
      console.log('   Possible causes:');
      console.log('   - Scheduler not running');
      console.log('   - Schedule time incorrect');
      console.log('   - Database issue');
    } else {
      console.log('⚠️  UNCLEAR: Mixed results, manual review needed');
    }
    
    console.log('\n💡 TIP: Check full logs with: pm2 logs streambro');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error checking logs:', error.message);
    process.exit(1);
  }
  
}, totalWaitMs);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Monitoring cancelled by user');
  process.exit(0);
});
