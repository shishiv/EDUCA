# MVP Specification - SRE Educational Management System
**Spec ID**: SRE-MVP-001  
**Created**: 2025-09-13  
**Author**: Claude Code Analysis  
**Version**: 1.0  
**Phase**: Specify → Plan  
**Related Specs**: mvp_specs.md, component-review-and-mvp-analysis.md  

---

## Phase 1: /specify - Product Requirements

### Problem Statement

The Municipality of Fronteira needs a comprehensive digital educational management system to replace manual processes for student registration, attendance tracking, and educational reporting. Current challenges include:

- **Manual student counting**: "Acabou aquela história de ir lá contar os alunos" - no automated student tracking
- **Critical attendance gaps**: Daily frequency tracking is the "único documento oficial" for student monitoring and safety
- **Non-retroactive requirements**: "não existe o esquecer" - strict data integrity requirements for attendance
- **Multi-school complexity**: Municipal system needs centralized management across multiple schools
- **Mobile accessibility**: Teachers need "muito rápido que você faz no celular" - fast mobile attendance marking

### User Stories

#### As a System Administrator
- I want to create and manage user accounts for all educational staff
- I want to assign role-based permissions (Coordenador, Diretor, Professor, Secretário)
- I want to manage multiple schools within the municipality
- I want to ensure all system actions are auditable ("tudo seja auditável")

#### As a School Director
- I want to register and manage classes (turmas) within my school
- I want to assign teachers to specific classes
- I want to view attendance and performance data for my school
- I want to generate reports for educational authorities

#### As a Teacher
- I want to "abrir aula" (open class session) and mark daily attendance
- I want attendance records to be locked after saving ("ele perde o que ele fez")
- I want to add observations for safety and security ("extrema importância para a segurança")
- I want to quickly mark attendance on mobile devices
- I want to handle multiple sessions for doubled classes

#### As a Pedagogical Coordinator
- I want to oversee all classes and teachers in my school
- I want to identify students with attendance below 80% threshold
- I want to generate active search reports for at-risk students
- I want to export data to PDF and Excel formats

### Functional Requirements

#### Module 1: User Management and Access Control (RBAC)
**Priority**: Critical (Foundation requirement)

**FR-1.1**: The system MUST implement role-based access control with exactly 5 user types:
- Administrador do Sistema: Complete system access, manages all schools
- Coordenador Pedagógico: School-level user management, views all class data
- Diretor: School data visualization, class management
- Professor: Class viewing and attendance registration only
- Secretário: Read-only access to basic data

**FR-1.2**: The system MUST use JWT authentication via Supabase
**FR-1.3**: The system MUST enforce school-based data isolation (multi-tenancy)
**FR-1.4**: The system MUST provide admin interface for user creation and management

#### Module 2: School, Class, and Student Registration
**Priority**: Critical (Primary MVP goal)

**FR-2.1**: The system MUST support registration of multiple municipal schools
**FR-2.2**: The system MUST allow Directors and Coordinators to create and manage classes (1º ano A, 6º ano B format)
**FR-2.3**: The system MUST support complete student data entry with class assignment
**FR-2.4**: The system MUST link teachers to their assigned classes
**FR-2.5**: The system MUST provide student visualization for teachers and directors

#### Module 3: Digital Diary - Attendance Control
**Priority**: Critical (Core legal requirement)

**FR-3.1**: Teachers MUST be able to "open class session" (abrir aula) for daily attendance
**FR-3.2**: Attendance marking MUST be locked immediately upon "Salvar Presença"
**FR-3.3**: The system MUST prevent retroactive attendance modifications without specialist authorization
**FR-3.4**: The system MUST provide observation fields for semester notes (safety and security)
**FR-3.5**: The system MUST support multiple class sessions for doubled periods
**FR-3.6**: Each subject teacher (PE, English) MUST have separate diary access

#### Module 4: Basic Reports and Active Search
**Priority**: High (Regulatory compliance)

**FR-4.1**: The system MUST generate attendance frequency reports by class and individual student
**FR-4.2**: The system MUST identify students below 80% attendance threshold
**FR-4.3**: The system MUST export reports to PDF and Excel formats
**FR-4.4**: The system MUST provide real-time dashboard with attendance statistics

### Success Metrics

#### Business Metrics
- **Student Registration Completion**: 100% of municipal students registered by month-end
- **Daily Attendance Usage**: 95% of teachers using digital attendance within 2 weeks
- **Report Generation**: Active search reports generated within 10 seconds
- **Mobile Adoption**: 80% of attendance marked via mobile devices

#### Technical Metrics  
- **Page Load Performance**: Dashboard loads in < 3 seconds
- **Attendance Marking Speed**: < 1 second per student registration
- **System Availability**: 99.5% uptime during school hours
- **Data Integrity**: 100% attendance record immutability after save

#### User Experience Metrics
- **Teacher Onboarding**: New teachers can mark attendance within 5 minutes of training
- **Admin Efficiency**: User creation process completed in < 2 minutes
- **Report Accessibility**: Reports generated and downloaded in < 30 seconds

---

## Phase 2: /plan - Technical Implementation

### Architecture Decision

**Primary Foundation**: gestao_fronteira project (80% MVP functionality complete)
**Justification**: 
- Complete database schema with educational domain modeling
- Comprehensive RLS security policies implemented
- PDF/Excel export infrastructure already integrated
- Production-ready attendance and student management systems

### Technology Stack

#### Frontend Framework
**Choice**: Next.js 14 with App Router
**Rationale**: 
- Proven implementation in fronteira-educa-digital
- Superior SEO and performance for educational dashboards
- Built-in authentication integration with Supabase

#### Database and Backend
**Choice**: Supabase with gestao_fronteira migration schema
**Implementation**:
```sql
-- Core tables already implemented:
CREATE TABLE users (admin, diretor, secretario, professor, responsavel)
CREATE TABLE escolas (school management with multi-tenancy)
CREATE TABLE alunos (comprehensive student data)
CREATE TABLE turmas (class management with capacity tracking)
CREATE TABLE matriculas (enrollment lifecycle)
CREATE TABLE frequencia (daily attendance with justification)
```

#### UI Component System
**Choice**: shadcn/ui + Tailwind CSS
**Assets Available**:
- 47 pre-built components across all projects
- Consistent design system implementation  
- Mobile-responsive components proven in production

#### State Management
**Choice**: React Query + Zustand
**Implementation**: Leverage existing patterns from gestao_fronteira
- Real-time data synchronization with Supabase
- Optimistic updates for attendance marking
- Cached report generation

### Implementation Phases

#### Phase 1: Foundation (Weeks 1-2) - 80 hours
**Database Setup**:
- Deploy gestao_fronteira schema with RLS policies
- Generate TypeScript types from Supabase schema
- Create development seed data

**Authentication System**:
- Migrate AuthGuard component from fronteira-educa-digital
- Implement admin user creation interface (16h)
- Build user management dashboard (24h)
- Add user activation workflows (16h)

**Infrastructure**:
- Project setup using Next.js 14 architecture
- Component library integration from multiple projects
- Error handling and audit logging system

#### Phase 2: Student Registration (Weeks 3-4) - 96 hours
**Student Management**:
- Adapt StudentForm component from fronteira-educa-gest (24h)
- Implement search and filtering with existing patterns (16h)
- Add photo upload using Supabase Storage (12h)
- Build student profile management interface (16h)

**Class Management**:
- Create class registration interface using existing schemas (20h)
- Implement teacher-class assignment system (16h)
- Build student enrollment workflow (24h)
- Add bulk operations for administrative efficiency (8h)

#### Phase 3: Digital Diary (Weeks 5-6) - 88 hours
**Attendance Workflow**:
- Build "Abrir aula" workflow system (24h)
- Implement save-and-lock mechanism with database triggers (16h)
- Create observation system for semester notes (12h)
- Add non-retroactive validation with specialist override (16h)

**Real-time Integration**:
- Connect AttendanceGrid to production database (12h)
- Implement Supabase real-time subscriptions (8h)

#### Phase 4: Reports (Weeks 7-8) - 64 hours
**Report Generation**:
- Build frequency reports using existing chart components (24h)
- Implement 80% threshold active search system (16h)
- Complete PDF export using jsPDF library (16h)
- Add Excel export with existing xlsx integration (8h)

### Security Implementation

#### Row Level Security Policies
**Multi-school Isolation**:
```sql
-- Example policy from gestao_fronteira
CREATE POLICY "Users see own school data only"
  ON alunos FOR SELECT
  USING (escola_id IN (
    SELECT escola_id FROM users WHERE id = auth.uid()
  ));
```

#### Authentication Flow
- JWT token-based authentication via Supabase Auth
- Session management with automatic refresh
- Role-based route protection using AuthGuard component

#### Data Integrity
- Immutable attendance records after save operation
- Audit trail for all user actions with timestamps
- Backup and recovery procedures for educational data

### Performance Optimization

#### Database Performance
- Strategic indexes on frequently queried fields
- Connection pooling for concurrent teacher access
- Query optimization for large student datasets

#### Frontend Performance
- Component lazy loading for large class lists
- Virtual scrolling for student attendance grids
- Optimistic updates for real-time attendance marking
- Caching strategy for report generation

### Mobile Responsiveness

#### Design Approach
- Mobile-first responsive design using Tailwind CSS
- Touch-friendly attendance marking interface
- Offline capability for attendance marking (future phase)
- Progressive Web App features for teacher mobile access

### Risk Mitigation

#### High-Risk Items
**Attendance Workflow Complexity**:
- **Mitigation**: Use proven gestao_fronteira attendance system
- **Contingency**: Simplified attendance marking as fallback

**Export Performance**:
- **Mitigation**: Pre-tested jsPDF and xlsx libraries
- **Contingency**: Server-side report generation if client-side fails

**Multi-school Data Isolation**:
- **Mitigation**: Proven RLS implementation in gestao_fronteira
- **Testing**: Comprehensive access control testing before deployment

### Acceptance Criteria

#### Module 1: User Management
- [ ] Admin can create users with all 5 role types
- [ ] Role-based access control prevents unauthorized data access
- [ ] JWT authentication works across all application routes
- [ ] User activation/deactivation functions correctly

#### Module 2: Student Registration  
- [ ] Complete student data entry form with validation
- [ ] Student-to-class assignment with teacher visibility
- [ ] Search and filter functionality for large student datasets
- [ ] Photo upload and display for student identification

#### Module 3: Digital Diary
- [ ] "Abrir aula" workflow creates attendance session
- [ ] Attendance marking locks immediately after save
- [ ] Observation fields accept semester notes
- [ ] Non-retroactive validation prevents historical changes
- [ ] Mobile interface allows quick attendance marking

#### Module 4: Reports
- [ ] Frequency reports display attendance percentages by student/class
- [ ] Active search identifies students below 80% attendance
- [ ] PDF export generates properly formatted reports
- [ ] Excel export includes all relevant data fields

### Quality Assurance

#### Testing Strategy
- Unit tests for all utility functions and hooks
- Integration tests for authentication and database operations
- End-to-end tests for complete user workflows
- Performance testing with realistic data volumes

#### Security Testing
- Penetration testing of authentication system
- RLS policy validation with test data
- Role-based access control verification
- Data isolation testing across multiple schools

### Deployment Strategy

#### Environment Setup
- Development: Local Supabase instance with seed data
- Staging: Production-like environment for user acceptance testing
- Production: Managed Supabase with automated backups

#### Launch Plan
- Phase 1: Admin and coordinator training (Week 6)
- Phase 2: Teacher training and pilot school deployment (Week 7)
- Phase 3: Full municipal rollout (Week 8)
- Phase 4: Post-launch support and optimization (Week 9+)

### Success Validation

#### Launch Criteria
- All 4 MVP modules pass acceptance testing
- Performance metrics meet defined targets
- Security audit completed with no critical issues
- User training completed for all stakeholder groups
- Data migration from existing systems verified

#### Post-Launch Monitoring
- Daily attendance usage tracking
- System performance monitoring
- User feedback collection and analysis
- Bug tracking and resolution workflow

---

## Implementation Assets Available

Based on component analysis, the following production-ready assets are available for immediate use:

### Database Schema (gestao_fronteira)
- Complete educational management schema
- RLS policies for multi-school security
- Strategic indexes for performance
- Brazilian educational system compliance

### UI Components (Multiple Projects)
- 47 shadcn/ui components across projects
- Authentication components (AuthGuard, LoginForm)
- Student management forms and cards
- Attendance grid with real-time updates
- Dashboard layouts and navigation

### Utilities and Hooks
- Brazilian validation schemas (CPF, phone)
- Authentication hooks with Supabase integration
- Form handling with React Hook Form + Zod
- Date formatting and educational calculations

### Export Infrastructure (gestao_fronteira)
- jsPDF integration for PDF generation
- xlsx library for Excel export  
- Recharts components for data visualization
- Report generation templates

## Estimated Development Effort
**Total**: 328 hours (8.2 weeks)
**Confidence Level**: High (60-70% functionality already implemented)
**Risk Level**: Medium (proven technology stack and existing implementations)

This specification provides the foundation for building a production-ready educational management system that meets all regulatory requirements while leveraging existing development assets for rapid deployment.