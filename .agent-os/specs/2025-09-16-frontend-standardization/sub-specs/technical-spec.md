# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-16-frontend-standardization/spec.md

> Created: 2025-09-16
> Version: 1.0.0

## Technical Requirements

### 1. Component Standardization

#### Form Components Architecture
- **Primary**: shadcn/ui Form component with React Hook Form integration
- **Validation**: Zod schemas for Brazilian educational data types
- **Structure**: FormField -> FormItem -> FormLabel/FormControl/FormMessage hierarchy
- **Required Components**:
  - `Form` - Root form wrapper with validation context
  - `FormField` - Individual field wrapper with validation state
  - `FormItem` - Layout container for field elements
  - `FormLabel` - Accessible labels with required indicators
  - `FormControl` - Input wrapper with focus management
  - `FormMessage` - Error and helper text display

#### Input Component Standardization
- **Base Input**: shadcn/ui Input with consistent styling
- **Specialized Inputs**:
  - `CPFInput` - Auto-formatting xxx.xxx.xxx-xx pattern
  - `PhoneInput` - Brazilian format (xx) xxxxx-xxxx
  - `DateInput` - Academic calendar aware picker
  - `EmailInput` - Educational domain validation
- **States**: Default, focus, error, disabled, loading
- **Validation**: Real-time feedback with debounced validation

#### Table Components for Educational Data
- **Base**: shadcn/ui Table with responsive overflow
- **Components**: Table, TableHeader, TableBody, TableHead, TableRow, TableCell
- **Features**:
  - Horizontal scroll on mobile devices
  - Sticky headers for long lists
  - Loading states with skeleton rows
  - Empty states with educational context
  - Sorting and filtering capabilities

#### UI Pattern Components
- **Navigation**:
  - `Sidebar` - Collapsible navigation with role-based menu items
  - `Breadcrumb` - Educational hierarchy navigation
  - `NavigationMenus` - Context-aware action menus
- **Layout**:
  - `Card` - Information containers with consistent padding
  - `Dialog` - Modal dialogs for forms and confirmations
  - `Sheet` - Mobile-optimized sliding panels
- **Feedback**:
  - `Alert` - System notifications and warnings
  - `Toast` - Action feedback and confirmations
  - `Badge` - Status indicators and labels

### 2. Brazilian Educational UX Patterns

#### Data Input Formatting
```typescript
// CPF Input Implementation
const CPFInput = ({ value, onChange, ...props }) => {
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  return (
    <Input
      {...props}
      value={formatCPF(value)}
      onChange={(e) => onChange(formatCPF(e.target.value))}
      placeholder="000.000.000-00"
      maxLength={14}
    />
  );
};

// Phone Input Implementation
const PhoneInput = ({ value, onChange, ...props }) => {
  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  return (
    <Input
      {...props}
      value={formatPhone(value)}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      placeholder="(00) 00000-0000"
      maxLength={15}
    />
  );
};
```

#### Educational Terminology Consistency
- **Student Management**: "Aluno(a)", "Matrícula", "Responsável"
- **Attendance**: "Frequência", "Presença", "Falta", "Abrir Aula"
- **Academic**: "Turma", "Série", "Ano Letivo", "Bimestre"
- **Grading**: "Nota", "Conceito", "Avaliação", "Recuperação"
- **Administration**: "Escola", "Diretor(a)", "Secretário(a)", "Professor(a)"

#### Form Validation Messages (Portuguese)
```typescript
const validationMessages = {
  required: "Este campo é obrigatório",
  cpf: {
    invalid: "CPF inválido",
    required: "CPF é obrigatório"
  },
  phone: {
    invalid: "Telefone inválido",
    required: "Telefone é obrigatório"
  },
  email: {
    invalid: "E-mail inválido",
    required: "E-mail é obrigatório"
  },
  date: {
    invalid: "Data inválida",
    future: "Data não pode ser futura",
    required: "Data é obrigatória"
  }
};
```

### 3. Mobile-First Responsive Design

#### Touch Target Specifications
- **Minimum Size**: 44px × 44px for all interactive elements
- **Spacing**: Minimum 8px between touch targets
- **Implementation**:
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
  margin: 4px;
}

.button-group .touch-target:not(:last-child) {
  margin-right: 8px;
}
```

#### Table Responsive Behavior
```typescript
const ResponsiveTable = ({ children, ...props }) => {
  return (
    <div className="overflow-x-auto">
      <Table {...props} className="min-w-full">
        {children}
      </Table>
    </div>
  );
};

// Mobile table cards fallback
const MobileTableCard = ({ row, columns }) => {
  return (
    <Card className="mb-4 md:hidden">
      <CardContent className="p-4">
        {columns.map((column) => (
          <div key={column.key} className="flex justify-between py-2">
            <span className="font-medium">{column.label}:</span>
            <span>{row[column.key]}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
```

#### Form Optimization for Tablets
- **Input Height**: Minimum 48px for comfortable tablet input
- **Keyboard Types**: Appropriate input types for mobile keyboards
- **Form Layout**: Single column on mobile, multi-column on tablet
```css
.form-container {
  @apply grid gap-4;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .form-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .form-container {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

#### Navigation Drawer for Mobile
```typescript
const MobileNavigation = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <nav className="flex flex-col space-y-4">
          {/* Navigation items */}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
```

### 4. Performance Optimization

#### Component Lazy Loading Strategy
```typescript
// Lazy load heavy components
const AttendanceGrid = lazy(() => import('./components/AttendanceGrid'));
const ReportsModule = lazy(() => import('./modules/Reports'));
const StudentManagement = lazy(() => import('./modules/StudentManagement'));

// Preload critical components
const preloadCriticalComponents = () => {
  import('./components/AttendanceGrid');
  import('./components/StudentForm');
};
```

#### Bundle Size Optimization
- **Tree Shaking**: Import only required shadcn/ui components
- **Code Splitting**: Route-based splitting for each module
- **Dynamic Imports**: Load heavy libraries on demand
```typescript
// Correct import pattern
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Avoid barrel imports for better tree shaking
// import * from "@/components/ui"; // ❌ Bad
```

#### Touch Gesture Support
```typescript
// Implement swipe gestures for mobile tables
const useSwipeGestures = (onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
    if (isRightSwipe && onSwipeRight) onSwipeRight();
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
};
```

#### Offline Capability Preparation
```typescript
// Service Worker registration for offline support
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Offline state detection
const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};
```

### 5. Accessibility Compliance

#### ARIA Labels for Educational Forms
```typescript
const StudentForm = () => {
  return (
    <Form>
      <FormField
        name="nome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome Completo do Aluno</FormLabel>
            <FormControl>
              <Input
                {...field}
                aria-describedby="nome-description"
                aria-required="true"
                placeholder="Digite o nome completo"
              />
            </FormControl>
            <FormDescription id="nome-description">
              Nome como consta na certidão de nascimento
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
};
```

#### Keyboard Navigation Support
```typescript
// Implement keyboard navigation for tables
const useKeyboardNavigation = (rowCount: number, columnCount: number) => {
  const [focusPosition, setFocusPosition] = useState({ row: 0, col: 0 });

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setFocusPosition(prev => ({
          ...prev,
          row: Math.max(0, prev.row - 1)
        }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusPosition(prev => ({
          ...prev,
          row: Math.min(rowCount - 1, prev.row + 1)
        }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusPosition(prev => ({
          ...prev,
          col: Math.max(0, prev.col - 1)
        }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setFocusPosition(prev => ({
          ...prev,
          col: Math.min(columnCount - 1, prev.col + 1)
        }));
        break;
    }
  };

  return { focusPosition, handleKeyDown };
};
```

#### Screen Reader Support
```typescript
// Implement live regions for dynamic content
const LiveRegion = ({ message, priority = 'polite' }: {
  message: string;
  priority?: 'polite' | 'assertive';
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

// Usage in attendance marking
const AttendanceStatus = ({ studentName, status }: {
  studentName: string;
  status: 'presente' | 'falta';
}) => {
  const [announcement, setAnnouncement] = useState('');

  const handleStatusChange = (newStatus: string) => {
    setAnnouncement(`${studentName} marcado como ${newStatus}`);
  };

  return (
    <>
      <LiveRegion message={announcement} />
      {/* Attendance marking component */}
    </>
  );
};
```

#### Color Contrast Compliance
```css
/* WCAG AA compliant color palette */
:root {
  --primary: hsl(214, 84%, 56%);           /* 4.5:1 contrast ratio */
  --primary-foreground: hsl(0, 0%, 100%);  /* White text on primary */
  --secondary: hsl(210, 40%, 96%);         /* Light gray background */
  --secondary-foreground: hsl(222, 84%, 5%); /* Dark text on secondary */

  --success: hsl(142, 76%, 36%);           /* Green for presence */
  --success-foreground: hsl(0, 0%, 100%);
  --destructive: hsl(0, 84%, 60%);         /* Red for absence */
  --destructive-foreground: hsl(0, 0%, 100%);

  --warning: hsl(38, 92%, 50%);            /* Orange for warnings */
  --warning-foreground: hsl(0, 0%, 100%);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --primary: hsl(214, 100%, 40%);
    --border: hsl(0, 0%, 0%);
  }
}
```

## Approach

### 1. Implementation Phases

#### Phase 1: Core Component Library (Week 1-2)
- Set up shadcn/ui base components
- Implement Brazilian data input components (CPF, Phone)
- Create form validation schemas with Zod
- Establish color palette and typography system

#### Phase 2: Educational UX Patterns (Week 3-4)
- Implement responsive table components
- Create mobile navigation patterns
- Build educational-specific form layouts
- Establish Portuguese validation messages

#### Phase 3: Performance & Accessibility (Week 5-6)
- Implement lazy loading for heavy components
- Add keyboard navigation support
- Ensure WCAG AA compliance
- Optimize bundle sizes and implement code splitting

#### Phase 4: Integration & Testing (Week 7-8)
- Integrate with existing gestao_fronteira components
- Implement comprehensive testing suite
- Performance audits and optimization
- Documentation and style guide creation

### 2. Migration Strategy

#### Component Replacement Approach
```typescript
// Legacy component wrapper for gradual migration
const LegacyFormWrapper = ({ children, ...props }) => {
  const isNewComponent = useFeatureFlag('new-form-components');

  if (isNewComponent) {
    return <NewFormComponent {...props}>{children}</NewFormComponent>;
  }

  return <LegacyFormComponent {...props}>{children}</LegacyFormComponent>;
};
```

#### Testing Integration Points
- Unit tests for all new components
- Integration tests for form workflows
- Visual regression tests for UI consistency
- Accessibility testing with axe-core
- Performance testing with Lighthouse

### 3. Development Guidelines

#### Component Development Standards
```typescript
// Component template with TypeScript and accessibility
interface ComponentProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ children, className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(componentVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Component.displayName = 'Component';
```

#### File Organization
```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── forms/              # Educational form components
│   │   ├── StudentForm/
│   │   ├── AttendanceForm/
│   │   └── UserForm/
│   ├── tables/             # Data table components
│   ├── navigation/         # Navigation components
│   └── educational/        # Domain-specific components
├── hooks/                  # Custom React hooks
├── lib/
│   ├── validations/        # Zod schemas
│   ├── formatters/         # Brazilian data formatters
│   └── utils/              # Utility functions
└── styles/
    ├── globals.css         # Global styles
    └── components.css      # Component-specific styles
```

## External Dependencies

### Required Packages
```json
{
  "dependencies": {
    "@radix-ui/react-*": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.400.0",
    "tailwind-merge": "^2.0.0",
    "react-hook-form": "^7.47.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "vitest": "^1.0.0",
    "@axe-core/react": "^4.8.0"
  }
}
```

### Peer Dependencies
- React 18.3+
- TypeScript 5.0+
- Tailwind CSS 3.3+

### Build Tools Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-form'],
          'utils': ['clsx', 'tailwind-merge']
        }
      }
    }
  }
});
```

### Testing Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});

// src/test/setup.ts
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({ testIdAttribute: 'data-testid' });
```

### Integration Requirements
- Supabase client for data fetching
- React Query for state management
- Zustand for global state (if needed)
- i18next for internationalization (future)
- React Router or Next.js for routing