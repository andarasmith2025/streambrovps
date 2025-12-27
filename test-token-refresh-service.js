require('dotenv').config();

console.log('Testing token refresh service...\n');

try {
  const tokenRefreshService = require('./services/tokenRefreshService');
  console.log('✅ Service loaded successfully');
  
  console.log('\nStarting service...');
  tokenRefreshService.start();
  
  console.log('\nWaiting 5 seconds...');
  setTimeout(() => {
    console.log('\nStopping service...');
    tokenRefreshService.stop();
    console.log('✅ Test complete');
    process.exit(0);
  }, 5000);
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
