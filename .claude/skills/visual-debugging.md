---
name: visual-debugging
description: Audits all pages of a Next.js application using Chrome DevTools MCP. Use when you need to identify visual issues, console errors, or responsiveness problems across the entire application.
---

<objective>
Systematically audit all pages of a Next.js application by:
1. Discovering all page.tsx files automatically
2. Navigating to each page and capturing screenshots
3. Collecting console errors and warnings
4. Testing responsiveness at multiple viewport sizes
5. Generating a comprehensive audit report

Output is saved to `.audit/` directory for review.
</objective>

<quick_start>
**Prerequisites:**
```bash
pnpm dev                    # Dev server running on localhost:3000
# Chrome DevTools MCP must be connected
```

**Quick audit (single page):**
```
1. Navigate: mcp__chrome-devtools__navigate_page → url: "http://localhost:3000/dashboard"
2. Screenshot: mcp__chrome-devtools__take_screenshot → filePath: ".audit/dashboard.png"
3. Errors: mcp__chrome-devtools__list_console_messages → types: ["error", "warn"]
```

**Full audit:** Follow the workflow below.
</quick_start>

<prerequisites>
**Required:**
- Dev server running (`pnpm dev` → http://localhost:3000)
- Chrome DevTools MCP connected and working
- `.audit/` directory will be created automatically

**Verify MCP connection:**
```
mcp__chrome-devtools__list_pages
```
If this returns pages, MCP is connected.
</prerequisites>

<workflow>

<step name="1" title="Discover Pages">
**Find all pages in the Next.js app:**

```bash
# List all page.tsx files
find gestao_fronteira/app -name "page.tsx" -type f
```

**Convert file paths to URLs:**
| File Path | URL |
|-----------|-----|
| `app/page.tsx` | `/` |
| `app/(dashboard)/dashboard/page.tsx` | `/dashboard` |
| `app/(dashboard)/dashboard/alunos/page.tsx` | `/dashboard/alunos` |
| `app/(dashboard)/dashboard/alunos/[id]/page.tsx` | `/dashboard/alunos/1` (use test ID) |
| `app/(auth)/login/page.tsx` | `/login` |

**Skip patterns:**
- `[id]` segments → use ID `1` or skip if no test data
- `novo` (new) pages → may require auth
- `editar` (edit) pages → may require existing record
</step>

<step name="2" title="Create Audit Directory">
```bash
mkdir -p .audit/screenshots/desktop
mkdir -p .audit/screenshots/tablet
mkdir -p .audit/screenshots/mobile
```
</step>

<step name="3" title="Audit Each Page">
**For each page URL, execute this sequence:**

1. **Navigate to page:**
```
mcp__chrome-devtools__navigate_page
  type: "url"
  url: "http://localhost:3000{path}"
  timeout: 10000
```

2. **Wait for load (if dynamic content):**
```
mcp__chrome-devtools__wait_for
  text: "[some expected text on page]"
  timeout: 5000
```

3. **Capture desktop screenshot:**
```
mcp__chrome-devtools__resize_page
  width: 1920
  height: 1080

mcp__chrome-devtools__take_screenshot
  filePath: ".audit/screenshots/desktop/{page-name}.png"
```

4. **Capture tablet screenshot:**
```
mcp__chrome-devtools__resize_page
  width: 768
  height: 1024

mcp__chrome-devtools__take_screenshot
  filePath: ".audit/screenshots/tablet/{page-name}.png"
```

5. **Capture mobile screenshot:**
```
mcp__chrome-devtools__resize_page
  width: 375
  height: 667

mcp__chrome-devtools__take_screenshot
  filePath: ".audit/screenshots/mobile/{page-name}.png"
```

6. **Collect console messages:**
```
mcp__chrome-devtools__list_console_messages
  types: ["error", "warn", "issue"]
```

**Log errors to `.audit/console-errors.md`:**
```markdown
## {page-name}

### Errors
- [error message 1]
- [error message 2]

### Warnings
- [warning message 1]
```
</step>

<step name="4" title="Generate Report">
**Create `.audit/AUDIT-REPORT.md`:**

```markdown
# Visual Audit Report

**Date:** {date}
**Pages Audited:** {count}
**Dev Server:** http://localhost:3000

## Summary

| Metric | Count |
|--------|-------|
| Total Pages | X |
| Pages with Errors | X |
| Pages with Warnings | X |
| Responsiveness Issues | X |

## Pages with Issues

### {page-name}
- **Errors:** X
- **Warnings:** X
- **Screenshots:** [desktop](screenshots/desktop/{page}.png) | [tablet](screenshots/tablet/{page}.png) | [mobile](screenshots/mobile/{page}.png)

[Repeat for each page with issues]

## Clean Pages

- {page-name} ✓
- {page-name} ✓

## Console Errors Detail

See [console-errors.md](console-errors.md) for full error log.

## Responsiveness Notes

[Any visual issues observed at different viewport sizes]
```
</step>

</workflow>

<tools>
**Chrome DevTools MCP tools used:**

| Tool | Purpose |
|------|---------|
| `mcp__chrome-devtools__navigate_page` | Navigate to page URL |
| `mcp__chrome-devtools__take_screenshot` | Capture page screenshot |
| `mcp__chrome-devtools__list_console_messages` | Get JS errors/warnings |
| `mcp__chrome-devtools__resize_page` | Change viewport size |
| `mcp__chrome-devtools__wait_for` | Wait for element/text |
| `mcp__chrome-devtools__take_snapshot` | Get accessibility tree |
| `mcp__chrome-devtools__list_pages` | Verify MCP connection |

**Viewport sizes:**
| Name | Width | Height |
|------|-------|--------|
| Desktop | 1920 | 1080 |
| Tablet | 768 | 1024 |
| Mobile | 375 | 667 |
</tools>

<output_format>
**Directory structure created:**
```
.audit/
├── AUDIT-REPORT.md          # Summary report
├── console-errors.md        # All errors/warnings by page
└── screenshots/
    ├── desktop/
    │   ├── dashboard.png
    │   ├── alunos.png
    │   └── ...
    ├── tablet/
    │   └── ...
    └── mobile/
        └── ...
```
</output_format>

<error_handling>
**Common issues:**

1. **Page requires auth:**
   - Login first using `mcp__chrome-devtools__fill` and `mcp__chrome-devtools__click`
   - Or skip protected pages and note in report

2. **Dynamic route needs ID:**
   - Use ID `1` or query database for valid ID
   - Skip if no test data available

3. **Page timeout:**
   - Increase timeout parameter
   - Check if dev server is running
   - Note as "Failed to load" in report

4. **MCP not connected:**
   - Run `mcp__chrome-devtools__list_pages` to verify
   - Restart Chrome DevTools MCP if needed
</error_handling>

<success_criteria>
Audit is complete when:
- [ ] All accessible pages navigated
- [ ] Screenshots captured at 3 viewport sizes
- [ ] Console errors/warnings collected
- [ ] `.audit/AUDIT-REPORT.md` generated
- [ ] `.audit/console-errors.md` contains error details
- [ ] Screenshots saved in organized directories
- [ ] Pages requiring auth are noted (not skipped silently)
</success_criteria>
