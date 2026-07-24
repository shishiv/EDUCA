# Seed Demo — Sandbox Público EDUCA

Script de seed para popular o ambiente de demonstração pública do EDUCA com dados realistas brasileiros.

## Estrutura

```
supabase/seed-demo/
├── seed-demo.sql   # SQL com todos os dados de demonstracao
├── seed-demo.ts    # Script Node.js que executa o seed
└── README.md       # Este arquivo
```

## Dados Incluidos

| Entidade           | Quantidade | Observacao                           |
|--------------------|------------|--------------------------------------|
| Escolas            | 3          | EMEF, EMEI, CEMEI                    |
| Turmas             | 5          | Distribuidas entre as 3 escolas      |
| Professores        | 10         | 4 EMEF, 3 EMEI, 3 CEMEI              |
| Alunos             | 50         | 10 por turma, nomes brasileiros      |
| Responsaveis       | 50         | 1 por aluno (mae/pai)                |
| Matriculas         | 50         | 1 por aluno                          |
| Aulas Abertas      | 50         | 10 dias letivos x 5 turmas           |
| Registros Frequencia | 500      | 10 dias x 50 alunos, ~80% presenca  |
| Notas              | 300        | 2 bimestres x 3 avaliacoes x 50     |
| Calendario Escolar | 15         | Eventos, feriados, reunioes          |
| Disciplinas        | 15         | Distribuidas por tipo de escola      |
| Configs            | 8          | Configuracoes do sistema             |
| Admin Demo         | 1          | demo@educa.app.br                    |

### Frequencia

- 10 dias letivos (2 semanas, seg-sex)
- ~85% de presenca media para alunos regulares
- 4 alunos com frequencia abaixo de 80% (risco Bolsa Famililia)
- Algunas faltas com justificativa (atestado medico)

## Credenciais de Acesso

```
Email:  demo@educa.app.br
Senha:  Demo@Educa2026
```

## Uso Manual

### 1. Configurar variaveis de ambiente

```bash
export SUPABASE_DEMO_URL="https://seu-projeto-demo.supabase.co"
export SUPABASE_DEMO_SERVICE_KEY="eyJ..."
```

Ou crie um `.env` em `app/`:

```env
SUPABASE_DEMO_URL=https://seu-projeto-demo.supabase.co
SUPABASE_DEMO_SERVICE_KEY=eyJ...
```

### 2. Executar o seed

A partir do diretorio `app/`:

```bash
pnpm seed:demo
```

Ou diretamente com tsx:

```bash
cd app
pnpm tsx ../supabase/seed-demo/seed-demo.ts
```

## Como Funciona

O script `seed-demo.ts`:

1. **Conecta ao Supabase** via service role key (bypass RLS)
2. **Limpa todas as tabelas** (DELETE em todas as linhas)
3. **Executa o SQL** via endpoint `/pg/exec` do Supabase (fallback via `rpc`)
   - Desabilita triggers e RLS (`SET session_replication_role = 'replica'`)
   - Insere todos os dados
   - Reativa triggers e RLS (`SET session_replication_role = 'origin'`)
4. **Cria usuario admin** no `auth.users` via Admin API
5. **Verifica** contagens de todas as tabelas

## Reset Manual do Demo

Para resetar o ambiente de demonstracao:

```bash
cd app
pnpm seed:demo
```

## Estrutura dos Dados

### Escolas

| ID | Nome                          | Tipo        | Codigo    |
|----|-------------------------------|-------------|-----------|
| 1  | EMEF Professor Joao Silva     | fundamental | EMEF001   |
| 2  | EMEI Jardim da Infancia       | pre_escola  | EMEI001   |
| 3  | CEMEI Pequenos Passos         | creche      | CEMEI001  |

### Turmas

| ID | Nome          | Serie                  | Turno     | Escola | Professor           |
|----|---------------|------------------------|-----------|--------|---------------------|
| 1  | 3 Ano A       | 3 Ano EF               | manha     | EMEF   | Ana Beatriz        |
| 2  | 4 Ano B       | 4 Ano EF               | tarde     | EMEF   | Carlos Eduardo      |
| 3  | 5 Ano C       | 5 Ano EF               | manha     | EMEF   | Diana Cristina      |
| 4  | Pre II A      | Pre II                 | manha     | EMEI   | Gabriela Martins    |
| 5  | Maternal II A | Maternal II            | integral  | CEMEI  | Joao Pedro          |

### Alunos com Risco de Frequencia (<80%)

Estes alunos tem frequencia abaixo de 80%, acionando o alerta de risco Bolsa Famililia:

- Aluno 1 (Miguel Alves) - turma 1
- Aluno 4 (Helena Pereira) - turma 1
- Aluno 13 (Pedro Henrique) - turma 2
- Aluno 17 (Lucas Nogueira) - turma 2

## Notas

- Os UUIDs sao fixos e deterministicos para garantir reproducibilidade
- O seed desabilita temporariamente RLS e triggers para evitar conflitos
- O usuario demo e criado com `email_confirm: true` (login imediato)
- O script e idempotente: pode ser executado multiplas vezes