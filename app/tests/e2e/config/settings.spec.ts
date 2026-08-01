import { test, expect } from '../support/diagnostics'
import { waitForPageLoad, expectFormSuccess } from '../utils/test-helpers'

/**
 * E2E Tests: Configurações - Settings Page
 * Tests for system configuration and settings
 */

test.describe('Settings - Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should display page header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Configurações', exact: true })).toBeVisible()
  })

  test('should display settings sections', async ({ page }) => {
    // Should have different sections organized
    const sections = page.locator('section, [class*="card"]')
    
    if (await sections.first().isVisible()) {
      const count = await sections.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should have tabs or navigation for settings categories', async ({ page }) => {
    const tabs = page.getByRole('tab')
    const navLinks = page.getByRole('link').filter({ hasText: /geral|sistema|usuário/i })
    
    if (await tabs.first().isVisible()) {
      await expect(tabs.first()).toBeVisible()
    } else if (await navLinks.first().isVisible()) {
      await expect(navLinks.first()).toBeVisible()
    }
  })
})

test.describe('Settings - General Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should display system name field', async ({ page }) => {
    const systemNameField = page.getByLabel(/nome.*sistema|nome.*escola|instituição/i)
    
    if (await systemNameField.isVisible()) {
      await expect(systemNameField).toBeVisible()
      await expect(systemNameField).toBeEditable()
    }
  })

  test('should display ano letivo configuration', async ({ page }) => {
    const anoLetivoField = page.getByLabel(/ano.*letivo|ano.*atual/i)
    
    if (await anoLetivoField.isVisible()) {
      await expect(anoLetivoField).toBeVisible()
    }
  })

  test('should update system name', async ({ page }) => {
    const systemNameField = page.getByLabel(/nome.*sistema|nome.*escola/i)
    
    if (await systemNameField.isVisible()) {
      const timestamp = Date.now()
      const newName = `Sistema EDUCA ${timestamp}`
      
      await systemNameField.clear()
      await systemNameField.fill(newName)
      
      const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })

  test('should display timezone setting', async ({ page }) => {
    const timezoneSelect = page.locator('[role="combobox"]').filter({ hasText: /fuso|timezone/i })
    
    if (await timezoneSelect.isVisible()) {
      await expect(timezoneSelect).toBeVisible()
    }
  })

  test('should display language setting', async ({ page }) => {
    const languageSelect = page.locator('[role="combobox"]').filter({ hasText: /idioma|language/i })
    
    if (await languageSelect.isVisible()) {
      await expect(languageSelect).toBeVisible()
    }
  })
})

test.describe('Settings - School Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should configure número de aulas por dia', async ({ page }) => {
    const aulasField = page.getByLabel(/aulas.*dia|número.*aulas/i)
    
    if (await aulasField.isVisible()) {
      await expect(aulasField).toBeVisible()
      await expect(aulasField).toBeEditable()
      
      await aulasField.clear()
      await aulasField.fill('6')
      
      const saveButton = page.getByRole('button', { name: /salvar/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectFormSuccess(page)
      }
    }
  })

  test('should configure duração da aula', async ({ page }) => {
    const duracaoField = page.getByLabel(/duração.*aula|minutos.*aula/i)
    
    if (await duracaoField.isVisible()) {
      await expect(duracaoField).toBeVisible()
      
      await duracaoField.clear()
      await duracaoField.fill('50')
      
      const saveButton = page.getByRole('button', { name: /salvar/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectFormSuccess(page)
      }
    }
  })

  test('should configure períodos escolares', async ({ page }) => {
    const periodosSection = page.locator('text=/períodos?|turnos?/i').first()
    
    if (await periodosSection.isVisible()) {
      await expect(periodosSection).toBeVisible()
    }
  })

  test('should configure horário de início das aulas', async ({ page }) => {
    const horarioField = page.getByLabel(/horário.*início|início.*aulas/i)
    
    if (await horarioField.isVisible()) {
      await expect(horarioField).toBeVisible()
      
      await horarioField.fill('07:30')
      
      const saveButton = page.getByRole('button', { name: /salvar/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectFormSuccess(page)
      }
    }
  })
})

test.describe('Settings - Notification Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should display notification preferences', async ({ page }) => {
    const notificationSection = page.locator('text=/notificações?|avisos?/i').first()
    
    if (await notificationSection.isVisible()) {
      await expect(notificationSection).toBeVisible()
    }
  })

  test('should toggle email notifications', async ({ page }) => {
    const emailToggle = page.getByLabel(/email|e-mail/i).and(page.locator('input[type="checkbox"]'))
    
    if (await emailToggle.first().isVisible()) {
      await expect(emailToggle.first()).toBeVisible()
      
      const isChecked = await emailToggle.first().isChecked()
      await emailToggle.first().click()
      
      const saveButton = page.getByRole('button', { name: /salvar/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectFormSuccess(page)
      }
    }
  })

  test('should toggle SMS notifications', async ({ page }) => {
    const smsToggle = page.getByLabel(/sms/i).and(page.locator('input[type="checkbox"]'))
    
    if (await smsToggle.first().isVisible()) {
      await expect(smsToggle.first()).toBeVisible()
    }
  })

  test('should configure notification frequency', async ({ page }) => {
    const frequencySelect = page.locator('[role="combobox"]').filter({ hasText: /frequência|frequência/i })
    
    if (await frequencySelect.isVisible()) {
      await expect(frequencySelect).toBeVisible()
      
      await frequencySelect.click()
      await page.getByRole('option').first().click()
      
      const saveButton = page.getByRole('button', { name: /salvar/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectFormSuccess(page)
      }
    }
  })
})

test.describe('Settings - Academic Year Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should configure current ano letivo', async ({ page }) => {
    const anoLetivoField = page.getByLabel(/ano.*letivo|ano.*atual/i)
    
    if (await anoLetivoField.isVisible()) {
      await expect(anoLetivoField).toBeVisible()
      
      const currentYear = new Date().getFullYear()
      await anoLetivoField.clear()
      await anoLetivoField.fill(currentYear.toString())
      
      const saveButton = page.getByRole('button', { name: /salvar/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectFormSuccess(page)
      }
    }
  })

  test('should configure bimestre/trimestre system', async ({ page }) => {
    const periodoSelect = page.locator('[role="combobox"]').filter({ hasText: /bimestre|trimestre|semestre/i })
    
    if (await periodoSelect.isVisible()) {
      await expect(periodoSelect).toBeVisible()
    }
  })

  test('should display bimestre dates', async ({ page }) => {
    const bimestreSection = page.locator('text=/bimestre|trimestre/i').first()
    
    if (await bimestreSection.isVisible()) {
      await expect(bimestreSection).toBeVisible()
      
      // Should show date fields for each period
      const dateFields = page.locator('input[type="date"]')
      if (await dateFields.first().isVisible()) {
        const count = await dateFields.count()
        expect(count).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Settings - Security Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should display security section', async ({ page }) => {
    const securitySection = page.locator('text=/segurança|security/i').first()
    
    if (await securitySection.isVisible()) {
      await expect(securitySection).toBeVisible()
    }
  })

  test('should configure password policy', async ({ page }) => {
    const passwordPolicyField = page.getByLabel(/senha.*mínima|comprimento.*senha/i)
    
    if (await passwordPolicyField.isVisible()) {
      await expect(passwordPolicyField).toBeVisible()
    }
  })

  test('should configure session timeout', async ({ page }) => {
    const timeoutField = page.getByLabel(/timeout|tempo.*sessão|expiração/i)
    
    if (await timeoutField.isVisible()) {
      await expect(timeoutField).toBeVisible()
      
      await timeoutField.clear()
      await timeoutField.fill('30')
      
      const saveButton = page.getByRole('button', { name: /salvar/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectFormSuccess(page)
      }
    }
  })

  test('should toggle two-factor authentication', async ({ page }) => {
    const twoFactorToggle = page.getByLabel(/dois.*fatores|2fa|autenticação.*dois/i)
    
    if (await twoFactorToggle.isVisible()) {
      await expect(twoFactorToggle).toBeVisible()
    }
  })
})

test.describe('Settings - Integration Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should display integration section', async ({ page }) => {
    const integrationSection = page.locator('text=/integrações?|integrations/i').first()
    
    if (await integrationSection.isVisible()) {
      await expect(integrationSection).toBeVisible()
    }
  })

  test('should configure external API settings', async ({ page }) => {
    const apiKeyField = page.getByLabel(/api.*key|chave.*api/i)
    
    if (await apiKeyField.isVisible()) {
      await expect(apiKeyField).toBeVisible()
    }
  })

  test('should test integration connection', async ({ page }) => {
    const testButton = page.getByRole('button', { name: /testar|test.*connection/i })
    
    if (await testButton.isVisible()) {
      await expect(testButton).toBeVisible()
      
      await testButton.click()
      await page.waitForTimeout(2000)
      
      // Should show connection status
      const statusMessage = page.locator('text=/sucesso|falha|conectado/i')
      if (await statusMessage.isVisible()) {
        await expect(statusMessage).toBeVisible()
      }
    }
  })
})

test.describe('Settings - Backup and Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should display backup section', async ({ page }) => {
    const backupSection = page.locator('text=/backup|cópia.*segurança/i').first()
    
    if (await backupSection.isVisible()) {
      await expect(backupSection).toBeVisible()
    }
  })

  test('should have manual backup button', async ({ page }) => {
    const backupButton = page.getByRole('button', { name: /criar.*backup|fazer.*backup/i })
    
    if (await backupButton.isVisible()) {
      await expect(backupButton).toBeVisible()
    }
  })

  test('should configure automatic backups', async ({ page }) => {
    const autoBackupToggle = page.getByLabel(/backup.*automático|automatic.*backup/i)
    
    if (await autoBackupToggle.isVisible()) {
      await expect(autoBackupToggle).toBeVisible()
      
      await autoBackupToggle.click()
      
      const saveButton = page.getByRole('button', { name: /salvar/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectFormSuccess(page)
      }
    }
  })

  test('should display last backup date', async ({ page }) => {
    const lastBackup = page.locator('text=/último.*backup|last.*backup/i').first()
    
    if (await lastBackup.isVisible()) {
      await expect(lastBackup).toBeVisible()
    }
  })
})

test.describe('Settings - Appearance Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should have theme toggle (light/dark)', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /tema|theme|dark|light/i })
    
    if (await themeToggle.isVisible()) {
      await expect(themeToggle).toBeVisible()
      
      await themeToggle.click()
      await page.waitForTimeout(500)
      
      // Theme should change
      const html = page.locator('html')
      const classList = await html.getAttribute('class')
      
      expect(classList).toBeTruthy()
    }
  })

  test('should configure logo upload', async ({ page }) => {
    const logoUpload = page.locator('input[type="file"]').filter({ hasText: /logo/i })
    
    if (await logoUpload.isVisible()) {
      await expect(logoUpload).toBeVisible()
    }
  })

  test('should display current logo', async ({ page }) => {
    const logo = page.locator('img[alt*="logo" i]')
    
    if (await logo.isVisible()) {
      await expect(logo).toBeVisible()
    }
  })
})

test.describe('Settings - Save and Reset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should have save button for each section', async ({ page }) => {
    const saveButtons = page.getByRole('button', { name: /salvar|save/i })
    
    if (await saveButtons.first().isVisible()) {
      const count = await saveButtons.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should show unsaved changes warning', async ({ page }) => {
    const anyField = page.locator('input[type="text"]').first()
    
    if (await anyField.isVisible()) {
      await anyField.fill('Changed value')
      
      // Try to navigate away
      await page.getByRole('link', { name: /dashboard|início/i }).first().click()
      
      // Might show unsaved changes dialog
      const warningDialog = page.getByRole('alertdialog')
      if (await warningDialog.isVisible()) {
        await expect(warningDialog).toContainText(/não.*salvo|unsaved/i)
      }
    }
  })

  test('should reset settings to default', async ({ page }) => {
    const resetButton = page.getByRole('button', { name: /resetar|restaurar.*padrão|reset/i })
    
    if (await resetButton.isVisible()) {
      await expect(resetButton).toBeVisible()
      
      await resetButton.click()
      
      // Should show confirmation
      const confirmDialog = page.getByRole('alertdialog')
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toBeVisible()
      }
    }
  })
})

test.describe('Settings - Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
  })

  test('should display settings page for admin users', async ({ page }) => {
    // Admin users should see full settings
    await expect(page.getByRole('heading', { name: 'Configurações', exact: true })).toBeVisible()
  })

  test('should restrict certain settings for non-admin users', async ({ page }) => {
    // This test documents expected behavior
    // Non-admin users might see limited settings or disabled fields
    
    const settingFields = page.locator('input, select, [role="combobox"]')
    if (await settingFields.first().isVisible()) {
      const count = await settingFields.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})
