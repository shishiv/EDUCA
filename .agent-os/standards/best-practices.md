# Development Best Practices

## Context

Global development guidelines for Agent OS projects.

<conditional-block context-check="core-principles">
IF this Core Principles section already read in current context:
  SKIP: Re-reading this section
  NOTE: "Using Core Principles already in context"
ELSE:
  READ: The following principles

## Core Principles

### Keep It Simple
- Implement code in the fewest lines possible
- Avoid over-engineering solutions
- Choose straightforward approaches over clever ones

### Optimize for Readability
- Prioritize code clarity over micro-optimizations
- Write self-documenting code with clear variable names
- Add comments for "why" not "what"

### DRY (Don't Repeat Yourself)
- Extract repeated business logic to private methods
- Extract repeated UI markup to reusable components
- Create utility functions for common operations

### File Structure
- Keep files focused on a single responsibility
- Group related functionality together
- Use consistent naming conventions
</conditional-block>

<conditional-block context-check="dependencies" task-condition="choosing-external-library">
IF current task involves choosing an external library:
  IF Dependencies section already read in current context:
    SKIP: Re-reading this section
    NOTE: "Using Dependencies guidelines already in context"
  ELSE:
    READ: The following guidelines
ELSE:
  SKIP: Dependencies section not relevant to current task

## Dependencies

### Choose Libraries Wisely
When adding third-party dependencies:
- Select the most popular and actively maintained option
- Check the library's GitHub repository for:
  - Recent commits (within last 6 months)
  - Active issue resolution
  - Number of stars/downloads
  - Clear documentation
</conditional-block>

<conditional-block context-check="package-management" task-condition="installing-packages">
IF current task involves installing packages or dependencies:
  IF Package Management section already read in current context:
    SKIP: Re-reading this section
    NOTE: "Using Package Management guidelines already in context"
  ELSE:
    READ: The following package management requirements

## Package Management

### Mandatory bun Usage
**CRITICAL**: Use `bun` exclusively for ALL package operations:
- Installation: `bun install` (never `npm install`)
- Adding packages: `bun add [package]` (never `npm install [package]`)
- Removing packages: `bun remove [package]` (never `npm uninstall [package]`)
- Running scripts: `bun run [script]` (never `npm run [script]`)
- Testing: `bun test` (never `npm test`)

### Performance Benefits
- 3x faster than npm for installations
- Native binary execution
- Better disk space usage
- Consistent lockfile format across team
</conditional-block>

<conditional-block context-check="brazilian-educational-compliance" task-condition="educational-domain-development">
IF current task involves Brazilian educational system development:
  IF Brazilian Educational Compliance section already read in current context:
    SKIP: Re-reading this section
    NOTE: "Using Brazilian Educational Compliance guidelines already in context"
  ELSE:
    READ: The following compliance requirements

## Brazilian Educational Compliance

### Core Principles

#### "Não existe o esquecer" (No Forgetting Principle)
- Attendance records cannot be modified after submission
- Implement strict immutability for educational data
- All changes must create comprehensive audit trails
- Legal compliance: attendance = official legal document

#### INEP Standards Compliance
- Student individualized data (CPF, enrollment status, attendance)
- Teacher classroom assignments with qualification validation
- Academic calendar alignment with Brazilian school year
- Educational establishment information accuracy

#### Data Validation Requirements
- **CPF Validation**: Always implement proper formatting and digit verification
- **Brazilian Phone Numbers**: Validate mobile/landline format patterns
- **Academic Calendar**: Date validations aligned with Brazilian school year
- **Attendance Calculations**: Minimum 75% attendance, alerting at 80% threshold

### Security and Privacy

#### LGPD (Lei Geral de Proteção de Dados) Compliance
- Data minimization: collect only necessary educational data
- Consent management with granular permissions
- Right to deletion implementation
- Complete audit trail for all data access

#### Multi-School Data Isolation
- Row Level Security (RLS) policies mandatory
- School-based data separation enforcement
- Role-based access control (5 roles: admin, diretor, secretario, professor, responsavel)
- Cross-school data access prevention

### Performance Standards
- Dashboard load time: < 3 seconds
- Attendance marking: < 1 second per student
- Report generation: < 5 seconds for standard reports
- Mobile/tablet optimization for classroom environments
</conditional-block>

<conditional-block context-check="accessibility-standards" task-condition="ui-ux-development">
IF current task involves UI/UX development or accessibility:
  IF Accessibility Standards section already read in current context:
    SKIP: Re-reading this section
    NOTE: "Using Accessibility Standards already in context"
  ELSE:
    READ: The following accessibility requirements

## Accessibility Standards

### Government Compliance Requirements
- **WCAG 2.1 AA Compliance**: Mandatory for Brazilian government deployment
- **Screen Reader Support**: Comprehensive ARIA labels for all interactive elements
- **Keyboard Navigation**: Full functionality without mouse interaction
- **High Contrast Support**: Visual accessibility for impaired users

### Educational Environment Optimization
- **Touch-Friendly Interface**: Minimum 44px touch targets for classroom tablets
- **Loading States**: Clear progress indicators for educational workflows
- **Error Handling**: Clear, actionable error messages in Portuguese
- **Offline Support**: Basic functionality during connectivity issues
</conditional-block>
