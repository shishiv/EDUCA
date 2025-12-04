# EDUCA - HTML/CSS Mockups Interativos

**Versão**: 1.0
**Data**: 2025-12-04
**Status**: Mid-Fidelity Interactive Demos

---

## 📋 O que é isso?

Mockups **interativos e responsivos** do sistema EDUCA criados em **HTML + Tailwind CSS**, mostrando:
- Design visual das páginas principais
- Interatividade (cliques, estados, transições)
- Responsividade (desktop, tablet, mobile)
- Componentes reutilizáveis

**Objetivo**: Demonstrar como o sistema vai parecer e funcionar antes da implementação real.

---

## 🎯 Páginas Incluídas

### 1. Landing Page (`index.html`) ✅
- ✅ Hero section com CTA
- ✅ Seção de notícias/eventos
- ✅ Escolas participantes
- ✅ Footer com informações
- **Status**: Completa ✓

### 2. Login (`login.html`) ✅
- ✅ Formulário de autenticação com email/CPF
- ✅ Opções de login alternativo (Gov.br, SMS)
- ✅ Seção de ajuda integrada
- ✅ Design responsivo (2 colunas desktop)
- **Status**: Completa ✓

### 3. Onboarding (`onboarding.html`) ✅
- ✅ 5-step wizard modal
- ✅ Configuração de escola, admin, calendário, turmas
- ✅ Progress bar visual
- ✅ Navegação com Próximo/Anterior
- **Status**: Completa com interatividade ✓

### 4. Dashboard (`dashboard.html`) ✅
- ✅ Sidebar com navegação
- ✅ Cards informativos (alunos, frequência, aulas)
- ✅ Gráfico de frequência por turma
- ✅ Atalhos rápidos
- **Status**: Completa ✓

### 5. Frequência (`frequencia.html`) ⭐ CRÍTICA ✅
- ✅ Grid de frequência (tipo Excel, mas visual)
- ✅ Clique para marcar ✓/✗/~
- ✅ Resumo e alertas de risco
- ✅ Botão salvar com modal de sucesso
- ✅ Responsivo e touch-friendly
- **Status**: Completa com interatividade ✓

### 6. Alunos (`alunos.html`) ✅
- ✅ Lista de alunos em cards (2 coluna grid)
- ✅ Painel de detalhes dinâmico
- ✅ Informações pessoais e escolares
- ✅ Dados de frequência
- ✅ Ações rápidas (editar, visualizar, deletar)
- **Status**: Completa ✓

### 7. Turmas (`turmas.html`) ✅
- ✅ Grid de turmas com cores por série
- ✅ Painel de detalhes dinâmico
- ✅ Professor e alunos por turma
- ✅ Estatísticas de frequência
- ✅ Botões de ação (editar, relatório)
- **Status**: Completa ✓

### 8. Diário de Classe - Moderno (`diario.html`) ✅
- ✅ Timeline de aulas registradas
- ✅ Painel de detalhes de cada aula
- ✅ Modal para criar nova aula
- ✅ Setor de conteúdo, frequência e observações
- ✅ Funcionalidade completa
- **Status**: Completa ✓

### 8b. Diário de Classe - Tipo Papel (`diario-papel.html`) ✅ NOVO
- ✅ Layout 3 colunas (sidebar + main + painel)
- ✅ Grid de frequência mensal (28-31 dias × alunos)
- ✅ Lista de alunos fixa à esquerda (selecionável com checkboxes)
- ✅ Coluna "TOTAL FALTAS" calculada automaticamente
- ✅ Inputs de conteúdo ministrado por dia (1-31)
- ✅ Navegação entre meses (Janeiro-Dezembro com atalhos)
- ✅ Ficha individual de aluno (painel direito colapsável - 320px)
- ✅ Interatividade: click em célula cicla P (verde) → F (vermelho) → vazio
- ✅ Salvamento em localStorage + modal de sucesso (3s auto-close)
- ✅ Dados de 5 alunos pré-carregados com CPF, telefone, notas
- **Status**: Completa ✓

### 9. Calendário (`calendario.html`) ✅
- ✅ Calendário mês em grid
- ✅ Legenda com tipo de evento (feriado, aula, avaliação, atividade)
- ✅ Eventos destacados em cores
- ✅ Resumo de próximas aulas e avaliações
- ✅ Navegação entre meses
- **Status**: Completa ✓

### 10. Help Center (`help.html`) ✅
- ✅ 3 abas (Tutoriais, FAQs, Suporte)
- ✅ 6 tutorial cards com dificuldade e duração
- ✅ 6 FAQs com accordion interativo
- ✅ Opções de contato (email, telefone, WhatsApp, ticket)
- ✅ Formulário de mensagem rápida
- **Status**: Completa ✓

---

## 🚀 Como Usar

### Opção 1: Abrir no Navegador (Mais Simples)
```bash
# 1. Navegue até a pasta
cd /home/shiv/repos/EDUCA/mockups-html/

# 2. Abra o arquivo no navegador
# Clique duplo em index.html (Landing Page)
# Ou em frequencia.html (Demo interativa)
```

### Opção 2: Servidor Local (Recomendado para Dev)
```bash
# 1. Com Python 3
cd /home/shiv/repos/EDUCA/mockups-html/
python -m http.server 8000

# 2. Com Node.js
npx http-server

# 3. Acesse no navegador
# http://localhost:8000
```

### Opção 3: No VS Code
```bash
# 1. Instale a extensão "Live Server"
# 2. Clique direito no arquivo > "Open with Live Server"
# 3. Abre automaticamente no navegador com hot-reload
```

---

## 🎮 Interatividades Implementadas

### Landing Page
- Hover effects nos cards de notícias
- Links de navegação
- Botões de CTA ("Entrar Agora")

### Dashboard
- Sidebar com menu ativo/inativo
- Cards com hover effect
- Gráficos de frequência
- Botão "Registrar Frequência" leva para a página de frequência

### Frequência (MAIS COMPLETA)
- ✅ **Clique em qualquer célula** para marcar:
  - Vazio → ✓ (Presente, verde)
  - ✓ → ✗ (Ausente, vermelho)
  - ✗ → ~ (Atraso, amarelo)
  - ~ → Vazio (limpar)
- ✅ **Clique em "Salvar Frequência"** para ver modal de sucesso
- ✅ Responsivo (desktop, tablet, mobile)
- ✅ Alertas de alunos em risco

---

## 🎨 Design System (Tailwind)

### Cores Principais
```
Azul Primário:    #1e40af (blue-900)
Verde Secundário: #16a34a (green-600)
Roxo Accent:      #7c3aed (purple-600)

Cinza Claro:      #f8fafc (slate-50)
Cinza Escuro:     #334155 (slate-900)
```

### Tipografia
- **Headings**: Tailwind bold classes (font-bold)
- **Body**: 14-16px, regular weight
- **Sem Google Fonts**: Usa fonts do sistema para performance

### Componentes
- Buttons com hover states
- Cards com shadows
- Forms com focus states
- Tables/Grids responsivos
- Modals com overlay

---

## 📱 Responsividade

### Desktop (1440px)
- Layout completo
- Sidebar 240px (fixed)
- Todas as features visíveis
- Grid 3 colunas

### Tablet (768px)
- Sidebar colapsável
- Grid 2 colunas
- Touch-friendly buttons (48px)
- Scrolling horizontal em tabelas

### Mobile (375px)
- Sidebar como menu hamburger (simulate)
- Grid 1 coluna
- Full-width buttons
- Scrolling horizontal em tabelas com scroll bar visível

---

## 🔧 Estrutura de Arquivos

```
mockups-html/
├── index.html              # Landing Page
├── dashboard.html          # Dashboard (primeira tela após login)
├── frequencia.html         # Página de Frequência (demo completa)
├── README.md               # Este arquivo
└── assets/                 # (Opcional) imagens, icons, etc
    └── (vazio por enquanto)
```

---

## ⚡ Performance

- **Sem dependências externas** (exceto Tailwind CDN)
- **Lightweight**: Arquivos <50KB cada
- **Rápido**: Sem JS pesado, apenas vanilla JS básico
- **Acessível**: WCAG 2.1 AA compliant
- **Mobile-first**: Responsive desde o início

---

## ✅ Status de Completude

**11 páginas + 1 bonus** criadas com sucesso:

- [x] Landing Page (`index.html`)
- [x] Login (`login.html`)
- [x] Onboarding Wizard (`onboarding.html`)
- [x] Dashboard (`dashboard.html`)
- [x] Frequência (`frequencia.html`)
- [x] Alunos (`alunos.html`)
- [x] Turmas (`turmas.html`)
- [x] Diário de Classe - Moderno (`diario.html`)
- [x] **Diário de Classe - Tipo Papel** (`diario-papel.html`) ⭐ NOVO
- [x] Calendário (`calendario.html`)
- [x] Help Center (`help.html`)

**Próximas Etapas:**
- [ ] Conversão para Figma (high-fidelity mockups)
- [ ] Implementação em React/Next.js
- [ ] Integração com backend (Supabase)
- [ ] Testes e2e com Playwright

---

## 💡 Como Estender

### Adicionar Nova Página
```html
<!-- 1. Crie novo arquivo, ex: alunos.html -->
<!-- 2. Copie a estrutura do dashboard.html -->
<!-- 3. Customize o conteúdo -->
<!-- 4. Altere o nav-item ativo (adicione .active) -->
```

### Customizar Cores
```html
<!-- No <head>, customize as classes Tailwind -->
<!-- Exemplo: bg-blue-900 → bg-blue-800 -->
```

### Adicionar Interatividade
```javascript
// Edite o <script> no final de frequencia.html
function meuEvento() {
    // seu código aqui
}
```

---

## 🎓 Notas para Desenvolvimento

### Para Designer/UX
- ✅ Use como referência visual exata
- ✅ Screenshots para comparação antes/depois
- ✅ Teste responsividade em diferentes devices
- ⚠️ Colors podem estar levemente diferentes em monitor vs. especificação

### Para Developer
- ✅ Use como starting point para componentes React/Next.js
- ✅ Copie estrutura HTML para componentes
- ✅ Use classes Tailwind como guia de estilos
- ✅ Implemente Server Actions/APIs em cima disso
- ⚠️ Não é otimizado para produção (sem lazy loading, etc)

### Para Stakeholder/Cliente
- ✅ Interaja com as páginas
- ✅ Clique em botões, teste a frequência
- ✅ Visualize como usuário final
- ✅ Sugira ajustes antes do desenvolvimento
- ⚠️ Não é funcional (dados são mockados)

---

## 🔗 Links Úteis

**Documentação:**
- [Design Spec Completo](../docs/MOCKUPS-DESIGN-SPEC.md)
- [Prompt para Figma](../docs/PROMPT-MOCKUPS-DESIGN.md)

**Ferramentas Usadas:**
- [Tailwind CSS](https://tailwindcss.com)
- [Tailwind Play (editor online)](https://play.tailwindcss.com)

---

## ❓ FAQ

**P: Posso usar esses arquivos em produção?**
R: Não recomendado. São mockups para referência. Use como base para implementar em React/Next.js.

**P: Como adiciono dados reais (banco de dados)?**
R: Esses mockups são estáticos. No desenvolvimento real, conecte a um backend (Supabase, API, etc).

**P: Posso modificar as cores/fonts?**
R: Sim! Edite as classes Tailwind nos arquivos HTML. Guia: [Design System](../docs/MOCKUPS-DESIGN-SPEC.md#design-system).

**P: Por que não usa React/Vue?**
R: Simplicidade. HTML puro é mais fácil de iterar, compartilhar e apresentar para não-devs.

**P: Funciona offline?**
R: Quase. Tailwind vem do CDN, então precisa internet. Baixe Tailwind CSS localmente se quiser offline.

---

## 📊 Checklist de Revisão

Antes de dar como "pronto", verifique:

- [ ] Landing Page com todos os elementos
- [ ] Dashboard mostra todos os cards e gráficos
- [ ] Frequência permite clicar para marcar (interativa)
- [ ] Botão "Salvar" mostra modal de sucesso
- [ ] Navegação entre páginas funciona
- [ ] Responsive em desktop, tablet, mobile
- [ ] Cores aparecem corretas
- [ ] Nenhum erro no console do navegador
- [ ] Texto é legível (não truncado)
- [ ] Buttons são clicáveis (hover effect)

---

## 🎯 Próximos Passos

1. **Revisão Visual** (Você agora)
   - Abra as páginas
   - Interaja com a frequência
   - Sugira ajustes

2. **Conversão para Figma** (Se necessário)
   - Use como referência para criar mockups hi-fi
   - Ou procure pelo `PROMPT-MOCKUPS-DESIGN.md` para gerar em ferramenta de design

3. **Desenvolvimento Real** (Próxima fase)
   - Recrie em React/Next.js
   - Conecte ao Supabase
   - Implemente funcionalidade real

---

**Versão**: 1.0
**Atualizado em**: 2025-12-04
**Próxima atualização**: Após feedback de revisão

Aproveite! 🚀
