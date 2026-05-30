@echo off
echo ═══════════════════════════════════════
echo   AI Client Hunter — PDF Generator
echo ═══════════════════════════════════════
echo.

cd /d "%~dp0"

echo [1/3] Installing puppeteer-core if needed...
call npm install puppeteer-core --no-save
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install puppeteer-core.
    echo    Try running: npm install puppeteer-core
    pause
    exit /b 1
)
echo ✓ puppeteer-core ready
echo.

echo [2/3] Generating PDFs...
node generate-pdfs.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ PDF generation failed.
    echo.
    echo    Alternative: Open each .html file in Chrome browser,
    echo    then press Ctrl+P and select "Save as PDF".
    pause
    exit /b 1
)
echo.

echo [3/3] Complete!
echo.
echo ✅ All PDFs generated in the docs/ folder:
echo    - technical-deep-dive.pdf
echo    - product-overview-guide.pdf
echo    - ai-financial-success-guide.pdf
echo.
pause
