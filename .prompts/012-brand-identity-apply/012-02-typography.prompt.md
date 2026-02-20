# 012-02: Tipografia - Lexend, Inter, Caveat

**Fase:** 2 de 5
**Tipo:** DO (Implementation)
**Dependências:** 012-01 (Design Tokens)

## Objetivo

Configurar as três famílias tipográficas do brand guidelines: Lexend (títulos), Inter (corpo), Caveat (decorativo).

## Contexto

Referência: `educa-brand-guidelines.html` - Seção 03: Tipografia

### Escala Tipográfica Brand Guidelines

| Nome | Tamanho | Uso |
|------|---------|-----|
| Display | 48px | Logo, destaque principal |
| Heading 1 | 32px | Título principal |
| Heading 2 | 24px | Subtítulo |
| Heading 3 | 18px | Seção |
| Body | 16px | Texto corrido (Inter) |
| Small | 14px | Legendas |
| Caption | 12px | Metadados |

## Tarefas

### 1. Adicionar Google Fonts ao projeto

Atualizar `gestao_fronteira/app/layout.tsx`:

```tsx
import { Inter, Lexend, Caveat } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['400', '700'],
  display: 'swap',
})

// No body:
<body className={`${inter.variable} ${lexend.variable} ${caveat.variable} font-sans`}>
```

### 2. Configurar Tailwind

Atualizar `tailwind.config.js`:

```javascript
fontFamily: {
  sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui'],
  display: ['var(--font-lexend)', 'Lexend', 'ui-sans-serif'],
  cursive: ['var(--font-caveat)', 'Caveat', 'cursive'],
},

fontSize: {
  // EDUCA Type Scale
  'display': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],     // 48px
  'h1': ['2rem', { lineHeight: '1.3', fontWeight: '700' }],          // 32px
  'h2': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],        // 24px
  'h3': ['1.125rem', { lineHeight: '1.5', fontWeight: '600' }],      // 18px
  'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],        // 16px
  'small': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],   // 14px
  'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],  // 12px
},
```

### 3. Criar classes tipográficas

Adicionar ao `globals.css`:

```css
@layer components {
  /* EDUCA Typography Classes */
  .text-display {
    @apply font-display text-display tracking-tight;
  }

  .text-h1 {
    @apply font-display text-h1 tracking-tight text-gray-800;
  }

  .text-h2 {
    @apply font-display text-h2 text-gray-800;
  }

  .text-h3 {
    @apply font-display text-h3 text-gray-800;
  }

  .text-body {
    @apply font-sans text-body text-gray-600;
  }

  .text-small {
    @apply font-sans text-small text-gray-500;
  }

  .text-caption {
    @apply font-sans text-caption text-gray-400;
  }

  /* Decorative text (Caveat) */
  .text-cursive {
    @apply font-cursive;
  }

  .text-quote {
    @apply font-cursive text-xl text-gray-500;
  }
}
```

## Verificação

- [ ] Lexend carregando corretamente
- [ ] Caveat carregando corretamente
- [ ] Classes de tipografia funcionando
- [ ] Títulos usando Lexend
- [ ] Corpo usando Inter
- [ ] Performance de fontes (display: swap)

## Arquivos a Modificar

1. `gestao_fronteira/app/layout.tsx`
2. `gestao_fronteira/tailwind.config.js`
3. `gestao_fronteira/app/globals.css`
