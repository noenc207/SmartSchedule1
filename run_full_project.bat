@echo off
chcp 65001 >nul
title SmartSchedule - Run Full Project
echo ==========================================================
echo   SMARTSCHEDULE - KHOI DONG TOAN BO DU AN
echo ==========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0run_full_project.ps1"
pause
