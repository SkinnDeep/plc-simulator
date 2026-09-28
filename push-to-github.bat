@echo off
color 0B
title GitHub Auto-Pusher
echo ========================================================
echo   RSLogix 500 PLC Simulator - GitHub Auto-Pusher
echo ========================================================
echo.

echo [1/3] Adding all changed files...
git add .

echo.
set /p msg="Enter a short description of what you changed (or just press ENTER for default): "
if "%msg%"=="" set msg=Auto-commit: User updates from local simulator

echo.
echo [2/3] Committing changes...
git commit -m "%msg%"

echo.
echo [3/3] Pushing to GitHub...
git push

echo.
echo ========================================================
echo   Done! All your updates have been pushed successfully.
echo ========================================================
echo.
pause
