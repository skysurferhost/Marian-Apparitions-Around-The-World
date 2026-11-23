@echo off
setlocal
cd /d "%~dp0"
echo Installing/launching the original Gods Eye View integration.
echo Requires a supported Node.js 24/26 version, Python 3, and internet access.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0integration\setup-native-gev.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. Read the error above or README.md for required software.
  pause
  exit /b 1
)
exit /b 0
