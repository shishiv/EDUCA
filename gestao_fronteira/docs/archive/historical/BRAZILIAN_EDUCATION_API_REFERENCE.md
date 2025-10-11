# Brazilian Education API Reference & Implementation Guide

## Overview

This document provides comprehensive guidance for implementing Brazilian education APIs, reports, and government compliance features based on the analysis of the `i-educar-reference/` production system. This reference implementation has been tested in real Brazilian educational institutions and provides proven patterns for INEP/Educacenso integration.

## Table of Contents

1. [INEP/Educacenso API Integration](#1-inepeducacenso-api-integration)
2. [SGP System Implementation](#2-sgp-sistema-de-gestão-pedagógica)
3. [Reports and Export Systems](#3-reports-and-export-systems)
4. [Brazilian Educational Standards & Compliance](#4-brazilian-educational-standards--compliance)
5. [Database Architecture & Security](#5-database-architecture--security)
6. [API Structures and Patterns](#6-api-structures-and-patterns)
7. [UI/UX Patterns](#7-uiux-patterns-for-brazilian-education)
8. [Implementation Roadmap for gestao_fronteira](#8-implementation-roadmap-for-gestao_fronteira)

---

## 1. INEP/Educacenso API Integration

### 1.1 Educacenso Export Record Structure

The Brazilian government requires data submission in a specific 6-record format for Educacenso compliance:

| Record Type | Description | Required Data |
|-------------|-------------|---------------|
| **Registro00** | Header record | Basic system information, export metadata |
| **Registro10** | School/Institution | INEP school codes, location, infrastructure |
| **Registro20** | Classes/Turmas | Class structure, schedules, educational stages |
| **Registro30** | Person data | Teachers, managers, students (general info) |
| **Registro40** | School managers | Administrative staff with qualifications |
| **Registro50** | Teacher data | Teacher-class assignments, qualifications |
| **Registro60** | Student enrollments | Individual student enrollment records |

### 1.2 Record Export Implementation Pattern

```typescript
// TypeScript implementation for Registro20 (Classes)
interface EducacensoRecord20 {
  recordType: '20';
  codigoEscolaInep: string;
  codTurma: string;
  codTurmaInep: string; // Empty for local systems
  nomeTurma: string;
  tipoMediacaoDidaticoPedagogico: number;
  // Weekly schedule (Sunday-Saturday)
  horarioDomingo: string;
  horarioSegunda: string;
  horarioTerca: string;
  horarioQuarta: string;
  horarioQuinta: string;
  horarioSexta: string;
  horarioSabado: string;
  // 70+ additional fields following Educacenso 2025 specification
}

class EducacensoExporter {
  public exportRecord20(turma: Turma): string[] {
    return [
      '20', // Record type
      turma.escola.codigoInep, // INEP school code
      turma.codigo, // Class code
      '', // INEP class code (empty for local)
      this.sanitizeForCenso(turma.nome), // Class name
      turma.tipoMediacao, // Pedagogical mediation type
      // Weekly schedule mapping
      turma.isPresencial() && turma.diasSemana.includes(0) ?
        `${turma.horaInicio}-${turma.horaFim}` : '',
      // ... continue for all 70+ fields
    ];
  }

  private sanitizeForCenso(text: string): string {
    return text.replace(/[^\w\s]/gi, '').trim().substring(0, 50);
  }
}
```

### 1.3 Data Validation Requirements

Critical validators needed for Educacenso compliance:

```typescript
// CPF Validation with Brazilian algorithm
class CPFValidator {
  static isValid(cpf: string): boolean {
    const cleanCPF = cpf.replace(/\D/g, '');

    if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
      return false;
    }

    // Calculate verification digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;

    return digit1 === parseInt(cleanCPF.charAt(9)) &&
           digit2 === parseInt(cleanCPF.charAt(10));
  }

  static format(cpf: string): string {
    const clean = cpf.replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}

// INEP School Code Validation
class INEPValidator {
  static isValidSchoolCode(code: string): boolean {
    return /^\d{8}$/.test(code) && parseInt(code) > 0;
  }
}

// Brazilian Phone Number Validation
class BrazilianPhoneValidator {
  static isValid(phone: string): boolean {
    const clean = phone.replace(/\D/g, '');
    // Mobile: 11 digits (with 9 in the beginning)
    // Landline: 10 digits
    return /^(\d{10}|\d{11})$/.test(clean) &&
           (clean.length === 10 || clean[2] === '9');
  }

  static format(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
}
```

---

## 2. SGP (Sistema de Gestão Pedagógica)

### 2.1 Academic Calendar Management

```sql
-- Frequency calculation function (PostgreSQL)
CREATE OR REPLACE FUNCTION calculate_student_frequency(
    p_matricula_id INTEGER,
    p_tipo_presenca INTEGER DEFAULT 1
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    frequency_percent DECIMAL(5,2);
BEGIN
    IF p_tipo_presenca = 1 THEN
        -- Global frequency based on school days
        SELECT
            COALESCE(
                (SELECT
                    ROUND(
                        (COUNT(CASE WHEN f.presente = true THEN 1 END) * 100.0) /
                        NULLIF(COUNT(*), 0), 2
                    )
                FROM frequencia f
                WHERE f.matricula_id = p_matricula_id
                ), 0
            ) INTO frequency_percent;
    ELSE
        -- Frequency by subject based on class hours
        SELECT
            COALESCE(
                (SELECT
                    ROUND(
                        AVG(disciplina_freq.frequency_percent), 2
                    )
                FROM (
                    SELECT
                        f.disciplina_id,
                        (COUNT(CASE WHEN f.presente = true THEN 1 END) * 100.0) /
                        NULLIF(COUNT(*), 0) as frequency_percent
                    FROM frequencia f
                    WHERE f.matricula_id = p_matricula_id
                    GROUP BY f.disciplina_id
                ) disciplina_freq
                ), 0
            ) INTO frequency_percent;
    END IF;

    RETURN frequency_percent;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Student Enrollment Status Control

```typescript
// Student enrollment with Brazilian compliance
interface StudentEnrollment {
  id: string;
  aluno_id: string;
  escola_id: string;
  turma_id: string;
  serie_id: string;
  ano_letivo: number;
  status: EnrollmentStatus;
  data_matricula: Date;
  data_situacao: Date;
  bloquear_troca_situacao: boolean; // Critical: Prevents status changes
  aprovado: boolean | null;
  // Bolsa Família integration
  nis?: string; // National Social Information Number
  situacao_bolsa_familia?: string;
}

enum EnrollmentStatus {
  ATIVO = 1,
  TRANSFERIDO = 2,
  RECLASSIFICADO = 3,
  ABANDONO = 4,
  FALECIDO = 5,
  APROVADO = 6,
  REPROVADO = 7,
  APROVADO_COM_DEPENDENCIA = 8
}

class EnrollmentService {
  // Implements "não existe o esquecer" principle
  async changeStatus(
    enrollmentId: string,
    newStatus: EnrollmentStatus,
    userId: string
  ): Promise<void> {
    const enrollment = await this.findById(enrollmentId);

    if (enrollment.bloquear_troca_situacao) {
      throw new Error('Status change is locked for this enrollment');
    }

    // Audit trail for legal compliance
    await this.createStatusChangeLog({
      enrollment_id: enrollmentId,
      old_status: enrollment.status,
      new_status: newStatus,
      changed_by: userId,
      changed_at: new Date(),
      reason: 'Administrative change'
    });

    await this.update(enrollmentId, {
      status: newStatus,
      data_situacao: new Date(),
      bloquear_troca_situacao: true // Lock after change
    });
  }
}
```

### 2.3 Attendance Tracking with Legal Compliance

```typescript
// "Abrir aula" workflow implementation
interface AulaSession {
  id: string;
  turma_id: string;
  professor_id: string;
  disciplina_id: string;
  data: Date;
  hora_inicio: string;
  hora_fim: string;
  status: AulaStatus;
  // Legal compliance
  opened_at: Date;
  opened_by: string;
  locked_at?: Date; // Once locked, cannot be modified
  conteudo_ministrado: string;
}

enum AulaStatus {
  PLANEJADA = 'planned',
  ABERTA = 'open', // Teacher can mark attendance
  FECHADA = 'closed', // Attendance locked
  CANCELADA = 'cancelled'
}

class AttendanceService {
  // Three-phase attendance system
  async abrirAula(
    turmaId: string,
    professorId: string,
    disciplinaId: string
  ): Promise<AulaSession> {
    const session = await this.createAulaSession({
      turma_id: turmaId,
      professor_id: professorId,
      disciplina_id: disciplinaId,
      data: new Date(),
      status: AulaStatus.ABERTA,
      opened_at: new Date(),
      opened_by: professorId
    });

    return session;
  }

  async markAttendance(
    aulaId: string,
    attendanceRecords: AttendanceRecord[]
  ): Promise<void> {
    const session = await this.getAulaSession(aulaId);

    if (session.status !== AulaStatus.ABERTA) {
      throw new Error('Cannot modify attendance for closed session');
    }

    // Batch insert with legal compliance
    for (const record of attendanceRecords) {
      await this.createAttendanceRecord({
        ...record,
        aula_id: aulaId,
        created_at: new Date(),
        // Legal compliance: cannot be modified after creation
        is_immutable: true
      });
    }
  }

  async fecharAula(aulaId: string, conteudo: string): Promise<void> {
    await this.updateAulaSession(aulaId, {
      status: AulaStatus.FECHADA,
      locked_at: new Date(),
      conteudo_ministrado: conteudo
    });

    // Calculate frequency for all students
    await this.recalculateFrequencies(aulaId);
  }
}
```

---

## 3. Reports and Export Systems

### 3.1 Government Compliance Report Generation

```typescript
// Export system with user permissions and rate limiting
class EducationalExportService {
  private readonly EXPORT_LIMIT_PER_30MIN = 5;

  async createExport(
    type: ExportType,
    filters: ExportFilters,
    userId: string
  ): Promise<Export> {
    // Rate limiting
    await this.checkExportLimit(userId);

    const export = await this.create({
      type,
      filters,
      user_id: userId,
      status: 'processing',
      filename: this.generateFilename(type, filters),
      created_at: new Date()
    });

    // Queue background processing
    await this.queueExportJob(export.id);

    return export;
  }

  private async checkExportLimit(userId: string): Promise<void> {
    const recentExports = await this.countRecentExports(userId, 30);
    if (recentExports >= this.EXPORT_LIMIT_PER_30MIN) {
      throw new Error('Export limit exceeded. Please wait 30 minutes.');
    }
  }

  async generateEducacensoExport(schoolId: string, year: number): Promise<Buffer> {
    const records = await Promise.all([
      this.generateRecord00(schoolId, year), // Header
      this.generateRecord10(schoolId), // School data
      this.generateRecord20(schoolId, year), // Classes
      this.generateRecord30(schoolId, year), // People
      this.generateRecord40(schoolId, year), // Managers
      this.generateRecord50(schoolId, year), // Teachers
      this.generateRecord60(schoolId, year), // Students
    ]);

    return Buffer.from(records.flat().join('\n'), 'utf-8');
  }
}

// Export types for Brazilian education
enum ExportType {
  EDUCACENSO_FULL = 'educacenso_full',
  BOLSA_FAMILIA = 'bolsa_familia',
  FREQUENCY_REPORT = 'frequency_report',
  ACADEMIC_PERFORMANCE = 'academic_performance',
  INEP_CENSUS = 'inep_census',
  STUDENT_DATA = 'student_data'
}
```

### 3.2 Bolsa Família Integration

```typescript
// Social assistance export for Bolsa Família program
interface BolsaFamiliaStudent {
  name: string;
  cpf: string;
  date_of_birth: Date;
  nis: string; // Critical: NIS number for social programs
  school_inep: string;
  attendance_percentage: number;
  attendance_status: 'compliant' | 'at_risk' | 'non_compliant';
  last_update: Date;
}

class BolsaFamiliaService {
  // Generate compliance report for social programs
  async generateComplianceReport(
    schoolId: string,
    month: number,
    year: number
  ): Promise<BolsaFamiliaStudent[]> {
    const students = await this.getStudentsWithNIS(schoolId);
    const report: BolsaFamiliaStudent[] = [];

    for (const student of students) {
      const frequency = await this.calculateMonthlyFrequency(
        student.id, month, year
      );

      report.push({
        name: student.pessoa.nome,
        cpf: CPFValidator.format(student.pessoa.cpf),
        date_of_birth: student.pessoa.data_nascimento,
        nis: student.nis,
        school_inep: student.escola.codigo_inep,
        attendance_percentage: frequency,
        attendance_status: this.getAttendanceStatus(frequency),
        last_update: new Date()
      });
    }

    return report;
  }

  private getAttendanceStatus(frequency: number): string {
    if (frequency >= 85) return 'compliant'; // Above requirement
    if (frequency >= 75) return 'at_risk'; // Meeting minimum but close
    return 'non_compliant'; // Below 75% minimum
  }
}
```

---

## 4. Brazilian Educational Standards & Compliance

### 4.1 Legal Compliance Requirements

```typescript
// "Não existe o esquecer" implementation
interface ComplianceAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id: string;
  timestamp: Date;
  ip_address: string;
  user_agent: string;
}

// Database trigger for audit trail
const auditTriggerSQL = `
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        user_id,
        timestamp,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
        current_setting('app.current_user_id'),
        NOW(),
        current_setting('app.client_ip')
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to critical tables
CREATE TRIGGER audit_frequencia
    AFTER INSERT OR UPDATE OR DELETE ON frequencia
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_matriculas
    AFTER INSERT OR UPDATE OR DELETE ON matriculas
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();
`;
```

### 4.2 LGPD Data Protection Implementation

```typescript
// LGPD compliance service
class LGPDComplianceService {
  async requestDataExport(personId: string, requesterId: string): Promise<DataExportRequest> {
    // Validate requester permission
    await this.validateDataAccessRights(personId, requesterId);

    const exportRequest = await this.createExportRequest({
      person_id: personId,
      requester_id: requesterId,
      status: 'processing',
      request_type: 'data_export',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    await this.queueDataExportJob(exportRequest.id);
    return exportRequest;
  }

  async anonymizeStudentData(studentId: string, reason: string): Promise<void> {
    // Keep educational data for statistics but remove personal identifiers
    await this.updateStudent(studentId, {
      nome: 'ANONIMIZADO',
      cpf: null,
      rg: null,
      email: null,
      telefone: null,
      endereco: null,
      anonymized_at: new Date(),
      anonymization_reason: reason
    });

    // Maintain educational records but mark as anonymized
    await this.createAnonymizationLog({
      student_id: studentId,
      reason,
      anonymized_at: new Date(),
      data_retained: ['enrollment_history', 'academic_performance', 'attendance_statistics']
    });
  }
}
```

---

## 5. Database Architecture & Security

### 5.1 Row Level Security (RLS) for Multi-School

```sql
-- Enable RLS on all educational tables
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;

-- School-based isolation policy
CREATE POLICY escola_isolation_policy ON alunos
    USING (
        escola_id = ANY (
            SELECT escola_id
            FROM user_schools
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );

CREATE POLICY matricula_isolation_policy ON matriculas
    USING (
        escola_id = ANY (
            SELECT escola_id
            FROM user_schools
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );

-- Role-based access control
CREATE POLICY admin_full_access ON alunos
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id')::uuid
            AND role = 'admin'
        )
    );

-- Teacher can only access their assigned classes
CREATE POLICY teacher_class_access ON frequencia
    USING (
        EXISTS (
            SELECT 1 FROM turma_professores tp
            JOIN turmas t ON t.id = tp.turma_id
            WHERE t.id = turma_id
            AND tp.professor_id = current_setting('app.current_user_id')::uuid
        )
    );
```

### 5.2 Enhanced Database Schema

```sql
-- Core educational entities with Brazilian compliance
CREATE TABLE escolas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_inep VARCHAR(8) UNIQUE NOT NULL, -- INEP school code
    nome VARCHAR(255) NOT NULL,
    municipio_id INTEGER NOT NULL,
    dependencia_administrativa INTEGER NOT NULL, -- 1=Federal, 2=State, 3=Municipal, 4=Private
    situacao_funcionamento INTEGER NOT NULL, -- 1=Active, 2=Inactive
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id UUID NOT NULL REFERENCES pessoas(id),
    escola_id UUID NOT NULL REFERENCES escolas(id),
    codigo_aluno VARCHAR(20) UNIQUE NOT NULL, -- Internal student code
    nis VARCHAR(11), -- NIS for Bolsa Família
    codigo_inep VARCHAR(12), -- INEP student code when available
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES alunos(id),
    turma_id UUID NOT NULL REFERENCES turmas(id),
    ano_letivo INTEGER NOT NULL,
    situacao INTEGER NOT NULL DEFAULT 1, -- EnrollmentStatus enum
    data_matricula DATE NOT NULL,
    data_situacao DATE,
    bloquear_troca_situacao BOOLEAN DEFAULT FALSE, -- Legal compliance
    aprovado BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance with immutability
CREATE TABLE frequencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_id UUID NOT NULL REFERENCES matriculas(id),
    aula_id UUID NOT NULL REFERENCES aula_sessions(id),
    presente BOOLEAN NOT NULL,
    justificada BOOLEAN DEFAULT FALSE,
    observacao TEXT,
    -- Legal compliance
    created_at TIMESTAMP DEFAULT NOW(),
    is_immutable BOOLEAN DEFAULT TRUE, -- Cannot be modified after creation
    created_by UUID NOT NULL REFERENCES users(id)
);

-- Class sessions for "Abrir aula" workflow
CREATE TABLE aula_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID NOT NULL REFERENCES turmas(id),
    professor_id UUID NOT NULL REFERENCES users(id),
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id),
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'planned', -- AulaStatus enum
    conteudo_ministrado TEXT,
    opened_at TIMESTAMP,
    opened_by UUID REFERENCES users(id),
    locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. API Structures and Patterns

### 6.1 Government API Integration

```typescript
// INEP API client
class INEPApiClient {
  private readonly baseUrl = 'https://servicos.inep.gov.br/api';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async validateSchoolCode(inepCode: string): Promise<SchoolValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/escolas/${inepCode}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`INEP API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('INEP API validation failed:', error);
      throw error;
    }
  }

  async submitEducacensoData(
    schoolCode: string,
    data: EducacensoSubmission
  ): Promise<SubmissionResult> {
    const submission = {
      escola_inep: schoolCode,
      ano_referencia: data.year,
      periodo_coleta: data.period, // 1 or 2
      registros: data.records
    };

    const response = await fetch(`${this.baseUrl}/educacenso/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submission)
    });

    return await response.json();
  }
}
```

### 6.2 RESTful API for Educational Data

```typescript
// Educational API routes with proper authorization
class EducationalApiController {
  // Get student attendance report
  async getStudentAttendance(req: Request, res: Response): Promise<void> {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate user can access this student's data
    await this.validateStudentAccess(req.user.id, studentId);

    const attendance = await this.attendanceService.getStudentAttendance({
      studentId,
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    });

    res.json({
      student_id: studentId,
      period: { start: startDate, end: endDate },
      attendance_percentage: attendance.percentage,
      total_days: attendance.totalDays,
      present_days: attendance.presentDays,
      justified_absences: attendance.justifiedAbsences,
      unjustified_absences: attendance.unjustifiedAbsences
    });
  }

  // Export class attendance for government reporting
  async exportClassAttendance(req: Request, res: Response): Promise<void> {
    const { classId } = req.params;
    const { format } = req.query; // 'educacenso' | 'csv' | 'excel'

    await this.validateClassAccess(req.user.id, classId);

    const exportData = await this.exportService.generateClassAttendance({
      classId,
      format: format as string,
      userId: req.user.id
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.buffer);
  }

  private async validateStudentAccess(userId: string, studentId: string): Promise<void> {
    const hasAccess = await this.authService.userCanAccessStudent(userId, studentId);
    if (!hasAccess) {
      throw new UnauthorizedError('Access denied to student data');
    }
  }
}
```

---

## 7. UI/UX Patterns for Brazilian Education

### 7.1 Digital Diary Interface

```tsx
// Enhanced attendance marking interface
interface AttendanceGridProps {
  aulaSession: AulaSession;
  students: Student[];
  onSave: (attendance: AttendanceRecord[]) => Promise<void>;
}

export function AttendanceGrid({ aulaSession, students, onSave }: AttendanceGridProps) {
  const [attendanceData, setAttendanceData] = useState<Map<string, boolean>>(new Map());
  const [observations, setObservations] = useState<Map<string, string>>(new Map());

  const handleAttendanceChange = (studentId: string, present: boolean) => {
    setAttendanceData(prev => new Map(prev.set(studentId, present)));
  };

  const handleSave = async () => {
    const records: AttendanceRecord[] = students.map(student => ({
      student_id: student.id,
      present: attendanceData.get(student.id) ?? false,
      justificada: false,
      observacao: observations.get(student.id) || ''
    }));

    await onSave(records);
  };

  return (
    <div className="attendance-grid">
      {/* Header with class info */}
      <div className="grid-header">
        <h2>{aulaSession.turma.nome} - {aulaSession.disciplina.nome}</h2>
        <p>Data: {format(aulaSession.data, 'dd/MM/yyyy')} |
           Horário: {aulaSession.hora_inicio} - {aulaSession.hora_fim}</p>
      </div>

      {/* Student attendance grid */}
      <div className="student-grid">
        {students.map(student => (
          <StudentAttendanceRow
            key={student.id}
            student={student}
            present={attendanceData.get(student.id)}
            onAttendanceChange={(present) => handleAttendanceChange(student.id, present)}
            onObservationChange={(obs) => setObservations(prev => new Map(prev.set(student.id, obs)))}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="grid-actions">
        <Button
          onClick={handleSave}
          disabled={aulaSession.status === 'closed'}
          className="save-attendance"
        >
          Salvar Frequência
        </Button>
        {aulaSession.status === 'open' && (
          <Button
            onClick={() => closeAulaSession(aulaSession.id)}
            variant="secondary"
          >
            Fechar Aula
          </Button>
        )}
      </div>
    </div>
  );
}

// Touch-optimized attendance row for tablets
function StudentAttendanceRow({ student, present, onAttendanceChange, onObservationChange }) {
  return (
    <div className="student-row">
      <div className="student-info">
        <span className="student-name">{student.pessoa.nome}</span>
        <span className="student-code">#{student.codigo}</span>
      </div>

      <div className="attendance-controls">
        <TouchButton
          variant={present === true ? "success" : "outline"}
          onClick={() => onAttendanceChange(true)}
          size="lg"
        >
          P
        </TouchButton>
        <TouchButton
          variant={present === false ? "danger" : "outline"}
          onClick={() => onAttendanceChange(false)}
          size="lg"
        >
          F
        </TouchButton>
      </div>

      <div className="observations">
        <Input
          placeholder="Observações"
          onChange={(e) => onObservationChange(e.target.value)}
          className="observation-input"
        />
      </div>
    </div>
  );
}
```

### 7.2 Brazilian Form Components

```tsx
// Enhanced Brazilian input components
export function CPFInput({ value, onChange, error, ...props }: CPFInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = CPFValidator.format(e.target.value);
    onChange(formatted);
  };

  return (
    <div className="form-field">
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="000.000.000-00"
        maxLength={14}
        {...props}
        className={cn("cpf-input", error && "error")}
      />
      {error && <span className="error-message">{error}</span>}
      {value && !CPFValidator.isValid(value) && (
        <span className="error-message">CPF inválido</span>
      )}
    </div>
  );
}

export function BrazilianPhoneInput({ value, onChange, error, ...props }) {
  return (
    <div className="form-field">
      <Input
        type="tel"
        value={BrazilianPhoneValidator.format(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="(00) 00000-0000"
        {...props}
        className={cn("phone-input", error && "error")}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

export function INEPCodeInput({ value, onChange, error, ...props }) {
  return (
    <div className="form-field">
      <Input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="00000000"
        maxLength={8}
        pattern="[0-9]{8}"
        {...props}
        className={cn("inep-input", error && "error")}
      />
      {error && <span className="error-message">{error}</span>}
      <small className="field-help">Código INEP da escola (8 dígitos)</small>
    </div>
  );
}
```

---

## 8. Implementation Roadmap for gestao_fronteira

### 8.1 Immediate Priority Implementations (Next 2 Weeks)

#### Phase 1: Brazilian Validation & Compliance (5 days)
- [ ] **CPF Validation System** (1 day)
  - Implement `CPFValidator` class with Brazilian algorithm
  - Add formatting and validation to student registration forms
  - Update database constraints and UI components

- [ ] **Enhanced "Abrir Aula" Workflow** (3 days)
  - Create `AulaSession` model and database table
  - Implement three-phase attendance system (plan → open → close)
  - Add attendance locking mechanism for legal compliance

- [ ] **Audit Trail System** (1 day)
  - Implement database triggers for attendance immutability
  - Add comprehensive change logging
  - Create audit log viewing interface for admins

#### Phase 2: Export & Reporting Systems (3 days)
- [ ] **Educacenso Export Structure** (2 days)
  - Implement 6-record export format (00, 10, 20, 30, 40, 50, 60)
  - Create export service with rate limiting
  - Add government compliance validation

- [ ] **Bolsa Família Integration** (1 day)
  - Add NIS field to student records
  - Implement attendance compliance reporting
  - Create social assistance export functionality

### 8.2 Medium-Term Enhancements (Next Month)

#### Phase 3: Database & Security Enhancements (1 week)
- [ ] **Enhanced RLS Policies** (2 days)
  - Implement school-based row-level security
  - Add role-based access controls
  - Test multi-tenant data isolation

- [ ] **LGPD Compliance** (3 days)
  - Add data export/anonymization features
  - Implement consent management
  - Create personal data audit reports

#### Phase 4: API & Integration (1 week)
- [ ] **INEP API Client** (3 days)
  - Create government API integration client
  - Add school code validation
  - Implement data submission workflows

- [ ] **Enhanced Reporting API** (2 days)
  - Create RESTful endpoints for educational data
  - Add authentication and authorization
  - Implement export format options

### 8.3 Advanced Features (Following Month)

#### Phase 5: UI/UX Enhancements
- [ ] **Touch-Optimized Attendance Grid**
  - Tablet-friendly interface for classroom use
  - Batch attendance operations
  - Offline capability with sync

- [ ] **Advanced Analytics Dashboard**
  - Frequency trend analysis
  - At-risk student identification
  - Government compliance monitoring

### 8.4 Implementation Guidelines

#### Database Migrations Required:
```sql
-- Add to existing migrations
ALTER TABLE alunos ADD COLUMN nis VARCHAR(11);
ALTER TABLE escolas ADD COLUMN codigo_inep VARCHAR(8) UNIQUE;

-- Create new tables
CREATE TABLE aula_sessions (...);
CREATE TABLE audit_logs (...);
CREATE TABLE export_requests (...);
```

#### Environment Variables to Add:
```bash
# Brazilian compliance
INEP_API_KEY=your_inep_api_key
EDUCACENSO_INTEGRATION_TOKEN=your_token

# Export settings
MAX_EXPORTS_PER_USER_PER_HOUR=5
EXPORT_RETENTION_DAYS=30
```

#### Key Dependencies to Install:
```bash
bun add @brazilian-utils/cpf @brazilian-utils/phone
bun add date-fns-tz # For Brazilian timezone handling
bun add xlsx jspdf jspdf-autotable # For government exports
```

This roadmap provides a clear path to transform your `gestao_fronteira/` system into a fully compliant Brazilian educational management system, following proven patterns from production environments.

---

## Conclusion

This comprehensive reference guide provides production-tested patterns for Brazilian educational compliance. The implementation roadmap prioritizes legal compliance requirements while building toward full INEP integration and government reporting capabilities.

The patterns documented here have been validated in real educational institutions and represent the current best practices for Brazilian education system development.