# 012-01: Design Tokens - Paleta Jardim

**Fase:** 1 de 5
**Tipo:** DO (Implementation)
**Dependências:** Nenhuma

## Objetivo

Atualizar os design tokens do projeto para refletir a paleta "Jardim" definida no brand guidelines.

## Contexto

Referência: `educa-brand-guidelines.html` - Seção 02: Cores

## Tarefas

### 1. Atualizar `tailwind.config.js`

Substituir a paleta de cores atual pela paleta Jardim:

```javascript
colors: {
  // Paleta Jardim - EDUCA Brand Guidelines v1.0
  jardim: {
    // Verde Principal (crescimento, educação)
    green: {
      50: '#ecfdf5',
      100: '#d1fae5',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',  // PRIMARY
    },
    // Azul Principal (confiança, tecnologia)
    blue: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      400: '#38bdf8',
      500: '#0ea5e9',  // PRIMARY
    },
    // Amarelo (destaque, alegria - underline do logo)
    yellow: {
      100: '#fef3c7',
      300: '#fde68a',
      400: '#fcd34d',  // Logo underline
    },
    // Rosa (acento, alertas)
    pink: {
      100: '#fce7f3',
      400: '#fb7185',
    },
  },

  // Neutros
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Semânticas
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
}
```

### 2. Atualizar `globals.css`

Adicionar variáveis CSS para gradientes e elementos de marca:

```css
:root {
  /* EDUCA Brand Gradient */
  --educa-gradient: linear-gradient(135deg, #059669 0%, #0ea5e9 100%);
  --educa-gradient-light: linear-gradient(135deg, #34d399 0%, #38bdf8 100%);

  /* Logo Colors */
  --logo-green: #059669;
  --logo-blue: #0ea5e9;
  --logo-underline: #fcd34d;

  /* Card Styles */
  --card-radius: 16px;
  --input-radius: 12px;
  --button-radius: 12px;

  /* Shadows - softer, more organic */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.08);

  /* Sidebar */
  --sidebar-width: 260px;
  --header-height: 70px;
}
```

### 3. Criar classes utilitárias

```css
@layer utilities {
  .bg-educa-gradient {
    background: var(--educa-gradient);
  }

  .bg-educa-gradient-light {
    background: var(--educa-gradient-light);
  }

  .text-educa-gradient {
    background: var(--educa-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}
```

## Verificação

- [ ] Cores da paleta Jardim aplicadas
- [ ] Gradientes funcionando
- [ ] Variáveis CSS disponíveis
- [ ] Build passa sem erros
- [ ] Não quebrou estilos existentes

## Arquivos a Modificar

1. `gestao_fronteira/tailwind.config.js`
2. `gestao_fronteira/app/globals.css`
