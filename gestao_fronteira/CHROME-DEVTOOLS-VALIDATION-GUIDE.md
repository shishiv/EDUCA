# 🎯 Guia de Validação UI/UX com Chrome DevTools MCP

**Data**: 2025-11-12
**Projeto**: Sistema de Gestão Escolar - Fronteira/MG
**Status**: Pronto para validação de 1 escola piloto

---

## 📋 Pré-requisitos

### 1. Ambiente Configurado
```bash
# Verificar se o servidor está rodando
curl http://localhost:3000

# Se não estiver, iniciar:
cd /home/user/SRE/gestao_fronteira
pnpm dev
```

### 2. Chrome DevTools MCP Configurado
- Verificar `.mcp.json` possui `chrome-devtools-mcp` ativo
- Browser Chrome/Chromium instalado
- Porta 3000 acessível

---

## 🚀 Workflow de Validação Completo

### FASE 1: Landing Page & Login (10 min)

#### 1.1 Testar Landing Page
```bash
# Navegar para landing
mcp__chrome-devtools__navigate_page http://localhost:3000

# Capturar desktop
mcp__chrome-devtools__take_screenshot landing-desktop.png

# Testar mobile
mcp__chrome-devtools__resize_page 375 667
mcp__chrome-devtools__take_screenshot landing-mobile.png

# Testar tablet
mcp__chrome-devtools__resize_page 768 1024
mcp__chrome-devtools__take_screenshot landing-tablet.png

# Verificar console
mcp__chrome-devtools__list_console_messages

# Voltar para desktop
mcp__chrome-devtools__resize_page 1920 1080
```

**✅ Critérios de Aprovação:**
- [ ] Screenshots responsivos OK
- [ ] Console sem erros críticos
- [ ] Links de navegação funcionam
- [ ] CTA "Entrar no Sistema" visível

---

#### 1.2 Testar Login Flow
```bash
# Navegar para login
mcp__chrome-devtools__navigate_page http://localhost:3000/login

# Screenshot desktop
mcp__chrome-devtools__take_screenshot login-page-desktop.png

# Testar responsividade mobile
mcp__chrome-devtools__resize_page 375 667
mcp__chrome-devtools__take_screenshot login-page-mobile.png

# Verificar console
mcp__chrome-devtools__list_console_messages

# Testar preenchimento de formulário (se tiver credenciais de teste)
# mcp__chrome-devtools__fill "input[name=email]" "admin@fronteira.mg.gov.br"
# mcp__chrome-devtools__fill "input[name=password]" "SenhaSegura123"

# Verificar network requests
mcp__chrome-devtools__list_network_requests
```

**✅ Critérios de Aprovação:**
- [ ] Formulário de login responsivo
- [ ] Validação de CPF funciona
- [ ] Mensagens de erro claras
- [ ] Loading state durante autenticação
- [ ] Console limpo

---

### FASE 2: Dashboard Principal (15 min)

**⚠️ IMPORTANTE:** Para testar dashboard, você precisa estar autenticado. Opções:

**Opção A: Login manual via browser**
1. Abrir http://localhost:3000/login no Chrome
2. Fazer login com credenciais de superadmin
3. Rodar MCP tools com sessão ativa

**Opção B: Seed de dados de teste**
```bash
# Criar superadmin
pnpm seed:superadmin

# Usar credenciais:
# Email: admin@fronteira.mg.gov.br
# Senha: FronteiraMG2024!
```

#### 2.1 Dashboard Overview
```bash
# Navegar para dashboard (após login)
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard

# Screenshot desktop
mcp__chrome-devtools__take_screenshot dashboard-desktop.png

# Verificar métricas carregam
mcp__chrome-devtools__wait_for text="Total de Alunos" 5000

# Screenshot após carregamento
mcp__chrome-devtools__take_screenshot dashboard-loaded.png

# Testar responsividade tablet (caso de uso professor)
mcp__chrome-devtools__resize_page 768 1024
mcp__chrome-devtools__take_screenshot dashboard-tablet.png

# Testar responsividade mobile
mcp__chrome-devtools__resize_page 375 667
mcp__chrome-devtools__take_screenshot dashboard-mobile.png

# Verificar console
mcp__chrome-devtools__list_console_messages

# Verificar network (API calls)
mcp__chrome-devtools__list_network_requests
```

**✅ Critérios de Aprovação:**
- [ ] Cards de métricas carregam dados
- [ ] Gráficos renderizam corretamente
- [ ] Sidebar navegação visível
- [ ] Mobile: menu hamburguer funciona
- [ ] Console sem erros
- [ ] API requests retornam 200

---

#### 2.2 Navegação Sidebar
```bash
# Voltar para desktop
mcp__chrome-devtools__resize_page 1920 1080

# Testar links principais (assumindo seletores corretos)
# Exemplo: navegar para alunos
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/alunos

# Screenshot
mcp__chrome-devtools__take_screenshot alunos-page.png

# Verificar tabela de alunos
mcp__chrome-devtools__wait_for text="Lista de Alunos" 3000

# Console check
mcp__chrome-devtools__list_console_messages
```

**✅ Critérios de Aprovação:**
- [ ] Navegação entre páginas funciona
- [ ] Breadcrumbs atualizam corretamente
- [ ] Active state nos links da sidebar
- [ ] Transições suaves

---

### FASE 3: Gestão de Alunos (15 min)

#### 3.1 Lista de Alunos
```bash
# Página de listagem
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/alunos

# Screenshot desktop
mcp__chrome-devtools__take_screenshot alunos-lista-desktop.png

# Testar filtros/busca (se existir)
# mcp__chrome-devtools__fill "input[type=search]" "João"

# Verificar tabela responsiva tablet
mcp__chrome-devtools__resize_page 768 1024
mcp__chrome-devtools__take_screenshot alunos-lista-tablet.png

# Mobile
mcp__chrome-devtools__resize_page 375 667
mcp__chrome-devtools__take_screenshot alunos-lista-mobile.png

# Console
mcp__chrome-devtools__list_console_messages

# Network
mcp__chrome-devtools__list_network_requests
```

**✅ Critérios de Aprovação:**
- [ ] Tabela renderiza corretamente
- [ ] Paginação funciona (se aplicável)
- [ ] Busca/filtros funcionam
- [ ] Mobile: scroll horizontal ou cards
- [ ] Loading states visíveis

---

#### 3.2 Cadastro de Aluno
```bash
# Voltar para desktop
mcp__chrome-devtools__resize_page 1920 1080

# Navegar para novo aluno
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/alunos/novo

# Screenshot
mcp__chrome-devtools__take_screenshot aluno-cadastro-desktop.png

# Testar responsividade mobile
mcp__chrome-devtools__resize_page 375 667
mcp__chrome-devtools__take_screenshot aluno-cadastro-mobile.png

# Verificar campos brasileiros (CPF, telefone)
# Screenshot de validação de CPF inválido (se possível interagir)

# Console
mcp__chrome-devtools__list_console_messages
```

**✅ Critérios de Aprovação:**
- [ ] Formulário responsivo
- [ ] Validação de CPF funciona
- [ ] Validação de telefone BR
- [ ] Upload de foto funciona
- [ ] Mensagens de erro claras
- [ ] Campos obrigatórios marcados

---

### FASE 4: Frequência/Diário (20 min)

#### 4.1 Workflow "Abrir Aula"
```bash
# Desktop
mcp__chrome-devtools__resize_page 1920 1080

# Navegar para frequência
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/frequencia

# Screenshot inicial
mcp__chrome-devtools__take_screenshot frequencia-inicial.png

# Verificar botão "Abrir Aula"
mcp__chrome-devtools__wait_for text="Abrir Aula" 3000

# Screenshot após carregamento
mcp__chrome-devtools__take_screenshot frequencia-carregada.png

# Console
mcp__chrome-devtools__list_console_messages

# Network
mcp__chrome-devtools__list_network_requests
```

**✅ Critérios de Aprovação:**
- [ ] Página carrega sem erros
- [ ] Botão "Abrir Aula" visível
- [ ] Lista de turmas do professor
- [ ] Console limpo

---

#### 4.2 Interface de Marcação (Tablet - caso de uso real)
```bash
# Tablet landscape (professor em sala)
mcp__chrome-devtools__resize_page 1024 768

# Screenshot
mcp__chrome-devtools__take_screenshot frequencia-tablet-landscape.png

# Tablet portrait
mcp__chrome-devtools__resize_page 768 1024
mcp__chrome-devtools__take_screenshot frequencia-tablet-portrait.png

# Verificar touch targets (botões grandes)
# Screenshot de grid de alunos (se disponível)

# Mobile (fallback)
mcp__chrome-devtools__resize_page 375 667
mcp__chrome-devtools__take_screenshot frequencia-mobile.png
```

**✅ Critérios de Aprovação:**
- [ ] Grid de alunos responsivo
- [ ] Botões touch-friendly (>48px)
- [ ] Marcação P/F/J clara
- [ ] Scroll performático
- [ ] Cores acessíveis (contraste)

---

#### 4.3 Diário de Classe
```bash
# Desktop
mcp__chrome-devtools__resize_page 1920 1080

# Navegar para diário
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/diario

# Screenshot
mcp__chrome-devtools__take_screenshot diario-desktop.png

# Mobile
mcp__chrome-devtools__resize_page 375 667
mcp__chrome-devtools__take_screenshot diario-mobile.png

# Console
mcp__chrome-devtools__list_console_messages
```

**✅ Critérios de Aprovação:**
- [ ] Histórico de aulas visível
- [ ] Filtros funcionam
- [ ] Dados carregam
- [ ] Console limpo

---

### FASE 5: Performance Testing (10 min)

#### 5.1 Baseline Performance
```bash
# Desktop
mcp__chrome-devtools__resize_page 1920 1080

# Navegar para dashboard
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard

# Iniciar trace com reload
mcp__chrome-devtools__performance_start_trace true true

# Aguardar trace completar (autoStop: true)

# Analisar LCP (Largest Contentful Paint)
mcp__chrome-devtools__performance_analyze_insight LCPBreakdown

# Analisar Document Latency
mcp__chrome-devtools__performance_analyze_insight DocumentLatency
```

**✅ Critérios de Aprovação:**
- [ ] LCP < 2.5s (Core Web Vital)
- [ ] FID < 100ms (interatividade)
- [ ] Sem blocking resources
- [ ] Sem memory leaks

---

#### 5.2 Emulation de Condições Adversas (Escola Rural)
```bash
# Simular rede lenta (Slow 3G)
mcp__chrome-devtools__emulate_network "Slow 3G"

# Simular CPU lento (tablet antigo)
mcp__chrome-devtools__emulate_cpu 4

# Reload dashboard
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard

# Screenshot loading state
mcp__chrome-devtools__take_screenshot dashboard-slow-loading.png

# Aguardar carregamento completo
mcp__chrome-devtools__wait_for text="Total de Alunos" 15000

# Screenshot carregado
mcp__chrome-devtools__take_screenshot dashboard-slow-loaded.png

# Verificar performance
mcp__chrome-devtools__performance_start_trace true true
mcp__chrome-devtools__performance_analyze_insight LCPBreakdown
```

**✅ Critérios de Aprovação:**
- [ ] Página carrega em <10s (Slow 3G)
- [ ] Loading states visíveis
- [ ] Sem timeouts
- [ ] Funcionalidade preservada

---

### FASE 6: Accessibility Audit (10 min)

#### 6.1 Accessibility Snapshot
```bash
# Desktop
mcp__chrome-devtools__resize_page 1920 1080

# Navegar para login
mcp__chrome-devtools__navigate_page http://localhost:3000/login

# Capturar accessibility tree
mcp__chrome-devtools__take_snapshot

# Navegar para dashboard
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard

# Snapshot dashboard
mcp__chrome-devtools__take_snapshot

# Navegar para cadastro aluno
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/alunos/novo

# Snapshot formulário
mcp__chrome-devtools__take_snapshot
```

**✅ Critérios de Aprovação:**
- [ ] Estrutura semântica correta
- [ ] Labels em inputs
- [ ] ARIA attributes corretos
- [ ] Heading hierarchy (h1 → h2 → h3)
- [ ] Alt text em imagens

---

#### 6.2 Contraste de Cores
```bash
# Verificar contraste via console
mcp__chrome-devtools__evaluate_script `
  function checkContrast() {
    const elements = document.querySelectorAll('button, a, input, label');
    const issues = [];
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bg = style.backgroundColor;
      // Simplified check (real contrast calc needed)
      if (color === bg) {
        issues.push({
          element: el.tagName,
          text: el.textContent?.substring(0, 30)
        });
      }
    });
    return issues;
  }
  checkContrast();
`

# Screenshot de exemplo
mcp__chrome-devtools__take_screenshot contrast-check.png
```

**✅ Critérios de Aprovação:**
- [ ] Contraste mínimo 4.5:1 (texto normal)
- [ ] Contraste mínimo 3:1 (texto grande)
- [ ] Sem texto branco em fundo branco
- [ ] Sem texto preto em fundo escuro

---

### FASE 7: Network & Console Audit (10 min)

#### 7.1 Network Performance
```bash
# Desktop
mcp__chrome-devtools__resize_page 1920 1080

# Navegar para dashboard
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard

# Listar todas requests
mcp__chrome-devtools__list_network_requests

# Filtrar apenas API calls (se suportado)
# mcp__chrome-devtools__list_network_requests resourceTypes=["fetch", "xhr"]

# Inspecionar request específica lenta (exemplo)
# mcp__chrome-devtools__get_network_request "http://localhost:3000/api/alunos"
```

**✅ Critérios de Aprovação:**
- [ ] Todas APIs retornam 2xx
- [ ] Requests < 1s (local)
- [ ] Sem 4xx/5xx errors
- [ ] Cache headers configurados
- [ ] Sem requests desnecessárias

---

#### 7.2 Console Deep Dive
```bash
# Navegar por todas páginas principais
mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard
mcp__chrome-devtools__list_console_messages

mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/alunos
mcp__chrome-devtools__list_console_messages

mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/turmas
mcp__chrome-devtools__list_console_messages

mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/frequencia
mcp__chrome-devtools__list_console_messages

mcp__chrome-devtools__navigate_page http://localhost:3000/dashboard/diario
mcp__chrome-devtools__list_console_messages
```

**✅ Critérios de Aprovação:**
- [ ] Zero errors críticos
- [ ] Warnings aceitáveis documentados
- [ ] Sem memory leaks
- [ ] Sem undefined/null errors

---

## 📊 Relatório Final

### Template de Documentação
```markdown
# Relatório de Validação UI/UX - Gestão Fronteira

**Data**: [DATA]
**Testador**: [NOME]
**Ambiente**: Development (localhost:3000)
**Browser**: Chrome [VERSÃO]

## Resumo Executivo
- ✅ Aprovado: X/Y checks
- 🟡 Atenção: X issues menores
- ❌ Crítico: X issues bloqueantes

## Resultados por Fase

### FASE 1: Landing & Login
- [ ] Landing responsiva: ✅/🟡/❌
- [ ] Login funcional: ✅/🟡/❌
- [ ] Console limpo: ✅/🟡/❌
- Screenshots: [lista]

### FASE 2: Dashboard
- [ ] Métricas carregam: ✅/🟡/❌
- [ ] Navegação funciona: ✅/🟡/❌
- [ ] Responsividade tablet: ✅/🟡/❌
- Screenshots: [lista]

### FASE 3: Gestão Alunos
- [ ] Listagem funcional: ✅/🟡/❌
- [ ] Cadastro completo: ✅/🟡/❌
- [ ] Validação BR: ✅/🟡/❌
- Screenshots: [lista]

### FASE 4: Frequência
- [ ] Workflow funcional: ✅/🟡/❌
- [ ] Touch-friendly: ✅/🟡/❌
- [ ] Diário funcional: ✅/🟡/❌
- Screenshots: [lista]

### FASE 5: Performance
- [ ] LCP < 2.5s: ✅/🟡/❌
- [ ] Slow 3G OK: ✅/🟡/❌
- Screenshots: [lista]

### FASE 6: Accessibility
- [ ] WCAG 2.1 AA: ✅/🟡/❌
- [ ] Contraste OK: ✅/🟡/❌
- Screenshots: [lista]

### FASE 7: Network/Console
- [ ] APIs funcionam: ✅/🟡/❌
- [ ] Console limpo: ✅/🟡/❌

## Issues Encontrados
1. [Descrição do issue]
   - Severidade: Crítico/Alto/Médio/Baixo
   - Localização: [página/componente]
   - Screenshot: [arquivo]
   - Solução sugerida: [descrição]

## Recomendações
1. [Recomendação 1]
2. [Recomendação 2]

## Conclusão
[Aprovado para 1 escola piloto / Requer correções]
```

---

## 🔧 Troubleshooting

### Chrome DevTools MCP não conecta
```bash
# Verificar MCP server status
cat .mcp.json

# Reiniciar MCP server (se necessário)
# [instruções específicas do ambiente]
```

### Servidor não inicia
```bash
# Verificar porta em uso
lsof -i :3000

# Reinstalar dependências
pnpm install

# Limpar cache
rm -rf .next node_modules
pnpm install
pnpm dev
```

### Credenciais de teste
```bash
# Criar superadmin
pnpm seed:superadmin

# Credenciais padrão:
# Email: admin@fronteira.mg.gov.br
# Senha: FronteiraMG2024!
```

---

## 📚 Referências

- **CLAUDE.md**: Instruções completas do projeto
- **BUGS-ANALYSIS.md**: Status de bugs conhecidos
- **Chrome DevTools MCP Docs**: Tools disponíveis
- **WCAG 2.1 AA**: Padrões de acessibilidade

---

**Tempo Total Estimado**: 90 minutos
**Pré-requisitos**: Dev server rodando + Chrome DevTools MCP configurado
**Output**: Screenshots + relatório de validação completo
