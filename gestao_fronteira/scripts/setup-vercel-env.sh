#!/bin/bash

# Vercel Environment Variables Setup Script
# Sistema de Gestão Escolar - Fronteira/MG

set -e

echo "🔐 Setting up Vercel Environment Variables..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Environment variables
SUPABASE_URL="https://wxvxlybwpvpenqveycon.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnhseWJ3cHZwZW5xdmV5Y29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI4ODUsImV4cCI6MjA3MzA5ODg4NX0.7XHUFE98qFeWKfA_5VlioMUT2qJAr0u8qw3NdCfQaNo"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnhseWJ3cHZwZW5xdmV5Y29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUyMjg4NSwiZXhwIjoyMDczMDk4ODg1fQ.fY1Snl6cK4W15fN_YkfQ9CZeekalwGy2MHVyZd_dU8s"
NEXTAUTH_URL="https://sistema-gestao-escolar-fronteira-mg.vercel.app"
NODE_ENV="production"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Check if user is logged in
echo -e "${YELLOW}Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Vercel. Please run: vercel login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated as: $(vercel whoami)${NC}"
echo ""

# Generate NEXTAUTH_SECRET if not provided
if [ -z "$NEXTAUTH_SECRET" ]; then
    echo -e "${YELLOW}Generating NEXTAUTH_SECRET...${NC}"
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✓ Generated: ${NEXTAUTH_SECRET}${NC}"
    echo ""
fi

# Function to add environment variable
add_env_var() {
    local name=$1
    local value=$2
    local environment=$3

    echo -e "${YELLOW}Adding ${name} to ${environment}...${NC}"

    # Use echo to pipe the value to vercel env add
    echo "$value" | vercel env add "$name" "$environment" --force 2>&1 | grep -v "?" || true

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Added ${name}${NC}"
    else
        echo -e "${RED}❌ Failed to add ${name}${NC}"
    fi
}

# Add environment variables to Production
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Adding Production Environment Variables  ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

add_env_var "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL" "production"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "production"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "production"
add_env_var "NEXTAUTH_URL" "$NEXTAUTH_URL" "production"
add_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" "production"
add_env_var "NODE_ENV" "$NODE_ENV" "production"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Adding Preview Environment Variables    ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

add_env_var "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL" "preview"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "preview"
add_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" "preview"

echo ""
echo -e "${GREEN}✅ All environment variables configured!${NC}"
echo ""
echo -e "${YELLOW}📝 Summary:${NC}"
echo -e "   • NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}"
echo -e "   • NEXT_PUBLIC_SUPABASE_ANON_KEY: ✓ Set"
echo -e "   • SUPABASE_SERVICE_ROLE_KEY: ✓ Set (Production only)"
echo -e "   • NEXTAUTH_URL: ${NEXTAUTH_URL}"
echo -e "   • NEXTAUTH_SECRET: ✓ Generated"
echo -e "   • NODE_ENV: ${NODE_ENV}"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo -e "   1. Verify variables at: https://vercel.com/myke-matos-projects/sistema-gestao-escolar-fronteira-mg/settings/environment-variables"
echo -e "   2. Redeploy: ${GREEN}pnpm run deploy --yes${NC}"
echo -e "   3. Test deployment: ${GREEN}curl https://sistema-gestao-escolar-fronteira-mg.vercel.app/api/health${NC}"
echo ""
