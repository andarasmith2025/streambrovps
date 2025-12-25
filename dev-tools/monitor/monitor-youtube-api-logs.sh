#!/bin/bash

# Monitor YouTube API Logs
# Script untuk monitoring log real-time dan filter hanya yang terkait YouTube API calls

echo "=========================================="
echo "YouTube API Logs Monitor"
echo "=========================================="
echo ""
echo "Monitoring for:"
echo "  - CREATE STREAM logs"
echo "  - YouTube broadcast creation"
echo "  - setAudience() calls"
echo "  - setThumbnail() calls"
echo "  - Auto Start/End settings"
echo ""
echo "Press Ctrl+C to stop"
echo "=========================================="
echo ""

# Monitor PM2 logs and filter for YouTube API related entries
pm2 logs streambro --lines 100 --raw | grep -E "\[CREATE STREAM\]|\[YouTube\]|setAudience|setThumbnail|enableAutoStart|enableAutoStop|youtube_privacy|Made for Kids|Age Restricted|Thumbnail uploaded" --color=always

# If grep exits, start tailing new logs
pm2 logs streambro --raw | grep -E "\[CREATE STREAM\]|\[YouTube\]|setAudience|setThumbnail|enableAutoStart|enableAutoStop|youtube_privacy|Made for Kids|Age Restricted|Thumbnail uploaded" --color=always
