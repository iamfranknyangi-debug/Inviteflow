@echo off
title InviteFlow - Starting...
color 0A

echo.
echo  ==============================================
echo    InviteFlow - Digital Invitation System
echo  ==============================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  ERROR: Docker is not installed!
    echo.
    echo  Please install Docker Desktop from:
    echo  https://www.docker.com/products/docker-desktop/
    echo.
    echo  After installing, restart your computer
    echo  and run this file again.
    echo.
    pause
    exit /b 1
)

REM Check if Docker is running
docker ps >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    color 0E
    echo  Docker is installed but not running.
    echo  Please open Docker Desktop and wait for it
    echo  to fully start, then run this file again.
    echo.
    pause
    exit /b 1
)

echo  [1/3] Docker is ready!
echo.
echo  [2/3] Starting InviteFlow...
echo        (First time may take 3-5 minutes to build)
echo.

docker-compose up --build -d

IF %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  Something went wrong! Check the error above.
    echo  Try running: docker-compose logs
    pause
    exit /b 1
)

echo.
echo  [3/3] Waiting for system to be ready...
timeout /t 15 /nobreak >nul

echo.
echo  ==============================================
echo.
echo    InviteFlow is RUNNING!
echo.
echo    Open your browser and go to:
echo    http://localhost:3000
echo.
echo    Login with:
echo    Username:  admin
echo    Password:  admin123
echo.
echo  ==============================================
echo.

REM Open browser automatically
start "" "http://localhost:3000"

echo  Press any key to view logs, or close this window.
echo  (The system keeps running even if you close this)
echo.
pause

docker-compose logs --tail=50 -f
