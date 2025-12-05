# Raw Idea: Diário de Classe (Class Diary)

## Feature Description

Sistema completo para professor registrar aulas, frequência e notas. Esta é a feature principal do MVP do EDUCA - sistema de gestão educacional municipal para Fronteira/MG.

## Context

### Target Audience
- Professores de escolas municipais
- 5-15 escolas municipais
- 1.000-5.000 alunos total

### Device Requirements
- Tablets (primary device for classroom use)
- Celulares (mobile phones for on-the-go access)
- Desktops (school office computers)
- **Must work seamlessly on all devices**

### Timeline
- **Target Launch**: Fevereiro 2025 (início do ano letivo)
- **Critical**: Ready for start of school year

### Primary User
- **Professor** (teacher)
- **User Experience Goal**: Professor deve estar encantado com a experiência
- **Priority**: Exceptional UX for teachers is mandatory

## Current State

### Already Implemented (90% ready)
- Cadastro de alunos (student registration)
- Escolas (schools)
- Turmas (classes)
- Usuários (users with 5-role RBAC)

### Needs Improvement
- **Frequência básica existe** - Basic attendance exists but needs enhancement
- Core attendance workflows are functional but require UX improvements

### Not Yet Implemented
- **Notas** - Grade management system
- **Conteúdo de aula** - Lesson content/planning system

## Feature Scope

This feature encompasses three main components:

1. **Registro de Aulas** (Lesson Recording)
   - Record what was taught in class
   - Lesson planning and content documentation
   - Integration with academic calendar

2. **Frequência** (Attendance)
   - Enhancement of existing basic attendance system
   - "Abrir aula" workflow improvements
   - Legal compliance with Brazilian educational standards
   - Non-retroactive attendance marking ("não existe o esquecer")

3. **Notas** (Grades)
   - Quarterly grading system
   - Semester observations
   - Brazilian educational standards compliance
   - Grade calculations and reporting

## Success Criteria

- Teachers can register complete class information (lesson + attendance + grades) in < 5 minutes
- System works flawlessly on tablets in classroom environment
- UI is intuitive enough that teachers don't need extensive training
- Compliance with Brazilian educational standards (INEP, Educacenso)
- Data persistence and legal immutability for attendance records
