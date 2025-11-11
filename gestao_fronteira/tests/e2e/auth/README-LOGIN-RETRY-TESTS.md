# Login Retry Logic - E2E Tests Documentation

## 📋 Overview

This test suite validates the login retry logic implemented in FASE 1, which prevents race conditions when loading user profiles during authentication.

**Test File**: `tests/e2e/auth/login-retry.spec.ts`

## 🎯 Test Coverage

### Test Suite 1: Login Retry Logic - Profile Loading

#### Test 1: Login with Existing Profile (Happy Path)
**Scenario**: User profile exists and loads immediately on first attempt.

**Expected Behavior**:
- ✅ Login form submits successfully
- ✅ Loading button shows "Entrando..." with spinner
- ✅ Success toast: "Login realizado com sucesso!"
- ✅ Redirects to `/dashboard` without retries
- ✅ Profile loaded on first attempt (no retries needed)
- ✅ No error messages displayed

**Assertions**:
- `profileRequests.length <= 2` (initial + possible cache)
- URL matches `/dashboard`
- No error alerts visible

---

#### Test 2: Login with Profile Race Condition (2 Retries Succeed)
**Scenario**: Profile is not immediately available (race condition), but loads after 2 retry attempts.

**Mocked Behavior**:
- First 2 `getUserProfile()` calls return `null` (empty array)
- Third call returns actual user profile

**Expected Behavior**:
- ✅ Login button submits
- ✅ Loading state visible for ~2-3 seconds (due to retries)
- ✅ System retries profile loading 2 times (500ms delay between retries)
- ✅ Success toast appears after retries succeed
- ✅ Redirects to `/dashboard` after profile loads
- ✅ Logger shows retry attempts (in backend logs)

**Assertions**:
- `profileRequestCount === 3` (initial + 2 retries)
- URL matches `/dashboard`
- Success toast visible within 8 seconds

**Retry Logic**:
```typescript
Retry 1: 500ms delay
Retry 2: 500ms delay
Total: ~1-2 seconds + network time
```

---

#### Test 3: Login with Profile Not Found (5 Retries Fail)
**Scenario**: User profile does not exist in database after maximum retry attempts.

**Mocked Behavior**:
- All `getUserProfile()` calls return `null` (empty array)
- Maximum 5 retry attempts

**Expected Behavior**:
- ✅ Login button submits
- ✅ Loading state visible for ~2.5 seconds (5 retries × 500ms)
- ✅ Error alert: "Perfil de usuário não encontrado. Contate o administrador."
- ✅ Error toast: "Erro: Perfil não encontrado"
- ✅ User is logged out automatically (`signOut()` called)
- ✅ Remains on `/login` page (no redirect)
- ✅ Loading state ends after failure

**Assertions**:
- `profileRequestCount === 5` (max retries reached)
- `signOutCalled === true`
- URL matches `/login`
- Error alert visible within 15 seconds
- Loading button not visible after error

**Retry Logic**:
```typescript
Retry 1: 500ms delay
Retry 2: 500ms delay
Retry 3: 500ms delay
Retry 4: 500ms delay
Retry 5: 500ms delay
Total: ~2.5 seconds + network time
```

---

#### Test 4: Loading State Duration During Retries
**Scenario**: Validate that loading state duration is reasonable during retry attempts.

**Expected Behavior**:
- ✅ Loading takes 2-3 seconds with 2 retries
- ✅ Loading duration < 5 seconds (reasonable max)
- ✅ Each retry has 500ms delay

**Assertions**:
- `duration > 2000ms` (at least 2 seconds)
- `duration < 5000ms` (less than 5 seconds)

---

#### Test 5: Verify Auth Session Persistence After Retry Success
**Scenario**: After successful login with retries, auth session should persist across page reloads.

**Expected Behavior**:
- ✅ Login succeeds after 1 retry
- ✅ Redirects to `/dashboard`
- ✅ Supabase auth session stored in localStorage
- ✅ Page reload maintains session (stays on `/dashboard`)

**Assertions**:
- `authData.length > 0` (localStorage has auth keys)
- URL remains `/dashboard` after reload

---

### Test Suite 2: Login Retry Logic - Accessibility & UX

#### Test 6: Login Form Accessibility
**Validates**: WCAG 2.1 AA compliance for form labels.

**Expected Behavior**:
- ✅ Email field has visible label
- ✅ Password field has visible label
- ✅ Labels use semantic HTML (`<label for="...">`)

---

#### Test 7: Loading State with Icon
**Validates**: Visual feedback during loading.

**Expected Behavior**:
- ✅ Button shows "Entrando..." text
- ✅ Spinner icon (Loader2) visible
- ✅ Button disabled during loading

---

#### Test 8: Error Message Visibility
**Validates**: Error messages are clearly visible and styled correctly.

**Expected Behavior**:
- ✅ Error alert visible with `role="alert"`
- ✅ Destructive styling (red background)

---

#### Test 9: Mobile Responsiveness (375x667)
**Validates**: Touch-friendly UI on mobile devices.

**Expected Behavior**:
- ✅ Login card fits within viewport
- ✅ Email input ≥44px height
- ✅ Password input ≥44px height
- ✅ Submit button ≥44px height

---

## 🚀 Running the Tests

### Prerequisites

1. **Start development server**:
   ```bash
   cd gestao_fronteira/
   pnpm dev
   ```

2. **Ensure Supabase MCP is configured** (for database access):
   ```bash
   # .mcp.json should have Supabase MCP configured
   ```

### Run Tests

#### Option 1: Run all login retry tests
```bash
pnpm test:e2e tests/e2e/auth/login-retry.spec.ts
```

#### Option 2: Run specific test
```bash
pnpm test:e2e tests/e2e/auth/login-retry.spec.ts -g "Test 1: Login with existing profile"
```

#### Option 3: Run with Playwright UI (debugging)
```bash
pnpm test:e2e:ui tests/e2e/auth/login-retry.spec.ts
```

#### Option 4: Run in headed mode (see browser)
```bash
pnpm test:e2e:headed tests/e2e/auth/login-retry.spec.ts
```

---

## 📊 Expected Test Results

### All Tests Passing (9/9)

```
✓ Test 1: Login with existing profile (happy path)           (3s)
✓ Test 2: Login with profile race condition (2 retries)      (5s)
✓ Test 3: Login with profile not found (5 retries fail)     (15s)
✓ Test 4: Loading state duration during retries              (4s)
✓ Test 5: Verify auth session persistence after retry        (6s)
✓ Login form should have accessible labels                   (1s)
✓ Login button should show loading state with icon           (2s)
✓ Error message should be clearly visible with proper styling (15s)
✓ Login page should be responsive on mobile (375x667)        (1s)

Total: 9 tests passed in 52s
```

---

## 🐛 Troubleshooting

### Issue: Tests Timeout
**Solution**: Increase timeout in `playwright.config.ts`:
```typescript
timeout: 30000, // 30 seconds
```

### Issue: Profile Not Found Error
**Solution**: Ensure test user exists in database:
```bash
pnpm seed:dev
```

### Issue: Mock Not Working
**Solution**: Check route pattern matches Supabase API:
```typescript
await page.route('**/rest/v1/users?*', async (route) => {
  // Mock implementation
})
```

---

## 🔗 Related Files

- **Login Page**: `app/(auth)/login/page.tsx`
- **Auth Library**: `lib/auth.ts`
- **getUserProfile**: `lib/auth.ts:107-132`
- **Retry Logic**: `app/(auth)/login/page.tsx:46-86`
- **Bug Analysis**: `BUGS-ANALYSIS.md`

---

## 📝 Test Maintenance

### When to Update Tests

1. **Retry Logic Changes**: If max retries or delay changes, update Test 2, 3, 4
2. **Error Messages**: If error text changes, update Test 3, 8
3. **UI Changes**: If login form layout changes, update Test 6, 9
4. **Auth Flow**: If auth flow changes, update all tests

### Adding New Tests

To add new test cases:
```typescript
test('Test 10: Your new test case', async ({ page }) => {
  // Test implementation
})
```

---

## ✅ Checklist Before Committing

- [ ] All 9 tests pass
- [ ] Tests run in < 60 seconds
- [ ] No flaky tests (run 3 times to verify)
- [ ] Screenshots captured for failures
- [ ] Test results documented
- [ ] BUGS-ANALYSIS.md updated if bug fixed

---

## 📄 License

© 2025 Prefeitura de Fronteira/MG - Sistema Escolar Municipal
