@echo off
chcp 65001 >nul
title SmartSchedule - Stop Full Project
powershell -ExecutionPolicy Bypass -File "%~dp0stop_full_project.ps1"
pause
