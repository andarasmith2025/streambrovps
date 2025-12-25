# Cleanup test and monitor scripts
# Keep only useful monitoring tools

Write-Host "=== Cleaning up test and monitor scripts ===" -ForegroundColor Cyan
Write-Host ""

# Files to KEEP
$keepFiles = @(
    "monitor-token-refresh.js"
)

# Get all test-*.js and monitor-*.js files
$allTestFiles = Get-ChildItem -Path . -Filter "test-*.js" | Select-Object -ExpandProperty Name
$allMonitorFiles = Get-ChildItem -Path . -Filter "monitor-*.js" | Select-Object -ExpandProperty Name
$allFiles = $allTestFiles + $allMonitorFiles

# Files to delete
$filesToDelete = $allFiles | Where-Object { $keepFiles -notcontains $_ }

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
