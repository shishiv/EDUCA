# Prompt Estruturado: Criar Mockups Visuais do Sistema EDUCA

**Versão**: 1.0
**Data**: 2025-12-04
**Público**: Designer/Ferramenta de Design (Figma, Adobe XD, etc)
**Objetivo**: Gerar mockups mid-fidelity baseado em especificação detalhada

---

## 📋 Índice

1. [Instruções Iniciais](#instruções-iniciais)
2. [Design System](#design-system)
3. [Páginas a Criar](#páginas-a-criar)
4. [Fluxo de Criação](#fluxo-de-criação)
5. [Checklist de Qualidade](#checklist-de-qualidade)

---

## Instruções Iniciais

### Setup do Projeto

```
Nome do arquivo: EDUCA-Mockups-v1.0
Formato: Figma (ou equivalente)
Dimensões padrão: 1440px wide (desktop)
Grid: 8px
```

### Estrutura de Pastas/Pages

```
📁 EDUCA Mockups
├── 🎨 Design System
│   ├── Colors
│   ├── Typography
│   ├── Components
│   ├── Icons
│   └── Spacing
├── 📱 Responsive Breakpoints
│   ├── Desktop (1440px)
│   ├── Tablet (768px)
│   └── Mobile (375px)
└── 📄 Pages
    ├── 1. Landing Page
    ├── 2. Login
    ├── 3. Onboarding (4 steps)
    ├── 4. Dashboard
    ├── 5. Alunos
    ├── 6. Turmas
    ├── 7. Frequência
    ├── 8. Diário de Classe
    ├── 9. Calendário
    └── 10. Help Center
```

---

## Design System

### Colors Palette

Create a shared colors library in your tool:

#### Primary Colors
```
🔵 Azul Primário
  Hex: #1e40af
  RGB: 30, 64, 175
  HSL: 218°, 71%, 40%
  Usage: Buttons, headers, trust, corporate
  Variants:
    - Dark: #1e3a8a (hover)
    - Light: #dbeafe (background)
    - Lighter: #eff6ff (light background)

🟢 Verde Secundário
  Hex: #16a34a
  RGB: 22, 163, 74
  HSL: 142°, 76%, 36%
  Usage: Success, CTA, growth, education
  Variants:
    - Dark: #15803d (hover)
    - Light: #dcfce7 (background)
    - Lighter: #f0fdf4 (light background)

🟣 Roxo Accent
  Hex: #7c3aed
  RGB: 124, 58, 237
  HSL: 259°, 90%, 58%
  Usage: Interactive, modern, special actions
  Variants:
    - Dark: #6d28d9 (hover)
    - Light: #ede9fe (background)
    - Lighter: #f5f3ff (light background)
```

#### Neutral Colors
```
⚪ Branco
  Hex: #ffffff
  RGB: 255, 255, 255
  Usage: Cards, backgrounds, contrast

🩶 Cinza Claro
  Hex: #f8fafc
  RGB: 248, 250, 252
  Usage: Page backgrounds, section separation

🩶 Cinza Médio
  Hex: #64748b
  RGB: 100, 116, 139
  Usage: Secondary text, placeholders

🩶 Cinza Escuro
  Hex: #334155
  RGB: 51, 65, 85
  Usage: Primary text, headers
```

#### Status Colors
```
✅ Success (Verde)
  Hex: #22c55e
  RGB: 34, 197, 94
  Background: #dcfce7
  Text: #166534

❌ Error (Vermelho)
  Hex: #ef4444
  RGB: 239, 68, 68
  Background: #fee2e2
  Text: #991b1b

⚠️ Warning (Amarelo)
  Hex: #eab308
  RGB: 234, 179, 8
  Background: #fef3c7
  Text: #92400e

ℹ️ Info (Azul Claro)
  Hex: #3b82f6
  RGB: 59, 130, 246
  Background: #dbeafe
  Text: #1e40af
```

### Typography System

Create text styles with the following specs:

#### Heading Styles
```
H1 - Page Title
  Font: Inter, Poppins (sans-serif)
  Size: 32px
  Weight: 600 (bold)
  Line-height: 1.3
  Letter-spacing: -0.5px
  Color: #334155

H2 - Section Title
  Font: Inter, Poppins
  Size: 24px
  Weight: 600 (bold)
  Line-height: 1.4
  Letter-spacing: -0.3px
  Color: #334155

H3 - Subsection
  Font: Inter, Poppins
  Size: 18px
  Weight: 600 (bold)
  Line-height: 1.4
  Letter-spacing: -0.2px
  Color: #334155
```

#### Body Styles
```
Body Regular
  Font: Inter, Poppins
  Size: 16px
  Weight: 400 (regular)
  Line-height: 1.6
  Color: #64748b

Body Small
  Font: Inter, Poppins
  Size: 14px
  Weight: 400 (regular)
  Line-height: 1.5
  Color: #64748b

Caption
  Font: Inter, Poppins
  Size: 12px
  Weight: 400 (regular)
  Line-height: 1.4
  Color: #94a3b8

Label
  Font: Inter, Poppins
  Size: 14px
  Weight: 500 (medium)
  Line-height: 1.5
  Color: #334155
```

### Component Library

Create reusable components:

#### Buttons

**Primary Button (Azul)**
```
Canvas size: 300x48
States: default, hover, active, disabled, loading
Default:
  Background: #1e40af
  Text: #ffffff, 14px, semibold
  Padding: 12px 24px
  Border-radius: 8px
  Border: none

Hover:
  Background: #1e3a8a
  Shadow: 0 4px 12px rgba(30, 64, 175, 0.3)

Active:
  Scale: 0.98

Disabled:
  Opacity: 50%
  Cursor: not-allowed

Loading:
  Add spinner icon (16px)
  Text changes to "Salvando..."
```

**Secondary Button (Verde)**
```
Same specs as Primary, but:
  Background: #16a34a
  Hover background: #15803d
```

**Accent Button (Roxo)**
```
Same specs as Primary, but:
  Background: #7c3aed
  Hover background: #6d28d9
```

**Outline Button (Cinza)**
```
Canvas size: 300x48
Default:
  Background: transparent
  Border: 2px #64748b
  Text: #334155, 14px, semibold

Hover:
  Background: #f8fafc
```

#### Input Field
```
Canvas size: 400x48
States: default, focus, filled, error, disabled

Default:
  Background: #ffffff
  Border: 1px #cbd5e1
  Border-radius: 8px
  Padding: 12px 16px
  Text: 14px, #334155
  Placeholder: 14px, #94a3b8, italic

Focus:
  Border: 2px #1e40af
  Box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1)

Error:
  Border: 2px #ef4444
  Background: #fef2f2
  Error text: 12px, #ef4444 below field

Disabled:
  Background: #f1f5f9
  Border: 1px #cbd5e1
  Opacity: 50%
```

#### Card
```
Canvas size: 400x200
Default:
  Background: #ffffff
  Border: none
  Border-radius: 12px
  Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
  Padding: 20px

Hover:
  Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
  Transform: translateY(-2px)

Interactive Card (selectable):
  Add left border: 4px, color varies by context
  On hover: border color → roxo (#7c3aed)
```

#### Modal/Dialog
```
Canvas size: 500x600 (variable height)
Overlay:
  Background: rgba(0, 0, 0, 0.5)
  Full screen

Modal Box:
  Background: #ffffff
  Border-radius: 16px
  Box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2)
  Padding: 32px
  Position: Centered

Close Button (X):
  Position: Top-right
  Size: 32x32
  Color: #64748b
  Hover color: #334155
```

#### Badge
```
Canvas size: auto (min 80x24)
Padding: 6px 12px
Border-radius: 20px
Font: 12px, semibold

Success (Verde):
  Background: #dcfce7
  Text: #166534

Error (Vermelho):
  Background: #fee2e2
  Text: #991b1b

Warning (Amarelo):
  Background: #fef3c7
  Text: #92400e
```

#### Sidebar Item
```
Canvas size: 240x44
Default:
  Padding: 8px 12px
  Border-radius: 8px
  Icon: 24px, #64748b
  Text: 14px, #334155

Hover:
  Background: #f1f5f9
  Cursor: pointer

Active:
  Background: #dbeafe
  Icon color: #1e40af
  Text: bold, #1e40af
```

### Icons Library

Create icon set (24px as default):

```
Navigation Icons:
  📊 Dashboard
  👥 Alunos
  📚 Turmas
  📋 Frequência
  📖 Diário
  📅 Calendário
  ⚙️ Configurações
  ❓ Help
  🚪 Sair

Action Icons:
  ➕ Adicionar
  ✏️ Editar
  🗑️ Deletar
  👁️ Visualizar
  💾 Salvar
  📄 Relatório
  📊 Gráfico
  🔍 Buscar

Status Icons:
  ✓ Presente/Sucesso
  ✗ Ausente/Erro
  ~ Atraso/Aviso
  ⚠️ Alerta
  ℹ️ Informação
  🎉 Feriado
  📌 Evento

User Icons:
  👤 Usuário/Perfil
  👥 Grupo/Múltiplos
  👨‍🏫 Professor
  🎓 Estudante
  👨‍💼 Gestor

Common Icons:
  🔔 Notificação
  ⭐ Favorito/Importante
  🔗 Link
  📱 Mobile
  💬 Chat/Mensagem
```

**Specs por ícone:**
- Format: SVG ou PNG @2x resolution
- Size default: 24px
- Color: Adaptável (deve funcionar em diferentes backgrounds)
- Style: Flat design, friendly appearance
- Padding ao redor: 4px (touch-friendly)

---

## Páginas a Criar

### PAGE 1: Landing Page

**Viewport**: 1440px wide, responsive to 375px

#### Sections

**1. Header/Navigation**
```
Height: 80px
Background: #1e40af (gradient to #3b82f6)
Padding: 20px 40px
Layout: Flex, space-between

Left side:
  Logo: 📚 icon (32px) + "EDUCA" text (white, 18px bold)

Center:
  Navigation links: Notícias | Eventos | Escolas | Contato
  Color: white
  Font: 14px regular
  Hover: underline

Right side:
  Button: "ENTRAR" (green, 44px height, 24px bold)
  Padding: 12px 24px
```

**2. Hero Section**
```
Height: 500px
Background:
  Gradient: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)
  Illustration: Professor with students (right side, 50% width)
Padding: 60px 40px
Layout: Flex, center vertically

Left content (50%):
  H1: "Bem-vindo ao EDUCA! 🎓"
  Color: #334155
  Size: 40px, bold

  Paragraph:
  Text: "A plataforma que torna gestão educacional simples e intuitiva..."
  Font: 18px, #64748b
  Margin-top: 20px

  Buttons (row):
    - Button 1: "Saiba Mais" (outline, white bg)
    - Button 2: "Entrar Agora" (green, 52px height)
    - Spacing: 16px between
    - Margin-top: 32px

Right side (50%):
  Illustration: Friendly teacher with students
  Style: Modern, colorful, no harsh shadows
  Size: ~500x400px
```

**3. News & Events Section**
```
Height: auto
Background: #ffffff
Padding: 60px 40px
Margin: 0 auto
Max-width: 1400px

Title:
  H2: "NOTÍCIAS E EVENTOS DA EDUCAÇÃO LOCAL"
  Font: 28px, bold, #334155
  Margin-bottom: 40px

Cards Grid:
  Layout: 3 columns (desktop)
  Responsive: 2 columns (tablet), 1 column (mobile)
  Gap: 24px

  Each card (300x350):
    - Thumbnail: 300x200px, object-fit cover
    - Padding: 20px
    - Title: 18px, bold, #334155
    - Description: 14px, #64748b (2-3 lines)
    - Date: 12px, #94a3b8
    - Link: "Leia mais →" (blue, 12px)
    - Hover: shadow increase, translateY(-4px)

Pagination:
  "Ver Todos →" link (center, 14px, blue)
  Margin-top: 32px
```

**4. Participating Schools Section**
```
Height: auto
Background: #f8fafc
Padding: 60px 40px
Margin: 0 auto
Max-width: 1400px

Title:
  H2: "ESCOLAS PARTICIPANTES"
  Font: 28px, bold, #334155
  Margin-bottom: 40px

Cards Grid:
  Layout: 4 columns (desktop)
  Responsive: 2 columns (tablet), 1 column (mobile)
  Gap: 20px

  Each card (200x200):
    - Icon: School emoji (64px)
    - Title: School name (14px, bold)
    - Address: "📍 Endereço..." (12px, #64748b)
    - Stats: "👥 245 alunos" (12px)
    - Hover: shadow, scale 1.05
```

**5. Footer**
```
Height: auto
Background: #334155
Color: #ffffff
Padding: 40px

Layout: 3 columns (desktop) or single (mobile)

Column 1:
  Links: SOBRE | CONTATO | PRIVACIDADE | TERMOS
  Font: 14px, white
  Hover: color #16a34a

Column 2 (center):
  Text: "Prefeitura Municipal de Fronteira - Secretaria de Educação"
  Font: 12px, #cbd5e1

Column 3 (right):
  Email: 📧 suporte@educa.local
  Phone: ☎️ (35) 3484-8888
  Font: 12px, #cbd5e1
```

---

### PAGE 2: Login

**Viewport**: 1440px wide

#### Layout: 2 columns (50/50)

**Left Column (50%)**
```
Background: Gradient
  linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)
Illustration:
  Teacher with students learning
  Size: 100% of column
  Style: Friendly, modern, colors aligned with theme
```

**Right Column (50%)**
```
Background: #ffffff
Padding: 60px
Layout: Flex, center items, column

Title (centered):
  H2: "EDUCA - Entrar na Conta"
  Font: 24px, bold, #334155
  Margin-bottom: 40px

Form:
  Width: 100% (max 400px)

  Field 1: Email/CPF
    Label: "Email ou CPF:" (14px, semibold, #334155)
    Input:
      Placeholder: "usuario@mail.com ou 123.456.789-00"
      Height: 48px
      Width: 100%
      (Use input component specs)
    Margin-bottom: 20px

  Field 2: Password
    Label: "Senha:" (14px, semibold, #334155)
    Input:
      Placeholder: "••••••••"
      Height: 48px
      Width: 100%
      Eye toggle icon (show/hide)
    Margin-bottom: 8px

  Checkbox:
    "☐ Lembrar-me"
    Font: 14px, #334155
    Color when checked: #1e40af
    Margin-bottom: 24px

  Button:
    Text: "ENTRAR"
    Width: 100%
    Height: 48px
    Background: #16a34a (green)
    Font: 16px, bold, white
    Border-radius: 8px
    Hover: #15803d
    Margin-bottom: 16px

  Links:
    "Esqueceu a senha?" (14px, blue, #1e40af)
    "Primeira vez? Entre em contato com o administrador" (14px, #64748b)
    Centered below button
```

---

### PAGE 3: Onboarding (4-Step Wizard)

**Viewport**: 1440px wide

#### Modal Structure (Centered, 500px width)

**Step 1: Welcome Modal**
```
Modal (500x400px):
  Padding: 32px
  Text-align: center

  Icon: 🎉 (64px, happy expression)

  Heading:
    "Bem-vindo ao EDUCA!"
    Font: 28px, bold, #334155

  Subheading:
    "Antes de começar, precisamos de algumas informações..."
    Font: 16px, #64748b
    Margin-top: 16px

  Description:
    "Isso levará apenas 2 minutos!"
    Font: 14px, #94a3b8
    Margin-top: 8px

  Button:
    Text: "Começar"
    Width: 280px
    Height: 48px
    Background: #16a34a (green)
    Margin-top: 32px
```

**Step 2: Personal Information**
```
Modal (500x600px):
  Padding: 32px

  Progress Bar (top):
    Width: 100%
    Height: 4px
    Background: #e2e8f0
    Filled: 25% #1e40af (blue)
    Margin-bottom: 24px

  Header:
    Icon: 👤 (24px)
    Title: "Informações Pessoais"
    Font: 18px, bold, #334155
    Margin-bottom: 24px

  Form fields (100% width, stacked):

    Field: Nome Completo
      Label: "Nome Completo*"
      Input: 48px height
      Placeholder: "João da Silva"
      Margin-bottom: 20px

    Field: CPF
      Label: "CPF*"
      Input: 48px height
      Placeholder: "123.456.789-00"
      Format: Auto-format to XXX.XXX.XXX-XX
      Margin-bottom: 20px

    Field: Data de Nascimento
      Label: "Data de Nascimento*"
      Input: 48px height, date picker
      Placeholder: "DD/MM/YYYY"
      Margin-bottom: 20px

    Help text:
      "Por que pedimos isso? ℹ️"
      Font: 12px, #64748b
      Italic

  Buttons (bottom):
    Layout: Flex, space-between
    Button 1: "Voltar" (outline, 44px)
    Button 2: "Próximo" (blue, 44px)
    Width each: calc(50% - 6px)
```

**Step 3: Contact Information**
```
Modal (500x650px):
  Same layout as Step 2, but:
  Progress: 50% filled
  Icon: ✉️
  Title: "Informações de Contato"

  Fields:
    - Email*: Input 48px
    - Telefone: Input 48px (auto-format: (XX) 9XXXX-XXXX)
    - Endereço: Textarea 64px
    - Cidade: Input 48px

  Similar button layout
```

**Step 4: School Role**
```
Modal (500x700px):
  Progress: 75% filled
  Icon: 🎓
  Title: "Seu Papel na Escola"

  Section 1:
    Question: "Qual é seu papel?*"
    Radio buttons (vertical):
      ○ Professor(a)
      ○ Gestor/Diretor(a)
      ○ Secretário(a)
      ○ Outro
    Each button: 44px height, 14px text
    Active radio: Blue color

  Section 2:
    Question: "Turmas Associadas*"
    Text: "[Selecione uma ou mais...]"
    Checkboxes (grid 2 columns):
      ☐ 5º A (Matemática)
      ☐ 5º B (Português)
      ☐ 6º A (Matemática)
      ☐ 6º B (Português)
    Active checkbox: Green color

  Similar button layout
```

**Step 5: Summary & Confirmation**
```
Modal (500x700px):
  Progress: 100% filled (green bar)
  Icon: ✅
  Title: "Resumo & Confirmação"

  Text: "Verifique seus dados abaixo:"
  Font: 14px, #64748b
  Margin-bottom: 24px

  Summary cards (stacked):

    Card 1: Personal Info
      Layout: Light background (#f8fafc)
      Padding: 16px
      Border-radius: 8px

      👤 João Silva Costa
      CPF: 123.456.789-00
      Nasc: 15/05/1990

    Card 2: Contact
      ✉️ joao.silva@email.com
      Tel: (35) 99999-9999

    Card 3: Role
      🎓 Professor(a)
      Turmas: 5º A, 5º B

  Link: "Precisa corrigir algo? ← Voltar aos Passos"
    Font: 12px, blue
    Margin: 24px 0

  Button: "Finalizar & Entrar"
    Width: 100%
    Height: 48px
    Background: #16a34a (green)
    Margin-top: 24px

  Loading state:
    After click, show:
    [spinner] "Salvando seu perfil..."
    Button disabled
    Duration: ~2 seconds
```

---

### PAGE 4: Dashboard

**Viewport**: 1440px wide

#### Layout: Sidebar (240px) + Main (1200px)

**Header (Sticky, 64px)**
```
Background: #1e40af
Padding: 12px 24px
Layout: Flex, space-between

Left:
  Logo: 📚 EDUCA (white, 18px bold)

Center:
  Breadcrumb (white, 14px): "Dashboard > Gestão"

Right:
  Layout: Flex, gap 16px

  Item 1: Notifications
    Icon: 🔔 (24px, white)
    Badge: Red circle with white number (if > 0)
    Hover: Background #1e3a8a

  Item 2: User Profile
    Avatar: 40px circle with initials
    Name: "João Silva" (12px, white)
    Below avatar
    Hover: Dropdown menu
```

**Sidebar (240px, sticky, left)**
```
Background: #ffffff
Border-right: 1px #e2e8f0
Padding: 20px 12px
Overflow-y: auto
Height: 100vh

Menu items (8):
  Height each: 44px
  Padding: 8px 12px
  Border-radius: 8px
  Gap: 4px

  Default state:
    Background: transparent
    Icon: 24px, #64748b
    Text: 14px, #334155
    Hover: Background #f1f5f9

  Active state (Dashboard):
    Background: #dbeafe (light blue)
    Icon: 24px, #1e40af (blue)
    Text: 14px, bold, #1e40af

  Items:
    1. 📊 Dashboard (active)
    2. 👥 Alunos
    3. 📚 Turmas
    4. 📋 Frequência
    5. 📖 Diário de Classe
    6. 📅 Calendário
    7. ❓ Help
    8. ⚙️ Configurações

Footer (bottom, fixed):
  Divider: 1px #e2e8f0
  Padding-top: 20px

  User profile section:
    Avatar: 48px circle
    Name: "João Silva" (14px bold)
    Role: "Professor" (12px, #64748b)
    School: "Escola Municipal X" (12px, #94a3b8)

  Logout button:
    Text: "🚪 Sair"
    Width: 100%
    Height: 40px
    Background: transparent
    Border: 1px #cbd5e1
    Hover: Background #f8fafc
```

**Main Content Area**

*Top section:*
```
Padding: 40px
Background: #f8fafc

Welcome header:
  Layout: Flex, space-between

  Left:
    Greeting:
      "Bem-vindo(a), João! 👋"
      Font: H1 (32px, bold, #334155)

  Right:
    Date/time:
      "Quarta-feira, 4 de dezembro de 2024 | 14:35"
      Font: 14px, #64748b
      Updates every minute
```

*Info Cards Section:*
```
Padding: 40px
Background: #ffffff (or continue #f8fafc)
Margin-bottom: 40px

Grid: 3 columns (desktop)
Responsive: 2 columns (tablet), 1 column (mobile)
Gap: 24px

Each card (400x200):

  Card 1: Students
    Layout: Flex
    Icon (left): 👥 (48px, #16a34a)
    Content (right):
      Number: "245" (32px, bold, #16a34a)
      Label: "Alunos Cadastrados" (14px, semibold, #334155)
      Subtitle: "5 novos esta semana" (12px, #64748b)
      Link: "Ver lista →" (12px, blue, underline on hover)

  Card 2: Frequency
    Icon: 📋 (48px, #16a34a)
    Number: "92%" (32px, bold, #16a34a)
    Label: "Frequência Média (Semana)"
    Subtitle: "7 alunos em risco"
    Link: "Ver detalhes →"

  Card 3: Classes
    Icon: 📖 (48px, #7c3aed)
    Number: "15" (32px, bold, #7c3aed)
    Label: "Aulas Registradas (Mês)"
    Subtitle: "4 turmas ativas"
    Link: "Ver diário →"

  Card styling:
    Background: #ffffff
    Border-radius: 12px
    Padding: 24px
    Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
    Hover: shadow larger, translateY(-2px)
```

*Frequency Chart Section:*
```
Padding: 40px
Background: white card

Title:
  "Frequência por Turma (Semana)"
  Font: 18px bold, #334155
  Margin-bottom: 24px

Bar chart (horizontal):
  Data:
    5º A: 94% (23/25 alunos)
    5º B: 88% (20/23 alunos)
    6º A: 91% (21/24 alunos)
    6º B: 85% (18/22 alunos)

  Bar specs:
    Height: 24px per bar
    Gap: 16px
    Color: #16a34a (green)
    Background: #e2e8f0 (light gray)
    Width: 200px max

  Label format:
    "5º A ▓▓▓▓▓▓▓▓▓░░░ 94%  (23/25 alunos)"
    Font: 14px
    Text color: #334155

Link (bottom):
  "📊 Ver Relatório Detalhado →"
  Font: 12px, blue
  Margin-top: 16px
```

*Quick Actions Section:*
```
Padding: 40px
Background: #f8fafc

Title:
  "ATALHOS RÁPIDOS"
  Font: 16px bold, #334155
  Margin-bottom: 24px

Grid: 3 columns (desktop)
Responsive: 2 columns (tablet), 1 column (mobile)
Gap: 16px

Each button: 56px height, full-width

Buttons:
  1. "+ Nova Turma" (green background)
  2. "+ Novo Aluno" (green background)
  3. "Registrar Frequência" (blue background)
  4. "Novo Diário" (blue background)
  5. "Calendário" (blue background)
  6. "Ver Relatórios" (purple background)

Button specs:
  Font: 14px semibold, white
  Icon inline (24px) + text
  Hover: shadow, scale 1.02
  Border-radius: 8px
```

---

### PAGE 5: Students (Alunos)

**Viewport**: 1440px wide

#### Layout: Sidebar (240px) + Main (1200px)

**Top Section: Filters & Actions**
```
Padding: 24px 40px
Background: #f8fafc
Border-bottom: 1px #e2e8f0
Layout: Flex, space-between

Left (Filters):
  Search field (300px):
    Icon: 🔍
    Placeholder: "Procurar aluno por nome/CPF..."
    Clear button (✕) when text present
    Height: 44px
    Margin-right: 16px

  Dropdowns (150px each, gap 12px):
    1. Turma: [Todas ▼]
    2. Status: [Todos ▼]
    3. Ordenação: [Mais recentes ▼]

  Link:
    "Limpar Filtros"
    Font: 12px, blue
    Only visible if filters active
    Margin-left: 16px

Right:
  Button: "+ NOVO ALUNO"
    Width: 200px
    Height: 44px
    Background: #16a34a
    Font: 14px bold, white
    Icon: 📝 inline
    Hover: #15803d
```

**Main Content: 2-Column Layout (60% | 40%)**

*Left Column (60%): Student Cards*
```
Padding: 24px
Background: #ffffff

Grid: 2 columns
Gap: 16px
Responsive: 1 column (tablet/mobile)
Overflow-y: auto

Each card (280x160px):

  Default state:
    Background: #ffffff
    Border-radius: 12px
    Border-left: 4px #16a34a (green)
    Padding: 16px
    Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
    Margin-bottom: 12px

  Content:

    Header (flex):
      Avatar: 40px circle
      Name: "João Silva Costa" (16px bold, #334155)

    Info row:
      Turma: "📚 5º A" (12px, #64748b)
      Status: "✓ Ativo" (badge, green, 12px)

    CPF: "123.456.789-00" (12px, #94a3b8)

  Hover state:
    Shadow: larger
    TranslateY: -2px
    Border-left color: #7c3aed (roxo)
    Actions appear:
      [Editar] [Perfil] [Deletar]
      3 buttons, 32px, positioned right
      Colors: blue, blue, red
      Opacity: 0 (default) → 1 (hover)

  Active state (selected):
    Background: #dbeafe (light blue)
    Border-left: 4px #1e40af (blue)
```

*Right Column (40%): Details Panel*
```
Padding: 24px
Background: #ffffff
Border-left: 1px #e2e8f0
Overflow-y: auto

Empty state (no selection):
  Text-align: center
  Padding: 60px 24px

  Icon: ℹ️ (48px, #cbd5e1)
  Text: "Nenhum aluno selecionado"
  Font: 16px, #64748b
  Margin-top: 16px

  Helper:
    "Clique em um card à esquerda para visualizar detalhes"
    Font: 14px, #94a3b8

Selected state:

  Header:
    Name: "JOÃO SILVA COSTA" (24px bold, #334155)
    Margin-bottom: 24px

  Sections (stacked):

    Section 1: Personal Info
      Icon: 📍
      Title: "Informações Pessoais" (14px bold)
      Content:
        CPF: 123.456.789-00 (14px, #64748b)
        Data Nasc: 15/05/2010
        Gênero: Masculino

    Section 2: School Info
      Icon: 📚
      Title: "Escolar"
      Content:
        Turma: 5º A
        Ano letivo: 2024
        Data matrícula: 15/02/2024

    Section 3: Guardians
      Icon: 👨‍👩‍👦
      Title: "Responsáveis"
      Content:
        1. Maria Silva (Mãe)
        2. José Silva (Pai)

    Section 4: Frequency
      Icon: 📊
      Title: "Frequência"
      Content:
        Semana: 94%
        Mês: 91%
        Link: "[Abrir histórico →]"

  Section styling:
    Padding-bottom: 20px
    Border-bottom: 1px #e2e8f0

    Title: 14px semibold, #334155
    Label: 12px bold
    Value: 14px regular, #64748b
    Link: 12px, blue

  Buttons (bottom, full-width):
    1. "Editar Aluno" (blue, 44px)
    2. "Gerar Relatório" (outline, 44px)
    3. "Gerar Certidão" (outline, 44px)
    Gap: 8px
    Margin-top: 24px
```

---

### PAGE 6: Classes (Turmas)

**Similar layout to Students page, with these differences:**

*Cards (Left column):*
```
Each card (280x180px):

  Main display (big):
    Série: "5º A" (32px bold, colored by series)
    Color coding by series:
      5º = Blue (#3b82f6)
      6º = Green (#16a34a)
      7º = Purple (#7c3aed)
      8º = Amber (#f59e0b)
      9º = Red (#ef4444)

  Info:
    Professor: "Prof. Maria Silva" (14px)
    Alunos: "24 alunos" (12px)
    Frequency: "94% frequência" (12px, #64748b)

  Border-top (4px, colored by series)
  Padding: 24px
  Border-radius: 12px
```

*Details Panel (Right column):*
```
Header:
  "5º A - Turma de Matemática" (24px bold)
  Color: series color

Sections:

  Teacher:
    Icon: 👤
    Name: "Maria Silva da Costa"
    Email: "maria.silva@escola.local"
    Phone: "(35) 99999-9999"

  Students (24):
    List of first 5:
      1. João Silva
      2. Maria Santos
      3. Pedro Costa
      ...
    Link: "[Ver lista completa →]"

  Statistics:
    Frequency: 94%
    Classes recorded: 15
    Links: [Últimas aulas →]

  Buttons:
    1. "Editar Turma"
    2. "Gerar Relatório"
```

---

### PAGE 7: Frequency (Frequência) ⭐ CRITICAL

**Viewport**: 1440px wide

#### Layout: Sidebar (240px) + Main (1200px)

**Top Section: Controls**
```
Padding: 24px 40px
Background: #f8fafc
Border-bottom: 1px #e2e8f0
Layout: Flex, gap 24px

Left column:

  Turma dropdown (200px):
    "[5º A ▼]"
    Height: 44px

  Data navigation:
    Display: "4 dez 2024"
    Buttons: [<] [>] (32px each)
    Click opens date picker

  Period buttons (gap 8px):
    "[Semana] [Mês] [Personalizado]"
    Toggle button style
    Active: blue, inactive: gray
    Height: 44px each

Right column:

  Frequency summary box:
    Background: white card
    Padding: 16px
    Border-radius: 8px

    Title: "Frequência da Semana: 92%"
    Font: 14px bold

    Stats:
      Presentes: 110
      Ausentes: 7
      Atrasos: 3
      Total: 120 (23 alunos)

    Link: "[📊 Ver Relatório]"

  Risk alert box:
    Background: #fef2f2 (light red)
    Padding: 16px
    Border-radius: 8px
    Border-left: 4px #ef4444 (red)

    Title: "⚠️ Alunos em Risco"
    Font: 14px bold, #991b1b

    List (max 3):
      1. João Silva - 87%
         Badge: "⚠️ 3 faltas"
      2. Maria Santos - 79%
         Badge: "🚨 6 faltas"

    Link: "[Ver Histórico Completo]"
```

**Main Content: Frequency Grid**

*Frequency table/grid:*
```
Layout: Horizontal scroll (on mobile)
Background: white

Fixed column (left, sticky):
  Width: 150px
  Background: #f8fafc
  Border-right: 2px #e2e8f0

  Header: (empty)
  Rows: Each student name (14px, #334155)
  Padding: 12px
  Height per row: 48px

Scrollable columns (days):
  Each column: 80px width

  Header:
    Day name: "seg, ter, qua..."
    Font: 12px bold
    Day number: "2, 3, 4..."
    Font: 14px bold
    Color: #334155
    Padding: 8px 0

  Cells:
    Height: 48px
    Width: 80px
    Text-align: center
    Border: 1px #e2e8f0
    Clickable

    States:
      Empty (not marked):
        Background: #ffffff
        Border: 1px #e2e8f0

      Present (✓):
        Background: #dcfce7 (green)
        Text: "✓" (#166534 green)
        Font: 20px bold

      Absent (✗):
        Background: #fee2e2 (red)
        Text: "✗" (#991b1b red)
        Font: 20px bold

      Tardy (~):
        Background: #fef3c7 (yellow)
        Text: "~" (#92400e yellow)
        Font: 20px bold

    Hover:
      Border: 2px (color of current state)
      Box-shadow: 0 2px 8px rgba(0,0,0,0.1)
      Cursor: pointer
      Tooltip: "Clique para marcar"

    Click action:
      Opens mini menu (150px wide):
        ┌─────────────────┐
        │ ✓ Presente      │ (green bg)
        │ ✗ Ausente       │ (red bg)
        │ ~ Atraso        │ (yellow bg)
        │ ─────────────── │
        │ Limpar          │ (gray)
        └─────────────────┘

      Menu positioning: Above cell
      Animation: Fade in 0.15s
      Click outside: Close without change

Summary row (bottom):
  Background: #f1f5f9
  Border-top: 2px #e2e8f0
  Font: 14px semibold

  Format:
    "Total Semana: ✓ 110 | ✗ 7 | ~ 3"
    Colors: Green/Red/Yellow for icons
    Taxa: "92%"

Legend (fixed bottom):
  Background: white
  Padding: 12px 24px
  Border-top: 1px #e2e8f0
  Font: 12px
  Text: "✓ Presente | ✗ Ausente | ~ Atraso"
```

**Save Button (Floating)**
```
Position: Fixed, bottom center
Background: #16a34a (green)
Width: 300px
Height: 52px
Font: 16px bold, white
Text: "💾 SALVAR FREQUÊNCIA"
Border-radius: 12px
Box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3)
Margin-bottom: 24px
Hover: #15803d, shadow larger

States:
  Default: Normal

  Hover: Scale 1.02, shadow larger

  Loading:
    Icon: Spinner (4px, roxo)
    Text: "Salvando..."
    Disabled: true
    Duration: ~2 seconds

  Success:
    Icon: ✓ (green)
    Text: "Frequência salva com sucesso!"
    Auto-revert after 3 seconds

  Error:
    Background: #ef4444
    Icon: ✕ (red)
    Text: "Erro ao salvar. Tente novamente."
```

---

### PAGE 8: Class Diary (Diário de Classe)

**Layout**: Sidebar (240px) + Main (1200px) with 2 columns (60% | 40%)

*Top section:*
```
Padding: 24px 40px
Background: #f8fafc
Border-bottom: 1px #e2e8f0

Controls (left):
  Turma: [5º A ▼] (200px, 44px)
  Data: "4 dez 2024" (date picker)
  Period buttons: [Mês] [Semana] [Hoje]

  Button: "+ Nova Aula"
    Width: 100%
    Height: 44px
    Background: #16a34a
    Font: 14px bold
```

*Timeline (left 60%):*
```
Padding: 24px
Background: white

Grouped by date (newest first):

  Date header:
    "📅 Sexta, 6 dez"
    Font: 14px semibold, #334155
    Padding: 16px 0 8px 0
    Border-top: 1px #e2e8f0 (except first)

  Lesson card:
    Background: white
    Border-left: 4px #16a34a (green)
    Border-radius: 8px
    Padding: 16px
    Margin-bottom: 12px
    Box-shadow: 0 1px 3px rgba(0,0,0,0.1)

    Content:
      Time + Subject:
        "14:30 - Matemática"
        Font: 16px bold, #334155
        Separator: " - " (gray)
        Subject: Blue color (#1e40af)

      Theme/Content:
        "Frações - Conceitos Básicos"
        Font: 14px, #64748b
        Margin: 8px 0

      Resources (icons horizontal):
        "📚 Livro didático  📊 Slides"
        Font: 12px, icons 20px
        Color: #16a34a (green)
        Icons: 📚📖🎥📊🎨

      Notes (if present):
        Background: #f8fafc
        Border-left: 2px #64748b
        Padding: 8px
        Font: 12px italic, #64748b
        Text: "Turma teve dificuldade com..."

      Actions (appear on hover):
        [Editar] [Duplicar] [Deletar]
        3 buttons, 32px, icons only
        Colors: blue, blue, red
        Position: Right bottom

    Hover:
      Shadow: larger
      Border-left: 4px #7c3aed (roxo)
      Translate: -2px
```

*Form (right 40%):*
```
Padding: 24px
Background: #f8fafc
Border-left: 1px #e2e8f0
Overflow-y: auto

Empty state:
  Text: "Clique em uma aula para editar"
  Font: 14px, #64748b
  Text-align: center
  Padding: 60px 24px

Form state:

  Card:
    Background: white
    Padding: 24px
    Border-radius: 12px

  Title:
    "📝 Nova Aula"
    Font: 18px bold, #334155
    Margin-bottom: 20px

  Fields:

    Disciplina:
      Label: "Disciplina*"
      Dropdown: 44px
      Placeholder: "Selecione..."
      Options: Português, Matemática, Ciências, etc.
      Margin-bottom: 16px

    Horário:
      Label: "Horário (opcional)"
      Input: 44px, time format
      Placeholder: "14:30"
      Margin-bottom: 16px

    Conteúdo:
      Label: "Conteúdo/Tema*"
      Textarea: 100px
      Placeholder: "Frações - Conceitos Básicos..."
      Margin-bottom: 16px

    Recursos:
      Label: "Recursos Utilizados:"
      Checkboxes (grid 2 columns):
        ☑ Livro didático
        ☐ Texto/Documento
        ☐ Vídeo
        ☐ Slides/PowerPoint
        ☐ Atividade Prática
        ☐ Quadro
      Height checkbox: 32px
      Margin-bottom: 16px

    Anotações:
      Label: "Anotações/Observações:"
      Textarea: 80px
      Placeholder: "Turma teve dificuldade com..."
      Font: 12px
      Margin-bottom: 24px

  Buttons:
    [Cancelar] [Salvar Aula]
    Width each: calc(50% - 4px)
    Height: 44px
    Gap: 8px
```

---

### PAGE 9: Calendar

**Layout**: Sidebar (240px) + Main (1200px) with 2 columns (55% | 45%)

*Left column controls (55%):*
```
Padding: 24px
Background: #f8fafc

Turma:
  Dropdown: [5º A ▼] (200px, 44px)

Mês/Ano:
  Display: "< Dezembro 2024 >"
  Buttons: [<] [>] (32px each)
  Click opens month picker

Visualização:
  Toggle: [Mês] [Semana]
  Button style, 44px height
  Active: blue

Button "+ Novo Evento":
  Width: 100%
  Height: 44px
  Background: #16a34a
  Font: 14px bold, white

Accordion: Base Curricular:
  Background: white
  Padding: 16px
  Border-radius: 8px
  Margin-top: 16px

  Discipline (expandable):
    ✓ Português
    • Ortografia (draggable)
    • Interpretação de Texto (draggable)
    • Produção Escrita (draggable)

    ✓ Matemática
    • Frações (draggable)
    • Operações com Decimais (draggable)

    Ciências
    • Ciclo da Água (draggable)

  Checkbox: Color #16a34a (green) when checked
  Topic font: 12px, #64748b
  Hover topic: Background #f1f5f9, cursor grab
```

*Calendar (right 55%):*
```
Padding: 24px
Background: white
Border-radius: 12px

Month display:
  Title: "Dezembro 2024" (18px bold, #334155)
  Days grid: 7 columns (seg-dom)

  Header row:
    seg ter qua qui sex sab dom
    Font: 14px bold, #334155
    Padding: 12px 0

  Date cells (7 x 6 grid):
    Size: 140px x 120px (desktop)

    Content:
      Date number: "6" (14px bold, top-left)
      Icons (if event): 📚 🎉 📌 (16px, centered)
      Discipline (small): "Português" (10px, bottom)
      Topic (small): "Ortografia" (10px, bottom)

    Background colors:
      Default: #ffffff
      Today: #dbeafe (light blue)
      Event: #dcfce7 (light green) or #fef3c7 (yellow)
      Holiday: #fce7f3 (light red)

    Border: 1px #e2e8f0

    Hover:
      Background: #f1f5f9
      Box-shadow: 0 2px 8px rgba(0,0,0,0.1)
      Cursor: pointer

    Click: Select day, populate right panel

  Icons:
    📚 = Aula (blue)
    🎉 = Feriado (red)
    📌 = Evento (purple)
    📍 = Base Curricular (orange)
```

*Details panel (right 45%):*
```
Padding: 24px
Background: #f8fafc
Border-left: 1px #e2e8f0
Overflow-y: auto

Empty state:
  Text: "Selecione um dia no calendário"
  Font: 14px, #64748b

Selected day:

  Date header:
    "🗓️ Sexta, 6 dez 2024"
    Font: 18px bold, #334155

  Sections:

    Base Curricular:
      Icon: 📚
      Title: "Base Curricular"
      Checkboxes:
        ☑ Português - Ortografia
        ☑ Matemática - Frações
      Font: 12px
      Check color: #16a34a

    Lessons:
      Icon: 📖
      Title: "Aulas do Dia"
      List:
        • 14:30 - Matemática
          "Frações - conceitos"
        • 15:30 - Português
          "Leitura e interpretação"
      Font: 12px

    Holiday:
      Icon: 🎉
      Title: "Feriado"
      Text: "Proclamação da República"
      Font: 12px

  Buttons:
    [Editar] [Novo Evento]
    Width: 100%
    Height: 40px
    Gap: 8px
    Margin-top: 24px
```

---

### PAGE 10: Help Center

**Layout**: Sidebar (240px) + Main (1200px)

```
Padding: 40px
Background: #ffffff

Header:
  H1: "❓ Central de Ajuda"
  Font: 32px bold, #334155
  Margin-bottom: 16px

  Text: "Bem-vindo! Aqui você encontra tutoriais..."
  Font: 14px, #64748b
  Margin-bottom: 32px

Search:
  Icon: 🔍
  Placeholder: "Buscar na ajuda..."
  Width: 400px
  Height: 44px
  Margin-bottom: 32px

Divider:
  1px #e2e8f0
  Margin: 32px 0

Categories:

  Category heading:
    Font: 14px bold, #334155
    Margin: 24px 0 12px 0

  Links (list):
    Font: 14px, #1e40af
    Hover: underline

    Example:
      👥 Alunos
        • Como adicionar novo aluno
        • Como editar informações
        • Como deletar aluno

      📋 Frequência
        • Como registrar frequência
        • Entender o grid
        • Relatórios

Divider:
  Margin: 32px 0

FAQ:
  H2: "❓ FAQ"
  Font: 24px bold, #334155
  Margin-bottom: 16px

  Accordion items:
    Q: "Como recuperar frequência deletada?"
    A: "Infelizmente, frequência deletada não pode ser recuperada..."
    Font Q: 14px bold, #334155
    Font A: 14px, #64748b
    Background: #f8fafc
    Padding: 16px
    Margin-bottom: 12px
    Hover: expand/collapse

Divider:
  Margin: 32px 0

Contact:
  H2: "📞 Contato de Suporte"
  Font: 24px bold, #334155
  Margin-bottom: 16px

  Text: "Sua dúvida não foi respondida?"
  Font: 14px, #64748b

  Button: "[Fale conosco →]"
  Font: 14px, blue, underline
  Margin: 12px 0 24px 0

  Contact info:
    Email: suporte@educa.local (14px)
    Phone: (35) 3484-8888 (14px)
    Hours: "Seg-Sex 8h-17h" (12px, #64748b)
```

---

## Fluxo de Criação

### Recomendação de Ordem

1. **Design System First** (1-2 horas)
   - Criar paleta de cores
   - Definir tipografia
   - Criar componentes base (buttons, inputs, cards, etc)
   - Criar icon set

2. **Page Layouts** (6-8 horas)
   - Criar responsivos (desktop, tablet, mobile)
   - 10 páginas principais
   - Seguir specs exatamente

3. **Interactions & States** (2-3 horas)
   - Hover states
   - Focus states
   - Loading states
   - Error states
   - Success states

4. **Details & Polish** (2-3 horas)
   - Fine-tune spacing
   - Verify color contrasts
   - Check typography consistency
   - Ensure accessibility

### Collaborative Workflow (Figma)

```
Share link with stakeholders at each stage:
- After Design System (review colors, typography)
- After 50% of pages (midpoint review)
- After 90% completion (final review)
- After 100% completion (approval)

Use Figma comments for feedback integration
```

---

## Checklist de Qualidade

### Visual Consistency
- [ ] All colors match palette exactly
- [ ] All fonts match typography specs
- [ ] All components consistent across pages
- [ ] Spacing follows 8px grid
- [ ] Icons are consistent style & size
- [ ] Shadows consistent (0 1px 3px, 0 4px 12px, etc)

### Responsive Design
- [ ] Desktop (1440px) - full featured
- [ ] Tablet (768px) - layout adjusted
- [ ] Mobile (375px) - simplified, touch-friendly

### Accessibility
- [ ] Color contrast >= 4.5:1 for text
- [ ] Buttons min 44x44px
- [ ] Focus states visible
- [ ] Interactive elements labeled
- [ ] Icons have alt text
- [ ] No color-only communication

### Completeness
- [ ] All 10 pages designed
- [ ] All states (default, hover, active, disabled, loading, error, success)
- [ ] All modals included
- [ ] All icons finalized
- [ ] All copy/text included

### Component Library
- [ ] Buttons (all variants & states)
- [ ] Inputs (all types & states)
- [ ] Cards (all types)
- [ ] Modals (all types)
- [ ] Badges (all types)
- [ ] Sidebar items
- [ ] Navbars
- [ ] Dropdowns
- [ ] Checkboxes & Radios

### Design Hand-off Ready
- [ ] File organized (pages, components, styles)
- [ ] Naming conventions consistent
- [ ] Design tokens exported
- [ ] CSS specs documented
- [ ] Color palette shared
- [ ] Typography specs clear
- [ ] Component properties detailed
- [ ] Padding/margin specs documented
- [ ] Animation/transition specs noted
- [ ] README with guidelines

---

## Expected Deliverables

### Final Files
```
educa-mockups-v1.0.figma
├── Design System (colors, typography, components, icons)
├── Page Layouts (10 pages × 3 responsive sizes)
├── Component Variants (all states)
├── Interaction Specs (animations, transitions)
└── Design Hand-off Docs (specs, guidelines, measurements)
```

### Specification Document
- Colors (hex, RGB, usage)
- Typography (fonts, sizes, weights)
- Spacing (padding, margins, gaps)
- Components (all variants and states)
- Responsive breakpoints
- Accessibility notes
- Interaction details

### Design Guidelines
- Color usage rules
- Typography hierarchy
- Component usage patterns
- Do's and don'ts
- Brand voice/tone

---

## Next Steps After Mockups

After design mockups are finalized:

1. **Interactive Prototype** (Figma)
   - Add interactions between pages
   - Create user flows
   - Test navigation

2. **HTML/CSS Mockups** (Phase D)
   - Convert to static HTML
   - Style with Tailwind CSS
   - Create interactive demo

3. **Production Development**
   - Implement in Next.js
   - Connect to Supabase
   - Add functionality

---

**Documento Completo: Prompt para Mockups v1.0** ✅
**Data**: 2025-12-04
**Próximo Passo**: Usar este prompt em ferramenta de design (Figma)
