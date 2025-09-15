# SRE Educational Management System - Development Constitution

## Project Mission
Build a comprehensive digital educational management system for the Municipality of Fronteira, Brazil, focusing on student registration, attendance tracking, and educational reporting with strict compliance to Brazilian educational regulations.

## Core Principles

### 1. Educational Domain Focus
- All development must align with Brazilian educational system requirements
- Attendance tracking is the critical legal document for student safety and compliance
- Non-retroactive attendance marking is mandatory ("não existe o esquecer")
- Student data must be comprehensive and support special needs tracking

### 2. Security and Data Integrity
- Row Level Security (RLS) must be enforced for multi-school data isolation
- All user actions must be auditable with timestamps
- JWT authentication via Supabase is mandatory
- Role-based access control with exactly 5 user types: admin, diretor, secretario, professor, responsavel

### 3. Technology Standards
- TypeScript strict mode across all projects
- React Hook Form + Zod validation for Brazilian data (CPF, phone)
- shadcn/ui components for consistent design
- Supabase for database, authentication, and real-time features
- Next.js or Vite+React for frontend frameworks

### 4. Performance Requirements
- Dashboard loads in < 3 seconds
- Attendance marking in < 1 second per student
- Mobile-responsive design for teacher tablet/phone use
- Export reports (PDF/Excel) generated in < 10 seconds

### 5. Development Workflow
- Use existing components from gestao_fronteira (80% MVP ready)
- Prefer editing existing files over creating new ones
- Never create documentation files unless explicitly requested
- Follow existing code conventions and patterns
- Test RLS policies thoroughly before deployment

### 6. MVP Requirements
Four essential modules in order of priority:
1. **User Management (RBAC)** - Complete user creation and role assignment
2. **Student Registration** - Full student lifecycle with class assignments
3. **Digital Diary** - Daily attendance with "Abrir aula" workflow and save-lock
4. **Basic Reports** - Frequency reports and 80% attendance threshold alerts

### 7. Brazilian Educational Compliance
- CPF validation and formatting
- Brazilian phone number standards
- Academic calendar date validations
- Minimum 75% attendance requirement with 80% alerting threshold
- Semester observations mandatory for at-risk students
- Guardian/parent relationship management

## Quality Gates

### Before Implementation
- [ ] Specification addresses Brazilian educational requirements
- [ ] Security model includes RLS and multi-tenancy
- [ ] Components reuse existing gestao_fronteira assets
- [ ] Mobile responsiveness is planned
- [ ] Export functionality is defined

### Before Release
- [ ] All 5 user roles function correctly
- [ ] Attendance workflow prevents retroactive changes
- [ ] Multi-school data isolation verified
- [ ] Performance targets met
- [ ] Brazilian data validation working
- [ ] PDF and Excel exports functional

## Forbidden Practices
- Creating new components when existing ones can be adapted
- Implementing authentication outside of Supabase
- Allowing retroactive attendance modifications without specialist override
- Developing without TypeScript strict mode
- Building UI without shadcn/ui consistency
- Deploying without RLS policy testing

## Success Metrics
- 100% municipal students registered by month-end
- 95% teachers using digital attendance within 2 weeks
- < 3 second dashboard load times
- 99.5% system availability during school hours
- 100% attendance record immutability after save