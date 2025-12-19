const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');

class StreamSchedule {
  static async create(data) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      db.run(
        `INSERT INTO stream_schedules (
          id, stream_id, schedule_time, duration, status, is_recurring, recurring_days, user_timezone, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          data.stream_id, 
          data.schedule_time, 
          data.duration, 
          'pending',
          data.is_recurring ? 1 : 0,
          data.recurring_days || null,
          data.user_timezone || 'Asia/Jakarta',
          now
        ],
        function (err) {
          if (err) {
            console.error('Error creating stream schedule:', err.message);
            return reject(err);
          }
          resolve({ id, ...data, status: 'pending', created_at: now });
        }
      );
    });
  }

  static async findByStreamId(streamId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM stream_schedules WHERE stream_id = ? ORDER BY schedule_time ASC',
        [streamId],
        (err, rows) => {
          if (err) {
            console.error('Error finding stream schedules:', err.message);
            return reject(err);
          }
          resolve(rows || []);
        }
      );
    });
  }

  static async findPending() {
    return new Promise((resolve, reject) => {
      const query = `SELECT ss.*, s.title, s.video_id, s.rtmp_url, s.stream_key, s.platform, 
                s.loop_video, s.user_id
         FROM stream_schedules ss
         JOIN streams s ON ss.stream_id = s.id
         WHERE ss.status = 'pending'
         ORDER BY ss.schedule_time ASC`;
      
      console.log('[StreamSchedule] Executing findPending query...');
      
      db.all(query, [], (err, rows) => {
          if (err) {
            console.error('[StreamSchedule] Error finding pending schedules:', err.message);
            return reject(err);
          }
          console.log(`[StreamSchedule] findPending returned ${rows ? rows.length : 0} row(s)`);
          if (rows && rows.length > 0) {
            console.log('[StreamSchedule] First schedule:', JSON.stringify(rows[0], null, 2));
          }
          resolve(rows || []);
        }
      );
    });
  }

  static async updateStatus(id, status, executedAt = null) {
    return new Promise((resolve, reject) => {
      const query = executedAt
        ? 'UPDATE stream_schedules SET status = ?, executed_at = ? WHERE id = ?'
        : 'UPDATE stream_schedules SET status = ? WHERE id = ?';
      
      const params = executedAt ? [status, executedAt, id] : [status, id];
      
      db.run(query, params, function (err) {
        if (err) {
          console.error('Error updating schedule status:', err.message);
          return reject(err);
        }
        resolve({ id, status, executed_at: executedAt });
      });
    });
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM stream_schedules WHERE id = ?', [id], function (err) {
        if (err) {
          console.error('Error deleting stream schedule:', err.message);
          return reject(err);
        }
        resolve({ success: true, id });
      });
    });
  }

  static async deleteByStreamId(streamId) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM stream_schedules WHERE stream_id = ?', [streamId], function (err) {
        if (err) {
          console.error('Error deleting stream schedules:', err.message);
          return reject(err);
        }
        resolve({ success: true, deleted: this.changes });
      });
    });
  }
}

module.exports = StreamSchedule;
