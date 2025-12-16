# StreamBro - Quick Deploy to VPS
# Run this script to deploy latest changes to VPS

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "StreamBro - Deploy to VPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# VPS Configuration
$VPS_IP = "94.237.3.164"
$VPS_USER = "root"
$VPS_PATH = "/root/streambrovps"

Write-Host "Deploying to: $VPS_USER@$VPS_IP" -ForegroundColor Yellow
Write-Host ""

# SSH Command
$sshCommand = @"
cd $VPS_PATH && \
git pull origin main && \
pm2 restart streambro && \
echo '' && \
echo '✅ Deploy completed!' && \
echo '' && \
pm2 status
"@

Write-Host "Connecting to VPS..." -ForegroundColor Green
ssh "$VPS_USER@$VPS_IP" $sshCommand

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy finished!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access: https://streambro.nivarastudio.site" -ForegroundColor Yellow
Write-Host ""
