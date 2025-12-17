const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const streamingService = require('../services/streamingService');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ success: false, error: 'Not authenticated' });
};

// Get all broadcasts for current user (with local data)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    db.all(
      `SELECT yb.*, v.title as video_name, s.status as stream_status, s.id as stream_id
       FROM youtube_broadcasts yb
       LEFT JOIN videos v ON yb.video_id = v.id
       LEFT JOIN streams s ON yb.stream_id = s.id
       WHERE yb.user_id = ?
       ORDER BY yb.scheduled_start_time DESC`,
      [userId],
      (err, rows) => {
        if (err) {
          console.error('Error fetching broadcasts:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        res.json({ success: true, broadcasts: rows || [] });
      }
    );
  } catch (error) {
    console.error('Error in GET /api/youtube-broadcasts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create/save broadcast to local database
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { broadcastId, videoId, title, description, scheduledStartTime, streamKey, rtmpUrl } = req.body;
    
    if (!broadcastId || !videoId) {
      return res.status(400).json({ success: false, error: 'broadcastId and videoId are required' });
    }
    
    const id = uuidv4();
    
    db.run(
      `INSERT INTO youtube_broadcasts (id, broadcast_id, user_id, video_id, title, description, scheduled_start_time, stream_key, rtmp_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, broadcastId, userId, videoId, title, description, scheduledStartTime, streamKey, rtmpUrl, 'upcoming'],
      function(err) {
        if (err) {
          console.error('Error saving broadcast:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        res.json({ success: true, id });
      }
    );
  } catch (error) {
    console.error('Error in POST /api/youtube-broadcasts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start streaming to broadcast
router.post('/:broadcastId/start', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { broadcastId } = req.params;
    
    // Get broadcast data
    db.get(
      `SELECT yb.*, v.filepath, v.title as video_title
       FROM youtube_broadcasts yb
       JOIN videos v ON yb.video_id = v.id
       WHERE yb.broadcast_id = ? AND yb.user_id = ?`,
      [broadcastId, userId],
      async (err, broadcast) => {
        if (err || !broadcast) {
          return res.status(404).json({ success: false, error: 'Broadcast not found' });
        }
        
        // Check if already streaming
        if (broadcast.stream_id) {
          return res.status(400).json({ success: false, error: 'Stream already running' });
        }
        
        // Build RTMP URL
        const rtmpUrl = broadcast.rtmp_url && broadcast.stream_key 
          ? `${broadcast.rtmp_url.replace('rtmp://', 'rtmps://')}/${broadcast.stream_key}`
          : null;
        
        if (!rtmpUrl) {
          return res.status(400).json({ success: false, error: 'Stream key not found' });
        }
        
        // Create stream via streamingService
        const streamData = {
          title: broadcast.title || broadcast.video_title,
          videoPath: broadcast.filepath,
          rtmpUrl: rtmpUrl,
          platform: 'YouTube',
          userId: userId,
          videoId: broadcast.video_id
        };
        
        try {
          const stream = await streamingService.createStream(streamData);
          
          // Update broadcast with stream_id
          db.run(
            `UPDATE youtube_broadcasts SET stream_id = ?, status = ? WHERE id = ?`,
            [stream.id, 'live', broadcast.id],
            (updateErr) => {
              if (updateErr) {
                console.error('Error updating broadcast:', updateErr);
              }
            }
          );
          
          // Start streaming
          await streamingService.startStream(stream.id);
          
          res.json({ success: true, streamId: stream.id });
          
        } catch (streamErr) {
          console.error('Error starting stream:', streamErr);
          res.status(500).json({ success: false, error: streamErr.message });
        }
      }
    );
  } catch (error) {
    console.error('Error in POST /api/youtube-broadcasts/:id/start:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop streaming
router.post('/:broadcastId/stop', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { broadcastId } = req.params;
    
    // Get broadcast data
    db.get(
      `SELECT * FROM youtube_broadcasts WHERE broadcast_id = ? AND user_id = ?`,
      [broadcastId, userId],
      async (err, broadcast) => {
        if (err || !broadcast) {
          return res.status(404).json({ success: false, error: 'Broadcast not found' });
        }
        
        if (!broadcast.stream_id) {
          return res.status(400).json({ success: false, error: 'No active stream' });
        }
        
        try {
          // Stop stream
          await streamingService.stopStream(broadcast.stream_id);
          
          // Update broadcast
          db.run(
            `UPDATE youtube_broadcasts SET stream_id = NULL, status = ? WHERE id = ?`,
            ['completed', broadcast.id],
            (updateErr) => {
              if (updateErr) {
                console.error('Error updating broadcast:', updateErr);
              }
            }
          );
          
          res.json({ success: true });
          
        } catch (streamErr) {
          console.error('Error stopping stream:', streamErr);
          res.status(500).json({ success: false, error: streamErr.message });
        }
      }
    );
  } catch (error) {
    console.error('Error in POST /api/youtube-broadcasts/:id/stop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete broadcast
router.delete('/:broadcastId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { broadcastId } = req.params;
    
    db.run(
      `DELETE FROM youtube_broadcasts WHERE broadcast_id = ? AND user_id = ?`,
      [broadcastId, userId],
      function(err) {
        if (err) {
          console.error('Error deleting broadcast:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error in DELETE /api/youtube-broadcasts/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
