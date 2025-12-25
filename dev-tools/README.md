# Development Tools

Folder ini berisi semua script development, debugging, dan maintenance untuk StreamBro.

## 📁 Struktur Folder

### `/check` - Verification Scripts
Script untuk memeriksa status sistem, database, dan konfigurasi.
- `check-*.js` - Database dan stream status checks
- `check-*.ps1` - PowerShell verification scripts
- `verify-*.js` - Verification utilities

**Contoh:**
```bash
node dev-tools/check/check-stream-status.js
node dev-tools/check/check-system-status.js
```

### `/debug` - Debugging Tools
Script untuk debugging masalah dan analisis error.
- `debug-*.js` - Debug utilities
- `diagnose-*.js` - Diagnostic tools
- `analyze-*.js` - Analysis scripts

**Contoh:**
```bash
node dev-tools/debug/debug-database-connection.js
node dev-tools/debug/diagnose-scheduler-failures.js
```

### `/fix` - Fix & Cleanup Scripts
Script untuk memperbaiki masalah dan cleanup data.
- `fix-*.js` - Fix utilities
- `fix-*.sql` - SQL fix scripts
- `force-*.js` - Force operations
- `clear-*.js` - Cleanup scripts
- `stop-*.js` - Stop operations

**Contoh:**
```bash
node dev-tools/fix/fix-active-schedule-vps.js
node dev-tools/fix/clear-all-sessions.js
```

### `/test` - Testing Scripts
Script untuk testing fitur dan API.
- `test-*.js` - Test scripts
- `test-*.html` - Test pages
- `create-test-*.js` - Test data generators
- `quick-*.js` - Quick test utilities

**Contoh:**
```bash
node dev-tools/test/test-channel-connection.js
node dev-tools/test/quick-monetization-check.js
```

### `/monitor` - Monitoring Scripts
Script untuk monitoring logs dan sistem.
- `monitor-*.ps1` - PowerShell monitoring scripts
- `monitor-*.sh` - Bash monitoring scripts

**Contoh:**
```powershell
.\dev-tools\monitor\monitor-stream-logs.ps1
.\dev-tools\monitor\monitor-youtube-api-logs.ps1
```

### `/deploy` - Deployment Scripts
Script untuk deployment ke VPS.
- `deploy-*.ps1` - PowerShell deployment scripts
- `deploy-*.sh` - Bash deployment scripts

**Contoh:**
```powershell
.\dev-tools\deploy\deploy-to-vps.ps1
.\dev-tools\deploy\deploy-multi-channel-to-vps.ps1
```

### `/migrate` - Database Migration
Script untuk migrasi database dan schema updates.
- `migrate-*.js` - Migration scripts
- `add-*.js` - Add column/table scripts
- `update-*.js` - Update scripts

**Contoh:**
```bash
node dev-tools/migrate/migrate-database.js
node dev-tools/migrate/add-thumbnail-column.js
```

### Root `/dev-tools` - Utilities
- `cleanup-*.ps1` - Cleanup utilities
- `generate-*.js` - Code generators
- `refactor-*.py` - Refactoring tools

---

## 🚀 Quick Start

### Check System Status
```bash
node dev-tools/check/check-system-status.js
```

### Debug Scheduler Issues
```bash
node dev-tools/debug/diagnose-scheduler-failures.js
```

### Fix Active Schedules
```bash
node dev-tools/fix/fix-active-schedule-vps.js
```

### Monitor Logs
```powershell
.\dev-tools\monitor\monitor-stream-logs.ps1
```

### Deploy to VPS
```powershell
.\dev-tools\deploy\deploy-to-vps.ps1
```

---

## ⚠️ Important Notes

1. **Backup First**: Always backup database before running fix scripts
2. **Test Environment**: Test scripts in development before production
3. **VPS Access**: Deploy scripts require SSH key configured
4. **Dependencies**: Ensure all npm packages installed before running scripts

---

## 📝 Adding New Scripts

When adding new development scripts:

1. **Place in correct folder** based on purpose
2. **Follow naming convention**: `{action}-{description}.{ext}`
3. **Add documentation** in script header
4. **Update this README** if adding new category

---

## 🔧 Maintenance

Scripts in this folder are for development only and should NOT be deployed to production.

For production maintenance, use the admin panel or documented procedures in `/docs`.
