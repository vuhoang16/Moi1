# ─── Expo Auto-Start Script ───────────────────────────────────────────────────
$tokenFile = "$PSScriptRoot\token.txt.txt"
$env:EXPO_TOKEN = (Get-Content $tokenFile -Raw).Trim()

Write-Host "Logging into Expo..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\apps\mobile"
npx expo start --tunnel
