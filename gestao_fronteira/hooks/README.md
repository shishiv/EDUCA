# hooks/ - UI & Generic Hooks

This directory contains **UI-focused and generic hooks** that are reusable across the application. These hooks handle common UI patterns, browser APIs, and generic state management.

## Organization Principle

**`hooks/`** contains hooks that are:
- Generic/reusable across multiple features
- Focused on UI, browser APIs, or authentication
- Not specific to the educational domain
- Can be used in multiple contexts

## Hooks Reference

### Authentication & User Management

#### `use-auth.ts`
**Purpose:** Core authentication and user profile management
**Dependencies:** `@supabase/supabase-js`
**Exports:** `useAuth()`

Provides current authenticated user, user profile, loading state, and authentication methods.

```tsx
const { user, userProfile, loading, signIn, signOut } = useAuth()
```

**Key Features:**
- Get current authenticated user from Supabase
- Fetch user profile with role information
- Listen for auth state changes (login/logout/token refresh)
- Wrapper methods for sign-in/sign-out with audit logging

### UI Notifications

#### `use-toast.ts`
**Purpose:** Toast notification management (inspired by react-hot-toast)
**Dependencies:** React (built-in, no external deps)
**Exports:** `useToast()`, `toast()`

Provides toast notification UI state and lifecycle management.

```tsx
const { toasts, toast, dismiss } = useToast()

// Create a toast
toast({ title: 'Success', description: 'Operation completed' })

// Or use directly
toast.success('Done!')
```

**Key Features:**
- Single active toast at a time (configurable)
- Auto-dismiss after configurable delay
- Manual dismiss capability
- Toast state management with reducer pattern

### Real-time Updates

#### `use-aula-realtime.ts`
**Purpose:** Real-time attendance session status with Supabase subscriptions
**Dependencies:** `@supabase/supabase-js`
**Exports:** `useAulaRealtime()`

Provides live updates for "Abrir aula" (open class) sessions with automatic time tracking.

```tsx
const { status, remainingTime, isOpen, isLocked, refreshStatus } = useAulaRealtime({
  turmaId: 'class-123',
  professorId: 'teacher-456'
})
```

**Key Features:**
- Real-time session status updates
- Automatic countdown timer for session duration
- Auto-lock when time expires
- Conflict detection for concurrent sessions
- Performance optimized with ref-based subscriptions

### Service Worker & Offline Support

#### `use-service-worker.ts`
**Purpose:** Service Worker registration and offline capability management
**Dependencies:** Browser APIs (navigator.serviceWorker, indexedDB)
**Exports:** `useServiceWorker()`

Manages service worker lifecycle and offline attendance marking capability.

```tsx
const { isInstalled, isOnline, needsUpdate, getOfflineCount } = useServiceWorker()
```

**Key Features:**
- Service worker registration and update detection
- Online/offline status tracking
- Cache management (clear, update)
- IndexedDB integration for offline attendance data
- Background sync support

### Compliance & Warnings

#### `use-compliance-warnings.ts`
**Purpose:** Compliance alerts and warnings system
**Dependencies:** `@tanstack/react-query`
**Exports:** `useComplianceWarnings()`

Provides compliance warnings for educational data (attendance, enrollment, LGPD).

```tsx
const { data: warnings, isLoading } = useComplianceWarnings()
```

**Key Features:**
- Query-based compliance warning system
- Auto-refresh every 10 minutes
- Severity levels (low, medium, high, critical)
- Warning types: attendance, enrollment, reporting, LGPD

### Data Management

#### `use-users-query.ts`
**Purpose:** User CRUD operations with React Query integration
**Dependencies:** `@tanstack/react-query`, `sonner` (toast)
**Exports:** Multiple hooks for users operations

Provides hooks for fetching, creating, updating, and subscribing to user data.

```tsx
// Query users
const { data: users } = useUsersWithSchool({ roles: ['professor'] })

// Create user
const createMutation = useCreateUser()
await createMutation.mutateAsync(userData)

// Subscribe to changes
useUsersSubscription()

// Search users with debounce
const { data: results } = useSearchUsers('search term')
```

**Key Features:**
- User CRUD operations (create, read, update, delete)
- Bulk operations (update status, assign school)
- Real-time subscriptions with React Query invalidation
- User stats and aggregate data
- Search with debounce
- Role management helpers
- Optimistic cache updates

## Import Statements

```tsx
// Direct imports
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useAulaRealtime } from '@/hooks/use-aula-realtime'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { useComplianceWarnings } from '@/hooks/use-compliance-warnings'
import { useUsersWithSchool, useCreateUser, useUsersSubscription } from '@/hooks/use-users-query'

// Barrel export (recommended)
import { useAuth, useToast, useServiceWorker } from '@/hooks'
```

## When to Add New Hooks Here

Add a new hook to `hooks/` when:
- It's a generic UI pattern (forms, modals, dialogs)
- It handles browser APIs (local storage, service workers, sensors)
- It's a generic state management pattern
- It can be reused across multiple features
- It's NOT specific to the educational domain

## When to Use `lib/hooks/` Instead

Use `lib/hooks/` for:
- Attendance-specific workflows (use-attendance-workflow)
- Educational domain operations (use-realtime-attendance)
- Specialized business logic hooks (use-attendance-locking)
- Compliance-specific workflows (use-attendance-history)

## Best Practices

1. **Keep hooks focused** - Each hook should do one thing well
2. **Name hooks clearly** - Use `use-` prefix, descriptive names
3. **Document parameters** - Include JSDoc for hook options
4. **Export from barrel** - Add to `index.ts` for consistency
5. **Handle loading/error** - Always provide loading and error states
6. **Use TypeScript** - Define interfaces for options and return types
7. **Test thoroughly** - Write tests for hook behavior
8. **Performance** - Use useCallback, useRef for optimization

## See Also

- **Domain Hooks:** See `lib/hooks/README.md` for educational domain-specific hooks
- **API Clients:** See `lib/api/` for server communication
- **Stores:** See `lib/stores/` for global state with Zustand
