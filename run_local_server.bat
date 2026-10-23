@echo off
setlocal
cd /d "%~dp0"

echo Starting local server from:
echo %CD%
echo.

py -3 --version >nul 2>&1
if not errorlevel 1 goto USE_PY

python --version >nul 2>&1
if not errorlevel 1 goto USE_PYTHON

echo ERROR: Python was not found on this PC.
echo Install Python 3 and make sure "Add Python to PATH" is enabled,
echo or open this folder in a terminal after Python is installed.
echo.
pause
exit /b 1

:USE_PY
echo Open this address in your browser:
echo http://localhost:8000/?matrix=TEST_01
py -3 -m http.server 8000
goto END

:USE_PYTHON
echo Open this address in your browser:
echo http://localhost:8000/?matrix=TEST_01
python -m http.server 8000

:END
echo.
echo The server stopped.
pause
