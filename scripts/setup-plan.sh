#!/bin/bash

# Setup implementation plan for a feature specification
# Usage: ./scripts/setup-plan.sh "spec-directory"

source "$(dirname "$0")/common.sh"

main() {
    local spec_dir="$1"

    if [[ -z "$spec_dir" ]]; then
        log_error "Usage: $0 \"spec-directory\""
        log_info "Example: $0 \"specs/001-mvp-digital-diary\""
        exit 1
    fi

    if [[ ! -d "$spec_dir" ]]; then
        log_error "Spec directory not found: $spec_dir"
        exit 1
    fi

    if [[ ! -f "$spec_dir/spec.md" ]]; then
        log_error "Spec file not found: $spec_dir/spec.md"
        exit 1
    fi

    log_info "Setting up implementation plan for: $spec_dir"

    # Create plan.md from template
    if [[ -f "templates/plan-template.md" ]]; then
        cp "templates/plan-template.md" "$spec_dir/plan.md"
        log_success "Created plan.md from template"
    else
        create_basic_plan "$spec_dir/plan.md" "$spec_dir"
    fi

    # Create supporting documents
    create_data_model "$spec_dir/data-model.md"
    create_research_doc "$spec_dir/research.md"
    create_quickstart "$spec_dir/quickstart.md"

    # Create contracts directory if it doesn't exist
    mkdir -p "$spec_dir/contracts"

    # Create API specification template
    create_api_spec "$spec_dir/contracts/api-spec.json"

    log_success "Plan setup complete!"
    log_info "Created files:"
    log_info "  - $spec_dir/plan.md (implementation plan)"
    log_info "  - $spec_dir/data-model.md (database schema)"
    log_info "  - $spec_dir/research.md (technical research)"
    log_info "  - $spec_dir/quickstart.md (development guide)"
    log_info "  - $spec_dir/contracts/api-spec.json (API contracts)"

    # Open plan file if VS Code is available
    if command -v code &> /dev/null; then
        log_info "Opening plan file in VS Code..."
        code "$spec_dir/plan.md"
    fi
}

create_basic_plan() {
    local plan_file="$1"
    local spec_dir="$2"

    cat > "$plan_file" << EOF
# Implementation Plan

**Spec**: $(basename "$spec_dir")
**Created**: $(date +%Y-%m-%d)
**Phase**: Plan

---

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 14 with App Router
- **Database**: Supabase with gestao_fronteira schema
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: React Query + Zustand
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Testing Library

### Foundation Assets
Using **gestao_fronteira** as primary foundation (80% MVP ready):
- Complete database schema with RLS policies
- Comprehensive TypeScript types
- Production-ready authentication system
- Export infrastructure (PDF/Excel)

## Implementation Phases

### Phase 1: Foundation Setup (Week 1)
**Estimated Effort**: 40 hours

#### Database Integration
- [ ] Deploy gestao_fronteira schema
- [ ] Configure RLS policies for new features
- [ ] Generate TypeScript types
- [ ] Create seed data

#### Component Integration
- [ ] Extract reusable components
- [ ] Set up project structure
- [ ] Configure authentication
- [ ] Set up error handling

### Phase 2: Core Implementation (Week 2)
**Estimated Effort**: 40 hours

#### Feature Development
- [ ] Implement core functionality
- [ ] Build user interfaces
- [ ] Add validation logic
- [ ] Implement business rules

#### Integration Testing
- [ ] Unit tests for new components
- [ ] Integration tests with database
- [ ] End-to-end workflow testing
- [ ] Performance optimization

### Phase 3: Polish & Deployment (Week 3)
**Estimated Effort**: 20 hours

#### Final Implementation
- [ ] Mobile responsiveness
- [ ] Export functionality
- [ ] Error handling improvements
- [ ] Security audit

#### Documentation & Deployment
- [ ] Update CLAUDE.md
- [ ] Create deployment guide
- [ ] User acceptance testing
- [ ] Production deployment

## Risk Assessment

### High Risk
- **Complexity**: [Describe complexity risks]
- **Dependencies**: [Describe dependency risks]

### Mitigation Strategies
- Use proven gestao_fronteira components
- Implement incremental testing
- Maintain fallback options

## Success Criteria

### Technical Metrics
- [ ] Page load time < 3 seconds
- [ ] Mobile responsive design
- [ ] 100% TypeScript coverage
- [ ] All tests passing

### Business Metrics
- [ ] User acceptance criteria met
- [ ] Performance targets achieved
- [ ] Security requirements satisfied
- [ ] Educational compliance verified

## Quality Gates

### Before Development
- [ ] Plan reviewed and approved
- [ ] Dependencies identified and available
- [ ] Test strategy defined
- [ ] Security considerations documented

### Before Release
- [ ] All acceptance criteria met
- [ ] Performance benchmarks achieved
- [ ] Security audit completed
- [ ] Documentation updated
EOF

    log_success "Created plan file: $plan_file"
}

create_data_model() {
    local data_model_file="$1"

    cat > "$data_model_file" << EOF
# Data Model

**Updated**: $(date +%Y-%m-%d)

---

## Database Schema

### Existing Tables (from gestao_fronteira)

The following tables are already implemented and available:

#### Users Table
\`\`\`sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'diretor', 'secretario', 'professor', 'responsavel')),
    escola_id UUID REFERENCES escolas(id),
    nome_completo TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### Schools Table (escolas)
\`\`\`sql
CREATE TABLE escolas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    codigo_mec TEXT UNIQUE,
    endereco TEXT,
    telefone TEXT,
    diretor_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### Students Table (alunos)
\`\`\`sql
CREATE TABLE alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    data_nascimento DATE NOT NULL,
    cpf TEXT UNIQUE,
    endereco TEXT,
    telefone TEXT,
    escola_id UUID REFERENCES escolas(id) NOT NULL,
    necessidades_especiais TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### New Tables Required

[Document any new tables needed for this feature]

### Row Level Security Policies

All tables implement RLS policies for multi-school data isolation:

\`\`\`sql
-- Example policy for school-based access
CREATE POLICY "Users see own school data only"
  ON alunos FOR SELECT
  USING (escola_id IN (
    SELECT escola_id FROM users WHERE id = auth.uid()
  ));
\`\`\`

### Relationships

[Document key relationships and foreign keys]

### Indexes

[Document important indexes for query performance]
EOF

    log_success "Created data model file: $data_model_file"
}

create_research_doc() {
    local research_file="$1"

    cat > "$research_file" << EOF
# Technical Research

**Updated**: $(date +%Y-%m-%d)

---

## Research Tasks

### 1. Component Reusability Assessment
**Status**: To Do
**Priority**: High

Research which components from existing projects can be reused:
- gestao_fronteira (80% MVP ready)
- fronteira-educa-gest (modern TypeScript)
- fronteira-educa-digital (Next.js 14)
- bro (component library)

### 2. Database Schema Validation
**Status**: To Do
**Priority**: High

Validate gestao_fronteira schema compatibility:
- RLS policies for new features
- Performance with expected data volumes
- Migration requirements

### 3. Authentication Integration
**Status**: To Do
**Priority**: Medium

Research Supabase Auth integration patterns:
- JWT token handling
- Role-based route protection
- Session management

### 4. Export Functionality
**Status**: To Do
**Priority**: Medium

Investigate PDF/Excel export requirements:
- jsPDF performance with large datasets
- xlsx library capabilities
- Server-side vs client-side generation

## Research Results

### [Research Task Name]
**Completed**: [Date]
**Findings**: [Key findings and recommendations]
**Implications**: [Impact on implementation plan]

## Technology Decisions

### Frontend Framework
**Decision**: Next.js 14 with App Router
**Rationale**: Proven in fronteira-educa-digital, superior SEO, built-in auth integration

### State Management
**Decision**: React Query + Zustand
**Rationale**: Existing pattern in gestao_fronteira, handles server/client state separation

### UI Components
**Decision**: shadcn/ui + custom educational components
**Rationale**: Consistent across all projects, 47 pre-built components available

## Open Questions

- [ ] [Question requiring research or clarification]
- [ ] [Another question]

## External Resources

- [Link to relevant documentation]
- [Link to similar implementations]
EOF

    log_success "Created research file: $research_file"
}

create_quickstart() {
    local quickstart_file="$1"

    cat > "$quickstart_file" << EOF
# Development Quickstart

**Updated**: $(date +%Y-%m-%d)

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
\`\`\`bash
# Clone and navigate to project
cd /path/to/SRE

# Navigate to primary foundation
cd gestao_fronteira

# Install dependencies
npm install
\`\`\`

### 2. Environment Configuration
\`\`\`bash
# Copy environment template
cp .env.example .env.local

# Configure Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
\`\`\`

### 3. Database Setup
\`\`\`bash
# Start local Supabase (if using locally)
supabase start

# Apply migrations
supabase db push

# Generate TypeScript types
npm run db:types
\`\`\`

### 4. Development Server
\`\`\`bash
# Start development server
npm run dev

# Access application
# http://localhost:3000
\`\`\`

## Key Development Commands

### gestao_fronteira (Primary Foundation)
\`\`\`bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript validation
\`\`\`

### Testing
\`\`\`bash
npm run test         # Run tests
npm run test:coverage # Coverage report
\`\`\`

## Project Structure

\`\`\`
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
\`\`\`

## Key Files to Know

### Authentication
- \`components/auth/AuthGuard.tsx\` - Route protection
- \`lib/auth.ts\` - Auth utilities
- \`hooks/useAuth.ts\` - Auth hook

### Database
- \`lib/supabase.ts\` - Supabase client
- \`types/database.ts\` - Generated types
- \`supabase/migrations/\` - Schema migrations

### Components
- \`components/ui/\` - Reusable UI components
- \`components/students/\` - Student management
- \`components/attendance/\` - Attendance tracking

## Common Development Patterns

### Component Creation
\`\`\`typescript
// Use existing shadcn/ui components
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Follow TypeScript strict mode
interface ComponentProps {
  title: string
  onSave: () => void
}
\`\`\`

### Form Handling
\`\`\`typescript
// Use React Hook Form + Zod
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  nome: z.string().min(2).max(100),
  cpf: z.string().optional()
})
\`\`\`

### Database Queries
\`\`\`typescript
// Use Supabase client with RLS
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()
const { data, error } = await supabase
  .from('alunos')
  .select('*')
  .eq('escola_id', schoolId)
\`\`\`

## Troubleshooting

### Common Issues
1. **TypeScript errors**: Run \`npm run typecheck\`
2. **Supabase connection**: Check environment variables
3. **RLS policies**: Ensure user has proper school association

### Getting Help
- Check CLAUDE.md for project guidelines
- Review component-review-and-mvp-analysis.md for architecture
- Use Claude Code for implementation assistance
EOF

    log_success "Created quickstart file: $quickstart_file"
}

create_api_spec() {
    local api_spec_file="$1"

    cat > "$api_spec_file" << EOF
{
  "openapi": "3.0.0",
  "info": {
    "title": "SRE Educational Management API",
    "version": "1.0.0",
    "description": "API specification for educational management features"
  },
  "servers": [
    {
      "url": "http://localhost:3000",
      "description": "Development server"
    }
  ],
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {
      "Student": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "nome_completo": {
            "type": "string",
            "minLength": 2,
            "maxLength": 100
          },
          "data_nascimento": {
            "type": "string",
            "format": "date"
          },
          "cpf": {
            "type": "string",
            "pattern": "^[0-9]{11}$"
          },
          "escola_id": {
            "type": "string",
            "format": "uuid"
          }
        },
        "required": ["nome_completo", "data_nascimento", "escola_id"]
      },
      "Error": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  },
  "security": [
    {
      "BearerAuth": []
    }
  ],
  "paths": {
    "/api/students": {
      "get": {
        "summary": "List students",
        "tags": ["Students"],
        "parameters": [
          {
            "name": "escola_id",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "Filter by school ID"
          }
        ],
        "responses": {
          "200": {
            "description": "List of students",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "\$ref": "#/components/schemas/Student"
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create student",
        "tags": ["Students"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "\$ref": "#/components/schemas/Student"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Student created",
            "content": {
              "application/json": {
                "schema": {
                  "\$ref": "#/components/schemas/Student"
                }
              }
            }
          }
        }
      }
    }
  }
}
EOF

    log_success "Created API spec file: $api_spec_file"
}

# Run main function
main "$@"