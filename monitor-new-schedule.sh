#!/bin/bash

echo "=========================================="
echo "MONITORING NEW SCHEDULE TEST"
echo "=========================================="
echo ""
echo "Waiting for new schedule to be created..."
echo "Press Ctrl+C to stop monitoring"
echo ""

# Monitor PM2 logs in real-time
ssh -i ~/.ssh/id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && pm2 logs streambro --lines 50"
