const fetch = require('node-fetch');

const streamIds = [
  '32bcf084-5af7-4ce7-a006-075793c1f688',
  '1e191c57-888d-4d42-8266-508148246b40',
  'f70477cc-6406-46d8-b6ef-c59909efae2d',
  'f270b12f-d94c-42dd-bb29-126ad5c5ddae',
  '44051aea-68b1-4de9-8b57-159b013fa51d',
  'edfcd688-c7e1-4d47-9b82-08a7dbf7496d',
  '4c5caa6e-0d6f-4558-8945-d8a0e17ad932'
];

async function stopStreams() {
  console.log(`Stopping ${streamIds.length} Tibetan Flute streams...\n`);
  
  for (const streamId of streamIds) {
    try {
      console.log(`Stopping stream ${streamId}...`);
      
      const response = await fetch(`http://localhost:3000/api/streams/${streamId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Stopped: ${streamId}`);
      } else {
        console.log(`❌ Failed: ${streamId} - ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${streamId} - ${error.message}`);
    }
  }
  
  console.log('\n✅ All streams stopped');
}

stopStreams();
