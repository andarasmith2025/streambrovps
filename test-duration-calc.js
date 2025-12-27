// Test duration calculation with actual data from logs
const start = new Date('2025-12-27T04:19:48.738Z');
const duration = 300; // minutes
const shouldEnd = new Date(start.getTime() + duration * 60 * 1000);
const now = new Date();

console.log('=== DURATION CALCULATION TEST ===\n');
console.log('Start Time (UTC):', start.toISOString());
console.log('Start Time (WIB):', start.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}));
console.log('Duration:', duration, 'minutes');
console.log('');
console.log('Should End (UTC):', shouldEnd.toISOString());
console.log('Should End (WIB):', shouldEnd.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}));
console.log('');
console.log('Now (UTC):', now.toISOString());
console.log('Now (WIB):', now.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}));
console.log('');
console.log('Elapsed minutes:', Math.floor((now - start) / 60000));
console.log('Remaining minutes:', Math.floor((shouldEnd - now) / 60000));
console.log('');
console.log('Should stop? (shouldEnd <= now):', shouldEnd <= now);
console.log('');

// Test with another stream
console.log('=== TEST STREAM 2 ===');
const start2 = new Date('2025-12-27T04:20:45.588Z');
const duration2 = 300;
const shouldEnd2 = new Date(start2.getTime() + duration2 * 60 * 1000);
console.log('Start:', start2.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}));
console.log('Should End:', shouldEnd2.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}));
console.log('Elapsed:', Math.floor((now - start2) / 60000), 'minutes');
console.log('Should stop?', shouldEnd2 <= now);
