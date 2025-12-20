# Cleanup unnecessary check-*.js files
# Keep only the useful ones

Write-Host "=== Cleaning up check-*.js files ===" -ForegroundColor Cyan
Write-Host ""

# Files to KEEP (useful)
$keepFiles = @(
    "check-today-schedules.js",
    "check-all-streams.js", 
    "check-stream-types.js"
)

# Get all check-*.js files
$allCheckFiles = Get-ChildItem -Path . -Filter "check-*.js" | Select-Object -ExpandProperty Name

# Files to delete
$filesToDelete = $allCheckFiles | Where-Object { $keepFiles -notcontains $_ }

Write-Host "Files to KEEP ($($keepFiles.Count)):" -ForegroundColor Green
$keepFiles | ForEach-Object { Write-Host "  OK $_" -ForegroundColor Green }
Write-Host ""

Write-Host "Files to DELETE ($($filesToDelete.Count)):" -ForegroundColor Yellow
$filesToDelete | ForEach-Object { Write-Host "  X $_" -ForegroundColor Yellow }
Write-Host ""

$confirm = Read-Host "Delete these files? (y/n)"

if ($confirm -eq 'y') {
    foreach ($file in $filesToDelete) {
        Remove-Item $file -Force
        Write-Host "Deleted: $file" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "OK Cleanup complete!" -ForegroundColor Green
    Write-Host "Kept $($keepFiles.Count) files, deleted $($filesToDelete.Count) files" -ForegroundColor Cyan
} else {
    Write-Host "Cleanup cancelled" -ForegroundColor Yellow
}
