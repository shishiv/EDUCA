# 012-05: Pages Implementation - Aplicar UI Mockups

**Fase:** 5 de 5
**Tipo:** DO (Implementation)
**Dependências:** 012-01, 012-02, 012-03, 012-04

## Objetivo

Aplicar os mockups de UI às páginas existentes do projeto, mantendo a funcionalidade atual mas atualizando o visual para o novo design system.

## Contexto

Referência: `educa-ui-mockups.html` - 5 telas: Login, Dashboard, Turmas, Chamada, Perfil Aluno

## Sub-tarefas (podem ser executadas em paralelo)

---

### 012-05a: Login Page

**Arquivo:** `gestao_fronteira/app/(auth)/login/page.tsx`

**Design:** Split-screen layout
- Esquerda: Gradiente verde→azul, features list, decoração circular
- Direita: Formulário de login com logo

```tsx
// Layout principal
<div className="min-h-screen grid grid-cols-2">
  {/* Left Panel - Hero */}
  <div className="bg-gradient-to-br from-green-600 to-blue-500 p-15 flex flex-col justify-center relative overflow-hidden">
    {/* Decorative circles */}
    <div className="absolute -top-1/5 -right-1/5 w-3/5 h-3/5 bg-white/10 rounded-full" />
    <div className="absolute -bottom-1/10 -left-1/10 w-2/5 h-2/5 bg-white/5 rounded-full" />

    <h1 className="font-display text-5xl font-bold text-white mb-4 relative z-10">
      Bem-vindo ao EDUCA
    </h1>
    <p className="text-lg text-white/85 max-w-md relative z-10">
      O sistema que simplifica a gestão escolar da rede municipal de Fronteira, MG.
    </p>

    {/* Features */}
    <div className="mt-12 space-y-4 relative z-10">
      {features.map(f => (
        <div className="flex items-center gap-3 text-white/90">
          <div className="w-9 h-9 bg-white/20 rounded-[10px] flex items-center justify-center">
            <f.icon className="w-5 h-5" />
          </div>
          <span>{f.text}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Right Panel - Form */}
  <div className="bg-white p-15 flex items-center justify-center">
    <div className="w-full max-w-[380px]">
      <div className="mb-10 text-center">
        <EducaLogo size="lg" />
      </div>

      <h2 className="font-display text-2xl font-semibold text-gray-800 mb-2">
        Entrar no sistema
      </h2>
      <p className="text-gray-500 mb-8">Digite suas credenciais para acessar</p>

      {/* Form fields with new styles */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
          <input className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 transition-all" />
        </div>
        {/* ... */}
      </div>

      {/* Submit button */}
      <button className="w-full mt-6 py-3.5 px-6 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-xl shadow-lg shadow-green-600/30 hover:shadow-xl hover:-translate-y-0.5 transition-all">
        Entrar
      </button>

      <p className="mt-8 text-center text-sm text-gray-400">
        Secretaria Municipal de Educação — Fronteira, MG
      </p>
    </div>
  </div>
</div>
```

---

### 012-05b: Dashboard Page

**Arquivo:** `gestao_fronteira/app/(dashboard)/dashboard/page.tsx`

**Design:** Stats grid + two-column layout

```tsx
// Stats Grid (4 columns)
<div className="grid grid-cols-4 gap-5 mb-8">
  <StatCard
    icon={Users}
    iconBg="bg-green-100"
    iconColor="text-green-600"
    value="127"
    label="Alunos nas suas turmas"
    change="+12"
    changeType="up"
  />
  {/* ... more stats */}
</div>

// Two-column layout
<div className="grid grid-cols-[2fr_1fr] gap-6">
  {/* Turmas Card */}
  <Card>
    <CardHeader className="flex justify-between items-center border-b border-gray-100 px-6 py-5">
      <h3 className="font-display font-semibold">Minhas Turmas</h3>
      <Link className="text-sm text-green-600 font-medium hover:underline">Ver todas →</Link>
    </CardHeader>
    <CardContent className="p-6">
      {turmas.map(t => (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-3 hover:bg-green-50 cursor-pointer transition-colors">
          <div className="w-2 h-12 rounded bg-green-500" />
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{t.name}</p>
            <p className="text-sm text-gray-500">{t.turno} • {t.escola}</p>
          </div>
          <div className="text-right">
            <p className="font-display font-semibold text-gray-800">{t.alunos}</p>
            <p className="text-xs text-gray-500">alunos</p>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>

  {/* Alerts Card */}
  <Card>
    <CardHeader className="border-b border-gray-100 px-6 py-5">
      <h3 className="font-display font-semibold">Alertas</h3>
    </CardHeader>
    <CardContent className="p-6 space-y-3">
      <Alert variant="warning">
        <AlertIcon />
        <span><strong>João Silva</strong> está com 78% de frequência (Bolsa Família)</span>
      </Alert>
      {/* ... more alerts */}
    </CardContent>
  </Card>
</div>
```

---

### 012-05c: Turmas Page

**Arquivo:** `gestao_fronteira/app/(dashboard)/dashboard/turmas/page.tsx`

**Design:** Grid de cards (3 colunas)

```tsx
// Page header
<div className="flex justify-between items-center mb-6">
  <h1 className="font-display text-2xl font-bold text-gray-800">Ano Letivo 2024</h1>
  <Button variant="secondary">
    <Plus className="w-4 h-4 mr-2" />
    Nova Turma
  </Button>
</div>

// Turmas grid
<div className="grid grid-cols-3 gap-5">
  {turmas.map(t => (
    <Card className="overflow-hidden hover:border-green-300 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
      <div className="p-5 bg-gradient-to-br from-green-50 to-blue-50 border-b border-gray-100">
        <h3 className="font-display text-lg font-semibold text-gray-800">{t.name}</h3>
        <p className="text-sm text-gray-500">{t.turno} • {t.escola}</p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="font-display text-xl font-bold text-gray-800">{t.alunos}</p>
            <p className="text-xs text-gray-500 uppercase">Alunos</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-green-600">{t.frequencia}%</p>
            <p className="text-xs text-gray-500 uppercase">Frequência</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-gray-800">{t.media}</p>
            <p className="text-xs text-gray-500 uppercase">Média</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1">Fazer Chamada</Button>
          <Button size="sm" variant="secondary" className="flex-1">Ver Alunos</Button>
        </div>
      </div>
    </Card>
  ))}
</div>
```

---

### 012-05d: Chamada/Frequência Page

**Arquivo:** `gestao_fronteira/app/(dashboard)/dashboard/frequencia/page.tsx`

**Design:** Header com info + tabela de chamada

```tsx
// Chamada header
<div className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 flex justify-between items-center">
  <div>
    <h2 className="font-display text-xl font-semibold text-gray-800">3º Ano A — Chamada</h2>
    <p className="text-gray-500">EM Marechal Castelo Branco • Turno: Manhã</p>
  </div>
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[10px]">
      <Calendar className="w-4 h-4" />
      <span className="text-sm text-gray-700">13 de Dezembro, 2024</span>
    </div>
  </div>
</div>

// Attendance table
<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
  <div className="grid grid-cols-[60px_1fr_120px_120px_120px_100px] px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
    <span>Nº</span>
    <span>Aluno</span>
    <span>1ª Aula</span>
    <span>2ª Aula</span>
    <span>3ª Aula</span>
    <span>Freq.</span>
  </div>

  {alunos.map((aluno, i) => (
    <div className="grid grid-cols-[60px_1fr_120px_120px_120px_100px] px-6 py-4 border-b border-gray-100 items-center hover:bg-gray-50">
      <span className="font-semibold text-gray-400 text-sm">{String(i+1).padStart(2, '0')}</span>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-gray-200 flex items-center justify-center font-semibold text-sm text-gray-600">
          {aluno.initials}
        </div>
        <span className="font-medium text-gray-800">{aluno.name}</span>
      </div>
      <AttendanceButton status={aluno.aula1} />
      <AttendanceButton status={aluno.aula2} />
      <AttendanceButton status={aluno.aula3} />
      <span className={cn(
        "font-semibold",
        aluno.freq >= 90 ? "text-green-600" :
        aluno.freq >= 80 ? "text-amber-600" : "text-red-600"
      )}>
        {aluno.freq}%
      </span>
    </div>
  ))}
</div>

// AttendanceButton component
function AttendanceButton({ status }) {
  const styles = {
    present: 'bg-green-100 border-green-400 text-green-600',
    absent: 'bg-red-50 border-red-300 text-red-600',
    justified: 'bg-yellow-100 border-yellow-400 text-amber-600',
    none: 'bg-white border-gray-200 text-gray-500',
  }

  return (
    <button className={cn(
      "px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all",
      styles[status]
    )}>
      {status === 'present' ? 'Presente' :
       status === 'absent' ? 'Falta' :
       status === 'justified' ? 'Justif.' : '—'}
    </button>
  )
}
```

---

### 012-05e: Perfil do Aluno

**Arquivo:** `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/page.tsx`

**Design:** Header com avatar + grid de cards

```tsx
// Profile header
<div className="bg-white rounded-2xl p-8 mb-6 border border-gray-200 flex gap-8">
  <div className="w-[120px] h-[120px] rounded-[20px] bg-gradient-to-br from-green-400 to-blue-400 flex items-center justify-center text-white font-display text-4xl font-bold">
    {initials}
  </div>

  <div className="flex-1">
    <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">{aluno.nome}</h1>
    <p className="text-gray-500 mb-4">Matrícula: {aluno.matricula} • Nascimento: {aluno.nascimento}</p>
    <div className="flex gap-2">
      <span className="px-3 py-1.5 bg-green-100 text-green-600 rounded-lg text-sm font-medium">{aluno.turma}</span>
      <span className="px-3 py-1.5 bg-blue-100 text-blue-500 rounded-lg text-sm font-medium">{aluno.turno}</span>
      {aluno.bolsaFamilia && (
        <span className="px-3 py-1.5 bg-yellow-100 text-amber-600 rounded-lg text-sm font-medium">Bolsa Família</span>
      )}
    </div>
  </div>

  <div className="flex flex-col gap-3">
    <div className="text-center px-6 py-4 bg-gray-50 rounded-xl">
      <p className="font-display text-2xl font-bold text-green-600">{aluno.frequencia}%</p>
      <p className="text-xs text-gray-500">Frequência</p>
    </div>
    <div className="text-center px-6 py-4 bg-gray-50 rounded-xl">
      <p className="font-display text-2xl font-bold text-gray-800">{aluno.media}</p>
      <p className="text-xs text-gray-500">Média Geral</p>
    </div>
  </div>
</div>

// Info grid (2 columns)
<div className="grid grid-cols-2 gap-6">
  <Card>
    <CardHeader>
      <h3 className="font-display font-semibold">Dados Pessoais</h3>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <InfoItem label="Nome Completo" value={aluno.nome} />
        <InfoItem label="CPF" value={aluno.cpf} />
        {/* ... */}
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="flex justify-between items-center">
      <h3 className="font-display font-semibold">Responsáveis</h3>
      <Link className="text-sm text-green-600 font-medium">Adicionar →</Link>
    </CardHeader>
    <CardContent>
      {/* ... */}
    </CardContent>
  </Card>
</div>
```

## Verificação

- [ ] Login page com split-screen design
- [ ] Dashboard com stats grid e layout de 2 colunas
- [ ] Turmas page com grid de cards
- [ ] Chamada page com tabela interativa
- [ ] Perfil do aluno com header e info cards
- [ ] Todos os estilos seguindo brand guidelines
- [ ] Responsividade mantida
- [ ] Funcionalidade existente preservada

## Arquivos a Modificar

1. `gestao_fronteira/app/(auth)/login/page.tsx`
2. `gestao_fronteira/app/(dashboard)/dashboard/page.tsx`
3. `gestao_fronteira/app/(dashboard)/dashboard/turmas/page.tsx`
4. `gestao_fronteira/app/(dashboard)/dashboard/frequencia/page.tsx`
5. `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/page.tsx`
6. Componentes auxiliares conforme necessário
