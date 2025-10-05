# Console Error
## Error Type
Console Error

## Error Message
Error fetching class diary: {}


    at fetchEntries (app/(dashboard)/dashboard/diario/page.tsx:117:17)

## Code Frame
  115 |
  116 |       if (fetchError || !data) {
> 117 |         console.error('Error fetching class diary:', fetchError)
      |                 ^
  118 |         setError('Erro ao carregar o diário de classe. Tente novamente.')
  119 |         setLoading(false)
  120 |         return

Next.js version: 15.5.3 (Turbopack)

## Error Message
Error fetching class diary: {}


    at getClassDiary (lib/api/class-diary.ts:179:15)

## Code Frame
  177 |
  178 |     if (error) {
> 179 |       console.error('Error fetching class diary:', error)
      |               ^
  180 |       return { data: null, error }
  181 |     }
  182 |

Next.js version: 15.5.3 (Turbopack)

# warn 
- The utility `bg-[radial-gradient(circle_at_center,theme(colors.fronteira-blue),transparent_60%)]` contains an invalid theme value and was not generated.

AFTER ![[Pasted image 20251004210625.png]] LOGIN, KEEPS LOADING AND DONT PUSH TO /DASHBOARD

# Error Type
Console Error

## Error Message
Cannot update a component (`ForwardRef`) while rendering a different component (`ForwardRef`). To locate the bad setState() call inside `ForwardRef`, follow the stack trace as described in https://react.dev/link/setstate-in-render


    at Providers (app/providers.tsx:25:9)
    at RootLayout (app\layout.tsx:36:9)

## Code Frame
  23 |       <ServiceWorkerProvider>
  24 |         {children}
> 25 |         <Toaster position="top-right" richColors closeButton />
     |         ^
  26 |       </ServiceWorkerProvider>
  27 |     </QueryClientProvider>
  28 |   )

Next.js version: 15.5.3 (Turbopack)
# /dashboard/escolas
dOESNT LOAD THE COMPONENT
# 404 

# /
Suporte
- Documentação
- Treinamento
- Suporte Técnico
- Atualizações

Funcionalidades
- Gestão de Alunos
- Administração Escolar
- Frequência Digital
- Relatórios e Analytics


# /alunos/a0000021-0000-0000-0000-000000000021/editar

# /usuarios/22222222-2222-2222-2222-222222222222/editar

# /turmas/1/editar

# /turmas/id

# /turmas/2
delete not working
# /matriculas/1
# /matriculas
delete not working
# /matriculas/1/editar

/notas/1/boletim

## Error Type
Console Error

## Error Message
Cannot update a component (`ForwardRef`) while rendering a different component (`ForwardRef`). To locate the bad setState() call inside `ForwardRef`, follow the stack trace as described in https://react.dev/link/setstate-in-render


    at Providers (app/providers.tsx:25:9)
    at RootLayout (app\layout.tsx:36:9)

## Code Frame
  23 |       <ServiceWorkerProvider>
  24 |         {children}
> 25 |         <Toaster position="top-right" richColors closeButton />
     |         ^
  26 |       </ServiceWorkerProvider>
  27 |     </QueryClientProvider>
  28 |   )

Next.js version: 15.5.3 (Turbopack)
