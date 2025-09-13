# Specify Prompt - SRE Educational Management System MVP

## Context
Based on the comprehensive component analysis and MVP specifications for the Municipality of Fronteira's educational management system, we need to create a detailed specification document following GitHub's spec-kit methodology.

## Available Assets Analysis
We have identified that **gestao_fronteira** provides 80% of MVP functionality with:
- Complete database schema with 8 core tables (users, escolas, alunos, turmas, matriculas, frequencia, etc.)
- Full RBAC implementation with 5 user roles
- Production-ready attendance tracking system
- PDF/Excel export infrastructure (jsPDF, xlsx libraries)
- Comprehensive Row Level Security policies

**fronteira-educa-gest** provides modern TypeScript patterns:
- Strong type definitions with Supabase integration
- Complete shadcn/ui component library (47 components)
- Modern authentication hooks and utilities

## Specify Phase Prompt

Please create a detailed specification document for the SRE Educational Management System MVP that focuses on **WHAT** and **WHY** (not technical implementation). The specification should include:

### 1. Problem Statement
Detail the current challenges facing Fronteira Municipality:
- Manual student counting and registration processes
- Critical need for daily attendance tracking as "único documento oficial"
- Non-retroactive attendance requirements ("não existe o esquecer")
- Multi-school municipal management complexity
- Mobile accessibility for teachers ("muito rápido que você faz no celular")

### 2. User Stories
Create comprehensive user stories for:
- **System Administrator**: User management across multiple schools
- **Pedagogical Coordinator**: School-level oversight and reporting
- **School Director**: School management and data visualization  
- **Teacher**: Daily attendance marking and class management
- **Secretary**: Read-only access to educational data

### 3. Functional Requirements
Define the 4 essential MVP modules with specific requirements:

**Module 1: User Management and RBAC**
- 5 user types with specific permissions (Admin, Coordenador, Diretor, Professor, Secretário)
- JWT authentication via Supabase
- Multi-school data isolation

**Module 2: School, Class, and Student Registration**
- Municipal school registration system
- Complete student data management with class assignments
- Teacher-to-class association system

**Module 3: Digital Diary - Attendance Control**
- "Abrir aula" workflow for session management
- Immutable attendance records after save
- Observation fields for safety/security notes
- Non-retroactive validation with specialist override

**Module 4: Basic Reports and Active Search**
- Frequency reports by student/class
- Active search for students below 80% attendance
- PDF/Excel export capabilities

### 4. Success Metrics
Define measurable criteria for:
- **Business Success**: Student registration completion, attendance usage adoption
- **Performance**: Page load times, attendance marking speed
- **User Experience**: Teacher onboarding time, admin efficiency

### 5. Acceptance Criteria
Create specific, testable conditions for each module that define when the MVP is complete.

### 6. Constraints and Assumptions
- Must leverage existing codebase assets (gestao_fronteira as primary foundation)
- Brazilian educational system compliance required
- Mobile-first responsive design mandatory
- Real-time data synchronization needed
- Complete audit trail required ("tudo seja auditável")

## Key Requirements for the Spec Document

1. **Focus on Intent, Not Implementation**: Describe what the system should do and why, without specifying technical details
2. **User-Centric Language**: Frame requirements from user perspective and business value
3. **Measurable Outcomes**: Include quantifiable success metrics
4. **Clear Boundaries**: Define what is and isn't included in MVP scope
5. **Risk Identification**: Highlight potential challenges without technical solutions

## Output Format
The specification should be structured as a formal document following spec-kit methodology:
- Clear problem definition
- Explicit user needs with acceptance criteria
- Functional requirements organized by module
- Success metrics with specific targets
- Scope boundaries and constraints

This specification will serve as the foundation for the subsequent /plan phase where technical implementation details will be defined.