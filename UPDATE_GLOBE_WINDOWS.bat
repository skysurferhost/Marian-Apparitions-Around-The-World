@echo off
setlocal
cd /d "%~dp0"
echo Updating Sky Surfer satellite map from google-my-maps.kml...
where py >nul 2>nul
if %errorlevel%==0 (
  set "PY=py -3"
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    set "PY=python"
  ) else (
    echo Python 3 is required to update local locations.
    echo Install from python.org or publish updated KML through GitHub Actions.
    pause
    exit /b 1
  )
)
%PY% -m pip install --quiet pymupdf pillow
%PY% update_locations.py
if errorlevel 1 (
  echo Update failed. Check the error above.
) else (
  echo Updated! Open index.html again to see your locations.
)
pause
