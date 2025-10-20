# Database Schema Documentation

**Project**: Sistema de Gestão Educacional - Município de Fronteira, MG
**Database**: PostgreSQL via Supabase
**Version**: 1.0.0
**Last Updated**: 2025-01-17
**Total Migrations**: 16
**Total Tables**: 18

---

## Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Educational Management](#educational-management)
4. [Attendance System](#attendance-system)
5. [Compliance & Audit](#compliance--audit)
6. [Configuration](#configuration)
7. [Entity Relationship Diagram](#entity-relationship-diagram)
8. [Security Architecture](#security-architecture)
9. [Performance Indexes](#performance-indexes)
10. [Migration History](#migration-history)

---

## Overview

### Database Architecture

The database implements a **multi-tenant architecture** with school-based data isolation using Row Level Security (RLS). All 18 tables have RLS enabled for compliance with Brazilian LGPD (Lei Geral de Proteção de Dados).

### Key Features

- **Brazilian Educational Compliance**: INEP, Educacenso 2025, Bolsa Família integration
- **Legal Immutability**: Attendance records are official legal documents ("não existe o esquecer")
- **Audit Trail**: Complete change tracking for all critical operations
- **Multi-Guardian Support**: Complex family structure management
- **Performance Optimized**: 28 indexes for sub-second query performance

---

## Core Tables

### `users`

**Purpose**: Central user management with 5-role RBAC system

**Columns**:
```sql
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
email               TEXT UNIQUE NULLABLE
nome                TEXT NOT NULL
tipo_usuario        TEXT NOT NULL CHECK (tipo_usuario IN (
                      'admin', 'diretor', 'secretario', 'professor',
                      'responsavel', 'secretaria_educacao', 'coordenador_pedagogico'
                    ))
escola_id           UUID REFERENCES escolas(id) NULLABLE
ativo               BOOLEAN DEFAULT true
created_at          TIMESTAMPTZ DEFAULT now()
primeiro_login      BOOLEAN DEFAULT false  -- Requires profile completion
senha_padrao        BOOLEAN DEFAULT false  -- Forces password change
data_ultimo_acesso  TIMESTAMPTZ NULLABLE   -- Last login timestamp
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (email)`
- `idx_users_escola` on `(escola_id, tipo_usuario)` - RLS optimization

**RLS Policies**: Enabled
- Users can view own profile
- Admin can view all users
- Directors/secretaries can view users in their school

**Foreign Keys**:
- `escola_id` → `escolas.id` (school assignment)

**Referenced By**:
- `escolas.diretor_id` (school directors)
- `turmas.professor_id` (class teachers)
- `sessoes_aula.professor_id` (session teachers)
- `frequencia.professor_id`, `marcado_por`, `bloqueado_por` (attendance operations)
- `audit_logs.user_id`, `audit_trail.usuario_id` (audit operations)

**Business Rules**:
- Admin users have no `escola_id` (system-wide access)
- Non-admin users must have `escola_id` assigned
- First login users redirected to profile completion wizard
- Default password users forced to change password

---

### `escolas`

**Purpose**: Educational institutions (schools) with municipal multi-tenancy

**Columns**:
```sql
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4()
nome        TEXT NOT NULL
codigo      TEXT UNIQUE NOT NULL  -- Internal school code
endereco    TEXT NULLABLE
telefone    TEXT NULLABLE
email       TEXT NULLABLE         -- Institutional email
tipo        TEXT NOT NULL CHECK (tipo IN ('creche', 'pre_escola', 'fundamental'))
diretor_id  UUID REFERENCES users(id) NULLABLE
ativo       BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (codigo)`

**RLS Policies**: Enabled
- Users can only view schools they belong to (via `escola_id`)
- Admin can view all schools

**Foreign Keys**:
- `diretor_id` → `users.id` (school director)

**Referenced By**:
- `users.escola_id` (user-school assignment)
- `turmas.escola_id` (school classes)
- `sessoes_aula.escola_id` (attendance sessions)
- `educacenso_exports.escola_id` (INEP exports)

**Business Rules**:
- Each school has one director (1:1 relationship)
- School code must be unique across municipality
- Inactive schools hidden from regular operations

---

### `responsaveis`

**Purpose**: Student guardians with LGPD consent management

**Columns**:
```sql
id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4()
nome                    TEXT NOT NULL
cpf                     TEXT UNIQUE NOT NULL  -- Brazilian taxpayer ID
rg                      TEXT NULLABLE
orgao_emissor_rg        TEXT NULLABLE
telefone                TEXT NULLABLE
email                   TEXT NULLABLE
data_nascimento         DATE NULLABLE
parentesco              TEXT NOT NULL  -- Relationship type
endereco                TEXT NULLABLE
profissao               TEXT NULLABLE
nacionalidade           TEXT DEFAULT 'Brasileira'
estado_civil            TEXT CHECK (estado_civil IN (
                          'solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel'
                        ))
renda_familiar          NUMERIC NULLABLE
escolaridade            TEXT CHECK (escolaridade IN (
                          'analfabeto', 'fundamental_incompleto', 'fundamental_completo',
                          'medio_incompleto', 'medio_completo', 'superior_incompleto',
                          'superior_completo', 'pos_graduacao'
                        ))
lgpd_consentimento      BOOLEAN DEFAULT false  -- LGPD consent required
lgpd_data_consentimento TIMESTAMPTZ NULLABLE
ativo                   BOOLEAN DEFAULT true
created_at              TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (cpf)`

**RLS Policies**: Enabled
- Guardians can view own profile
- School staff can view guardians of students in their school

**Referenced By**:
- `alunos.responsavel_id` (primary guardian - legacy)
- `aluno_responsaveis.responsavel_id` (multi-guardian system)

**Business Rules**:
- CPF must be valid Brazilian format (11 digits with check digits)
- LGPD consent required before accessing student data
- Supports multiple guardians per student via `aluno_responsaveis`

---

### `alunos`

**Purpose**: Student records with Brazilian educational data

**Columns**:
```sql
id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4()
nome_completo         TEXT NOT NULL
data_nascimento       DATE NOT NULL
cpf                   TEXT UNIQUE NULLABLE  -- Optional for minors
rg                    TEXT NULLABLE
sexo                  TEXT NOT NULL CHECK (sexo IN ('M', 'F'))
endereco              TEXT NULLABLE
telefone              TEXT NULLABLE
email                 TEXT NULLABLE
nome_mae              TEXT NULLABLE
nome_pai              TEXT NULLABLE
responsavel_id        UUID REFERENCES responsaveis(id) NULLABLE  -- Primary guardian (legacy)
necessidades_especiais TEXT NULLABLE  -- Special needs description
ativo                 BOOLEAN DEFAULT true
created_at            TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (cpf)`
- `idx_alunos_escola_ativo` on `(escola_id, ativo)` (via matriculas)

**RLS Policies**: Enabled
- Students accessible only to school staff and their guardians
- School-based data isolation

**Foreign Keys**:
- `responsavel_id` → `responsaveis.id` (primary guardian - legacy field)

**Referenced By**:
- `matriculas.aluno_id` (enrollments)
- `aluno_responsaveis.aluno_id` (multi-guardian system)

**Business Rules**:
- CPF optional for students under 18
- Must have at least one guardian (via `aluno_responsaveis`)
- Special needs tracked for accessibility compliance

---

## Educational Management

### `turmas`

**Purpose**: School classes with teacher assignments

**Columns**:
```sql
id            UUID PRIMARY KEY DEFAULT uuid_generate_v4()
nome          TEXT NOT NULL  -- Class name (e.g., "5º Ano A")
ano_letivo    INTEGER NOT NULL  -- Academic year
serie         TEXT NOT NULL  -- Grade level
escola_id     UUID REFERENCES escolas(id) NOT NULL
professor_id  UUID REFERENCES users(id) NULLABLE  -- Assigned teacher
capacidade    INTEGER DEFAULT 25  -- Max students
turno         TEXT NOT NULL CHECK (turno IN ('matutino', 'vespertino', 'integral'))
ativo         BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_turmas_escola_ativo` on `(escola_id, ativo)`

**RLS Policies**: Enabled
- Teachers can view their own classes
- School staff can view all classes in their school

**Foreign Keys**:
- `escola_id` → `escolas.id`
- `professor_id` → `users.id`

**Referenced By**:
- `matriculas.turma_id` (student enrollments)
- `sessoes_aula.turma_id` (attendance sessions)

**Business Rules**:
- One teacher per class
- Capacity enforced during enrollment
- Multiple classes per grade level supported (A, B, C sections)

---

### `matriculas`

**Purpose**: Student enrollments in classes with academic year tracking

**Columns**:
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
aluno_id        UUID REFERENCES alunos(id) NOT NULL
turma_id        UUID REFERENCES turmas(id) NOT NULL
ano_letivo      INTEGER NOT NULL
data_matricula  DATE DEFAULT CURRENT_DATE
situacao        TEXT DEFAULT 'ativa' CHECK (situacao IN (
                  'ativa', 'transferida', 'concluida', 'cancelada'
                ))
observacoes     TEXT NULLABLE
created_at      TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (aluno_id, turma_id, ano_letivo)` - One enrollment per student per class per year
- `idx_matriculas_ativa` on `(situacao)` WHERE `situacao = 'ativa'`

**RLS Policies**: Enabled
- School-based isolation via turma relationship

**Foreign Keys**:
- `aluno_id` → `alunos.id`
- `turma_id` → `turmas.id`

**Referenced By**:
- `frequencia.matricula_id` (attendance records)
- `notas.matricula_id` (grades)

**Business Rules**:
- Student can only be enrolled in one class per academic year
- Enrollment status transitions: `ativa` → `transferida` | `concluida` | `cancelada`
- Canceled enrollments kept for historical records

---

### `notas`

**Purpose**: Student grades with quarterly Brazilian grading system

**Columns**:
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
matricula_id    UUID REFERENCES matriculas(id) NOT NULL
disciplina      TEXT NOT NULL  -- Subject name
bimestre        INTEGER NOT NULL CHECK (bimestre >= 1 AND bimestre <= 4)  -- Quarter
nota            NUMERIC NOT NULL CHECK (nota >= 0 AND nota <= 10)  -- Grade 0-10
tipo_avaliacao  TEXT NOT NULL  -- Assessment type
data_avaliacao  DATE NOT NULL
observacoes     TEXT NULLABLE
created_at      TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_notas_matricula_bimestre` on `(matricula_id, bimestre)`

**RLS Policies**: Enabled
- School staff can manage grades for their school
- Students and guardians can view their own grades

**Foreign Keys**:
- `matricula_id` → `matriculas.id`

**Business Rules**:
- Brazilian quarterly system: 4 bimestres per year
- Grade scale: 0.0 to 10.0
- Minimum passing grade: 6.0 (60%)

---

### `disciplinas`

**Purpose**: School subjects/courses catalog

**Columns**:
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
nome       VARCHAR NOT NULL  -- Subject name
codigo     VARCHAR UNIQUE NOT NULL  -- Subject code
escola_id  UUID REFERENCES escolas(id) NULLABLE  -- School-specific or system-wide
ativa      BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (codigo)`

**RLS Policies**: Enabled

**Foreign Keys**:
- `escola_id` → `escolas.id`

**Referenced By**:
- `sessoes_aula.disciplina_id` (attendance sessions)

**Business Rules**:
- Null `escola_id` = system-wide subject
- Non-null `escola_id` = school-specific subject

---

### `aluno_responsaveis`

**Purpose**: Multi-guardian system with responsibility types

**Columns**:
```sql
id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4()
aluno_id                UUID REFERENCES alunos(id) NOT NULL
responsavel_id          UUID REFERENCES responsaveis(id) NOT NULL
tipo_responsabilidade   TEXT NOT NULL CHECK (tipo_responsabilidade IN (
                          'responsavel_legal', 'responsavel_educacional',
                          'contato_emergencia', 'autorizado_buscar', 'responsavel_financeiro'
                        ))
prioridade              INTEGER DEFAULT 1 CHECK (prioridade >= 1 AND prioridade <= 5)
pode_autorizar_saida    BOOLEAN DEFAULT false
pode_receber_comunicados BOOLEAN DEFAULT true
ativo                   BOOLEAN DEFAULT true
documento_autorizacao   TEXT NULLABLE  -- Authorization document reference
data_inicio             DATE DEFAULT CURRENT_DATE
data_fim                DATE NULLABLE  -- End of responsibility period
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_aluno_responsaveis_aluno` on `(aluno_id, ativo)`

**RLS Policies**: Enabled

**Foreign Keys**:
- `aluno_id` → `alunos.id`
- `responsavel_id` → `responsaveis.id`

**Business Rules**:
- Supports complex family structures (divorced parents, guardians, etc.)
- Priority system for emergency contacts (1 = primary, 5 = lowest)
- Time-bound responsibilities with start/end dates
- Different permissions per guardian type

---

## Attendance System

### `sessoes_aula`

**Purpose**: Enhanced "Abrir aula" workflow with three-phase attendance system and legal compliance

**Columns**:
```sql
id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4()
turma_id                   UUID REFERENCES turmas(id) NOT NULL
professor_id               UUID REFERENCES users(id) NOT NULL
escola_id                  UUID NOT NULL
disciplina_id              UUID REFERENCES disciplinas(id) NULLABLE
data_aula                  DATE DEFAULT CURRENT_DATE
status                     TEXT DEFAULT 'aberta' CHECK (status IN (
                             'aberta', 'fechada', 'travada',
                             'PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA'
                           ))
conteudo_programatico      TEXT NOT NULL CHECK (length(conteudo_programatico) >= 5)
objetivos_aprendizagem     TEXT NULLABLE
metodologia                TEXT NULLABLE
recursos_utilizados        TEXT NULLABLE
avaliacao_planejada        TEXT NULLABLE
observacoes                TEXT NULLABLE
observacoes_fechamento     TEXT NULLABLE
duracao_minutos            INTEGER DEFAULT 50 CHECK (duracao_minutos >= 30 AND duracao_minutos <= 240)
inicio_aula                TIMESTAMPTZ DEFAULT now()
fim_aula                   TIMESTAMPTZ NULLABLE
aberta_em                  TIMESTAMPTZ NULLABLE
fechada_em                 TIMESTAMPTZ NULLABLE
cancelada_em               TIMESTAMPTZ NULLABLE
travada_em                 TIMESTAMPTZ NULLABLE  -- 18:00 auto-lock
auto_fechamento_agendado   TIMESTAMPTZ NULLABLE  -- 18:00 São Paulo time
tempo_total_aula           INTERVAL GENERATED AS (
                             CASE
                               WHEN fechada_em IS NOT NULL AND aberta_em IS NOT NULL
                               THEN fechada_em - aberta_em
                               ELSE NULL
                             END
                           ) STORED
documento_oficial          BOOLEAN DEFAULT true
hash_integridade           TEXT NULLABLE
hash_legal                 TEXT UNIQUE NULLABLE  -- SHA-256 legal compliance hash
created_at                 TIMESTAMPTZ DEFAULT now()
updated_at                 TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (hash_legal)`
- `idx_sessoes_aula_turma_data` on `(turma_id, data_aula)`
- `idx_sessoes_aula_status` on `(status, travada_em)`
- `idx_sessoes_aula_escola_data` on `(escola_id, data_aula)`

**RLS Policies**: Enabled
- Teachers can only modify their own sessions
- Directors/secretaries can modify sessions in their school
- No modifications allowed after `status = 'FECHADA'` (immutable)

**Foreign Keys**:
- `turma_id` → `turmas.id`
- `professor_id` → `users.id`
- `escola_id` → `escolas.id`
- `disciplina_id` → `disciplinas.id`

**Referenced By**:
- `frequencia.sessao_id` (attendance records)
- `audit_sessoes_aula.sessao_id` (audit trail)

**Status Transitions**:
```
PLANEJADA → ABERTA → FECHADA (immutable)
         ↘ CANCELADA
ABERTA → CANCELADA
```

**Business Rules**:
- **"Não existe o esquecer"**: Once `FECHADA`, session becomes immutable legal document
- **Auto-lock at 18:00**: Sessions automatically locked at 18:00 São Paulo time (UTC-3)
- **Legal hash**: SHA-256 hash generated on closure for INEP compliance
- **Duration**: 30-240 minutes enforced
- **Content required**: Minimum 5 characters for `conteudo_programatico`

**Database Triggers**:
1. `fn_enhanced_audit_sessao_aula`: Generates `hash_legal` and audit record on closure
2. `fn_auto_lock_sessions`: Runs periodically to lock sessions past 18:00

---

### `frequencia`

**Purpose**: Daily attendance records with legal immutability enforcement

**Columns**:
```sql
id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4()
matricula_id            UUID REFERENCES matriculas(id) NOT NULL
sessao_id               UUID REFERENCES sessoes_aula(id) NULLABLE
aula_id                 UUID REFERENCES aulas_abertas(id) NULLABLE  -- Legacy
data_aula               DATE NOT NULL
presente                BOOLEAN DEFAULT false  -- Legacy field
status_presenca         TEXT DEFAULT 'presente' CHECK (status_presenca IN (
                          'presente', 'falta', 'justificada', 'atestado_medico'
                        ))
justificativa           TEXT NULLABLE
observacoes             TEXT NULLABLE
observacoes_frequencia  TEXT NULLABLE
professor_id            UUID REFERENCES users(id) NULLABLE
marcado_em              TIMESTAMPTZ NULLABLE
marcado_por             UUID REFERENCES users(id) NULLABLE
modificado_em           TIMESTAMPTZ NULLABLE
travado                 BOOLEAN DEFAULT false  -- Legacy
bloqueado               BOOLEAN DEFAULT false  -- Locked status
bloqueado_em            TIMESTAMPTZ NULLABLE
bloqueado_por           UUID REFERENCES users(id) NULLABLE
hash_registro           TEXT NULLABLE  -- Record integrity hash
documento_oficial       BOOLEAN DEFAULT true
created_at              TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (sessao_aula_id, aluno_id, data)` (via upsert logic)
- `idx_frequencia_sessao_aluno` on `(sessao_aula_id, aluno_id)` - Performance optimization
- `idx_frequencia_matricula_data` on `(matricula_id, data_aula)`

**RLS Policies**: Enabled
- Teachers can mark attendance for their own sessions
- School staff can view all attendance in their school
- No modifications after session is locked

**Foreign Keys**:
- `matricula_id` → `matriculas.id`
- `sessao_id` → `sessoes_aula.id`
- `professor_id` → `users.id`
- `marcado_por` → `users.id`
- `bloqueado_por` → `users.id`

**Business Rules**:
- **Performance Target**: <1s per student attendance marking
- **Batch Operations**: Up to 50 students per batch
- **Legal Compliance**: Records are official documents for INEP
- **Bolsa Família**: Minimum 80% attendance required
- **INEP Minimum**: Minimum 75% attendance required (legal minimum)

**Status Values**:
- `presente`: Student attended class
- `falta`: Unexcused absence
- `justificada`: Excused absence with justification
- `atestado_medico`: Medical certificate provided

---

### `aulas_abertas`

**Purpose**: Legacy attendance session system (being migrated to `sessoes_aula`)

**Columns**:
```sql
id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4()
turma_id                UUID REFERENCES turmas(id) NOT NULL
professor_id            UUID REFERENCES users(id) NOT NULL
escola_id               UUID REFERENCES escolas(id) NOT NULL
data_aula               DATE DEFAULT CURRENT_DATE
disciplina              TEXT NULLABLE
status                  TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'travada'))
aberta_em               TIMESTAMPTZ DEFAULT now()
fechada_em              TIMESTAMPTZ NULLABLE
travada_em              TIMESTAMPTZ NULLABLE
tempo_limite_minutos    INTEGER DEFAULT 15  -- Time limit for marking
observacoes_abertura    TEXT NULLABLE
observacoes_fechamento  TEXT NULLABLE
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
```

**Status**: Legacy table, being replaced by `sessoes_aula`

**Migration**: See migration `20251005000000_migrate_aulas_to_sessoes.sql`

---

## Compliance & Audit

### `audit_logs`

**Purpose**: Complete audit trail for all system operations with LGPD compliance

**Columns**:
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES users(id) NOT NULL
escola_id   UUID REFERENCES escolas(id) NULLABLE
action      TEXT NOT NULL  -- Action type (INSERT, UPDATE, DELETE, etc.)
table_name  TEXT NOT NULL  -- Table affected
record_id   TEXT NOT NULL  -- Record UUID
old_values  JSONB NULLABLE  -- Before state
new_values  JSONB NULLABLE  -- After state
details     JSONB NULLABLE  -- Additional context
ip_address  TEXT NULLABLE
user_agent  TEXT NULLABLE
timestamp   TIMESTAMPTZ DEFAULT now()
created_at  TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_audit_logs_user_table` on `(user_id, table_name, timestamp)`
- `idx_audit_logs_escola_timestamp` on `(escola_id, timestamp)`

**RLS Policies**: Enabled
- Users can view their own audit logs
- Admin can view all audit logs
- School staff can view audit logs for their school

**Foreign Keys**:
- `user_id` → `users.id`
- `escola_id` → `escolas.id`

**Business Rules**:
- All critical operations logged (attendance, grades, enrollments)
- IP address and user agent tracked for security
- JSONB format for flexible old/new value storage
- Retention: Indefinite (legal requirement)

---

### `audit_trail`

**Purpose**: Enhanced audit trail with legal document tracking

**Columns**:
```sql
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
tabela              TEXT NOT NULL
registro_id         TEXT NOT NULL
operacao            TEXT NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE'))
usuario_id          UUID REFERENCES users(id) NULLABLE
escola_id           UUID REFERENCES escolas(id) NULLABLE
ip_address          INET NULLABLE
user_agent          TEXT NULLABLE
sessao_id           TEXT NULLABLE  -- Session identifier
dados_anteriores    JSONB NULLABLE
dados_novos         JSONB NULLABLE
campos_alterados    TEXT[] NULLABLE  -- Array of changed field names
justificativa       TEXT NULLABLE  -- Change justification
documento_legal     TEXT NULLABLE  -- Legal document reference
nivel_criticidade   TEXT DEFAULT 'normal' CHECK (nivel_criticidade IN (
                      'baixo', 'normal', 'alto', 'critico'
                    ))
timestamp_operacao  TIMESTAMPTZ DEFAULT now()
created_at          TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_audit_trail_tabela_registro` on `(tabela, registro_id, timestamp_operacao)`
- `idx_audit_trail_criticidade` on `(nivel_criticidade)` WHERE `nivel_criticidade IN ('alto', 'critico')`

**RLS Policies**: Enabled

**Foreign Keys**:
- `usuario_id` → `users.id`
- `escola_id` → `escolas.id`

**Business Rules**:
- High-criticality operations flagged automatically
- Legal document references for compliance
- Change justification required for critical operations

---

### `audit_sessoes_aula`

**Purpose**: Specialized audit for attendance sessions with hash verification

**Columns**:
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
sessao_id           UUID REFERENCES sessoes_aula(id) NOT NULL
acao                VARCHAR NOT NULL CHECK (acao IN (
                      'CRIAR', 'ABRIR', 'FECHAR', 'CANCELAR', 'MODIFICAR'
                    ))
usuario_id          UUID REFERENCES users(id) NOT NULL
timestamp_acao      TIMESTAMPTZ DEFAULT now() CHECK (timestamp_acao <= now())
dados_anteriores    JSONB NULLABLE
dados_novos         JSONB NULLABLE
ip_usuario          INET NULLABLE
user_agent          TEXT NULLABLE
hash_verificacao    TEXT NOT NULL  -- Cryptographic hash for verification
```

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_audit_sessoes_sessao_timestamp` on `(sessao_id, timestamp_acao)`

**RLS Policies**: Enabled

**Foreign Keys**:
- `sessao_id` → `sessoes_aula.id`
- `usuario_id` → `users.id`

**Business Rules**:
- Every session state change audited
- Hash verification ensures audit trail integrity
- Timestamp cannot be in the future (CHECK constraint)

---

### `codigos_inep`

**Purpose**: INEP (government) code management for schools, students, teachers

**Columns**:
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
entidade_tipo   TEXT NOT NULL CHECK (entidade_tipo IN (
                  'escola', 'aluno', 'professor', 'turma'
                ))
entidade_id     UUID NOT NULL  -- References entity (escola, aluno, user, turma)
codigo_inep     TEXT UNIQUE NOT NULL  -- 8 digits (school) or 11 digits (student)
situacao        TEXT DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo', 'pendente'))
data_validacao  DATE NULLABLE
validado_por    UUID REFERENCES users(id) NULLABLE
observacoes     TEXT NULLABLE
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (codigo_inep)`
- `idx_codigos_inep_entidade` on `(entidade_tipo, entidade_id)`

**RLS Policies**: Enabled

**Foreign Keys**:
- `validado_por` → `users.id`

**Business Rules**:
- INEP codes required for Educacenso reporting
- School codes: 8 digits
- Student/teacher codes: 11 digits
- Validation workflow: pendente → ativo

---

### `educacenso_exports`

**Purpose**: Educacenso 2025 data export tracking

**Columns**:
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
ano_referencia    INTEGER NOT NULL  -- Reference year
escola_id         UUID REFERENCES escolas(id) NOT NULL
tipo_export       TEXT NOT NULL CHECK (tipo_export IN (
                    'situacao_aluno', 'dados_escola', 'turma', 'docente', 'gestor'
                  ))
status_export     TEXT DEFAULT 'pendente' CHECK (status_export IN (
                    'pendente', 'processando', 'concluido', 'erro'
                  ))
arquivo_gerado    TEXT NULLABLE  -- Export file path
data_geracao      TIMESTAMPTZ NULLABLE
data_envio        TIMESTAMPTZ NULLABLE
hash_arquivo      TEXT NULLABLE  -- File integrity hash
observacoes       TEXT NULLABLE
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_educacenso_escola_ano` on `(escola_id, ano_referencia, tipo_export)`

**RLS Policies**: Enabled

**Foreign Keys**:
- `escola_id` → `escolas.id`

**Business Rules**:
- Educacenso 2025 timeline:
  - Stage 1 (Initial Enrollment): May 28 - July 31, 2025
  - Stage 2 (Student Status): February 2 - March 13, 2026
- File hash ensures data integrity for government submission

---

## Configuration

### `configs`

**Purpose**: System and school-specific configuration settings

**Columns**:
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
chave         VARCHAR UNIQUE NOT NULL  -- Configuration key
valor         TEXT NOT NULL  -- Configuration value
descricao     TEXT NOT NULL  -- Human-readable description
categoria     VARCHAR NOT NULL CHECK (categoria IN (
                'geral', 'academico', 'notificacoes', 'seguranca'
              ))
tipo_valor    VARCHAR DEFAULT 'string' CHECK (tipo_valor IN (
                'string', 'number', 'boolean', 'email'
              ))
valor_padrao  TEXT NULLABLE  -- Default value
criado_por    UUID REFERENCES users(id) NULLABLE
escola_id     UUID REFERENCES escolas(id) NULLABLE  -- Null = system-wide
ativo         BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (chave)`
- `idx_configs_escola_categoria` on `(escola_id, categoria)` WHERE `ativo = true`

**RLS Policies**: Enabled

**Foreign Keys**:
- `criado_por` → `users.id`
- `escola_id` → `escolas.id`

**Business Rules**:
- Null `escola_id` = system-wide configuration
- Non-null `escola_id` = school-specific override
- Type validation enforced by application layer

---

## Entity Relationship Diagram

```
┌─────────────┐
│   escolas   │
└──────┬──────┘
       │ 1:N
       ├────────────┬──────────┬──────────┐
       │            │          │          │
   ┌───▼───┐   ┌───▼───┐  ┌───▼───┐  ┌──▼──┐
   │ users │   │turmas │  │configs│  │codigos│
   └───┬───┘   └───┬───┘  └───────┘  │_inep│
       │ 1:N       │ 1:N              └─────┘
       │           │
   ┌───▼──────┐   │
   │sessoes   │◄──┘
   │_aula     │
   └────┬─────┘
        │ 1:N
        │
   ┌────▼──────┐
   │frequencia │
   └────┬──────┘
        │
   ┌────▼──────┐
   │matriculas │
   └────┬──────┘
        │ N:1
   ┌────▼──────┐         ┌──────────────┐
   │  alunos   │◄────────┤aluno_        │
   └───────────┘  N:N    │responsaveis  │
                          └───────┬──────┘
                                  │ N:1
                          ┌───────▼──────┐
                          │responsaveis  │
                          └──────────────┘
```

---

## Security Architecture

### Row Level Security (RLS)

All 18 tables have RLS enabled for multi-tenant school-based data isolation.

#### Policy Structure

**Pattern 1: School-Based Isolation**
```sql
-- Example: Users can only see data from their school
CREATE POLICY "school_isolation" ON turmas
  FOR SELECT
  USING (escola_id IN (
    SELECT escola_id FROM users WHERE id = auth.uid()
  ));
```

**Pattern 2: Role-Based Access**
```sql
-- Example: Only teachers and admin can modify sessions
CREATE POLICY "teacher_sessions" ON sessoes_aula
  FOR UPDATE
  USING (
    professor_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'diretor', 'secretario')
    )
  );
```

**Pattern 3: Immutability Enforcement**
```sql
-- Example: Cannot modify closed sessions
CREATE POLICY "no_modify_closed" ON sessoes_aula
  FOR UPDATE
  USING (status NOT IN ('FECHADA', 'travada'));
```

### Database Functions

#### `is_session_editable(session_id UUID)`

```sql
CREATE FUNCTION is_session_editable(session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  session_status TEXT;
  session_travada_em TIMESTAMPTZ;
BEGIN
  SELECT status, travada_em INTO session_status, session_travada_em
  FROM sessoes_aula
  WHERE id = session_id;

  -- Cannot edit if closed or locked
  IF session_status IN ('FECHADA', 'travada') THEN
    RETURN FALSE;
  END IF;

  IF session_travada_em IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Used by all attendance marking operations to enforce "não existe o esquecer" principle.

---

## Performance Indexes

### Critical Performance Indexes

**Total Indexes**: 28 (created in migration `20251002000000_performance_indexes.sql`)

#### Attendance System Optimization
```sql
-- Frequent attendance queries
CREATE INDEX idx_frequencia_sessao_aluno ON frequencia(sessao_aula_id, aluno_id);
CREATE INDEX idx_frequencia_matricula_data ON frequencia(matricula_id, data_aula);

-- Session queries
CREATE INDEX idx_sessoes_aula_turma_data ON sessoes_aula(turma_id, data_aula);
CREATE INDEX idx_sessoes_aula_status ON sessoes_aula(status, travada_em);
CREATE INDEX idx_sessoes_aula_escola_data ON sessoes_aula(escola_id, data_aula);
```

#### RLS Policy Optimization
```sql
-- User-school relationship
CREATE INDEX idx_users_escola ON users(escola_id, tipo_usuario);

-- School-based filtering
CREATE INDEX idx_turmas_escola_ativo ON turmas(escola_id, ativo);
CREATE INDEX idx_alunos_escola_ativo ON alunos(escola_id, ativo)
  WHERE ativo = true;
```

#### Audit Trail Optimization
```sql
-- Audit log queries
CREATE INDEX idx_audit_logs_user_table
  ON audit_logs(user_id, table_name, timestamp);
CREATE INDEX idx_audit_trail_criticidade
  ON audit_trail(nivel_criticidade)
  WHERE nivel_criticidade IN ('alto', 'critico');
```

### Query Performance Targets

| Query Type | Target | Status |
|------------|--------|--------|
| Dashboard load (aggregated) | <3s | ✅ Achieved |
| Attendance marking (single) | <1s | ✅ Achieved |
| Attendance marking (batch 30) | <5s | ✅ Achieved |
| Session open | <2s | ✅ Achieved |
| Session close | <3s | ✅ Achieved |

---

## Migration History

**Total Migrations**: 16

### Migration Timeline

| Migration | Date | Description |
|-----------|------|-------------|
| `20250628095207_wild_block.sql` | 2025-06-28 | Initial schema setup (legacy) |
| `20250115000000_create_audit_logs.sql` | 2025-01-15 | Add comprehensive audit logging |
| `20250115000001_enable_rls_security.sql` | 2025-01-15 | Enable RLS on all tables |
| `20250116000000_fix_delete_rls_policies.sql` | 2025-01-16 | Fix DELETE operation RLS policies |
| `20250920120000_enhanced_abrir_aula_workflow.sql` | 2025-09-20 | Enhanced three-phase attendance workflow |
| `20250920120001_session_audit_integration.sql` | 2025-09-20 | Integrate session audit system |
| `20250924001_attendance_immutability_system.sql` | 2025-09-24 | Legal immutability enforcement |
| `20250926001_enhanced_abrir_aula_workflow.sql` | 2025-09-26 | Further workflow enhancements |
| `20250926002_enhanced_abrir_aula_compliance.sql` | 2025-09-26 | Brazilian compliance features |
| `20251002000000_performance_indexes.sql` | 2025-10-02 | Add 28 performance indexes |
| `20251005000000_migrate_aulas_to_sessoes.sql` | 2025-10-05 | Migrate from legacy `aulas_abertas` to `sessoes_aula` |
| `20251009_fase1_enable_rls_missing_tables.sql` | 2025-10-09 | Enable RLS on missing tables |
| `20251009_fase1_fix_security_definer_views.sql` | 2025-10-09 | Fix security definer views |
| `20251009_fase3_add_missing_fk_indexes.sql` | 2025-10-09 | Add missing foreign key indexes |
| `20251009_fase4_optimize_sequential_scans.sql` | 2025-10-09 | Optimize sequential scans |
| `20251009000000_onboarding_and_roles_enhancement.sql` | 2025-10-09 | Onboarding wizard and enhanced roles |

### Key Migration Features

#### Phase 1: Core Schema (June 2025)
- Initial tables for schools, users, students, classes
- Basic RBAC with 5 roles
- Student enrollment and grade management

#### Phase 2: Security Enhancement (January 2025)
- Comprehensive audit logging (`audit_logs`, `audit_trail`)
- RLS policies for all tables
- DELETE operation policy fixes

#### Phase 3: Enhanced Attendance System (September 2025)
- Three-phase workflow (PLANEJADA → ABERTA → FECHADA)
- Legal immutability enforcement ("não existe o esquecer")
- Auto-lock at 18:00 São Paulo time
- SHA-256 hash generation for legal compliance
- Session audit trail with hash verification

#### Phase 4: Performance Optimization (October 2025)
- 28 strategic indexes for sub-second performance
- Foreign key index optimization
- Sequential scan elimination
- RLS policy optimization

#### Phase 5: Brazilian Compliance (Throughout)
- INEP code management
- Educacenso 2025 export tracking
- Bolsa Família integration (80% attendance threshold)
- LGPD data protection compliance
- Multi-guardian family structure support

---

## Database Statistics

### Current State (as of 2025-01-17)

| Metric | Value |
|--------|-------|
| Total Tables | 18 |
| Tables with RLS | 18 (100%) |
| Total Migrations | 16 |
| Performance Indexes | 28 |
| Database Functions | 5+ |
| Database Triggers | 3+ |

### Data Volumes (Production Estimate)

| Table | Estimated Rows |
|-------|----------------|
| users | 100-500 |
| escolas | 5-20 |
| alunos | 1,000-5,000 |
| turmas | 50-200 |
| matriculas | 1,000-5,000 |
| sessoes_aula | 5,000-20,000/year |
| frequencia | 100,000-500,000/year |
| audit_logs | 1,000,000+ (growing) |

---

## Maintenance & Best Practices

### Regular Maintenance

1. **Vacuum Analysis**: Run `ANALYZE` weekly for query planner statistics
2. **Index Maintenance**: Monitor index bloat monthly
3. **Audit Log Archival**: Archive logs older than 2 years to cold storage
4. **Performance Monitoring**: Track slow queries (>1s) and optimize

### Backup Strategy

- **Full backup**: Daily at 02:00 UTC-3
- **Point-in-time recovery**: Enabled (7-day retention)
- **Replication**: Read replica for reports and analytics

### Security Checklist

- [x] RLS enabled on all tables
- [x] Audit logging for all critical operations
- [x] Sensitive data encrypted at rest
- [x] Connection pooling with pgBouncer
- [x] Regular security audits
- [x] LGPD compliance verification

---

**Generated**: 2025-01-17
**Database Version**: PostgreSQL 15 via Supabase
**Next Review**: 2025-04-17 (Quarterly)
