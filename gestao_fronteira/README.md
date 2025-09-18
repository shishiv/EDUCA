# Sistema de Gestão Escolar - Fronteira/MG

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5.3-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.1.1-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.9.2-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-2.57.4-green?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-3.4.17-cyan?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS" />
</div>

## 📖 Sobre o Projeto

Sistema completo de gestão educacional desenvolvido para a **Secretaria Municipal de Educação de Fronteira/MG**. Esta plataforma moderniza a administração escolar municipal através de uma solução digital integrada que atende às necessidades específicas da educação brasileira.

### 🎯 Objetivo Principal

Digitalizar e otimizar todos os processos da rede municipal de ensino, proporcionando:
- **Gestão eficiente** de alunos, escolas e professores
- **Conformidade legal** com a legislação educacional brasileira
- **Acessibilidade mobile** para professores em campo
- **Relatórios automatizados** para tomada de decisões

## ✨ Funcionalidades Principais

### 👥 Gestão de Usuários (100% Completo)
- **5 tipos de usuário**: Admin, Diretor, Secretário, Professor, Responsável
- **Autenticação segura** com Supabase Auth
- **Controle de permissões** baseado em roles (RBAC)
- **Multi-tenancy** com isolamento por escola (RLS)

### 🎓 Gestão de Alunos (100% Completo)
- **Cadastro completo** com dados pessoais e familiares
- **Validação de CPF** e telefones brasileiros
- **Upload de fotos** com otimização automática
- **Histórico acadêmico** completo
- **Necessidades especiais** e observações

### 🏫 Administração Escolar (100% Completo)
- **Cadastro de escolas** da rede municipal
- **Gestão de turmas** com capacidade e horários
- **Atribuição de professores** às disciplinas
- **Controle de matrículas** por ano letivo

### 📋 Frequência Digital (85% Completo)
- **Chamada eletrônica** otimizada para tablets
- **Workflow "Abrir aula"** (em desenvolvimento)
- **Registros imutáveis** após salvamento
- **Conformidade legal** brasileira

### 📊 Relatórios e Analytics (85% Completo)
- **Dashboard executivo** com métricas em tempo real
- **Relatórios de frequência** automáticos
- **Monitoramento de 80%** de presença (busca ativa)
- **Exportação PDF/Excel** de relatórios

## 🛠️ Stack Tecnológica

### Frontend
- **[Next.js 15.5.3](https://nextjs.org/)** - Framework React com App Router
- **[React 19.1.1](https://react.dev/)** - Biblioteca de interface
- **[TypeScript 5.9.2](https://www.typescriptlang.org/)** - Tipagem estática
- **[Tailwind CSS 3.4.17](https://tailwindcss.com/)** - Estilização
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes de interface

### Backend e Banco de Dados
- **[Supabase](https://supabase.com/)** - BaaS (Auth + Database + Storage)
- **PostgreSQL** - Banco de dados relacional
- **Row Level Security (RLS)** - Segurança multi-tenant

### Formulários e Validação
- **[React Hook Form](https://react-hook-form.com/)** - Gerenciamento de formulários
- **[Zod](https://zod.dev/)** - Validação de schemas
- **Validações brasileiras** - CPF, telefone, CEP

### Estado e Dados
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Gerenciamento de estado global
- **[TanStack Query](https://tanstack.com/query)** - Cache e sincronização de dados
- **[TanStack Table](https://tanstack.com/table)** - Tabelas interativas

### Relatórios e Exportação
- **[jsPDF](https://github.com/parallax/jsPDF)** - Geração de PDFs
- **[ExcelJS](https://github.com/exceljs/exceljs)** - Exportação Excel
- **[Recharts](https://recharts.org/)** - Gráficos e dashboards

### Ferramentas de Desenvolvimento
- **[ESLint](https://eslint.org/)** - Linting de código
- **[Prettier](https://prettier.io/)** - Formatação automática
- **[Turbopack](https://turbo.build/pack)** - Bundler de desenvolvimento

## 🚀 Primeiros Passos

### Pré-requisitos

- **Node.js** >= 18.0.0
- **pnpm** >= 9.0.0 (gerenciador de pacotes)
- **Conta Supabase** para banco de dados

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd gestao_fronteira
   ```

2. **Instale as dependências**
   ```bash
   pnpm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env.local
   ```

   Edite `.env.local` com suas credenciais Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=seu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   ```

4. **Execute as migrações do banco**
   ```bash
   supabase start
   supabase db push
   ```

5. **Inicie o servidor de desenvolvimento**
   ```bash
   pnpm dev
   ```

   Acesse http://localhost:3000 no seu navegador.

## 📁 Estrutura do Projeto

```
gestao_fronteira/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de rotas de autenticação
│   ├── (dashboard)/              # Grupo de rotas do dashboard
│   │   ├── dashboard/
│   │   │   ├── alunos/          # Gestão de alunos
│   │   │   ├── usuarios/        # Gestão de usuários
│   │   │   ├── escolas/         # Gestão de escolas
│   │   │   ├── turmas/          # Gestão de turmas
│   │   │   ├── matriculas/      # Gestão de matrículas
│   │   │   ├── frequencia/      # Controle de frequência
│   │   │   └── relatorios/      # Relatórios e dashboards
│   ├── api/                     # API Routes
│   ├── globals.css              # Estilos globais
│   ├── layout.tsx               # Layout principal
│   ├── page.tsx                 # Landing page
│   └── providers.tsx            # Providers (React Query, etc.)
├── components/                   # Componentes reutilizáveis
│   ├── auth/                    # Componentes de autenticação
│   ├── dashboard/               # Componentes do dashboard
│   ├── forms/                   # Formulários
│   └── ui/                      # Componentes shadcn/ui
├── lib/                         # Utilitários e configurações
│   ├── supabase/               # Cliente Supabase
│   ├── validations/            # Schemas Zod
│   └── utils.ts                # Funções utilitárias
├── types/                       # Definições TypeScript
│   ├── database.ts             # Tipos gerados do Supabase
│   └── auth.ts                 # Tipos de autenticação
├── hooks/                       # Custom React Hooks
├── stores/                      # Stores Zustand
└── supabase/                    # Configurações Supabase
    ├── migrations/             # Migrações SQL
    └── config.toml             # Configuração local
```

## 📝 Scripts Disponíveis

### Desenvolvimento
```bash
pnpm dev          # Servidor de desenvolvimento (Turbopack)
pnpm build        # Build de produção
pnpm start        # Servidor de produção
```

### Qualidade de Código
```bash
pnpm lint         # Executa ESLint
pnpm typecheck    # Verifica tipos TypeScript
```

### Banco de Dados
```bash
pnpm seed:dev     # Popula banco com dados de desenvolvimento
pnpm seed:clear   # Limpa dados de desenvolvimento
pnpm db:types     # Gera tipos TypeScript do Supabase
```

## 🏗️ Arquitetura do Sistema

### Banco de Dados (Schema: gestao_fronteira)

#### Tabelas Principais
- **`users`** - Usuários do sistema (5 roles)
- **`escolas`** - Escolas da rede municipal
- **`alunos`** - Estudantes matriculados
- **`responsaveis`** - Pais/responsáveis
- **`turmas`** - Classes por ano letivo
- **`matriculas`** - Vínculos aluno-turma
- **`frequencia`** - Registros de presença
- **`notas`** - Sistema de avaliação

#### Segurança
- **Row Level Security (RLS)** habilitado
- **Políticas por escola** (multi-tenancy)
- **Auditoria completa** com timestamps
- **Backup automático** via Supabase

### Autenticação e Autorização

#### Tipos de Usuário
1. **Admin** - Acesso total ao sistema
2. **Diretor** - Gestão de sua escola
3. **Secretário** - Suporte administrativo
4. **Professor** - Frequência e notas de suas turmas
5. **Responsável** - Visualização dos filhos

#### Fluxo de Autenticação
1. Login via email/senha
2. JWT token do Supabase
3. Verificação de role e escola
4. Redirecionamento baseado em permissões

## 🔧 Configuração de Desenvolvimento

### Supabase Local

1. **Instale a CLI do Supabase**
   ```bash
   npm install -g supabase
   ```

2. **Inicie o ambiente local**
   ```bash
   supabase start
   ```

3. **Aplique as migrações**
   ```bash
   supabase db push
   ```

### Variáveis de Ambiente

#### `.env.local` (Desenvolvimento)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_local
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_local

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=seu_secret_aqui
```

#### `.env.production` (Produção)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_prod
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_prod

# Next.js
NEXTAUTH_URL=https://sme.fronteira.mg.gov.br
NEXTAUTH_SECRET=seu_secret_seguro
```

## 📋 Dados de Teste

### Usuários Padrão (Desenvolvimento)

```typescript
// Admin
email: admin@fronteira.mg.gov.br
senha: admin123

// Diretor
email: diretor@fronteira.mg.gov.br
senha: diretor123

// Professor
email: professor@fronteira.mg.gov.br
senha: prof123
```

### Dados de Exemplo
- **15+ escolas** municipais
- **3.200+ alunos** cadastrados
- **180+ professores** ativos
- **120+ turmas** por ano letivo

## 🚀 Deploy e Produção

### Plataformas Recomendadas

#### Vercel (Recomendado)
```bash
# Instale a CLI da Vercel
npm install -g vercel

# Deploy direto
vercel --prod
```

#### Configuração de Domínio
- **Produção**: `sme.fronteira.mg.gov.br`
- **Desenvolvimento**: `dev.sme.fronteira.mg.gov.br`

### Configurações de Produção

#### Performance
- **Bundle Analyzer** habilitado
- **Otimização de imagens** configurada
- **Compressão Gzip** ativa
- **Cache headers** otimizados

#### Segurança
- **Headers de segurança** configurados
- **CORS** restrito aos domínios válidos
- **Rate limiting** em APIs sensíveis

## 🔍 Monitoramento e Analytics

### Métricas de Performance
- **Dashboard** deve carregar em < 3s
- **Frequência** deve marcar em < 1s por aluno
- **Relatórios** devem gerar em < 5s

### Logs e Debugging
- **Console logs** estruturados
- **Error tracking** com Supabase
- **Performance monitoring** nativo

## 🤝 Contribuição

### Fluxo de Desenvolvimento

1. **Fork** o repositório
2. **Crie** uma branch feature (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** um Pull Request

### Padrões de Código

#### Commits
```bash
# Prefixos obrigatórios
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração
test: testes
chore: manutenção
```

#### Componentes
- **PascalCase** para componentes
- **camelCase** para funções
- **kebab-case** para arquivos
- **SCREAMING_SNAKE_CASE** para constantes

## 📞 Suporte e Contato

### Secretaria Municipal de Educação - Fronteira/MG
- **Endereço**: Fronteira, Minas Gerais
- **Telefone**: (34) 3555-0000
- **Email**: educacao@fronteira.mg.gov.br
- **Suporte Técnico**: suporte@fronteira.mg.gov.br

### Desenvolvedores
- **Email**: dev@fronteira.mg.gov.br
- **Issues**: Use o GitHub Issues para bugs e solicitações
- **Documentação**: Consulte a wiki do projeto

## 📄 Licença

Este projeto é propriedade da **Secretaria Municipal de Educação de Fronteira/MG**.

Todos os direitos reservados © 2024.

---

<div align="center">
  <strong>Sistema de Gestão Escolar - Fronteira/MG</strong><br>
  Transformando a educação através da tecnologia 🎓
</div>
