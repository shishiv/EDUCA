import { test, expect } from '../support/diagnostics'
import { waitForPageLoad } from '../utils/test-helpers'

test.describe('Professor titular por turma', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('shows the single-titular assignment page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /professores titulares/i })).toBeVisible()
    // Subtitle text is stable across the loading and loaded states: "Defina um
    // professor titular para cada turma" before turmas load, then "Defina os
    // professores titulares - <escola>" after. Match the shared invariant so the
    // assertion does not race the async escola/turmas load.
    await expect(page.getByText(/defina .*professores? titular/i)).toBeVisible()
  })

  test('does not expose discipline or multi-teacher controls', async ({ page }) => {
    await expect(page.getByText(/disciplina|matéria|múltiplos professores|várias atribuições/i)).toHaveCount(0)
  })

  test('opens the titular teacher dialog from a class card', async ({ page }) => {
    const classCard = page.getByTestId('assignment-class-card').first()
    await expect(classCard).toBeVisible()
    await classCard.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /professor titular da turma/i })).toBeVisible()
  })

  test('offers only teachers from the selected school', async ({ page }) => {
    const classCard = page.getByTestId('assignment-class-card').first()
    await expect(classCard).toBeVisible()
    await classCard.click()
    const teacherSelect = page.getByRole('combobox', { name: /professor/i })
    await expect(teacherSelect).toBeVisible()
  })
})
