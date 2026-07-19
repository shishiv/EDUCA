@echo off
REM SRE Educational Management System - Setup Script (Windows)
REM This script sets up the complete development environment

echo 🎓 SRE Educational Management System - Setup Script
echo ============================================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the gestao_fronteira directory.
    exit /b 1
)

echo [INFO] Setting up SRE Educational Management System...

REM Step 1: Install Dependencies
echo [INFO] 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
echo [SUCCESS] Dependencies installed

REM Step 2: Check Environment Configuration
echo [INFO] 🔧 Checking environment configuration...
if not exist ".env.local" (
    echo [WARNING] .env.local not found
    if exist ".env.example" (
        copy .env.example .env.local >nul
        echo [INFO] Created .env.local from .env.example
        echo [WARNING] Please update .env.local with your Supabase credentials
    ) else (
        echo [ERROR] No environment file template found
    )
) else (
    echo [SUCCESS] Environment file found
)

REM Step 3: Check Database Types
echo [INFO] 🗄️  Checking database types...
if exist "types\database.ts" (
    echo [SUCCESS] Database types found
) else (
    echo [WARNING] Database types not found
    echo [INFO] Follow ../supabase/migrations/README.md to generate them from the disposable local Supabase stack
)

REM Step 4: Setup Summary
echo.
echo [SUCCESS] Setup completed! 🎉
echo.
echo 📋 Next Steps:
echo    1. Update .env.local with your Supabase credentials
echo    2. Generate database types locally as documented in ../supabase/migrations/README.md
echo    3. Run 'npm run seed:dev' to populate development data
echo    4. Start development server with 'npm run dev'
echo.
echo 🔗 Useful Commands:
echo    npm run dev          # Start development server
echo    npm run build        # Build for production
echo    npm run lint         # Run ESLint
echo    npm run typecheck    # Check TypeScript
echo    npm run seed:dev     # Seed development data
echo.
echo 📚 Documentation:
echo    • README.md - Project overview
echo    • CLAUDE.md - Development guidelines
echo    • specs/ - Feature specifications
echo.

echo [SUCCESS] SRE Educational Management System is ready for development! 🚀
pause