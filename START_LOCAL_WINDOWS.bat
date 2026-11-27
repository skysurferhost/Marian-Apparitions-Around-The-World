@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (py -3 start_local.py --main) else (python start_local.py --main)
if errorlevel 1 pause
