$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $root '_gods-eye-view-native'
Write-Host 'Sky Surfer: setting up the ORIGINAL God''s Eye View' -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 24.22.1+ is required. Install Node.js 24 LTS and reopen this script.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm is required with Node.js.' }
$version = (& node -p 'process.versions.node').Trim()
$parts = @($version.Split('.') | ForEach-Object { [int]$_ })
if ($parts[0] -lt 24 -or $parts[0] -eq 25) { throw "God's Eye View requires supported Node.js 24 or 26. You have $version." }
if ($parts[0] -eq 24 -and ($parts[1] -lt 22 -or ($parts[1] -eq 22 -and $parts[2] -lt 1))) { throw "Update Node.js 24 to 24.22.1 or later. You have $version." }
$py = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } elseif (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { throw 'Python 3 is required by the Sky Surfer local web server and bridge.' }
if (-not (Test-Path (Join-Path $source 'src\main.js'))) {
  if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host 'Downloading original MIT source from github.com/bilawalsidhu/gods-eye-view ...'
    & git clone --depth 1 https://github.com/bilawalsidhu/gods-eye-view.git $source
    if ($LASTEXITCODE -ne 0) { throw 'Git clone failed. Check your internet connection or GitHub access.' }
  } else {
    Write-Host 'Downloading source ZIP from GitHub (Git not installed)...'
    $zip = Join-Path $env:TEMP 'sky-surfer-original-gev.zip'
    $temp = Join-Path $env:TEMP 'sky-surfer-gev-source-extract'
    Invoke-WebRequest -Uri 'https://github.com/bilawalsidhu/gods-eye-view/archive/refs/heads/main.zip' -OutFile $zip
    if (Test-Path $temp) { Remove-Item $temp -Force -Recurse }
    Expand-Archive -Path $zip -DestinationPath $temp -Force
    $unpacked = Join-Path $temp 'gods-eye-view-main'
    if (-not (Test-Path $unpacked)) { throw 'GitHub ZIP extraction failed.' }
    Move-Item -Path $unpacked -Destination $source
    Remove-Item $zip -Force
  }
}
if (-not (Test-Path (Join-Path $source 'package-lock.json'))) { throw 'Original application package-lock.json was not found.' }
Write-Host 'Installing dependencies from the original God''s Eye View package lock...'
Push-Location $source
try {
  if (-not (Test-Path 'node_modules')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Recheck Node.js version/network access.' }
  }
} finally { Pop-Location }
Write-Host 'Installing the Sky Surfer Marian marker and camera bridge...'
$patch = Join-Path $PSScriptRoot 'patch_gev.py'
if ($py -eq 'py') { & py -3 $patch $source } else { & python $patch $source }
if ($LASTEXITCODE -ne 0) { throw 'Native bridge patch failed. The original repository may have changed.' }
Write-Host 'Starting original God''s Eye View on 127.0.0.1:4173 ...'
$gevCmd = 'cd /d "' + $source + '" && npm.cmd run dev -- --host 127.0.0.1 --port 4173'
Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $gevCmd) -WorkingDirectory $source
Write-Host 'Starting Sky Surfer on 127.0.0.1:8765 ...'
$skyCmd = 'cd /d "' + $root + '" && ' + $(if($py -eq 'py'){'py -3'}else{'python'}) + ' -m http.server 8765 --bind 127.0.0.1'
Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $skyCmd) -WorkingDirectory $root
Start-Process 'http://127.0.0.1:8765/index.html'
Write-Host 'Open the God''s Eye View NATIVE tab in Sky Surfer. If the app is still starting, choose RECONNECT.' -ForegroundColor Green
