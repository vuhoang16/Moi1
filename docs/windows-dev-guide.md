# Windows Local Development Guide

This guide provides the exact steps needed to get the entire RentApp stack up and running on a Windows machine. Since this is a full-stack monorepo, you need the database, the backend API, and the mobile app running simultaneously.

## Prerequisites
Before starting, ensure you have the following open and running on your Windows machine:
1. **Docker Desktop** (Required for the database)
2. **Android Studio** (Required for the emulator)

---

## Step-by-Step Startup Sequence

### 1. Start the Database
The app uses a PostgreSQL database managed by Docker.
Open a terminal at the root of the project (`D:\Claude\Moi1`) and run:
```powershell
docker compose up -d
```
> Note: This command runs the database in the background. You can verify it is running by typing `docker ps`.

### 2. Start the Backend API (NestJS)
The mobile app needs the API to fetch and save data. In a **new terminal tab**, run:
```powershell
pnpm --filter @rentapp/api dev
```
> Tip: Keep this terminal open. The API will run on `http://localhost:3000` and automatically restart if you or the agent changes any backend code.

### 3. Open the Android Emulator
Before starting the mobile app, you need to turn on your virtual machine.
1. Open **Android Studio**.
2. Go to **Device Manager** (usually on the right sidebar).
3. Click the **Play button** next to your emulator (e.g., Pixel 9 Pro XL) to launch it.

### 4. Start the Mobile App (Expo)
Once the emulator is fully booted up, open a **third terminal tab** and run:
```powershell
pnpm --filter @rentapp/mobile start --android
```
> Important: The `--android` flag tells Expo to automatically open the Expo Go app inside your running emulator. The Metro bundler runs on `http://localhost:8081`.

---

## 🤖 Cheat Sheet for AI Agents
If you are asking an AI agent to help you develop, the agent can use these commands to manage the environment for you via PowerShell:

**Kill stuck ports (e.g., if Expo won't start):**
```powershell
$portId = (Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue).OwningProcess; if ($portId) { Stop-Process -Id $portId -Force }
```

**Restart the App on Emulator via ADB:**
```powershell
$env:ANDROID_HOME = "C:\Users\guest1\AppData\Local\Android\Sdk"; & "$env:ANDROID_HOME\platform-tools\adb.exe" shell "am force-stop host.exp.exponent"; Start-Sleep -Seconds 2; & "$env:ANDROID_HOME\platform-tools\adb.exe" shell "am start -n host.exp.exponent/.experience.HomeActivity -d exp://10.0.2.2:8081"
```

**Run Database Migrations (Prisma):**
```powershell
pnpm --filter @rentapp/api prisma db push
```
