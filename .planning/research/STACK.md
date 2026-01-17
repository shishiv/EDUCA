# Pesquisa de Stack: Design System para EDUCA

**Pesquisado:** 2026-01-16
**Dominio:** Design System / UI Architecture
**Confianca Geral:** ALTA

---

## Resumo Executivo

A implementacao de design system em Next.js 15 + Tailwind CSS + shadcn/ui em 2025/2026 converge para uma **abordagem hibrida CSS-first** que combina CSS variables para theming dinamico com a nova diretiva `@theme` do Tailwind v4 para design tokens estaticos. O projeto EDUCA ja possui uma base solida com shadcn/ui configurado (cssVariables: true) e um sistema de cores extenso no `tailwind.config.js`, mas esta usando **Tailwind 3.3.3** — uma versao significativamente desatualizada.

A decisao chave e: **migrar para Tailwind v4** ou **manter v3 e refinar a arquitetura atual**. Dado que o EDUCA e um sistema em producao com usuarios reais (escolas municipais), a recomendacao e uma **migracao incremental para Tailwind v4.1.x** usando o upgrade tool oficial, aproveitando a nova configuracao CSS-first que simplifica significativamente a gestao de design tokens.

A arquitetura recomendada segue o padrao estabelecido pelo shadcn/ui: CSS variables em `:root` e `.dark` para valores dinamicos de tema, `@theme inline` para mapear essas variaveis para classes utilitarias, e Class Variance Authority (CVA) para variantes de componentes. As fontes Lexend, Inter e Caveat devem ser implementadas via `next/font` para otimizacao automatica de performance.

---

## Recomendacoes de Stack

### 1. Tailwind CSS

- **Versao Recomendada:** v4.1.18 (atual em Janeiro 2026)
- **Versao Atual no Projeto:** v3.3.3 (desatualizada)
- **Acao:** Migrar usando `@tailwindcss/upgrade@next`
- **Confianca:** ALTA

**Rationale:**
- Tailwind v4 oferece builds 5x mais rapidos e incrementais 100x mais rapidos
- Nova arquitetura CSS-first elimina necessidade de `tailwind.config.js`
- `@theme` directive cria design tokens que viram CSS variables E classes utilitarias automaticamente
- Suporte nativo a OKLCH para cores perceptualmente uniformes (melhor para acessibilidade)
- shadcn/ui ja tem suporte completo para v4 desde marco 2025

**Consideracoes de Migracao:**
- Requer Safari 16.4+, Chrome 111+, Firefox 128+ (verificar publico-alvo das escolas)
- O upgrade tool automatiza ~90% da migracao
- Alguns casos complexos (como `screens: { xs: { max: '360px' } }`) requerem ajustes manuais

**Se browsers antigos sao necessarios:** Manter Tailwind v3.4.x (ultima v3) ate que requisitos mudem.

---

### 2. Design Tokens Architecture

- **Abordagem:** Hibrida CSS Variables + @theme
- **Ferramenta:** Nativa (CSS + Tailwind @theme)
- **Confianca:** ALTA

**Estrutura Recomendada:**

```css
/* globals.css */
@import "tailwindcss";
@import "tw-animate-css";

/* Camada 1: CSS Variables para theming dinamico */
:root {
  /* Cores semanticas - valores raw */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.6 0.2 250);        /* EDUCA Blue */
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.7 0.15 150);     /* EDUCA Green */
  /* ... demais variaveis */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.98 0 0);
  /* ... */
}

/* Camada 2: @theme para gerar classes utilitarias */
@theme inline {
  /* Cores mapeadas do :root */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);

  /* Design tokens estaticos */
  --font-display: var(--font-lexend);
  --font-body: var(--font-inter);
  --font-handwritten: var(--font-caveat);

  /* Espacamento customizado */
  --spacing-sidebar: 260px;
  --spacing-header: 70px;

  /* Radius - "educacao nao e quadrada" */
  --radius-educa: 8px;
  --radius-educa-lg: 16px;
}
```

**Rationale:**
- CSS Variables (`:root`) permitem theming dinamico em runtime (modo escuro, temas por escola)
- `@theme inline` gera classes utilitarias (`bg-primary`, `font-display`) mantendo consistencia
- Separacao clara: `:root` para valores, `@theme` para mapeamento Tailwind
- OKLCH oferece melhor controle perceptual de luminosidade que HSL (melhor para acessibilidade)

---

### 3. CSS Architecture

- **Abordagem:** CSS Variables para dinamicos + @theme para estaticos
- **Confianca:** ALTA

**Quando usar CSS Variables (`:root`):**
- Cores que mudam entre temas (light/dark)
- Valores que podem ser customizados por usuario/escola
- Qualquer coisa que precise mudar em runtime

**Quando usar `@theme`:**
- Design tokens estaticos (spacing, radius, shadows)
- Mapeamento de CSS variables para classes utilitarias
- Fontes, animacoes, breakpoints

**Arquitetura de Arquivos:**

```
gestao_fronteira/
├── app/
│   ├── globals.css           # Imports + :root + @theme
│   └── layout.tsx            # Font loading via next/font
├── styles/                   # (opcional, se ficar complexo)
│   ├── tokens/
│   │   ├── colors.css        # --color-* variables
│   │   ├── typography.css    # --font-*, --text-*
│   │   └── spacing.css       # --spacing-*, --radius-*
│   └── themes/
│       ├── light.css         # :root
│       └── dark.css          # .dark
```

**Nota:** Para projeto do tamanho do EDUCA, manter tudo em `globals.css` e aceitavel. Dividir apenas se ultrapassar ~300 linhas.

---

### 4. Componentes

- **Base:** shadcn/ui (ja instalado)
- **Customizacao:** CVA (Class Variance Authority) v0.7.1
- **Confianca:** ALTA

**Abordagem de Customizacao:**

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  // Base - usa tokens, NUNCA valores hardcoded
  "inline-flex items-center justify-center rounded-educa text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Variantes especificas EDUCA
        alunos: "bg-module-alunos text-white hover:bg-module-alunos/90",
        turmas: "bg-module-turmas text-white hover:bg-module-turmas/90",
        frequencia: "bg-module-frequencia text-white hover:bg-module-frequencia/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-educa-sm px-3",
        lg: "h-11 rounded-educa-md px-8",
        // Touch-friendly para tablets (WCAG 44px minimo)
        touch: "min-h-[44px] min-w-[44px] px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

**Principios:**
1. **Headless logic:** Comportamento encapsulado, aparencia via variantes
2. **Token-only styling:** Nunca usar valores hardcoded (`bg-[#4361EE]`), sempre tokens (`bg-primary`)
3. **Variantes explicitas:** Usar CVA para todas as variacoes visuais
4. **data-slot attributes:** shadcn/ui v4 usa `data-slot` para estilizacao de sub-componentes

**Rationale:**
- CVA padroniza variantes entre componentes
- Permite reutilizacao de logica de estilo
- Type-safe com TypeScript via `VariantProps`
- Alinha com arquitetura shadcn/ui

---

### 5. Fontes

- **Implementacao:** `next/font` (built-in Next.js)
- **Confianca:** ALTA

**Configuracao Recomendada:**

```typescript
// app/layout.tsx
import { Lexend, Inter, Caveat } from 'next/font/google';

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
  // Pesos para titulos
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const caveat = Caveat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-caveat',
  weight: ['400', '500', '600', '700'],
});

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${lexend.variable} ${inter.variable} ${caveat.variable}`}
    >
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Mapeamento em @theme:**

```css
@theme inline {
  --font-display: var(--font-lexend);   /* Titulos, headings */
  --font-body: var(--font-inter);       /* Texto corrido, UI */
  --font-handwritten: var(--font-caveat); /* Assinaturas, notas manuscritas */
}
```

**Uso em componentes:**

```tsx
<h1 className="font-display text-2xl font-semibold">Dashboard</h1>
<p className="font-body text-base">Bem-vindo ao sistema</p>
<span className="font-handwritten text-lg">Assinatura do Professor</span>
```

**Rationale:**
- `next/font` auto-hospeda fontes (zero request externo)
- Previne Layout Shift (CLS) automaticamente
- CSS variables permitem uso em `@theme`
- Lexend e cientificamente projetada para melhorar leitura (ideal para educacao)

---

### 6. Animacoes

- **Biblioteca:** `tw-animate-css` v1.x (replacement para tailwindcss-animate)
- **Versao Atual no Projeto:** `tailwindcss-animate` v1.0.7 (deprecated)
- **Confianca:** ALTA

**Migracao Necessaria:**

```bash
# Remover
pnpm remove tailwindcss-animate

# Instalar
pnpm add -D tw-animate-css
```

**Configuracao:**

```css
/* globals.css */
@import "tailwindcss";
@import "tw-animate-css";  /* Substitui o plugin JS */
```

**Rationale:**
- `tailwindcss-animate` foi deprecado pelo shadcn/ui em marco 2025
- `tw-animate-css` e CSS-puro, alinha com filosofia v4
- Inclui animacoes para accordion, caret-blink ja usadas por shadcn/ui

---

### 7. Gerenciamento de Estado de Tema

- **Biblioteca:** `next-themes` v0.4.6 (ja instalado)
- **Confianca:** ALTA

**Rationale:**
- Ja integrado ao projeto
- Suporte SSR/SSG sem flash
- Sincroniza com `prefers-color-scheme`
- Persiste preferencia do usuario

---

## Paleta de Cores EDUCA (Consolidada)

Com base nos mockups e `tailwind.config.js` atual:

```css
@theme inline {
  /* Sistema Base (shadcn/ui) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-destructive: var(--destructive);

  /* EDUCA Brand */
  --color-educa-blue-500: oklch(0.55 0.22 264);  /* #4361EE - Primary action */
  --color-educa-green-500: oklch(0.7 0.17 162);  /* #10B981 - Success */
  --color-educa-gold-500: oklch(0.75 0.18 85);   /* #F59E0B - Highlight */
  --color-educa-coral-500: oklch(0.65 0.2 25);   /* #EF6351 - Alert */

  /* Module Colors (Google Classroom style) */
  --color-module-alunos: oklch(0.55 0.25 285);      /* #7C3AED - Violet */
  --color-module-turmas: oklch(0.7 0.18 220);       /* #0EA5E9 - Sky */
  --color-module-frequencia: oklch(0.7 0.17 162);   /* #10B981 - Emerald */
  --color-module-notas: oklch(0.7 0.19 45);         /* #F97316 - Orange */
  --color-module-relatorios: oklch(0.65 0.22 330);  /* #EC4899 - Pink */

  /* Attendance Status (WCAG AA compliant) */
  --color-attendance-present: oklch(0.72 0.19 145);   /* #22C55E */
  --color-attendance-absent: oklch(0.63 0.24 27);     /* #EF4444 */
  --color-attendance-late: oklch(0.75 0.18 85);       /* #F59E0B */
  --color-attendance-justified: oklch(0.63 0.2 250);  /* #3B82F6 */
}
```

---

## O Que NAO Usar

### 1. Tailwind v3.x em Novos Projetos
- **Por que evitar:** Arquitetura JS-config esta sendo descontinuada
- **Excecao:** Se precisar suportar IE11 ou browsers muito antigos
- **Alternativa:** Tailwind v4.1.x com @theme

### 2. `tailwindcss-animate` (plugin JS)
- **Por que evitar:** Deprecado pelo shadcn/ui em marco 2025
- **Alternativa:** `tw-animate-css` (CSS-puro)

### 3. Valores Hardcoded em Classes
- **Por que evitar:** Quebra consistencia do design system
- **Exemplo ruim:** `bg-[#4361EE]`, `text-[14px]`
- **Exemplo bom:** `bg-primary`, `text-sm`
- **Alternativa:** Sempre usar tokens via CSS variables ou @theme

### 4. HSL para Cores Novas
- **Por que evitar:** OKLCH oferece melhor uniformidade perceptual
- **Detalhe:** HSL faz verde parecer mais claro que azul no mesmo lightness
- **Alternativa:** OKLCH (padrao Tailwind v4, shadcn/ui 2025)

### 5. Fontsource ou Google Fonts CDN
- **Por que evitar:** Requests externos, problemas de privacidade (GDPR)
- **Alternativa:** `next/font` auto-hospeda fontes automaticamente

### 6. styled-components / Emotion
- **Por que evitar:** Runtime CSS-in-JS tem overhead de performance
- **Contexto:** React Server Components nao suportam bem
- **Alternativa:** Tailwind + CVA (zero runtime)

### 7. Style Dictionary / Token Studio Complexos
- **Por que evitar:** Over-engineering para escala do EDUCA
- **Quando considerar:** Se tiver design team separado com Figma tokens
- **Alternativa:** CSS variables + @theme (nativo, simples)

---

## Decisao: Migrar para Tailwind v4?

### Recomendacao: SIM, migrar incrementalmente

**Argumentos a Favor:**
1. Performance drasticamente melhor (builds 5x+, incrementais 100x+)
2. shadcn/ui ja tem suporte completo
3. CSS-first simplifica arquitetura
4. OKLCH melhora acessibilidade de cores
5. `@theme` unifica design tokens elegantemente

**Riscos Mitigados:**
1. **Browser support:** Escolas usam Chrome/Edge modernos (verificar)
2. **Quebras:** Upgrade tool automatiza 90%
3. **Rollback:** Manter branch v3 ate validacao completa

**Estrategia de Migracao:**
1. Criar branch `feature/tailwind-v4`
2. Rodar `npx @tailwindcss/upgrade@next`
3. Revisar diff, ajustar casos especificos
4. Testar todas as telas criticas
5. Merge apos validacao em staging

---

## Fontes Consultadas

### Alta Confianca (Documentacao Oficial)
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4) - Guia oficial de migracao
- [Tailwind CSS Theme Variables](https://tailwindcss.com/docs/theme) - Documentacao @theme
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4) - Release notes oficial
- [Tailwind CSS Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) - Guia de migracao oficial
- [Next.js Font Component](https://nextjs.org/docs/app/api-reference/components/font) - Documentacao next/font

### Media Confianca (Artigos Verificados)
- [shadcn/ui Theming Best Practices](https://www.paulserban.eu/blog/post/shadcnui-theming-best-practices-css-variables-vs-tailwind-config/) - CSS Variables vs Tailwind Config
- [Building Scalable Design System with shadcn/ui](https://shadisbaih.medium.com/building-a-scalable-design-system-with-shadcn-ui-tailwind-css-and-design-tokens-031474b03690) - Design tokens patterns
- [Tailwind v4 Migration Guide](https://medium.com/better-dev-nextjs-react/tailwind-v4-migration-from-javascript-config-to-css-first-in-2025-ff3f59b215ca) - Experiencia real de migracao
- [tw-animate-css GitHub](https://github.com/Wombosvideo/tw-animate-css) - Replacement para tailwindcss-animate

### Baixa Confianca (Requer Validacao)
- Versoes especificas de pacotes npm (verificar no momento da implementacao)
- Compatibilidade de browsers com escolas de Fronteira (validar com usuarios)

---

## Checklist de Qualidade

- [x] Versoes sao atuais (Tailwind 4.1.18, nao dados de treinamento)
- [x] Rationale explica o PORQUE, nao so o QUE
- [x] Niveis de confianca atribuidos a cada recomendacao
- [x] Fontes citadas com URLs
- [x] Consideracoes de migracao para projeto brownfield
- [x] Alinhamento com stack existente (Next.js 16, shadcn/ui, Supabase)

---

## Proximos Passos Recomendados

1. **Validar browser requirements** com escolas de Fronteira
2. **Criar branch de migracao** Tailwind v4
3. **Rodar upgrade tool** e revisar mudancas
4. **Definir tokens EDUCA** em `globals.css` usando estrutura recomendada
5. **Migrar `tailwindcss-animate`** para `tw-animate-css`
6. **Configurar fontes** via next/font
7. **Criar componentes base** com CVA seguindo design system
