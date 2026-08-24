import { getTranslations } from 'next-intl/server'

export default async function DashboardLoading() {
  const t = await getTranslations('layout.dashboard')
  return (
    <div className="app-dashboard app-dashboard-skeleton" aria-busy="true" aria-label={t('loading')}>
      <div className="app-skeleton h-20 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map(item => <div key={item} className="app-skeleton h-28" />)}
      </div>
      <div className="app-skeleton h-24 w-full" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
        <div className="app-skeleton h-80" />
        <div className="app-skeleton h-80" />
      </div>
    </div>
  )
}
