# Validation System - Central Hub

Welcome to the centralized validation system for the educational management application.

**Total Implementation**: 3,504 lines of code and documentation across 7 files

## Quick Navigation

### For Developers

- **[VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md)** - Complete user guide with examples
  - Quick start with imports
  - How to use each validation module
  - Best practices
  - Error handling patterns

- **[INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md)** - Real-world integration patterns
  - React Hook Form integration
  - Server actions
  - API routes
  - Component examples
  - Database integration

### For Project Managers

- **[CENTRALIZATION_SUMMARY.md](./CENTRALIZATION_SUMMARY.md)** - Executive summary
  - What was created
  - Key features
  - Integration recommendations
  - Migration checklist

### Implementation Files

- **[students-validation.ts](./students-validation.ts)** (393 lines)
  - Student registration
  - Family/guardian information
  - Social programs (Bolsa Família, etc.)

- **[schools-validation.ts](./schools-validation.ts)** (485 lines)
  - School/institution data
  - Operating schedules
  - Infrastructure details

- **[users-validation.ts](./users-validation.ts)** (492 lines)
  - User authentication
  - 5-role RBAC system
  - Password management

- **[index.ts](./index.ts)** (214 lines)
  - Centralized barrel export
  - Type unions
  - Re-exports from all modules

## What's Included

### Validation Schemas (Zod-based)

1. **Student Validation**
   - Base student information
   - Parent/guardian information
   - Social programs
   - Complete registration schema
   - Update schema (partial)

2. **School Validation**
   - School information
   - Operating schedules
   - Infrastructure
   - Complete registration schema
   - Update schema (partial)

3. **User Validation**
   - Base user information
   - 5 role-specific schemas (admin, diretor, secretario, professor, responsavel)
   - Registration, login, password change
   - Profile updates

4. **Brazilian Data Validation**
   - CPF with check digit validation
   - CNPJ validation
   - Brazilian phone numbers (mobile & landline)
   - CEP (postal code)
   - INEP school codes
   - NIS validation

### Features

- ✅ Server-side validation (security first)
- ✅ Client-side validation (UX feedback)
- ✅ Automatic formatting (CPF, phone, CEP, etc.)
- ✅ Type-safe with TypeScript inference
- ✅ Brazilian compliance (INEP, LGPD, ANATEL)
- ✅ Error messages in Portuguese
- ✅ Comprehensive documentation
- ✅ Real-world integration examples

## Getting Started

### Import Everything You Need

```typescript
import {
  // Schemas
  studentRegistrationSchema,
  schoolRegistrationSchema,
  userRegistrationSchema,
  loginSchema,

  // Validation functions
  validateStudentRegistration,
  validateSchoolRegistration,
  validateUserRegistration,
  validateLogin,

  // Helpers
  validateBrazilianCPF,
  formatBrazilianPhone,
  calculateStudentAge,
  getRoleDisplayName,

  // Types
  type StudentRegistrationData,
  type SchoolRegistrationData,
  type UserRegistrationData,
  type LoginData
} from '@/lib/validation'
```

### In React Hook Form

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { studentRegistrationSchema } from '@/lib/validation'

const form = useForm({
  resolver: zodResolver(studentRegistrationSchema)
})
```

### In Server Actions

```typescript
'use server'

import { validateStudentRegistration } from '@/lib/validation'

export async function createStudent(data: unknown) {
  const result = validateStudentRegistration(data)

  if (!result.valid) {
    return { errors: result.errors }
  }

  // result.data is fully validated and typed
  return await db.students.create(result.data)
}
```

## Architecture

```
lib/validation/                          # All validation logic here
├── index.ts                            # Barrel export (use this!)
├── README.md                           # This file
│
├── DOCUMENTATION/
│   ├── VALIDATION_GUIDE.md             # Complete user guide
│   ├── INTEGRATION_EXAMPLES.md         # Real-world patterns
│   └── CENTRALIZATION_SUMMARY.md       # Executive summary
│
└── IMPLEMENTATION/
    ├── students-validation.ts          # Student schemas
    ├── schools-validation.ts           # School schemas
    └── users-validation.ts             # User schemas
```

### Existing Files (Still Used)

```
lib/validators/brazilian/               # Core validators
├── cpf.ts                             # CPF validation
├── phone.ts                           # Phone validation
└── index.ts                           # Re-exports

lib/validation/
├── brazilian-educational.ts           # Legacy (still maintained)
└── (other older files)
```

## Key Principles

### 1. Single Source of Truth

All validation happens in `lib/validation/`. Don't create validation logic elsewhere.

```typescript
// ✅ Good: Import from central location
import { studentRegistrationSchema } from '@/lib/validation'

// ❌ Bad: Creating new schemas in components
const schema = z.object({ /* ... */ })
```

### 2. Server-Side Validation First

Always validate on the server, even if client validation passes.

```typescript
// ✅ Good: Validates on server
export async function createStudent(data: unknown) {
  const result = validateStudentRegistration(data)
  if (!result.valid) return handleError(result.errors)
  // ...
}

// ❌ Bad: Only client validation
const form = useForm({ /* ... */ })
```

### 3. Use Type Inference

Let TypeScript infer types from Zod schemas.

```typescript
// ✅ Good: Type is inferred from schema
async function handleStudent(data: StudentRegistrationData) {
  console.log(data.nome_completo) // ✓ TypeScript knows this exists
}

// ❌ Bad: Manual typing
async function handleStudent(data: any) {
  console.log(data.nome_completo) // ✗ No type checking
}
```

### 4. Brazilian Compliance

All validation follows Brazilian standards.

```typescript
// ✅ Built-in Brazilian validation
- CPF with check digit algorithm
- CNPJ validation
- Phone: Mobile (11 digits) or landline (10 digits)
- INEP codes (8 digits)
- LGPD consent requirements
- Portuguese error messages
```

## Common Tasks

### Validate Student Registration

```typescript
import { validateStudentRegistration } from '@/lib/validation'

const result = validateStudentRegistration(formData)

if (!result.valid) {
  result.errors.forEach(error => {
    console.log(`${error.path}: ${error.message}`)
  })
} else {
  const student = result.data // Fully typed
}
```

### Validate School Data

```typescript
import { schoolRegistrationSchema } from '@/lib/validation'

const form = useForm({
  resolver: zodResolver(schoolRegistrationSchema)
})
```

### Validate User Password

```typescript
import { validatePasswordStrength, getPasswordRequirementsMessage } from '@/lib/validation'

const password = 'MyPassword123!'
const { isValid, requirements } = validatePasswordStrength(password)

if (!isValid) {
  const message = getPasswordRequirementsMessage(password)
  console.log(message) // "A senha precisa de: um caractere especial"
}
```

### Format Brazilian Data

```typescript
import { formatBrazilianCPF, formatBrazilianPhone } from '@/lib/validation'

const cpf = formatBrazilianCPF('12345678909')      // '123.456.789-09'
const phone = formatBrazilianPhone('31987654321')  // '(31) 98765-4321'
```

### Check Student Age

```typescript
import { calculateStudentAge } from '@/lib/validation'

const birthDate = new Date('2010-05-15')
const age = calculateStudentAge(birthDate) // 14
```

## Documentation Map

| File | Purpose | Audience | Size |
|------|---------|----------|------|
| [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md) | How to use validation | Developers | 12 KB |
| [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md) | Integration patterns | Developers | 26 KB |
| [CENTRALIZATION_SUMMARY.md](./CENTRALIZATION_SUMMARY.md) | What was created | Project Managers | 14 KB |
| [README.md](./README.md) | This navigation guide | Everyone | - |

## Standards & Compliance

### Brazilian Standards

- **INEP** (Instituto Nacional de Estudos e Pesquisas Educacionais)
  - Student codes (11 digits)
  - School codes (8 digits)
  - Educacenso compliance

- **LGPD** (Lei Geral de Proteção de Dados)
  - Explicit consent requirements
  - Data subject rights

- **ANATEL** (Agência Nacional de Telecomunicações)
  - Phone number validation
  - Mobile (9) and landline patterns

- **Receita Federal**
  - CPF check digit algorithm
  - CNPJ validation

### Code Standards

- All error messages in Portuguese
- Zod schemas with clear validation messages
- TypeScript strict mode compatible
- JSDoc comments on all functions
- No side effects in validation functions

## Integration Checklist

- [ ] Review [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md)
- [ ] Check [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md) for your use case
- [ ] Update forms to use new schemas
- [ ] Update server actions to validate
- [ ] Update API routes to validate
- [ ] Add tests for critical paths
- [ ] Check error handling in UI
- [ ] Verify LGPD compliance
- [ ] Test with actual Supabase data

## Troubleshooting

### Import Errors

```typescript
// ❌ Wrong: Importing from non-existent path
import { schema } from '@/lib/validators/invalid'

// ✅ Right: Import from main barrel export
import { studentRegistrationSchema } from '@/lib/validation'
```

### Type Errors

```typescript
// ❌ Wrong: Don't create custom types
type StudentData = {
  nome: string
  // ...
}

// ✅ Right: Infer from schema
import { type StudentRegistrationData } from '@/lib/validation'

function handleStudent(data: StudentRegistrationData) {
  // Full type safety
}
```

### Validation Failures

```typescript
// When validation fails, check:
1. Is the error path correct? (e.g., 'cpf' vs 'responsaveis.0.cpf')
2. Is the data type correct? (e.g., Date vs string)
3. Are required fields present?
4. Are custom rules satisfied? (e.g., password strength)

Use validateStudentRegistration() to get detailed error info
```

## Support & Questions

For questions about validation:

1. **Quick answers**: Check [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md)
2. **Integration help**: See [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md)
3. **Implementation details**: Read [CENTRALIZATION_SUMMARY.md](./CENTRALIZATION_SUMMARY.md)
4. **Code examples**: Look at inline JSDoc comments

## Contributing

When adding new validation schemas:

1. Keep them organized in domain files (students, schools, users)
2. Add comprehensive JSDoc comments
3. Include both schema and type exports
4. Add helper functions for common operations
5. Update [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md) with examples
6. Export from [index.ts](./index.ts)

## License

Part of the Gestão Educacional - Fronteira, MG system.

---

**Last Updated**: November 3, 2025

For the complete guide, start with [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md).
