# Monitor Stream Logs - Real-time
Write-Host "=== Monitoring Stream Logs ===" -ForegroundColor Cyan
Write-Host "Watching for: Stream start, YouTube API calls, Errors" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Get current log size
$logFile = "logs/app.log"
if (Test-Path $logFile) {
    $lastSize = (Get-Item $logFile).Length
    Write-Host "Starting from current log position..." -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Log file not found!" -ForegroundColor Red
    exit
}

# Monitor loop
while ($true) {
    Start-Sleep -Seconds 1
    
    if (Test-Path $logFile) {
        $currentSize = (Get-Item $logFile).Length
        
        if ($currentSize -gt $lastSize) {
            # Read new content
            $stream = [System.IO.File]::Open($logFile, 'Open', 'Read', 'ReadWrite')
            $stream.Position = $lastSize
            $reader = New-Object System.IO.StreamReader($stream)
            $newContent = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            
            # Filter and display relevant lines
            $lines = $newContent -split "`n"
            foreach ($line in $lines) {
                if ($line -match "stream|youtube|broadcast|API|ERROR|Failed|ffmpeg|RTMP") {
                    $timestamp = Get-Date -Format "HH:mm:ss"
                    
                    # Color code based on content
                    if ($line -match "ERROR|Failed|error") {
                        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
                        Write-Host $line -ForegroundColor Red
                    }
                    elseif ($line -match "Starting stream|POST /api/stream") {
                        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
                        Write-Host $line -ForegroundColor Green
                    }
                    elseif ($line -match "youtube|broadcast|liveBroadcast") {
                        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
                        Write-Host $line -ForegroundColor Cyan
                    }
                    else {
                        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
                        Write-Host $line -ForegroundColor White
                    }
                }
            }
            
            $lastSize = $currentSize
        }
    }
}
