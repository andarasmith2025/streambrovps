@echo off
echo ========================================
echo Deploying Broadcast Duplication Fix
echo ========================================
echo.

echo Uploading streamingService.js...
scp services/streamingService.js root@85.9.195.103:/root/streambrovps/services/
if %errorlevel% neq 0 (
    echo ERROR: Failed to upload file
    pause
    exit /b 1
)

echo.
echo File uploaded successfully!
echo.
echo Restarting PM2...
ssh root@85.9.195.103 "cd /root/streambrovps && pm2 restart streambro"
if %errorlevel% neq 0 (
    echo ERROR: Failed to restart PM2
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create a new schedule for testing
echo 2. Monitor logs: ssh root@85.9.195.103 "pm2 logs streambro --lines 50"
echo 3. Check that only 1 broadcast is created
echo.
pause
