# Monitor Schedule Test - Remote Execution
# Usage: .\monitor-schedule-remote.ps1 13:20
# This will SSH to VPS and monitor the schedule execution

param(
    [Parameter(Mandatory=$true)]
    [string]$ScheduleTime
)

# Validate time format
if ($ScheduleTime -notmatch '^\d{1,2}:\d{2}$') {
    Write-Host "❌ Invalid time format. Use HH:MM (e.g., 13:20)" -ForegroundColor Red
    exit 1
}

$VPS_IP = "94.237.3.164"
$VPS_PATH = "/root/streambrovps"

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "📊 REMOTE SCHEDULE MONITORING" -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🖥️  VPS: $VPS_IP" -ForegroundColor White
Write-Host "⏰ Schedule Time: $ScheduleTime WIB" -ForegroundColor White
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# Upload monitoring script to VPS
Write-Host "📤 Uploading monitoring script to VPS..." -ForegroundColor Yellow
scp monitor-schedule-test.js root@${VPS_IP}:${VPS_PATH}/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload script" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Script uploaded successfully" -ForegroundColor Green
Write-Host ""

# Execute monitoring script on VPS
Write-Host "🚀 Starting remote monitoring..." -ForegroundColor Yellow
Write-Host "   (This will wait until $ScheduleTime + 5 minutes)" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to cancel" -ForegroundColor Gray
Write-Host ""

ssh root@$VPS_IP "cd $VPS_PATH && node monitor-schedule-test.js $ScheduleTime"

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "✅ Monitoring completed" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
