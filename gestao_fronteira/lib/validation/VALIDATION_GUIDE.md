# Validation System Guide

This document explains how to use the centralized validation system in `lib/validation/`.

## Overview

The validation system provides Zod-based schemas for all data types in the educational management system:

1. **Students** - Registration, family information, social programs
2. **Schools** - Institution details, operating schedules, infrastructure
3. **Users** - Authentication, role-based access, account management
4. **Brazilian Data** - CPF, CNPJ, phone, CEP, INEP codes

All schemas include:
- Client-side validation (instant user feedback)
- Server-side validation (security & data integrity)
- Brazilian compliance (INEP, LGPD)
- Type-safe TypeScript inference

## Quick Start

### Importing Schemas

```typescript
import {
  studentRegistrationSchema,
  validateStudentRegistration,
  schoolRegistrationSchema,
  validateSchoolRegistration,
  loginSchema,
  validateLogin,
} from '@/lib/validation'
```

### Using Zod Schemas Directly

```typescript
// In React Hook Form
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { studentRegistrationSchema } from '@/lib/validation'

export function StudentForm() {
  const form = useForm({
    resolver: zodResolver(studentRegistrationSchema),
    defaultValues: {}
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

### Using Helper Functions

```typescript
import { validateStudentRegistration } from '@/lib/validation'

const result = validateStudentRegistration(formData)

if (!result.valid) {
  result.errors.forEach(error => {
    console.log(`${error.path}: ${error.message}`)
  })
} else {
  // Process validated data
  const studentData = result.data
}
```

## Student Validation

### Student Registration

```typescript
import {
  studentRegistrationSchema,
  validateStudentRegistration,
  type StudentRegistrationData
} from '@/lib/validation'

// Define data
const studentData: StudentRegistrationData = {
  nome_completo: 'João Silva Santos',
  data_nascimento: new Date('2010-05-15'),
  sexo: 'M',
  cpf: '123.456.789-09',
  endereco: 'Rua Principal, 123',
  turma_id: 'uuid-turma',
  ano_letivo: 2025,
  responsaveis: [
    {
      nome: 'Maria Silva',
      cpf: '987.654.321-00',
      parentesco: 'mae',
      telefone: '(31) 98765-4321'
    }
  ],
  lgpd_consentimento: true
}

// Validate
const result = validateStudentRegistration(studentData)
```

### Student Update (Partial)

```typescript
import { studentUpdateSchema, type StudentUpdateData } from '@/lib/validation'

const updates: StudentUpdateData = {
  email: 'joao@example.com',
  telefone: '(31) 99999-8888'
}

const form = useForm({
  resolver: zodResolver(studentUpdateSchema)
})
```

### Helper Functions

```typescript
import { calculateStudentAge } from '@/lib/validation'

const birthDate = new Date('2010-05-15')
const age = calculateStudentAge(birthDate) // Returns: 14
```

## School Validation

### School Registration

```typescript
import {
  schoolRegistrationSchema,
  validateSchoolRegistration,
  type SchoolRegistrationData
} from '@/lib/validation'

const schoolData: SchoolRegistrationData = {
  nome: 'Escola Municipal José Alencar',
  codigo_escola: 'ESC-001',
  codigo_inep: '31000001',
  tipo_escola: 'fundamental_anos_iniciais',
  endereco: 'Avenida Central, 456',
  numero: '456',
  bairro: 'Centro',
  cidade: 'Fronteira',
  estado: 'MG',
  cep: '37550-000',
  telefone: '(34) 3333-4444',
  diretor_nome: 'Carlos Mendes',
  numero_salas_aula: 12,
  numero_professores: 25,
  numero_funcionarios: 8,
  capacidade_alunos: 400,
  turno_matutino: true,
  turno_vespertino: true,
  municipio: 'Fronteira',
  status: 'ativa',
  ano_fundacao: 1995
}

const result = validateSchoolRegistration(schoolData)
```

### Schedule Validation

```typescript
import { validateAtLeastOneTurno } from '@/lib/validation'

const schedule = {
  turno_matutino: false,
  turno_vespertino: false,
  turno_noturno: false,
  turno_integral: false
}

if (!validateAtLeastOneTurno(schedule)) {
  // Show error: school must operate in at least one turno
}
```

## User Validation

### User Registration

```typescript
import {
  userRegistrationSchema,
  validateUserRegistration,
  type UserRegistrationData
} from '@/lib/validation'

const userData: UserRegistrationData = {
  email: 'professor@escola.edu.br',
  nome_completo: 'Ana Silva Santos',
  role: 'professor',
  password: 'Senha@Forte123',
  password_confirmation: 'Senha@Forte123',
  cpf: '123.456.789-09',
  telefone: '(31) 98765-4321'
}

const result = validateUserRegistration(userData)
```

### Password Validation

```typescript
import {
  validatePasswordStrength,
  getPasswordRequirementsMessage
} from '@/lib/validation'

const password = 'MinhaSenh@123'
const { isValid, requirements } = validatePasswordStrength(password)

if (!isValid) {
  const message = getPasswordRequirementsMessage(password)
  console.log(message)
  // "A senha precisa de: uma letra maiúscula"
}
```

### Password Change

```typescript
import {
  userPasswordChangeSchema,
  validatePasswordChange
} from '@/lib/validation'

const changeData = {
  current_password: 'SenhaAntiga@123',
  new_password: 'NovaSenha@456',
  new_password_confirmation: 'NovaSenha@456'
}

const result = validatePasswordChange(changeData)
```

### Login

```typescript
import { loginSchema, validateLogin } from '@/lib/validation'

const credentials = {
  email: 'user@escola.edu.br',
  password: 'Senha@123'
}

const result = validateLogin(credentials)
```

### Role Display Names

```typescript
import { getRoleDisplayName } from '@/lib/validation'

getRoleDisplayName('professor') // Returns: "Professor"
getRoleDisplayName('diretor')   // Returns: "Diretor"
getRoleDisplayName('admin')     // Returns: "Administrador"
```

## Brazilian Data Validation

### CPF

```typescript
import {
  validateBrazilianCPF,
  formatBrazilianCPF,
  cpfSchema
} from '@/lib/validation'

const cpf = '123.456.789-09'
const isValid = validateBrazilianCPF(cpf) // true
const formatted = formatBrazilianCPF('12345678909') // '123.456.789-09'

// In Zod schema
const form = useForm({
  resolver: zodResolver(z.object({
    cpf: cpfSchema
  }))
})
```

### Phone Numbers

```typescript
import {
  validateBrazilianPhone,
  formatBrazilianPhone,
  getBrazilianPhoneType,
  brazilianPhoneSchema
} from '@/lib/validation'

const phone = '(31) 98765-4321'
const isValid = validateBrazilianPhone(phone) // true
const formatted = formatBrazilianPhone('31987654321') // '(31) 98765-4321'
const type = getBrazilianPhoneType(phone) // 'mobile'
```

### CNPJ (School CNPJ)

```typescript
import {
  validateCNPJ,
  formatCNPJ
} from '@/lib/validation'

const cnpj = '12.345.678/0001-90'
const isValid = validateCNPJ(cnpj) // true
const formatted = formatCNPJ('12345678000190') // '12.345.678/0001-90'
```

### CEP (Postal Code)

```typescript
import {
  validateCEP,
  formatCEP
} from '@/lib/validation'

const cep = '37550-000'
const isValid = validateCEP(cep) // true
const formatted = formatCEP('37550000') // '37550-000'
```

### INEP Code

```typescript
import {
  validateSchoolINEPCode,
  formatSchoolINEPCode
} from '@/lib/validation'

const inep = '31000001'
const isValid = validateSchoolINEPCode(inep) // true
const formatted = formatSchoolINEPCode('31000001') // '31.000.001'
```

## Server-Side Validation

```typescript
// app/actions/student.ts
'use server'

import { validateStudentRegistration } from '@/lib/validation'
import { createStudent } from '@/lib/api'

export async function createStudentAction(formData: unknown) {
  // Validate on server
  const result = validateStudentRegistration(formData)

  if (!result.valid) {
    return {
      success: false,
      errors: result.errors
    }
  }

  try {
    const student = await createStudent(result.data)
    return {
      success: true,
      student
    }
  } catch (error) {
    return {
      success: false,
      error: 'Erro ao criar aluno'
    }
  }
}
```

## Best Practices

### 1. Always Validate Server-Side

```typescript
// Good: Validates on server even if client validation passes
const result = validateStudentRegistration(untrustedData)
if (!result.valid) {
  return handleValidationError(result.errors)
}

// Don't: Skip server validation
const data = await handleFormSubmit(clientData) // No server validation!
```

### 2. Use Type Inference

```typescript
import { type StudentRegistrationData } from '@/lib/validation'

async function handleStudent(data: StudentRegistrationData) {
  // TypeScript knows the shape of data
  console.log(data.nome_completo) // ✓ Exists
  console.log(data.invalid_field) // ✗ Type error
}
```

### 3. Handle Errors Gracefully

```typescript
const result = validateStudentRegistration(data)

if (!result.valid) {
  result.errors.forEach(error => {
    // Display field-specific error
    form.setError(
      error.path,
      { message: error.message }
    )
  })
}
```

### 4. Format Data Automatically

```typescript
// CPF is automatically formatted
const form = useForm({
  resolver: zodResolver(studentRegistrationSchema)
})

// User input: "12345678909"
// After validation: "123.456.789-09"
const result = form.getValues()
console.log(result.cpf) // "123.456.789-09"
```

### 5. LGPD Compliance

```typescript
// Student registration requires explicit consent
import { studentRegistrationSchema } from '@/lib/validation'

const form = useForm({
  resolver: zodResolver(studentRegistrationSchema)
})

// Must check LGPD consent before submission
<input
  {...form.register('lgpd_consentimento')}
  type="checkbox"
  required
/>
```

## Architecture

```
lib/validation/
├── index.ts                      # Barrel export (use this!)
├── VALIDATION_GUIDE.md           # This file
├── brazilian-educational.ts      # Core validators
├── students-validation.ts        # Student schemas
├── schools-validation.ts         # School schemas
└── users-validation.ts           # User schemas

lib/validators/
├── brazilian/
│   ├── cpf.ts                   # CPF validation
│   ├── phone.ts                 # Phone validation
│   └── index.ts                 # Re-exports
└── ...
```

## Error Messages

All error messages are in Portuguese following Brazilian educational standards:

```typescript
// Student age too old
'Aluno deve ter no máximo 18 anos'

// Invalid INEP code
'Código INEP inválido (deve ter 8 dígitos)'

// Missing guardian
'Pelo menos um responsável é obrigatório'

// Weak password
'A senha precisa de: uma letra maiúscula, um número, um caractere especial'
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { validateStudentRegistration } from '@/lib/validation'

describe('Student Validation', () => {
  it('should validate correct student data', () => {
    const data = {
      nome_completo: 'João Silva',
      data_nascimento: new Date('2010-05-15'),
      sexo: 'M',
      turma_id: 'uuid',
      ano_letivo: 2025,
      responsaveis: [{ /* ... */ }],
      lgpd_consentimento: true
    }

    const result = validateStudentRegistration(data)
    expect(result.valid).toBe(true)
  })

  it('should reject invalid CPF', () => {
    const data = {
      // ...
      cpf: '123.456.789-00', // Invalid check digits
      // ...
    }

    const result = validateStudentRegistration(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: 'cpf' })
    )
  })
})
```

## Migration from Old Validation

If you have old validation code:

```typescript
// Old way
import { brazilianCPFSchema } from '@/lib/validation/brazilian-educational'
import { studentRegistrationSchema as oldStudentSchema } from '@/lib/validators/brazilian/schemas'

// New way
import {
  cpfSchema,
  studentRegistrationSchema
} from '@/lib/validation'
```

All schemas are now centralized in `lib/validation/` for consistency and ease of maintenance.
