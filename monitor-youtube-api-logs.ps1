# Monitor YouTube API Logs (PowerShell)
# Script untuk monitoring log real-time dari VPS

param(
    [string]$VpsHost = "94.237.3.164",
    [string]$VpsUser = "root",
    [int]$Lines = 50
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "YouTube API Logs Monitor (VPS)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "VPS: $VpsUser@$VpsHost" -ForegroundColor Yellow
Write-Host "Monitoring for:" -ForegroundColor White
Write-Host "  - CREATE STREAM logs" -ForegroundColor Gray
Write-Host "  - YouTube broadcast creation" -ForegroundColor Gray
Write-Host "  - setAudience() calls" -ForegroundColor Gray
Write-Host "  - setThumbnail() calls" -ForegroundColor Gray
Write-Host "  - Auto Start/End settings" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# SSH command to monitor logs
$sshCommand = @"
cd /root/streambrovps && pm2 logs streambro --lines $Lines --raw | grep -E '\[CREATE STREAM\]|\[YouTube\]|setAudience|setThumbnail|enableAutoStart|enableAutoStop|youtube_privacy|Made for Kids|Age Restricted|Thumbnail uploaded|youtube_broadcast_id' --color=always
"@

# Execute SSH
ssh "$VpsUser@$VpsHost" $sshCommand

Write-Host ""
Write-Host "Monitoring stopped." -ForegroundColor Yellow
