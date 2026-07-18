# Adotando o EDUCA na sua Prefeitura

Este guia é para **gestores de TI municipais** que querem implantar o EDUCA na sua rede escolar.

---

## O que é o EDUCA

O EDUCA é um sistema de informação escolar (SIS) open source desenvolvido para municípios brasileiros. Substitui o controle em papel de:

- Matrículas e cadastro de alunos
- Chamada diária (frequência)
- Boletins e notas
- Diário de classe
- Relatórios Bolsa Família
- Dados para INEP/Educacenso

---

## Requisitos de Infraestrutura

### Mínimo (até 5 escolas, ~500 alunos)
- **Banco:** Supabase Free Tier (500 MB, suficiente para começar)
- **Hosting:** Vercel Hobby (gratuito para projetos open source)
- **Domínio:** Opcional — funciona no subdomínio Vercel

### Recomendado (6+ escolas, 1.000+ alunos)
- **Banco:** Supabase Pro ($25/mês) ou PostgreSQL em VPS própria
- **Hosting:** Vercel Pro ou Railway ($5–20/mês)
- **Domínio:** Próprio (ex: `educa.suamunicipio.mg.gov.br`)

### Self-hosted (infraestrutura municipal própria)
- PostgreSQL 15+ em servidor Linux
- Node.js 20+ com PM2
- Nginx como reverse proxy
- Docker Compose incluído neste repositório

---

## Checklist de Implantação

### 1. Banco de dados
- [ ] Criar projeto no Supabase (ou provisionar PostgreSQL próprio)
- [ ] Aplicar migrations: `pnpm supabase db push` ou importar `supabase/migrations/`
- [ ] Configurar Row Level Security (já incluído nas migrations)

### 2. Configuração municipal
- [ ] Criar `.env.local` a partir de `.env.local.example`
- [ ] Preencher `NEXT_PUBLIC_MUNICIPAL_NAME` com o nome do município
- [ ] Preencher `NEXT_PUBLIC_SECRETARIA_NAME` com o nome da secretaria
- [ ] Configurar contatos do DPO (LGPD)

### 3. Deploy
- [ ] Fork ou clone do repositório
- [ ] Configurar variáveis de ambiente no serviço de hosting
- [ ] Deploy do diretório `app/`
- [ ] Verificar que o login funciona com usuário superadmin

### 4. Dados iniciais
- [ ] Cadastrar escolas da rede municipal
- [ ] Criar usuários por função (secretaria, diretores, professores)
- [ ] Cadastrar alunos (via interface ou script de importação)
- [ ] Configurar ano letivo e turmas

### 5. Treinamento
- [ ] Demonstrar chamada digital para professores
- [ ] Demonstrar boletim para secretaria escolar
- [ ] Configurar alertas de Bolsa Família

---

## Caso de Uso de Referência

**Fronteira/MG** — o município que originou o projeto:
- 9 escolas municipais de ensino fundamental + 1 em construção
- ~1.200 alunos
- 5 funções de usuário (superadmin, secretaria, diretores, professores, responsáveis)
- Necessidade principal: chamada com imutabilidade + relatórios Bolsa Família

O sistema foi desenvolvido com base em entrevistas com a Secretaria Municipal de Educação e validação com diretores de escola.

---

## Suporte da Comunidade

- **Issues:** https://github.com/shishiv/EDUCA/issues
- **Discussões:** https://github.com/shishiv/EDUCA/discussions

Para suporte prioritário ou implantação assistida, abra uma issue com a label `municipality-adoption`.
