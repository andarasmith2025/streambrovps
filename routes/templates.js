const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// Get all templates for current user
router.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all(
    `SELECT id, name, description, video_name, platform, created_at, updated_at 
     FROM stream_templates 
     WHERE user_id = ? 
     ORDER BY updated_at DESC`,
    [req.session.userId],
    (err, templates) => {
      if (err) {
        console.error('Error fetching templates:', err);
        return res.status(500).json({ error: 'Failed to fetch templates' });
      }
      res.json(templates);
    }
  );
});

// Get single template by ID
router.get('/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.get(
    `SELECT * FROM stream_templates WHERE id = ? AND user_id = ?`,
    [req.params.id, req.session.userId],
    (err, template) => {
      if (err) {
        console.error('Error fetching template:', err);
        return res.status(500).json({ error: 'Failed to fetch template' });
      }
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Parse JSON fields
      if (template.schedules) {
        template.schedules = JSON.parse(template.schedules);
      }
      if (template.advanced_settings) {
        template.advanced_settings = JSON.parse(template.advanced_settings);
      }

      res.json(template);
    }
  );
});

// Save new template
router.post('/', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    name,
    description,
    video_id,
    video_name,
    stream_title,
    rtmp_url,
    stream_key,
    platform,
    loop_video,
    schedules,
    use_advanced_settings,
    advanced_settings
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Template name is required' });
  }

  const templateId = uuidv4();
  const schedulesJson = JSON.stringify(schedules || []);
  const advancedSettingsJson = JSON.stringify(advanced_settings || {});

  db.run(
    `INSERT INTO stream_templates 
     (id, name, description, video_id, video_name, stream_title, rtmp_url, stream_key, 
      platform, loop_video, schedules, use_advanced_settings, advanced_settings, user_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      templateId,
      name,
      description || '',
      video_id || null,
      video_name || '',
      stream_title || '',
      rtmp_url || '',
      stream_key || '',
      platform || 'Custom',
      loop_video ? 1 : 0,
      schedulesJson,
      use_advanced_settings ? 1 : 0,
      advancedSettingsJson,
      req.session.userId
    ],
    function (err) {
      if (err) {
        console.error('Error saving template:', err);
        return res.status(500).json({ error: 'Failed to save template' });
      }
      res.json({ 
        success: true, 
        id: templateId,
        message: 'Template saved successfully' 
      });
    }
  );
});

// Update template
router.put('/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    name,
    description,
    video_id,
    video_name,
    stream_title,
    rtmp_url,
    stream_key,
    platform,
    loop_video,
    schedules,
    use_advanced_settings,
    advanced_settings
  } = req.body;

  const schedulesJson = JSON.stringify(schedules || []);
  const advancedSettingsJson = JSON.stringify(advanced_settings || {});

  db.run(
    `UPDATE stream_templates 
     SET name = ?, description = ?, video_id = ?, video_name = ?, stream_title = ?, 
         rtmp_url = ?, stream_key = ?, platform = ?, loop_video = ?, schedules = ?, 
         use_advanced_settings = ?, advanced_settings = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [
      name,
      description || '',
      video_id || null,
      video_name || '',
      stream_title || '',
      rtmp_url || '',
      stream_key || '',
      platform || 'Custom',
      loop_video ? 1 : 0,
      schedulesJson,
      use_advanced_settings ? 1 : 0,
      advancedSettingsJson,
      req.params.id,
      req.session.userId
    ],
    function (err) {
      if (err) {
        console.error('Error updating template:', err);
        return res.status(500).json({ error: 'Failed to update template' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json({ 
        success: true, 
        message: 'Template updated successfully' 
      });
    }
  );
});

// Delete template
router.delete('/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.run(
    `DELETE FROM stream_templates WHERE id = ? AND user_id = ?`,
    [req.params.id, req.session.userId],
    function (err) {
      if (err) {
        console.error('Error deleting template:', err);
        return res.status(500).json({ error: 'Failed to delete template' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json({ 
        success: true, 
        message: 'Template deleted successfully' 
      });
    }
  );
});

// Export template as JSON
router.get('/:id/export', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.get(
    `SELECT * FROM stream_templates WHERE id = ? AND user_id = ?`,
    [req.params.id, req.session.userId],
    (err, template) => {
      if (err) {
        console.error('Error exporting template:', err);
        return res.status(500).json({ error: 'Failed to export template' });
      }
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Parse JSON fields
      if (template.schedules) {
        template.schedules = JSON.parse(template.schedules);
      }
      if (template.advanced_settings) {
        template.advanced_settings = JSON.parse(template.advanced_settings);
      }

      // Remove sensitive/unnecessary fields
      delete template.id;
      delete template.user_id;
      delete template.created_at;
      delete template.updated_at;

      // Set filename
      const filename = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(template);
    }
  );
});

// Import template from JSON
router.post('/import', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const templateData = req.body;

  if (!templateData.name) {
    return res.status(400).json({ error: 'Invalid template data' });
  }

  const templateId = uuidv4();
  const schedulesJson = JSON.stringify(templateData.schedules || []);
  const advancedSettingsJson = JSON.stringify(templateData.advanced_settings || {});

  db.run(
    `INSERT INTO stream_templates 
     (id, name, description, video_id, video_name, stream_title, rtmp_url, stream_key, 
      platform, loop_video, schedules, use_advanced_settings, advanced_settings, user_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      templateId,
      templateData.name + ' (Imported)',
      templateData.description || '',
      templateData.video_id || null,
      templateData.video_name || '',
      templateData.stream_title || '',
      templateData.rtmp_url || '',
      templateData.stream_key || '',
      templateData.platform || 'Custom',
      templateData.loop_video ? 1 : 0,
      schedulesJson,
      templateData.use_advanced_settings ? 1 : 0,
      advancedSettingsJson,
      req.session.userId
    ],
    function (err) {
      if (err) {
        console.error('Error importing template:', err);
        return res.status(500).json({ error: 'Failed to import template' });
      }
      res.json({ 
        success: true, 
        id: templateId,
        message: 'Template imported successfully' 
      });
    }
  );
});

// Export selected templates
router.post('/export', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No template IDs provided' });
  }
  
  console.log(`[Templates] Exporting ${ids.length} template(s) for user ${req.session.userId}`);
  
  // Create placeholders for SQL IN clause
  const placeholders = ids.map(() => '?').join(',');
  const query = `SELECT * FROM stream_templates WHERE id IN (${placeholders}) AND user_id = ?`;
  
  db.all(query, [...ids, req.session.userId], (err, templates) => {
    if (err) {
      console.error('[Templates] Export error:', err);
      return res.status(500).json({ error: 'Failed to export templates' });
    }
    
    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'No templates found' });
    }
    
    // Parse JSON fields and remove sensitive data
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: templates.map(t => {
        // Parse JSON fields
        const template = { ...t };
        if (template.schedules) {
          template.schedules = JSON.parse(template.schedules);
        }
        if (template.advanced_settings) {
          template.advanced_settings = JSON.parse(template.advanced_settings);
        }
        
        // Remove sensitive/unnecessary fields
        delete template.id;
        delete template.user_id;
        
        return template;
      })
    };
    
    // Send as JSON file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="templates-export-${Date.now()}.json"`);
    res.json(exportData);
  });
});

// Export all templates
router.get('/export-all', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log(`[Templates] Exporting all templates for user ${req.session.userId}`);
  
  db.all(
    `SELECT * FROM stream_templates WHERE user_id = ? ORDER BY created_at DESC`,
    [req.session.userId],
    (err, templates) => {
      if (err) {
        console.error('[Templates] Export all error:', err);
        return res.status(500).json({ error: 'Failed to export templates' });
      }
      
      if (!templates || templates.length === 0) {
        return res.status(404).json({ error: 'No templates found' });
      }
      
      // Parse JSON fields and remove sensitive data
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        templates: templates.map(t => {
          // Parse JSON fields
          const template = { ...t };
          if (template.schedules) {
            template.schedules = JSON.parse(template.schedules);
          }
          if (template.advanced_settings) {
            template.advanced_settings = JSON.parse(template.advanced_settings);
          }
          
          // Remove sensitive/unnecessary fields
          delete template.id;
          delete template.user_id;
          
          return template;
        })
      };
      
      // Send as JSON file
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="all-templates-export-${Date.now()}.json"`);
      res.json(exportData);
    }
  );
});

module.exports = router;
