@echo off
echo ========================================
echo Monitoring WidiWays Game Schedule
echo Start: 23:32 WIB
echo End: 23:52 WIB (20 min)
echo ========================================
echo.

ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "tail -f /root/streambrovps/logs/pm2-out.log | grep -E '(WidiWays|Broadcast|23:3|Stream.*live|Duration Check.*23:)'"
