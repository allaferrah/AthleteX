@echo off
set "NODE_PATH=C:\Users\shadj\nodejs\node-v20.18.0-win-x64"
set "PATH=%NODE_PATH%;%PATH%"

:: Kill old processes on ports 5000 and 3000
for /f "tokens=5" %%a in ('netstat -ano ^| find ":5000" ^| find "LISTENING"') do taskkill /pid %%a /f >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3000" ^| find "LISTENING"') do taskkill /pid %%a /f >nul 2>&1

:: Start backend in new window
start "NutriAI Backend" cmd /c "cd /d D:\salah\nutriai\backend && node_modules\.bin\nodemon.cmd src\app.js"

:: Wait a moment, then start frontend
timeout /t 3 /nobreak >nul
start "NutriAI Frontend" cmd /c "cd /d D:\salah\nutriai\frontend && node_modules\.bin\next.cmd dev"

echo.
echo ========================================
echo   NutriAI started!
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:3000
echo ========================================
echo.

:: Open browser
start http://localhost:3000
