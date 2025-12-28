const { db } = require('./db/database');

console.log('Disabling auto-start for all streams to prevent YouTube spam...\n');

db.run(
  `UPDATE streams 
   SET youtube_auto_start = 0 
   WHERE use_youtube_api = 1 
   AND youtube_auto_start = 1`,
  [],
  function(err) {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    console.log(`✅ Disabled auto-start for ${this.changes} stream(s)`);
    console.log('');
    console.log('Broadcasts will be created but NOT auto-transitioned to live.');
    console.log('You need to manually start them in YouTube Studio.');
    console.log('This prevents spam and potential ban.');
    
    db.close();
  }
);
