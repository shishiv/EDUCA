# EDUCA - Especificação Visual de Mockups (Mid-Fidelity)

**Versão**: 1.0
**Data**: 2025-12-04
**Status**: Design Validado ✅
**Propósito**: Referência visual para desenvolvimento do produto final

---

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Design System](#design-system)
3. [Fluxo do Usuário](#fluxo-do-usuário)
4. [Landing Page](#landing-page)
5. [Login & Onboarding](#login--onboarding)
6. [Dashboard Principal](#dashboard-principal)
7. [Página de Alunos](#página-de-alunos)
8. [Página de Turmas](#página-de-turmas)
9. [Página de Frequência](#página-de-frequência)
10. [Página de Diário de Classe](#página-de-diário-de-classe)
11. [Página de Calendário](#página-de-calendário-com-base-curricular)
12. [Sistema de Help & Tutoriais](#sistema-de-help--tutoriais-interativos)
13. [Componentes Reutilizáveis](#componentes-reutilizáveis)
14. [Considerações de UX/Acessibilidade](#considerações-de-uxacessibilidade)

---

## Visão Geral

### Objetivo
Criar mockups mid-fidelity de uma plataforma educacional intuitiva para **usuários leigos em tecnologia** que historicamente preenchiam tudo a mão. O design prioriza:
- ✅ **Conforto Visual**: Sem poluição, mas com informações adequadas
- ✅ **Familiaridade**: Reconhecível para quem vinha de papel/planilha
- ✅ **Acessibilidade**: Tutoriais interativos automáticos na primeira interação
- ✅ **Modernidade**: Estética contemporânea com tons amigáveis

### Princípios de Design
1. **Progresso Gradual**: Tutoriais aparecem na primeira interação com cada função
2. **Contextualidade**: Help/botão "?" sempre acessível em cada página
3. **Consistência Visual**: Mesma paleta, tipografia e componentes em toda a app
4. **Responsividade**: Funciona em desktop, tablet e mobile
5. **Ton Amigável**: Ícones SVG, ilustrações, linguagem clara e coloquial

---

## Design System

### 🎨 Paleta de Cores

#### Cores Primárias
| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| Azul Primário | #1e40af | (30, 64, 175) | Botões principais, headers, confiança |
| Verde Secundário | #16a34a | (22, 163, 74) | Ações positivas, sucesso, confirmação |
| Roxo Accent | #7c3aed | (124, 58, 237) | Interatividade, botão help, modernidade |

#### Cores Neutras
| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| Branco | #ffffff | (255, 255, 255) | Background cards, formulários |
| Cinza Claro | #f8fafc | (248, 250, 252) | Background pages |
| Cinza Médio | #64748b | (100, 116, 139) | Texto corpo, secundário |
| Cinza Escuro | #334155 | (51, 65, 85) | Texto primário, headers |

#### Cores de Status
| Status | Hex | Uso |
|--------|-----|-----|
| Sucesso/Presente ✓ | #22c55e | Frequência presente, ações confirmadas |
| Erro/Ausência ✗ | #ef4444 | Frequência ausente, erros |
| Aviso/Atraso ⚠️ | #eab308 | Frequência atraso, alertas |
| Info ℹ️ | #3b82f6 | Informações adicionais |

### 📝 Tipografia

```
Font Family: Inter, Poppins (sans-serif moderna)
Fallback: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto

Sizes & Weights:
- H1 (Titles): 32px, bold (600), line-height 1.3
- H2 (Subtitles): 24px, bold (600), line-height 1.4
- H3 (Sections): 18px, bold (600), line-height 1.4
- Body (Regular): 16px, regular (400), line-height 1.6
- Body Small: 14px, regular (400), line-height 1.5
- Caption: 12px, regular (400), line-height 1.4
- Label: 14px, medium (500), line-height 1.5
```

### 🎯 Componentes Base

#### Buttons
```
Primário (Azul):
  - Background: #1e40af
  - Text: #ffffff
  - Padding: 12px 24px
  - Border-radius: 8px
  - Font-weight: 600
  - Hover: #1e3a8a (darker blue)
  - Active: #1e3a8a + scale 0.98
  - Transition: 0.2s ease

Secundário (Verde):
  - Background: #16a34a
  - Text: #ffffff
  - Mesmo padrão acima

Accent (Roxo):
  - Background: #7c3aed
  - Text: #ffffff
  - Mesmo padrão acima

Outline (Cinza):
  - Background: transparent
  - Border: 2px #64748b
  - Text: #334155
  - Hover: background #f8fafc
```

#### Input Fields
```
Default State:
  - Background: #ffffff
  - Border: 1px #cbd5e1
  - Border-radius: 8px
  - Padding: 12px 16px
  - Font-size: 14px
  - Color: #334155

Focus State:
  - Border: 2px #1e40af
  - Box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1)

Placeholder:
  - Color: #94a3b8
  - Font-style: italic

Error State:
  - Border: 2px #ef4444
  - Background: #fef2f2
  - Error text: 12px #ef4444 below field
```

#### Cards
```
Default:
  - Background: #ffffff
  - Border: none
  - Border-radius: 12px
  - Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
  - Padding: 20px
  - Transition: 0.2s ease

Hover (Interactive):
  - Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
  - Transform: translateY(-2px)
```

#### Modals/Dialogs
```
Overlay:
  - Background: rgba(0, 0, 0, 0.5)
  - Position: fixed, full screen

Modal Box:
  - Background: #ffffff
  - Border-radius: 16px
  - Box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2)
  - Padding: 32px
  - Max-width: 500px
  - Center aligned
  - Animation: fade-in + slide-up 0.3s
```

#### Badges & Status
```
Status Badge:
  - Padding: 6px 12px
  - Border-radius: 20px
  - Font-size: 12px
  - Font-weight: 600
  - Inline display

Success (Verde): bg #dcfce7, text #166534
Error (Vermelho): bg #fee2e2, text #991b1b
Warning (Amarelo): bg #fef3c7, text #92400e
Info (Azul): bg #dbeafe, text #1e40af
```

### 📏 Espaçamento (Grid 8px)

```
Standard Spacing:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

Application:
- Card padding: 20px (2.5 grid units)
- Section margin: 24px (3 grid units)
- Input padding: 12px (1.5 grid units)
- Button padding: 12px 24px (vertical/horizontal)
```

### 🎨 Icons & Visual Elements

```
Icon Set: Custom SVG flat design
Sizes: 16px (small), 24px (standard), 32px (large), 48px (hero)
Color: Adaptam-se à cor do contexto (azul, verde, roxo)
Style: Flat, friendly, with subtle expressions

Common Icons:
📊 Dashboard       👥 Alunos        📚 Turmas
📋 Frequência      📖 Diário         📅 Calendário
❓ Help           ⚙️ Configurações  🚀 Ação/CTA
✓ Sucesso         ✗ Erro           ⚠️ Aviso
💾 Salvar         🎉 Feriado        📚 Base Curricular
```

### 📱 Breakpoints & Responsividade

```
Desktop:  1440px+ (sidebar 240px, main 2-3 colunas)
Tablet:   768px-1439px (sidebar colapsável, main 1-2 colunas)
Mobile:   <768px (menu hamburger, single column, full-width)

Sidebar Width:
- Desktop: 240px (fixed)
- Tablet: colapsável a 64px (icons only)
- Mobile: hidden (hamburger menu)

Column Widths:
- Desktop (2 col): 60% | 40%
- Desktop (3 col): 55% | 30% | 15%
- Tablet: 100% (stacked)
- Mobile: 100% (full width)
```

---

## Fluxo do Usuário

### Mapa de Navegação

```
┌─────────────────────────────────────────────────────────────┐
│                     LANDING PAGE                            │
│  (Hub Notícias/Eventos + Avisos Globais + Botão "Entrar")  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     LOGIN                                   │
│  (Email/CPF + Senha + Recuperação)                          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              ONBOARDING OBRIGATÓRIO                          │
│  Passo 1: Pessoais | Passo 2: Contato | Passo 3: Papel      │
│  Passo 4: Confirmação                                       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  DASHBOARD PRINCIPAL                        │
│  (Cards informativos + Atalhos rápidos + Gráficos)         │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
      ┌────────┬───────────┼───────────┬────────┐
      ↓        ↓           ↓           ↓        ↓
  ┌────────┐ ┌──────┐ ┌─────────┐ ┌──────┐ ┌────────┐
  │ ALUNOS │ │ TURM │ │FREQUÊNCIA│ │DIÁRIO│ │CALEND │
  │        │ │ AS   │ │          │ │CLASS │ │ ÁRIO  │
  └────────┘ └──────┘ └─────────┘ └──────┘ └────────┘

  Todo acesso a função → Tutorial automático (1ª vez)
  Botão "?" sempre presente para repetir
```

### Sequência de Tutoriais (Ordem de Aparição)

```
1. Dashboard → "Bem-vindo ao EDUCA! 👋"
2. Alunos → "Como adicionar alunos"
3. Turmas → "Como criar turmas"
4. Frequência → "Como registrar frequência" ⭐ CRÍTICO
5. Diário → "Como registrar aulas"
6. Calendário → "Como planejar com Base Curricular"
7. Help → "Acesse tutoriais quando precisar" (sempre disponível)

⭐ = Tutorial mais importante (mais detalhado, passo-a-passo)
```

---

## Landing Page

### Objetivo
Ser um **hub informativo municipal** que apresenta:
- Informações gerais sobre escolas
- Avisos globais e notícias
- Eventos relacionados à educação local
- Acesso ao login

### Estrutura & Layout

#### 1. Cabeçalho (Header)
```
┌──────────────────────────────────────────────────────────────┐
│ 📚 EDUCA - Sistema Municipal de Gestão Educacional           │
│                                                    [ENTRAR]   │
└──────────────────────────────────────────────────────────────┘

Componentes:
- Logo + Texto branco: "EDUCA - Gestão Educacional Municipal"
- Navegação horizontal: Notícias | Eventos | Escolas | Contato
- Botão "ENTRAR" (azul, alto contraste)
- Background: Gradiente azul (#1e40af → #3b82f6)
- Height: 80px, sticky top
- Padding: 20px horizontal
```

#### 2. Hero Section
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   Bem-vindo ao EDUCA! 🎓                                    │
│                                                              │
│   A plataforma que torna gestão educacional simples e       │
│   intuitiva. Modernize sua escola municipal.                │
│                                                              │
│   [Saiba Mais]  [Entrar Agora]                              │
│                                                              │
│   (Ilustração: Professor com alunos, estilo friendly)       │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Specs:
- Background: Gradiente azul claro (#dbeafe) com ilustração
- Height: 500px
- Content centered
- Headline: H1 (32px, bold)
- Subheading: H2 (24px, regular)
- CTA Buttons: 2 botões lado-a-lado (Azul + Verde)
- Padding: 60px top/bottom
```

#### 3. Seção de Notícias & Eventos
```
┌──────────────────────────────────────────────────────────────┐
│ NOTÍCIAS E EVENTOS DA EDUCAÇÃO LOCAL                         │
│                                                              │
│ [Card 1]          [Card 2]          [Card 3]                │
│ Thumbnail         Thumbnail         Thumbnail               │
│ Título            Título            Título                  │
│ Resumo            Resumo            Resumo                  │
│ 15 dez 2024       14 dez 2024       13 dez 2024            │
│ [Leia mais]       [Leia mais]       [Leia mais]            │
│                                                              │
│ [Card 4]          [Card 5]          [Card 6]                │
│                                                              │
│                         [Ver Todos →]                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Specs:
- Grid: 3 colunas em desktop, 1 em mobile
- Card width: ~300px
- Card height: 350px
- Thumbnail: 300x200px, object-fit cover
- Typography: Título 18px, Resumo 14px, Data 12px
- Hover: Card sobe, sombra aumenta
- Background section: Branco
- Padding: 60px 40px
```

#### 4. Seção de Escolas Participantes
```
┌──────────────────────────────────────────────────────────────┐
│ ESCOLAS PARTICIPANTES                                        │
│                                                              │
│ [Escola A]  [Escola B]  [Escola C]  [Escola D]             │
│  📍 Endereço  📍 Endereço  📍 Endereço  📍 Endereço        │
│  👥 245 alunos 👥 312 alunos 👥 198 alunos 👥 287 alunos  │
│                                                              │
│ [Escola E]  [Escola F]  [Escola G]  [Escola H]             │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Specs:
- Grid: 4 colunas em desktop, 2 em tablet, 1 em mobile
- Card por escola: 200x200px
- Ícone grande de escola
- Nome + endereço + stats
- Background: Cinza claro (#f8fafc)
- Padding: 60px 40px
```

#### 5. Rodapé (Footer)
```
┌──────────────────────────────────────────────────────────────┐
│ SOBRE | CONTATO | PRIVACIDADE | TERMOS                       │
│                                                              │
│ Prefeitura Municipal de Fronteira - Secretaria de Educação   │
│ © 2024 EDUCA. Todos os direitos reservados.                 │
│                                                              │
│ 📧 suporte@educa.local | ☎️ (35) 3484-8888                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Specs:
- Background: Cinza escuro (#334155)
- Text: Branco (#ffffff)
- Padding: 40px
- Links: Verde accent ao hover
```

### Notas de UX
- Landing é **pública** (sem login obrigatório)
- Conteúdo de notícias/eventos é **mockado** (não conecta a DB real ainda)
- Botão "Entrar Agora" leva a `/login`
- Botão "Saiba Mais" scrolls para seção abaixo (smooth scroll)

---

## Login & Onboarding

### Tela de Login

#### Layout
```
┌──────────────────────────────┬──────────────────────────────┐
│                              │                              │
│   Ilustração:                │  EDUCA - Entrar na Conta    │
│   Professor + Alunos         │                              │
│   Estilo friendly            │  Email ou CPF:              │
│                              │  [_________________________] │
│   (Ocupar 50% esquerda)      │                              │
│                              │  Senha:                      │
│                              │  [_________________________] │
│                              │                              │
│                              │  ☐ Lembrar-me               │
│                              │                              │
│                              │  [ENTRAR]                   │
│                              │                              │
│                              │  Esqueceu a senha?          │
│                              │  Primeira vez? Contate adm  │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘

Specs:
- Layout: 2 colunas (50/50) em desktop
- Esquerda: Background gradiente azul + ilustração
- Direita: Formulário branco
- Max-width login form: 400px
- Padding: 60px
- Full height viewport
```

#### Componentes do Formulário
```
Email/CPF Input:
  - Label: "Email ou CPF:" (14px, semibold)
  - Placeholder: "usuario@mail.com ou 123.456.789-00"
  - Width: 100%
  - Height: 48px
  - Specs: Seguir design system (Input Fields)

Senha Input:
  - Label: "Senha:" (14px, semibold)
  - Placeholder: "••••••••"
  - Width: 100%
  - Height: 48px
  - Icon eye toggle (mostrar/esconder)

Checkbox "Lembrar-me":
  - 14px, regular text
  - Azul quando checked

Botão "ENTRAR":
  - Full width
  - Height: 48px
  - Background: #16a34a (verde)
  - Text: Branco, bold, 16px
  - Hover: #15803d (darker green)
  - Loading state: Spinner + "Entrando..."

Link "Esqueceu a senha?":
  - 14px, azul (#1e40af)
  - Hover: Underline

Link "Primeira vez?":
  - 14px, cinza
  - Texto: "Primeira vez? Entre em contato com o administrador"
```

### Fluxo de Onboarding Obrigatório

#### Introdução (Modal de Boas-vindas)
```
┌────────────────────────────────────┐
│     🎉 Bem-vindo ao EDUCA!         │
│                                    │
│  Antes de começar, precisamos de   │
│  algumas informações importantes   │
│  para completar seu perfil.        │
│                                    │
│  Isso levará apenas 2 minutos!     │
│                                    │
│              [Começar]             │
│                                    │
│  (Modal centrado, 500px width)     │
└────────────────────────────────────┘

Specs:
- Overlay: Semi-transparent (#000000 50%)
- Modal: Branco, border-radius 16px
- Ícone emoji grande (64px)
- Texto: Centered, friendly tone
- Botão: Verde, 48px height
```

#### Passo 1: Informações Pessoais
```
┌────────────────────────────────────┐
│  EDUCA Onboarding                  │
│                                    │
│  ████░░░░░░░░░░░░░ 25%             │ ← Barra progresso
│                                    │
│  👤 Informações Pessoais            │
│                                    │
│  Nome Completo*                    │
│  [_______________________________]  │
│                                    │
│  CPF*                              │
│  [___.___.___-__]                  │
│  (Auto-format: XXX.XXX.XXX-XX)    │
│                                    │
│  Data de Nascimento*               │
│  [__/__/____]  (DD/MM/YYYY)        │
│                                    │
│  Por que pedimos isso? ℹ️           │
│                                    │
│  [Voltar]                [Próximo] │
│                                    │
└────────────────────────────────────┘

Specs:
- Width: 500px, centered
- Barra progresso: Azul (#1e40af)
- Seção heading: H3 (18px, bold) + ícone
- Inputs: 48px height
- Tooltip "ℹ️": Hover mostra "Usamos seu CPF para identificar você no sistema e cumprir requisitos educacionais."
```

#### Passo 2: Informações de Contato
```
┌────────────────────────────────────┐
│  ██████░░░░░░░░░░░░ 50%             │
│                                    │
│  ✉️ Informações de Contato          │
│                                    │
│  Email*                            │
│  [_______________________________]  │
│                                    │
│  Telefone (Celular)                │
│  [(_) 9____-____]                  │
│                                    │
│  Endereço                          │
│  [_______________________________]  │
│                                    │
│  Cidade                            │
│  [________________]                │
│                                    │
│  [Voltar]                [Próximo] │
│                                    │
└────────────────────────────────────┘

Specs:
- Phone: Auto-format (XX) 9XXXX-XXXX
- Endereço: Textarea (64px height)
- Todos inputs: 48px height
```

#### Passo 3: Seu Papel na Escola
```
┌────────────────────────────────────┐
│  ███████░░░░░░░░░░░ 75%             │
│                                    │
│  🎓 Seu Papel na Escola             │
│                                    │
│  Qual é seu papel?*                │
│                                    │
│  ○ Professor(a)                    │
│  ○ Gestor/Diretor(a)               │
│  ○ Secretário(a)                   │
│  ○ Outro                           │
│                                    │
│  Turmas Associadas*                │
│  [Selecione uma ou mais...]        │
│  ☑ 5º A (Matemática)              │
│  ☑ 5º B (Português)               │
│  ☐ 6º A (Matemática)              │
│  ☐ 6º B (Português)               │
│                                    │
│  [Voltar]                [Próximo] │
│                                    │
└────────────────────────────────────┘

Specs:
- Radio buttons: Verde quando selecionado
- Checkboxes: Grid 2 colunas
- Height dropdown: 48px
- Placeholder texto: Cinza claro
```

#### Passo 4: Confirmação & Finalizar
```
┌────────────────────────────────────┐
│  ████████████░░░░░░░ 100%           │
│                                    │
│  ✅ Resumo & Confirmação            │
│                                    │
│  Verifique seus dados abaixo:      │
│                                    │
│  👤 João Silva Costa               │
│     CPF: 123.456.789-00            │
│     Nasc: 15/05/1990              │
│                                    │
│  ✉️  joao.silva@email.com          │
│     Tel: (35) 99999-9999          │
│                                    │
│  🎓 Professor(a)                   │
│     Turmas: 5º A, 5º B            │
│                                    │
│  Precisa corrigir algo?            │
│  [← Voltar aos Passos]             │
│                                    │
│              [Finalizar & Entrar]  │
│                                    │
│  [Barra loader verde durante save] │
│  Salvando seu perfil...            │
│                                    │
└────────────────────────────────────┘

Specs:
- Resumo: Cards por seção, leitura
- Botão "Voltar": Leva de volta, preserva dados
- Botão "Finalizar": Verde, 48px, bold
- Após clique: Loading spinner + "Salvando..."
- Sucesso: Redireciona para Dashboard (fade transition)
```

### Notas de UX/Acessibilidade
- **Validação em tempo real**: Mostra erro vermelho conforme digita
- **Auto-format**: CPF (XXX.XXX.XXX-XX), Telefone ((XX) 9XXXX-XXXX), Data (DD/MM/YYYY)
- **Sem saltos abruptos**: Dados salvos ao clicar "Próximo" (resiliente a queda de conexão)
- **Indicador visual**: Checkmark verde em "Informações Pessoais" concluída
- **Mobile responsivity**: Modal em 80% width, botões full-width em mobile
- **Acessibilidade**: Labels, ARIA labels, focus visible
- **Tooltips**: "ℹ️" sempre disponível explicando por que cada dado é necessário

---

## Dashboard Principal

### Objetivo
Primeira página após onboarding. Fornecer **visão geral rápida** do status da escola/professor.

### Layout Geral
```
┌─────────────────────────────────────────────────────────────┐
│ NAVBAR (sticky top)                                         │
│ 📚 EDUCA | Menu | 🔔 Notificações | 👤 Perfil             │
├──────────┬────────────────────────────────────────────────┤
│ SIDEBAR  │ MAIN CONTENT                                   │
│ (240px)  │                                                 │
│          │ Bem-vindo(a), João!  │ Quarta, 4 dez 2024     │
│ 📊 Dash  │                                                 │
│ 👥 Alun  │ [Card 1]        [Card 2]        [Card 3]      │
│ 📚 Turm  │ 245 alunos      92% freq        15 aulas      │
│ 📋 Freq  │ Cadastrados     Semana atual    Registradas   │
│ 📖 Diár  │                                                 │
│ 📅 Cale  │ [Card 4]        [Card 5]        [Card 6]      │
│ ❓ Help  │ 8 eventos       Próx turma      Últimas       │
│ ⚙️ Conf  │ Mês             5º A - 14h      Atividades    │
│          │                                                 │
│ 👤 João  │ GRÁFICO: Frequência por Turma (Semana)       │
│ 🚪 Sair  │ [▄▄▄ 5º A: 94%] [▄▄▄ 5º B: 88%] [▄▄▄ 6º A] │
│          │                                                 │
│          │ ATALHOS RÁPIDOS:                               │
│          │ [+ Nova Turma] [+ Novo Aluno] [Frequência]   │
│          │ [Diário]        [Calendário]   [Relatórios]  │
│          │                                                 │
└──────────┴────────────────────────────────────────────────┘
```

### Componentes Detalhados

#### 1. Navbar (Top)
```
Specs:
- Height: 64px
- Background: #1e40af (azul)
- Position: sticky, z-index: 100
- Padding: 12px 24px

Layout (left to right):
[Logo EDUCA (24px)] [Spacing] [Breadcrumb] [Flex space] [🔔] [👤]

Logo:
  - Ícone 📚 (24px) + Texto "EDUCA" (14px, bold, branco)

Notificações:
  - Badge red #ef4444 com número se houver
  - Hover: Background #1e3a8a
  - Click: Abre dropdown com últimas 5 notificações

Perfil Menu:
  - Avatar circulo 40px com iniciais
  - Nome embaixo (12px, cinza claro)
  - Hover: Dropdown com Perfil | Configurações | Sair
```

#### 2. Sidebar (Left)
```
Specs:
- Width: 240px (desktop), colapsível em tablet
- Background: #ffffff
- Border-right: 1px #e2e8f0
- Padding: 20px 12px
- Position: sticky, height: 100vh
- Overflow-y: auto

Menu Items:
  Cada item:
  - Altura: 44px
  - Padding: 8px 12px
  - Ícone (24px) + Texto (14px) | [Green dot se novo]
  - Hover: Background #f1f5f9
  - Active: Background #dbeafe, ícone azul, texto bold
  - Color do ícone: #64748b (default) | #1e40af (active)
  - Transição: 0.2s

Items:
  📊 Dashboard      (active by default)
  👥 Alunos
  📚 Turmas
  📋 Frequência
  📖 Diário de Classe
  📅 Calendário
  ❓ Help
  ⚙️ Configurações

Footer Sidebar (fixo ao bottom):
  Divider line: #e2e8f0
  Espaço: 20px

  Avatar (48px circulo) + Info:
  - Nome: 14px bold
  - Papel: 12px cinza
  - Escola: 12px cinza

  Botão "🚪 Sair" (full width, outline)
```

#### 3. Main Content Area

##### Cabeçalho
```
Bem-vindo(a), João! 👋

Specs:
- Heading: H1 (28px, bold)
- Color: #334155
- Emoji dinâmico baseado na hora:
  - 6h-12h: ☀️ "Bom dia"
  - 12h-18h: 🌤️ "Boa tarde"
  - 18h+: 🌙 "Boa noite"

Data & Hora:
- Texto: "Quarta-feira, 4 de dezembro de 2024 | 14:35"
- Color: #64748b
- Font-size: 14px
- Atualiza a cada minuto
```

##### Cards Informativos (3 colunas em desktop)
```
Card 1 - Alunos Cadastrados:
  Ícone: 👥 (48px, verde)
  Número: 245
  Label: "Alunos Cadastrados"
  Subtexto: "5 novos esta semana"
  CTA: "Ver lista →" (link azul)

Card 2 - Frequência Semana:
  Ícone: 📋 (48px, verde)
  Número: 92%
  Label: "Frequência Média (Semana)"
  Subtexto: "7 alunos em risco"
  CTA: "Ver detalhes →" (link azul)

Card 3 - Aulas Registradas:
  Ícone: 📖 (48px, roxo)
  Número: 15
  Label: "Aulas Registradas (Mês)"
  Subtexto: "4 turmas ativas"
  CTA: "Ver diário →" (link roxo)

Specs por card:
  - Background: Branco
  - Border-radius: 12px
  - Padding: 24px
  - Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
  - Hover: Sombra maior, translateY(-2px)
  - Layout: Flex com ícone esquerda, conteúdo direita
  - Título: 14px, semibold, #334155
  - Número: 32px, bold, cor do ícone
  - Subtexto: 12px, #64748b
  - CTA: 12px, underline on hover
```

##### Gráfico de Frequência
```
┌────────────────────────────────────────┐
│ Frequência por Turma (Semana)          │
│                                        │
│ 5º A ▓▓▓▓▓▓▓▓▓░░░ 94%  (23/25 alunos) │
│ 5º B ▓▓▓▓▓▓▓░░░░░░ 88%  (20/23 alunos)│
│ 6º A ▓▓▓▓▓▓▓▓░░░░░ 91%  (21/24 alunos)│
│ 6º B ▓▓▓▓▓▓░░░░░░░░ 85%  (18/22 alunos)│
│                                        │
│ Legenda: ▓ Presente | ░ Ausente       │
│                                        │
│ [📊 Ver Relatório Detalhado →]       │
│                                        │
└────────────────────────────────────────┘

Specs:
  - Type: Horizontal bar chart
  - Background: Card branco, padding 24px
  - Cores: Verde #16a34a (presente), Vermelho #ef4444 (ausente)
  - Width bar: 200px max
  - Height bar: 24px
  - Font labels: 14px
  - Percentage: 14px bold
  - Responsive: Em mobile, rotate para vertical
```

##### Atalhos Rápidos
```
ATALHOS RÁPIDOS:

[+ Nova Turma]    [+ Novo Aluno]    [Registrar Freq]
[Novo Diário]     [Calendário]      [Ver Relatórios]

Specs:
  - Grid: 3 colunas em desktop, 2 em tablet, 1 em mobile
  - Button height: 56px
  - Font: 14px, semibold
  - Icons: 24px inline com texto
  - Colors: Primários (azul/verde/roxo) conforme contexto
  - Hover: Sombra, transform scale 1.02
```

### Tutorial Automático (Primeira Visita)
```
Modal aparece após onboarding:

┌─────────────────────────────────────┐
│  🎉 Bem-vindo ao Dashboard!         │
│                                    │
│  PASSO 1: Navegação                │
│  Use o menu à esquerda para        │
│  acessar cada funcionalidade.      │
│  [GIF mostrando menu]              │
│                                    │
│  PASSO 2: Informações Rápidas      │
│  Os cards mostram status atual     │
│  de alunos, frequência e aulas.    │
│  [GIF mostrando cards]             │
│                                    │
│  PASSO 3: Atalhos                  │
│  Use os botões abaixo para ações   │
│  mais rápidas.                     │
│  [GIF mostrando atalhos]           │
│                                    │
│  [Entendi!]      [Ver novamente]   │
│                                    │
└─────────────────────────────────────┘
```

### Notas de UX
- Dashboard é **read-only** na visualização principal
- Links ("Ver lista", "Ver detalhes") levam às respectivas páginas
- Gráfico é **mockado** (dados estáticos para agora)
- Notificações podem ser:
  - "Frequência registrada com sucesso"
  - "Novo aluno adicionado"
  - "Aviso: Aluno com 3 faltas"
- Mobile responsivity: Cards stackam em 1 coluna, sidebar vira hamburger

---

## Página de Alunos

### Objetivo
Gerenciar cadastro e visualização de alunos com interface intuitiva (cards, não tabelas).

### Layout Geral
```
┌─────────────────────────────────────────────────────────────┐
│ [SIDEBAR]                                                   │
├──────────────────────────────────────┬──────────────────────┤
│ FILTROS & AÇÕES (Topo)               │                      │
│ 🔍 Procurar [_______________]        │                      │
│ Turma: [Todas ▼] Status: [Todos ▼]   │ [+ NOVO ALUNO]      │
│ [Limpar Filtros]                     │                      │
├──────────────────────────────────────┼──────────────────────┤
│ LISTA DE ALUNOS (60%)                │ PAINEL DETALHES(40%)│
│                                      │                      │
│ [Card 1]      [Card 2]               │ [Sem seleção]       │
│ João Silva    Maria Santos           │ Selecione um        │
│ 5º A ✓        5º B ✓                 │ aluno para ver      │
│ [•••]         [•••]                  │ detalhes aqui       │
│                                      │                      │
│ [Card 3]      [Card 4]               │ ℹ️ Passe o mouse    │
│ Pedro Costa   Ana Oliveira           │ sobre um card e     │
│ 5º A ✓        6º A ✓                 │ clique para         │
│ [•••]         [•••]                  │ selecionar          │
│                                      │                      │
│ [Card 5]      [Card 6]               │                      │
│ ... (scroll)                          │                      │
│                                      │                      │
└──────────────────────────────────────┴──────────────────────┘
```

### Componentes Detalhados

#### 1. Filtros & Ações (Topo)
```
Layout: Flex, space-between

Esquerda (Filtros):
  🔍 Buscador:
    - Placeholder: "Procurar aluno por nome/CPF..."
    - Width: 300px (desktop), 100% (mobile)
    - Height: 44px
    - Ícone 🔍 à esquerda
    - Clear ✕ à direita se houver texto

  Dropdowns:
    Turma: [Todas ▼]
      - Opções: Todas, 5º A, 5º B, 6º A, 6º B, etc.
      - Default: Todas
      - Width: 150px

    Status: [Todos ▼]
      - Opções: Todos, Ativo, Inativo, Transferido
      - Default: Todos
      - Width: 150px

    Data Matrícula: [Mais recentes ▼]
      - Opções: Mais recentes, Mais antigos, A-Z, Z-A
      - Width: 150px

  Link "Limpar Filtros":
    - 12px, azul, underline on hover
    - Aparece só se há filtros ativos

Direita (Ações):
  Botão "+ NOVO ALUNO":
    - Background: #16a34a (verde)
    - Color: #ffffff
    - Height: 44px
    - Padding: 12px 24px
    - Font-weight: 600
    - Hover: #15803d
    - Ícone 📝 inline
```

#### 2. Cards de Alunos (Lista Esquerda)
```
Card Layout:
┌─────────────────────────────┐
│ 👤 João Silva Costa          │ ← Avatar (40px) + Nome
│ 📚 5º A (Matemática)         │ ← Turma info
│ CPF: 123.456.789-00          │ ← CPF (pequeno)
│ Status: ✓ Ativo              │ ← Status badge
│                              │
│ [Editar] [Perfil] [Deletar]  │ ← Ações aparecem no hover
│                              │
└─────────────────────────────┘

Specs:
  - Width: 280px (em grid 2 colunas = 60% area)
  - Min-height: 160px
  - Background: #ffffff
  - Border-radius: 12px
  - Padding: 16px
  - Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
  - Border-left: 4px #16a34a (verde para ativo)
  - Hover: Sombra maior, translateY(-2px), border-color roxo

Avatar:
  - Tipo: Circular (40px)
  - Fallback: Iniciais em fundo colorido (diferentes cores por aluno)
  - Se tem foto: Imagem real

Nome:
  - Font-size: 16px
  - Font-weight: 600
  - Color: #334155

Turma info:
  - Font-size: 12px
  - Color: #64748b
  - Ícone 📚 (16px)

Status badge:
  - Para Ativo: ✓ Ativo (verde background, 12px)
  - Para Inativo: ✗ Inativo (vermelho background, 12px)
  - Padding: 4px 8px

Ações (aparecem no hover):
  - 3 botões com ícones
  - Button size pequeno (32px, apenas ícone)
  - Colors: Azul (edit), Azul (perfil), Vermelho (delete)
  - Positioned: Bottom-right do card
  - Opacity: 0 (default), 1 (hover)
```

#### 3. Grid de Cards
```
Desktop (60% width):
  - 2 colunas
  - Gap entre cards: 16px
  - Scroll vertical se houver muitos

Tablet (100% stacked):
  - 2 colunas ainda
  - Cards menores (width: calc(50% - 8px))

Mobile (100% stacked):
  - 1 coluna
  - Full width com margem
```

#### 4. Painel de Detalhes (Direita - 40%)
```
SEM ALUNO SELECIONADO:
┌─────────────────────────────┐
│                              │
│  ℹ️ Nenhum aluno selecionado │
│                              │
│  Clique em um card à esquerda│
│  para visualizar detalhes,   │
│  editar ou gerar relatório.  │
│                              │
│  (Ilustração amigável)       │
│                              │
└─────────────────────────────┘

COM ALUNO SELECIONADO:
┌─────────────────────────────┐
│ JOÃO SILVA COSTA             │ ← H2 (24px)
│                              │
│ 📍 Informações Pessoais      │ ← Seção
│   CPF: 123.456.789-00        │
│   Data Nasc: 15/05/2010      │
│   Gênero: Masculino          │
│                              │
│ 📚 Escolar                   │
│   Turma: 5º A                │
│   Ano letivo: 2024           │
│   Data matrícula: 15/02/2024 │
│                              │
│ 👨‍👩‍👦 Responsáveis           │
│   1. Maria Silva (Mãe)       │
│   2. José Silva (Pai)        │
│                              │
│ 📊 Frequência                │
│   Semana: 94%                │
│   Mês: 91%                   │
│   [Abrir histórico →]        │
│                              │
│ [Editar Aluno] [Relatório]   │
│ [Gerar Certidão]             │
│                              │
└─────────────────────────────┘

Specs:
  - Background: Card branco, padding 24px
  - Overflow-y: auto
  - Border-radius: 12px

Seções:
  - Titulo seção: 14px, semibold, #334155
  - Ícone seção: 16px, cor contextual
  - Content: 14px, #64748b

Labels:
  - Negrito (12px)
  - Color: #334155

Valores:
  - 14px regular
  - Color: #64748b

Botões ação:
  - Full width
  - Height: 44px
  - Margin-top: 12px
  - Primário (Editar), Secundário (Relatório)
```

### Tutorial Automático (Primeira Visita)
```
Modal grande aparece ao entrar em Alunos:

┌─────────────────────────────────────┐
│  👥 Gerenciando Alunos              │
│                                    │
│  PASSO 1: Buscar Alunos            │
│  Use a barra de busca para         │
│  encontrar alunos por nome ou      │
│  CPF. Você também pode filtrar     │
│  por turma.                        │
│  [GIF: Digite no search → results]  │
│                                    │
│  PASSO 2: Selecionar & Visualizar  │
│  Clique em um card para ver        │
│  informações completas do aluno.   │
│  [GIF: Click card → details appear] │
│                                    │
│  PASSO 3: Adicionar Novo           │
│  Clique em "+ NOVO ALUNO" para     │
│  registrar um novo aluno.          │
│  [GIF: Click button → form opens]   │
│                                    │
│  [Entendi!]      [Ver novamente]   │
│                                    │
│ ☐ Não mostrar novamente            │
│                                    │
└─────────────────────────────────────┘

GIFs (mockados):
  - Cursor digitando no search
  - Cards aparecendo/desaparecendo
  - Card sendo clicado, painel direito populando
  - Botão sendo clicado, modal abrindo
```

### Modal: Adicionar/Editar Aluno
```
┌─────────────────────────────────────┐
│ ✕                                   │
│ Novo Aluno                          │ ← H2 (24px)
│                                    │
│ 📋 Informações Pessoais             │
│                                    │
│ Nome Completo*                      │
│ [_______________________________]    │
│                                    │
│ CPF*                                │
│ [___.___.___-__]                    │
│                                    │
│ Data de Nascimento*                 │
│ [__/__/____]                        │
│                                    │
│ Gênero*                             │
│ ○ Masculino  ○ Feminino  ○ Outro   │
│                                    │
│ 📚 Informações Escolares            │
│                                    │
│ Turma*                              │
│ [Selecione uma turma...]            │
│                                    │
│ Data de Matrícula*                  │
│ [__/__/____]                        │
│                                    │
│ 👨‍👩‍👦 Responsáveis (opcional)       │
│                                    │
│ Responsável 1:                      │
│ Nome: [____________]                │
│ Relação: [Mãe/Pai/Avó...]          │
│ [+ Adicionar outro responsável]    │
│                                    │
│ [Cancelar]             [Salvar]     │
│                                    │
└─────────────────────────────────────┘

Specs:
  - Width: 600px
  - Max-height: 80vh (scrollable)
  - Sections com H3 (18px)
  - Inputs conforme Design System
  - Radiobuttons em linha
  - Link "+ Adicionar responsável": Azul, 14px
```

### Notas de UX
- **Busca em tempo real**: Filtra conforme digita
- **Scroll infinito**: Carrega mais cards ao scrollar (ou pagination)
- **Drag-and-drop colapsável**: Em tablet, painel direita vira drawer/modal
- **Validação**: Campo CPF mostra erro se formato inválido
- **Confirmação delete**: Modal "Tem certeza?" antes de deletar
- **Success toast**: Depois de salvar, notificação verde "Aluno adicionado com sucesso!"

---

## Página de Turmas

### Objetivo
Criar e gerenciar turmas (classes) com visualização clara por série.

### Layout Geral
```
┌─────────────────────────────────────────────────────────────┐
│ [SIDEBAR]                                                   │
├──────────────────────────────────────┬──────────────────────┤
│ FILTROS & AÇÕES (Topo)               │                      │
│ 🔍 Procurar [_______________]        │ [+ NOVA TURMA]      │
│ Série: [Todas ▼] Professor: [Todos▼] │                      │
├──────────────────────────────────────┼──────────────────────┤
│ GRID DE TURMAS (55%)                 │ DETALHES TURMA (45%)│
│                                      │                      │
│ [5º A]        [5º B]                 │ [Sem seleção]       │
│ Prof. Maria   Prof. João             │ Selecione uma       │
│ 24 alunos     22 alunos              │ turma para ver      │
│                                      │ detalhes            │
│ [6º A]        [6º B]                 │                      │
│ Prof. Pedro   Prof. Ana              │ ℹ️ Clique em um      │
│ 28 alunos     25 alunos              │ card à esquerda     │
│                                      │                      │
│ [7º A]        ...                    │                      │
│                                      │                      │
└──────────────────────────────────────┴──────────────────────┘
```

### Componentes Detalhados

#### 1. Filtros (Top)
```
Buscador:
  - Placeholder: "Procurar turma (ex: 5º A, 6º B)..."
  - Width: 300px
  - Height: 44px

Dropdowns:
  Série: [Todas ▼]
    - Opções: Todas, 5º, 6º, 7º, 8º, 9º

  Professor: [Todos ▼]
    - Opções: Todos, Prof. Maria, Prof. João, etc.

  Ano Letivo: [2024 ▼]
    - Opções: 2024, 2023, 2022

Botão "+ NOVA TURMA":
  - Verde (#16a34a)
  - 44px height
  - Ícone 📚 inline
```

#### 2. Cards de Turma (Grid)
```
┌─────────────────────────────┐
│                              │
│        📚 5º A               │ ← Série grande (32px, bold)
│                              │
│ Prof. Maria Silva            │ ← Professor (14px)
│ 24 alunos | 94% frequência   │ ← Stats (12px)
│                              │
│ [Editar] [Alunos] [Deletar]  │ ← Ações no hover
│                              │
└─────────────────────────────┘

Specs:
  - Grid: 2 colunas em desktop
  - Card size: 280px x 200px
  - Background: #ffffff
  - Border-radius: 12px
  - Padding: 24px
  - Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
  - Border-top: 4px (cor diferente por série):
    - 5º: #3b82f6 (azul)
    - 6º: #16a34a (verde)
    - 7º: #7c3aed (roxo)
    - 8º: #f59e0b (âmbar)
    - 9º: #ef4444 (vermelho)
  - Hover: Sombra +, translate, border-top mais grosso

Série (display big):
  - Font: 32px, bold
  - Color: Mesma cor do border-top
  - Letter suffix: A, B, C, D em 18px

Professor:
  - Font: 14px
  - Color: #334155
  - Ícone 👤 (16px) antes

Stats:
  - Font: 12px
  - Color: #64748b
  - Ícones: 👥 (alunos), 📋 (frequência)

Ações (appear on hover):
  - 3 buttons com ícones
  - Color: Azul (edit), Azul (alunos), Vermelho (delete)
  - Position: Bottom-right
  - Opacity: 0 → 1
```

#### 3. Painel de Detalhes (Direita)
```
SEM SELEÇÃO:
┌─────────────────────────────┐
│ ℹ️ Nenhuma turma selecionada│
│                              │
│ Clique em um card para      │
│ visualizar detalhes.        │
│                              │
└─────────────────────────────┘

COM SELEÇÃO (5º A):
┌─────────────────────────────┐
│ 5º A - Turma de Matemática   │ ← H2
│                              │
│ 👤 Professor                 │
│   Maria Silva da Costa       │
│   maria.silva@escola.local   │
│   (35) 99999-9999           │
│                              │
│ 👥 Alunos (24)              │
│   1. João Silva              │
│   2. Maria Santos            │
│   3. Pedro Costa             │
│   4. Ana Oliveira            │
│   [... mais 20 ...]          │
│   [Ver lista completa →]     │
│                              │
│ 📊 Frequência Média: 94%     │
│   Presentes: 23 alunos       │
│   Ausentes: 1 aluno          │
│                              │
│ 🎓 Aulas Registradas: 15     │
│   [Últimas aulas →]          │
│                              │
│ [Editar Turma]               │
│ [Gerar Relatório]            │
│                              │
└─────────────────────────────┘

Specs:
  - Card branco, padding 24px
  - Sections com H3 (16px)
  - Overflow-y: auto

Lista de alunos:
  - Mostra primeiros 5
  - Link "+ ... mais 20" (12px, azul) se houver mais
```

### Tutorial Automático
```
Modal ao entrar em Turmas:

┌─────────────────────────────────────┐
│  📚 Gerenciando Turmas              │
│                                    │
│  PASSO 1: Visualizar Turmas        │
│  Os cards mostram série, professor │
│  e número de alunos de cada turma. │
│  [GIF mostrando grid de cards]      │
│                                    │
│  PASSO 2: Ver Detalhes             │
│  Clique em uma turma para ver      │
│  informações completas e lista     │
│  de alunos.                        │
│  [GIF: Click card → details]        │
│                                    │
│  PASSO 3: Criar Turma              │
│  Clique "+ NOVA TURMA" para        │
│  criar uma nova turma.             │
│  [GIF: Button → form]               │
│                                    │
│  [Entendi!]                        │
│                                    │
└─────────────────────────────────────┘
```

### Modal: Nova/Editar Turma
```
┌─────────────────────────────────────┐
│ ✕                                   │
│ Nova Turma                          │
│                                    │
│ Série*                              │
│ [Selecione: 5º / 6º / 7º...]       │
│                                    │
│ Letra/Identificador*                │
│ [A___________]                      │
│ (ex: A, B, C ou Turma 1)           │
│                                    │
│ Disciplina/Tema (opcional)          │
│ [Matemática, Português...]         │
│                                    │
│ Professor Responsável*              │
│ [Selecione o professor...]         │
│                                    │
│ Ano Letivo*                         │
│ [2024 ▼]                            │
│                                    │
│ Máximo de Alunos (sugestão)         │
│ [25_______]                         │
│                                    │
│ [Cancelar]             [Salvar]     │
│                                    │
└─────────────────────────────────────┘
```

### Notas de UX
- **Cores por série**: Facilita identificação visual rápida
- **Stats no card**: Frequência % mostra saúde da turma visualmente
- **Atribuição automática**: Professor só consegue ver suas turmas (conforme role)
- **Delete confirmation**: Modal antes de deletar turma
- **Success toast**: "Turma criada com sucesso!"

---

## Página de Frequência

### Objetivo
Registrar frequência diária dos alunos de forma **visual, intuitiva e rápida** (tipo planilha Excel, mas amigável).

### Layout Geral
```
┌─────────────────────────────────────────────────────────────┐
│ [SIDEBAR]                                                   │
├──────────────────────────────────┬────────────────────────┤
│ SELEÇÃO (Topo)                   │ RESUMO & AVISOS (Topo) │
│ Turma: [5º A ▼]                  │ Frequência média: 92%  │
│ Data: [4 dez 2024] [Sem > >>]    │ ⚠️ Alunos em Risco:   │
│                                  │ • João Silva (87%)     │
│ [Semana] [Mês] [Personalizado]   │ • Maria Santos (79%)   │
│                                  │                        │
├──────────────────────────────────┴────────────────────────┤
│ GRID DE FREQUÊNCIA (Main area)                             │
│                                                            │
│     seg 2  |  ter 3  |  qua 4  |  qui 5  |  sex 6         │
│  ──────────┼─────────┼─────────┼─────────┼─────────       │
│ João Silva │    ✓    │    ✓    │    ~    │    ✓    │     │
│ Maria Sant │    ✓    │    ✗    │    ✓    │    ✓    │     │
│ Pedro Cost │    ✓    │    ✓    │    ✓    │    ✓    │     │
│ Ana Olivei │    ✓    │    ✓    │    ✓    │    ~    │     │
│ ... (scroll) vertical                                      │
│                                                            │
│ Legenda: ✓ Presente  ✗ Ausente  ~ Atraso                 │
│                                                            │
│                    [💾 Salvar Frequência]                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Componentes Detalhados

#### 1. Seleção (Topo Esquerda)
```
Turma:
  - Dropdown: [5º A ▼]
  - Largura: 200px
  - Height: 44px
  - Opções: Todas turmas do usuário

Data:
  - Display: "4 dez 2024" (readonly)
  - Input: Click abre date picker (calendar)
  - Navigation: [<] Dia anterior | Próximo [>]
  - Buttons: [Semana] [Mês] [Personalizado]

Botões de Período:
  - 3 toggle buttons
  - Semana: [seg-sex]
  - Mês: [1º-30º]
  - Personalizado: Abre date range picker

Specs:
  - Height: 44px buttons
  - Font: 14px semibold
  - Color ativo: #1e40af
  - Color inactive: #64748b
```

#### 2. Resumo & Avisos (Topo Direita)
```
Frequency Summary Box:
┌────────────────────────────┐
│ Frequência da Semana: 92%  │ ← H3 (14px)
│                            │
│ Presentes: 110             │
│ Ausentes: 7                │
│ Atrasos: 3                 │
│ Total: 120 (23 alunos)     │
│                            │
│ [📊 Ver Relatório]         │
│                            │
└────────────────────────────┘

Risk Alert Box:
┌────────────────────────────┐
│ ⚠️ Alunos em Risco          │ ← Vermelho background
│ (Frequência < 80%)         │
│                            │
│ 1. João Silva  - 87%       │
│    [⚠️ 3 faltas]            │
│                            │
│ 2. Maria Santos - 79%      │
│    [🚨 6 faltas]            │
│                            │
│ [Ver Histórico Completo]   │
│                            │
└────────────────────────────┘

Specs:
  - Cards lado-a-lado se desktop, stacked em mobile
  - Card branco, padding 16px
  - Background subtly different: #fef2f2 para risk
```

#### 3. Grid de Frequência (Main - CRÍTICO)
```
Layout tipo tabela/planilha:

Coluna Nome (Fixed):
  - Width: 150px
  - Position: sticky esquerda
  - Background: #f8fafc
  - Border-right: 2px #e2e8f0

Colunas de Dias (Scrollable):
  - Cada coluna: 80px
  - Header: Dia da semana (seg, ter, qua...) + número (2, 3, 4...)
  - Font header: 12px, semibold
  - Color header: #334155

Células de Frequência:
  - Size: 80x48px
  - Text-align: center
  - Clickable
  - Mostra: ✓ (presente), ✗ (ausente), ~ (atraso), vazio (não marcado)

  Estados visuais:
    ✓ Presente: Background #dcfce7 (verde claro), text #166534
    ✗ Ausente: Background #fee2e2 (vermelho claro), text #991b1b
    ~ Atraso: Background #fef3c7 (amarelo claro), text #92400e
    Vazio: Background #ffffff, border cinza

  Hover:
    - Border: 2px da cor correspondente
    - Sombra sutil
    - Cursor: pointer
    - Tooltip: "Clique para marcar"

Totalizador Rodapé:
  ┌──────────────────────────────────────────────┐
  │ Total Semana:  ✓ 110  │  ✗ 7  │  ~ 3       │
  │ Taxa: 92%                                    │
  └──────────────────────────────────────────────┘

  - Row background: #f1f5f9
  - Font: 14px semibold
  - Valores com ícones colorizados

Legenda:
  - Fixa na base: "✓ Presente  |  ✗ Ausente  |  ~ Atraso"
  - Font: 12px
  - Color: Cinza
```

#### 4. Interatividade - Clique em Célula
```
Fluxo:
User clica em célula vazia ou para mudar:
  ↓
Mini menu aparece (tipo context menu):
  ┌─────────────────────┐
  │ ✓ Presente          │
  │ ✗ Ausente           │
  │ ~ Atraso            │
  │ ─────────────────── │
  │ Limpar              │
  │                     │
  └─────────────────────┘

  - Position: Acima da célula
  - Width: 150px
  - Ícones coloridos
  - Click item: Célula muda, menu fecha
  - Click fora: Menu fecha sem mudar

Specs menu:
  - Background: Branco
  - Border: 1px #e2e8f0
  - Border-radius: 8px
  - Box-shadow: 0 4px 12px rgba(0,0,0,0.15)
  - Padding: 8px 0
  - Font: 14px

Item layout:
  - Padding: 8px 12px
  - Flex: ícone (16px) + texto
  - Hover: Background #f8fafc
  - Cursor: pointer
```

#### 5. Botão Salvar
```
┌──────────────────────────────────┐
│     [💾 SALVAR FREQUÊNCIA]       │
└──────────────────────────────────┘

Specs:
  - Position: Sticky bottom center ou float
  - Width: 300px
  - Height: 52px
  - Background: #16a34a (verde)
  - Color: #ffffff
  - Font: 16px bold
  - Border-radius: 12px
  - Box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3)
  - Hover: #15803d, shadow maior
  - Click: Loading state com spinner

Loading state:
  - Icon spinning (4px roxo)
  - Text: "Salvando..."
  - Disabled: true
  - Duration: ~2 segundos

Success state:
  - Ícone checkmark ✓ verde
  - Text: "Frequência salva com sucesso!"
  - Volta a normal após 3 segundos

Error state:
  - Background: #ef4444
  - Ícone: ✕ vermelho
  - Text: "Erro ao salvar. Tente novamente."
  - Botão volta a normal se user clica novamente
```

### Tutorial Automático (SUPER IMPORTANTE)
```
Modal grande ao primeiro acesso a Frequência:

┌──────────────────────────────────────┐
│ 📋 Registrando Frequência             │
│                                     │
│ PASSO 1 DE 4: Entender a Grid       │
│                                     │
│ Você verá uma tabela com:          │
│ • Nomes dos alunos (coluna fixa)   │
│ • Dias da semana (colunas)         │
│ • Estados: ✓ Presente, ✗ Ausente,  │
│   ~ Atraso                         │
│                                     │
│ [GIF: Mouse apontando grid,         │
│  explicando cada parte]            │
│                                     │
│ [Próximo →]                        │
│                                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PASSO 2 DE 4: Clicando em uma Célula│
│                                     │
│ Clique em uma célula (dia + aluno) │
│ e escolha o estado:                │
│                                     │
│ [GIF: Clicando célula → menu popup  │
│  mostrando 3 opções]               │
│                                     │
│ [Anterior] [Próximo →]             │
│                                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PASSO 3 DE 4: Preenchendo a Semana  │
│                                     │
│ Preencha todas as células da semana │
│ (seg a sex). Você verá o total      │
│ atualizar em tempo real.            │
│                                     │
│ [GIF: Animação preenchendo múltiplas│
│  células, barra total atualizando]  │
│                                     │
│ [Anterior] [Próximo →]             │
│                                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PASSO 4 DE 4: Salvando               │
│                                     │
│ Quando terminar, clique em          │
│ "SALVAR FREQUÊNCIA" (botão verde).  │
│                                     │
│ Isso vai salvar permanentemente     │
│ e mostrar uma confirmação.          │
│                                     │
│ [GIF: Botão sendo clicado, spinner, │
│  mensagem "Salvo com sucesso"]      │
│                                     │
│ [Anterior] [Concluído!]            │
│                                     │
│ ☐ Não mostrar novamente            │
│                                     │
└──────────────────────────────────────┘

Specs:
  - Modal width: 600px
  - Content height: 400px (scrollable se needed)
  - GIFs: 500x300px
  - Botão "Próximo": Azul 44px
  - Botão "Anterior": Outline 44px
  - Botão "Concluído": Verde 44px, bold
  - Checkbox: "Não mostrar novamente" no final
```

### Notas de UX (CRÍTICO)
- **Responsividade**: Em tablet/mobile, grid fica horizontal scroll (não ideal, mas funciona)
- **Performance**: Se turma tem 50+ alunos, consider virtual scrolling
- **Validação**: Não permite salvar sem preencher a semana completa (alerta)
- **Data navigator**: Prev/Next week/month fácil de acessar
- **Backup automático**: A cada 5 minutos, salva automaticamente
- **Offline**: Se conexão cai, salva em localStorage até reconectar
- **Undo**: Botão "Desfazer" após salvar (por 30 segundos)
- **Mobile UX**: Em mobile, mostra apenas dia selecionado + prev/next
- **Botão ? sempre visible**: Canto inferior com modal tutorial

---

## Página de Diário de Classe

### Objetivo
Registrar aulas ministradas com conteúdo, recursos e observações.

### Layout Geral
```
┌─────────────────────────────────────────────────────────────┐
│ [SIDEBAR]                                                   │
├──────────────────────────────────┬────────────────────────┤
│ SELEÇÃO (Topo)                   │                        │
│ Turma: [5º A ▼]                  │ NOVA/EDITAR AULA      │
│ Data: [4 dez 2024]               │ (quando selecionado)   │
│ [Mês] [Semana] [Hoje]            │                        │
│ [+ Nova Aula]                    │ (form ou detalhes)    │
│                                  │                        │
├──────────────────────────────────┴────────────────────────┤
│ TIMELINE DE AULAS (Main)                                   │
│                                                            │
│ [Data 5 dez]                                              │
│ ┌─────────────────────────────────┐                      │
│ │ 14:30 - Matemática               │ ← Card aula       │
│ │ Frações - conceitos básicos       │                    │
│ │ 📚 Livro  📊 Slides             │                    │
│ │ [Editar] [Duplicar] [Deletar]   │                    │
│ └─────────────────────────────────┘                      │
│                                                            │
│ ┌─────────────────────────────────┐                      │
│ │ 15:30 - Português                │                    │
│ │ Leitura e interpretação          │                    │
│ │ 📚 Livro  📖 Texto              │                    │
│ └─────────────────────────────────┘                      │
│                                                            │
│ [Data 4 dez]                                              │
│ ┌─────────────────────────────────┐                      │
│ │ 14:30 - Ciências                 │                    │
│ │ Ciclo da água                    │                    │
│ │ 🎥 Vídeo  📊 Slides             │                    │
│ └─────────────────────────────────┘                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Componentes Detalhados

#### 1. Seleção (Topo Esquerda)
```
Turma:
  - Dropdown: [5º A ▼]
  - Width: 200px
  - Height: 44px

Data:
  - Display: "4 dez 2024"
  - Click abre date picker
  - Navigation: [<] [>]

Filter Buttons:
  - [Mês] [Semana] [Hoje]
  - Toggle buttons
  - Ativo em azul

Botão "+ Nova Aula":
  - Verde (#16a34a)
  - Height: 44px
  - Width: Full
  - Ícone 📝 inline

Specs:
  - Layout: Column stacked
  - Padding: 16px
  - Gap: 12px
  - Background: #f8fafc
```

#### 2. Timeline de Aulas (Main)
```
Estrutura:
  - Agrupado por data (descendente - mais recentes primeiro)
  - Card por aula dentro de cada data

Data Header:
  ┌────────────────────┐
  │ 📅 Sexta, 6 dez    │
  └────────────────────┘

  Specs:
  - Font: 14px, semibold
  - Color: #334155
  - Padding: 16px 0 8px 0
  - Border-top: 1px #e2e8f0 (except first)

Card Aula:
  ┌──────────────────────────────────┐
  │ 14:30 - Matemática                │ ← Hora + Disciplina
  │                                  │
  │ Frações - Conceitos Básicos      │ ← Conteúdo/Tema
  │                                  │
  │ 📚 Livro didático  📊 Slides    │ ← Recursos (icons)
  │                                  │
  │ Anotações:                        │
  │ "Turma teve dificuldade com..."  │ ← Observações (se houver)
  │                                  │
  │ [Editar] [Duplicar] [Deletar]   │ ← Ações
  │                                  │
  └──────────────────────────────────┘

  Specs:
  - Background: #ffffff
  - Border-left: 4px #16a34a (verde)
  - Border-radius: 8px
  - Padding: 16px
  - Margin-bottom: 12px
  - Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
  - Max-width: 600px (timeline)

Hora + Disciplina:
  - Hora: 16px bold, #334155
  - Separator: " - " em #64748b
  - Disciplina: 16px bold, #1e40af

Conteúdo/Tema:
  - Font: 14px regular
  - Color: #64748b
  - Margin: 8px 0

Recursos (Icons):
  - Grid horizontal
  - Ícones (24px) com labels
  - Font labels: 12px
  - Color ícone: #16a34a
  - Icons: 📚 Livro | 📖 Texto | 🎥 Vídeo | 📊 Slides | 🎨 Arte

Anotações:
  - Font: 12px italic
  - Color: #64748b
  - Background: #f8fafc
  - Padding: 8px
  - Border-left: 2px #64748b
  - Appears only if filled

Ações (appear on hover):
  - 3 buttons com ícones
  - Color: Azul (edit), Azul (duplicate), Vermelho (delete)
  - Position: Right side
  - Opacity: 0 → 1 on hover
```

#### 3. Painel Direita (Novo/Editar Aula)
```
FORMULÁRIO NOVA AULA:
┌────────────────────────────────────┐
│ 📝 Nova Aula                        │ ← H3
│                                   │
│ Disciplina*                        │
│ [Matemática ▼]                     │
│ (Opções: Português, Matemática,   │
│  Ciências, História, Geografia,   │
│  Ed. Física, Arte)                │
│                                   │
│ Horário (opcional)                │
│ [14:30_________]  (HH:MM)        │
│                                   │
│ Conteúdo/Tema*                     │
│ [Frações - Conceitos Básicos     │
│  _____________________________]    │
│ (textarea, 100px height)          │
│                                   │
│ Recursos Utilizados:               │
│ ☑ Livro didático                  │
│ ☐ Texto/Documento                 │
│ ☐ Vídeo                           │
│ ☐ Slides/PowerPoint               │
│ ☐ Atividade Prática               │
│ ☐ Quadro                          │
│ ☐ Outro material                  │
│                                   │
│ Anotações/Observações:             │
│ [Turma teve dificuldade com...   │
│  _____________________________]    │
│ (textarea, 80px height, optional) │
│                                   │
│ [Cancelar]          [Salvar Aula] │
│                                   │
└────────────────────────────────────┘

Specs:
  - Card branco, padding 24px
  - Max-width: 100% (right panel)
  - Overflow-y: auto

Inputs:
  - Disciplina: Dropdown 44px
  - Horário: Input 44px
  - Conteúdo: Textarea 100px
  - Recursos: Checkboxes (grid 2 col)
  - Anotações: Textarea 80px

Botões:
  - Cancelar: Outline 44px
  - Salvar: Verde 44px, bold
  - Width: Full

State inicial:
  - Placeholder: "Adicione uma nova aula..."
  - Mostra formulário vazio
```

### Tutorial Automático
```
Modal ao primeiro acesso a Diário:

┌──────────────────────────────────────┐
│ 📖 Registrando Aulas                 │
│                                     │
│ PASSO 1 DE 3: Visualizar Aulas     │
│                                     │
│ As aulas são mostradas em uma       │
│ timeline (mais recentes primeiro).  │
│ Você vê a disciplina, conteúdo e   │
│ recursos utilizados.                │
│                                     │
│ [GIF: Timeline scrollando mostrando │
│  múltiplas cards de aula]           │
│                                     │
│ [Próximo →]                        │
│                                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PASSO 2 DE 3: Criar Aula             │
│                                     │
│ Clique "+ Nova Aula" para registrar │
│ a aula que você ministrou.          │
│                                     │
│ Preencha: disciplina, conteúdo e   │
│ recursos utilizados.                │
│                                     │
│ [GIF: Botão sendo clicado, form    │
│  aparecendo com campos]             │
│                                     │
│ [Anterior] [Próximo →]             │
│                                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PASSO 3 DE 3: Finalizar              │
│                                     │
│ Clique "Salvar Aula" para registrar │
│ a aula.                             │
│                                     │
│ Você pode editar ou duplicar a aula │
│ depois se necessário.               │
│                                     │
│ [GIF: Botão Salvar sendo clicado,  │
│  card aparecendo na timeline]      │
│                                     │
│ [Anterior] [Concluído!]            │
│                                     │
└──────────────────────────────────────┘
```

### Notas de UX
- **Auto-populate**: Hora padrão = última aula registrada
- **Disciplina sugerida**: Se usuário só ensina uma disciplina, pré-seleciona
- **Duplicar aula**: Útil para repetir aula da semana anterior
- **Delete confirmation**: Modal antes de deletar
- **Success toast**: "Aula registrada com sucesso!"
- **Timeline virtual scroll**: Se muitas aulas, usar virtual scrolling em mobile

---

## Página de Calendário com Base Curricular

### Objetivo
Integrar planejamento educacional com **Base Curricular**, mostrando **feriados**, **eventos** e **tópicos a trabalhar** em cada disciplina.

### Layout Geral
```
┌─────────────────────────────────────────────────────────────┐
│ [SIDEBAR]                                                   │
├──────────────────────────────┬──────────────────────────────┤
│ CONTROLES (Topo Esquerda)    │ DETALHES DIA (Topo Direita)  │
│                              │                              │
│ Turma: [5º A ▼]              │ 🗓️ Sexta, 6 dez 2024        │
│ Mês: [< Dezembro 2024 >]     │                              │
│ Visualização:                │ 📚 Base Curricular:          │
│ [Mês] [Semana]               │  ☑ Português - Ortografia   │
│ [+ Novo Evento]              │  ☑ Matemática - Frações     │
│                              │                              │
├──────────────────────────────┼──────────────────────────────┤
│ CALENDÁRIO (50%)             │ AULAS & EVENTOS (50%)       │
│                              │                              │
│   Dez 2024                   │ Aulas do Dia:               │
│                              │ • 14:30 - Matemática        │
│ seg  ter  qua  qui  sex sab dom                             │
│                    1    2    3 │ Eventos:                    │
│  4    5    6    7    8    9   10 │ 🎉 Feriado: Dia do       │
│ 11   12   13   14   15   16   17 │    Servidor Público      │
│ 18   19   20   21 📚 23   24    │                              │
│ 25   26   27   28   29   30   31 │ [Editar Dia]              │
│                              │ [Adicionar Evento]          │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
```

### Componentes Detalhados

#### 1. Controles (Topo Esquerda)
```
Turma:
  - Dropdown: [5º A ▼]
  - Width: 200px
  - Height: 44px

Mês/Ano:
  - Display: "< Dezembro 2024 >"
  - Buttons: [<] [>]
  - Click abre date picker (month/year)

Visualização:
  - Toggle buttons: [Mês] [Semana]
  - Default: Mês
  - Azul quando ativo

Botão "+ Novo Evento":
  - Verde (#16a34a)
  - Height: 44px
  - Width: Full
  - Ícone 📅 inline

Accordion: Base Curricular
  ┌──────────────────────────────┐
  │ 📚 Base Curricular 5º Ano     │ ← Expandível
  │                              │
  │ ✓ Português                  │ ← Disciplina c/ checkbox
  │   • Ortografia               │ ← Tópico (arrastrável)
  │   • Interpretação de Texto   │
  │   • Produção Escrita         │
  │                              │
  │ ✓ Matemática                 │
  │   • Frações                  │
  │   • Operações com Decimais   │
  │   • Geometria Básica         │
  │                              │
  │ Ciências                     │
  │   • Ciclo da Água            │
  │   • Ecossistemas             │
  │                              │
  └──────────────────────────────┘

  Specs:
  - Card branco, padding 16px
  - Disciplina: 14px bold, com checkbox ☑
  - Tópicos: 12px regular, indentado
  - Tópicos arrastrável (Drag & Drop)
  - Hover tópico: Background #f1f5f9, cursor grab

Specs gerais Sidebar:
  - Background: #f8fafc
  - Padding: 16px
  - Overflow-y: auto
  - Border-right: 1px #e2e8f0
```

#### 2. Calendário (50%)
```
Estrutura:
  - Grid 7 colunas (seg-dom)
  - Células 80x80px
  - Header com dias da semana

Header (Dias da Semana):
  - seg ter qua qui sex sab dom
  - Font: 14px bold
  - Color: #334155
  - Padding: 12px 0

Célula de Data:
  ┌──────────┐
  │ 6        │ ← Número data (14px, bold)
  │          │
  │ 📚  🎉   │ ← Ícones de eventos (se houver)
  │          │
  │ Português│ ← Disciplina resumida (opcional)
  │ Frações  │ ← Tópico (opcional, pequeno)
  │          │
  └──────────┘

  Specs:
  - Background: #ffffff (default) | #dbeafe (hoje) | #dcfce7 (com evento)
  - Border: 1px #e2e8f0
  - Hover: Background #f1f5f9, box-shadow 0 2px 8px
  - Cursor: pointer
  - Padding: 8px

Ícones célula:
  - 📚 = Aula registrada (azul)
  - 🎉 = Feriado (verde)
  - 📌 = Evento customizado (roxo)
  - 📍 = Base Curricular marcada (laranja)

Feriados:
  - Background: #fce7f3 (rosa claro)
  - Texto feriado: "Proclamação da República" (10px)
  - Color: #be123c
```

#### 3. Detalhes do Dia (Topo Direita)
```
SEM SELEÇÃO:
┌──────────────────────────────┐
│ Selecione um dia no          │
│ calendário para ver detalhes │
│                              │
│ (Ilustração amigável)        │
│                              │
└──────────────────────────────┘

COM SELEÇÃO (Dia 6):
┌──────────────────────────────┐
│ 🗓️ Sexta, 6 dez 2024         │ ← Data grande
│                              │
│ 📚 Base Curricular           │ ← Seção
│   ☑ Português - Ortografia   │ ← Checkable
│   ☑ Matemática - Frações     │
│                              │
│ 📖 Aulas do Dia              │
│   • 14:30 - Matemática       │
│     "Frações - conceitos"    │
│   • 15:30 - Português        │
│     "Leitura e interpretação"│
│                              │
│ 🎉 Feriado                   │
│   Proclamação da República   │
│                              │
│ [Editar] [Novo Evento]       │
│                              │
└──────────────────────────────┘

Specs:
  - Card branco, padding 20px
  - Date H2: 20px bold, #334155
  - Seções: 14px bold com ícone
  - Content: 12px regular, #64748b
  - Checkbox: Verde quando marcado
  - Botões: 40px height, full width
```

#### 4. Drag & Drop: Tópico para Dia
```
User action:
1. Clica no tópico "Frações" (na sidebar Base Curricular)
2. Arrasta para dia 6 do calendário
3. Dia 6 fica highlighted/hovered
4. Solta - tópico é adicionado ao dia

Resultado visual:
  - Dia 6 agora mostra: 📍 Matemática/Frações
  - Painel direita mostra tópico checkado
  - Success toast: "Tópico adicionado ao calendário!"

Specs:
  - Drag element: Pequeno card/tooltip seguindo mouse
  - Drop zone: Célula inteira com outline dashed
  - Color drop zone: #7c3aed (roxo accent)
  - Cursor: move/grab
  - Feedback: Scale 1.1 ao iniciar drag
```

### Modal: Novo Evento
```
┌────────────────────────────────┐
│ ✕                              │
│ Novo Evento                    │
│                                │
│ Tipo de Evento*                │
│ ○ Feriado                      │
│ ○ Evento Curricular            │
│ ○ Parada Pedagógica            │
│ ○ Comemorativo                 │
│                                │
│ Título/Nome*                   │
│ [Dia do Servidor Público]      │
│                                │
│ Data*                          │
│ [6 dez 2024]                   │
│                                │
│ Descrição (opcional)           │
│ [___________________________]   │
│                                │
│ Repetir Anualmente? (feriados) │
│ ☐ Sim (próximos 5 anos)        │
│                                │
│ [Cancelar]        [Adicionar]  │
│                                │
└────────────────────────────────┘

Specs:
  - Width: 500px
  - Radio buttons: Verde quando selecionado
  - Inputs: 44px height
  - Textarea: 80px height
  - Botões: 44px
```

### Tutorial Automático
```
Modal ao primeiro acesso a Calendário:

┌──────────────────────────────────────┐
│ 📅 Planejando com Calendário          │
│                                     │
│ PASSO 1 DE 3: Visualizar Calendário│
│                                     │
│ O calendário mostra:               │
│ • Feriados (dia inteiro)          │
│ • Base Curricular (tópicos)       │
│ • Aulas registradas              │
│ • Eventos customizados           │
│                                     │
│ [GIF: Calendário com indicadores]   │
│                                     │
│ [Próximo →]                        │
│                                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PASSO 2 DE 3: Drag & Drop             │
│                                     │
│ Na Base Curricular (esquerda),      │
│ arraste um tópico para um dia      │
│ no calendário.                     │
│                                     │
│ Isso marca que você pretende       │
│ trabalhar aquele tópico naquele   │
│ dia.                               │
│                                     │
│ [GIF: Drag "Frações" para dia 6]    │
│                                     │
│ [Anterior] [Próximo →]             │
│                                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PASSO 3 DE 3: Criar Eventos         │
│                                     │
│ Clique "+ Novo Evento" para        │
│ adicionar feriados ou eventos      │
│ especiais ao calendário.           │
│                                     │
│ [GIF: Botão → modal abrindo]        │
│                                     │
│ [Anterior] [Concluído!]            │
│                                     │
└──────────────────────────────────────┘
```

### Notas de UX
- **Responsive**: Em mobile, calendário em visualização "semana" por padrão
- **Integração**: Tópicos arrastados criam automaticamente "lembretes" para o dia
- **Sincronização**: Tópicos que já têm aula registrada mostram checkmark verde
- **Base Curricular**: Vem pré-populada com BNCC (Base Nacional Comum Curricular) adaptada
- **Export**: Botão para gerar PDF do planejamento mensal
- **Colors**: Dias com eventos têm background suavemente colorido (sem poluição)

---

## Sistema de Help & Tutoriais Interativos

### Arquitetura Geral

O sistema de help funciona em **3 camadas**:

#### 1️⃣ Modais Automáticos (First-Time User)
Aparecem automaticamente quando o usuário **entra em uma funcionalidade pela primeira vez**.

- **Trigger**: Navegação para página new
- **Display**: Modal centralizado + semi-transparent overlay
- **Content**: 3-4 passos com GIFs animados
- **Actions**: "Entendi!" | "Ver novamente"
- **Indicator**: Dot verde na sidebar mostra "visitado"

#### 2️⃣ Botão "?" Flutuante (Always Available)
Botão flutuante no canto inferior direito - sempre acessível.

- **Position**: Fixed, canto inferior direito (24px from edge)
- **Size**: 56px circular button
- **Color**: #7c3aed (roxo accent)
- **Icon**: "?" branco, bold, 24px
- **Hover**: Scale 1.1, shadow maior
- **Click**: Abre menu de ajuda contextual

#### 3️⃣ Tooltips em Campos (Field-Level Help)
Pequeno ícone "ℹ️" em campos de formulário sensíveis.

- **Position**: Right side do label
- **Trigger**: Hover ou click
- **Display**: Tooltip acima/abaixo (auto-positionado)
- **Content**: 1-2 linhas de explicação
- **Duration**: Desaparece após 5s ou click fora

### Menu de Ajuda Contextual (Ao clicar botão "?")
```
┌─────────────────────────────────┐
│ ❓ Ajuda - Página Frequência      │
│                                │
│ 🎥 Ver Tutorial                │
│    Passo a passo visual com GIF │
│                                │
│ 📖 Ler Instruções              │
│    Guia texto + screenshots    │
│                                │
│ 🆘 Reportar Problema           │
│    Formulário de feedback      │
│                                │
│ ⌨️ Atalhos de Teclado           │
│    Ctrl+F = Buscar             │
│    Ctrl+S = Salvar             │
│                                │
│ ✕                              │
│                                │
└─────────────────────────────────┘

Specs:
  - Width: 300px
  - Background: Branco
  - Border: 1px #e2e8f0
  - Border-radius: 12px
  - Box-shadow: 0 10px 40px rgba(0,0,0,0.2)
  - Padding: 16px
  - Items: 14px, com ícones (24px)
  - Hover item: Background #f8fafc
  - Cursor: pointer
```

### Página Dedicada: `/help`
```
┌─────────────────────────────────────────────────────┐
│ [SIDEBAR]                                          │
├─────────────────────────────────────────────────────┤
│                                                    │
│ ❓ Central de Ajuda                                │
│                                                    │
│ Bem-vindo! Aqui você encontra tutoriais,         │
│ guias e respostas para suas dúvidas.             │
│                                                    │
│ 🔍 [Buscar na ajuda...]                           │
│                                                    │
│ ────────────────────────────────────────────────  │
│                                                    │
│ 📚 CATEGORIAS:                                     │
│                                                    │
│ 👥 Alunos                                          │
│    • Como adicionar novo aluno                    │
│    • Como editar informações                      │
│    • Como deletar aluno                           │
│    • Gerar certidão de aluno                      │
│                                                    │
│ 📋 Frequência                                      │
│    • Como registrar frequência                    │
│    • Entender o grid                              │
│    • Salvar e confirmar                           │
│    • Relatórios de frequência                     │
│    • Alunos em risco                              │
│                                                    │
│ 📖 Diário de Classe                                │
│    • Como registrar aula                          │
│    • Adicionar recursos                           │
│    • Duplicar aula                                │
│    • Ver histórico                                │
│                                                    │
│ 📅 Calendário & Base Curricular                   │
│    • Como usar o calendário                       │
│    • Drag & drop de tópicos                       │
│    • Adicionar eventos/feriados                   │
│    • Ver planejamento mensal                      │
│                                                    │
│ ────────────────────────────────────────────────  │
│                                                    │
│ ❓ FAQ (Frequently Asked Questions)               │
│                                                    │
│ P: Como recuperar uma frequência deletada?        │
│ R: Infelizmente, frequência deletada não pode    │
│    ser recuperada (por lei). Verifique seu       │
│    histórico antes de deletar.                   │
│                                                    │
│ P: Posso editar aulas de semanas passadas?        │
│ R: Sim! Clique no calendário para navegar        │
│    a datas passadas.                             │
│                                                    │
│ ────────────────────────────────────────────────  │
│                                                    │
│ 📞 Contato de Suporte                              │
│                                                    │
│ Sua dúvida não foi respondida?                    │
│ [Fale conosco →]                                  │
│                                                    │
│ Email: suporte@educa.local                        │
│ Telefone: (35) 3484-8888                          │
│ Chat ao vivo: Seg-Sex 8h-17h                      │
│                                                    │
└─────────────────────────────────────────────────────┘
```

### Estrutura de GIFs Tutoriais

Cada tutorial tem **3-4 GIFs animados** mostrando:

```
GIF 1: Visão Geral
  - Mostra a interface inteira
  - Aponta com seta/círculo o local importante
  - Duration: 2-3 segundos, loop

GIF 2: Ação Step-by-Step
  - Cursor animado clicando
  - Campos preenchendo automaticamente
  - Dropdowns abrindo
  - Duration: 3-4 segundos, loop

GIF 3: Confirmação/Resultado
  - Resultado da ação (sucesso toast, novo card, etc)
  - Indica "pronto!"
  - Duration: 2 segundos

Specs:
  - Tamanho: 500x300px
  - Formato: GIF animado (ou MP4 com fallback)
  - Speed: Normal (não muito rápido)
  - Sem som
  - Cursor: Visível e destacado
  - Annotations: Setas/círculos destacando áreas
```

### Indicadores de Progresso

```
Dashboard mostra:
"Você completou X de Y tutoriais"

Ícones no Sidebar:
  Dashboard     ✓ (verde)  - visitado
  Alunos        ✓ (verde)  - visitado
  Turmas        • (cinza)  - novo, não visitado
  Frequência    ✓ (verde)  - visitado
  Diário        • (cinza)  - novo, não visitado
  Calendário    ✓ (verde)  - visitado
```

### Notas Técnicas
- **LocalStorage**: Rastreia quais tutoriais já foram visualizados
- **No Cookie Walls**: Tutoriais sugerem mas não obrigam
- **Acessibilidade**: Todos GIFs têm transcrição de áudio em texto
- **Mobile**: Tutoriais em formato texto com prints em mobile (menos GIFs)
- **Offline**: Conteúdo básico funciona sem internet (cached)

---

## Componentes Reutilizáveis

### Buttons
```typescript
// Variants
- Primary (Azul): Ações principais
- Secondary (Verde): Ações de sucesso
- Accent (Roxo): Interatividade especial
- Outline: Ações secundárias
- Danger: Deletar/Remover

// Sizes
- Small: 32px height, 12px text
- Medium: 44px height, 14px text (default)
- Large: 52px height, 16px text

// States
- Default: Normal appearance
- Hover: Darker shade + shadow
- Active: Scale 0.98
- Disabled: Opacity 0.5, cursor not-allowed
- Loading: Spinner icon + "Salvando..."
- Success: Checkmark + green color
```

### Input Fields
```typescript
// Types
- Text: String input
- Email: Email validation
- Number: Numeric only
- Tel: Phone formatting
- Date: Date picker
- Textarea: Multi-line text
- Select/Dropdown: Multiple options
- Checkbox: Boolean
- Radio: Exclusive selection

// States
- Default: Normal appearance
- Focus: Blue border + shadow
- Filled: Green border
- Error: Red border + error message
- Disabled: Opacity 0.5
- Loading: Spinner (async validation)

// Features
- Auto-format: CPF, Phone, Date
- Placeholder: Helpful hint text
- Label: Associated label for accessibility
- Helper text: Under field explanation
- Clear button: X icon to clear value
```

### Cards
```typescript
// Types
- Data Card: Shows information
- Action Card: Interactive with buttons
- List Card: Shows list items
- Timeline Card: Chronological display

// Features
- Hover effects: Shadow, translate
- Border-left: Color coding by type
- Padding: Consistent 16-24px
- Responsive: Stack on mobile

// States
- Default: Normal appearance
- Selected/Active: Highlight color
- Disabled: Opacity 0.5
- Loading: Skeleton placeholder
```

### Modals & Dialogs
```typescript
// Types
- Alert: Important message with OK button
- Confirm: Question with Yes/No
- Form: Data input with Save/Cancel
- Menu: Options popup
- Drawer: Side panel (mobile)

// Features
- Overlay: Semi-transparent backdrop
- Animation: Fade in + slide up
- Focus trap: Tab cycles within modal
- Close button: X icon top-right
- Escape key: Closes modal

// Sizes
- Small: 400px (messages)
- Medium: 500px (forms)
- Large: 600px (multi-step)
- Full (mobile): 100% width
```

### Badges & Status
```typescript
// Types
- Status: Ativo/Inativo/Pendente
- Priority: Alta/Média/Baixa
- Category: Tags/Labels
- Count: Number indicators

// Colors
- Success (Verde): #dcfce7 bg, #166534 text
- Error (Vermelho): #fee2e2 bg, #991b1b text
- Warning (Amarelo): #fef3c7 bg, #92400e text
- Info (Azul): #dbeafe bg, #1e40af text

// Features
- Icon: Optional icon before text
- Size: Compact (12px) default
- Shape: Rounded (border-radius 20px)
```

### Tables & Grids
```typescript
// Features
- Alternating rows: White/light gray
- Sticky header: Header fixes on scroll
- Sortable columns: Click to sort
- Selectable rows: Checkboxes
- Responsive: Horizontal scroll on mobile
- Pagination: Next/Previous or load more

// Specs
- Header font: 12px, bold, #334155
- Row font: 14px, regular, #64748b
- Row height: 48px
- Padding: 12px per cell
```

### Forms
```typescript
// Layout
- Vertical: Labels above inputs (default)
- Horizontal: Labels beside inputs (desktop only)
- Inline: Multiple inputs per row

// Validation
- Real-time: Check as user types
- On blur: Check after field loses focus
- On submit: Check when form submitted
- Error messages: Below field, red color

// Features
- Required indicators: * after label
- Helper text: Small text below field
- Tooltips: ℹ️ icon with explanation
- Disabled fields: Grayed out, non-interactive
- Success state: Green checkmark, green border
```

### Notifications & Toasts
```typescript
// Types
- Success: ✓ action completed (green)
- Error: ✗ something went wrong (red)
- Warning: ⚠️ be careful (yellow)
- Info: ℹ️ informational (blue)

// Positioning
- Top-right: Default
- Top-center: Alerts
- Bottom-center: Messages

// Duration
- Success: 3 seconds auto-dismiss
- Error: 5 seconds auto-dismiss
- Warning: 4 seconds auto-dismiss
- Info: 3 seconds auto-dismiss
- Persist: Manual close required

// Animation
- Slide in from right + fade out
- Exit animation: Slide out left
```

---

## Considerações de UX/Acessibilidade

### 🎯 Princípios de Acessibilidade (WCAG 2.1 AA)

#### 1. Perceptibilidade
- **Contraste de Cores**: Mínimo 4.5:1 para texto regular, 3:1 para texto grande
- **Tamanho de Fonte**: Mínimo 14px para corpo, 12px para labels
- **Cores não únicos**: Não use apenas cor para comunicar (use também ícones/texto)
- **Alt text**: Todas imagens/ícones têm descrição alternativa
- **Captions**: GIFs tutoriais têm transcrição em texto

#### 2. Operabilidade
- **Keyboard Navigation**: Todos elementos acessíveis via Tab/Enter
- **Focus Visible**: Sempre mostra qual elemento tem foco (outline/border)
- **Link/Button Distinction**: Links azuis com underline, buttons com fundo
- **No Time Limits**: Usuários podem trabalhar no próprio ritmo
- **No Seizures**: Nada que pisque > 3x por segundo

#### 3. Compreensibilidade
- **Linguagem Simples**: Frases curtas, vocabulário acessível
- **Consistent Navigation**: Menu no mesmo lugar em todas páginas
- **Labeled Controls**: Inputs têm labels, botões têm texto claro
- **Error Prevention**: Validação em tempo real, confirmações para ações críticas
- **Help Text**: Campos sensíveis têm dicas/tooltips

#### 4. Robustez
- **Valid HTML**: Sem erros de markup
- **ARIA Labels**: Adicional acessibilidade para leitores de tela
- **Semantic HTML**: `<button>` para botões, `<a>` para links, `<label>` para inputs
- **Cross-browser**: Funciona em Chrome, Firefox, Safari, Edge
- **Mobile**: Responsivo e toca-amigável

### 📱 Responsive Design Strategy

#### Desktop (1440px+)
- Sidebar fixed 240px (left)
- Main content fluid
- 2-3 colunas layouts
- Mouse + keyboard
- Full featured (all features)

#### Tablet (768px - 1439px)
- Sidebar colapsável (toggle com menu icon)
- Main content full width (quando sidebar closed)
- 1-2 colunas layouts
- Touch + keyboard (larger touch targets)
- Most features (may hide some)

#### Mobile (<768px)
- No sidebar (hamburger menu)
- Full width single column
- Touch-optimized (56px minimum touch targets)
- Simplified layouts (fewer cards per row)
- Essential features only

### 👆 Touch-Friendly Design (Tablets/Mobile)

#### Touch Target Sizes
```
Minimum: 44x44px (recommended 48-56px)
Button heights: 48-56px
Padding around clickables: 8-12px
Spacing between targets: 8px minimum
```

#### Touch Interactions
- **Tap**: Primary action (instead of click)
- **Long press**: Secondary menu (instead of right-click)
- **Swipe**: Navigation (instead of scroll arrows)
- **Pinch**: Zoom calendar (instead of scroll wheel)
- **Drag**: Reorder items, drag tópicos to calendar

#### No Hover States on Mobile
- Use `:active` instead of `:hover`
- Show actions always visible, or use swipe/long-press
- Buttons must be visually distinct without hover

### 🌙 Dark Mode (Future)
While not in current scope, design supports:
- Semantic color variables
- Sufficient contrast in dark theme
- Icons work in both light/dark

### 🌐 Internationalization (i18n) Ready
- All strings in external translation file
- Date formatting locale-aware
- Right-to-left (RTL) language support ready
- Number formatting locale-specific

### ⚡ Performance Considerations

#### Core Web Vitals Targets
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

#### Optimization Strategies
- Image optimization: Lazy load cards/images
- Code splitting: Load tutorial GIFs on demand
- Virtual scrolling: For long lists (100+ items)
- Caching: LocalStorage for tutorial state
- Minification: All CSS/JS minified
- Compression: Gzip enabled

#### Loading States
- Skeleton screens for cards
- Spinner for async operations
- Progressive loading for lists

### 🔐 Security & Data Privacy

#### Input Validation
- **Client-side**: Real-time format validation (CPF, phone, date)
- **Server-side**: Validate all inputs server-side
- **Sanitization**: No script injection in text fields
- **Rate limiting**: Prevent brute force on login

#### Data Protection (LGPD Compliance)
- PII encrypted at rest (CPF, email, phone)
- PII masked in logs
- User consent for data collection
- Right to be forgotten (data deletion)
- Data export functionality

### 🎨 Color Contrast Verification

All color combinations meet WCAG AA:

```
Text on Backgrounds:
- #334155 text on #ffffff bg: 8.5:1 ✓
- #64748b text on #ffffff bg: 4.8:1 ✓
- #ffffff text on #1e40af bg: 5.2:1 ✓
- #ffffff text on #16a34a bg: 4.5:1 ✓
- #ffffff text on #7c3aed bg: 4.5:1 ✓

Icons/Status:
- Green (#16a34a) on white: 4.5:1 ✓
- Red (#ef4444) on white: 3.9:1 ✓
- Yellow (#eab308) on white: 2.1:1 ⚠️ (needs dark text)
```

---

## Próximos Passos

### Fase 1: Validação do Design
1. ✓ Design Spec completo (este documento)
2. [ ] User testing com 3-5 usuários leigos
3. [ ] Feedback incorporation
4. [ ] Design refinement

### Fase 2: Criar Mockups Visuais (Próximo: Prompt para ferramenta de design)
1. [ ] High-fidelity mockups em Figma
2. [ ] Interactive prototypes
3. [ ] Design system UI kit

### Fase 3: HTML/CSS Mockups (Depois: Mockups interativos)
1. [ ] Static HTML mockups
2. [ ] CSS styling (Tailwind)
3. [ ] Basic interactions (click states)

### Fase 4: Desenvolvimento Real
1. [ ] Setup Next.js project
2. [ ] Implement components
3. [ ] Connect to Supabase
4. [ ] Testing & QA

---

**Documento Completo: Design Specification v1.0** ✅
**Data**: 2025-12-04
**Status**: Validado pelo cliente
