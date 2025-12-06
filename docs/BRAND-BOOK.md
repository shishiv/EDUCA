# Brand Book - Sistema de Gestão Escolar
## Prefeitura Municipal de Fronteira/MG

> Documento de referência para padronização visual do sistema educacional.

---

## 1. Paleta de Cores

### 1.1 Cores Municipais (Primárias)

| Nome | Variável CSS | Hex | Uso |
|------|--------------|-----|-----|
| Fronteira Primary | `fronteira-primary` | `#2980B9` | Botões principais, links, destaques |
| Fronteira Green | `fronteira-green` | `#27AE60` | Sucesso, confirmações, status ativo |
| Fronteira Blue | `fronteira-blue` | `#3498DB` | Informações, gradientes secundários |
| Fronteira Gold | `fronteira-gold` | `#F39C12` | Alertas, destaques especiais |

### 1.2 Cores de Frequência

| Nome | Variável CSS | Hex | Uso |
|------|--------------|-----|-----|
| Presente | `attendance-present` | `#22C55E` | Presença confirmada |
| Ausente | `attendance-absent` | `#EF4444` | Falta |
| Justificado | `attendance-justified` | `#F59E0B` | Falta com atestado |

### 1.3 Cores de Desempenho

| Nome | Variável CSS | Hex | Uso |
|------|--------------|-----|-----|
| Excelente | `performance-excellent` | `#22C55E` | Notas ≥ 9.0 |
| Bom | `performance-good` | `#3B82F6` | Notas 7.0-8.9 |
| Regular | `performance-regular` | `#F59E0B` | Notas 5.0-6.9 |
| Insuficiente | `performance-insufficient` | `#EF4444` | Notas < 5.0 |

### 1.4 Cores por Nível Educacional

| Nível | Variável CSS | Hex |
|-------|--------------|-----|
| Ed. Infantil | `educational_level-infantil` | `#EC4899` |
| Fundamental I | `educational_level-fundamental_I` | `#8B5CF6` |
| Fundamental II | `educational_level-fundamental_II` | `#3B82F6` |
| Ensino Médio | `educational_level-medio` | `#10B981` |
| EJA | `educational_level-eja` | `#F59E0B` |

### 1.5 Escala de Cinzas

| Nome | Variável | Uso |
|------|----------|-----|
| Gray 50 | `fronteira-gray-50` | Backgrounds leves |
| Gray 100 | `fronteira-gray-100` | Cards secundários |
| Gray 200 | `fronteira-gray-200` | Bordas, separadores |
| Gray 500 | `fronteira-gray-500` | Texto secundário |
| Gray 600 | `fronteira-gray-600` | Texto de descrição |
| Gray 900 | `fronteira-gray-900` | Texto principal |

---

## 2. Tipografia

### 2.1 Fonte Principal

```css
font-family: var(--font-sans);
/* Inter, system-ui, sans-serif */
```

### 2.2 Escala de Tamanhos

| Uso | Classe | Tamanho |
|-----|--------|---------|
| Título de Página | `text-3xl font-bold` | 30px |
| Título de Seção | `text-xl font-semibold` | 20px |
| Título de Card | `text-lg font-semibold` | 18px |
| Corpo | `text-base` | 16px |
| Labels | `text-sm font-medium` | 14px |
| Descrições | `text-sm text-gray-500` | 14px |
| Metadados | `text-xs text-gray-500` | 12px |

### 2.3 Tamanhos Educacionais (Custom)

```javascript
fontSize: {
  'edu-xs': ['0.75rem', { lineHeight: '1rem' }],
  'edu-sm': ['0.875rem', { lineHeight: '1.25rem' }],
  'edu-base': ['1rem', { lineHeight: '1.5rem' }],
  'edu-lg': ['1.125rem', { lineHeight: '1.75rem' }],
  'edu-xl': ['1.25rem', { lineHeight: '1.75rem' }],
  'edu-2xl': ['1.5rem', { lineHeight: '2rem' }],
}
```

---

## 3. Componentes Visuais

### 3.1 Botões

#### Primário
```tsx
<Button className="bg-gradient-to-r from-fronteira-primary to-fronteira-blue hover:from-fronteira-primary/90 hover:to-fronteira-blue/90 text-white">
  Ação Principal
</Button>
```

#### Secundário/Outline
```tsx
<Button variant="outline" className="border-fronteira-primary text-fronteira-primary hover:bg-fronteira-primary/10">
  Ação Secundária
</Button>
```

#### Destrutivo
```tsx
<Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
  Excluir
</Button>
```

### 3.2 Cards

#### Card Padrão
```tsx
<Card className="shadow-sm border bg-white">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

#### Card com Destaque (Dashboard)
```tsx
<Card className="group hover:shadow-xl transition-all duration-300 bg-[cor]-50 border border-transparent hover:border-[cor]-300 shadow-lg">
  ...
</Card>
```

### 3.3 Badges de Status

```tsx
// Ativo/Sucesso
<Badge className="bg-green-100 text-green-800">Ativo</Badge>

// Inativo/Secundário
<Badge variant="secondary">Inativo</Badge>

// Alerta
<Badge className="bg-amber-100 text-amber-800">Alerta</Badge>

// Erro/Risco
<Badge className="bg-red-100 text-red-800">Crítico</Badge>
```

---

## 4. Layouts de Página

### 4.1 Páginas de Listagem (Dashboard)

Estrutura padrão:
1. `PageHeader` - Título + descrição + ações
2. `StatsBar` - Estatísticas rápidas
3. `Card` com `InlineFilters` + `Table`

```tsx
<div className="space-y-6">
  <PageHeader
    title="[Entidade]s"
    description="Gerencie [descrição]"
    actions={<>...</>}
  />

  <StatsBar stats={[...]} />

  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">[Entidade]s ({count})</CardTitle>
      <InlineFilters ... />
    </CardHeader>
    <CardContent className="pt-0">
      <Table>...</Table>
    </CardContent>
  </Card>
</div>
```

### 4.2 Páginas Públicas (Auth)

Estrutura padrão:
1. Background com gradiente municipal
2. Logo/Brasão centralizado
3. Card com formulário

```tsx
<div className="min-h-screen relative overflow-hidden">
  {/* Background */}
  <div className="absolute inset-0 bg-gradient-to-br from-fronteira-primary/8 via-white to-fronteira-green/6">
    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(...)]" />
  </div>

  {/* Content */}
  <div className="relative flex items-center justify-center min-h-screen px-4 py-8">
    <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm ring-1 ring-black/5">
      ...
    </Card>
  </div>
</div>
```

### 4.3 Loading States

```tsx
// Skeleton para tabelas
<div className="animate-pulse">
  <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
  {[...Array(5)].map((_, i) => (
    <div key={i} className="h-16 bg-gray-200 rounded mb-2" />
  ))}
</div>

// Skeleton para cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {[...Array(4)].map((_, i) => (
    <div key={i} className="animate-pulse">
      <div className="bg-gray-200 h-32 rounded-lg" />
    </div>
  ))}
</div>
```

---

## 5. Identidade Municipal

### 5.1 Componentes Oficiais

```tsx
import { MunicipalLogo, MunicipalBrasao, MunicipalHeaderIdentity } from '@/components/identity/municipal-assets'

// Logo da prefeitura
<MunicipalLogo size="md" priority />

// Brasão oficial
<MunicipalBrasao size="lg" />

// Header com identidade completa
<MunicipalHeaderIdentity showName showSlogan />
```

### 5.2 Textos Institucionais

| Contexto | Texto |
|----------|-------|
| Nome do Sistema | "Sistema de Gestão Escolar" |
| Secretaria | "Secretaria Municipal de Educação" |
| Município | "Fronteira/MG" |
| Copyright | "© 2025 Prefeitura de Fronteira/MG" |

---

## 6. Responsividade

### 6.1 Breakpoints

| Nome | Largura | Uso |
|------|---------|-----|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop grande |

### 6.2 Grid Patterns

```tsx
// Cards de estatísticas
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Cards de dashboard
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

// Quick access (6 itens)
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
```

---

## 7. Acessibilidade

### 7.1 Contraste de Cores

- Texto sobre fundo claro: mínimo `gray-600` (#4B5563)
- Texto sobre fundo colorido: sempre `white` ou `gray-900`
- Links: usar `fronteira-primary` com `:hover` e `:focus` states

### 7.2 Focus States

```css
focus:ring-4 focus:ring-fronteira-primary/10 focus:border-fronteira-primary
```

### 7.3 Labels Semânticos

- Todos os inputs devem ter `<Label>` associado
- Usar `aria-label` para ícones de ação
- Tabelas devem ter `<TableHead>` descritivo

---

## 8. Animações e Transições

### 8.1 Transições Padrão

```css
transition-all duration-200    /* Geral */
transition-colors duration-200 /* Hover em cores */
hover:scale-105               /* Cards clicáveis */
hover:-translate-y-0.5        /* Elevação sutil */
```

### 8.2 Loading Animation

```css
animate-pulse  /* Skeletons */
animate-spin   /* Spinners */
```

---

## 9. Iconografia

### 9.1 Biblioteca

Usar **Lucide React** para todos os ícones.

```tsx
import { Users, School, GraduationCap, ... } from 'lucide-react'
```

### 9.2 Tamanhos Padrão

| Contexto | Classe |
|----------|--------|
| Inline com texto | `h-4 w-4` |
| Botões | `h-5 w-5` |
| Cards/Destaques | `h-6 w-6` |
| Headers grandes | `h-10 w-10` |

### 9.3 Ícones por Contexto

| Contexto | Ícone |
|----------|-------|
| Alunos | `Users` |
| Escolas | `School` |
| Turmas | `GraduationCap` ou `BookOpen` |
| Frequência | `CheckSquare` ou `Calendar` |
| Matrículas | `FileText` ou `UserCheck` |
| Configurações | `Settings` |
| Relatórios | `BarChart3` |
| Alertas | `AlertCircle` |
| Sucesso | `CheckCircle` |

---

## 10. Checklist de Padronização

Antes de criar/modificar uma página, verificar:

- [ ] Usando cores do design system (`fronteira-*`, `attendance-*`)
- [ ] Título com `PageHeader` (páginas de listagem)
- [ ] Loading state implementado com skeleton
- [ ] Responsivo em mobile (testar 375px)
- [ ] Filtros com `InlineFilters` (quando aplicável)
- [ ] Empty states com `TableEmptyState` ou `EmptyState`
- [ ] Ícones consistentes com a tabela acima
- [ ] Transições suaves em hover/focus
- [ ] Textos institucionais corretos
- [ ] Acessibilidade verificada (labels, contraste)

---

**Versão:** 1.0
**Última atualização:** 2025-12-05
**Mantido por:** Equipe de Desenvolvimento
