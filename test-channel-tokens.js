const { getTokensForUser } = require('./routes/youtube');

const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
const hsnChannelId = 'UCsAt2CugoD0xatdKguG1O5w';

console.log('Testing getTokensForUser with HSN channel...\n');
console.log('User ID:', userId);
console.log('Channel ID:', hsnChannelId);
console.log('');

getTokensForUser(userId, hsnChannelId)
  .then(tokens => {
    console.log('\n✅ Result:');
    console.log('Tokens:', tokens ? 'Found' : 'Not found');
    if (tokens) {
      console.log('Access token:', tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'Missing');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
