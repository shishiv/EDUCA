# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-04-ui-ux-validation-chrome-devtools/spec.md

## Technical Requirements

### Chrome DevTools MCP Configuration

- **MCP Server**: chrome-devtools-mcp@0.6.0 (Google Chrome DevTools Team)
- **Authentication**: Use test credentials from lib/supabase.ts (admin@fronteira.mg.gov.br / 123456)
- **Session Management**: Single admin user session for consistent navigation state
- **Timeout Settings**: 15s navigation timeout, 10s wait_for timeout for dynamic content

### Viewport Specifications

- **Desktop**: 1920x1080 (primary development resolution)
- **Mobile**: 375x667 (iPhone SE - minimum mobile target)
- **Tablet**: 768x1024 (iPad Mini - classroom tablet standard)
- **Resize Method**: Use `resize_page(width, height)` MCP tool between viewports

### Screenshot Capture Strategy

- **Naming Convention**: `{module}-{page}-{viewport}.png` (e.g., `attendance-abrir-aula-desktop.png`)
- **Storage Location**: `.agent-os/specs/2025-10-04-ui-ux-validation-chrome-devtools/screenshots/`
- **Full Page**: Use `fullPage: true` for pages with scrollable content
- **Format**: PNG format for lossless quality and transparency support

### Page Discovery Algorithm

1. **Start**: Navigate to http://localhost:3000/login
2. **Authenticate**: Fill form with admin credentials and submit
3. **Sidebar Navigation**: Extract all sidebar menu items using `take_snapshot()`
4. **Breadth-First Traversal**: Click each sidebar link, capture page, extract sub-links, repeat
5. **URL Cataloging**: Maintain Set of visited URLs to avoid duplicate validation
6. **Exit Condition**: All sidebar links and discovered sub-pages visited

### Validation Checks (Per Page)

- **Console Analysis**: `list_console_messages()` → filter for errors and warnings
- **Network Inspection**: `list_network_requests()` → identify 4xx/5xx status codes
- **Accessibility Tree**: `take_snapshot()` → validate semantic HTML structure
- **Visual Capture**: `take_screenshot()` at 3 viewports (desktop, mobile, tablet)

### Issue Classification Schema

**Severity Levels:**
- **P0-Critical**: Blocking functionality (console errors, 404 pages, broken forms, authentication failures)
- **P1-Important**: UX degradation (layout breaks, poor contrast, missing labels, slow loading >3s)
- **P2-Enhancement**: Visual polish (inconsistent spacing, outdated icons, typography improvements)

**Issue Types:**
- **Broken Functionality**: Runtime errors, API failures, non-functional buttons/links
- **Styling Issues**: Layout breaks, poor responsiveness, contrast violations, formatting problems
- **Missing Features**: Placeholder pages, incomplete workflows, missing navigation

### Performance Measurement

- **Metrics**: Largest Contentful Paint (LCP), Total Blocking Time (TBT), First Contentful Paint (FCP)
- **Tools**: `performance_start_trace()` → `performance_stop_trace()` → `performance_analyze_insight()`
- **Target Pages**: Dashboard home, Attendance list, Abrir Aula workflow, Diario page
- **Acceptance Criteria**: Dashboard LCP <3s, Attendance marking <1s per student

### Documentation Format

**Screenshot Inventory**: Markdown table with columns [Page, Desktop Link, Mobile Link, Tablet Link, Console Errors, Network Errors]

**Issue List**: Markdown document structure:
```
## [Module Name] (e.g., Attendance)

### [Page Name] (e.g., Abrir Aula)

#### 🔴 P0-Critical
- [Issue description] - Screenshot: [link]

#### 🟡 P1-Important
- [Issue description] - Screenshot: [link]

#### 🟢 P2-Enhancement
- [Issue description] - Screenshot: [link]
```

### Brazilian Educational Compliance Validation

- **CPF Input Formatting**: Verify mask displays as XXX.XXX.XXX-XX
- **Brazilian Phone Formatting**: Verify mask displays as (XX) XXXXX-XXXX
- **Date Formatting**: Verify displays as DD/MM/YYYY (Brazilian standard)
- **Attendance Immutability**: Verify locked sessions cannot be edited (visual indicators)
- **Legal Documentation**: Verify "único documento oficial" warning messages are prominent

### Mobile Touch Interface Requirements

- **Touch Targets**: Minimum 44x44px for all interactive elements (WCAG 2.1 AA)
- **Tap Delay**: No 300ms tap delay (verified via touch event timing)
- **Horizontal Scroll**: Zero horizontal scrolling at mobile viewport
- **Font Sizes**: Minimum 16px for body text to prevent iOS zoom
- **Contrast Ratios**: Minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA)

## External Dependencies

None required - all validation uses existing Chrome DevTools MCP server and built-in Next.js development server.
