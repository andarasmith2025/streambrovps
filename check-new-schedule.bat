@echo off
echo ========================================
echo CHECKING LATEST ADMIN SCHEDULE
echo ========================================
echo.

ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && node check-admin-schedules-vps.js"

echo.
echo ========================================
echo.
pause
