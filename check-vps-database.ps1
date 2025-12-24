# Check VPS Database Structure and Data
Write-Host "=== CHECKING VPS DATABASE ===" -ForegroundColor Cyan
Write-Host ""

$vpsHost = "85.9.195.103"
$sshKey = "$env:USERPROFILE\.ssh\id_rsa_upcloud_nyc"
$dbPath = "/root/streambrovps/db/streambro.db"

Write-Host "Connecting to VPS: $vpsHost" -ForegroundColor Yellow
Write-Host ""

# Check if database exists
Write-Host "1. Checking database file..." -ForegroundColor Green
ssh -i $sshKey root@$vpsHost "ls -lh $dbPath 2>/dev/null || echo 'Database not found at $dbPath'"
Write-Host ""

# Check streams count
Write-Host "2. Checking streams count..." -ForegroundColor Green
ssh -i $sshKey root@$vpsHost "cd /root/streambrovps && node -e `"const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('$dbPath'); db.get('SELECT COUNT(*) as count FROM streams', [], (err, row) => { if (err) console.log('Error:', err.message); else console.log('Total streams:', row.count); db.close(); });`""
Write-Host ""

# Check live streams
Write-Host "3. Checking LIVE streams..." -ForegroundColor Green
ssh -i $sshKey root@$vpsHost "cd /root/streambrovps && node -e `"const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('$dbPath'); db.all('SELECT id, title, status, active_schedule_id FROM streams WHERE status = ?', ['live'], (err, rows) => { if (err) console.log('Error:', err.message); else { console.log('Live streams:', rows.length); rows.forEach(s => console.log('  -', s.title, '(', s.id.substring(0,8), '...)', 'Schedule:', s.active_schedule_id || 'NULL')); } db.close(); });`""
Write-Host ""

# Check schedules count
Write-Host "4. Checking schedules count..." -ForegroundColor Green
ssh -i $sshKey root@$vpsHost "cd /root/streambrovps && node -e `"const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('$dbPath'); db.get('SELECT COUNT(*) as count FROM stream_schedules', [], (err, row) => { if (err) console.log('Error:', err.message); else console.log('Total schedules:', row.count); db.close(); });`""
Write-Host ""

# Check active FFmpeg processes
Write-Host "5. Checking active FFmpeg processes on VPS..." -ForegroundColor Green
ssh -i $sshKey root@$vpsHost "ps aux | grep ffmpeg | grep -v grep | wc -l"
Write-Host ""

Write-Host "=== VPS CHECK COMPLETED ===" -ForegroundColor Cyan
