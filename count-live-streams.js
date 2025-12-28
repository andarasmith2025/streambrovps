const { db } = require('./db/database');

db.get('SELECT COUNT(*) as count FROM streams WHERE status = "live"', [], (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Total streams with status "live":', row.count);
  }
  db.close();
});
