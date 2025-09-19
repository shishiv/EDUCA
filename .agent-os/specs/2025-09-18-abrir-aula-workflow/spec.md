# Spec Requirements Document

> Spec: Abrir Aula Workflow for Digital Attendance
> Created: 2025-09-18
> Status: Planning

## Overview

Implement the "Abrir aula" (Open Class) workflow that requires teachers to formally open a class session before marking digital attendance, ensuring Brazilian educational compliance through immutable attendance records with time-locked submission capabilities.

## User Stories

### Story 1: Teacher Class Session Management
As a **professor**, I want to select my assigned classes and open a formal class session so that I can mark attendance in compliance with Brazilian educational regulations requiring the digital diary as the "único documento oficial" (sole official document).

**Workflow Details:**
- Login to the system and view my assigned classes (e.g., "1º ano E")
- See student overview with attendance percentage, performance indicators, previous class history, and class diary options
- Click "Abrir aula" to formally start the class session and unlock attendance marking interface

### Story 2: Digital Attendance Marking with Time Lock
As a **professor**, I want to mark student attendance during an active class session with automatic time-locking capabilities so that attendance records become immutable after submission, ensuring compliance with the "não existe o esquecer" (no forgetting) principle.

**Workflow Details:**
- Access the student list with attendance checkboxes only after opening the class session
- Mark present/absent for each student with mobile-optimized touch interface
- Submit attendance with automatic time-lock activation preventing retroactive changes
- Receive confirmation that attendance record is now legally immutable

### Story 3: Attendance Record Immutability
As a **school administrator**, I want attendance records to be automatically locked after teacher submission so that the system maintains legal compliance and audit trail integrity required by Brazilian educational authorities.

**Workflow Details:**
- Attendance records become read-only after teacher submission and time-lock expiration
- System maintains complete audit trail with timestamps for legal compliance
- Only authorized personnel can view locked records through proper reporting interfaces

## Spec Scope

1. **Class Session Management Interface**
   - Integration with existing gestao_fronteira teacher dashboard
   - Display of assigned classes with student overview (attendance %, performance)
   - "Abrir aula" button to initiate formal class sessions

2. **Mobile-Optimized Attendance Interface**
   - Touch-friendly checkbox interface for tablet/phone use
   - Student list display with photo thumbnails and names
   - Real-time attendance marking with immediate visual feedback

3. **Time-Lock Mechanism**
   - Configurable time window for attendance submission (default: 15 minutes post-submission)
   - Automatic record locking with database-level immutability
   - Visual indicators showing lock status and remaining edit time

4. **Legal Compliance Features**
   - Complete audit trail with timestamps for all attendance actions
   - Database constraints preventing retroactive modifications
   - Integration with existing RLS (Row Level Security) policies

5. **System Integration**
   - Seamless integration with existing gestao_fronteira 85% complete attendance system
   - Compatibility with existing user roles (professor authentication)
   - Integration with turmas (classes) and matriculas (enrollments) tables

## Out of Scope

1. **Advanced Scheduling Features**
   - Automatic class session scheduling or calendar integration
   - Multi-period or split-session attendance tracking

2. **Grade Management**
   - Performance scoring or gradebook functionality during attendance
   - Academic assessment tools beyond basic attendance tracking

3. **Parent/Guardian Notifications**
   - Real-time absence notifications to responsaveis
   - Automated communication systems

4. **Historical Data Migration**
   - Conversion of existing non-locked attendance records
   - Bulk import/export of historical attendance data

## Expected Deliverable

1. **Functional "Abrir Aula" Workflow**
   - Teachers can successfully open class sessions for assigned classes
   - Attendance interface is accessible only after class session activation
   - All interactions complete within performance targets (< 1 second per student)

2. **Immutable Attendance Records**
   - Attendance submissions automatically lock after configurable time window
   - Database-level constraints prevent any retroactive modifications
   - Complete audit trail accessible through administrative interfaces

3. **Mobile-Responsive Implementation**
   - Touch-optimized interface works seamlessly on teacher tablets/phones
   - Interface maintains usability on screens from 375px to 1920px width
   - Performance targets met: attendance marking < 1 second per student

4. **Brazilian Educational Compliance**
   - System meets "único documento oficial" legal requirements
   - Implements "não existe o esquecer" principle through technical controls
   - Maintains school-based data isolation through existing RLS policies

## Spec Documentation

- Tasks: @.agent-os/specs/2025-09-18-abrir-aula-workflow/tasks.md
- Technical Specification: @.agent-os/specs/2025-09-18-abrir-aula-workflow/sub-specs/technical-spec.md
- Database Schema: @.agent-os/specs/2025-09-18-abrir-aula-workflow/sub-specs/database-schema.md
- API Specification: @.agent-os/specs/2025-09-18-abrir-aula-workflow/sub-specs/api-spec.md
- Tests Coverage: @.agent-os/specs/2025-09-18-abrir-aula-workflow/sub-specs/tests.md