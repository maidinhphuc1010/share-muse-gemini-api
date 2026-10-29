@echo off
setlocal
chcp 65001 >nul
title AutoVideo - Start all (no Docker)

set "ROOT=%~dp0"
set "GEMINI_DIR=%ROOT%Back\gemini2api"
set "MUSE_DIR=%ROOT%Back\muse2api"
set "FE_DIR=%ROOT%videoauto"
set "FE_URL=http://localhost:5173"

echo ========================================
echo   Starting AutoVideo services
echo ========================================
echo adminkeyMuse: m2a-admindeptrai7777777
echo adminkeyGemini: sk-admindeptrai7777777
echo ========================================

call :ensure_node
if errorlevel 1 goto :failed
call :ensure_env "%GEMINI_DIR%"
if errorlevel 1 goto :failed
call :ensure_env "%MUSE_DIR%"
if errorlevel 1 goto :failed
call :ensure_python_env "%GEMINI_DIR%" "python.exe" "gemini2api"
if errorlevel 1 goto :failed
call :ensure_python_env "%MUSE_DIR%" "muse2api.exe" "muse2api"
if errorlevel 1 goto :failed
call :ensure_frontend_deps
if errorlevel 1 goto :failed

call :start_gemini
if errorlevel 1 goto :failed
call :start_muse
if errorlevel 1 goto :failed
call :start_frontend
if errorlevel 1 goto :failed

start "" "%FE_URL%"
echo [OK] Startup commands were sent successfully.
echo [OK] Services are running directly in hidden background processes; Docker is not required.
echo [INFO] Logs: Back\gemini2api\gemini2api.*.log, Back\muse2api\muse2api.*.log, videoauto\vite.log
exit /b 0

:start_gemini
call :port_in_use 5918
if not errorlevel 1 (
    echo [INFO] gemini2api is already listening on port 5918; skipping.
    exit /b 0
)
echo [INFO] Starting gemini2api in background on port 5918...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c','""%GEMINI_DIR%\.venv\Scripts\python.exe"" -m uvicorn app.main:app --host 0.0.0.0 --port 5918 1> gemini2api.stdout.log 2> gemini2api.stderr.log' -WorkingDirectory '%GEMINI_DIR%' -WindowStyle Hidden"
exit /b 0

:start_muse
call :port_in_use 18610
if not errorlevel 1 (
    echo [INFO] muse2api is already listening on port 18610; skipping.
    exit /b 0
)
echo [INFO] Starting muse2api in background on port 18610...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c','""%MUSE_DIR%\.venv\Scripts\muse2api.exe"" 1> muse2api.stdout.log 2> muse2api.stderr.log' -WorkingDirectory '%MUSE_DIR%' -WindowStyle Hidden"
exit /b 0

:start_frontend
call :port_in_use 5173
if not errorlevel 1 (
    echo [INFO] Frontend is already listening on port 5173; skipping.
    exit /b 0
)
echo [INFO] Starting frontend in background on port 5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c','npm run dev -- --host 0.0.0.0 1> vite.log 2>&1' -WorkingDirectory '%FE_DIR%' -WindowStyle Hidden"
exit /b 0

:port_in_use
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-NetTCPConnection -State Listen -LocalPort %~1 -ErrorAction SilentlyContinue; if ($c) { exit 0 } else { exit 1 }" >nul 2>&1
exit /b %errorlevel%

:wait_for_url
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0; $i -lt %~2; $i++){ try { $r=Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){$ready=$true; break} } catch {}; Start-Sleep -Seconds 1 }; if($ready){exit 0}else{exit 1}"
exit /b %errorlevel%

:ensure_python_env
if exist "%~1\.venv\Scripts\%~2" exit /b 0
echo [ERROR] %~3 virtual environment is missing: "%~1\.venv\Scripts\%~2"
echo [ERROR] Install Python dependencies for this backend before running start-all.bat.
exit /b 1

:ensure_node
where npm >nul 2>&1
if not errorlevel 1 exit /b 0
echo [ERROR] Node.js LTS is required for the frontend. Install it from https://nodejs.org/ then rerun.
exit /b 1

:ensure_env
if exist "%~1\.env" exit /b 0
if not exist "%~1\.env.example" (
    echo [ERROR] No .env or .env.example in "%~1".
    exit /b 1
)
echo [INFO] Creating .env from .env.example in "%~1"...
copy /Y "%~1\.env.example" "%~1\.env" >nul
if errorlevel 1 exit /b 1
if "%~1"=="%GEMINI_DIR%" echo [WARN] Set real Gemini cookies in "%~1\.env" before use.
exit /b 0

:ensure_frontend_deps
if exist "%FE_DIR%\node_modules\.bin\vite.cmd" exit /b 0
echo [INFO] Frontend dependencies missing. Installing...
pushd "%FE_DIR%"
if exist package-lock.json (call npm ci) else (call npm install)
if errorlevel 1 (
    popd
    echo [ERROR] Frontend dependency installation failed.
    exit /b 1
)
popd
exit /b 0

:failed
echo.
echo [ERROR] Startup did not complete. Resolve the message above and rerun start-all.bat.
exit /b 1

