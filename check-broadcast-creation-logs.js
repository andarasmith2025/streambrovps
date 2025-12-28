/**
 * Check when broadcasts were created from logs
 */

const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'logs', 'pm2-out.log');

console.log('Checking broadcast creation in logs...\n');

try {
  const logs = fs.readFileSync(logFile, 'utf8');
  const lines = logs.split('\n');
  
  const broadcastLines = lines.filter(line => 
    line.includes('Creating broadcast') ||
    line.includes('Broadcast created') ||
    line.includes('scheduleLive') ||
    line.includes('NEW broadcast') ||
    line.includes('createNewBroadcast') ||
    line.includes('YouTube broadcast')
  );
  
  console.log(`Found ${broadcastLines.length} broadcast-related log lines\n`);
  console.log('Last 50 broadcast-related logs:');
  console.log('='.repeat(80));
  
  const last50 = broadcastLines.slice(-50);
  last50.forEach(line => {
    console.log(line);
  });
  
} catch (error) {
  console.error('Error reading logs:', error.message);
}
