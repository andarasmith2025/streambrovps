require('dotenv').config();

console.log('Testing environment variables:\n');
console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'EXISTS' : 'NOT FOUND'}`);
console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'EXISTS' : 'NOT FOUND'}`);
console.log(`GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI ? 'EXISTS' : 'NOT FOUND'}`);

if (process.env.GOOGLE_CLIENT_ID) {
  console.log(`\nClient ID: ${process.env.GOOGLE_CLIENT_ID}`);
  console.log(`Client Secret: ${process.env.GOOGLE_CLIENT_SECRET}`);
  console.log(`Redirect URI: ${process.env.GOOGLE_REDIRECT_URI}`);
}
