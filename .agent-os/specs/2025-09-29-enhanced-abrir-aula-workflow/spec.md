# Spec Requirements Document

> Spec: Enhanced Abrir Aula Workflow
> Created: 2025-09-29

## Overview

Complete the three-phase attendance workflow system (Planning → Attendance → Completion) with automatic 18:00 locking mechanism to enforce Brazilian educational law compliance. This enhancement finalizes the remaining 15% of the existing implementation to achieve 100% MVP readiness while maintaining <1s per student performance on mobile tablets.

## User Stories

### Professor Classroom Attendance Management

As a professor, I want to open an attendance session at the start of class (Planning Phase), mark student attendance efficiently during class (Attendance Phase), and finalize the session before 18:00 daily cutoff (Completion Phase), so that my attendance records are legally compliant, immutable after submission, and optimized for tablet usage in the classroom.

**Detailed Workflow:**

1. **Planning Phase (Pre-Class):**
   - Professor navigates to Digital Diary (Diário de Classe)
   - Selects class (turma), subject (disciplina), and date
   - System validates that no session exists for this class/date
   - Professor clicks "Abrir Aula" button
   - System creates session record with status "planning"
   - UI transitions to Attendance Phase

2. **Attendance Phase (During Class):**
   - System displays AttendanceGrid with all enrolled students
   - Professor marks attendance with touch-friendly interface (Presente/Ausente/Justificado)
   - Each marking persists immediately with <1s response time
   - Professor can add session notes (conteúdo programático)
   - Session remains editable until "Fechar Aula" action

3. **Completion Phase (End of Day):**
   - Professor clicks "Fechar Aula" button (before 18:00)
   - System displays confirmation dialog with attendance summary
   - On confirmation, session status changes to "completed"
   - System locks session permanently (implements "não existe o esquecer")
   - After 18:00, database trigger auto-locks any uncompleted sessions

### School Administrator Compliance Monitoring

As a school administrator (diretor), I want to view which classes have completed attendance sessions and which remain open, so that I can ensure legal compliance and prompt teachers to finalize attendance before the 18:00 daily cutoff.

**Detailed Workflow:**

1. Administrator accesses Dashboard with attendance overview
2. System displays completion status for all classes/sessions today
3. Red indicators show sessions nearing 18:00 cutoff without completion
4. Administrator can view read-only attendance after locking
5. No override capability (strict legal compliance in MVP)

### Parent Guardian Attendance Verification

As a parent guardian (responsável), I want to view my child's attendance records knowing they are immutable legal documents, so that I trust the accuracy and can identify patterns requiring intervention.

**Detailed Workflow:**

1. Guardian logs into parent portal
2. Views child's attendance history with timestamps
3. System displays "Documento Legal Oficial" badge on completed sessions
4. Guardian sees attendance locked after 18:00 with explanation of "não existe o esquecer" principle
5. Guardian can request justification for absences through system

## Spec Scope

1. **Three-Phase Workflow Completion** - Finalize Planning → Attendance → Completion state transitions with proper UI indicators for each phase
2. **Automatic 18:00 Locking Mechanism** - Implement database trigger to auto-lock uncompleted sessions at daily cutoff with read-only enforcement
3. **Immutability UI/API Enforcement** - Prevent retroactive modifications after session completion through API validation and disabled UI elements
4. **Mobile Tablet Optimization** - Ensure touch targets ≥44px, responsive grid layout, and offline-friendly marking with optimistic updates
5. **Performance Maintenance** - Maintain <1s per student marking performance through database indexing and query optimization

## Out of Scope

- Comprehensive audit trail system (separate 8h feature)
- Admin override capabilities for locked sessions (post-MVP)
- Advanced analytics dashboard (Phase 2)
- WhatsApp notifications for parents (Phase 2)
- Bolsa Família integration enhancements (separate feature, already 80% complete)
- Emergency attendance editing with approval workflow (post-MVP stabilization)

## Expected Deliverable

1. Professor can complete full three-phase workflow (Planning → Attendance → Completion) with visual indicators for current phase and status
2. Sessions automatically lock at 18:00 daily cutoff with clear UI message explaining immutability principle to users attempting access
3. Attendance marking maintains <1s per student performance on mobile tablets (375x667px) with touch-friendly interface (≥44px targets)