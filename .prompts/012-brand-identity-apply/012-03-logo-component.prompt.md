# 012-03: Logo Component - Nova Identidade

**Fase:** 3 de 5
**Tipo:** DO (Implementation)
**Dependências:** 012-01, 012-02

## Objetivo

Reescrever o componente de logo para refletir a nova identidade visual: texto "EDUCA" em Lexend Bold com gradiente verde→azul e underline amarelo curvo.

## Contexto

Referência: `educa-brand-guidelines.html` - Seção 01: Logo

### Especificações do Logo

- **Texto:** "EDUCA" em Lexend Bold (700)
- **Gradiente:** #059669 (verde) → #0ea5e9 (azul), horizontal
- **Underline:** Curva amarela (#fcd34d), stroke-width 3.5px
- **Área de proteção:** Altura da letra "E" ao redor

### Versões

1. **Principal** - Gradiente + underline amarelo
2. **Fundos escuros** - Gradiente claro (#34d399 → #38bdf8)
3. **Monocromático verde** - #059669 solid
4. **Monocromático escuro** - #1e293b solid
5. **Monocromático branco** - #ffffff solid

## Tarefas

### 1. Criar novo logo SVG como componente

Criar `gestao_fronteira/components/identity/educa-logo-v2.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'

interface EducaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'dark-bg' | 'mono-green' | 'mono-dark' | 'mono-white'
  showUnderline?: boolean
  className?: string
}

const sizeConfig = {
  xs: { height: 24, viewBox: '0 0 120 36' },
  sm: { height: 32, viewBox: '0 0 150 44' },
  md: { height: 40, viewBox: '0 0 180 52' },
  lg: { height: 56, viewBox: '0 0 180 52' },
  xl: { height: 80, viewBox: '0 0 180 52' },
}

const gradientConfigs = {
  default: { start: '#059669', end: '#0ea5e9' },
  'dark-bg': { start: '#34d399', end: '#38bdf8' },
  'mono-green': { start: '#059669', end: '#059669' },
  'mono-dark': { start: '#1e293b', end: '#1e293b' },
  'mono-white': { start: '#ffffff', end: '#ffffff' },
}

export function EducaLogo({
  size = 'md',
  variant = 'default',
  showUnderline = true,
  className,
}: EducaLogoProps) {
  const config = sizeConfig[size]
  const colors = gradientConfigs[variant]
  const gradientId = `educa-gradient-${variant}`

  return (
    <svg
      viewBox={config.viewBox}
      height={config.height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="EDUCA Logo"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>

      {/* EDUCA Text */}
      <text
        x="5"
        y="36"
        fontFamily="Lexend, sans-serif"
        fontWeight="700"
        fontSize="40"
        fill={`url(#${gradientId})`}
      >
        EDUCA
      </text>

      {/* Underline Squiggle */}
      {showUnderline && (
        <path
          d="M8 46 Q40 51 75 46 Q110 41 146 46"
          stroke="#fcd34d"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  )
}

// Convenience exports
export function EducaLogoLight(props: Omit<EducaLogoProps, 'variant'>) {
  return <EducaLogo {...props} variant="dark-bg" />
}

export function EducaLogoIcon({ size = 32 }: { size?: number }) {
  // Icon-only version (just the "E" with gradient)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EDUCA"
    >
      <defs>
        <linearGradient id="educa-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#educa-icon-gradient)" />
      <text
        x="12"
        y="33"
        fontFamily="Lexend, sans-serif"
        fontWeight="700"
        fontSize="28"
        fill="white"
      >
        E
      </text>
    </svg>
  )
}
```

### 2. Criar componente de co-branding

Para uso com a Prefeitura de Fronteira:

```tsx
export function EducaLogoWithPrefeitura({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <EducaLogo size={size} />
      <div className="w-px h-12 bg-gray-300" />
      <div className="flex items-center gap-2">
        <Image
          src="/logo_pref.png"
          alt="Brasão de Fronteira"
          width={36}
          height={36}
        />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-700">PREFEITURA DE</span>
          <span className="text-sm font-bold text-indigo-800">FRONTEIRA</span>
        </div>
      </div>
    </div>
  )
}
```

### 3. Atualizar exports

Atualizar ou criar `gestao_fronteira/components/identity/index.ts`:

```tsx
export { EducaLogo, EducaLogoLight, EducaLogoIcon, EducaLogoWithPrefeitura } from './educa-logo-v2'
```

### 4. Migrar usos existentes

Buscar e substituir usos do logo antigo pelo novo componente.

## Verificação

- [ ] Logo renderiza corretamente em todos os tamanhos
- [ ] Gradiente funciona
- [ ] Underline amarelo aparece
- [ ] Versões para fundos escuros funcionam
- [ ] Co-branding com Prefeitura funciona
- [ ] Fonte Lexend carrega no SVG

## Arquivos a Criar/Modificar

1. `gestao_fronteira/components/identity/educa-logo-v2.tsx` (criar)
2. `gestao_fronteira/components/identity/index.ts` (criar/atualizar)
3. Páginas que usam o logo antigo (atualizar imports)
