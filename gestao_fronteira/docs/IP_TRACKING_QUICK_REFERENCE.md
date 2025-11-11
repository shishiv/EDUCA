# IP Tracking Quick Reference Guide

## 🎯 TL;DR - Para Desenvolvedores

### ✅ O Que Mudou

**Antes:**
```typescript
await logAuditEvent({
  user_id: userId,
  action: 'attendance_marked',
  // ... outros dados
}) // ❌ IP será 'client-side' (inútil)
```

**Depois:**
```typescript
import { headers } from 'next/headers' // Server Actions
// OU
// const headers = request.headers  // API Routes

await logAuditEvent({
  user_id: userId,
  action: 'attendance_marked',
  // ... outros dados
}, headers) // ✅ IP real será capturado
```

---

## 📍 Onde Usar

### 1. Server Actions (`'use server'`)

```typescript
'use server'

import { headers } from 'next/headers'
import { logAuditEvent } from '@/lib/audit'

export async function myServerAction() {
  const headersList = await headers()

  // Your logic here...

  await logAuditEvent({
    // ... audit data
  }, headersList) // ⚠️ Pass headersList
}
```

### 2. API Routes

```typescript
// app/api/my-endpoint/route.ts
import { logAuditEvent } from '@/lib/audit'

export async function POST(request: Request) {
  // Your logic here...

  await logAuditEvent({
    // ... audit data
  }, request.headers) // ⚠️ Pass request.headers
}
```

### 3. Auth Events

```typescript
'use server'

import { headers } from 'next/headers'
import { logAuthEvent } from '@/lib/auth'

export async function loginAction(email: string, password: string) {
  const headersList = await headers()

  // Login logic...

  await logAuthEvent('login', userId, { email }, headersList)
  //                                            ^^^^^^^^^^^^^ Pass headers
}
```

---

## 🚫 Onde NÃO Funciona

### Client Components

```typescript
'use client'

import { logAuditEvent } from '@/lib/audit'

export function MyComponent() {
  const handleClick = async () => {
    // ❌ Não há acesso a headers no browser
    await logAuditEvent({
      // ... data
    }) // Will log as 'client-side' or 'localhost'
  }
}
```

**Solução:** Use um Server Action:

```typescript
'use client'

import { myServerAction } from '@/app/actions/my-action'

export function MyComponent() {
  const handleClick = async () => {
    // ✅ Server Action tem acesso a headers
    await myServerAction()
  }
}
```

---

## 🛠️ Funções Disponíveis

### `getClientIP(headers?: Headers): Promise<string>`

**Uso básico:**
```typescript
import { getClientIP } from '@/lib/ip-tracking'

// Server-side (com headers)
const ip = await getClientIP(request.headers)
console.log(ip) // "203.0.113.45"

// Client-side (sem headers)
const ip = await getClientIP()
console.log(ip) // "client-side" ou "localhost"
```

### `getClientInfo(headers?: Headers): Promise<ClientInfo>`

**Informações completas do cliente:**
```typescript
import { getClientInfo } from '@/lib/ip-tracking'

const info = await getClientInfo(request.headers)
console.log(info)
// {
//   ip_address: "203.0.113.45",
//   user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
//   platform: "Win32",
//   is_mobile: false,
//   browser: "Chrome",
//   timestamp: "2025-11-03T10:00:00.000Z"
// }
```

### `isPrivateIP(ip: string): boolean`

**Verificar se IP é privado:**
```typescript
import { isPrivateIP } from '@/lib/ip-tracking'

isPrivateIP('192.168.1.1')   // true
isPrivateIP('10.0.0.1')      // true
isPrivateIP('203.0.113.45')  // false
```

### `formatIPForDisplay(ip: string, maskPrivacy?: boolean): string`

**Mascarar IP para LGPD:**
```typescript
import { formatIPForDisplay } from '@/lib/ip-tracking'

// Sem mascaramento
formatIPForDisplay('192.168.1.100', false)
// "192.168.1.100"

// Com mascaramento LGPD
formatIPForDisplay('192.168.1.100', true)
// "192.168.1.***"
```

---

## 📝 Exemplos Práticos

### 1. Login com IP Tracking

```typescript
'use server'

import { headers } from 'next/headers'
import { logAuthEvent } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function loginAction(email: string, password: string) {
  const headersList = await headers()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      // Log failed login with IP
      await logAuthEvent('login_failed', undefined, {
        email,
        error: error.message
      }, headersList)

      return { success: false, error }
    }

    // Log successful login with IP
    await logAuthEvent('login', data.user.id, {
      email,
      method: 'password'
    }, headersList)

    return { success: true, user: data.user }
  } catch (error) {
    throw error
  }
}
```

### 2. Marcar Frequência com Auditoria

```typescript
'use server'

import { headers } from 'next/headers'
import { logAuditEvent } from '@/lib/audit'
import { supabase } from '@/lib/supabase'

export async function markAttendanceAction(data: {
  student_id: string
  class_id: string
  date: string
  present: boolean
}) {
  const headersList = await headers()
  const currentUserId = 'teacher-id' // Get from auth

  // Insert attendance
  const { data: result, error } = await supabase
    .from('frequencia')
    .insert({
      aluno_id: data.student_id,
      turma_id: data.class_id,
      data_aula: data.date,
      presente: data.present,
      professor_id: currentUserId
    })
    .select()
    .single()

  if (error) throw error

  // Log with IP tracking
  await logAuditEvent({
    user_id: currentUserId,
    action: 'attendance_marked',
    table_name: 'frequencia',
    record_id: result.id,
    new_values: data,
    details: {
      legal_document: true,
      is_retroactive: false
    }
  }, headersList)

  return result
}
```

### 3. API Endpoint com Rate Limiting por IP

```typescript
// app/api/export/route.ts
import { getClientInfo, getClientIdentifier } from '@/lib/ip-tracking'
import { logAuditEvent } from '@/lib/audit'

export async function POST(request: Request) {
  const clientInfo = await getClientInfo(request.headers)
  const clientId = getClientIdentifier(request.headers)

  // Rate limiting check
  if (isRateLimited(clientId)) {
    return Response.json({
      error: 'Too many requests from this IP'
    }, { status: 429 })
  }

  // Process export...
  const result = await generateExport()

  // Log export with full client info
  await logAuditEvent({
    user_id: 'current-user',
    action: 'data_exported',
    table_name: 'exports',
    record_id: result.id,
    details: {
      client_info: clientInfo,
      export_type: 'inep'
    }
  }, request.headers)

  return Response.json(result)
}
```

### 4. LGPD Data Subject Request

```typescript
'use server'

import { headers } from 'next/headers'
import { getClientInfo } from '@/lib/ip-tracking'
import { logAuditEvent } from '@/lib/audit'
import { supabase } from '@/lib/supabase'

export async function requestUserDataAction(userId: string) {
  const headersList = await headers()
  const clientInfo = await getClientInfo(headersList)

  // Get all user's data
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)

  // Log the data subject request
  await logAuditEvent({
    user_id: userId,
    action: 'data_exported',
    table_name: 'audit_logs',
    record_id: userId,
    details: {
      request_type: 'lgpd_data_subject_access',
      records_found: auditLogs?.length || 0,
      requester_ip: clientInfo.ip_address
    }
  }, headersList)

  return {
    user_id: userId,
    total_actions: auditLogs?.length || 0,
    ip_addresses_used: [...new Set(auditLogs?.map(l => l.ip_address))],
    audit_history: auditLogs
  }
}
```

---

## 🔍 Debugging

### Ver IPs nos Audit Logs

```sql
-- Últimos 10 logs com IPs
SELECT
  action,
  user_id,
  ip_address,
  user_agent,
  timestamp
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 10;
```

### Verificar se IP está sendo capturado

```typescript
import { getClientInfo } from '@/lib/ip-tracking'

// Em qualquer Server Action ou API Route
const headersList = await headers()
const info = await getClientInfo(headersList)

console.log('Client Info:', info)
// Se ip_address for 'client-side' ou 'unknown', headers não foram passados corretamente
```

### Testar Headers Disponíveis

```typescript
'use server'

import { headers } from 'next/headers'

export async function debugHeadersAction() {
  const headersList = await headers()

  const headersObj: Record<string, string> = {}
  headersList.forEach((value, key) => {
    headersObj[key] = value
  })

  console.log('All headers:', headersObj)
  // Procure por: x-forwarded-for, x-real-ip, cf-connecting-ip

  return headersObj
}
```

---

## ⚠️ Troubleshooting

### Problema: IP sempre retorna 'client-side'

**Causa:** Headers não foram passados para a função de log.

**Solução:**
```typescript
// ❌ Errado
await logAuditEvent({ ... })

// ✅ Correto (Server Action)
const headersList = await headers()
await logAuditEvent({ ... }, headersList)

// ✅ Correto (API Route)
await logAuditEvent({ ... }, request.headers)
```

### Problema: IP sempre retorna 'unknown'

**Causa:** Nenhum header de IP foi encontrado.

**Solução:** Verifique se você está rodando atrás de um proxy/CDN. Configure headers:
- Cloudflare: `CF-Connecting-IP` (automático)
- Nginx: `X-Real-IP`
- Vercel: `X-Vercel-Forwarded-For` (automático)

### Problema: IP retorna 'invalid-ip-format'

**Causa:** IP em formato inválido (possível ataque de injection).

**Solução:** Este é o comportamento esperado. O IP foi bloqueado por segurança. Verifique os headers manualmente:

```typescript
const headersList = await headers()
console.log('X-Forwarded-For:', headersList.get('x-forwarded-for'))
console.log('X-Real-IP:', headersList.get('x-real-ip'))
```

---

## 📚 Tipos TypeScript

```typescript
// De lib/ip-tracking.ts
interface ClientInfo {
  ip_address: string       // IP real ou 'client-side'/'localhost'/'unknown'
  user_agent: string       // Full user agent string
  platform?: string        // 'Win32', 'MacIntel', etc.
  is_mobile?: boolean      // true se dispositivo móvel
  browser?: string         // 'Chrome', 'Firefox', 'Safari', etc.
  timestamp: string        // ISO 8601 timestamp
}

// De lib/audit.ts
interface AuditLog {
  id?: string
  user_id: string
  action: AuditAction
  table_name: string
  record_id: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  timestamp?: string
  ip_address?: string      // ✅ Agora captura IP real
  user_agent?: string      // ✅ User agent detalhado
  escola_id?: string
  details?: Record<string, any>
}
```

---

## ✅ Checklist para Novos Endpoints

Ao criar novo endpoint que precise de audit logging:

- [ ] Importar `headers` de 'next/headers' (Server Actions)
- [ ] OU usar `request.headers` (API Routes)
- [ ] Chamar `await headers()` no início da função
- [ ] Passar headers para `logAuditEvent()` ou `logAuthEvent()`
- [ ] Testar que IP real está sendo capturado
- [ ] Adicionar testes automatizados

---

## 🎓 Recursos Adicionais

- **Documentação Completa:** `docs/FASE5_SECURITY_ENHANCEMENTS.md`
- **Exemplos:** `app/actions/example-audit-with-ip.ts`
- **Código Fonte:** `lib/ip-tracking.ts`

---

**Última Atualização:** 2025-11-03
**Versão:** 1.0.0
