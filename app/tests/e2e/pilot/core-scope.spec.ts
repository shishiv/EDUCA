import { expect, test } from '@playwright/test'

test.describe('synthetic municipal pilot core scope', () => {
  test('shows only confirmed pilot modules plus the class diary', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Escolas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Usuários', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Alunos', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Turmas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Matrículas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Responsáveis', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Atribuições', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Frequência', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Diário de Classe', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Notas', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Relatórios', { exact: true })).toHaveCount(0)
  })

  test('loads core school and attendance flows', async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await expect(page).toHaveURL(/\/unauthorized$/)
    await page.goto('/dashboard/alunos')
    await expect(page.getByRole('heading', { name: /alunos/i }).first()).toBeVisible()
    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: /turmas/i }).first()).toBeVisible()
    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: /turmas/i }).first()).toBeVisible()
  })

  test('redirects disabled pilot modules but serves the class diary', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/calendario')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/configuracoes')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/sessoes')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)

    await page.goto('/dashboard/diario')
    await expect(page).toHaveURL(/\/diario(?:\?|$)/)
  })

  test('keeps offline service worker and IndexedDB disabled', async ({ page }) => {
    await page.goto('/dashboard')
    await expect.poll(async () => page.evaluate(async () => {
      const registrations = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : []
      const databases = 'databases' in indexedDB ? await indexedDB.databases() : []
      return {
        registrations: registrations.length,
        offlineDatabase: databases.some(database => database.name === 'GestaoEducacional'),
      }
    })).toEqual({ registrations: 0, offlineDatabase: false })
  })

  test('covers the synthetic school-management journey', async ({ page }) => {
    test.setTimeout(60_000)
    const schoolA = '10000000-0000-0000-0000-000000000001'

    await page.goto('/dashboard/escolas')
    await expect(page).toHaveURL(/\/unauthorized$/)

    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill('admin@synthetic.invalid')
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('link', { name: 'Escolas', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Escolas', exact: true })).toBeVisible()
    await expect(page.getByText('Escola Sintetica A', { exact: true })).toBeVisible()
    await expect(page.getByText('Escola Sintetica B', { exact: true })).toBeVisible()

    const search = page.getByPlaceholder('Buscar por nome, código ou diretor...')
    await search.fill('sem resultado sintetico')
    await expect(page.getByText(/nenhuma escola encontrada/i)).toBeVisible()
    await page.getByRole('button', { name: /limpar filtros/i }).click()

    await page.locator(`a[href="/dashboard/escolas/${schoolA}"]`).click()
    await expect(page.getByRole('heading', { name: 'Escola Sintetica A', exact: true })).toBeVisible()
    await expect(page.getByText('SYN-A', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Escola Sintetica A', exact: true })).toBeVisible()

    await page.goto('/dashboard/escolas/nova')
    const name = page.getByLabel(/nome da escola/i)
    await page.getByRole('button', { name: /cadastrar escola/i }).click()
    expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true)

    await page.goto(`/dashboard/escolas/${schoolA}/editar`)
    await expect(page.getByLabel(/nome da escola/i)).toHaveValue('Escola Sintetica A')
    await expect(page.getByLabel(/código inep/i)).toHaveValue('SYN-A')
    await page.getByRole('button', { name: /salvar alterações/i }).click()
    await expect(page.getByText(/código inep deve ter exatamente 8 dígitos/i)).toBeVisible()

    await page.getByRole('button', { name: 'Abrir menu do usuário' }).click()
    await page.getByRole('menuitem', { name: /sair do sistema/i }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/dashboard/escolas')
    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('covers the synthetic class-management journey', async ({ page }) => {
    test.setTimeout(90_000)
    const classA = '30000000-0000-0000-0000-000000000001'
    const classB = '30000000-0000-0000-0000-000000000002'
    const className = 'Turma Jornada Sintetica'
    const updatedClassName = 'Turma Jornada Sintetica Inativa'

    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill('diretora.a@synthetic.invalid')
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('link', { name: 'Turmas', exact: true })).toBeVisible()

    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: 'Turmas', exact: true })).toBeVisible()
    await expect(page.getByText('Turma Sintetica A', { exact: true })).toBeVisible()
    await expect(page.getByText('Turma Sintetica B', { exact: true })).toHaveCount(0)

    await page.goto(`/dashboard/turmas/${classB}`)
    await expect(page).toHaveURL(/\/dashboard\/turmas$/)
    await expect(page.getByText('Turma Sintetica B', { exact: true })).toHaveCount(0)

    const search = page.getByPlaceholder('Search by name, series, school or teacher...')
    await search.fill('sem turma sintetica')
    await expect(page.getByText('Nenhuma turma encontrada', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar', exact: true }).click()

    await page.locator(`a[href="/dashboard/turmas/${classA}"]`).click()
    await expect(page).toHaveURL(`/dashboard/turmas/${classA}`)
    await expect(page.getByRole('heading', { name: 'Turma Sintetica A', exact: true })).toBeVisible()
    await expect(page.getByText('Escola Sintetica A', { exact: false })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Turma Sintetica A', exact: true })).toBeVisible()

    await page.goto('/dashboard/turmas/nova')
    const name = page.getByLabel(/nome da turma/i)
    await page.getByRole('button', { name: /criar turma/i }).click()
    expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true)
    await name.fill(className)
    await page.locator('#serie').click()
    await page.getByRole('option', { name: '1º Ano', exact: true }).click()
    await page.locator('#turno').click()
    await page.getByRole('option', { name: 'Matutino', exact: true }).click()
    await page.getByRole('button', { name: /criar turma/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/turmas$/)
    await page.getByText(className, { exact: true }).click()
    await expect(page.getByRole('heading', { name: className, exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Editar', exact: true }).click()
    await page.getByLabel(/nome da turma/i).fill(updatedClassName)
    await page.locator('#edit-ativo').click()
    await page.getByRole('button', { name: /salvar/i }).click()
    await expect(page.getByRole('heading', { name: updatedClassName, exact: true })).toBeVisible()
    await expect(page.getByText('Inativa', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: updatedClassName, exact: true })).toBeVisible()
    await expect(page.getByText('Inativa', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Abrir menu do usuário' }).click()
    await page.getByRole('menuitem', { name: /sair do sistema/i }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto(`/dashboard/turmas/${classA}`)
    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('covers the synthetic teacher-management journey', async ({ page }) => {
    test.setTimeout(90_000)
    const teacherName = 'Professora Jornada Sintetica'
    const teacherEmail = 'professora.jornada@synthetic.invalid'

    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill('diretora.a@synthetic.invalid')
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(0)
    await page.goto('/dashboard/usuarios')
    await expect(page).toHaveURL(/\/unauthorized$/)

    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill('admin@synthetic.invalid')
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('link', { name: 'Usuários', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible()
    await expect(page.getByText('Professora Sintetica A', { exact: true })).toBeVisible()

    const search = page.getByPlaceholder('Buscar por nome ou email...')
    await search.fill('sem professora sintetica')
    await expect(page.getByText(/nenhum usuário encontrado/i)).toBeVisible()
    await page.getByRole('button', { name: /limpar filtros/i }).click()

    const teacherRow = page.getByRole('row').filter({ hasText: 'Professora Sintetica A' })
    await teacherRow.locator('a[href*="/dashboard/usuarios/"]').click()
    await expect(page.getByRole('heading', { name: 'Professora Sintetica A', exact: true })).toBeVisible()
    await expect(page.getByText('professora.a@synthetic.invalid', { exact: true })).toBeVisible()
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Professora Sintetica A', exact: true })).toBeVisible()

    await page.goto('/dashboard/usuarios/novo')
    const name = page.getByLabel(/nome completo/i)
    const email = page.getByLabel(/^email/i)
    await page.getByRole('button', { name: /criar usuário/i }).click()
    expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true)
    await name.fill(teacherName)
    await email.fill('email-invalido')
    await page.getByRole('button', { name: /criar usuário/i }).click()
    expect(await email.evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true)
    await email.fill(teacherEmail)
    await page.locator('#tipo_usuario').click()
    await page.getByRole('option', { name: 'Professor', exact: true }).click()
    await page.locator('#escola').click()
    await page.getByRole('option', { name: 'Escola Sintetica A', exact: true }).click()
    await page.getByRole('button', { name: /criar usuário/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/usuarios$/)
    await expect(page.getByText(/convite enviado com sucesso/i)).toBeVisible()
    await search.fill(teacherEmail)
    const createdTeacherRow = page.getByRole('row').filter({ hasText: teacherEmail })
    await expect(createdTeacherRow).toContainText(teacherName)
    await expect(createdTeacherRow).toContainText('Professor(a)')
    await expect(createdTeacherRow).toContainText('Ativo')
    await page.reload()
    await expect(page.getByRole('row').filter({ hasText: teacherEmail })).toBeVisible()

    await page.getByRole('button', { name: 'Abrir menu do usuário' }).click()
    await page.getByRole('menuitem', { name: /sair do sistema/i }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/dashboard/usuarios')
    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('covers the complete synthetic authentication journey', async ({ page }) => {
    test.setTimeout(90_000)
    const password = 'Synthetic-Only-2026!'
    const roles = [
      ['admin@synthetic.invalid', 'Administrador', true],
      ['secretaria@synthetic.invalid', 'Secretário(a)', false],
      ['diretora.a@synthetic.invalid', 'Diretor(a)', false],
      ['professora.a@synthetic.invalid', 'Professor(a)', false],
    ] as const

    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login(?:\?|$)/)

    await page.getByLabel('E-mail', { exact: true }).fill('invalid@synthetic.invalid')
    await page.getByLabel('Senha', { exact: true }).fill('invalid-password')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page.getByRole('alert').filter({ hasText: /credenciais|inválid/i })).toBeVisible()
    await expect(page).toHaveURL(/\/login(?:\?|$)/)

    for (const [email, roleLabel, canManageSchools] of roles) {
      await page.getByLabel('E-mail', { exact: true }).fill(email)
      await page.getByLabel('Senha', { exact: true }).fill(password)
      await page.getByRole('button', { name: /entrar/i }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole('button', { name: 'Abrir menu do usuário' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Escolas', exact: true })).toHaveCount(canManageSchools ? 1 : 0)

      await page.goto('/dashboard/escolas')
      if (canManageSchools) {
        await expect(page).toHaveURL(/\/dashboard\/escolas$/)
        await expect(page.getByRole('heading', { name: 'Escolas', exact: true })).toBeVisible()
        await expect(page.getByText('Escola Sintetica A', { exact: true })).toBeVisible()
        await expect(page.getByText('Escola Sintetica B', { exact: true })).toBeVisible()
        await page.reload()
        await expect(page).toHaveURL(/\/dashboard\/escolas$/)
        await page.goto('/dashboard/escolas/10000000-0000-0000-0000-000000000001/editar')
        const codeInput = page.getByLabel('Código INEP *')
        await expect(codeInput).toHaveValue('00000001')
        await codeInput.fill('1234567')
        await page.getByRole('button', { name: 'Salvar Alterações' }).click()
        await expect(page.getByText('Código INEP deve ter exatamente 8 dígitos')).toBeVisible()
        await codeInput.fill('00000001')
        await page.getByRole('button', { name: 'Salvar Alterações' }).click()
        await expect(page).toHaveURL(/\/dashboard\/escolas$/)
        await page.goto('/dashboard/escolas/10000000-0000-0000-0000-000000000001/editar')
        await expect(page.getByLabel('Código INEP *')).toHaveValue('00000001')
      } else {
        await expect(page).toHaveURL(/\/unauthorized$/)
        await page.goto('/dashboard')
      }

      await page.getByRole('button', { name: 'Abrir menu do usuário' }).click()
      await expect(page.getByText(roleLabel, { exact: true }).last()).toBeVisible()

      if (email === roles[3][0]) {
        await page.getByRole('menuitem', { name: /sair do sistema/i }).click()
        await expect(page).toHaveURL(/\/login$/)
      } else {
        await page.context().clearCookies()
        await page.goto('/login')
      }
    }

    await page.goto('/dashboard/escolas')
    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })
})
