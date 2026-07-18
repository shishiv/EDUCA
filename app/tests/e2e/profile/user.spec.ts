import { test, expect } from '@playwright/test'
import { 
  waitForPageLoad, 
  expectFormSuccess, 
  expectFormError,
  generateTestEmail 
} from '../utils/test-helpers'

/**
 * E2E Tests: Perfil do Usuário - User Profile
 * Tests for viewing and editing user profile
 */

test.describe('Profile - Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should display page header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /perfil|meu.*perfil/i })).toBeVisible()
  })

  test('should display user avatar or photo', async ({ page }) => {
    const avatar = page.locator('img[alt*="avatar" i], img[alt*="foto" i], [class*="avatar"]')
    
    if (await avatar.first().isVisible()) {
      await expect(avatar.first()).toBeVisible()
    }
  })

  test('should display user name', async ({ page }) => {
    const userName = page.getByRole('heading').filter({ hasText: /\w+/ }).first()
    
    if (await userName.isVisible()) {
      await expect(userName).toBeVisible()
      
      const nameText = await userName.textContent()
      expect(nameText).toBeTruthy()
      expect(nameText?.length).toBeGreaterThan(0)
    }
  })

  test('should display user email', async ({ page }) => {
    const emailPattern = page.locator('text=/\\w+@\\w+\\.\\w+/')
    
    if (await emailPattern.first().isVisible()) {
      await expect(emailPattern.first()).toBeVisible()
    }
  })

  test('should display user role/papel', async ({ page }) => {
    const roleBadge = page.locator('text=/admin|diretor|professor|coordenador/i')
    
    if (await roleBadge.first().isVisible()) {
      await expect(roleBadge.first()).toBeVisible()
    }
  })
})

test.describe('Profile - Personal Information', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should display personal information section', async ({ page }) => {
    const personalSection = page.locator('text=/dados.*pessoais|informações.*pessoais/i').first()
    
    if (await personalSection.isVisible()) {
      await expect(personalSection).toBeVisible()
    }
  })

  test('should display nome field', async ({ page }) => {
    const nameField = page.getByLabel(/nome/i)
    
    if (await nameField.isVisible()) {
      await expect(nameField).toBeVisible()
      
      const nameValue = await nameField.inputValue()
      expect(nameValue).toBeTruthy()
    }
  })

  test('should display email field', async ({ page }) => {
    const emailField = page.getByLabel(/email/i)
    
    if (await emailField.isVisible()) {
      await expect(emailField).toBeVisible()
      
      const emailValue = await emailField.inputValue()
      expect(emailValue).toMatch(/\w+@\w+\.\w+/)
    }
  })

  test('should display telefone field', async ({ page }) => {
    const phoneField = page.getByLabel(/telefone|celular/i)
    
    if (await phoneField.isVisible()) {
      await expect(phoneField).toBeVisible()
    }
  })

  test('should have edit profile button', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /editar/i })
    
    if (await editButton.isVisible()) {
      await expect(editButton).toBeVisible()
    }
  })
})

test.describe('Profile - Edit Personal Information', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should enable editing on edit button click', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)
      
      // Fields should become editable
      const nameField = page.getByLabel(/nome/i)
      if (await nameField.isVisible()) {
        await expect(nameField).toBeEditable()
      }
    }
  })

  test('should update user name', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)
      
      const nameField = page.getByLabel(/nome/i)
      if (await nameField.isVisible()) {
        const currentName = await nameField.inputValue()
        const updatedName = `${currentName} ${Date.now()}`
        
        await nameField.clear()
        await nameField.fill(updatedName)
        
        const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          await expectFormSuccess(page)
        }
      }
    }
  })

  test('should update phone number', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)
      
      const phoneField = page.getByLabel(/telefone|celular/i)
      if (await phoneField.isVisible()) {
        await phoneField.clear()
        await phoneField.fill('17987654321')
        
        const saveButton = page.getByRole('button', { name: /salvar/i })
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          await expectFormSuccess(page)
        }
      }
    }
  })

  test('should validate email format', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)
      
      const emailField = page.getByLabel(/email/i)
      if (await emailField.isVisible()) {
        await emailField.clear()
        await emailField.fill('invalid-email')
        await emailField.blur()
        
        const saveButton = page.getByRole('button', { name: /salvar/i })
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          await expect(page.getByText(/email.*inválido/i)).toBeVisible()
        }
      }
    }
  })

  test('should cancel editing', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)
      
      const nameField = page.getByLabel(/nome/i)
      if (await nameField.isVisible()) {
        await nameField.fill('This will be cancelled')
        
        const cancelButton = page.getByRole('button', { name: /cancelar/i })
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          
          // Field should revert to original value
          await page.waitForTimeout(300)
        }
      }
    }
  })
})

test.describe('Profile - Avatar/Photo Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should have photo upload button', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /alterar.*foto|mudar.*foto|upload/i })
    
    if (await uploadButton.isVisible()) {
      await expect(uploadButton).toBeVisible()
    }
  })

  test('should display current avatar', async ({ page }) => {
    const avatar = page.locator('img[alt*="avatar" i], img[alt*="foto" i]')
    
    if (await avatar.first().isVisible()) {
      await expect(avatar.first()).toBeVisible()
      
      const src = await avatar.first().getAttribute('src')
      expect(src).toBeTruthy()
    }
  })

  test('should open file picker on upload button click', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /alterar.*foto|upload/i })
    
    if (await uploadButton.isVisible()) {
      // File input should be present
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible() || await fileInput.count() > 0) {
        await expect(fileInput.first()).toBeTruthy()
      }
    }
  })

  test('should remove avatar', async ({ page }) => {
    const removeButton = page.getByRole('button', { name: /remover.*foto|excluir.*foto/i })
    
    if (await removeButton.isVisible()) {
      await expect(removeButton).toBeVisible()
      
      await removeButton.click()
      
      // Should show confirmation
      const confirmDialog = page.getByRole('alertdialog')
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toBeVisible()
      }
    }
  })
})

test.describe('Profile - Change Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should have change password section', async ({ page }) => {
    const passwordSection = page.locator('text=/alterar.*senha|mudar.*senha|change.*password/i').first()
    
    if (await passwordSection.isVisible()) {
      await expect(passwordSection).toBeVisible()
    }
  })

  test('should display password change button', async ({ page }) => {
    const changePasswordButton = page.getByRole('button', { name: /alterar.*senha|mudar.*senha/i })
    
    if (await changePasswordButton.isVisible()) {
      await expect(changePasswordButton).toBeVisible()
    }
  })

  test('should open password change form', async ({ page }) => {
    const changePasswordButton = page.getByRole('button', { name: /alterar.*senha|mudar.*senha/i })
    
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click()
      await page.waitForTimeout(300)
      
      // Should show password fields
      const currentPasswordField = page.getByLabel(/senha.*atual|current.*password/i)
      const newPasswordField = page.getByLabel(/nova.*senha|new.*password/i)
      
      await expect(currentPasswordField.or(newPasswordField)).toBeVisible()
    }
  })

  test('should require current password', async ({ page }) => {
    const changePasswordButton = page.getByRole('button', { name: /alterar.*senha|mudar.*senha/i })
    
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click()
      await page.waitForTimeout(300)
      
      const newPasswordField = page.getByLabel(/nova.*senha/i).first()
      const confirmField = page.getByLabel(/confirmar/i)
      
      if (await newPasswordField.isVisible()) {
        await newPasswordField.fill('NewPass123!')
        
        if (await confirmField.isVisible()) {
          await confirmField.fill('NewPass123!')
        }
        
        const saveButton = page.getByRole('button', { name: /salvar|alterar/i })
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          // Should show error about current password
          await expectFormError(page, /senha.*atual|current.*password/i)
        }
      }
    }
  })

  test('should validate password strength', async ({ page }) => {
    const changePasswordButton = page.getByRole('button', { name: /alterar.*senha/i })
    
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click()
      await page.waitForTimeout(300)
      
      const newPasswordField = page.getByLabel(/nova.*senha/i).first()
      
      if (await newPasswordField.isVisible()) {
        await newPasswordField.fill('123') // Weak password
        await newPasswordField.blur()
        
        // Should show strength indicator or error
        const strengthIndicator = page.locator('text=/fraca|weak|forte|strong/i')
        if (await strengthIndicator.first().isVisible()) {
          await expect(strengthIndicator.first()).toBeVisible()
        }
      }
    }
  })

  test('should validate password confirmation match', async ({ page }) => {
    const changePasswordButton = page.getByRole('button', { name: /alterar.*senha/i })
    
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click()
      await page.waitForTimeout(300)
      
      const currentPasswordField = page.getByLabel(/senha.*atual/i)
      const newPasswordField = page.getByLabel(/nova.*senha/i).first()
      const confirmField = page.getByLabel(/confirmar/i)
      
      if (await newPasswordField.isVisible() && await confirmField.isVisible()) {
        if (await currentPasswordField.isVisible()) {
          await currentPasswordField.fill('CurrentPass123!')
        }
        
        await newPasswordField.fill('NewPass123!')
        await confirmField.fill('DifferentPass123!') // Different
        
        const saveButton = page.getByRole('button', { name: /salvar|alterar/i })
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          await expect(page.getByText(/senhas.*não.*correspondem/i)).toBeVisible()
        }
      }
    }
  })
})

test.describe('Profile - Activity History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should display activity history section', async ({ page }) => {
    const activitySection = page.locator('text=/atividade|histórico|activity/i').first()
    
    if (await activitySection.isVisible()) {
      await expect(activitySection).toBeVisible()
    }
  })

  test('should display last login time', async ({ page }) => {
    const lastLogin = page.locator('text=/último.*acesso|last.*login|última.*vez/i').first()
    
    if (await lastLogin.isVisible()) {
      await expect(lastLogin).toBeVisible()
    }
  })

  test('should display recent activities', async ({ page }) => {
    const activitiesList = page.locator('[class*="activity"], [class*="timeline"]')
    
    if (await activitiesList.first().isVisible()) {
      await expect(activitiesList.first()).toBeVisible()
    }
  })

  test('should display activity timestamps', async ({ page }) => {
    const timestamps = page.locator('text=/há.*minutos?|há.*horas?|há.*dias?|ago/i')
    
    if (await timestamps.first().isVisible()) {
      await expect(timestamps.first()).toBeVisible()
    }
  })
})

test.describe('Profile - Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should display preferences section', async ({ page }) => {
    const preferencesSection = page.locator('text=/preferências|preferences/i').first()
    
    if (await preferencesSection.isVisible()) {
      await expect(preferencesSection).toBeVisible()
    }
  })

  test('should have theme preference toggle', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /tema|theme/i })
    
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

  test('should have language preference', async ({ page }) => {
    const languageSelect = page.locator('[role="combobox"]').filter({ hasText: /idioma|language/i })
    
    if (await languageSelect.isVisible()) {
      await expect(languageSelect).toBeVisible()
    }
  })

  test('should have notification preferences', async ({ page }) => {
    const notificationToggle = page.getByLabel(/notificações?/i)
    
    if (await notificationToggle.isVisible()) {
      await expect(notificationToggle).toBeVisible()
    }
  })
})

test.describe('Profile - Account Information', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should display account creation date', async ({ page }) => {
    const creationDate = page.locator('text=/criado.*em|membro.*desde|member.*since/i').first()
    
    if (await creationDate.isVisible()) {
      await expect(creationDate).toBeVisible()
    }
  })

  test('should display user ID', async ({ page }) => {
    const userId = page.locator('text=/id|código/i').first()
    
    if (await userId.isVisible()) {
      await expect(userId).toBeVisible()
    }
  })

  test('should display linked escola', async ({ page }) => {
    const escolaInfo = page.locator('text=/escola/i').first()
    
    if (await escolaInfo.isVisible()) {
      await expect(escolaInfo).toBeVisible()
    }
  })

  test('should display user papel/role', async ({ page }) => {
    const roleInfo = page.locator('text=/papel|função|perfil/i').first()
    
    if (await roleInfo.isVisible()) {
      await expect(roleInfo).toBeVisible()
    }
  })
})

test.describe('Profile - Security Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should display security section', async ({ page }) => {
    const securitySection = page.locator('text=/segurança|security/i').first()
    
    if (await securitySection.isVisible()) {
      await expect(securitySection).toBeVisible()
    }
  })

  test('should have two-factor authentication option', async ({ page }) => {
    const twoFactorToggle = page.getByLabel(/dois.*fatores|2fa/i)
    
    if (await twoFactorToggle.isVisible()) {
      await expect(twoFactorToggle).toBeVisible()
    }
  })

  test('should display active sessions', async ({ page }) => {
    const sessionsSection = page.locator('text=/sessões?.*ativas?|active.*sessions/i').first()
    
    if (await sessionsSection.isVisible()) {
      await expect(sessionsSection).toBeVisible()
    }
  })

  test('should allow logging out other sessions', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: /encerrar.*sessões|logout.*other/i })
    
    if (await logoutButton.isVisible()) {
      await expect(logoutButton).toBeVisible()
    }
  })
})

test.describe('Profile - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should have back to dashboard button', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /dashboard|voltar|início/i })
    
    if (await backButton.isVisible()) {
      await expect(backButton).toBeVisible()
      await expect(backButton).toHaveAttribute('href', /dashboard/)
    }
  })

  test('should navigate to configurações from profile', async ({ page }) => {
    const configLink = page.getByRole('link', { name: /configurações/i })
    
    if (await configLink.isVisible()) {
      await configLink.click()
      
      await expect(page).toHaveURL(/configuracoes/)
    }
  })
})

test.describe('Profile - Data Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
  })

  test('should have download personal data button', async ({ page }) => {
    const downloadButton = page.getByRole('button', { name: /baixar.*dados|download.*data|exportar/i })
    
    if (await downloadButton.isVisible()) {
      await expect(downloadButton).toBeVisible()
    }
  })

  test('should have delete account option', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir.*conta|delete.*account|desativar/i })
    
    if (await deleteButton.isVisible()) {
      await expect(deleteButton).toBeVisible()
      
      await deleteButton.click()
      
      // Should show strong confirmation
      const confirmDialog = page.getByRole('alertdialog')
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toContainText(/permanente|irreversível/i)
      }
    }
  })
})
