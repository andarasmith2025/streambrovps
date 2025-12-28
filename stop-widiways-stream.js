const streamingService = require('./services/streamingService');

const streamId = '7115a94c-c4e9-4a6d-abdd-98af73e728fa';

console.log('Stopping WidiWays stream to clear memory...\n');

streamingService.stopStream(streamId)
  .then(result => {
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n✅ Stream stopped. Scheduler will start it on next check.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
