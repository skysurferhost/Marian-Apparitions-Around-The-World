@echo off
setlocal
cd /d "%~dp0"
set PORT=8765
where py >nul 2>nul
if %errorlevel%==0 goto use_py
where python >nul 2>nul
if %errorlevel%==0 goto use_python
echo Python is not installed. To run over http://localhost, install Python 3,
echo then double-click this file again. You can also open index.html directly,
echo though external map resources may be restricted under file://.
pause
exit /b 1
:use_py
start "" "http://localhost:%PORT%/index.html"
echo Sky Surfer v1.52 local server: http://localhost:%PORT%/
py -3 -m http.server %PORT% --bind 127.0.0.1
exit /b %errorlevel%
:use_python
start "" "http://localhost:%PORT%/index.html"
echo Sky Surfer v1.52 local server: http://localhost:%PORT%/
python -m http.server %PORT% --bind 127.0.0.1
exit /b %errorlevel%
