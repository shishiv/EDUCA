# 🎯 Portal dos Responsáveis - Roadmap de Implementação

> **Prioridade**: Próxima feature após MVP de produção validado
> **Status**: Planejamento inicial concluído
> **Impacto**: Alto - Engajamento familiar + Compliance Bolsa Família

---

## 📋 Visão Geral

Sistema de portal web/mobile para que responsáveis (pais, mães, tutores) possam acompanhar a vida escolar de seus filhos, com foco em:
- ✅ Transparência educacional
- ✅ Compliance com requisitos do Bolsa Família (frequência mínima 80%)
- ✅ Engajamento familiar no processo educativo
- ✅ Redução de carga administrativa da escola

---

## 🎯 Objetivos Estratégicos

### Impacto Social
- **Empoderamento Familiar**: Acesso transparente às informações escolares
- **Busca Ativa**: Alertas automáticos para famílias com alunos em risco de evasão
- **Inclusão Digital**: Interface simplificada para famílias com baixa inclusão digital

### Impacto Operacional
- **Redução de Demandas**: Menos solicitações presenciais de boletins e declarações
- **Compliance Automatizado**: Monitoramento em tempo real de frequência (Bolsa Família)
- **Comunicação Eficiente**: Canal direto escola-família

---

## 🔍 Questões de Descoberta (A Responder)

### 1. Acesso e Autenticação
**Decisões Pendentes:**
- [ ] Modelo de registro: Auto-cadastro vs Convite da escola?
- [ ] Método de autenticação: CPF+senha vs Código simplificado vs Biometria?
- [ ] Recuperação de senha: Email vs SMS vs Suporte presencial?
- [ ] Sessão: Duração de login? Lembrar dispositivo?

**Considerações:**
- Famílias com baixa inclusão digital (simplificar ao máximo)
- Múltiplos responsáveis por aluno (compartilhamento de credenciais?)
- Acesso via smartphone predominante (mobile-first)

### 2. Visualização de Dados

**Frequência:**
- [ ] Visualização: Diária, semanal, mensal, bimestral?
- [ ] Formato: Calendário visual vs Lista vs Gráfico de percentual?
- [ ] Histórico: Quanto tempo de dados disponíveis?
- [ ] Alertas: Notificação automática quando < 80%?

**Notas:**
- [ ] Visualização: Por bimestre vs Acumulado anual?
- [ ] Detalhamento: Apenas nota final vs Avaliações individuais?
- [ ] Comparações: Mostrar média da turma? (cuidado LGPD)
- [ ] Situação: Aprovado/Reprovado/Em recuperação?

**Outras Informações:**
- [ ] Calendário escolar (provas, feriados, eventos)
- [ ] Comunicados da escola
- [ ] Horário de aulas da turma
- [ ] Dados cadastrais do aluno (para conferência)

### 3. Multi-Guardian Scenarios

**Múltiplos Responsáveis por Aluno:**
- [ ] Permissões: Todos veem os mesmos dados?
- [ ] Notificações: Duplicadas ou configuráveis?
- [ ] Diferenciação: Responsável legal vs Responsável secundário?

**Múltiplos Filhos por Responsável:**
- [ ] Dashboard: Consolidado (todos os filhos) vs Individual?
- [ ] Navegação: Troca rápida entre filhos?
- [ ] Alertas: Agregados ou separados por filho?

### 4. Comunicação Escola-Família

**Nível de Interatividade:**
- [ ] Read-only (apenas visualização)?
- [ ] Justificativa de faltas (upload de atestados)?
- [ ] Mensagens para professores/secretaria?
- [ ] Solicitação de documentos (histórico, declarações)?
- [ ] Agendamento de reuniões?

**Canais de Comunicação:**
- [ ] In-app notifications (push)?
- [ ] SMS (integração com gateway)?
- [ ] Email?
- [ ] WhatsApp Business API?

### 5. Compliance e Segurança (LGPD)

**Proteção de Dados:**
- [ ] Termo de consentimento para acesso aos dados?
- [ ] Audit trail de acessos dos responsáveis?
- [ ] Restrição de visualização (apenas seus filhos)?
- [ ] Direito de exclusão de dados (LGPD Art. 18)?

**Segurança:**
- [ ] Two-Factor Authentication (2FA)?
- [ ] Detecção de acesso suspeito (IP, geolocalização)?
- [ ] Timeout de sessão?
- [ ] Criptografia de dados sensíveis?

### 6. Mobile-First Strategy

**Experiência Mobile:**
- [ ] PWA (Progressive Web App) vs App nativo?
- [ ] Offline-first (cache de dados)?
- [ ] Notificações push (service worker)?
- [ ] Deep linking (notificação → tela específica)?

**Performance:**
- [ ] Target: LCP < 2.5s em 3G?
- [ ] Lazy loading de imagens/componentes?
- [ ] Otimização de bundle para mobile?

---

## 🏗️ Arquitetura Proposta (Rascunho Inicial)

### Database Schema (Extensões)

```sql
-- Já existe: responsaveis, aluno_responsavel
-- Novas tabelas necessárias:

CREATE TABLE portal_access_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  responsavel_id uuid REFERENCES responsaveis(id),
  aluno_id uuid REFERENCES alunos(id),
  action text NOT NULL, -- 'login', 'view_attendance', 'view_grades'
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE portal_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  responsavel_id uuid REFERENCES responsaveis(id),
  aluno_id uuid REFERENCES alunos(id),
  type text NOT NULL, -- 'attendance_alert', 'grade_posted', 'school_announcement'
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE escola_comunicados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid REFERENCES escolas(id),
  turma_id uuid REFERENCES turmas(id), -- null = toda escola
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES users(id),
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies para portal dos responsáveis
ALTER TABLE portal_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE escola_comunicados ENABLE ROW LEVEL SECURITY;

-- Responsável só vê seus próprios logs/notificações
CREATE POLICY "Responsáveis podem ver próprios logs"
  ON portal_access_log FOR SELECT
  TO authenticated
  USING (
    responsavel_id IN (
      SELECT id FROM responsaveis WHERE user_id = auth.uid()
    )
  );
```

### API Routes (Next.js App Router)

```
app/
├── (portal-responsavel)/          # Layout específico do portal
│   ├── layout.tsx                 # Layout com navegação mobile-friendly
│   ├── dashboard/                 # Dashboard consolidado (múltiplos filhos)
│   ├── aluno/[id]/               # Detalhes de um filho específico
│   │   ├── frequencia/           # Attendance tracking
│   │   ├── notas/                # Grades
│   │   ├── comunicados/          # School announcements
│   │   └── documentos/           # Documents (boletim, declarações)
│   ├── notificacoes/             # Notification center
│   └── perfil/                   # Profile settings
├── api/
│   └── portal/
│       ├── alunos/               # List responsável's children
│       ├── frequencia/[alunoId]/ # Attendance data
│       ├── notas/[alunoId]/      # Grades data
│       ├── comunicados/          # School announcements
│       └── notificacoes/         # Notifications
```

### Components Structure

```
components/
├── portal/                        # Portal-specific components
│   ├── DashboardCard.tsx         # Card for each child (summary)
│   ├── AttendanceCalendar.tsx    # Visual attendance calendar
│   ├── GradesTable.tsx           # Quarterly grades table
│   ├── NotificationBadge.tsx     # Unread notification indicator
│   ├── AlertCard.tsx             # Attendance/performance alerts
│   └── StudentSelector.tsx       # Switch between children
```

---

## 📊 User Stories Prioritizadas

### Epic 1: Autenticação e Primeiro Acesso (P0 - Crítico)
- [ ] **US-001**: Como responsável, quero receber um convite da escola com código de acesso
- [ ] **US-002**: Como responsável, quero fazer login com CPF e senha simplificada
- [ ] **US-003**: Como responsável, quero recuperar minha senha de forma simples
- [ ] **US-004**: Como responsável, quero aceitar termos de consentimento (LGPD)

### Epic 2: Visualização de Frequência (P0 - Crítico)
- [ ] **US-005**: Como responsável, quero ver percentual de frequência do meu filho
- [ ] **US-006**: Como responsável, quero ver calendário visual de presença/falta
- [ ] **US-007**: Como responsável, quero receber alerta quando frequência < 80% (Bolsa Família)
- [ ] **US-008**: Como responsável, quero ver justificativas de faltas registradas

### Epic 3: Visualização de Notas (P1 - Alta)
- [ ] **US-009**: Como responsável, quero ver notas bimestrais do meu filho
- [ ] **US-010**: Como responsável, quero ver situação de aprovação/reprovação
- [ ] **US-011**: Como responsável, quero ver média necessária para aprovação
- [ ] **US-012**: Como responsável, quero ver observações do professor

### Epic 4: Múltiplos Filhos (P1 - Alta)
- [ ] **US-013**: Como responsável com múltiplos filhos, quero ver dashboard consolidado
- [ ] **US-014**: Como responsável, quero trocar rapidamente entre perfis dos filhos
- [ ] **US-015**: Como responsável, quero ver alertas agregados de todos os filhos

### Epic 5: Comunicação (P2 - Média)
- [ ] **US-016**: Como responsável, quero ver comunicados da escola
- [ ] **US-017**: Como responsável, quero receber notificações de novos comunicados
- [ ] **US-018**: Como responsável, quero baixar boletim em PDF
- [ ] **US-019**: Como responsável, quero justificar faltas com upload de atestado

### Epic 6: Mobile Experience (P1 - Alta)
- [ ] **US-020**: Como responsável, quero acessar o portal pelo smartphone
- [ ] **US-021**: Como responsável, quero receber notificações push
- [ ] **US-022**: Como responsável, quero instalar o portal como PWA
- [ ] **US-023**: Como responsável, quero acessar dados offline (últimos visualizados)

---

## 🚀 Plano de Implementação Faseado

### Fase 1: MVP Portal (2-3 semanas)
**Objetivo**: Portal read-only básico com frequência e notas

**Entregáveis:**
- [ ] Layout responsivo mobile-first
- [ ] Autenticação simplificada (CPF + senha)
- [ ] Dashboard com lista de filhos
- [ ] Visualização de frequência (calendário + percentual)
- [ ] Visualização de notas (tabela bimestral)
- [ ] RLS policies para isolamento de dados

**Critérios de Aceite:**
- Responsável consegue fazer login
- Responsável vê frequência atualizada de seus filhos
- Responsável vê notas bimestrais de seus filhos
- Mobile-responsive (< 375px funcional)
- Performance: LCP < 3s em 3G

### Fase 2: Alertas e Notificações (1-2 semanas)
**Objetivo**: Sistema proativo de alertas de risco

**Entregáveis:**
- [ ] Sistema de notificações in-app
- [ ] Alertas automáticos de frequência < 80%
- [ ] Notificações de novas notas lançadas
- [ ] Badge de notificações não lidas
- [ ] Histórico de notificações

**Critérios de Aceite:**
- Alerta criado automaticamente quando frequência < 80%
- Notificação exibida no dashboard
- Contador de notificações não lidas funcional

### Fase 3: Comunicação Escola-Família (2 semanas)
**Objetivo**: Canal de comunicação bidirecional

**Entregáveis:**
- [ ] Módulo de comunicados da escola
- [ ] Filtro de comunicados por turma/escola
- [ ] Upload de atestados médicos (justificativa de faltas)
- [ ] Download de boletim em PDF
- [ ] Download de declarações (matrícula, frequência)

**Critérios de Aceite:**
- Escola consegue publicar comunicados
- Responsável vê comunicados da turma do filho
- Responsável consegue fazer upload de atestado
- PDF de boletim gerado corretamente

### Fase 4: PWA e Offline-First (1 semana)
**Objetivo**: Experiência mobile otimizada

**Entregáveis:**
- [ ] Service Worker com cache strategy
- [ ] Manifest.json para instalação PWA
- [ ] Notificações push (Web Push API)
- [ ] Offline fallback para últimos dados visualizados
- [ ] Sync de dados quando conexão restaurada

**Critérios de Aceite:**
- PWA instalável no Android/iOS
- Notificações push funcionam
- Dados básicos acessíveis offline

### Fase 5: Analytics e Compliance (1 semana)
**Objetivo**: Monitoramento e conformidade LGPD

**Entregáveis:**
- [ ] Audit trail de acessos
- [ ] Dashboard de métricas de uso (admin)
- [ ] Termo de consentimento LGPD
- [ ] Exportação de dados do responsável (LGPD Art. 18)
- [ ] Relatório de engajamento familiar (para diretores)

**Critérios de Aceite:**
- Todos acessos registrados com timestamp
- Responsável consegue exportar seus dados
- Administrador vê métricas de uso do portal

---

## 🎨 Design System & UI/UX

### Princípios de Design
- **Mobile-First**: Maioria dos acessos será via smartphone
- **Simplicidade**: Interface limpa para usuários com baixa inclusão digital
- **Acessibilidade**: WCAG 2.1 AA compliance
- **Performance**: < 3s LCP em 3G

### Wireframes (A Desenvolver)
- [ ] Tela de login
- [ ] Dashboard (múltiplos filhos)
- [ ] Detalhes do aluno (frequência + notas)
- [ ] Calendário de frequência
- [ ] Lista de comunicados
- [ ] Central de notificações

### Paleta de Cores (Sugestão)
```css
/* Alinhada com gestao_fronteira */
--primary: hsl(221.2 83.2% 53.3%);      /* Azul - Confiança */
--success: hsl(142.1 76.2% 36.3%);      /* Verde - Frequência OK */
--warning: hsl(32.1 94.6% 43.7%);       /* Laranja - Alerta 80-85% */
--destructive: hsl(346.8 77.2% 49.8%);  /* Vermelho - Crítico < 80% */
```

---

## 📈 Métricas de Sucesso

### KPIs Operacionais
- **Adoção**: % de responsáveis que fazem login (meta: 60% no primeiro mês)
- **Engajamento**: Média de logins por semana (meta: 2x/semana)
- **Redução de Demandas**: % redução de solicitações presenciais (meta: 40%)

### KPIs Educacionais
- **Busca Ativa**: Tempo médio entre alerta e ação (meta: < 48h)
- **Frequência**: Melhoria de frequência após implantação (meta: +5%)
- **Evasão**: Redução de evasão escolar (meta: -10%)

### KPIs Técnicos
- **Performance**: LCP < 2.5s (meta: 90% dos acessos)
- **Disponibilidade**: Uptime 99.5%
- **Erros**: Taxa de erro < 1%

---

## 🔒 Considerações de Segurança

### Autenticação
- [ ] Senha mínima: 6 caracteres (simplicidade vs segurança)
- [ ] Rate limiting: Max 5 tentativas de login/15min
- [ ] Sessão: Timeout de 30 dias (lembrar dispositivo)
- [ ] 2FA opcional para responsáveis que queiram

### Autorização (RLS Policies)
```sql
-- Responsável só vê dados de seus filhos
CREATE POLICY "Responsáveis veem apenas seus filhos"
  ON alunos FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT aluno_id FROM aluno_responsavel
      WHERE responsavel_id IN (
        SELECT id FROM responsaveis WHERE user_id = auth.uid()
      )
    )
  );

-- Similar para frequencia, notas, etc.
```

### Proteção de Dados (LGPD)
- [ ] Termo de consentimento explícito
- [ ] Minimização de dados (apenas o necessário)
- [ ] Direito de acesso (exportação de dados)
- [ ] Direito de exclusão (anonimização)
- [ ] Audit trail completo

---

## 🧪 Estratégia de Testes

### Unit Tests (Jest)
- [ ] Componentes do portal (AttendanceCalendar, GradesTable)
- [ ] Formatação de dados (percentuais, datas)
- [ ] Lógica de alertas (< 80% frequência)

### Integration Tests (React Testing Library)
- [ ] Fluxo de login
- [ ] Navegação entre filhos
- [ ] Visualização de dados de frequência/notas
- [ ] Marcação de notificações como lidas

### E2E Tests (Playwright)
- [ ] Jornada completa: Login → Dashboard → Ver frequência → Ver notas → Logout
- [ ] Múltiplos filhos: Troca entre perfis
- [ ] Responsividade: Desktop + Tablet + Mobile
- [ ] PWA: Instalação + Notificações push

### Performance Tests
- [ ] Lighthouse CI: Score > 90 em Performance/Accessibility
- [ ] Load testing: 100 responsáveis simultâneos
- [ ] Network throttling: 3G Fast/Slow

---

## 📚 Referências e Inspirações

### Sistemas Similares
- **Google Classroom**: Portal para pais (inspiração UX)
- **Seesaw**: Comunicação escola-família (features)
- **ClassDojo**: Engajamento parental (gamificação?)

### Compliance e Regulamentação
- **LGPD (Lei 13.709/2018)**: Proteção de dados pessoais
- **Bolsa Família**: Requisitos de frequência mínima 80%
- **ECA (Estatuto da Criança e do Adolescente)**: Direitos educacionais
- **INEP/Educacenso**: Padrões de dados educacionais

### Tecnologias e Padrões
- **PWA (Progressive Web App)**: Offline-first, installable
- **Web Push API**: Notificações push no navegador
- **Service Workers**: Cache strategy, background sync
- **WCAG 2.1 AA**: Acessibilidade digital

---

## 💡 Ideias Futuras (Backlog)

### Features Avançadas
- [ ] **Gamificação**: Badges para alunos com 100% frequência
- [ ] **Comparação Temporal**: Gráfico de evolução de notas ao longo do ano
- [ ] **Agenda Compartilhada**: Calendário de provas/eventos sincronizado
- [ ] **Chat em Tempo Real**: Mensagens diretas com professores
- [ ] **Biblioteca de Recursos**: Materiais didáticos para estudo em casa
- [ ] **Mural de Fotos**: Escola compartilha fotos de eventos/atividades
- [ ] **Questionários de Feedback**: Pesquisas de satisfação dos responsáveis

### Integrações Externas
- [ ] **WhatsApp Business API**: Notificações via WhatsApp
- [ ] **SMS Gateway**: Alertas críticos via SMS (fallback)
- [ ] **Google Calendar**: Sincronização de eventos escolares
- [ ] **Bolsa Família API**: Integração direta com sistema federal (se disponível)

### Inovação Educacional
- [ ] **IA para Predição de Risco**: Machine learning para prever evasão
- [ ] **Análise de Sentimento**: Processar comunicação para detectar problemas
- [ ] **Recomendações Personalizadas**: Sugestões de atividades de reforço

---

## 📞 Próximos Passos (Quando Retomar)

1. **Validação com Stakeholders**
   - [ ] Apresentar proposta para diretores de escola
   - [ ] Pesquisa com responsáveis sobre necessidades
   - [ ] Validar viabilidade técnica com equipe de desenvolvimento

2. **Prototipação**
   - [ ] Wireframes de alta fidelidade (Figma)
   - [ ] Protótipo navegável para testes de usabilidade
   - [ ] Testes com 5-10 responsáveis reais

3. **Planejamento Técnico**
   - [ ] Especificação detalhada de API endpoints
   - [ ] Schema final de banco de dados
   - [ ] Arquitetura de notificações (push/SMS/email)

4. **Desenvolvimento Fase 1**
   - [ ] Seguir plano de implementação faseado
   - [ ] TDD com testes E2E desde o início
   - [ ] Validação contínua com Chrome DevTools MCP

---

## 📝 Notas e Decisões de Design

### Decisão 1: PWA vs App Nativo
**Escolha**: PWA (Progressive Web App)
**Justificativa**:
- ✅ Custo de desenvolvimento menor (uma codebase)
- ✅ Distribuição mais simples (sem lojas de apps)
- ✅ Atualizações instantâneas
- ✅ Funciona em iOS e Android
- ❌ Recursos nativos limitados (mas suficiente para MVP)

### Decisão 2: Autenticação Simplificada
**Escolha**: CPF + Senha de 6 dígitos (mínimo)
**Justificativa**:
- ✅ Familiar para usuários brasileiros (CPF é conhecido)
- ✅ Menor barreira de entrada para baixa inclusão digital
- ✅ Possibilidade de 2FA opcional depois
- ⚠️ Segurança aceitável com rate limiting + audit trail

### Decisão 3: Read-Only no MVP
**Escolha**: Portal apenas visualização (sem edição de dados)
**Justificativa**:
- ✅ Reduz complexidade e riscos de segurança
- ✅ Foco em transparência, não em administração
- ✅ Funções de edição podem vir em fases futuras
- ✅ Alinhado com papel de "responsavel" (não admin)

---

**Última Atualização**: 2025-10-10
**Autor**: Claude Code (brainstorming session)
**Status**: 🎯 Pronto para validação e prototipação quando MVP de produção estiver validado
