# PowerShell script to check and create .env.staging file

Write-Host "Checking for .env.staging file..." -ForegroundColor Yellow

if (Test-Path ".env.staging") {
    Write-Host "✓ .env.staging file exists" -ForegroundColor Green
    Write-Host "`nCurrent contents:" -ForegroundColor Cyan
    Get-Content .env.staging
    Write-Host "`nChecking REACT_APP_BACKEND_URL..." -ForegroundColor Yellow
    
    $content = Get-Content .env.staging -Raw
    if ($content -match "REACT_APP_BACKEND_URL") {
        $url = ($content | Select-String -Pattern "REACT_APP_BACKEND_URL=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
        Write-Host "Current URL: $url" -ForegroundColor $(if ($url -like "*skillshala.swapnodaya.com*") { "Red" } else { "Green" })
        
        if ($url -like "*skillshala.swapnodaya.com*") {
            Write-Host "`n⚠️  WARNING: Production URL detected in staging config!" -ForegroundColor Red
            Write-Host "This needs to be changed to the staging backend URL." -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  REACT_APP_BACKEND_URL not found in .env.staging" -ForegroundColor Red
    }
} else {
    Write-Host "✗ .env.staging file NOT FOUND" -ForegroundColor Red
    Write-Host "`nCreating .env.staging template..." -ForegroundColor Yellow
    
    $stagingEnv = @"
# Staging Environment Configuration
REACT_APP_BACKEND_URL=https://staging.api.exskilence.com/
# Add other environment variables as needed
"@
    
    $stagingEnv | Out-File -FilePath ".env.staging" -Encoding utf8
    Write-Host "✓ Created .env.staging template" -ForegroundColor Green
    Write-Host "`nPlease update REACT_APP_BACKEND_URL with the correct staging backend URL" -ForegroundColor Yellow
}
