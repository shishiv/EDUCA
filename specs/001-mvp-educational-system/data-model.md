# Data Model

**Updated**: 2025-09-14

---

## Database Schema

### Existing Tables (from gestao_fronteira)

The following tables are already implemented and available:

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'diretor', 'secretario', 'professor', 'responsavel')),
    escola_id UUID REFERENCES escolas(id),
    nome_completo TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Schools Table (escolas)
```sql
CREATE TABLE escolas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    codigo_mec TEXT UNIQUE,
    endereco TEXT,
    telefone TEXT,
    diretor_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Students Table (alunos)
```sql
CREATE TABLE alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    data_nascimento DATE NOT NULL,
    cpf TEXT UNIQUE,
    endereco TEXT,
    telefone TEXT,
    escola_id UUID REFERENCES escolas(id) NOT NULL,
    necessidades_especiais TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Tables Required

[Document any new tables needed for this feature]

### Row Level Security Policies

All tables implement RLS policies for multi-school data isolation:

```sql
-- Example policy for school-based access
CREATE POLICY "Users see own school data only"
  ON alunos FOR SELECT
  USING (escola_id IN (
    SELECT escola_id FROM users WHERE id = auth.uid()
  ));
```

### Relationships

[Document key relationships and foreign keys]

### Indexes

[Document important indexes for query performance]
