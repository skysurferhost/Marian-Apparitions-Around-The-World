@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (py -3 start_cesium_test.py) else (python start_cesium_test.py)
if errorlevel 1 pause
