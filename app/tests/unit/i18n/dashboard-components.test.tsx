import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AlertasCard } from '@/components/dashboard/alertas-card'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
import platformMessages from '@/messages/en/platform.json'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      const result = { data: [], error: null }
      const query: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'in', 'order']) {
        query[method] = () => query
      }
      query.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve)
      return query
    },
  },
}))

const academicYear = { year: 2027, startDate: '2027-01-01', endDate: '2027-12-31', configured: true }

function renderEnglish(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ platform: platformMessages }}>
      {component}
    </NextIntlClientProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('redesigned dashboard component localization', () => {
  it('renders the teacher dashboard heading and empty state in English', async () => {
    renderEnglish(<TeacherDashboardEnhanced
      professorId="teacher-1"
      academicYear={academicYear}
    />)

    expect(await screen.findByRole('heading', { name: 'Teacher dashboard' })).toBeVisible()
    expect(screen.getByText('No classes have been assigned to this teacher.')).toBeVisible()
    expect(screen.queryByText('Painel do Professor')).not.toBeInTheDocument()
  })

  it('renders the translated empty-alert state in English', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ alerts: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    renderEnglish(<AlertasCard escolaId="school-1" academicYear={academicYear} />)

    expect(await screen.findByText('No alerts at this time.')).toBeVisible()
    expect(screen.getByText('The monitored indicators are up to date.')).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard/alerts?escolaId=school-1&year=2027')
  })

  it('preserves API-provided alert copy and action labels', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        alerts: [{
          id: 'attendance-risk',
          type: 'warning',
          title: 'API supplied title',
          description: 'API supplied description',
          action: { href: '/dashboard/alunos/1', label: 'API supplied action' },
        }],
      }),
    }))
    renderEnglish(<AlertasCard escolaId="school-1" academicYear={academicYear} />)

    expect(await screen.findByText('API supplied title')).toBeVisible()
    expect(screen.getByText('API supplied description')).toBeVisible()
    expect(screen.getByRole('link', { name: /API supplied action/ })).toHaveAttribute('href', '/dashboard/alunos/1')
  })
})
