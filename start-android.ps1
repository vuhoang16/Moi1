# This script automatically configures the Android SDK path and launches the app on your Android Emulator
$env:ANDROID_HOME = "C:\Users\guest1\AppData\Local\Android\Sdk"

Write-Host "Starting Expo Metro Bundler and launching on Android Emulator..." -ForegroundColor Cyan
pnpm --filter @rentapp/mobile start --android
