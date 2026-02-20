# 012 - Aplicar Brand Guidelines e UI Mockups ao EDUCA

**Tipo:** Multi-Phase Implementation
**Prioridade:** Alta
**Criado:** 2024-12-15

## Objetivo

Aplicar a nova identidade visual documentada em `educa-brand-guidelines.html` e os mockups de UI de `educa-ui-mockups.html` ao projeto Next.js atual.

## Arquivos de Referência

| Arquivo | Conteúdo |
|---------|----------|
| `educa-brand-guidelines.html` | Manual de identidade visual completo |
| `educa-ui-mockups.html` | Mockups interativos de 5 telas |

## Análise do Estado Atual vs Brand Guidelines

### Cores - PRECISA ATUALIZAÇÃO

**Brand Guidelines define:**
```css
--green-600: #059669  /* Principal */
--green-500: #10b981
--blue-500: #0ea5e9   /* Principal */
--yellow-400: #fcd34d /* Underline do logo */
--pink-400: #fb7185
```

**Projeto atual usa:**
- `educa.blue.500: #4361EE` ❌ Diferente
- `educa.green.600: #059669` ✅ Igual
- `educa.gold.500: #F59E0B` ❌ Diferente (brand usa #fcd34d)

### Tipografia - PRECISA ATUALIZAÇÃO

**Brand Guidelines define:**
- **Lexend**: Títulos e logo (pesos: 400-700)
- **Inter**: Corpo de texto
- **Caveat**: Elementos decorativos/cursivos

**Projeto atual:**
- Inter ✅ Já configurado
- Lexend ❌ Não configurado (usa apenas Inter)
- Caveat ❌ Não configurado

### Logo - PRECISA ATUALIZAÇÃO

**Brand Guidelines define:**
- Texto "EDUCA" em Lexend Bold
- Gradiente: #059669 → #0ea5e9
- Underline amarelo squiggle (#fcd34d)
- SVG path curvo para o underline

**Projeto atual:**
- Logo circular com "E" estilizado ❌ Totalmente diferente
- Cores diferentes

### Layout - PRECISA ATUALIZAÇÃO

**Brand Guidelines/Mockups definem:**
- Sidebar: 260px, branca, borda direita cinza
- Header: 70px altura, sticky
- Cards: border-radius 16px
- Inputs: border-radius 12px

---

## Fases de Implementação

### Fase 1: Design Tokens
Atualizar `tailwind.config.js` e `globals.css` com:
- Paleta de cores "Jardim" do brand guidelines
- Variáveis CSS para gradientes
- Border-radius padrões
- Shadows suaves

### Fase 2: Tipografia
- Adicionar Lexend e Caveat ao projeto
- Configurar font-family no Tailwind
- Criar classes utilitárias para escala tipográfica

### Fase 3: Logo Component
Reescrever `components/identity/educa-logo.tsx`:
- Logo principal com gradiente + underline
- Versões: principal, monocromático verde, escuro, branco
- Área de proteção (clearspace)

### Fase 4: Layout Components
- `components/layout/sidebar.tsx` - Novo design
- `components/layout/header.tsx` - Novo design
- Sistema de navegação conforme mockups

### Fase 5: Páginas
- Login page (split-screen design)
- Dashboard (stats cards, turmas list, alerts)
- Turmas (grid de cards)
- Chamada/Frequência (tabela interativa)
- Perfil do Aluno

---

## Execução

Use `/taches-cc-resources:run-prompt 012` para executar os prompts individuais:
- `012-01` - Design Tokens
- `012-02` - Tipografia
- `012-03` - Logo Component
- `012-04` - Layout Components
- `012-05` - Páginas
