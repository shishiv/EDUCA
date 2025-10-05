# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-10-04-ui-ux-validation-chrome-devtools/spec.md

> Created: 2025-10-04
> Status: Ready for Implementation

## Tasks

- [ ] 1. Development Environment Setup & Authentication
  - [ ] 1.1 Verify development server is running on http://localhost:3000
  - [ ] 1.2 Verify Chrome DevTools MCP server is connected and available
  - [ ] 1.3 Create screenshots directory structure: `.agent-os/specs/2025-10-04-ui-ux-validation-chrome-devtools/screenshots/`
  - [ ] 1.4 Test authentication flow with admin credentials (admin@fronteira.mg.gov.br / 123456)
  - [ ] 1.5 Verify successful login and dashboard access
  - [ ] 1.6 Create issue tracking document template: `validation-issues.md`

- [ ] 2. Systematic Page Discovery & Cataloging
  - [ ] 2.1 Navigate to dashboard and capture sidebar navigation structure using `take_snapshot()`
  - [ ] 2.2 Extract all sidebar menu items and create page inventory list
  - [ ] 2.3 Identify all top-level routes (/dashboard, /dashboard/alunos, /dashboard/turmas, /dashboard/frequencia, /dashboard/diario, etc.)
  - [ ] 2.4 Document discovered URLs in `page-inventory.md` with module categorization
  - [ ] 2.5 Create breadth-first navigation plan for systematic coverage
  - [ ] 2.6 Verify all sidebar links are accessible and responsive

- [ ] 3. Multi-Viewport Screenshot Capture (Desktop)
  - [ ] 3.1 Set viewport to desktop resolution (1920x1080) using `resize_page()`
  - [ ] 3.2 Navigate to each discovered page systematically
  - [ ] 3.3 Capture full-page screenshot for each route using `take_screenshot(fullPage: true)`
  - [ ] 3.4 Name screenshots using convention: `{module}-{page}-desktop.png`
  - [ ] 3.5 Store screenshots in organized folder structure by module
  - [ ] 3.6 Create screenshot inventory markdown table linking all desktop captures

- [ ] 4. Multi-Viewport Screenshot Capture (Mobile & Tablet)
  - [ ] 4.1 Set viewport to mobile resolution (375x667) and capture all pages
  - [ ] 4.2 Name mobile screenshots: `{module}-{page}-mobile.png`
  - [ ] 4.3 Set viewport to tablet resolution (768x1024) and capture all pages
  - [ ] 4.4 Name tablet screenshots: `{module}-{page}-tablet.png`
  - [ ] 4.5 Update screenshot inventory table with mobile and tablet links
  - [ ] 4.6 Identify pages with layout breaks or horizontal scrolling at smaller viewports

- [ ] 5. Console Error & Network Validation
  - [ ] 5.1 For each page, capture console messages using `list_console_messages()`
  - [ ] 5.2 Filter and document all JavaScript errors and warnings
  - [ ] 5.3 For each page, analyze network requests using `list_network_requests()`
  - [ ] 5.4 Identify all 4xx and 5xx status code responses
  - [ ] 5.5 Document API failures with request URL and error details
  - [ ] 5.6 Categorize console/network errors by severity (P0-Critical vs P1-Important)

- [ ] 6. Accessibility & Responsive Design Validation
  - [ ] 6.1 Capture accessibility snapshots for key pages using `take_snapshot()`
  - [ ] 6.2 Validate semantic HTML structure and ARIA compliance
  - [ ] 6.3 Verify touch target sizes meet 44x44px minimum for mobile pages
  - [ ] 6.4 Test Brazilian compliance formatting (CPF: XXX.XXX.XXX-XX, Phone: (XX) XXXXX-XXXX)
  - [ ] 6.5 Verify date formatting displays as DD/MM/YYYY
  - [ ] 6.6 Validate contrast ratios meet WCAG 2.1 AA standards (4.5:1 minimum)

- [ ] 7. Performance Baseline Measurement
  - [ ] 7.1 Start performance trace for Dashboard page using `performance_start_trace(reload: true, autoStop: true)`
  - [ ] 7.2 Analyze LCP (Largest Contentful Paint) using `performance_analyze_insight(insightName: "LCPBreakdown")`
  - [ ] 7.3 Measure Attendance/Diario page load times and LCP
  - [ ] 7.4 Document pages exceeding performance targets (Dashboard >3s, Attendance >1s per student)
  - [ ] 7.5 Identify performance bottlenecks using DocumentLatency and RenderBlocking insights
  - [ ] 7.6 Create performance baseline report with metrics for all critical pages

- [ ] 8. Issue Categorization & Documentation
  - [ ] 8.1 Review all captured screenshots and identify visual/layout issues
  - [ ] 8.2 Organize issues by module (Authentication, Dashboard, Students, Classes, Attendance, Diario)
  - [ ] 8.3 Categorize each issue by type (Broken Functionality / Styling Issues / Missing Features)
  - [ ] 8.4 Assign severity priority (P0-Critical / P1-Important / P2-Enhancement)
  - [ ] 8.5 Create detailed `validation-issues.md` with screenshot references for each issue
  - [ ] 8.6 Generate summary statistics (total issues by module, by severity, by type)

- [ ] 9. Mobile Responsiveness Report (Classroom Workflows)
  - [ ] 9.1 Test "Abrir Aula" workflow specifically at tablet viewport (768x1024)
  - [ ] 9.2 Validate attendance marking interface touch targets and performance
  - [ ] 9.3 Test session closure workflow on mobile viewport
  - [ ] 9.4 Document any mobile-specific issues affecting classroom tablet usage
  - [ ] 9.5 Verify no horizontal scrolling occurs on critical teacher workflows
  - [ ] 9.6 Create dedicated mobile responsiveness report with specific classroom scenario validation

- [ ] 10. Final Deliverables & Quality Assurance
  - [ ] 10.1 Review screenshot inventory completeness (all pages, all viewports)
  - [ ] 10.2 Verify issue list includes screenshot references and clear reproduction steps
  - [ ] 10.3 Validate mobile responsiveness report covers classroom tablet workflows
  - [ ] 10.4 Create executive summary with total issue counts and priority breakdown
  - [ ] 10.5 Generate recommendation list for top 5 P0-Critical fixes
  - [ ] 10.6 Archive all validation artifacts and mark spec as complete
