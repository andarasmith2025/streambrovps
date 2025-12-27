-- Update youtube_channel_id for streams that don't have it
UPDATE streams 
SET youtube_channel_id = 'UCDM_CmM0o5WN6tkF7bbEeRQ' 
WHERE youtube_channel_id IS NULL 
  AND use_youtube_api = 1;

-- Show updated streams
SELECT id, title, youtube_channel_id, use_youtube_api 
FROM streams 
WHERE use_youtube_api = 1 
ORDER BY created_at DESC 
LIMIT 5;
