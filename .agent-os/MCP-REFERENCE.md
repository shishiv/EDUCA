# MCP Tools Reference - Sistema Gestão Educacional Fronteira

**Last Updated:** 2025-09-29
**Purpose:** Quick reference for all MCPs available in this project

---


## 🔧 Chrome DevTools MCP - Unified UI/UX Testing & Performance

**Package:** `chrome-devtools-mcp@0.6.0`
**Published:** October 2025 by Google Chrome DevTools team
**Status:** Public Preview (9k+ stars, production-ready)
**Use Case:** Complete UI/UX testing, performance profiling, debugging

### Categories & Complete Tool List (26 tools):

#### 📋 Navigation (7 tools)
```typescript
mcp__chrome_devtools__navigate_page(url: string, timeout?: number)
mcp__chrome_devtools__navigate_page_history(navigate: "back" | "forward", timeout?: number)
mcp__chrome_devtools__list_pages()
mcp__chrome_devtools__new_page(url: string, timeout?: number)
mcp__chrome_devtools__close_page(pageIdx: number)
mcp__chrome_devtools__select_page(pageIdx: number)
mcp__chrome_devtools__wait_for(text?: string, textGone?: string, time?: number, timeout?: number)
```

#### 🎯 Interactions (7 tools)
```typescript
mcp__chrome_devtools__click(uid: string, dblClick?: boolean)
mcp__chrome_devtools__fill(uid: string, value: string)
mcp__chrome_devtools__fill_form(elements: Array<{uid, value}>)
mcp__chrome_devtools__hover(uid: string)
mcp__chrome_devtools__drag(from_uid: string, to_uid: string)
mcp__chrome_devtools__upload_file(uid: string, filePath: string)
mcp__chrome_devtools__handle_dialog(action: "accept" | "dismiss", promptText?: string)
```

#### 📸 Visual Testing (2 tools)
```typescript
mcp__chrome_devtools__take_screenshot(filename?: string, fullPage?: boolean, format?: "png" | "jpeg" | "webp", quality?: number, uid?: string)
mcp__chrome_devtools__take_snapshot() // Accessibility tree + rendered HTML
```

#### 🔍 Debugging (4 tools)
```typescript
mcp__chrome_devtools__list_console_messages(onlyErrors?: boolean)
mcp__chrome_devtools__list_network_requests(resourceTypes?: Array, pageIdx?: number, pageSize?: number)
mcp__chrome_devtools__get_network_request(url: string) // Deep inspection with headers, timing, body
mcp__chrome_devtools__evaluate_script(function: string, args?: Array<{uid}>)
```

#### ⚡ Performance (3 tools)
```typescript
mcp__chrome_devtools__performance_start_trace(reload?: boolean, autoStop?: boolean)
mcp__chrome_devtools__performance_stop_trace()
mcp__chrome_devtools__performance_analyze_insight(insightName: "LCPBreakdown" | "DocumentLatency" | "RenderBlocking" | "SlowCSSSelector")
```

#### 🌐 Emulation (3 tools)
```typescript
mcp__chrome_devtools__resize_page(width: number, height: number)
mcp__chrome_devtools__emulate_cpu(throttlingRate: 1-20) // 1 = normal, 20 = 20x slower
mcp__chrome_devtools__emulate_network(throttlingOption: "No emulation" | "Slow 3G" | "Fast 3G" | "Slow 4G" | "Fast 4G")
```

### When to Use (100% of UI/UX Cases):

#### Always Use For:
- ✅ Visual testing (screenshots desktop/mobile/tablet)
- ✅ User interaction testing (clicks, forms, navigation)
- ✅ Console error detection (JavaScript errors, warnings)
- ✅ Network request monitoring (status codes, timing)
- ✅ Accessibility snapshots and validation
- ✅ Performance profiling (LCP, FPS, memory leaks)
- ✅ Slow connection simulation (Slow 3G, CPU throttling)
- ✅ Network request deep inspection (headers, response bodies)

#### Specific Use Cases:
- **90% of cases (Workflow 1):** Basic UI/UX validation (visual + functional)
- **10% of cases (Workflow 2):** Performance profiling before production
- **Debugging:** Deep JavaScript error investigation with stack traces
- **Optimization:** LCP breakdown, render-blocking resource detection

---

## 🗄️ Supabase MCP - Database Operations

**Package:** `@supabase/mcp-server-supabase@latest`
**Project:** `SUPABASE-PROJECT-REF`

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

### Pattern 1: Complete UI/UX Validation (Standard - 90% of cases)
```
1. Chrome DevTools MCP - Visual testing (screenshots desktop/mobile/tablet)
   ↓
2. Chrome DevTools MCP - Functional validation (console, network, accessibility)
   ↓
3. shadcn/ui MCP - Component consistency check (if using shadcn components)
   ↓
4. Document results (screenshots, checklist)
   ↓
✅ Commit to feature branch
```

### Pattern 2: Performance Profiling (Before Production - 10% of cases)
```
1. Chrome DevTools MCP - Baseline visual (Pattern 1)
   ↓
2. Chrome DevTools MCP - Emulation (Slow 3G, CPU throttling)
   ↓
3. Chrome DevTools MCP - Performance trace + insights (LCP, FPS, memory)
   ↓
4. Chrome DevTools MCP - Network deep dive (slow endpoints)
   ↓
5. Optimize based on insights
   ↓
✅ Production-ready
```

### Pattern 3: Database Development
```
1. Supabase MCP - Check advisors (security/performance)
   ↓
2. Supabase MCP - Apply migration
   ↓
3. Supabase MCP - Generate TypeScript types
   ↓
4. Chrome DevTools MCP - Test UI changes
```

### Pattern 4: Learning & Implementation
```
1. Context7 MCP - Get library documentation
   ↓
2. shadcn/ui MCP - Get component example
   ↓
3. Implement feature
   ↓
4. Chrome DevTools MCP - Complete UI/UX validation
```

---

## ⚠️ MCP Best Practices

### DO:
- ✅ Use Chrome DevTools MCP for ALL UI/UX validation (visual + functional + performance)
- ✅ Run Workflow 1 (visual + functional) for every UI change
- ✅ Run Workflow 2 (performance profiling) before production deploy
- ✅ Run Supabase advisors before production deploy
- ✅ Check shadcn/ui MCP for existing components before creating custom ones
- ✅ Use Context7 MCP for up-to-date documentation (not Google search)

### DON'T:
- ❌ Skip performance profiling before production (Workflow 2 is mandatory)
- ❌ Make database changes without running migration through Supabase MCP
- ❌ Ignore Supabase security/performance advisors
- ❌ Forget to generate TypeScript types after schema changes
- ❌ Use external browser testing tools when Chrome DevTools MCP provides everything

---

## 📊 MCP Usage Statistics (Track for Optimization)

| MCP | Usage Frequency | Primary Use Case |
|-----|----------------|------------------|
| Chrome DevTools | **Very High** | Every UI change (visual + functional + performance) |
| Supabase | Medium | DB operations, advisors |
| shadcn/ui | Medium | Component development |
| Context7 | Low | Research documentation |

---

**Migration Notes:**
- **October 2025:** Migrated from Playwright MCP + Chrome DevTools MCP to Chrome DevTools MCP unified
- **Rationale:** Chrome DevTools MCP is a superset of Playwright (26 tools vs 16), eliminating redundancy
- **Benefits:** Simplified workflow, no tool duplication, performance profiling built-in

**Next Review:** After one month of Chrome DevTools MCP exclusive usage (2025-11-03)
**Document Owner:** Development Team