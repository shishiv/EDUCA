# Production Readiness Audit - Quickstart Guide

**Date**: 2025-09-14
**Version**: 1.0
**Prerequisites**: Access to SRE repository, Claude Code with MCP capabilities

## Quick Start Overview

This guide helps you rapidly execute the production readiness audit for the SRE Educational Management System, focusing on mockup elimination and MCP integration setup.

## 🚀 1-Minute Setup

```bash
# Navigate to project root
cd /c/repos/SRE

# Ensure on correct branch
git checkout 002-production-readiness-audit

# Verify Specify framework is available
ls .specify/scripts/bash/
```

## 🔍 Phase 1: Rapid Mockup Detection (5 minutes)

### Quick Scan Commands

```bash
# Search for common mockup patterns
grep -r "mock\|fake\|dummy\|placeholder\|TODO\|FIXME" gestao_fronteira/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | head -20

# Find hardcoded test data
grep -r "test@\|example@\|demo@\|admin@test" gestao_fronteira/ --include="*.ts" --include="*.tsx"

# Check for placeholder text
grep -r "Lorem ipsum\|placeholder\|Coming soon\|Under construction" gestao_fronteira/ --include="*.ts" --include="*.tsx"

# Find test user data
grep -r "123\.456\.789\|000\.000\.000\|12345678900" gestao_fronteira/ --include="*.ts" --include="*.tsx"
```

### Expected Output Analysis
- **Green**: No results = No obvious mockups
- **Yellow**: 1-5 results = Minor cleanup needed
- **Red**: 5+ results = Significant mockup presence

## ⚙️ Phase 2: MCP Integration Setup (10 minutes)

### Supabase MCP Configuration

```bash
# Check if Supabase MCP is available
# (Run this in Claude Code)
# Check available MCP tools for Supabase
```

Add to CLAUDE.md:
```markdown
## MCP Integrations

### Supabase MCP
- Use `mcp__supabase__*` tools for database operations
- Schema inspection: `mcp__supabase__list_tables`
- Migration management: `mcp__supabase__apply_migration`
- Type generation: `mcp__supabase__generate_typescript_types`

### shadcn/ui MCP
- Use `mcp__shadcn-ui__*` tools for component access
- Component catalog: `mcp__shadcn-ui__list_components`
- Component source: `mcp__shadcn-ui__get_component`
- Demo code: `mcp__shadcn-ui__get_component_demo`

### Playwright MCP
- Use `mcp__playwright__*` tools for browser automation
- Page navigation: `mcp__playwright__browser_navigate`
- Element interaction: `mcp__playwright__browser_click`
- Screenshot capture: `mcp__playwright__browser_take_screenshot`
```

## 🎯 Phase 3: Priority Project Audit (15 minutes)

### gestao_fronteira Quick Assessment

```bash
cd gestao_fronteira/

# Check package.json for dependencies
cat package.json | jq '.dependencies, .devDependencies'

# Verify database migration status
ls -la supabase/migrations/

# Check component structure
find app/ -name "*.tsx" | head -10
find components/ -name "*.tsx" | head -10

# Look for environment configuration
ls -la .env*
```

### Quick Health Check
```bash
# Try to start the development server (timeout after 30s)
timeout 30s npm run dev

# Check if build works
timeout 60s npm run build
```

## 🔍 Phase 4: Critical Mockup Identification (10 minutes)

### High-Priority Areas to Check

1. **Authentication Components**
   ```bash
   find . -name "*auth*" -o -name "*login*" | xargs grep -l "mock\|test\|demo"
   ```

2. **Student Data Components**
   ```bash
   find . -name "*student*" -o -name "*aluno*" | xargs grep -l "placeholder\|example"
   ```

3. **Attendance Components**
   ```bash
   find . -name "*attendance*" -o -name "*frequencia*" | xargs grep -l "fake\|dummy"
   ```

4. **User Management**
   ```bash
   find . -name "*user*" -o -name "*usuario*" | xargs grep -l "test@\|admin@"
   ```

### Document Findings

Create quick inventory:
```bash
# Create findings file
echo "# Mockup Inventory - $(date)" > audit-findings.md
echo "" >> audit-findings.md

# Add each finding with:
# - File path
# - Mockup type
# - Severity level
# - Line number
```

## 🚨 Phase 5: Production Blockers (5 minutes)

### Critical Issues to Check

1. **Security Blockers**
   - Hardcoded credentials
   - Test API keys
   - Disabled authentication

2. **Data Integrity Blockers**
   - Hardcoded CPF numbers
   - Test student records
   - Fake school data

3. **Compliance Blockers**
   - Missing RLS policies
   - Unencrypted sensitive data
   - Missing audit trails

### Quick Validation Commands

```bash
# Check for hardcoded secrets
grep -r "supabase_key\|api_key\|secret\|password" --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "process.env"

# Check for test CPF patterns
grep -r "123\.456\.789\|000\.000\.000\|111\.111\.111" --include="*.ts" --include="*.tsx"

# Verify RLS is mentioned in schema
grep -i "RLS\|row level security" supabase/migrations/*.sql
```

## 📊 Completion Checklist

### Quick Wins (< 30 minutes)
- [ ] Mockup inventory created
- [ ] MCP integrations documented
- [ ] Critical production blockers identified
- [ ] gestao_fronteira health verified

### Priority Actions (< 2 hours)
- [ ] Replace critical mockups in gestao_fronteira
- [ ] Configure Supabase MCP integration
- [ ] Test key user workflows
- [ ] Validate Brazilian compliance features

### Production Ready (< 1 day)
- [ ] All mockups eliminated
- [ ] Full MCP integration functional
- [ ] Security audit passed
- [ ] Performance benchmarks met

## 🛠️ Tools and Commands Summary

### Essential Commands
```bash
# Quick mockup scan
grep -r "mock\|fake\|test@\|placeholder" gestao_fronteira/ --include="*.ts*"

# Environment check
cd gestao_fronteira && npm run typecheck && npm run lint

# Database check (with MCP)
# Use Claude Code: mcp__supabase__list_tables

# Component check (with MCP)
# Use Claude Code: mcp__shadcn-ui__list_components
```

### Recovery Commands
```bash
# If something breaks
git status
git diff
git checkout -- . # (if needed)

# Reset to clean state
cd gestao_fronteira && npm install && npm run dev
```

## 📈 Success Metrics

- **Mockup Count**: Target = 0 critical, < 5 total
- **Build Status**: Clean build with no errors
- **TypeScript**: No type errors
- **Tests**: All existing tests pass
- **MCP Health**: All 3 MCPs responding

## 🆘 Troubleshooting

### Common Issues
1. **Build Failures**: Check dependencies with `npm install`
2. **Type Errors**: Run `npm run typecheck` for details
3. **MCP Errors**: Verify Claude Code MCP configuration
4. **Database Issues**: Check Supabase connection status

### Get Help
- Review `CLAUDE.md` for project context
- Check `.specify/memory/constitution.md` for principles
- Use MCP tools for real-time assistance

**Estimated Total Time**: 45 minutes for complete audit setup and initial findings