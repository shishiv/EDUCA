# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-09-18-abrir-aula-workflow/spec.md

> Created: 2025-09-18
> Status: Ready for Implementation

## Tasks

### 1. ✅ Database Schema Implementation (COMPLETED)

- [x] 1.1 Write comprehensive test suite for aulas_abertas table structure and constraints
- [x] 1.2 Create Supabase migration for aulas_abertas table with proper indexes and constraints
- [x] 1.3 Write tests for frequencia table enhancements (aula_id, time-lock columns)
- [x] 1.4 Apply migration to enhance frequencia table with time-lock mechanism
- [x] 1.5 Write tests for Row Level Security (RLS) policies for professor-class access
- [x] 1.6 Implement RLS policies for aulas_abertas and enhanced frequencia tables
- [x] 1.7 Write tests for database triggers and automated time-lock functions
- [x] 1.8 Create database triggers for automatic status transitions and audit logging

### 2. ✅ Core API Development (COMPLETED)

- [x] 2.1 Write test suite for POST /api/aulas/abrir endpoint with edge cases
- [x] 2.2 Implement /api/aulas/abrir endpoint with professor validation and conflict handling
- [x] 2.3 Write tests for PUT /api/aulas/{id}/fechar endpoint with time-lock logic
- [x] 2.4 Implement class session closing endpoint with attendance submission validation
- [x] 2.5 Write tests for GET /api/aulas/{id}/status endpoint with real-time data
- [x] 2.6 Create class session status endpoint for frontend polling and updates
- [x] 2.7 Write tests for PUT /api/frequencia/submit with time-lock verification
- [x] 2.8 Implement enhanced attendance submission with immutability enforcement

### 3. ✅ Frontend Components Development (COMPLETED)

- [x] 3.1 Write unit tests for AbrirAulaButton component
- [x] 3.2 Create AbrirAulaButton component with loading states and error handling
- [x] 3.3 Implement click handler with API integration and optimistic updates
- [x] 3.4 Add visual feedback for success/error states with Portuguese messages
- [x] 3.5 Write unit tests for AulaStatusIndicator component
- [x] 3.6 Create AulaStatusIndicator component with real-time status updates
- [x] 3.7 Integrate components into existing gestao_fronteira attendance pages
- [x] 3.8 Verify all component tests pass with mobile responsiveness

### 4. ✅ Teacher Dashboard Integration (COMPLETED)

- [x] 4.1 Write tests for turma selection with aula status display
- [x] 4.2 Modify existing turma selection to show current aula status
- [x] 4.3 Update AttendanceGrid to respect aula aberta state
- [x] 4.4 Implement conditional rendering for attendance controls
- [x] 4.5 Add session timer and time-lock countdown display
- [x] 4.6 Write integration tests for complete dashboard workflow
- [x] 4.7 Test professor workflow from login to attendance submission
- [x] 4.8 Verify all dashboard integration tests pass

### 5. Real-time Features Implementation

- [ ] 5.1 Write tests for Supabase real-time subscriptions
- [ ] 5.2 Set up real-time listener for aulas_abertas table changes
- [ ] 5.3 Implement automatic UI updates on aula status transitions
- [ ] 5.4 Add real-time notifications for session events
- [ ] 5.5 Handle connection states and error recovery gracefully
- [ ] 5.6 Test real-time features across multiple browser sessions
- [ ] 5.7 Optimize subscription performance and memory cleanup
- [ ] 5.8 Verify all real-time feature tests pass

### 6. Testing and Integration

- [ ] 6.1 Write comprehensive E2E tests for "Abrir Aula" workflow
- [ ] 6.2 Implement Playwright tests for mobile teacher scenarios
- [ ] 6.3 Write performance tests for attendance speed (< 1s per student)
- [ ] 6.4 Test security enforcement and RLS policy compliance
- [ ] 6.5 Validate Brazilian educational compliance requirements
- [ ] 6.6 Test backward compatibility with existing attendance system
- [ ] 6.7 Run load testing for concurrent teacher sessions
- [ ] 6.8 Verify all tests pass and performance targets are met