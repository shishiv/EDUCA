# Quick Start Guide - Login Retry E2E Tests

## ⚡ 30-Second Quick Start

```bash
cd gestao_fronteira/
pnpm dev                                                    # Terminal 1
pnpm test:e2e tests/e2e/auth/login-retry.spec.ts          # Terminal 2
```

---

## 📋 Prerequisites Checklist

- [x] Node.js installed (v18+)
- [x] pnpm installed (`npm install -g pnpm`)
- [x] Supabase MCP configured (`.mcp.json`)
- [x] Environment variables set (`.env.local`)
- [x] Dependencies installed (`pnpm install`)

---

## 🚀 Execution Options

### Option 1: Headless Mode (Default - CI/CD)
```bash
pnpm test:e2e tests/e2e/auth/login-retry.spec.ts
```
**Use When**: Running in CI/CD or local validation
**Output**: Terminal output + HTML report

---

### Option 2: UI Mode (Best for Development)
```bash
pnpm test:e2e:ui tests/e2e/auth/login-retry.spec.ts
```
**Use When**: Developing or debugging tests
**Features**:
- Visual test execution
- Step-by-step debugging
- Network inspection
- Time travel debugging

---

### Option 3: Headed Mode (See Browser)
```bash
pnpm test:e2e:headed tests/e2e/auth/login-retry.spec.ts
```
**Use When**: Visual validation of UI/UX
**Features**:
- Watch tests run in real browser
- See actual user experience
- Debug visual issues

---

### Option 4: Test Runner Script (Recommended)
```bash
chmod +x tests/e2e/auth/run-login-tests.sh
./tests/e2e/auth/run-login-tests.sh
```
**Features**:
- Auto-starts dev server
- Color-coded output
- Automatic cleanup
- Multiple modes available

**Script Modes**:
```bash
./run-login-tests.sh              # Headless mode
./run-login-tests.sh --ui         # UI mode
./run-login-tests.sh --headed     # Headed mode
./run-login-tests.sh --debug      # Debug mode
./run-login-tests.sh --single "Test 1"  # Single test
```

---

## 📊 Expected Output

### Success (All 9 Tests Pass)
```
Running 9 tests using 1 worker

  ✓  Test 1: Login with existing profile (happy path) (3s)
  ✓  Test 2: Login with profile race condition (2 retries) (5s)
  ✓  Test 3: Login with profile not found (5 retries fail) (15s)
  ✓  Test 4: Loading state duration during retries (4s)
  ✓  Test 5: Verify auth session persistence (6s)
  ✓  Login form should have accessible labels (1s)
  ✓  Login button should show loading state with icon (2s)
  ✓  Error message should be clearly visible (15s)
  ✓  Login page should be responsive on mobile (1s)

  9 passed (52s)
```

### View HTML Report
```bash
npx playwright show-report
```

---

## ❌ Troubleshooting

### Error: "Cannot find module '@playwright/test'"
**Solution**:
```bash
pnpm install
```

### Error: "Error: connect ECONNREFUSED ::1:3000"
**Solution**: Start dev server first
```bash
pnpm dev
```

### Error: "Timeout exceeded"
**Solution**: Increase timeout or check dev server
```bash
# Check if server is running
curl http://localhost:3000

# If not, restart server
pnpm dev
```

### Tests are Flaky
**Solution**: Run multiple times to confirm
```bash
# Run 3 times
for i in {1..3}; do
  echo "Run $i:"
  pnpm test:e2e tests/e2e/auth/login-retry.spec.ts
done
```

---

## 🎯 What to Check After Running

### 1. Test Results
```
✓ All 9 tests passed
✓ Execution time < 60 seconds
✓ No errors in console
```

### 2. Test Artifacts
Check `test-results/` directory:
```
test-results/
├── screenshots/          # Visual validation
├── videos/              # Failure recordings
├── traces/              # Execution traces
└── results.json         # Machine-readable results
```

### 3. HTML Report
```bash
npx playwright show-report
```

---

## 📚 Need More Info?

### Quick References
- **Executive Summary**: `TEST-SUMMARY.md`
- **Developer Guide**: `README-LOGIN-RETRY-TESTS.md`
- **Visual Flows**: `VISUAL-FLOW.md`
- **Interpreting Results**: `INTERPRETING-RESULTS.md`
- **Navigation**: `INDEX.md`
- **Full Summary**: `FASE7-COMPLETE-SUMMARY.md`

### Common Commands
```bash
# Run specific test
pnpm test:e2e tests/e2e/auth/login-retry.spec.ts -g "Test 1"

# Run with different browser
pnpm test:e2e tests/e2e/auth/login-retry.spec.ts --project=firefox

# Debug mode
pnpm test:e2e tests/e2e/auth/login-retry.spec.ts --debug

# Generate HTML report
npx playwright show-report
```

---

## ✅ Success Criteria

After running tests, verify:

- [ ] All 9 tests passed
- [ ] Execution time < 60 seconds
- [ ] No console errors
- [ ] Screenshots validate UI rendering
- [ ] HTML report shows 100% pass rate

---

## 🎉 Next Steps

### If All Tests Pass ✅
1. Update `BUGS-ANALYSIS.md` (mark login bug as fixed)
2. Update `CHANGELOG.md`
3. Commit tests to feature branch
4. Create pull request
5. Deploy to staging

### If Tests Fail ❌
1. Read `INTERPRETING-RESULTS.md`
2. Check failure screenshots in `test-results/`
3. Run in UI mode for debugging: `pnpm test:e2e:ui`
4. Fix issues and re-run
5. Update documentation if needed

---

**Quick Start Guide Complete**
**Time to Complete**: ~2 minutes
**Difficulty**: Easy

© 2025 Prefeitura de Fronteira/MG - Sistema Escolar Municipal
