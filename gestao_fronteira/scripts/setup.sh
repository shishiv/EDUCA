#!/bin/bash

# SRE Educational Management System - Setup Script
# This script sets up the complete development environment

set -e  # Exit on any error

echo "🎓 SRE Educational Management System - Setup Script"
echo "=" | tr '\n' ' '; printf '%.0s=' {1..60}; echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    log_error "package.json not found. Please run this script from the gestao_fronteira directory."
    exit 1
fi

log_info "Setting up SRE Educational Management System..."

# Step 1: Install Dependencies
log_info "📦 Installing dependencies..."
if command -v npm &> /dev/null; then
    npm install
    log_success "Dependencies installed with npm"
elif command -v yarn &> /dev/null; then
    yarn install
    log_success "Dependencies installed with yarn"
else
    log_error "Neither npm nor yarn found. Please install Node.js and npm."
    exit 1
fi

# Step 2: Check Environment Configuration
log_info "🔧 Checking environment configuration..."

if [[ ! -f ".env.local" ]]; then
    log_warning ".env.local not found"
    if [[ -f ".env.example" ]]; then
        cp .env.example .env.local
        log_info "Created .env.local from .env.example"
        log_warning "Please update .env.local with your Supabase credentials"
    else
        log_error "No environment file template found"
    fi
else
    log_success "Environment file found"
fi

# Step 3: Verify TypeScript Configuration
log_info "📝 Verifying TypeScript configuration..."
if npm run typecheck 2>/dev/null; then
    log_success "TypeScript configuration is valid"
else
    log_warning "TypeScript check failed - this is expected during initial setup"
fi

# Step 4: Check Database Types
log_info "🗄️  Checking database types..."
if [[ -f "types/database.ts" ]]; then
    log_success "Database types found"
else
    log_warning "Database types not found - you may need to generate them from Supabase"
    log_info "Run: supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts"
fi

# Step 5: Test Build (optional)
log_info "🏗️  Testing build configuration..."
if npm run build 2>/dev/null; then
    log_success "Build configuration is working"
else
    log_warning "Build test failed - this may be due to missing environment variables"
fi

# Step 6: Setup Summary
echo ""
log_success "Setup completed! 🎉"
echo ""
echo "📋 Next Steps:"
echo "   1. Update .env.local with your Supabase credentials"
echo "   2. Generate database types if using remote Supabase"
echo "   3. Run 'npm run seed:dev' to populate development data"
echo "   4. Start development server with 'npm run dev'"
echo ""
echo "🔗 Useful Commands:"
echo "   npm run dev          # Start development server"
echo "   npm run build        # Build for production"
echo "   npm run lint         # Run ESLint"
echo "   npm run typecheck    # Check TypeScript"
echo "   npm run seed:dev     # Seed development data"
echo ""
echo "📚 Documentation:"
echo "   • README.md - Project overview"
echo "   • CLAUDE.md - Development guidelines"
echo "   • specs/ - Feature specifications"
echo ""

log_success "SRE Educational Management System is ready for development! 🚀"