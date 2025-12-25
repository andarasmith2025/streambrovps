#!/bin/bash

# Deploy script for StreamBro VPS
# Usage: bash deploy-vps.sh

echo "🚀 Deploying StreamBro to VPS..."
echo ""

# VPS details
VPS_HOST="94.237.3.164"
VPS_USER="root"
VPS_PATH="/root/streambrovps"

echo "📡 Connecting to VPS: $VPS_USER@$VPS_HOST"
echo ""

# SSH and execute commands
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
echo "📂 Navigating to project directory..."
cd /root/streambrovps

echo "📥 Pulling latest changes from Git..."
git pull origin main

echo "📦 Installing dependencies (if any)..."
npm install --production

echo "🔄 Restarting PM2 process..."
pm2 restart streambro

echo "✅ Deployment complete!"
echo ""
echo "📊 Checking status..."
pm2 status streambro

echo ""
echo "📝 Recent logs:"
pm2 logs streambro --lines 20 --nostream

echo ""
echo "🎉 StreamBro deployed successfully!"
echo "🌐 Access at: http://94.237.3.164:7575"
ENDSSH

echo ""
echo "✅ Deployment script finished!"
