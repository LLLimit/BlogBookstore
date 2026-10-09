@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
if not exist "node_modules\vite\bin\vite.js" (
  echo Please run pnpm install in this folder first.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8795/ in your browser. Press Ctrl+C to stop.
node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 8795 --strictPort
