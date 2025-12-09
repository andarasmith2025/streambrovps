@echo off
echo Starting StreamBro Server...
echo.
echo Server will run in background.
echo Close this window will NOT stop the server.
echo.
echo To stop the server, run: npm run stop
echo.

start /B node app.js

echo.
echo Server started! You can close this window now.
echo Access the app at: http://localhost:3000
pause
