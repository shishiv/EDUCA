# Pesquisa de Arquitetura: Design System EDUCA

**Pesquisado:** 2026-01-16
**Dominio:** Refatoracao de Design System em Next.js Brownfield
**Confianca:** ALTA

---

## Resumo Executivo

A refatoracao de design system em um projeto brownfield como o EDUCA requer uma estrategia incremental que mantenha a aplicacao funcionando durante toda a transicao. A abordagem recomendada e o **Strangler Fig Pattern** adaptado para frontend, onde novos componentes sao criados em paralelo aos existentes e gradualmente substituem os antigos.

A arquitetura ideal para o design system do EDUCA segue o modelo de **camadas**: Tokens (fundacao) > Primitivos (atomos) > Padroes (moleculas/organismos) > Templates. Os tokens de design devem ser definidos em CSS variables e propagados para o Tailwind config, garantindo uma unica fonte de verdade que pode ser alterada em tempo de execucao (temas, dark mode).

A ordem de build e critica: comece pelos tokens, depois primitivos base (Button, Input), depois compostos que dependem deles (Card, Table). A compatibilidade retroativa e mantida atraves de uma camada de alias que mapeia componentes antigos para novos, permitindo migracao gradual sem quebrar telas existentes.

**Recomendacao principal:** Implementar tokens primeiro, depois migrar componentes shadcn/ui existentes para usar os novos tokens, e por ultimo criar componentes compostos EDUCA-especificos.

---

## Estrutura de Diretorios Recomendada

```
gestao_fronteira/
├── components/
│   ├── ui/                     # Primitivos shadcn/ui customizados
│   │   ├── button.tsx          # (existente - customizar)
│   │   ├── card.tsx            # (existente - customizar)
│   │   ├── input.tsx           # (existente - customizar)
│   │   └── ...                 # outros primitivos
│   │
│   ├── tokens/                 # [NOVO] Design tokens exportados
│   │   ├── colors.ts           # Paleta de cores
│   │   ├── typography.ts       # Escalas tipograficas
│   │   ├── spacing.ts          # Espacamentos
│   │   ├── shadows.ts          # Sombras
│   │   └── index.ts            # Barrel export
│   │
│   ├── patterns/               # [NOVO] Padroes compostos EDUCA
│   │   ├── StatCard/           # Card com metricas
│   │   ├── PageHeader/         # Header de pagina
│   │   ├── DataTable/          # Tabela com acoes
│   │   ├── EmptyState/         # Estado vazio
│   │   └── AlertItem/          # Item de alerta
│   │
│   ├── layout/                 # (existente - refatorar)
│   │   ├── sidebar.tsx         # Sidebar principal
│   │   ├── header.tsx          # Header com usuario
│   │   ├── mobile-nav.tsx      # Navegacao mobile
│   │   └── ...
│   │
│   ├── domain/                 # [NOVO] Renomear de componentes de dominio
│   │   ├── attendance/         # Frequencia (mover de attendance/)
│   │   ├── diary/              # Diario (mover de diary/)
│   │   ├── students/           # Alunos (mover de students/)
│   │   └── ...
│   │
│   └── _deprecated/            # [NOVO] Componentes antigos durante migracao
│       └── ...                 # Mover aqui conforme substituir
│
├── lib/
│   └── design-system/          # [NOVO] Logica do design system
│       ├── cn.ts               # Utilidade classnames (mover de utils)
│       ├── variants.ts         # CVA variants compartilhados
│       └── theme.ts            # Configuracao de tema
│
├── app/
│   └── globals.css             # CSS variables (tokens)
│
└── tailwind.config.js          # Estender com tokens
```

### Justificativa da Estrutura

| Diretorio | Proposito | Depende de |
|-----------|-----------|------------|
| `tokens/` | Fonte unica de verdade para valores de design | - |
| `ui/` | Primitivos reutilizaveis (shadcn customizado) | tokens/ |
| `patterns/` | Composicoes EDUCA-especificas | ui/, tokens/ |
| `layout/` | Estrutura da aplicacao | patterns/, ui/ |
| `domain/` | Logica de negocio visual | patterns/, ui/ |
| `_deprecated/` | Compatibilidade retroativa | - |

---

## Camadas do Design System

### 1. Tokens (Fundacao)

**O que sao:** Valores primitivos de design (cores, espacamentos, tipografia, sombras, border-radius).

**Onde definir:**
- **CSS Variables** em `globals.css` para valores que mudam em runtime (temas)
- **TypeScript constants** em `tokens/*.ts` para uso programatico
- **Tailwind config** estendido para classes utilitarias

**Estrutura de tokens:**

```css
/* app/globals.css */
:root {
  /* === CORES PRIMARIAS (Jardim) === */
  --color-primary: 5 150 105;        /* green-600 #059669 */
  --color-primary-light: 16 185 129; /* green-500 */
  --color-secondary: 14 165 233;     /* blue-500 */
  --color-accent: 252 211 77;        /* yellow-400 */
  --color-highlight: 251 113 133;    /* pink-400 */

  /* === CORES BNCC === */
  --color-campo-eu: 236 72 153;      /* pink-500 */
  --color-campo-corpo: 249 115 22;   /* orange-500 */
  --color-campo-tracos: 139 92 246;  /* violet-500 */
  --color-campo-escuta: 14 165 233;  /* sky-500 */
  --color-campo-espacos: 16 185 129; /* emerald-500 */

  /* === SEMANTICAS === */
  --color-success: 16 185 129;
  --color-warning: 245 158 11;
  --color-error: 239 68 68;
  --color-info: 14 165 233;

  /* === TIPOGRAFIA === */
  --font-display: 'Lexend', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-handwriting: 'Caveat', cursive;

  /* === ESPACAMENTO === */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */

  /* === LAYOUT === */
  --sidebar-width: 260px;
  --header-height: 70px;

  /* === BORDER RADIUS === */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* === SOMBRAS === */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px rgb(0 0 0 / 0.07);
  --shadow-lg: 0 10px 15px rgb(0 0 0 / 0.1);
}
```

### 2. Primitivos (Atomos)

**O que sao:** Componentes UI fundamentais que nao podem ser decompostos mais (Button, Input, Label, Badge, Avatar).

**Origem:** shadcn/ui customizados para usar tokens EDUCA.

**Padrao de customizacao:**

```typescript
// components/ui/button.tsx
const buttonVariants = cva(
  // Base: usar tokens
  "inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-[rgb(var(--color-primary))] text-white hover:bg-[rgb(var(--color-primary-light))]",
        secondary: "bg-[rgb(var(--color-secondary))] text-white",
        ghost: "hover:bg-gray-100",
        // ... outras variantes
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);
```

### 3. Padroes (Moleculas/Organismos)

**O que sao:** Composicoes de primitivos que formam padroes UI reutilizaveis no EDUCA.

**Exemplos:**
- `StatCard` = Card + Icon + Typography (dashboard stats)
- `PageHeader` = Title + Breadcrumb + Actions
- `DataTable` = Table + Pagination + Filters + EmptyState
- `AlertItem` = Badge + Icon + Text + Action

**Padrao de implementacao:**

```typescript
// components/patterns/StatCard/StatCard.tsx
interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: { value: number; direction: 'up' | 'down' };
  colorScheme?: 'primary' | 'success' | 'warning' | 'error';
}

export function StatCard({ title, value, icon: Icon, trend, colorScheme = 'primary' }: StatCardProps) {
  return (
    <Card className={cn(
      "transition-all hover:shadow-[var(--shadow-md)]",
      colorSchemeStyles[colorScheme]
    )}>
      <CardContent className="p-[var(--space-4)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && <TrendIndicator {...trend} />}
          </div>
          <IconWrapper icon={Icon} colorScheme={colorScheme} />
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4. Templates (Layouts de Pagina)

**O que sao:** Estruturas de pagina completas que definem o layout de diferentes tipos de tela.

**Exemplos:**
- `DashboardLayout` = Sidebar + Header + Content area
- `FormLayout` = Header + Form sections + Actions
- `ListLayout` = Header + Filters + Table/Cards + Pagination
- `DetailLayout` = Header + Two-column content

---

## Estrategia de Migracao

### Fase 1: Fundacao de Tokens (Semana 1)

**O que fazer:**
1. Definir CSS variables em `globals.css`
2. Criar `components/tokens/` com exports TypeScript
3. Atualizar `tailwind.config.js` para usar tokens
4. Documentar paleta de cores e tipografia

**Por que primeiro:**
- Tokens sao a fundacao - tudo depende deles
- Nao quebra nada existente (aditivo)
- Permite testar valores antes de aplicar

**Entregavel:** Tokens funcionando, podem ser usados por novos componentes.

### Fase 2: Primitivos Base (Semanas 2-3)

**O que fazer:**
1. Atualizar `Button` para usar tokens + adicionar variantes EDUCA
2. Atualizar `Card` para usar tokens + sombras EDUCA
3. Atualizar `Input`, `Label`, `Badge`, `Avatar`
4. Criar barrel exports em `components/ui/index.ts`

**Ordem de componentes:**
| Ordem | Componente | Depende de | Usado por |
|-------|------------|------------|-----------|
| 1 | Button | tokens | Tudo |
| 2 | Input | tokens | Forms |
| 3 | Card | tokens | StatCard, patterns |
| 4 | Badge | tokens | Alertas, status |
| 5 | Avatar | tokens | Header, perfil |
| 6 | Label | tokens | Forms |

**Por que esta ordem:**
- Button e o mais usado - impacto imediato
- Input e Card sao proximos mais usados
- Badge/Avatar sao menos criticos mas faceis

### Fase 3: Padroes Compostos (Semanas 3-4)

**O que fazer:**
1. Criar `StatCard` (usado no dashboard)
2. Atualizar `Sidebar` e `Header` (layout)
3. Criar `PageHeader` (usado em todas as paginas)
4. Criar `DataTable` (turmas, alunos, frequencia)
5. Criar `AlertItem` (notificacoes, warnings)

**Ordem de componentes:**
| Ordem | Componente | Depende de | Usado por |
|-------|------------|------------|-----------|
| 1 | StatCard | Card, Badge | Dashboard |
| 2 | Sidebar | Button, Avatar | Layout |
| 3 | Header | Button, Avatar, Badge | Layout |
| 4 | PageHeader | Button | Todas paginas |
| 5 | DataTable | Button, Badge | Listagens |
| 6 | AlertItem | Badge, Button | Notificacoes |

### Fase 4: Telas Especificas (Semanas 4-6)

**O que fazer:**
1. Refatorar Login (split-screen)
2. Refatorar Dashboard (stats grid + alerts)
3. Refatorar Turmas (card grid)
4. Refatorar Chamada (attendance table)
5. Refatorar Perfil Aluno (two-column)

**Estrategia por tela:**
- Criar nova versao em paralelo
- Testar com feature flag se necessario
- Substituir rota quando pronto
- Mover versao antiga para `_deprecated/`

---

## Ordem de Build Detalhada

| Ordem | Componente | Depende de | Rationale |
|-------|------------|------------|-----------|
| 1 | Tokens (CSS vars) | - | Fundacao absoluta, tudo depende |
| 2 | Tailwind config | Tokens | Permite usar tokens via classes |
| 3 | Button | Tokens | Primitivo mais usado, validar tokens |
| 4 | Input | Tokens | Segundo mais usado, forms |
| 5 | Label | Tokens | Complementa Input |
| 6 | Card | Tokens | Base para composicoes |
| 7 | Badge | Tokens | Status, tags, alertas |
| 8 | Avatar | Tokens | Header, perfil |
| 9 | StatCard | Card, Badge | Dashboard, validar composicao |
| 10 | PageHeader | Button | Padrao de pagina |
| 11 | Sidebar | Button, Avatar | Layout, alto impacto |
| 12 | Header | Button, Avatar, Badge | Layout, complementa Sidebar |
| 13 | DataTable | Button, Badge | Listagens, complexo |
| 14 | AlertItem | Badge, Button | Notificacoes |
| 15 | DatePicker | Button, Input | Frequencia |

### Diagrama de Dependencias

```
Tokens (CSS variables)
    |
    +-- tailwind.config.js
    |
    +-- Button ----+
    |              |
    +-- Input -----+-- StatCard
    |              |
    +-- Card ------+
    |              |
    +-- Badge -----+-- AlertItem
    |              |
    +-- Avatar ----+-- Sidebar
    |              |
    +-- Label      +-- Header
                   |
                   +-- PageHeader
                   |
                   +-- DataTable
                   |
                   +-- DatePicker
```

---

## Padrao de Compatibilidade Retroativa

### Estrategia: Alias Layer

Durante a migracao, manter compatibilidade atraves de re-exports e wrappers.

**1. Re-export com deprecation warning:**

```typescript
// components/dashboard/stats-card.tsx (arquivo antigo)
import { StatsCard } from '@/components/patterns/StatCard';

/**
 * @deprecated Use `import { StatCard } from '@/components/patterns/StatCard'` instead.
 * This alias will be removed in v2.0.
 */
export { StatsCard as StatsCard };
```

**2. Wrapper com props mapping:**

Se a API mudou, criar wrapper que mapeia props antigas para novas:

```typescript
// components/_deprecated/OldButton.tsx
import { Button, type ButtonProps } from '@/components/ui/button';

interface OldButtonProps {
  primary?: boolean;  // API antiga
  children: React.ReactNode;
}

/**
 * @deprecated Use `Button variant="primary"` instead.
 */
export function OldButton({ primary, children, ...props }: OldButtonProps) {
  return (
    <Button variant={primary ? 'primary' : 'secondary'} {...props}>
      {children}
    </Button>
  );
}
```

**3. Coexistencia de estilos:**

Tokens novos NAO devem conflitar com estilos existentes:

```css
/* globals.css - tokens novos */
:root {
  /* Novos tokens com prefixo educa- */
  --educa-color-primary: 5 150 105;

  /* Manter tokens antigos funcionando */
  --fronteira-primary: 200 100% 34%;
}
```

### Processo de Deprecacao

```
1. Criar novo componente em patterns/ ou ui/
2. Adicionar re-export no arquivo antigo com @deprecated
3. Atualizar 2-3 usos para validar
4. Rodar grep para encontrar todos usos
5. Migrar todos usos em batch
6. Mover arquivo antigo para _deprecated/
7. Apos 1 sprint sem uso, deletar
```

### Ferramentas de Migracao

```bash
# Encontrar usos de componente antigo
grep -r "from '@/components/dashboard/stats-card'" --include="*.tsx"

# Encontrar imports de ui/ que precisam atualizacao
grep -r "from '@/components/ui'" --include="*.tsx" | grep -v "index"
```

---

## Anti-Padroes a Evitar

### 1. Big Bang Migration

**Problema:** Tentar migrar tudo de uma vez.

**Por que e ruim:**
- Alto risco de regressoes
- Dificil testar completamente
- Bloqueia desenvolvimento de features

**Solucao:** Strangler Fig - migrar incrementalmente.

### 2. Tokens Duplicados

**Problema:** Definir mesma cor em CSS variables E tailwind config separadamente.

**Por que e ruim:**
- Valores podem divergir
- Mudanca em um nao reflete no outro
- Manutencao duplicada

**Solucao:** Tailwind config REFERENCIA CSS variables.

```javascript
// tailwind.config.js
colors: {
  primary: 'rgb(var(--educa-color-primary) / <alpha-value>)',
}
```

### 3. Componentes Muito Genericos

**Problema:** Criar "SuperCard" que faz tudo.

**Por que e ruim:**
- API complexa com muitas props
- Dificil de manter
- Performance ruim

**Solucao:** Componentes especializados (StatCard, ProfileCard, TurmaCard).

### 4. Estilos Inline em Componentes

**Problema:** `style={{ color: '#059669' }}` em vez de tokens.

**Por que e ruim:**
- Nao respeita tema
- Impossivel mudar globalmente
- Nao type-safe

**Solucao:** Sempre usar tokens via classes ou CSS variables.

---

## Consideracoes de Performance

### 1. CSS Variables sao Eficientes

CSS variables sao resolvidas em tempo de renderizacao pelo browser, sem overhead de JavaScript. Mudar tema e instantaneo.

### 2. Tree Shaking de Componentes

Estrutura de barrel exports permite tree shaking:

```typescript
// BOM: importa so o que usa
import { Button } from '@/components/ui/button';

// EVITAR: importa tudo
import * as UI from '@/components/ui';
```

### 3. CVA e Otimizado

Class Variance Authority gera classes em build time, sem overhead runtime.

---

## Metricas de Sucesso

| Metrica | Baseline (atual) | Meta |
|---------|------------------|------|
| Componentes usando tokens | 0% | 100% |
| Cores hardcoded | ~50+ ocorrencias | 0 |
| Bundle size | Medir atual | Igual ou menor |
| Lighthouse Accessibility | Medir atual | >= 90 |
| Tempo de migracao por tela | - | < 4 horas |

---

## Fontes Consultadas

### Primarias (ALTA confianca)
- [Tailwind CSS Theme Variables](https://tailwindcss.com/docs/theme) - Documentacao oficial
- [shadcn/ui](https://ui.shadcn.com/) - Arquitetura de componentes
- [Tailwind CSS 4 @theme Guide](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06) - Design tokens modernos

### Secundarias (MEDIA confianca)
- [Strangler Fig Pattern - Azure](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig) - Padrao de migracao
- [Strangler Pattern for Frontend](https://medium.com/@felipegaiacharly/strangler-pattern-for-frontend-865e9a5f700f) - Aplicacao em frontend
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/chapter-2/) - Brad Frost

### Terciarias (BAIXA confianca - validar em implementacao)
- [Design Tokens with shadcn/ui](https://shadisbaih.medium.com/building-a-scalable-design-system-with-shadcn-ui-tailwind-css-and-design-tokens-031474b03690)
- [Atomic Design in React](https://www.andela.com/blog-posts/structuring-your-react-application-atomic-design-principles)

---

## Implicacoes para Roadmap

### Fases Sugeridas

1. **Fase 1: Tokens e Fundacao** (1 semana)
   - Definir CSS variables
   - Atualizar tailwind.config.js
   - Sem impacto visual ainda

2. **Fase 2: Primitivos UI** (1-2 semanas)
   - Button, Input, Card, Badge, Avatar
   - Testar em componentes isolados

3. **Fase 3: Layout** (1 semana)
   - Sidebar, Header
   - Impacto visual imediato em todas paginas

4. **Fase 4: Padroes** (1 semana)
   - StatCard, PageHeader, DataTable
   - Componentes compostos

5. **Fase 5: Telas** (2 semanas)
   - Login, Dashboard, Turmas, Chamada, Aluno
   - Uma tela por vez, validar antes de prosseguir

### Dependencias Criticas

- Fase 2 depende de Fase 1 estar completa
- Fase 3 depende de Button, Avatar de Fase 2
- Fase 4 depende de Card, Badge de Fase 2
- Fase 5 depende de Fases 3 e 4

### Riscos

| Risco | Mitigacao |
|-------|-----------|
| Quebra de estilos existentes | Alias layer, testes visuais |
| Tempo maior que estimado | Buffer de 25% por fase |
| Conflito com features em desenvolvimento | Comunicar timeline, feature flags |

---

## Checklist de Qualidade

- [x] Componentes claramente definidos (Tokens > Primitivos > Padroes > Templates)
- [x] Limites explicitos (diagrama de dependencias, ordem de build)
- [x] Implicacoes de ordem de build notadas (5 fases com dependencias)
- [x] Estrategia de compatibilidade retroativa documentada
- [x] Anti-padroes identificados
- [x] Fontes citadas com niveis de confianca

---

*Pesquisa de arquitetura: 2026-01-16*
*Valido ate: 2026-02-16 (30 dias - stack estavel)*
