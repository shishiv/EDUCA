# Educational UI Components

Brazilian educational components for the gestao_fronteira school management system.

## Components

### CPF Input (`cpf-input.tsx`)
Brazilian CPF validation and formatting component.

**Features:**
- Real-time CPF formatting (XXX.XXX.XXX-XX)
- Brazilian CPF algorithm validation
- Mobile-optimized numeric input
- Accessibility support with ARIA labels
- Visual validation feedback

**Usage:**
```tsx
import { CPFInput } from '@/components/ui/educational';

<CPFInput
  value={cpf}
  onChange={(value, isValid) => setCpf(value)}
  showValidation={true}
  placeholder="Digite o CPF"
/>
```

### Phone Input (`phone-input.tsx`)
Brazilian phone number input with mobile/landline detection.

**Features:**
- Brazilian phone formatting ((XX) XXXX-XXXX / (XX) 9XXXX-XXXX)
- Automatic mobile/landline detection
- DDD (area code) validation for all Brazilian states
- Type indicator badge
- Mobile-optimized input

**Usage:**
```tsx
import { PhoneInput } from '@/components/ui/educational';

<PhoneInput
  value={phone}
  onChange={(value, isValid, phoneData) => setPhone(value)}
  showTypeBadge={true}
  showValidation={true}
/>
```

### Educational Label (`educational-label.tsx`)
Enhanced labels with Brazilian educational context.

**Features:**
- Required field indicators in Portuguese
- Educational field type context
- Tooltips for educational terminology
- Accessibility support
- Mobile-friendly touch targets

**Usage:**
```tsx
import { EducationalLabel } from '@/components/ui/educational';

<EducationalLabel
  required
  fieldType="cpf"
  tooltip="CPF é obrigatório para matrícula escolar"
  htmlFor="student-cpf"
>
  CPF do Aluno
</EducationalLabel>
```

### Attendance Status Button (`attendance-status-button.tsx`)
Touch-optimized attendance marking for Brazilian schools.

**Features:**
- Touch-optimized sizes for tablets
- Brazilian Portuguese status labels
- Confirmation states to prevent accidents
- Accessibility support
- Compliance with Brazilian attendance regulations

**Usage:**
```tsx
import { AttendanceStatusButton } from '@/components/ui/educational';

<AttendanceStatusButton
  status="pending"
  onStatusChange={(status) => markAttendance(studentId, status)}
  studentName="João Silva"
  size="touch"
  requireConfirmation={true}
/>
```

## Hooks

### Orientation Hook (`use-orientation.ts`)
Device orientation detection for responsive layouts.

**Usage:**
```tsx
import { useOrientation } from '@/hooks/ui';

const { orientation, angle, isChanging } = useOrientation({
  debounceMs: 300,
  onChange: (state) => console.log('Orientation changed:', state.orientation)
});
```

### Viewport Hook (`use-viewport.ts`)
Viewport and device capability detection.

**Usage:**
```tsx
import { useViewport, useOptimizedSizes } from '@/hooks/ui';

const { width, breakpoint, capabilities } = useViewport();
const { buttonSize, inputSize } = useOptimizedSizes();

// Responsive rendering
if (capabilities.isMobile) {
  return <MobileLayout />;
} else if (capabilities.isTablet) {
  return <TabletLayout />;
} else {
  return <DesktopLayout />;
}
```

## Brazilian Educational Context

These components are specifically designed for Brazilian educational institutions:

- **CPF Validation**: Uses official Brazilian CPF validation algorithm
- **Phone Formatting**: Supports Brazilian mobile (9XXXX-XXXX) and landline (XXXX-XXXX) formats
- **DDD Validation**: Validates area codes for all Brazilian states
- **Portuguese Labels**: All user-facing text is in Brazilian Portuguese
- **Educational Compliance**: Attendance components follow Brazilian educational regulations
- **Touch Optimization**: Designed for tablet use common in Brazilian schools

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Touch target minimum sizes (44px for touch devices)
- Focus management and indicators

## Dependencies

- `@radix-ui/react-*`: Base UI primitives
- `lucide-react`: Icons
- `class-variance-authority`: Component variants
- `clsx` / `tailwind-merge`: CSS class utilities
- Brazilian validators from `@/lib/validators/brazilian/`

## Import Patterns

```tsx
// Individual components
import { CPFInput, PhoneInput } from '@/components/ui/educational';

// Hooks
import { useOrientation, useViewport } from '@/hooks/ui';

// Types
import type { AttendanceStatus, BrazilianPhoneFormat } from '@/components/ui/educational';
```