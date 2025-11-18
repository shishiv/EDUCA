# Spec: Surface Chores (Documentation & Code Organization)

**Capability:** `surface-chores`
**Change:** `organize-codebase-foundation`
**Status:** Proposed
**Owner:** Development Team

---

## Overview

This spec defines the requirements for consolidating scattered documentation and performing superficial code organization to establish a clean foundation for future development.

**Current Problem:**
- 47 documentation files scattered across codebase
- Duplicate and conflicting information
- No single source of truth
- Difficult to onboard new developers or AI assistants
- Unused code and validators still present

**Solution:**
- Consolidate all documentation into `MASTER-DOCUMENTATION.md`
- Archive historical session reports
- Remove duplicate/obsolete files
- Organize lib/ structure
- Remove obviously unused code

---

## ADDED Requirements

### Requirement: DOC-001 - Single Source of Truth Documentation
**Priority:** CRITICAL
**Type:** Non-Functional

The system SHALL provide a single, authoritative documentation file (`MASTER-DOCUMENTATION.md`) that consolidates all project documentation into navigable chapters.

#### Scenario: Developer needs to find authentication documentation
**Given** a new developer joins the project
**When** they need to understand the authentication system
**Then** they can find all auth information in MASTER-DOCUMENTATION.md Chapter 3.X
**And** the chapter includes links to relevant code files
**And** no conflicting information exists in other files

#### Scenario: AI assistant needs project context
**Given** an AI assistant is working on the codebase
**When** it needs to understand project conventions
**Then** it can read MASTER-DOCUMENTATION.md Chapter 1 (Project Overview)
**And** find references to specific guidelines in other chapters
**And** navigate using the table of contents

#### Scenario: Finding deployment instructions
**Given** a developer needs to deploy the application
**When** they search for deployment information
**Then** all deployment steps are in Chapter 6.1 (Deployment Guide)
**And** no duplicate or conflicting deployment docs exist

---

### Requirement: DOC-002 - Complete Documentation Consolidation
**Priority:** HIGH
**Type:** Non-Functional

All existing documentation (47 files totaling ~500KB) SHALL be consolidated into MASTER-DOCUMENTATION.md without loss of important information.

#### Scenario: Consolidating core project docs
**Given** README.md (16K), BUGS-ANALYSIS.md (18K), CHANGELOG.md (9.1K) exist
**When** consolidation is performed
**Then** all content is preserved in Chapters 1 and 2
**And** original files are either deleted or marked SUPERSEDED
**And** no information is lost in the merge

#### Scenario: Consolidating architecture documentation
**Given** lib/services/ contains 5 .md files (52K total)
**And** lib/validation/ contains 4 .md files (66K total)
**When** consolidation is performed
**Then** all architecture content is in Chapter 3
**And** original README files are deleted
**And** code examples are preserved

#### Scenario: Archiving historical session reports
**Given** claudedocs/ contains session reports from 2025-01-11
**When** consolidation is performed
**Then** reports are moved to Chapter 8 (Archives)
**And** files are marked with "SUPERSEDED - See Chapter X"
**And** original files can be recovered from git history

---

### Requirement: DOC-003 - Navigable Chapter Structure
**Priority:** HIGH
**Type:** Functional

MASTER-DOCUMENTATION.md SHALL have a table of contents with anchor links and a clear 8-chapter structure.

#### Scenario: Navigating documentation via table of contents
**Given** MASTER-DOCUMENTATION.md is open
**When** a developer clicks a chapter link in the TOC
**Then** they jump directly to that chapter section
**And** each chapter has a clear heading
**And** subchapters are properly nested

#### Scenario: Chapter structure follows logical organization
**Given** MASTER-DOCUMENTATION.md is created
**Then** it contains exactly 8 chapters:
  - Chapter 1: Project Overview
  - Chapter 2: Status & Progress
  - Chapter 3: Architecture
  - Chapter 4: Product & Business
  - Chapter 5: Testing & QA
  - Chapter 6: Deployment & Operations
  - Chapter 7: Code Guidelines
  - Chapter 8: Archives

#### Scenario: Cross-referencing between chapters
**Given** a chapter references information in another chapter
**When** the cross-reference is clicked
**Then** it navigates to the correct chapter section
**And** the reference is clearly labeled (e.g., "See Chapter 3.2")

---

### Requirement: DOC-004 - Updated Entry Point References
**Priority:** MEDIUM
**Type:** Functional

CLAUDE.md and AGENTS.md SHALL be updated to reference MASTER-DOCUMENTATION.md chapters instead of individual files.

#### Scenario: CLAUDE.md references documentation
**Given** CLAUDE.md previously referenced individual .md files
**When** consolidation is complete
**Then** all references point to MASTER-DOCUMENTATION.md chapters
**And** chapter numbers are accurate
**And** no broken links exist

#### Scenario: AI assistant follows CLAUDE.md instructions
**Given** an AI assistant reads CLAUDE.md
**When** it needs to find testing guidelines
**Then** CLAUDE.md directs it to MASTER-DOCUMENTATION.md Chapter 5
**And** the assistant can navigate directly to the content

---

### Requirement: CODE-001 - Organized lib/ Structure
**Priority:** MEDIUM
**Type:** Non-Functional

The lib/ directory SHALL be organized by domain with related modules grouped together.

#### Scenario: Finding authentication utilities
**Given** a developer needs to use auth helpers
**When** they explore lib/
**Then** all auth-related code is in lib/auth/
**And** no auth code exists scattered in other directories

#### Scenario: Consistent module grouping
**Given** lib/ directory structure
**Then** modules are grouped by domain:
  - lib/api/ (API client functions)
  - lib/auth/ (Authentication & authorization)
  - lib/validation/ (Brazilian data validation)
  - lib/services/ (Business logic services)
  - lib/hooks/ (React hooks)
  - lib/supabase/ (Database client)
  - lib/utils/ (Generic utilities)
  - lib/models/ (TypeScript types & constants)

---

### Requirement: CODE-002 - Removal of Unused Code
**Priority:** MEDIUM
**Type:** Functional

Obviously unused models, validators, and files SHALL be removed from the codebase.

#### Scenario: Removing unused models
**Given** lib/models/ contains audit-checklist.ts, mockup-inventory.ts, mcp-configuration.ts
**And** these files are not imported anywhere in the codebase
**When** cleanup is performed
**Then** these files are deleted
**And** no import errors occur

#### Scenario: Consolidating duplicate validators
**Given** lib/validators/cpf.ts and lib/validators/phone.ts exist
**And** lib/validators/brazilian.ts contains the same functionality
**When** cleanup is performed
**Then** cpf.ts and phone.ts are deleted
**And** all imports are updated to use brazilian.ts

#### Scenario: Removing duplicate README files
**Given** lib/services/README.md, lib/validation/README.md exist
**And** content is consolidated in MASTER-DOCUMENTATION.md
**When** cleanup is performed
**Then** these README files are deleted
**And** no references to them remain in the codebase

---

### Requirement: CODE-003 - File Reference Validation
**Priority:** HIGH
**Type:** Non-Functional

All references to moved or deleted files SHALL be updated to prevent broken links.

#### Scenario: Validating markdown references
**Given** code files reference .md documentation
**When** consolidation is complete
**Then** all references point to MASTER-DOCUMENTATION.md
**And** no broken links exist
**And** no 404 errors occur when accessing links

#### Scenario: Searching for broken references
**Given** cleanup is complete
**When** searching for deleted file paths (e.g., "lib/services/README")
**Then** zero matches are found in the codebase
**And** all references have been updated

---

### Requirement: VAL-001 - No Information Loss
**Priority:** CRITICAL
**Type:** Non-Functional

Consolidation SHALL preserve all important information from the original 47 documentation files.

#### Scenario: Validating content preservation
**Given** original docs contain 500KB of content
**When** consolidation is complete
**Then** MASTER-DOCUMENTATION.md contains all important information
**And** no critical sections are missing
**And** code examples are preserved

#### Scenario: Archive accessibility
**Given** historical session reports are archived
**When** someone needs to reference old analysis
**Then** archived content is in Chapter 8
**And** clearly marked with dates and context
**And** can be recovered from git history if deleted

---

## MODIFIED Requirements

None (no existing requirements modified)

---

## REMOVED Requirements

None (no requirements removed)

---

## Dependencies

### Related Capabilities
- **Depends on:** None (foundational change)
- **Enables:** `deep-cleaning` (console logs, TypeScript fixes)
- **Enables:** Future development features (clearer codebase)

### External Dependencies
- Git (for file deletion and archival)
- Markdown renderer (for validation)
- Text editor with search/replace (for reference updates)

---

## Implementation Notes

### Documentation Consolidation Strategy

**Step 1: Inventory**
- Create structured map of all 47 files
- Categorize by chapter destination
- Identify duplicates and conflicts

**Step 2: Merge**
- Create MASTER-DOCUMENTATION.md skeleton
- Copy/paste content chapter by chapter
- Add table of contents and navigation

**Step 3: Archive**
- Mark historical docs as SUPERSEDED
- Move to Chapter 8 or delete
- Update all references

### Code Organization Strategy

**Step 1: Identify Unused Code**
```bash
# Find unreferenced models
rg -l "audit-checklist|mockup-inventory|mcp-configuration" gestao_fronteira/

# Find duplicate validators
rg -l "validators/cpf|validators/phone" gestao_fronteira/
```

**Step 2: Update Imports**
```typescript
// BEFORE
import { validateCPF } from '@/lib/validators/cpf'

// AFTER
import { validateCPF } from '@/lib/validators/brazilian'
```

**Step 3: Delete Files**
- Remove unused models
- Remove duplicate validators
- Remove obsolete READMEs

### Validation Checklist

Before marking complete:
- [ ] MASTER-DOCUMENTATION.md has all 8 chapters
- [ ] Table of contents is accurate
- [ ] No broken internal links
- [ ] All references updated (CLAUDE.md, AGENTS.md)
- [ ] ~35 files deleted or archived
- [ ] No import errors after cleanup
- [ ] Can navigate entire documentation from TOC

---

## Testing Strategy

### Manual Testing
1. Open MASTER-DOCUMENTATION.md
2. Click each TOC link → verify navigation
3. Search for code examples → verify they render correctly
4. Check cross-references → verify they point to correct chapters

### Automated Validation
```bash
# Validate markdown links
npx markdown-link-check gestao_fronteira/MASTER-DOCUMENTATION.md

# Search for broken references
rg -n "lib/services/README|lib/validation/README" gestao_fronteira/

# Count remaining docs (should be ~10-12)
find gestao_fronteira -name "*.md" ! -path "*/node_modules/*" | wc -l
```

---

## Rollback Plan

If consolidation causes issues:
1. `git revert` to previous commit
2. All original files still in git history
3. Restore individual files from git if needed
4. Re-run consolidation with fixes

---

## Related Specs

- **Enables:** `deep-cleaning` spec (console logs, TypeScript fixes)
- **Future:** `api-route-consolidation` spec
- **Future:** `typescript-strict-compliance` spec
