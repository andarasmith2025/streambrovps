@echo off
echo ========================================
echo MONITORING TEST SCHEDULE
echo ========================================
echo.
echo Sekarang jam: 
ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "date '+%%H:%%M:%%S WIB'"
echo.
echo Monitoring PM2 logs untuk broadcast creation...
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.

ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 logs streambro --lines 100"
