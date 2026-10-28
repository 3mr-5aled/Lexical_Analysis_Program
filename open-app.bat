@echo off
if exist "%~dp0dist\index.html" (
  start "" "%~dp0dist\index.html"
) else (
  start "" "%~dp0index.html"
)
