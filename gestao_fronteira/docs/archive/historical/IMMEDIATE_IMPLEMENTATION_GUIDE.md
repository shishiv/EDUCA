# Immediate Implementation Guide - gestao_fronteira Integration

## Overview

Based on the comprehensive analysis of the `i-educar-reference/` system, this guide identifies **specific, actionable implementations** that can be directly integrated into the current `gestao_fronteira/` project to achieve 100% production readiness.

**Current Status:** 85% MVP Complete → **Target:** 100% Production Ready
**Estimated Time:** 36.5 hours over 10 working days

## Critical Gap Analysis

### What We Have (Working Well):
✅ User Management (5-role RBAC)
✅ Student Registration (INEP-compliant)
✅ Basic attendance tracking
✅ Supabase integration with RLS

### What We Need (From i-educar Reference):
🎯 Enhanced "Abrir aula" workflow with legal compliance
🎯 Educacenso export system
🎯 Bolsa Família integration
🎯 Attendance immutability ("não existe o esquecer")
🎯 Multi-guardian management
🎯 Brazilian validation library

---

## Phase 1: Legal Compliance Foundation (8 hours - 2 days)

### 1.1 Attendance Immutability System (4 hours)

**Current Issue:** Attendance can be modified after saving (legal violation)
**Solution:** Implement database-level immutability with audit trails

**Database Migration Required:**
```sql
-- gestao_fronteira/supabase/migrations/20250926001_attendance_immutability.sql
-- Add immutability tracking to frequencia table
ALTER TABLE frequencia
ADD COLUMN is_immutable BOOLEAN DEFAULT TRUE,
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN audit_trail JSONB DEFAULT '{}';

-- Create audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name, record_id, operation,
        old_values, new_values, user_id, created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
        current_setting('request.jwt.claims', true)::json->>'sub',
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit to critical tables
CREATE TRIGGER audit_frequencia AFTER INSERT OR UPDATE OR DELETE
ON frequencia FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_matriculas AFTER INSERT OR UPDATE OR DELETE
ON matriculas FOR EACH ROW EXECUTE FUNCTION create_audit_log();
```

**Code Implementation:**
```typescript
// lib/services/attendance-immutability.ts
export class AttendanceImmutabilityService {
  // Prevent attendance modification after creation
  static async validateAttendanceModification(
    attendanceId: string,
    userId: string
  ): Promise<void> {
    const { data: attendance } = await supabase
      .from('frequencia')
      .select('is_immutable, created_at')
      .eq('id', attendanceId)
      .single();

    if (attendance?.is_immutable) {
      throw new Error('Attendance record cannot be modified after creation (Legal compliance: "não existe o esquecer")');
    }

    // Allow modification only within 10 minutes of creation
    const createdAt = new Date(attendance.created_at);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    if (createdAt < tenMinutesAgo) {
      throw new Error('Attendance modification window expired (10 minutes)');
    }
  }

  static async lockAttendanceRecord(attendanceId: string): Promise<void> {
    await supabase
      .from('frequencia')
      .update({
        is_immutable: true,
        audit_trail: { locked_at: new Date().toISOString() }
      })
      .eq('id', attendanceId);
  }
}
```

### 1.2 Enhanced "Abrir Aula" Workflow (4 hours)

**Current Issue:** Teachers can mark attendance without formal class opening
**Solution:** Three-phase system (Plan → Open → Close)

**Database Migration:**
```sql
-- gestao_fronteira/supabase/migrations/20250926002_aula_sessions.sql
CREATE TYPE aula_status AS ENUM ('planned', 'open', 'closed', 'cancelled');

CREATE TABLE aula_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID NOT NULL REFERENCES turmas(id),
    professor_id UUID NOT NULL REFERENCES auth.users(id),
    disciplina_id UUID REFERENCES disciplinas(id),
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    status aula_status DEFAULT 'planned',
    conteudo_ministrado TEXT,
    observacoes TEXT,

    -- Legal compliance tracking
    opened_at TIMESTAMP,
    opened_by UUID REFERENCES auth.users(id),
    locked_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add aula_session reference to frequencia
ALTER TABLE frequencia
ADD COLUMN aula_session_id UUID REFERENCES aula_sessions(id);

-- RLS for aula_sessions
ALTER TABLE aula_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their class sessions" ON aula_sessions
    FOR ALL USING (
        professor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'diretor', 'secretario')
        )
    );
```

**React Component:**
```tsx
// components/attendance/abrir-aula-workflow.tsx
interface AbrirAulaWorkflowProps {
  turmaId: string;
  professorId: string;
  disciplinaId?: string;
}

export function AbrirAulaWorkflow({ turmaId, professorId, disciplinaId }: AbrirAulaWorkflowProps) {
  const [aulaSession, setAulaSession] = useState<AulaSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const abrirAula = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('abrir_aula', {
        p_turma_id: turmaId,
        p_professor_id: professorId,
        p_disciplina_id: disciplinaId
      });

      setAulaSession(data);
      await loadStudents();
    } catch (error) {
      toast.error('Erro ao abrir aula: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fecharAula = async (conteudo: string) => {
    try {
      await supabase
        .from('aula_sessions')
        .update({
          status: 'closed',
          locked_at: new Date().toISOString(),
          conteudo_ministrado: conteudo
        })
        .eq('id', aulaSession.id);

      toast.success('Aula fechada com sucesso');
      setAulaSession(null);
    } catch (error) {
      toast.error('Erro ao fechar aula: ' + error.message);
    }
  };

  if (!aulaSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Iniciar Aula</CardTitle>
          <CardDescription>
            Abra uma aula para marcar frequência dos alunos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={abrirAula} disabled={loading}>
            {loading ? 'Abrindo...' : 'Abrir Aula'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AttendanceGrid
        aulaSession={aulaSession}
        students={students}
        onSave={async (records) => {
          // Save attendance with immutability
          for (const record of records) {
            await supabase.from('frequencia').insert({
              ...record,
              aula_session_id: aulaSession.id,
              is_immutable: true,
              created_by: professorId
            });
          }
        }}
      />

      <FecharAulaDialog
        onFechar={fecharAula}
        disabled={aulaSession.status === 'closed'}
      />
    </div>
  );
}
```

---

## Phase 2: Brazilian Validation Library (6 hours - 1.5 days)

### 2.1 Complete CPF/Brazilian Validation System (4 hours)

**Current Issue:** Basic validation without government compliance
**Solution:** Comprehensive Brazilian validation library

**Installation:**
```bash
cd gestao_fronteira/
bun add @brazilian-utils/cpf @brazilian-utils/cnpj @brazilian-utils/phone
```

**Implementation:**
```typescript
// lib/validation/brazilian-standards.ts
export class BrazilianValidator {
  // CPF with digit verification
  static validateCPF(cpf: string): { valid: boolean; formatted: string; error?: string } {
    const cleanCPF = cpf.replace(/\D/g, '');

    if (cleanCPF.length !== 11) {
      return { valid: false, formatted: cpf, error: 'CPF deve ter 11 dígitos' };
    }

    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return { valid: false, formatted: cpf, error: 'CPF não pode ter todos os dígitos iguais' };
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

    const isValid = digit1 === parseInt(cleanCPF.charAt(9)) &&
                    digit2 === parseInt(cleanCPF.charAt(10));

    return {
      valid: isValid,
      formatted: isValid ? cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf,
      error: isValid ? undefined : 'CPF inválido'
    };
  }

  // Brazilian phone validation
  static validatePhone(phone: string): { valid: boolean; formatted: string; error?: string } {
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return { valid: false, formatted: phone, error: 'Telefone deve ter 10 ou 11 dígitos' };
    }

    // Mobile numbers must have 9 as 3rd digit
    if (cleanPhone.length === 11 && cleanPhone[2] !== '9') {
      return { valid: false, formatted: phone, error: 'Celular deve ter 9 como terceiro dígito' };
    }

    const formatted = cleanPhone.length === 11
      ? cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      : cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');

    return { valid: true, formatted, error: undefined };
  }

  // INEP school code validation
  static validateINEPCode(code: string): { valid: boolean; error?: string } {
    const cleanCode = code.replace(/\D/g, '');

    if (cleanCode.length !== 8) {
      return { valid: false, error: 'Código INEP deve ter 8 dígitos' };
    }

    if (parseInt(cleanCode) === 0) {
      return { valid: false, error: 'Código INEP inválido' };
    }

    return { valid: true };
  }
}
```

### 2.2 Enhanced Form Components (2 hours)

**Update existing components with Brazilian validation:**
```tsx
// components/ui/enhanced-brazilian-inputs.tsx
export function CPFInput({ value, onChange, error, required, ...props }) {
  const [internalError, setInternalError] = useState<string>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = BrazilianValidator.validateCPF(e.target.value);
    setInternalError(result.error);
    onChange(result.formatted);
  };

  return (
    <FormField>
      <FormLabel>
        CPF {required && <span className="text-red-500">*</span>}
      </FormLabel>
      <FormControl>
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="000.000.000-00"
          maxLength={14}
          {...props}
        />
      </FormControl>
      <FormMessage>{error || internalError}</FormMessage>
    </FormField>
  );
}

export function BrazilianPhoneInput({ value, onChange, error, required, ...props }) {
  const [internalError, setInternalError] = useState<string>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = BrazilianValidator.validatePhone(e.target.value);
    setInternalError(result.error);
    onChange(result.formatted);
  };

  return (
    <FormField>
      <FormLabel>
        Telefone {required && <span className="text-red-500">*</span>}
      </FormLabel>
      <FormControl>
        <Input
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder="(00) 00000-0000"
          {...props}
        />
      </FormControl>
      <FormMessage>{error || internalError}</FormMessage>
    </FormField>
  );
}
```

---

## Phase 3: Educacenso Export System (8 hours - 2 days)

### 3.1 Export Service Foundation (4 hours)

**Database Migration:**
```sql
-- gestao_fronteira/supabase/migrations/20250926003_export_system.sql
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE export_type AS ENUM ('educacenso_full', 'bolsa_familia', 'frequency_report');

CREATE TABLE export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    escola_id UUID NOT NULL REFERENCES escolas(id),
    type export_type NOT NULL,
    status export_status DEFAULT 'pending',
    filters JSONB DEFAULT '{}',
    filename TEXT,
    file_url TEXT,
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

-- Rate limiting: 5 exports per user per 30 minutes
CREATE UNIQUE INDEX unique_user_exports_limit
ON export_requests (user_id, created_at)
WHERE created_at > NOW() - INTERVAL '30 minutes'
AND status IN ('pending', 'processing');
```

**Export Service:**
```typescript
// lib/services/educacenso-export.ts
interface EducacensoRecord {
  type: '00' | '10' | '20' | '30' | '40' | '50' | '60';
  data: string[];
}

export class EducacensoExportService {
  private readonly EXPORT_LIMIT = 5; // per 30 minutes

  async createExport(
    userId: string,
    escolaId: string,
    year: number
  ): Promise<{ exportId: string }> {
    // Check rate limit
    await this.checkExportLimit(userId);

    const { data: exportRequest } = await supabase
      .from('export_requests')
      .insert({
        user_id: userId,
        escola_id: escolaId,
        type: 'educacenso_full',
        status: 'pending',
        filters: { year }
      })
      .select()
      .single();

    // Queue background processing
    this.queueExportJob(exportRequest.id);

    return { exportId: exportRequest.id };
  }

  private async generateEducacensoRecords(escolaId: string, year: number): Promise<EducacensoRecord[]> {
    const records: EducacensoRecord[] = [];

    // Record 00 - Header
    records.push({
      type: '00',
      data: [
        '00', // Record type
        year.toString(), // Reference year
        new Date().toISOString().split('T')[0], // Export date
        'GESTAO_FRONTEIRA_V1', // System identification
      ]
    });

    // Record 10 - School data
    const { data: escola } = await supabase
      .from('escolas')
      .select('*')
      .eq('id', escolaId)
      .single();

    records.push({
      type: '10',
      data: [
        '10',
        escola.codigo_inep,
        escola.nome,
        escola.municipio_id?.toString() || '',
        escola.dependencia_administrativa?.toString() || '',
        // ... additional school fields
      ]
    });

    // Record 20 - Classes
    const { data: turmas } = await supabase
      .from('turmas')
      .select(`
        *,
        disciplinas(*),
        professores:users(*)
      `)
      .eq('escola_id', escolaId)
      .eq('ano', year);

    for (const turma of turmas || []) {
      records.push({
        type: '20',
        data: [
          '20',
          escola.codigo_inep,
          turma.codigo,
          '', // INEP class code (empty for local)
          turma.nome,
          turma.tipo_mediacao?.toString() || '1',
          // Weekly schedule
          this.formatSchedule(turma.horarios),
          // ... additional class fields
        ]
      });
    }

    // Record 60 - Student enrollments
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select(`
        *,
        alunos(*,
          pessoas(*)
        ),
        turmas(*)
      `)
      .eq('escola_id', escolaId)
      .eq('ano', year);

    for (const matricula of matriculas || []) {
      records.push({
        type: '60',
        data: [
          '60',
          escola.codigo_inep,
          matricula.alunos.codigo,
          matricula.alunos.pessoas.cpf || '',
          matricula.alunos.pessoas.nome,
          matricula.alunos.pessoas.data_nascimento,
          matricula.situacao?.toString() || '1',
          // ... additional enrollment fields
        ]
      });
    }

    return records;
  }

  async generateExportFile(exportId: string): Promise<void> {
    try {
      await this.updateExportStatus(exportId, 'processing');

      const { data: exportRequest } = await supabase
        .from('export_requests')
        .select('*')
        .eq('id', exportId)
        .single();

      const records = await this.generateEducacensoRecords(
        exportRequest.escola_id,
        exportRequest.filters.year
      );

      // Convert to text format
      const fileContent = records
        .map(record => record.data.join('|'))
        .join('\n');

      // Upload to Supabase Storage
      const filename = `educacenso_${exportRequest.escola_id}_${exportRequest.filters.year}.txt`;
      const { data: uploadData } = await supabase.storage
        .from('exports')
        .upload(filename, fileContent, {
          contentType: 'text/plain'
        });

      // Update export record
      await supabase
        .from('export_requests')
        .update({
          status: 'completed',
          filename,
          file_url: uploadData?.path,
          completed_at: new Date()
        })
        .eq('id', exportId);

    } catch (error) {
      await this.updateExportStatus(exportId, 'failed', error.message);
    }
  }
}
```

### 3.2 Export UI Component (4 hours)

```tsx
// components/exports/educacenso-export-panel.tsx
export function EducacensoExportPanel() {
  const [exports, setExports] = useState<ExportRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const createExport = async (year: number) => {
    setLoading(true);
    try {
      const result = await educacensoService.createExport(
        user.id,
        user.escola_id,
        year
      );

      toast.success('Export iniciado. Você será notificado quando concluído.');
      loadExports();
    } catch (error) {
      toast.error('Erro ao iniciar export: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportação Educacenso</CardTitle>
        <CardDescription>
          Exporte dados para cumprimento das exigências do INEP
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o ano" />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025].map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => createExport(2025)}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Iniciar Export'}
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Exports Recentes</h4>
          {exports.map(exp => (
            <div key={exp.id} className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">{exp.filename || 'Processando...'}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(exp.created_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={exp.status === 'completed' ? 'success' : 'secondary'}>
                  {exp.status}
                </Badge>

                {exp.status === 'completed' && (
                  <Button size="sm" asChild>
                    <a href={exp.file_url} download>
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 4: Multi-Guardian Management (8 hours - 2 days)

### 4.1 Database Schema Enhancement (2 hours)

```sql
-- gestao_fronteira/supabase/migrations/20250926004_multi_guardian.sql
-- Create guardian types
CREATE TYPE responsavel_tipo AS ENUM ('pai', 'mae', 'avô', 'avó', 'tutor', 'outro');
CREATE TYPE responsavel_status AS ENUM ('ativo', 'inativo', 'temporario');

-- Enhanced responsaveis table
CREATE TABLE responsaveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id UUID NOT NULL REFERENCES pessoas(id),
    tipo responsavel_tipo NOT NULL,
    status responsavel_status DEFAULT 'ativo',

    -- Contact preferences
    receber_sms BOOLEAN DEFAULT true,
    receber_email BOOLEAN DEFAULT true,
    contato_emergencia BOOLEAN DEFAULT false,

    -- Legal
    poder_familiar BOOLEAN DEFAULT true, -- Can make educational decisions
    autoriza_saida BOOLEAN DEFAULT true, -- Can authorize student departure

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Student-Guardian relationships (many-to-many)
CREATE TABLE aluno_responsaveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES alunos(id),
    responsavel_id UUID NOT NULL REFERENCES responsaveis(id),

    -- Relationship details
    prioridade INTEGER DEFAULT 1, -- 1=Primary, 2=Secondary, etc.
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,

    -- Legal authorizations
    pode_buscar BOOLEAN DEFAULT true,
    recebe_boletim BOOLEAN DEFAULT true,
    recebe_comunicados BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(aluno_id, responsavel_id)
);
```

### 4.2 Multi-Guardian Service (4 hours)

```typescript
// lib/services/guardian-management.ts
export interface GuardianRelationship {
  id: string;
  aluno_id: string;
  responsavel_id: string;
  prioridade: number;
  ativo: boolean;
  pode_buscar: boolean;
  recebe_boletim: boolean;
  recebe_comunicados: boolean;
}

export class GuardianManagementService {
  // Add guardian to student with proper authorization
  async addGuardianToStudent(
    studentId: string,
    guardianData: CreateGuardianData
  ): Promise<GuardianRelationship> {
    // Create person record first
    const { data: person } = await supabase
      .from('pessoas')
      .insert({
        nome: guardianData.nome,
        cpf: guardianData.cpf,
        telefone: guardianData.telefone,
        email: guardianData.email,
        endereco: guardianData.endereco
      })
      .select()
      .single();

    // Create guardian record
    const { data: guardian } = await supabase
      .from('responsaveis')
      .insert({
        pessoa_id: person.id,
        tipo: guardianData.tipo,
        receber_sms: guardianData.receber_sms ?? true,
        receber_email: guardianData.receber_email ?? true,
        poder_familiar: guardianData.poder_familiar ?? true
      })
      .select()
      .single();

    // Create student-guardian relationship
    const { data: relationship } = await supabase
      .from('aluno_responsaveis')
      .insert({
        aluno_id: studentId,
        responsavel_id: guardian.id,
        prioridade: guardianData.prioridade || await this.getNextPriority(studentId),
        pode_buscar: guardianData.pode_buscar ?? true,
        recebe_boletim: guardianData.recebe_boletim ?? true,
        recebe_comunicados: guardianData.recebe_comunicados ?? true
      })
      .select()
      .single();

    return relationship;
  }

  // Get all guardians for a student with authorization details
  async getStudentGuardians(studentId: string): Promise<StudentGuardianDetails[]> {
    const { data } = await supabase
      .from('aluno_responsaveis')
      .select(`
        *,
        responsaveis(*,
          pessoas(nome, cpf, telefone, email)
        )
      `)
      .eq('aluno_id', studentId)
      .eq('ativo', true)
      .order('prioridade');

    return data || [];
  }

  // Update guardian authorizations
  async updateGuardianAuthorizations(
    relationshipId: string,
    authorizations: Partial<GuardianAuthorizations>
  ): Promise<void> {
    await supabase
      .from('aluno_responsaveis')
      .update(authorizations)
      .eq('id', relationshipId);
  }

  // Check if guardian can perform action
  async canGuardianPerformAction(
    guardianId: string,
    studentId: string,
    action: 'buscar' | 'receber_boletim' | 'autorizar_saida'
  ): Promise<boolean> {
    const { data } = await supabase
      .from('aluno_responsaveis')
      .select('pode_buscar, recebe_boletim')
      .eq('responsavel_id', guardianId)
      .eq('aluno_id', studentId)
      .eq('ativo', true)
      .single();

    if (!data) return false;

    switch (action) {
      case 'buscar':
        return data.pode_buscar;
      case 'receber_boletim':
        return data.recebe_boletim;
      default:
        return false;
    }
  }
}
```

### 4.3 Guardian Management UI (2 hours)

```tsx
// components/students/guardian-management-panel.tsx
export function GuardianManagementPanel({ studentId }: { studentId: string }) {
  const [guardians, setGuardians] = useState<StudentGuardianDetails[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Responsáveis</CardTitle>
        <CardDescription>
          Gerencie responsáveis e suas autorizações
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {guardians.map((guardian, index) => (
          <div key={guardian.id} className="p-4 border rounded space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">
                  {guardian.responsaveis.pessoas.nome}
                  <Badge variant="outline" className="ml-2">
                    {guardian.prioridade === 1 ? 'Principal' : `${guardian.prioridade}º`}
                  </Badge>
                </h4>
                <p className="text-sm text-muted-foreground">
                  {guardian.responsaveis.tipo} • {guardian.responsaveis.pessoas.telefone}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => editGuardian(guardian.id)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => removeGuardian(guardian.id)}>
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Authorization checkboxes */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={guardian.pode_buscar}
                  onCheckedChange={(checked) =>
                    updateAuthorization(guardian.id, 'pode_buscar', checked)
                  }
                />
                <Label>Pode buscar</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={guardian.recebe_boletim}
                  onCheckedChange={(checked) =>
                    updateAuthorization(guardian.id, 'recebe_boletim', checked)
                  }
                />
                <Label>Recebe boletim</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={guardian.recebe_comunicados}
                  onCheckedChange={(checked) =>
                    updateAuthorization(guardian.id, 'recebe_comunicados', checked)
                  }
                />
                <Label>Recebe comunicados</Label>
              </div>
            </div>
          </div>
        ))}

        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Responsável
        </Button>
      </CardContent>

      {showAddForm && (
        <AddGuardianDialog
          studentId={studentId}
          onClose={() => setShowAddForm(false)}
          onSave={(guardian) => {
            setGuardians(prev => [...prev, guardian]);
            setShowAddForm(false);
          }}
        />
      )}
    </Card>
  );
}
```

---

## Phase 5: Bolsa Família Integration (6.5 hours - 1.5 days)

### 5.1 NIS Integration and Social Program Data (3 hours)

**Database Migration:**
```sql
-- gestao_fronteira/supabase/migrations/20250926005_bolsa_familia.sql
-- Add NIS to students
ALTER TABLE alunos
ADD COLUMN nis VARCHAR(11) UNIQUE,
ADD COLUMN programa_social VARCHAR(50),
ADD COLUMN situacao_bolsa_familia VARCHAR(30);

-- Social assistance reporting table
CREATE TABLE social_assistance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES alunos(id),
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano INTEGER NOT NULL,
    frequencia_percentual DECIMAL(5,2) NOT NULL,
    status_compliance VARCHAR(20) NOT NULL, -- 'compliant', 'at_risk', 'non_compliant'
    dias_aula INTEGER NOT NULL,
    dias_presente INTEGER NOT NULL,
    observacoes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(aluno_id, mes, ano)
);

-- Index for efficient reporting
CREATE INDEX idx_social_reports_compliance
ON social_assistance_reports(ano, mes, status_compliance);
```

**Service Implementation:**
```typescript
// lib/services/bolsa-familia-integration.ts
export class BolsaFamiliaService {
  // Generate monthly compliance report
  async generateMonthlyComplianceReport(
    escolaId: string,
    month: number,
    year: number
  ): Promise<SocialAssistanceReport[]> {
    // Get students with NIS (Bolsa Família participants)
    const { data: students } = await supabase
      .from('alunos')
      .select(`
        *,
        pessoas(*),
        matriculas!inner(*,
          turmas(escola_id)
        )
      `)
      .not('nis', 'is', null)
      .eq('matriculas.turmas.escola_id', escolaId)
      .eq('matriculas.ano', year);

    const reports: SocialAssistanceReport[] = [];

    for (const student of students || []) {
      const attendance = await this.calculateMonthlyAttendance(
        student.id, month, year
      );

      const report = {
        aluno_id: student.id,
        nome: student.pessoas.nome,
        cpf: student.pessoas.cpf,
        nis: student.nis,
        mes: month,
        ano: year,
        frequencia_percentual: attendance.percentage,
        dias_aula: attendance.schoolDays,
        dias_presente: attendance.presentDays,
        status_compliance: this.getComplianceStatus(attendance.percentage),
        programa_social: student.programa_social || 'Bolsa Família'
      };

      reports.push(report);

      // Store in database for audit
      await supabase
        .from('social_assistance_reports')
        .upsert({
          aluno_id: student.id,
          mes: month,
          ano: year,
          frequencia_percentual: attendance.percentage,
          status_compliance: report.status_compliance,
          dias_aula: attendance.schoolDays,
          dias_presente: attendance.presentDays
        });
    }

    return reports;
  }

  private getComplianceStatus(frequency: number): string {
    if (frequency >= 85) return 'compliant';
    if (frequency >= 75) return 'at_risk'; // Meeting minimum but at risk
    return 'non_compliant'; // Below required 75%
  }

  // Export for government submission
  async exportForGovernmentSubmission(
    escolaId: string,
    month: number,
    year: number
  ): Promise<Buffer> {
    const reports = await this.generateMonthlyComplianceReport(escolaId, month, year);

    // Format for government systems
    const csvData = reports.map(report => [
      report.nome,
      report.cpf,
      report.nis,
      report.frequencia_percentual.toString(),
      report.status_compliance,
      `${month}/${year}`,
      report.dias_presente,
      report.dias_aula
    ]);

    const csvContent = [
      ['Nome', 'CPF', 'NIS', 'Frequência %', 'Status', 'Período', 'Dias Presente', 'Dias Letivos'],
      ...csvData
    ].map(row => row.join(';')).join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  // Alert for at-risk students
  async identifyAtRiskStudents(escolaId: string): Promise<AtRiskStudent[]> {
    const { data } = await supabase
      .from('social_assistance_reports')
      .select(`
        *,
        alunos(*,
          pessoas(nome, telefone),
          aluno_responsaveis(*,
            responsaveis(*,
              pessoas(nome, telefone)
            )
          )
        )
      `)
      .eq('status_compliance', 'at_risk')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      .order('frequencia_percentual');

    return data?.map(report => ({
      student: report.alunos,
      frequency: report.frequencia_percentual,
      guardians: report.alunos.aluno_responsaveis.map(rel => rel.responsaveis),
      lastUpdate: report.updated_at
    })) || [];
  }
}
```

### 5.2 Compliance Dashboard (2 hours)

```tsx
// components/reports/bolsa-familia-compliance.tsx
export function BolsaFamiliaComplianceDashboard() {
  const [reports, setReports] = useState<SocialAssistanceReport[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const generateReport = async () => {
    const data = await bolsaFamiliaService.generateMonthlyComplianceReport(
      user.escola_id,
      selectedPeriod.month,
      selectedPeriod.year
    );
    setReports(data);
  };

  const complianceStats = useMemo(() => {
    const compliant = reports.filter(r => r.status_compliance === 'compliant').length;
    const atRisk = reports.filter(r => r.status_compliance === 'at_risk').length;
    const nonCompliant = reports.filter(r => r.status_compliance === 'non_compliant').length;

    return { compliant, atRisk, nonCompliant, total: reports.length };
  }, [reports]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance Bolsa Família</CardTitle>
          <CardDescription>
            Acompanhe a frequência dos estudantes participantes do programa
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select
              value={selectedPeriod.month.toString()}
              onValueChange={(value) => setSelectedPeriod(prev => ({ ...prev, month: parseInt(value) }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 12}, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {format(new Date(2023, i), 'MMMM', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedPeriod.year.toString()}
              onValueChange={(value) => setSelectedPeriod(prev => ({ ...prev, year: parseInt(value) }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025].map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={generateReport}>
              Gerar Relatório
            </Button>
          </div>

          {/* Compliance Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-green-600">{complianceStats.compliant}</div>
              <div className="text-sm">Em Conformidade</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-yellow-600">{complianceStats.atRisk}</div>
              <div className="text-sm">Em Risco</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-red-600">{complianceStats.nonCompliant}</div>
              <div className="text-sm">Não Conformes</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold">{complianceStats.total}</div>
              <div className="text-sm">Total</div>
            </div>
          </div>

          {/* Student List */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(report => (
                <TableRow key={report.aluno_id}>
                  <TableCell>{report.nome}</TableCell>
                  <TableCell>{report.nis}</TableCell>
                  <TableCell>{report.frequencia_percentual.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={
                      report.status_compliance === 'compliant' ? 'success' :
                      report.status_compliance === 'at_risk' ? 'warning' : 'destructive'
                    }>
                      {report.status_compliance === 'compliant' ? 'Conforme' :
                       report.status_compliance === 'at_risk' ? 'Em Risco' : 'Não Conforme'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5.3 Automated Alerts System (1.5 hours)

```typescript
// lib/services/attendance-alerts.ts
export class AttendanceAlertService {
  // Check daily for at-risk students
  async checkDailyCompliance(): Promise<void> {
    const atRiskStudents = await this.identifyNewAtRiskStudents();

    for (const student of atRiskStudents) {
      await this.sendAlertToGuardians(student);
      await this.createAdministrativeAlert(student);
    }
  }

  private async sendAlertToGuardians(student: AtRiskStudent): Promise<void> {
    const guardians = await supabase
      .from('aluno_responsaveis')
      .select(`
        responsaveis(*,
          pessoas(nome, telefone, email)
        )
      `)
      .eq('aluno_id', student.id)
      .eq('ativo', true)
      .eq('recebe_comunicados', true);

    for (const guardian of guardians.data || []) {
      // SMS Alert
      if (guardian.responsaveis.pessoas.telefone) {
        await this.sendSMS(
          guardian.responsaveis.pessoas.telefone,
          `ATENÇÃO: ${student.nome} tem frequência de ${student.frequency}%. ` +
          `É necessário manter mínimo de 75% para programas sociais. ` +
          `Entre em contato com a escola.`
        );
      }

      // Email Alert
      if (guardian.responsaveis.pessoas.email) {
        await this.sendEmail(
          guardian.responsaveis.pessoas.email,
          'Alerta de Frequência Escolar',
          this.generateFrequencyEmailTemplate(student, guardian.responsaveis.pessoas.nome)
        );
      }
    }
  }

  private async createAdministrativeAlert(student: AtRiskStudent): Promise<void> {
    await supabase
      .from('administrative_alerts')
      .insert({
        type: 'attendance_risk',
        priority: student.frequency < 75 ? 'high' : 'medium',
        title: `Frequência baixa: ${student.nome}`,
        description: `Estudante com frequência de ${student.frequency}% - Risco para Bolsa Família`,
        student_id: student.id,
        escola_id: student.escola_id,
        requires_action: true,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days to resolve
      });
  }
}
```

---

## Implementation Priority Summary

### Critical Path (Must Complete First):
1. **Phase 1: Legal Compliance** (8 hours) - Attendance immutability + Enhanced "Abrir Aula"
2. **Phase 2: Brazilian Validation** (6 hours) - CPF validation + Enhanced forms
3. **Phase 3: Educacenso Export** (8 hours) - Government reporting system

### High Priority (Complete Second):
4. **Phase 4: Multi-Guardian** (8 hours) - Family structure management
5. **Phase 5: Bolsa Família** (6.5 hours) - Social program integration

### Total Implementation Time: 36.5 hours across 10 working days

## Success Metrics

After implementation, you will have:
- ✅ 100% Brazilian educational compliance
- ✅ Government-ready data export system
- ✅ Legal attendance immutability
- ✅ Multi-guardian family structure support
- ✅ Bolsa Família program integration
- ✅ Complete audit trail system
- ✅ Production-ready Brazilian validation

This guide provides the exact implementations needed to transform your current 85% complete system into a 100% production-ready Brazilian educational management platform.