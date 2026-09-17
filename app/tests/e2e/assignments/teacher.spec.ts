import { z } from 'zod'
import { test, expect } from '../support/diagnostics'
import { loginAs, waitForPageLoad } from '../utils/test-helpers'
import { createTeacherFixture } from './teacher-fixture'
import { readEntityAudit } from '../support/local-database'

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

  test('F09 titular persists after reload and rejects a foreign-school teacher', async ({ page }, testInfo) => {
    const fixture = await createTeacherFixture()
    try {
      await loginAs(page, 'diretor@test.com')
      await page.goto('/dashboard/atribuicoes')
      const card = page.getByTestId('assignment-class-card').filter({ hasText: 'Turma titular F09' })
      await card.click()
      await page.getByRole('combobox', { name: /professor/i }).click()
      await expect.poll(async () => (await page.getByRole('option').allTextContents()).sort()).toEqual([
        'Professor Testeprofessor@test.com', 'Titular F09titular-f09@synthetic.invalid',
      ])
      await expect(page.getByRole('option', { name: /estrangeiro/i })).toHaveCount(0)
      await page.getByRole('option', { name: /Titular F09/ }).click()
      await page.getByRole('button', { name: 'Definir professor titular', exact: true }).click()
      await expect.poll(fixture.read).toEqual([{ id: fixture.turmaId, professor_id: fixture.teacherId }])
      await expect(page.getByRole('dialog')).toBeHidden()
      await page.reload()
      await expect(card).toContainText('Titular F09')
      expect(await fixture.read()).toEqual([{ id: fixture.turmaId, professor_id: fixture.teacherId }])

      // Tamper only with the browser's submitted teacher id. The real RPC must reject it.
      await page.route('**/rest/v1/rpc/write_governed_turma', async route => {
        const payload = z.object({
          p_turma_id: z.literal(fixture.turmaId),
          p_changes: z.object({ professor_id: z.string().uuid() }),
        }).parse(route.request().postDataJSON())
        await route.continue({ postData: JSON.stringify({ ...payload, p_changes: { professor_id: fixture.foreignTeacherId } }) })
      })
      await card.click()
      await page.getByRole('combobox', { name: /professor/i }).click()
      await page.getByRole('option', { name: /Professor Teste/ }).click()
      const denied = page.waitForResponse('**/rest/v1/rpc/write_governed_turma')
      await page.getByRole('button', { name: 'Alterar professor titular', exact: true }).click()
      const response = await denied
      expect(response.ok()).toBe(false)
      expect(await response.text()).toContain('PILOT_MANAGEMENT_TEACHER_DENIED')
      await expect(page.getByText('Erro ao atribuir professor', { exact: true })).toBeVisible()
      await page.reload()
      await expect(card).toContainText('Titular F09')
      expect(await fixture.read()).toEqual([{ id: fixture.turmaId, professor_id: fixture.teacherId }])
    } finally {
      const audit = await readEntityAudit(fixture.turmaId)
      await fixture.cleanup()
      const retainedAudit = await readEntityAudit(fixture.turmaId)
      expect(retainedAudit.filter(row => audit.some(before => before.id === row.id))).toEqual(audit)
      await testInfo.attach('f09-titular-cleanup.json', {
        body: JSON.stringify({ turmaId: fixture.turmaId, teacherIds: [fixture.teacherId, fixture.foreignTeacherId], removed: true, retainedAudit, appendedDuringCleanup: retainedAudit.length - audit.length }),
        contentType: 'application/json',
      })
    }
  })
})
