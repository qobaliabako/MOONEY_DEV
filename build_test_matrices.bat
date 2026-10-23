@echo off
cd /d "%~dp0"
python tools\build_matrices.py matrix_source\TEMPLATE_filled_preserving_format.xlsx
if errorlevel 1 (
  echo.
  echo BUILD FAILED. Read data\matrix_build_report.txt
  pause
  exit /b 1
)
echo.
echo BUILD PASSED. data\design_matrices_v2.json is ready.
pause
