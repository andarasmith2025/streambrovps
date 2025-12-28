const { db } = require('./db/database');

console.log('Checking and fixing broadcast_id for offline streams...\n');

db.all(
  `SELECT id, title, status, youtube_broadcast_id 
   FROM streams 
   WHERE status = 'offline' 
   AND youtube_broadcast_id IS NOT NULL`,
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (!rows || rows.length === 0) {
      console.log('✅ No offline streams with broadcast_id found');
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} offline stream(s) with broadcast_id:\n`);
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Broadcast ID: ${row.youtube_broadcast_id}`);
      console.log('');
    });
    
    console.log('Clearing broadcast_id for these streams...\n');
    
    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    
    db.run(
      `UPDATE streams 
       SET youtube_broadcast_id = NULL 
       WHERE id IN (${placeholders})`,
      ids,
      function(err) {
        if (err) {
          console.error('Error updating:', err);
        } else {
          console.log(`✅ Cleared broadcast_id for ${this.changes} stream(s)`);
          console.log('');
          console.log('These streams will no longer show as "active" in YouTube Manage tool');
        }
        db.close();
      }
    );
  }
);
