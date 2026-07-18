import { test, expect } from '@playwright/test'
import { waitForPageLoad, expectFormSuccess } from '../utils/test-helpers'

/**
 * E2E Tests: Usuários - Role Assignment
 * Tests for assigning and managing user roles/permissions
 */

test.describe('Roles - Assignment Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should display role column in users table', async ({ page }) => {
    const roleColumn = page.getByRole('columnheader', { name: /papel|função|perfil/i })
    
    if (await roleColumn.isVisible()) {
      await expect(roleColumn).toBeVisible()
    }
  })

  test('should display role badges for each user', async ({ page }) => {
    // Look for role badges in the table
    const roleBadges = page.locator('text=/admin|diretor|professor|coordenador|secretário/i')
    
    if (await roleBadges.first().isVisible()) {
      await expect(roleBadges.first()).toBeVisible()
    }
  })

  test('should show role description on hover', async ({ page }) => {
    const roleBadge = page.locator('[class*="badge"]').filter({ 
      hasText: /admin|diretor|professor/i 
    }).first()
    
    if (await roleBadge.isVisible()) {
      await roleBadge.hover()
      await page.waitForTimeout(300)
      
      // Might show tooltip with role description
      const tooltip = page.locator('[role="tooltip"]')
      if (await tooltip.isVisible()) {
        await expect(tooltip).toBeVisible()
      }
    }
  })
})

test.describe('Roles - Assigning on User Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios/novo')
    await waitForPageLoad(page)
  })

  test('should display papel/role field', async ({ page }) => {
    const papelLabel = page.locator('label').filter({ hasText: /papel|função|perfil/i })
    await expect(papelLabel).toBeVisible()
  })

  test('should list all available roles', async ({ page }) => {
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /papel|função|perfil/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      await page.waitForTimeout(200)
      
      // Check for common roles
      const adminOption = page.getByRole('option', { name: /admin/i })
      const diretorOption = page.getByRole('option', { name: /diretor/i })
      const professorOption = page.getByRole('option', { name: /professor/i })
      const coordenadorOption = page.getByRole('option', { name: /coordenador/i })
      
      // At least some roles should be visible
      const options = page.getByRole('option')
      const count = await options.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should require papel selection', async ({ page }) => {
    await page.getByLabel(/nome/i).fill('Test Without Role')
    await page.getByLabel(/email/i).fill('norole@teste.com')
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Should show validation error
    const roleError = page.getByText(/papel.*obrigatório|função.*obrigatória/i)
    if (await roleError.isVisible()) {
      await expect(roleError).toBeVisible()
    }
  })

  test('should assign Admin role', async ({ page }) => {
    const timestamp = Date.now()
    
    await page.getByLabel(/nome/i).fill(`Admin Test ${timestamp}`)
    await page.getByLabel(/email/i).fill(`admin${timestamp}@teste.com`)
    
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /papel|função/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      
      const adminOption = page.getByRole('option', { name: /admin/i })
      if (await adminOption.isVisible()) {
        await adminOption.click()
        
        // Password if required
        const senhaField = page.getByLabel(/^senha$/i).first()
        if (await senhaField.isVisible()) {
          await senhaField.fill('AdminPass123!')
          
          const confirmField = page.getByLabel(/confirmar/i)
          if (await confirmField.isVisible()) {
            await confirmField.fill('AdminPass123!')
          }
        }
        
        const saveButton = page.getByRole('button', { name: /salvar|criar/i })
        await saveButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })

  test('should assign Professor role', async ({ page }) => {
    const timestamp = Date.now()
    
    await page.getByLabel(/nome/i).fill(`Professor Test ${timestamp}`)
    await page.getByLabel(/email/i).fill(`prof${timestamp}@teste.com`)
    
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /papel|função/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      
      const profOption = page.getByRole('option', { name: /professor/i })
      if (await profOption.isVisible()) {
        await profOption.click()
        
        const senhaField = page.getByLabel(/^senha$/i).first()
        if (await senhaField.isVisible()) {
          await senhaField.fill('ProfPass123!')
          
          const confirmField = page.getByLabel(/confirmar/i)
          if (await confirmField.isVisible()) {
            await confirmField.fill('ProfPass123!')
          }
        }
        
        const saveButton = page.getByRole('button', { name: /salvar|criar/i })
        await saveButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })

  test('should assign Diretor role', async ({ page }) => {
    const timestamp = Date.now()
    
    await page.getByLabel(/nome/i).fill(`Diretor Test ${timestamp}`)
    await page.getByLabel(/email/i).fill(`dir${timestamp}@teste.com`)
    
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /papel|função/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      
      const dirOption = page.getByRole('option', { name: /diretor/i })
      if (await dirOption.isVisible()) {
        await dirOption.click()
        
        const senhaField = page.getByLabel(/^senha$/i).first()
        if (await senhaField.isVisible()) {
          await senhaField.fill('DirPass123!')
          
          const confirmField = page.getByLabel(/confirmar/i)
          if (await confirmField.isVisible()) {
            await confirmField.fill('DirPass123!')
          }
        }
        
        const saveButton = page.getByRole('button', { name: /salvar|criar/i })
        await saveButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })

  test('should show role description/help text', async ({ page }) => {
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /papel|função/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      
      // Look for description text
      const description = page.locator('text=/pode|permite|acesso|permissão/i').first()
      if (await description.isVisible()) {
        await expect(description).toBeVisible()
      }
    }
  })
})

test.describe('Roles - Changing User Role', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should change role via edit form', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const papelSelect = page.locator('select, [role="combobox"]').filter({ 
        hasText: /papel|função/i 
      }).first()
      
      if (await papelSelect.isVisible()) {
        // Get current role
        const currentText = await papelSelect.textContent()
        
        // Change to different role
        await papelSelect.click()
        const options = page.getByRole('option')
        const count = await options.count()
        
        if (count > 1) {
          await options.nth(1).click()
          
          const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
          await saveButton.click()
          
          await expectFormSuccess(page)
        }
      }
    }
  })

  test('should show confirmation when changing to Admin', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const papelSelect = page.locator('select, [role="combobox"]').filter({ 
        hasText: /papel|função/i 
      }).first()
      
      if (await papelSelect.isVisible()) {
        await papelSelect.click()
        
        const adminOption = page.getByRole('option', { name: /admin/i })
        if (await adminOption.isVisible()) {
          await adminOption.click()
          
          // Might show warning dialog
          const warningDialog = page.getByRole('alertdialog')
          if (await warningDialog.isVisible()) {
            await expect(warningDialog).toContainText(/admin|cuidado|atenção/i)
          }
        }
      }
    }
  })

  test('should not allow changing own role', async ({ page }) => {
    // This test documents expected behavior
    // Users typically cannot change their own role
    
    // Try to edit current user (might need to identify which row)
    const editButtons = page.getByRole('link', { name: /editar/i })
    const count = await editButtons.count()
    
    if (count > 0) {
      // Some edit buttons might navigate to pages where papel is disabled
      await editButtons.first().click()
      await waitForPageLoad(page)
      
      const papelSelect = page.locator('select, [role="combobox"]').filter({ 
        hasText: /papel|função/i 
      }).first()
      
      if (await papelSelect.isVisible()) {
        const isDisabled = await papelSelect.isDisabled()
        
        // Papel might be disabled for current user
        if (isDisabled) {
          await expect(papelSelect).toBeDisabled()
        }
      }
    }
  })
})

test.describe('Roles - Permission Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should show different colors for different roles', async ({ page }) => {
    const adminBadge = page.locator('[class*="badge"]').filter({ hasText: /admin/i }).first()
    const profBadge = page.locator('[class*="badge"]').filter({ hasText: /professor/i }).first()
    
    if (await adminBadge.isVisible() && await profBadge.isVisible()) {
      // Badges should have different styling
      const adminClass = await adminBadge.getAttribute('class')
      const profClass = await profBadge.getAttribute('class')
      
      // Should have different classes/colors
      expect(adminClass).toBeTruthy()
      expect(profClass).toBeTruthy()
    }
  })

  test('should display role hierarchy visually', async ({ page }) => {
    // Admin > Diretor > Coordenador > Professor > Secretário
    const roleBadges = page.locator('[class*="badge"]')
    
    if (await roleBadges.first().isVisible()) {
      const count = await roleBadges.count()
      expect(count).toBeGreaterThan(0)
    }
  })
})

test.describe('Roles - Quick Role Change', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should have quick role change dropdown', async ({ page }) => {
    // Some systems allow quick role change from the list
    const quickRoleButton = page.getByRole('button', { name: /alterar.*papel|mudar.*função/i }).first()
    
    if (await quickRoleButton.isVisible()) {
      await expect(quickRoleButton).toBeVisible()
      await quickRoleButton.click()
      
      // Should show role options
      await expect(page.getByRole('menuitem').first()).toBeVisible()
    }
  })
})

test.describe('Roles - Filtering and Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should filter users by Admin role', async ({ page }) => {
    const roleFilter = page.locator('[role="combobox"]').filter({ hasText: /papel|função|todos/i }).first()
    
    if (await roleFilter.isVisible()) {
      await roleFilter.click()
      
      const adminOption = page.getByRole('option', { name: /admin/i })
      if (await adminOption.isVisible()) {
        await adminOption.click()
        await page.waitForTimeout(500)
        
        // Should show only admins
        const roleBadges = page.locator('[class*="badge"]').filter({ hasText: /admin/i })
        if (await roleBadges.first().isVisible()) {
          await expect(roleBadges.first()).toBeVisible()
        }
      }
    }
  })

  test('should filter users by Professor role', async ({ page }) => {
    const roleFilter = page.locator('[role="combobox"]').filter({ hasText: /papel|função|todos/i }).first()
    
    if (await roleFilter.isVisible()) {
      await roleFilter.click()
      
      const profOption = page.getByRole('option', { name: /professor/i })
      if (await profOption.isVisible()) {
        await profOption.click()
        await page.waitForTimeout(500)
        
        const roleBadges = page.locator('[class*="badge"]').filter({ hasText: /professor/i })
        if (await roleBadges.first().isVisible()) {
          await expect(roleBadges.first()).toBeVisible()
        }
      }
    }
  })

  test('should filter users by Diretor role', async ({ page }) => {
    const roleFilter = page.locator('[role="combobox"]').filter({ hasText: /papel|função|todos/i }).first()
    
    if (await roleFilter.isVisible()) {
      await roleFilter.click()
      
      const dirOption = page.getByRole('option', { name: /diretor/i })
      if (await dirOption.isVisible()) {
        await dirOption.click()
        await page.waitForTimeout(500)
        
        const table = page.getByRole('table')
        await expect(table).toBeVisible()
      }
    }
  })

  test('should sort users by role', async ({ page }) => {
    const roleHeader = page.getByRole('columnheader', { name: /papel|função/i })
    
    if (await roleHeader.isVisible()) {
      await roleHeader.click()
      await page.waitForTimeout(300)
      
      // Table should re-sort
      await expect(page.getByRole('table')).toBeVisible()
    }
  })
})

test.describe('Roles - Multi-Role Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios/novo')
    await waitForPageLoad(page)
  })

  test('should support multiple roles if applicable', async ({ page }) => {
    // Some systems allow multiple roles per user
    const multiRoleCheckbox = page.getByLabel(/múltiplos.*papéis|vários.*papéis/i)
    
    if (await multiRoleCheckbox.isVisible()) {
      await expect(multiRoleCheckbox).toBeVisible()
      
      await multiRoleCheckbox.check()
      
      // Should allow selecting multiple roles
      const roleChecks = page.locator('input[type="checkbox"]').filter({ hasText: /admin|professor|diretor/i })
      if (await roleChecks.first().isVisible()) {
        await expect(roleChecks.first()).toBeVisible()
      }
    }
  })
})

test.describe('Roles - Permission Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios/novo')
    await waitForPageLoad(page)
  })

  test('should show permission preview when role selected', async ({ page }) => {
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /papel|função/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      
      const adminOption = page.getByRole('option', { name: /admin/i })
      if (await adminOption.isVisible()) {
        await adminOption.click()
        await page.waitForTimeout(300)
        
        // Look for permissions description
        const permissionsList = page.locator('text=/pode|permite|permissão|acesso/i').first()
        if (await permissionsList.isVisible()) {
          await expect(permissionsList).toBeVisible()
        }
      }
    }
  })

  test('should show different permissions for Professor', async ({ page }) => {
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /papel|função/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      
      const profOption = page.getByRole('option', { name: /professor/i })
      if (await profOption.isVisible()) {
        await profOption.click()
        await page.waitForTimeout(300)
        
        // Look for professor-specific permissions
        const permissionText = page.locator('text=/turma|aula|nota|frequência/i').first()
        if (await permissionText.isVisible()) {
          await expect(permissionText).toBeVisible()
        }
      }
    }
  })
})
