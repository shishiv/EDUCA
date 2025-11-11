# Guia de Migração - Gestão Fronteira 🔄

**Data**: 2025-01-11
**Versão**: 1.0.0
**Status**: Production Ready

## Visão Geral

Este guia documenta as mudanças críticas e breaking changes introduzidas na versão atual do Gestão Fronteira. Desenvolvedores que trabalham com código anterior devem seguir este guia para atualizar suas implementações.

---

## 📋 Mudanças Principais

### 1. Imports do Supabase Client

**O que mudou**: Centralização do client Supabase usando factory pattern

#### Antes (DEPRECATED)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

#### Depois (NOVO PADRÃO)
```typescript
// Para Server Actions / Server Components
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()

// Para Client Components
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

**Por quê?**
- Centraliza configuração em um único lugar
- Garante consistência de inicialização
- Facilita manutenção e testes
- Permite injeção de dependências

**Arquivos afetados**:
- `lib/supabase/server.ts` - Factory para Server Side
- `lib/supabase/client.ts` - Factory para Client Side

---

### 2. Sistema de Logging Centralizado

**O que mudou**: Substituição de `console.log/error` por `logger` estruturado

#### Antes (DEPRECATED)
```typescript
console.error('Erro ao buscar escolas:', error)
console.log('Escolas carregadas:', data)
```

#### Depois (NOVO PADRÃO)
```typescript
import { logger } from '@/lib/logger'

logger.error('Erro ao buscar escolas', error, {
  feature: 'schools',
  action: 'fetch_list',
  schoolId: 123
})

logger.info('Escolas carregadas', {
  feature: 'schools',
  count: 15
})
```

**Assinatura da função logger**:
```typescript
logger.error(message: string, error: Error, metadata?: Record<string, any>)
logger.info(message: string, metadata?: Record<string, any>)
logger.warn(message: string, metadata?: Record<string, any>)
logger.debug(message: string, metadata?: Record<string, any>)
```

**Por quê?**
- Logs estruturados e pesquisáveis
- Contexto completo em cada erro
- Facilita debugging em produção
- Suporta integração com ferramentas de monitoramento

**Arquivos já corrigidos**:
- ✅ `lib/api/schools.ts` (10 instâncias corrigidas)
- ✅ `lib/api/class-diary.ts` (9 instâncias corrigidas)

**Arquivos a verificar**:
- [ ] `lib/api/*.ts` - Verificar todos os arquivos de API
- [ ] `app/actions/*.ts` - Verificar server actions
- [ ] Components com console calls

---

### 3. Wizard Removido

**O que mudou**: Remoção do workflow simples de onboarding

#### Antes
```typescript
// Rota antiga - REMOVIDA
/onboarding    // OLD: simple wizard workflow
```

#### Depois
```typescript
// Novas rotas
/wizard/onboarding  // NEW: enhanced wizard (multi-step)
```

**Por quê?**
- Wizard antigo não capturava dados completos
- Novo wizard implementa workflow de 6 passos
- Melhor experiência de onboarding
- Suporte completo a dados brasileiros (CPF, telefone, etc.)

**Arquivos deletados**:
- ❌ `app/onboarding/page.tsx` (REMOVIDO)

**Arquivos novos**:
- ✅ `app/wizard/` - Novo diretório com wizard steps

**Se seu código referencia `/onboarding`**:
```typescript
// Antes (DEPRECADO)
router.push('/onboarding')

// Depois (NOVO)
router.push('/wizard/onboarding')
```

---

### 4. Login com Retry Logic

**O que mudou**: Adição de mecanismo de retry para garantir profile disponível

#### Antes
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  const result = await signIn(email, password)
  router.push('/dashboard')  // Potencial race condition
}
```

#### Depois
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  const result = await signIn(email, password)

  // Aguarda profile estar disponível (máx 5 tentativas)
  if (result.user) {
    let retries = 0
    const maxRetries = 5
    let profile = null

    while (retries < maxRetries && !profile) {
      profile = await getUserProfile(result.user.id)
      if (!profile) {
        await new Promise(resolve => setTimeout(resolve, 500))
        retries++
      }
    }
  }

  router.push('/dashboard')
}
```

**Por quê?**
- Soluciona race condition entre auth e banco
- Garante que profile existe antes de redirecionar
- Evita "blank dashboard" em carregamento lento
- Máximo 2.5 segundos de espera (500ms × 5)

**Arquivo modificado**:
- ✅ `app/(auth)/login/page.tsx`

---

### 5. Middleware de Autenticação Atualizado

**O que mudou**: Adição de `/wizard/onboarding` às rotas públicas

#### Antes
```typescript
const publicRoutes = ['/login', '/']
```

#### Depois
```typescript
const publicRoutes = ['/login', '/wizard/onboarding', '/']
```

**Arquivo modificado**:
- ✅ `lib/middleware/auth-middleware.ts`

---

## ⚠️ Breaking Changes

### 1. Imports do Supabase
- **Severidade**: HIGH
- **Impacto**: Qualquer arquivo que importe Supabase
- **Ação necessária**: Atualizar imports conforme seção #1

### 2. Console Calls
- **Severidade**: MEDIUM
- **Impacto**: Debugging e logging
- **Ação necessária**: Substituir por `logger` conforme seção #2

### 3. URL do Wizard
- **Severidade**: LOW (se estiver usando onboarding)
- **Impacto**: Links diretos para `/onboarding`
- **Ação necessária**: Atualizar para `/wizard/onboarding` conforme seção #3

---

## 🔍 Checklist de Migração

### Para Novos Arquivos de API
- [ ] Usar `createClient()` do `@/lib/supabase/server`
- [ ] Importar `logger` do `@/lib/logger`
- [ ] Usar `logger.error()` em vez de `console.error()`
- [ ] Adicionar feature context a todos os logs
- [ ] Testar com dados reais

### Para Componentes Existentes
- [ ] Verificar imports do Supabase
- [ ] Procurar por `console.log`, `console.error`
- [ ] Verificar referências a `/onboarding`
- [ ] Atualizar conforme necessário

### Para Server Actions
- [ ] Usar `createClient()` do `@/lib/supabase/server`
- [ ] Sempre incluir error handling com logger
- [ ] Incluir metadata para auditoria

---

## 📚 Exemplos de Padrões Atualizados

### Padrão 1: Buscar Dados com API
```typescript
// lib/api/students.ts
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function getStudents(schoolId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('escola_id', schoolId)

    if (error) {
      logger.error('Erro ao buscar alunos', error, {
        feature: 'students',
        action: 'fetch_list',
        schoolId
      })
      throw error
    }

    return data
  } catch (err) {
    logger.error('Exceção ao buscar alunos', err as Error, {
      feature: 'students',
      action: 'fetch_list'
    })
    throw err
  }
}
```

### Padrão 2: Server Action com Mutação
```typescript
// app/actions/student.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

export async function createStudent(data: StudentForm) {
  const supabase = createClient()

  try {
    const { data: student, error } = await supabase
      .from('alunos')
      .insert([data])
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar aluno', error, {
        feature: 'students',
        action: 'create',
        email: data.email
      })
      return { error: error.message }
    }

    logger.info('Aluno criado com sucesso', {
      feature: 'students',
      studentId: student.id,
      schoolId: data.escola_id
    })

    revalidatePath('/dashboard/alunos')
    return { data: student }
  } catch (err) {
    logger.error('Exceção ao criar aluno', err as Error, {
      feature: 'students',
      action: 'create'
    })
    return { error: 'Erro desconhecido' }
  }
}
```

### Padrão 3: Hook com Client-side Query
```typescript
// hooks/use-students.ts
'use client'

import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useQuery } from '@tanstack/react-query'

export function useStudents(schoolId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('*')
          .eq('escola_id', schoolId)

        if (error) throw error
        return data
      } catch (err) {
        logger.error('Erro ao buscar alunos', err as Error, {
          feature: 'students',
          action: 'fetch_hook',
          schoolId
        })
        throw err
      }
    }
  })
}
```

---

## 🧪 Testando Suas Mudanças

### Verificar Imports
```bash
# Procurar por imports antigos do Supabase
grep -r "from '@supabase/supabase-js'" app/ lib/ --include="*.ts" --include="*.tsx"

# Procurar por console calls
grep -r "console\.\(log\|error\|warn\)" app/ lib/ --include="*.ts" --include="*.tsx"

# Procurar por rotas antigas
grep -r "'/onboarding'" app/ lib/ --include="*.ts" --include="*.tsx"
```

### Testar Localmente
```bash
# Build de verificação
pnpm typecheck   # Verificar tipos TypeScript
pnpm lint        # Verificar linting

# Testes
pnpm test        # Testes unitários
pnpm test:e2e    # Testes end-to-end
```

---

## 📞 Suporte e Dúvidas

Se encontrar problemas durante a migração:

1. **Verifique BUGS-ANALYSIS.md** - Pode estar documentado lá
2. **Procure por exemplos** - Use `grep` para encontrar padrões similares no codebase
3. **Consulte a documentação** - Verifique `docs/API_REFERENCE.md`
4. **Crie uma issue** - Documente o problema e contexto

---

## 🔄 Histórico de Versões

### v1.0.0 (2025-01-11)
- ✅ Centralização do Supabase client
- ✅ Sistema de logging estruturado
- ✅ Remoção do wizard antigo
- ✅ Implementação de retry logic no login
- ✅ Atualização do middleware

---

**Última atualização**: 2025-01-11
**Responsável**: Gestão Fronteira Development Team
**Status**: Production Ready
