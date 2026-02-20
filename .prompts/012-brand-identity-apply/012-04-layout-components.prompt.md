# 012-04: Layout Components - Sidebar e Header

**Fase:** 4 de 5
**Tipo:** DO (Implementation)
**Dependências:** 012-01, 012-02, 012-03

## Objetivo

Atualizar os componentes de layout (sidebar e header) para refletir o design dos mockups em `educa-ui-mockups.html`.

## Contexto

Referência: `educa-ui-mockups.html` - Layout comum a todas as telas internas

### Especificações do Layout

**Sidebar (260px):**
- Background branco
- Borda direita: 1px solid gray-200
- Logo no topo com padding 24px
- Navegação com seções separadas
- Ícones 20x20, stroke-width 2
- Item ativo: bg-green-50, text-green-600
- Badge de notificação: bg-pink-400, border-radius 10px
- User card no footer com avatar gradiente

**Header (70px):**
- Background branco
- Borda inferior: 1px solid gray-200
- Page title à esquerda (Lexend, 1.25rem, 600)
- Breadcrumbs (0.85rem, gray-500)
- Search box à direita (280px, bg-gray-50)
- Notification button com dot indicator

## Tarefas

### 1. Atualizar Sidebar

Modificar `gestao_fronteira/components/layout/sidebar.tsx` ou `enhanced-sidebar.tsx`:

```tsx
// Estrutura de navegação conforme mockups
const navSections = [
  {
    title: 'Menu',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Minhas Turmas', href: '/dashboard/turmas', icon: Users },
      { name: 'Chamada', href: '/dashboard/frequencia', icon: CheckCircle, badge: 2 },
      { name: 'Diário de Classe', href: '/dashboard/diario', icon: FileText },
      { name: 'Notas', href: '/dashboard/notas', icon: BarChart3 },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { name: 'Alunos', href: '/dashboard/alunos', icon: User },
      { name: 'Responsáveis', href: '/dashboard/responsaveis', icon: UserPlus },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      { name: 'Frequência', href: '/relatorios/frequencia', icon: Download },
      { name: 'Bolsa Família', href: '/relatorios/bolsa-familia', icon: Calendar },
    ],
  },
]
```

**Estilos a aplicar:**

```tsx
// Sidebar container
<aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col h-screen fixed">

// Logo area
<div className="p-6 border-b border-gray-100">
  <EducaLogo size="sm" />
</div>

// Nav section title
<p className="text-[0.7rem] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
  {section.title}
</p>

// Nav item (inactive)
<a className="flex items-center gap-3 px-3 py-3 rounded-[10px] text-gray-600 text-[0.9rem] font-medium hover:bg-gray-50 hover:text-gray-800 transition-colors">

// Nav item (active)
<a className="flex items-center gap-3 px-3 py-3 rounded-[10px] bg-green-50 text-green-600 text-[0.9rem] font-medium">

// Badge
<span className="ml-auto bg-pink-400 text-white text-[0.7rem] font-semibold px-2 py-0.5 rounded-[10px]">

// User card
<div className="p-4 border-t border-gray-100">
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-400 rounded-[10px] flex items-center justify-center text-white font-semibold text-sm">
      {initials}
    </div>
    <div>
      <p className="font-semibold text-[0.85rem] text-gray-800">{name}</p>
      <p className="text-[0.75rem] text-gray-500">{role}</p>
    </div>
  </div>
</div>
```

### 2. Atualizar Header

Modificar `gestao_fronteira/components/layout/header.tsx`:

```tsx
export function Header() {
  return (
    <header className="h-[70px] bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-50">
      {/* Left side */}
      <div className="flex items-center gap-6">
        <h1 className="font-display text-[1.25rem] font-semibold text-gray-800">
          {pageTitle}
        </h1>
        {breadcrumbs && (
          <nav className="flex items-center gap-2 text-[0.85rem] text-gray-500">
            {breadcrumbs.map((item, i) => (
              <>
                {i > 0 && <span>›</span>}
                {item.href ? (
                  <Link href={item.href} className="hover:text-green-600">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </>
            ))}
          </nav>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Search box */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[10px] w-[280px]">
          <Search className="w-[18px] h-[18px] text-gray-400" />
          <input
            type="text"
            placeholder="Buscar aluno, turma..."
            className="bg-transparent border-none outline-none text-[0.9rem] text-gray-800 w-full placeholder:text-gray-400"
          />
        </div>

        {/* Notification button */}
        <button className="w-10 h-10 bg-gray-50 rounded-[10px] flex items-center justify-center text-gray-600 hover:bg-gray-100 relative">
          <Bell className="w-5 h-5" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-pink-400 rounded-full border-2 border-white" />
          )}
        </button>
      </div>
    </header>
  )
}
```

### 3. Atualizar App Layout

Modificar `gestao_fronteira/app/(dashboard)/layout.tsx`:

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen bg-gray-100">
        <Header />
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
```

## Verificação

- [ ] Sidebar com 260px de largura
- [ ] Header com 70px de altura
- [ ] Logo novo no topo da sidebar
- [ ] Navegação com ícones e badges
- [ ] Item ativo com estilo correto (green-50/green-600)
- [ ] User card no footer da sidebar
- [ ] Search box no header
- [ ] Notification button com dot
- [ ] Responsividade mobile mantida

## Arquivos a Modificar

1. `gestao_fronteira/components/layout/sidebar.tsx` ou `enhanced-sidebar.tsx`
2. `gestao_fronteira/components/layout/header.tsx`
3. `gestao_fronteira/app/(dashboard)/layout.tsx`
