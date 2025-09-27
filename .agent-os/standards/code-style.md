# Code Style Guide

## Context

Global code style rules for Agent OS projects.

<conditional-block context-check="general-formatting">
IF this General Formatting section already read in current context:
  SKIP: Re-reading this section
  NOTE: "Using General Formatting rules already in context"
ELSE:
  READ: The following formatting rules

## General Formatting

### Indentation
- Use 2 spaces for indentation (never tabs)
- Maintain consistent indentation throughout files
- Align nested structures for readability

### Naming Conventions
- **TypeScript/JavaScript Variables and Functions**: Use camelCase (e.g., `userProfile`, `calculateTotal`)
- **TypeScript Interfaces and Types**: Use PascalCase (e.g., `UserProfile`, `StudentData`)
- **React Components**: Use PascalCase (e.g., `StudentForm`, `AttendanceGrid`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `INEP_API_URL`)
- **File Names**: Use kebab-case for components (e.g., `student-form.tsx`, `attendance-grid.tsx`)

### String Formatting
- Use single quotes for strings: `'Hello World'`
- Use double quotes only when interpolation is needed
- Use template literals for multi-line strings or complex interpolation

### Code Comments
- Add brief comments above non-obvious business logic
- Document complex algorithms or calculations
- Explain the "why" behind implementation choices
- Never remove existing comments unless removing the associated code
- Update comments when modifying code to maintain accuracy
- Keep comments concise and relevant
</conditional-block>

<conditional-block task-condition="html-css-tailwind" context-check="html-css-style">
IF current task involves writing or updating HTML, CSS, or TailwindCSS:
  IF html-style.md AND css-style.md already in context:
    SKIP: Re-reading these files
    NOTE: "Using HTML/CSS style guides already in context"
  ELSE:
    <context_fetcher_strategy>
      IF current agent is Claude Code AND context-fetcher agent exists:
        USE: @agent:context-fetcher
        REQUEST: "Get HTML formatting rules from code-style/html-style.md"
        REQUEST: "Get CSS and TailwindCSS rules from code-style/css-style.md"
        PROCESS: Returned style rules
      ELSE:
        READ the following style guides (only if not already in context):
        - @.agent-os/standards/code-style/html-style.md (if not in context)
        - @.agent-os/standards/code-style/css-style.md (if not in context)
    </context_fetcher_strategy>
ELSE:
  SKIP: HTML/CSS style guides not relevant to current task
</conditional-block>

<conditional-block task-condition="javascript" context-check="javascript-style">
IF current task involves writing or updating JavaScript:
  IF javascript-style.md already in context:
    SKIP: Re-reading this file
    NOTE: "Using JavaScript style guide already in context"
  ELSE:
    <context_fetcher_strategy>
      IF current agent is Claude Code AND context-fetcher agent exists:
        USE: @agent:context-fetcher
        REQUEST: "Get JavaScript style rules from code-style/javascript-style.md"
        PROCESS: Returned style rules
      ELSE:
        READ: @.agent-os/standards/code-style/javascript-style.md
    </context_fetcher_strategy>
ELSE:
  SKIP: JavaScript style guide not relevant to current task
</conditional-block>

<conditional-block task-condition="typescript" context-check="typescript-style">
IF current task involves writing or updating TypeScript:
  IF typescript-style.md already in context:
    SKIP: Re-reading this file
    NOTE: "Using TypeScript style guide already in context"
  ELSE:
    <context_fetcher_strategy>
      IF current agent is Claude Code AND context-fetcher agent exists:
        USE: @agent:context-fetcher
        REQUEST: "Get TypeScript style rules from code-style/typescript-style.md"
        PROCESS: Returned style rules
      ELSE:
        READ: @.agent-os/standards/code-style/typescript-style.md
    </context_fetcher_strategy>
ELSE:
  SKIP: TypeScript style guide not relevant to current task
</conditional-block>

<conditional-block task-condition="package-management" context-check="bun-requirements">
IF current task involves installing packages or running scripts:
  IF Package Management section already read in current context:
    SKIP: Re-reading this section
    NOTE: "Using Package Management requirements already in context"
  ELSE:
    READ: The following package management requirements

## Package Management Requirements

### Mandatory bun Usage
**CRITICAL**: Use `bun` exclusively for ALL package operations:
```bash
# Installation (never npm install)
bun install

# Adding packages (never npm install [package])
bun add [package]
bun add -d [dev-package]  # Development dependencies

# Removing packages (never npm uninstall)
bun remove [package]

# Running scripts (never npm run)
bun run dev
bun run build
bun run test
bun run lint
bun run typecheck

# Testing (never npm test)
bun test
bun test --watch
```

### File Extensions and Commands
- Use `bun` prefix for all package.json scripts
- TypeScript files: `.ts` for utilities, `.tsx` for React components
- Configuration files: Prefer TypeScript versions (e.g., `tailwind.config.ts`)
</conditional-block>

<conditional-block task-condition="nextjs-app-router" context-check="nextjs-style">
IF current task involves Next.js development:
  IF nextjs-style.md already in context:
    SKIP: Re-reading this file
    NOTE: "Using Next.js style guide already in context"
  ELSE:
    <context_fetcher_strategy>
      IF current agent is Claude Code AND context-fetcher agent exists:
        USE: @agent:context-fetcher
        REQUEST: "Get Next.js style rules from code-style/nextjs-style.md"
        PROCESS: Returned style rules
      ELSE:
        READ: @.agent-os/standards/code-style/nextjs-style.md
    </context_fetcher_strategy>
ELSE:
  SKIP: Next.js style guide not relevant to current task
</conditional-block>
