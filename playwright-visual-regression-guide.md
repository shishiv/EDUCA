# Playwright Visual Regression Testing Guide for Educational Management Systems

## Overview

This comprehensive guide provides Playwright visual regression testing setup specifically tailored for Next.js educational management systems with Brazilian Portuguese interfaces. The configuration includes mobile-first responsive testing, accessibility integration, and CI/CD automation.

## Table of Contents

1. [Installation and Basic Setup](#installation-and-basic-setup)
2. [Playwright Configuration](#playwright-configuration)
3. [Visual Regression Testing](#visual-regression-testing)
4. [Mobile and Responsive Testing](#mobile-and-responsive-testing)
5. [Accessibility Testing Integration](#accessibility-testing-integration)
6. [CI/CD Configuration](#cicd-configuration)
7. [Educational System Specific Tests](#educational-system-specific-tests)
8. [Brazilian Portuguese Interface Testing](#brazilian-portuguese-interface-testing)

## Installation and Basic Setup

### Dependencies

```bash
# Core Playwright dependencies
npm install @playwright/test @playwright/test-tools

# Visual regression testing
npm install sharp

# Accessibility testing
npm install @axe-core/playwright

# Additional utilities
npm install dotenv
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:visual": "playwright test --grep=\"visual\"",
    "test:visual:update": "playwright test --grep=\"visual\" --update-snapshots",
    "test:mobile": "playwright test --grep=\"mobile\"",
    "test:accessibility": "playwright test --grep=\"accessibility\"",
    "test:ci": "playwright test --reporter=github"
  }
}
```

## Playwright Configuration

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',

  // Global test timeout
  timeout: 30 * 1000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
    // Visual comparison threshold
    threshold: 0.2,
    // Animation handling
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'strict'
    }
  },

  // Test configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github']] : [])
  ],

  // Global test settings
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_URL || 'http://localhost:3000',

    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    // Animation handling
    reducedMotion: 'reduce',

    // Locale for Brazilian Portuguese
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
    }
  },

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_E2E_TESTING: 'true',
      NODE_ENV: 'test'
    },
    timeout: 120 * 1000
  },

  // Project configurations for different browsers and viewports
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          reducedMotion: 'reduce'
        }
      }
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        contextOptions: {
          reducedMotion: 'reduce'
        }
      }
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        contextOptions: {
          reducedMotion: 'reduce'
        }
      }
    },

    // Mobile devices - Brazilian market focused
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Galaxy S9+'],
        contextOptions: {
          reducedMotion: 'reduce'
        }
      }
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        contextOptions: {
          reducedMotion: 'reduce'
        }
      }
    },

    // Tablet devices
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro'],
        contextOptions: {
          reducedMotion: 'reduce'
        }
      }
    },

    // Custom viewport sizes for Brazilian educational context
    {
      name: 'escola-tablet',
      use: {
        viewport: { width: 1024, height: 768 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        contextOptions: {
          reducedMotion: 'reduce'
        }
      }
    }
  ]
});
```

## Visual Regression Testing

### Base Visual Test Utilities

```typescript
// tests/utils/visual-helpers.ts
import { Page, expect } from '@playwright/test';

export interface VisualTestOptions {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  mask?: string[];
  threshold?: number;
  animations?: 'disabled' | 'allow';
}

export class VisualTestHelper {
  constructor(private page: Page) {}

  async hideAnimations() {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
        }
      `
    });
  }

  async waitForStableState() {
    // Wait for any pending network requests
    await this.page.waitForLoadState('networkidle');

    // Wait for any lazy-loaded images
    await this.page.waitForFunction(() => {
      const images = Array.from(document.images);
      return images.every(img => img.complete);
    });

    // Wait for potential skeleton loaders to disappear
    await this.page.waitForSelector('[data-testid="skeleton"]', {
      state: 'detached',
      timeout: 5000
    }).catch(() => {});
  }

  async takeScreenshot(name: string, options: VisualTestOptions = {}) {
    const {
      fullPage = true,
      mask = [],
      threshold = 0.2,
      animations = 'disabled'
    } = options;

    if (animations === 'disabled') {
      await this.hideAnimations();
    }

    await this.waitForStableState();

    const maskSelectors = [
      // Common dynamic elements
      '[data-testid="timestamp"]',
      '[data-testid="loading"]',
      '.animate-spin',
      '.animate-pulse',
      ...mask
    ];

    const maskLocators = maskSelectors.map(selector =>
      this.page.locator(selector)
    );

    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      fullPage,
      threshold,
      mask: maskLocators
    });
  }
}
```

### Educational System Visual Tests

```typescript
// tests/visual/attendance-system.spec.ts
import { test, expect } from '@playwright/test';
import { VisualTestHelper } from '../utils/visual-helpers';

test.describe('Attendance System Visual Regression', () => {
  let visualHelper: VisualTestHelper;

  test.beforeEach(async ({ page }) => {
    visualHelper = new VisualTestHelper(page);

    // Login as teacher
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'professor@escola.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');
  });

  test('attendance marking interface - desktop', async ({ page }) => {
    await page.goto('/frequencia');
    await page.waitForSelector('[data-testid="attendance-grid"]');

    // Select a class
    await page.selectOption('[data-testid="class-select"]', '5A');
    await page.waitForSelector('[data-testid="student-list"]');

    await visualHelper.takeScreenshot('attendance-marking-desktop', {
      mask: ['[data-testid="current-date"]']
    });
  });

  test('attendance marking interface - mobile', async ({ page }) => {
    // This test runs on mobile projects automatically
    await page.goto('/frequencia');
    await page.waitForSelector('[data-testid="attendance-grid"]');

    // Mobile-specific interactions
    await page.tap('[data-testid="mobile-menu"]');
    await page.selectOption('[data-testid="class-select"]', '5A');

    await visualHelper.takeScreenshot('attendance-marking-mobile', {
      mask: ['[data-testid="current-date"]']
    });
  });

  test('student registration form', async ({ page }) => {
    await page.goto('/alunos/novo');
    await page.waitForSelector('[data-testid="student-form"]');

    // Fill form with Brazilian data
    await page.fill('[data-testid="nome"]', 'João Silva Santos');
    await page.fill('[data-testid="cpf"]', '123.456.789-01');
    await page.fill('[data-testid="data-nascimento"]', '15/05/2010');

    await visualHelper.takeScreenshot('student-registration-form', {
      mask: ['[data-testid="form-timestamp"]']
    });
  });

  test('dashboard overview', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="stats-grid"]');

    await visualHelper.takeScreenshot('dashboard-overview', {
      mask: [
        '[data-testid="current-time"]',
        '[data-testid="last-sync"]'
      ]
    });
  });
});
```

## Mobile and Responsive Testing

### Responsive Test Configuration

```typescript
// tests/responsive/breakpoints.spec.ts
import { test, expect } from '@playwright/test';
import { VisualTestHelper } from '../utils/visual-helpers';

const BRAZILIAN_MOBILE_VIEWPORTS = [
  { name: 'small-mobile', width: 320, height: 568 },
  { name: 'medium-mobile', width: 375, height: 812 },
  { name: 'large-mobile', width: 414, height: 896 },
  { name: 'small-tablet', width: 768, height: 1024 },
  { name: 'large-tablet', width: 1024, height: 1366 }
];

test.describe('Responsive Design Tests', () => {
  for (const viewport of BRAZILIAN_MOBILE_VIEWPORTS) {
    test(`attendance interface - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      const visualHelper = new VisualTestHelper(page);

      // Login
      await page.goto('/auth/login');
      await page.fill('[data-testid="email"]', 'professor@escola.com');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Navigate to attendance
      await page.goto('/frequencia');
      await page.waitForSelector('[data-testid="attendance-grid"]');

      await visualHelper.takeScreenshot(`attendance-${viewport.name}`, {
        fullPage: false,
        clip: { x: 0, y: 0, width: viewport.width, height: viewport.height }
      });
    });
  }
});
```

### Mobile-Specific Interaction Tests

```typescript
// tests/mobile/touch-interactions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mobile Touch Interactions', () => {
  test.use({
    ...devices['iPhone 12'],
    contextOptions: {
      reducedMotion: 'reduce'
    }
  });

  test('attendance marking with touch', async ({ page }) => {
    await page.goto('/frequencia');

    // Touch-based attendance marking
    await page.tap('[data-testid="student-1-present"]');
    await page.tap('[data-testid="student-2-absent"]');

    // Verify touch feedback
    await expect(page.locator('[data-testid="student-1-present"]'))
      .toHaveClass(/selected/);

    // Test swipe for navigation (if implemented)
    await page.touchscreen.tap(200, 300);
    await page.touchscreen.tap(400, 300);
  });

  test('mobile menu navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Test hamburger menu
    await page.tap('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Navigate through menu
    await page.tap('[data-testid="menu-frequencia"]');
    await expect(page).toHaveURL(/frequencia/);
  });
});
```

## Accessibility Testing Integration

### Axe-Core Integration

```typescript
// tests/accessibility/axe-tests.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('attendance page accessibility audit', async ({ page }) => {
    await page.goto('/frequencia');
    await page.waitForSelector('[data-testid="attendance-grid"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('[data-testid="external-iframe"]') // Exclude external content
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('student form accessibility with Brazilian Portuguese', async ({ page }) => {
    await page.goto('/alunos/novo');
    await page.waitForSelector('[data-testid="student-form"]');

    // Test with Portuguese language context
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .options({
        locale: 'pt-BR'
      })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation flow', async ({ page }) => {
    await page.goto('/dashboard');

    // Test keyboard navigation
    await page.keyboard.press('Tab'); // First focusable element
    await page.keyboard.press('Tab'); // Second focusable element
    await page.keyboard.press('Enter'); // Activate element

    // Verify focus indicators
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Run accessibility check on focused state
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('screen reader announcements', async ({ page }) => {
    await page.goto('/frequencia');

    // Mark attendance and verify announcements
    await page.click('[data-testid="student-1-present"]');

    // Check for aria-live announcements
    const announcement = page.locator('[aria-live="polite"]');
    await expect(announcement).toContainText('Presença marcada para');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

## CI/CD Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/playwright-tests.yml
name: Playwright Tests

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]

    container:
      image: mcr.microsoft.com/playwright:v1.40.0-focal

    steps:
    - uses: actions/checkout@v4
      with:
        lfs: true # For visual regression test images

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: |
        npm ci
        npx playwright install --with-deps

    - name: Setup environment
      run: |
        echo "TEST_URL=http://localhost:3000" >> $GITHUB_ENV
        echo "CI=true" >> $GITHUB_ENV

    - name: Run Playwright tests
      run: npm run test:ci
      env:
        CI: true
        NEXT_PUBLIC_E2E_TESTING: true

    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report-${{ matrix.node-version }}
        path: |
          playwright-report/
          test-results/
        retention-days: 30

    - name: Upload screenshots on failure
      uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-screenshots-${{ matrix.node-version }}
        path: test-results/
        retention-days: 7

  visual-regression:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.40.0-focal

    steps:
    - uses: actions/checkout@v4
      with:
        lfs: true

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: |
        npm ci
        npx playwright install --with-deps

    - name: Run visual regression tests
      run: npm run test:visual
      env:
        CI: true

    - name: Upload visual diff artifacts
      uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: visual-regression-diffs
        path: |
          test-results/**/test-*-actual.png
          test-results/**/test-*-expected.png
          test-results/**/test-*-diff.png
        retention-days: 30
```

### Docker Configuration

```dockerfile
# Dockerfile.playwright
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Install additional browsers if needed
RUN npx playwright install --with-deps

# Set environment variables
ENV CI=true
ENV NODE_ENV=test

# Run tests
CMD ["npm", "run", "test:ci"]
```

## Educational System Specific Tests

### Attendance Workflow Tests

```typescript
// tests/educational/attendance-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { VisualTestHelper } from '../utils/visual-helpers';

test.describe('Educational Attendance Workflow', () => {
  test('complete attendance marking flow', async ({ page }) => {
    const visualHelper = new VisualTestHelper(page);

    // Login as teacher
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'professor@escola.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Navigate to attendance
    await page.goto('/frequencia');

    // "Abrir aula" workflow
    await page.click('[data-testid="abrir-aula-button"]');
    await expect(page.locator('[data-testid="aula-status"]'))
      .toContainText('Aula Aberta');

    await visualHelper.takeScreenshot('aula-aberta-state');

    // Select class
    await page.selectOption('[data-testid="turma-select"]', '5A-MATEMATICA');
    await page.waitForSelector('[data-testid="student-list"]');

    // Mark attendance for multiple students
    const students = await page.locator('[data-testid^="student-"]').all();
    for (let i = 0; i < Math.min(5, students.length); i++) {
      await students[i].locator('[data-testid="present-button"]').click();
    }

    await visualHelper.takeScreenshot('attendance-marked');

    // Save attendance
    await page.click('[data-testid="save-attendance"]');
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Frequência salva com sucesso');

    // Verify immutability (Brazilian compliance)
    await expect(page.locator('[data-testid="edit-attendance"]'))
      .toBeDisabled();

    await visualHelper.takeScreenshot('attendance-saved-locked');
  });
});
```

### Student Registration Tests

```typescript
// tests/educational/student-registration.spec.ts
import { test, expect } from '@playwright/test';
import { VisualTestHelper } from '../utils/visual-helpers';

test.describe('Student Registration System', () => {
  test('complete student registration with Brazilian data', async ({ page }) => {
    const visualHelper = new VisualTestHelper(page);

    await page.goto('/alunos/novo');
    await page.waitForSelector('[data-testid="student-form"]');

    // Fill Brazilian-specific fields
    await page.fill('[data-testid="nome-completo"]', 'Maria Santos Silva');
    await page.fill('[data-testid="cpf"]', '123.456.789-01');
    await page.fill('[data-testid="data-nascimento"]', '15/03/2010');
    await page.fill('[data-testid="telefone"]', '(11) 99999-8888');
    await page.selectOption('[data-testid="estado"]', 'SP');
    await page.fill('[data-testid="cep"]', '01234-567');

    await visualHelper.takeScreenshot('student-form-filled');

    // Test CPF validation
    await page.fill('[data-testid="cpf"]', '111.111.111-11'); // Invalid CPF
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="cpf-error"]'))
      .toContainText('CPF inválido');

    await visualHelper.takeScreenshot('student-form-validation-error');

    // Fix CPF and submit
    await page.fill('[data-testid="cpf"]', '123.456.789-01');
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Aluno cadastrado com sucesso');

    await visualHelper.takeScreenshot('student-registration-success');
  });
});
```

## Brazilian Portuguese Interface Testing

### Localization Visual Tests

```typescript
// tests/localization/portuguese-interface.spec.ts
import { test, expect } from '@playwright/test';
import { VisualTestHelper } from '../utils/visual-helpers';

test.describe('Brazilian Portuguese Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Set Portuguese locale
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'pt-BR'
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en']
      });
    });
  });

  test('attendance interface in Portuguese', async ({ page }) => {
    const visualHelper = new VisualTestHelper(page);

    await page.goto('/frequencia');

    // Verify Portuguese labels
    await expect(page.locator('[data-testid="title"]'))
      .toContainText('Controle de Frequência');
    await expect(page.locator('[data-testid="present-label"]'))
      .toContainText('Presente');
    await expect(page.locator('[data-testid="absent-label"]'))
      .toContainText('Ausente');
    await expect(page.locator('[data-testid="justified-label"]'))
      .toContainText('Falta Justificada');

    await visualHelper.takeScreenshot('attendance-portuguese-interface');
  });

  test('date formats and Brazilian calendar', async ({ page }) => {
    const visualHelper = new VisualTestHelper(page);

    await page.goto('/relatorios');

    // Check Brazilian date format (DD/MM/YYYY)
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.first()).toHaveAttribute('pattern', '[0-9]{2}/[0-9]{2}/[0-9]{4}');

    // Check month names in Portuguese
    await page.click('[data-testid="calendar-button"]');
    await expect(page.locator('[data-testid="month-january"]'))
      .toContainText('Janeiro');
    await expect(page.locator('[data-testid="month-december"]'))
      .toContainText('Dezembro');

    await visualHelper.takeScreenshot('brazilian-calendar-interface');
  });

  test('form validation messages in Portuguese', async ({ page }) => {
    const visualHelper = new VisualTestHelper(page);

    await page.goto('/alunos/novo');

    // Trigger validation errors
    await page.click('[data-testid="submit-button"]');

    // Check Portuguese error messages
    await expect(page.locator('[data-testid="nome-error"]'))
      .toContainText('Nome completo é obrigatório');
    await expect(page.locator('[data-testid="cpf-error"]'))
      .toContainText('CPF é obrigatório');

    await visualHelper.takeScreenshot('portuguese-validation-messages');
  });

  test('educational terms and compliance text', async ({ page }) => {
    const visualHelper = new VisualTestHelper(page);

    await page.goto('/frequencia');

    // Check educational compliance text
    await expect(page.locator('[data-testid="compliance-notice"]'))
      .toContainText('Documento oficial de frequência escolar');

    // Check attendance percentage thresholds
    await expect(page.locator('[data-testid="attendance-threshold"]'))
      .toContainText('Mínimo de 75% de frequência obrigatória');

    await visualHelper.takeScreenshot('educational-compliance-portuguese');
  });
});
```

### Cultural and Regional Testing

```typescript
// tests/localization/regional-settings.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Brazilian Regional Settings', () => {
  test('currency and number formatting', async ({ page }) => {
    await page.goto('/financeiro');

    // Check Brazilian Real currency formatting
    await expect(page.locator('[data-testid="mensalidade"]'))
      .toContainText('R$ 150,00');

    // Check number formatting (comma for decimals)
    await expect(page.locator('[data-testid="media-notas"]'))
      .toContainText('7,5');
  });

  test('Brazilian school year calendar', async ({ page }) => {
    await page.goto('/calendario');

    // Check Brazilian school year (February to December)
    await expect(page.locator('[data-testid="ano-letivo"]'))
      .toContainText('Ano Letivo 2024');

    // Check Brazilian holidays
    await expect(page.locator('[data-testid="feriado-carnaval"]'))
      .toBeVisible();
    await expect(page.locator('[data-testid="feriado-independencia"]'))
      .toContainText('7 de Setembro');
  });
});
```

## Advanced Configuration Examples

### Performance Testing Integration

```typescript
// tests/performance/lighthouse-integration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test('attendance page performance audit', async ({ page }) => {
    await page.goto('/frequencia');

    // Measure page load performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
      };
    });

    // Assert performance thresholds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3 seconds
    expect(performanceMetrics.loadComplete).toBeLessThan(5000); // 5 seconds
  });
});
```

### API Integration Testing

```typescript
// tests/integration/api-integration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('attendance data sync verification', async ({ page }) => {
    // Listen for API calls
    page.on('request', request => {
      if (request.url().includes('/api/frequencia')) {
        console.log('Attendance API call:', request.method(), request.url());
      }
    });

    await page.goto('/frequencia');
    await page.selectOption('[data-testid="turma-select"]', '5A');

    // Mark attendance
    await page.click('[data-testid="student-1-present"]');
    await page.click('[data-testid="save-attendance"]');

    // Wait for API response
    await page.waitForResponse(response =>
      response.url().includes('/api/frequencia') && response.status() === 200
    );

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]'))
      .toBeVisible();
  });
});
```

This comprehensive guide provides a complete setup for Playwright visual regression testing specifically tailored for educational management systems with Brazilian Portuguese interfaces, including mobile-responsive testing, accessibility integration, and CI/CD automation.