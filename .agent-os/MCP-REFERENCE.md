# MCP Tools Reference - Sistema Gestão Educacional Fronteira

**Last Updated:** 2025-09-29
**Purpose:** Quick reference for all MCPs available in this project

---

## 🎭 Playwright MCP - Browser Automation

**Package:** `@playwright/mcp@latest`
**Use Case:** Visual testing, UI automation, screenshot capture

### Key Tools:
```typescript
// Navigation
mcp__playwright__browser_navigate(url: string)
mcp__playwright__browser_navigate_back()

// Visual Testing
mcp__playwright__browser_take_screenshot(filename?: string, fullPage?: boolean)
mcp__playwright__browser_snapshot() // Accessibility snapshot

// Interactions
mcp__playwright__browser_click(element: string, ref: string)
mcp__playwright__browser_type(element: string, ref: string, text: string)
mcp__playwright__browser_fill_form(fields: Array)

// Inspection
mcp__playwright__browser_console_messages()
mcp__playwright__browser_network_requests()

// Window Management
mcp__playwright__browser_resize(width: number, height: number)
mcp__playwright__browser_close()
```

**When to Use:**
- ✅ Screenshot responsiveness (desktop/mobile/tablet)
- ✅ Test user interactions (clicks, forms)
- ✅ Capture console messages
- ✅ Monitor network requests
- ✅ Accessibility snapshots

---

## 🔧 Chrome DevTools MCP - Deep Debugging

**Package:** `chrome-devtools-mcp@0.5.1`
**Use Case:** Performance analysis, detailed debugging, Lighthouse audits
**Published:** 2025-09-29 (10 hours ago) by Google Chrome DevTools team

### Key Features (from official docs):
```typescript
// Performance Insights
- Record performance traces
- Extract actionable insights
- Identify bottlenecks

// Network Analysis
- Inspect HTTP requests/responses
- Analyze request timing
- Check status codes

// Console Debugging
- Capture JavaScript errors
- Get stack traces
- Monitor warnings

// Screenshots & Visual
- Capture page screenshots
- Compare visual states
- Document UI state
```

### Tools (Estimated - needs verification):
```typescript
// Console
mcp__chrome_devtools__get_console_messages()
mcp__chrome_devtools__get_errors()

// Network
mcp__chrome_devtools__get_network_requests()
mcp__chrome_devtools__analyze_request(requestId: string)

// Performance
mcp__chrome_devtools__record_trace(duration?: number)
mcp__chrome_devtools__get_performance_metrics()

// Lighthouse
mcp__chrome_devtools__run_lighthouse(categories?: Array)
```

**When to Use:**
- ✅ Detect JavaScript errors invisible to Playwright
- ✅ Performance profiling and bottleneck analysis
- ✅ Lighthouse audits (Performance, Accessibility, SEO)
- ✅ Network request deep inspection
- ✅ Memory leak detection

---

## 🗄️ Supabase MCP - Database Operations

**Package:** `@supabase/mcp-server-supabase@latest`
**Project:** `wxvxlybwpvpenqveycon`

### Key Tools:
```typescript
// Schema
mcp__supabase__list_tables(schemas?: Array)
mcp__supabase__list_extensions()
mcp__supabase__list_migrations()

// Migrations
mcp__supabase__apply_migration(name: string, query: string)

// Data Operations
mcp__supabase__execute_sql(query: string)

// Type Generation
mcp__supabase__generate_typescript_types()

// Monitoring
mcp__supabase__get_logs(service: string)
mcp__supabase__get_advisors(type: "security" | "performance")

// Project Info
mcp__supabase__get_project_url()
mcp__supabase__get_anon_key()

// Edge Functions
mcp__supabase__list_edge_functions()
mcp__supabase__get_edge_function(function_slug: string)
mcp__supabase__deploy_edge_function(name: string, files: Array)

// Branching (Preview Environments)
mcp__supabase__create_branch(name: string, confirm_cost_id: string)
mcp__supabase__list_branches()
mcp__supabase__delete_branch(branch_id: string)
mcp__supabase__merge_branch(branch_id: string)
mcp__supabase__reset_branch(branch_id: string)
mcp__supabase__rebase_branch(branch_id: string)
```

**When to Use:**
- ✅ Database schema inspection
- ✅ Running migrations
- ✅ Security/performance advisors
- ✅ Debugging database queries
- ✅ Edge function deployment
- ✅ Preview environment branching

---

## 🎨 shadcn/ui MCP - Component Library

**Package:** `@jpisnice/shadcn-ui-mcp-server`

### Key Tools:
```typescript
mcp__shadcn_ui__get_component(componentName: string)
mcp__shadcn_ui__get_component_demo(componentName: string)
mcp__shadcn_ui__list_components()
mcp__shadcn_ui__get_component_metadata(componentName: string)
mcp__shadcn_ui__get_directory_structure()
mcp__shadcn_ui__get_block(blockName: string)
mcp__shadcn_ui__list_blocks(category?: string)
```

**When to Use:**
- ✅ Get component source code
- ✅ See usage examples
- ✅ Browse available UI components
- ✅ Copy blocks (dashboard, calendar, login, etc.)

---

## 📚 Context7 MCP - Library Documentation

**Package:** `@upstash/context7-mcp`

### Key Tools:
```typescript
mcp__github_com_upstash_context7_mcp__resolve_library_id(libraryName: string)
mcp__github_com_upstash_context7_mcp__get_library_docs(
  context7CompatibleLibraryID: string,
  topic?: string,
  tokens?: number
)
```

**When to Use:**
- ✅ Get up-to-date library documentation
- ✅ Search for code examples
- ✅ Understand library APIs (Next.js, React, etc.)

---

## 🔄 MCP Workflow Patterns

### Pattern 1: Complete UI/UX Validation
```
1. Playwright MCP - Visual testing
   ↓
2. Chrome DevTools MCP - Deep inspection
   ↓
3. shadcn/ui MCP - Component consistency check
   ↓
4. Document results
```

### Pattern 2: Database Development
```
1. Supabase MCP - Check advisors (security/performance)
   ↓
2. Supabase MCP - Apply migration
   ↓
3. Supabase MCP - Generate TypeScript types
   ↓
4. Test with Playwright MCP
```

### Pattern 3: Learning & Implementation
```
1. Context7 MCP - Get library documentation
   ↓
2. shadcn/ui MCP - Get component example
   ↓
3. Implement feature
   ↓
4. Playwright + Chrome DevTools MCPs - Validate
```

---

## ⚠️ MCP Best Practices

### DO:
- ✅ Use Playwright MCP + Chrome DevTools MCP together (not one or the other)
- ✅ Run Supabase advisors before production deploy
- ✅ Check shadcn/ui MCP for existing components before creating custom ones
- ✅ Use Context7 MCP for up-to-date documentation (not Google search)

### DON'T:
- ❌ Skip Chrome DevTools MCP thinking Playwright is enough
- ❌ Make database changes without running migration through Supabase MCP
- ❌ Ignore Supabase security advisors
- ❌ Forget to generate TypeScript types after schema changes

---

## 📊 MCP Usage Statistics (Track for Optimization)

| MCP | Usage Frequency | Primary Use Case |
|-----|----------------|------------------|
| Playwright | High | Every UI change |
| Chrome DevTools | High | Every UI change |
| Supabase | Medium | DB operations, advisors |
| shadcn/ui | Medium | Component development |
| Context7 | Low | Research documentation |

---

**Next Review:** After first week of MVP development (2025-10-05)
**Document Owner:** Development Team