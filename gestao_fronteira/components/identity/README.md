# Componentes de Identidade Municipal

Este diretório contém componentes React otimizados para uso da identidade visual oficial da Prefeitura de Fronteira-MG na plataforma educacional.

## Componentes Disponíveis

### `MunicipalBrasao`
Componente para exibir o brasão oficial da prefeitura.

```tsx
import { MunicipalBrasao } from '@/components/identity/municipal-assets'

// Uso básico
<MunicipalBrasao size="md" />

// Em header principal (com prioridade de carregamento)
<MunicipalBrasao size="lg" priority />

// Com classes customizadas
<MunicipalBrasao
  size="sm"
  className="hover:scale-105 transition-transform"
/>
```

**Props:**
- `size`: 'sm' (32px), 'md' (48px), 'lg' (64px)
- `priority`: boolean - marca como prioridade para carregamento
- `className`: string - classes CSS adicionais

### `MunicipalLogo`
Componente para exibir o logo completo da prefeitura.

```tsx
import { MunicipalLogo } from '@/components/identity/municipal-assets'

// Uso em splash screen
<MunicipalLogo size="xl" priority />

// Uso responsivo em header
<div className="w-full max-w-xs">
  <MunicipalLogo size="md" className="w-full" />
</div>
```

**Props:**
- `size`: 'sm' (120x48), 'md' (200x80), 'lg' (300x120), 'xl' (400x160)
- `priority`: boolean - marca como prioridade para carregamento
- `className`: string - classes CSS adicionais

### `MunicipalHeaderIdentity`
Componente composto para headers municipais.

```tsx
import { MunicipalHeaderIdentity } from '@/components/identity/municipal-assets'

// Header completo
<MunicipalHeaderIdentity variant="full" />

// Header compacto para mobile
<MunicipalHeaderIdentity variant="compact" />

// Apenas brasão
<MunicipalHeaderIdentity
  showLogo={false}
  showBrasao={true}
  variant="compact"
/>
```

**Props:**
- `variant`: 'compact' | 'full'
- `showLogo`: boolean - exibe logo completo
- `showBrasao`: boolean - exibe brasão
- `className`: string - classes CSS adicionais

## Cores Municipais

### Uso via Classes CSS
```tsx
// Cores do brasão
<div className="bg-fronteira-red text-white">Vermelho municipal</div>
<div className="bg-fronteira-green text-white">Verde municipal</div>
<div className="bg-fronteira-blue text-white">Azul municipal</div>
<div className="bg-fronteira-yellow text-black">Amarelo municipal</div>

// Cores primárias
<div className="bg-fronteira-primary text-fronteira-primary-foreground">
  Azul primário municipal
</div>

// Cores neutras
<div className="bg-fronteira-gray-50 text-fronteira-gray-900">
  Fundo cinza municipal
</div>
```

### Uso via Hook
```tsx
import { useMunicipalColors } from '@/components/identity/municipal-assets'

function MyComponent() {
  const colors = useMunicipalColors()

  return (
    <div style={{ backgroundColor: colors.primary }}>
      Componente com cor municipal
    </div>
  )
}
```

## Diretrizes de Acessibilidade

### Texto Alternativo
Todos os componentes incluem alt text apropriado:
- **Brasão**: "Brasão da Prefeitura de Fronteira MG"
- **Logo**: "Prefeitura de Fronteira - Trabalho, Dedicação e Amor"

### Contraste de Cores
As cores municipais foram testadas para conformidade WCAG 2.1 AA:
- Razão de contraste ≥ 4.5:1 para texto normal
- Razão de contraste ≥ 3:1 para texto grande
- Combinações seguras pré-definidas nos componentes

### Responsividade
- Componentes adaptam automaticamente ao tamanho da tela
- Imagens mantêm proporção em diferentes resoluções
- Texto permanece legível em dispositivos móveis

### Performance
- Assets críticos marcados com `priority` para carregamento otimizado
- Preload configurado no layout principal
- Componentes otimizados para Next.js Image

## Exemplos de Uso

### Header Principal da Aplicação
```tsx
function AppHeader() {
  return (
    <header className="bg-fronteira-primary text-fronteira-primary-foreground">
      <div className="container mx-auto px-4 py-3">
        <MunicipalHeaderIdentity variant="full" />
      </div>
    </header>
  )
}
```

### Login Screen
```tsx
function LoginScreen() {
  return (
    <div className="min-h-screen bg-fronteira-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <MunicipalLogo size="lg" priority />
        </div>
        {/* Formulário de login */}
      </div>
    </div>
  )
}
```

### Documento PDF Official
```tsx
function OfficialDocument() {
  return (
    <div className="bg-white p-8">
      <header className="border-b border-fronteira-gray-200 pb-4 mb-6">
        <MunicipalHeaderIdentity variant="full" />
        <div className="mt-2 text-sm text-fronteira-gray-500">
          Sistema de Gestão Educacional
        </div>
      </header>
      {/* Conteúdo do documento */}
    </div>
  )
}
```

### Mobile Header Responsivo
```tsx
function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-fronteira-primary text-fronteira-primary-foreground">
      <div className="flex items-center justify-between p-4">
        <MunicipalHeaderIdentity
          variant="compact"
          showLogo={false}
          showBrasao={true}
        />
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <MenuIcon />
        </button>
      </div>
    </header>
  )
}
```

## Conformidade Legal

Estes componentes implementam a identidade visual oficial da Prefeitura Municipal de Fronteira-MG conforme diretrizes governamentais. Uso restrito a aplicações oficiais municipais.