-- Fix default channel issue
UPDATE youtube_channels SET is_default = 0;
UPDATE youtube_channels SET is_default = 1 WHERE channel_id = 'UCsAt2CugoD0xatdKguG1O5w';
SELECT channel_id, channel_title, is_default FROM youtube_channels;