# Integration Examples

Practical examples showing how to integrate the centralized validation system into different parts of the application.

## Table of Contents

1. [React Hook Form Integration](#react-hook-form-integration)
2. [Server Actions Integration](#server-actions-integration)
3. [API Routes Integration](#api-routes-integration)
4. [Component Examples](#component-examples)
5. [Error Handling](#error-handling)
6. [Database Integration](#database-integration)

## React Hook Form Integration

### Student Registration Form

```typescript
// components/forms/StudentRegistrationForm.tsx

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { studentRegistrationSchema, type StudentRegistrationData } from '@/lib/validation'
import { createStudentAction } from '@/app/actions/students'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function StudentRegistrationForm() {
  const form = useForm<StudentRegistrationData>({
    resolver: zodResolver(studentRegistrationSchema),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      status_matricula: 'ativo',
      ano_letivo: new Date().getFullYear(),
      lgpd_consentimento: false,
      responsaveis: [{ parentesco: 'mae' }] // Default to mother
    }
  })

  async function onSubmit(data: StudentRegistrationData) {
    const result = await createStudentAction(data)

    if (!result.success) {
      form.setError('root', {
        message: result.error || 'Erro ao criar aluno'
      })
      return
    }

    // Success: navigate to student page
    window.location.href = `/dashboard/alunos/${result.student.id}`
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informações Básicas</h3>

          <FormField
            control={form.control}
            name="nome_completo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="João Silva Santos" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_nascimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Nascimento *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sexo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123.456.789-09"
                    {...field}
                    onChange={(e) => {
                      // Allow user to type, validation happens on blur
                      field.onChange(e.target.value)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contato</h3>

          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(31) 98765-4321" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="aluno@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Family Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Responsáveis *</h3>
          <p className="text-sm text-gray-600">Adicione pelo menos um responsável</p>

          {form.watch('responsaveis')?.map((_, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <FormField
                control={form.control}
                name={`responsaveis.${index}.nome`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Responsável</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`responsaveis.${index}.cpf`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input placeholder="123.456.789-09" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`responsaveis.${index}.parentesco`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parentesco</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mae">Mãe</SelectItem>
                        <SelectItem value="pai">Pai</SelectItem>
                        <SelectItem value="avo">Avó</SelectItem>
                        <SelectItem value="ava">Avô</SelectItem>
                        <SelectItem value="responsavel_legal">Responsável Legal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>

        {/* LGPD Consent */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="lgpd_consentimento"
            render={({ field }) => (
              <FormItem className="flex items-start space-x-2">
                <FormControl>
                  <input type="checkbox" {...field} />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel>Consentimento LGPD *</FormLabel>
                  <p className="text-xs text-gray-600">
                    Autorizo o tratamento de dados pessoais de acordo com a Lei Geral de Proteção de Dados
                  </p>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : 'Criar Aluno'}
        </Button>
      </form>
    </Form>
  )
}
```

### User Registration Form

```typescript
// components/forms/UserRegistrationForm.tsx

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userRegistrationSchema, validatePasswordStrength, type UserRegistrationData } from '@/lib/validation'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createUserAction } from '@/app/actions/users'
import { AlertCircle, CheckCircle } from 'lucide-react'

export function UserRegistrationForm() {
  const form = useForm<UserRegistrationData>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      role: 'professor'
    }
  })

  const password = form.watch('password')
  const passwordStrength = validatePasswordStrength(password || '')
  const passwordScore = Object.values(passwordStrength.requirements).filter(Boolean).length

  async function onSubmit(data: UserRegistrationData) {
    const result = await createUserAction(data)

    if (!result.success) {
      form.setError('root', { message: result.error || 'Erro ao criar usuário' })
      return
    }

    // Success
    window.location.href = '/dashboard'
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@escola.edu.br" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Name */}
        <FormField
          control={form.control}
          name="nome_completo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo *</FormLabel>
              <FormControl>
                <Input placeholder="Ana Silva Santos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha *</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Minimum 8 characters" {...field} />
              </FormControl>

              {password && (
                <div className="space-y-2 mt-3">
                  <Progress value={(passwordScore / 5) * 100} className="h-2" />

                  <div className="space-y-1 text-sm">
                    <div className={`flex items-center gap-2 ${
                      passwordStrength.requirements.minLength ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {passwordStrength.requirements.minLength ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      Mínimo 8 caracteres
                    </div>

                    <div className={`flex items-center gap-2 ${
                      passwordStrength.requirements.hasUppercase ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {passwordStrength.requirements.hasUppercase ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      Uma letra maiúscula
                    </div>

                    <div className={`flex items-center gap-2 ${
                      passwordStrength.requirements.hasNumber ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {passwordStrength.requirements.hasNumber ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      Um número
                    </div>

                    <div className={`flex items-center gap-2 ${
                      passwordStrength.requirements.hasSpecial ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {passwordStrength.requirements.hasSpecial ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      Um caractere especial (!@#$%^&*)
                    </div>
                  </div>
                </div>
              )}

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Confirmation */}
        <FormField
          control={form.control}
          name="password_confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar Senha *</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Confirme a senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Criando...' : 'Criar Conta'}
        </Button>
      </form>
    </Form>
  )
}
```

## Server Actions Integration

### Create Student Action

```typescript
// app/actions/students.ts

'use server'

import { validateStudentRegistration, type StudentRegistrationData } from '@/lib/validation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createStudentAction(data: unknown) {
  try {
    // Validate on server
    const result = validateStudentRegistration(data)

    if (!result.valid) {
      return {
        success: false,
        error: 'Dados inválidos',
        errors: result.errors
      }
    }

    const validatedData = result.data

    // Insert student into database
    const { data: student, error } = await supabaseAdmin
      .from('alunos')
      .insert({
        nome_completo: validatedData.nome_completo,
        data_nascimento: validatedData.data_nascimento,
        sexo: validatedData.sexo,
        cpf: validatedData.cpf,
        endereco: validatedData.endereco,
        telefone: validatedData.telefone,
        email: validatedData.email,
        necessidades_especiais: validatedData.necessidades_especiais,
        turma_id: validatedData.turma_id,
        ano_letivo: validatedData.ano_letivo,
        status_matricula: validatedData.status_matricula,
        nome_mae: validatedData.nome_mae,
        nome_pai: validatedData.nome_pai,
        bolsa_familia: validatedData.bolsa_familia,
        transporte_escolar: validatedData.transporte_escolar,
        numero_nis: validatedData.numero_nis,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return {
        success: false,
        error: 'Erro ao salvar aluno no banco de dados'
      }
    }

    // Insert guardians
    if (validatedData.responsaveis && validatedData.responsaveis.length > 0) {
      const { error: guardiansError } = await supabaseAdmin
        .from('responsaveis')
        .insert(
          validatedData.responsaveis.map(guardian => ({
            aluno_id: student.id,
            nome: guardian.nome,
            cpf: guardian.cpf,
            rg: guardian.rg,
            telefone: guardian.telefone,
            email: guardian.email,
            parentesco: guardian.parentesco,
            endereco: guardian.endereco,
            profissao: guardian.profissao,
            escolaridade: guardian.escolaridade,
            renda_familiar: guardian.renda_familiar,
          }))
        )

      if (guardiansError) {
        console.error('Guardians error:', guardiansError)
        // Optionally rollback student creation
      }
    }

    // Revalidate cache
    revalidatePath('/dashboard/alunos')
    revalidatePath(`/dashboard/turmas/${validatedData.turma_id}`)

    return {
      success: true,
      student
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: 'Erro inesperado ao criar aluno'
    }
  }
}
```

### Create User Action

```typescript
// app/actions/users.ts

'use server'

import { validateUserRegistration, type UserRegistrationData } from '@/lib/validation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hash } from 'bcryptjs'

export async function createUserAction(data: unknown) {
  try {
    // Validate
    const result = validateUserRegistration(data)

    if (!result.valid) {
      return {
        success: false,
        error: 'Dados inválidos',
        errors: result.errors
      }
    }

    const validatedData = result.data

    // Check email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()

    if (existingUser) {
      return {
        success: false,
        error: 'Este e-mail já está registrado'
      }
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)

    // Create user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: validatedData.email,
        nome_completo: validatedData.nome_completo,
        role: validatedData.role,
        cpf: validatedData.cpf,
        telefone: validatedData.telefone,
        hashed_password: hashedPassword,
        status: 'ativo',
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return {
        success: false,
        error: 'Erro ao criar usuário'
      }
    }

    return {
      success: true,
      user
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: 'Erro inesperado'
    }
  }
}
```

## API Routes Integration

### POST /api/students

```typescript
// app/api/students/route.ts

import { studentRegistrationSchema } from '@/lib/validation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate
    const data = studentRegistrationSchema.parse(body)

    // Insert into database
    const { data: student, error } = await supabaseAdmin
      .from('alunos')
      .insert(data)
      .select()
      .single()

    if (error) {
      return Response.json(
        { error: 'Erro ao criar aluno' },
        { status: 400 }
      )
    }

    return Response.json(student, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: 'Validação falhou',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

### POST /api/login

```typescript
// app/api/auth/login/route.ts

import { loginSchema } from '@/lib/validation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'
import { compare } from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate
    const credentials = loginSchema.parse(body)

    // Find user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', credentials.email)
      .single()

    if (error || !user) {
      return Response.json(
        { error: 'E-mail ou senha incorretos' },
        { status: 401 }
      )
    }

    // Check password
    const passwordMatch = await compare(credentials.password, user.hashed_password)

    if (!passwordMatch) {
      return Response.json(
        { error: 'E-mail ou senha incorretos' },
        { status: 401 }
      )
    }

    // Generate session (implementation depends on auth library)
    // ...

    return Response.json({ user }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validação falhou' },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
```

## Component Examples

### Student Info Component

```typescript
// components/students/StudentInfo.tsx

import { type StudentRegistrationData } from '@/lib/validation'
import { formatBrazilianCPF, calculateStudentAge } from '@/lib/validation'

interface StudentInfoProps {
  student: StudentRegistrationData
}

export function StudentInfo({ student }: StudentInfoProps) {
  const age = calculateStudentAge(student.data_nascimento)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">{student.nome_completo}</h3>
        <p className="text-sm text-gray-600">{age} anos</p>
      </div>

      {student.cpf && (
        <div>
          <label className="text-sm font-medium">CPF</label>
          <p className="text-sm">{student.cpf}</p>
        </div>
      )}

      {student.telefone && (
        <div>
          <label className="text-sm font-medium">Telefone</label>
          <p className="text-sm">{student.telefone}</p>
        </div>
      )}

      {student.responsaveis && student.responsaveis.length > 0 && (
        <div>
          <label className="text-sm font-medium">Responsáveis</label>
          <ul className="text-sm space-y-1">
            {student.responsaveis.map((resp, idx) => (
              <li key={idx}>{resp.nome}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

## Error Handling

### Display Validation Errors

```typescript
// components/forms/FormError.tsx

import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FormErrorProps {
  errors?: Array<{
    path: string
    message: string
    code: string
  }>
  fieldError?: string
}

export function FormError({ errors, fieldError }: FormErrorProps) {
  if (!errors && !fieldError) return null

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {fieldError ? (
          fieldError
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {errors?.map((error) => (
              <li key={error.path}>
                <strong>{error.path}:</strong> {error.message}
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  )
}
```

## Database Integration

### Type-Safe Database Operations

```typescript
// lib/db/students.ts

import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateStudentRegistration, type StudentRegistrationData } from '@/lib/validation'

/**
 * Type-safe student creation
 * Validation ensures data matches database schema
 */
export async function createStudent(data: StudentRegistrationData) {
  const { data: student, error } = await supabaseAdmin
    .from('alunos')
    .insert({
      nome_completo: data.nome_completo,
      data_nascimento: data.data_nascimento,
      sexo: data.sexo,
      cpf: data.cpf,
      // ... other fields
    })
    .select()
    .single()

  if (error) throw error

  return student
}

/**
 * Update student with validation
 */
export async function updateStudent(id: string, updates: unknown) {
  const result = validateStudentRegistration({
    // Merge with existing data...
    ...updates
  })

  if (!result.valid) {
    throw new Error('Validation failed')
  }

  const { data, error } = await supabaseAdmin
    .from('alunos')
    .update(result.data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}
```

---

These examples demonstrate how to integrate the validation system throughout your application for consistent, type-safe data handling.
