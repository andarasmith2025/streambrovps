#!/bin/bash
# Monitor script untuk test schedule
# Usage: ./monitor-test-schedule.sh

echo "=========================================="
echo "Monitoring Test Schedule"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

while true; do
    clear
    echo "=========================================="
    echo "Test Schedule Monitor - $(date '+%H:%M:%S')"
    echo "=========================================="
    echo ""
    
    # 1. Check live streams
    echo "1. LIVE STREAMS:"
    echo "---"
    LIVE_COUNT=$(sqlite3 /root/streambrovps/streambro.db "SELECT COUNT(*) FROM streams WHERE status = 'live';")
    if [ "$LIVE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}Found $LIVE_COUNT live stream(s)${NC}"
        sqlite3 /root/streambrovps/streambro.db "SELECT '  ' || title || ' (ID: ' || substr(id, 1, 8) || '...)' FROM streams WHERE status = 'live';"
    else
        echo -e "${YELLOW}No live streams${NC}"
    fi
    echo ""
    
    # 2. Check PM2 status
    echo "2. PM2 STATUS:"
    echo "---"
    PM2_STATUS=$(pm2 jlist | jq -r '.[0] | "  Status: \(.pm2_env.status)  |  Uptime: \(.pm2_env.pm_uptime_format)  |  Restarts: \(.pm2_env.restart_time)"')
    echo "$PM2_STATUS"
    echo ""
    
    # 3. Check FFmpeg processes
    echo "3. FFMPEG PROCESSES:"
    echo "---"
    FFMPEG_COUNT=$(ps aux | grep -c "[f]fmpeg")
    if [ "$FFMPEG_COUNT" -gt 0 ]; then
        echo -e "${GREEN}$FFMPEG_COUNT FFmpeg process(es) running${NC}"
    else
        echo -e "${YELLOW}No FFmpeg processes${NC}"
    fi
    echo ""
    
    # 4. Latest logs (last 5 lines)
    echo "4. LATEST LOGS:"
    echo "---"
    tail -5 /root/streambrovps/logs/pm2-out.log | sed 's/^/  /'
    echo ""
    
    echo "=========================================="
    echo "Press Ctrl+C to stop monitoring"
    echo "Refreshing in 5 seconds..."
    echo "=========================================="
    
    sleep 5
done
