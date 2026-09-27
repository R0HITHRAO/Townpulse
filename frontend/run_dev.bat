@echo off
rem Add Node.js to PATH if not already present
set "PATH=%PATH%;C:\Program Files\nodejs"
rem Run the development server via PowerShell without loading profile
powershell -NoProfile -ExecutionPolicy Bypass -Command "npm run dev"
