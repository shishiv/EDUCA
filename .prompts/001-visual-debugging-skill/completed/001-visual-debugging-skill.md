# Prompt: Create Visual Debugging Skill

## Objective
Create a Claude Code skill that uses Chrome DevTools MCP to systematically audit all pages of a Next.js application, capturing screenshots, console errors, and responsiveness issues.

## Context
- Project: EDUCA - Educational management system (Next.js 15 + Supabase)
- Location: `gestao_fronteira/`
- Total pages: 38 (dashboard, auth, reports)
- Available MCP: `mcp__chrome-devtools__*`

## Requirements

### Skill Structure
Create file: `.claude/skills/visual-debugging.md`

Use YAML frontmatter + XML structure:
```yaml
---
name: visual-debugging
description: Audits all pages with screenshots, console errors, and responsiveness tests using Chrome DevTools MCP
---
```

### Core Functionality

1. **Page Discovery**
   - Automatically find all `page.tsx` files in `app/` directory
   - Build URL list from file paths (e.g., `app/(dashboard)/dashboard/alunos/page.tsx` → `/dashboard/alunos`)
   - Handle dynamic routes by skipping `[id]` segments or using test IDs

2. **Screenshot Capture**
   - Navigate to each page using `mcp__chrome-devtools__navigate_page`
   - Wait for page load
   - Take screenshot using `mcp__chrome-devtools__take_screenshot`
   - Save to `.audit/screenshots/{page-name}.png`

3. **Console Error Collection**
   - After each page load, call `mcp__chrome-devtools__list_console_messages`
   - Filter for errors and warnings
   - Log to `.audit/console-errors.md`

4. **Responsiveness Testing**
   - For each page, test 3 viewports using `mcp__chrome-devtools__resize_page`:
     - Desktop: 1920x1080
     - Tablet: 768x1024
     - Mobile: 375x667
   - Take screenshot at each size
   - Save to `.audit/screenshots/{page-name}-{viewport}.png`

5. **Report Generation**
   - Create `.audit/AUDIT-REPORT.md` with:
     - Total pages audited
     - Pages with errors (list)
     - Pages with warnings (list)
     - Responsiveness issues found
     - Screenshots gallery (markdown image links)

### Skill Sections (XML tags)

```xml
<objective>...</objective>
<quick_start>...</quick_start>
<prerequisites>
  - Dev server running on localhost:3000
  - Chrome DevTools MCP connected
</prerequisites>
<workflow>
  <step name="discover">Find all pages</step>
  <step name="audit">Navigate + screenshot + errors</step>
  <step name="responsive">Test viewports</step>
  <step name="report">Generate audit report</step>
</workflow>
<tools>
  List all Chrome DevTools MCP tools used
</tools>
<output_format>
  Describe .audit/ directory structure
</output_format>
<success_criteria>
  - All pages visited
  - All errors captured
  - Report generated
</success_criteria>
```

## Output
Write skill to: `.claude/skills/visual-debugging.md`

After creating, verify the skill follows the project's skill format by comparing with `.claude/skills/codebase-cleanup.md`

## Success Criteria
- [ ] Skill file created with correct YAML frontmatter
- [ ] All XML sections present
- [ ] Tool names are correct MCP tool names
- [ ] Prerequisites documented
- [ ] Workflow is clear and executable
