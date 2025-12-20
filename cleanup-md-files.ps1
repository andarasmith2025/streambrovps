# Cleanup unnecessary .md files
# Keep only essential documentation

Write-Host "=== Cleaning up .md documentation files ===" -ForegroundColor Cyan
Write-Host ""

# Files to KEEP (essential documentation)
$keepFiles = @(
    "README.md",
    "INSTALLATION_GUIDE.md",
    "DEPLOYMENT.md",
    "YOUTUBE_API_SETUP_GUIDE.md",
    "SSL_SETUP_GUIDE.md",
    "LICENSE.md",
    "CHANGELOG.md",
    "USER_MANAGEMENT.md"
)

# Get all .md files
$allMdFiles = Get-ChildItem -Path . -Filter "*.md" | Select-Object -ExpandProperty Name

# Files to delete
$filesToDelete = $allMdFiles | Where-Object { $keepFiles -notcontains $_ }

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
