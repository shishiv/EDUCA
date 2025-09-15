# Development Quickstart

**Updated**: 2025-09-14

---

## Prerequisites

### Required Tools
- Node.js 18+
- npm or pnpm
- Git
- Supabase CLI (optional, for local development)

### Development Environment
- VS Code with TypeScript extension
- Claude Code (for AI assistance)
- Browser dev tools

## Setup Instructions

### 1. Project Setup
```bash
# Clone and navigate to project
cd /path/to/SRE

# Navigate to primary foundation
cd gestao_fronteira

# Install dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Configure Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database Setup
```bash
# Start local Supabase (if using locally)
supabase start

# Apply migrations
supabase db push

# Generate TypeScript types
npm run db:types
```

### 4. Development Server
```bash
# Start development server
npm run dev

# Access application
# http://localhost:3000
```

## Key Development Commands

### gestao_fronteira (Primary Foundation)
```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript validation
```

### Testing
```bash
npm run test         # Run tests
npm run test:coverage # Coverage report
```

## Project Structure

```
gestao_fronteira/
├── app/                 # Next.js App Router
│   ├── (dashboard)/    # Dashboard routes
│   ├── auth/           # Authentication pages
│   └── globals.css     # Global styles
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   └── [feature]/     # Feature-specific components
├── lib/               # Utilities and config
├── types/             # TypeScript definitions
└── supabase/          # Database migrations
```

## Key Files to Know

### Authentication
- `components/auth/AuthGuard.tsx` - Route protection
- `lib/auth.ts` - Auth utilities
- `hooks/useAuth.ts` - Auth hook

### Database
- `lib/supabase.ts` - Supabase client
- `types/database.ts` - Generated types
- `supabase/migrations/` - Schema migrations

### Components
- `components/ui/` - Reusable UI components
- `components/students/` - Student management
- `components/attendance/` - Attendance tracking

## Common Development Patterns

### Component Creation
```typescript
// Use existing shadcn/ui components
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Follow TypeScript strict mode
interface ComponentProps {
  title: string
  onSave: () => void
}
```

### Form Handling
```typescript
// Use React Hook Form + Zod
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  nome: z.string().min(2).max(100),
  cpf: z.string().optional()
})
```

### Database Queries
```typescript
// Use Supabase client with RLS
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()
const { data, error } = await supabase
  .from('alunos')
  .select('*')
  .eq('escola_id', schoolId)
```

## Troubleshooting

### Common Issues
1. **TypeScript errors**: Run `npm run typecheck`
2. **Supabase connection**: Check environment variables
3. **RLS policies**: Ensure user has proper school association

### Getting Help
- Check CLAUDE.md for project guidelines
- Review component-review-and-mvp-analysis.md for architecture
- Use Claude Code for implementation assistance
