# 🚀 EDUCA - Setup Guia de Staging

## Pré-requisitos

- **Node.js** 18+ (recomendado: 22.x)
- **pnpm** (package manager obrigatório)
- Acesso às credenciais Supabase

---

## 1. Instalar pnpm (se não tiver)

```bash
# Opção 1: via npm
npm install -g pnpm

# Opção 2: via corepack (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate

# Verificar
pnpm --version
```

---

## 2. Clonar/Navegar para o Projeto

```bash
cd /mnt/c/repos/EDUCA/gestao_fronteira
```

---

## 3. Instalar Dependências

```bash
pnpm install
```

Tempo estimado: ~2-3 minutos (primeira vez)

---

## 4. Configurar Variáveis de Ambiente

```bash
# Copiar template
cp .env.local.example .env.local

# Editar com suas credenciais
nano .env.local  # ou code .env.local
```

### Variáveis Obrigatórias:

| Variável | Descrição | Onde encontrar |
|----------|-----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin | Supabase Dashboard > Settings > API |

> ⚠️ **NUNCA commite `.env.local`** - ele já está no .gitignore

---

## 5. Verificar TypeScript (Opcional mas Recomendado)

```bash
pnpm typecheck
```

> Nota: Existem alguns erros conhecidos em `attendance-immutability.ts` que não impedem a execução.

---

## 6. Popular Banco de Dados (Seeds)

### 6.1 Seed Minimalista (Recomendado para primeiro uso)

Cria superadmin + 9 escolas reais de Fronteira/MG:

```bash
pnpm seed:superadmin
```

**Credenciais criadas:**
- 📧 Email: `admin@fronteira.mg.gov.br`
- 🔑 Senha: `Admin@Fronteira2025`

### 6.2 Seed Completo (Dados de Teste)

Cria múltiplos usuários, alunos, turmas e matrículas de teste:

```bash
pnpm seed:dev
```

### 6.3 Limpar Seeds

```bash
pnpm seed:clear
```

---

## 7. Iniciar Servidor de Desenvolvimento

```bash
pnpm dev
```

Acesse: **http://localhost:3000**

---

## 8. Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Build de produção |
| `pnpm start` | Serve build de produção |
| `pnpm typecheck` | Verificação TypeScript |
| `pnpm lint` | ESLint |
| `pnpm test` | Testes unitários (Vitest) |
| `pnpm test:e2e` | Testes E2E (Playwright) |
| `pnpm seed:superadmin` | Seed minimalista |
| `pnpm seed:dev` | Seed completo |
| `pnpm seed:clear` | Limpar dados de seed |

---

## ✅ Checklist de Verificação

- [ ] Node.js 18+ instalado
- [ ] pnpm instalado
- [ ] `pnpm install` executado sem erros
- [ ] `.env.local` criado com credenciais válidas
- [ ] `pnpm seed:superadmin` executado (ou dados já existem)
- [ ] `pnpm dev` inicia sem erros fatais
- [ ] http://localhost:3000 carrega página de login
- [ ] Login com superadmin funciona

---

## 🐛 Troubleshooting

### "pnpm: command not found"
```bash
npm install -g pnpm
# ou reinicie o terminal após corepack enable
```

### "Cannot find module" durante seed
Certifique-se que `pnpm install` completou com sucesso.

### TypeScript errors durante dev
Alguns erros de tipo são conhecidos e não impedem a execução. O app deve funcionar.

### "Invalid API key"
Verifique se as credenciais no `.env.local` estão corretas e correspondem ao projeto Supabase.

### Porta 3000 em uso
```bash
# Matar processo na porta
npx kill-port 3000
# ou usar porta diferente
PORT=3001 pnpm dev
```

---

## 📚 Documentação Adicional

- `README.md` - Documentação completa do projeto
- `CLAUDE.md` - Referência rápida para desenvolvimento
- `docs/GUIA-RAPIDO-EDUCA.md` - Guia do usuário final
- `docs/gestao-fronteira-architecture.md` - Arquitetura técnica

---

*Última atualização: 2026-02-02*
