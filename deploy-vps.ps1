# Deploy script for StreamBro VPS (Windows PowerShell)
# Usage: .\deploy-vps.ps1

Write-Host "🚀 Deploying StreamBro to VPS..." -ForegroundColor Green
Write-Host ""

# VPS details
$VPS_HOST = "94.237.3.164"
$VPS_USER = "root"
$VPS_PATH = "/root/streambrovps"

Write-Host "📡 Connecting to VPS: $VPS_USER@$VPS_HOST" -ForegroundColor Cyan
Write-Host ""

# SSH commands
$commands = @"
echo '📂 Navigating to project directory...'
cd /root/streambrovps

echo '📥 Pulling latest changes from Git...'
git pull origin main

echo '📦 Installing dependencies (if any)...'
npm install --production

echo '🔄 Restarting PM2 process...'
pm2 restart streambro

echo '✅ Deployment complete!'
echo ''
echo '📊 Checking status...'
pm2 status streambro

echo ''
echo '📝 Recent logs:'
pm2 logs streambro --lines 20 --nostream

echo ''
echo '🎉 StreamBro deployed successfully!'
echo '🌐 Access at: https://streambro.nivarastudio.site'
"@

# Execute SSH command
ssh "$VPS_USER@$VPS_HOST" $commands

Write-Host ""
Write-Host "✅ Deployment script finished!" -ForegroundColor Green
