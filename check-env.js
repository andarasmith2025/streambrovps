require('dotenv').config();

console.log('Environment Check:');
console.log('==================');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'EXISTS (length: ' + process.env.SESSION_SECRET.length + ')' : 'NOT FOUND');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('DATABASE_PATH:', process.env.DATABASE_PATH || 'NOT SET');
