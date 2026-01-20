---
status: investigating
trigger: "Build error - Module not found: Can't resolve '@/components/ui/enhanced-brazilian-inputs'"
created: 2026-01-18T12:00:00Z
updated: 2026-01-18T12:00:00Z
---

## Current Focus

hypothesis: The file brazilian-inputs.tsx exists but exports different component names (CPFInput vs EnhancedCPFInput)
test: Compare exports in brazilian-inputs.tsx vs imports in student-form.tsx
expecting: Names will not match - need to either rename exports or update imports
next_action: Determine safest fix (update imports to match existing exports)

## Symptoms

expected: Student profile, Diario Infantil, and Development Report pages should load normally
actual: Build Error appears - "Module not found: Can't resolve '@/components/ui/enhanced-brazilian-inputs'"
errors: |
  Module not found: Can't resolve '@/components/ui/enhanced-brazilian-inputs'
  ./components/students/student-form.tsx (13:1)
reproduction: Navigate to any student-related page or run pnpm build
started: Discovered during UAT testing - pages may have never worked

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-01-18T12:00:00Z
  checked: File existence for enhanced-brazilian-inputs
  found: File does NOT exist - glob returns no files
  implication: Import path is completely wrong

- timestamp: 2026-01-18T12:01:00Z
  checked: File existence for brazilian-inputs.tsx
  found: File EXISTS at gestao_fronteira/components/ui/brazilian-inputs.tsx
  implication: There is a filename mismatch (enhanced- prefix missing)

- timestamp: 2026-01-18T12:02:00Z
  checked: Exports in brazilian-inputs.tsx
  found: |
    Exports: CPFInput, BrazilianPhoneInput, CEPInput, BrazilianDateInput, BrazilianInputHelp
    None have "Enhanced" prefix
  implication: Double mismatch - wrong filename AND wrong export names

- timestamp: 2026-01-18T12:03:00Z
  checked: Imports expected in student-form.tsx (lines 13-19)
  found: |
    Expected: EnhancedCPFInput, EnhancedPhoneInput, EnhancedDateInput, EnhancedCEPInput, EnhancedSelectInput
    Path: @/components/ui/enhanced-brazilian-inputs
  implication: Neither the file nor the component names match

- timestamp: 2026-01-18T12:04:00Z
  checked: Other files importing from enhanced-brazilian-inputs
  found: Only student-form.tsx imports from this path
  implication: Fix only needs to update one file

- timestamp: 2026-01-18T12:05:00Z
  checked: EnhancedSelectInput in brazilian-inputs.tsx
  found: EnhancedSelectInput does NOT exist in brazilian-inputs.tsx at all
  implication: This component was never created - need to find or create it

## Resolution

root_cause: |
  1. File path mismatch: import expects 'enhanced-brazilian-inputs' but file is 'brazilian-inputs'
  2. Export name mismatch: imports expect 'Enhanced' prefix but exports use plain names
  3. Missing component: EnhancedSelectInput does not exist anywhere

fix: (pending - need to update imports to use correct path and names)
verification: (pending)
files_changed: []
