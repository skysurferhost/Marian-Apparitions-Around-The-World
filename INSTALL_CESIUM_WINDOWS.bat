@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (py -3 install_cesium.py %*) else (python install_cesium.py %*)
if errorlevel 1 (
  echo Installation failed. Download the official release from https://cesium.com/downloads/ and drag the release ZIP onto this BAT file.
  pause
  exit /b 1
)
echo Installation complete. Start START_LOCAL_WINDOWS.bat, then select Cesium 3D Beta.
pause
