import type { Metadata } from 'next'
import { Database, FileText, Lock, Shield, Users } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.privacy')

  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  }
}

export default async function PoliticaPrivacidadePage() {
  const t = await getTranslations('public.privacy')
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EDUCA</h1>
              <p className="text-sm text-gray-500">{t('brandSubtitle')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border bg-white p-6 sm:p-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mb-8 text-gray-500">{t('updated')}</p>

          <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('demo.title')}</h2>
            </div>
            <p className="leading-relaxed text-gray-700">
              {t.rich('demo.paragraph1', { strong })}
            </p>
            <p className="mt-4 leading-relaxed text-gray-700">{t('demo.paragraph2')}</p>
          </div>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('scope.title')}</h2>
            </div>
            <p className="leading-relaxed text-gray-700">{t('scope.paragraph1')}</p>
            <p className="mt-4 leading-relaxed text-gray-700">{t('scope.paragraph2')}</p>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('data.title')}</h2>
            </div>
            <p className="mb-4 leading-relaxed text-gray-700">{t('data.paragraph1')}</p>
            <p className="mb-4 leading-relaxed text-gray-700">{t('data.paragraph2')}</p>
            <ul className="ml-4 list-inside list-disc space-y-2 text-gray-700">
              <li>{t('data.bullet1')}</li>
              <li>{t('data.bullet2')}</li>
              <li>{t('data.bullet3')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('roles.title')}</h2>
            </div>
            <p className="leading-relaxed text-gray-700">
              {t.rich('roles.paragraph1', { strong })}
            </p>
            <p className="mt-4 leading-relaxed text-gray-700">{t('roles.paragraph2')}</p>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('municipal.title')}</h2>
            </div>
            <p className="mb-4 leading-relaxed text-gray-700">{t('municipal.introduction')}</p>
            <ul className="ml-4 list-inside list-disc space-y-2 text-gray-700">
              <li>{t('municipal.bullet1')}</li>
              <li>{t('municipal.bullet2')}</li>
              <li>{t('municipal.bullet3')}</li>
              <li>{t('municipal.bullet4')}</li>
              <li>{t('municipal.bullet5')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('sharing.title')}</h2>
            </div>
            <p className="mb-4 leading-relaxed text-gray-700">{t('sharing.paragraph1')}</p>
            <p className="leading-relaxed text-gray-700">{t('sharing.paragraph2')}</p>
          </section>

          <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('children.title')}</h2>
            </div>
            <p className="mb-4 leading-relaxed text-gray-700">{t('children.paragraph1')}</p>
            <p className="leading-relaxed text-gray-700">{t('children.paragraph2')}</p>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('rights.title')}</h2>
            </div>
            <p className="mb-4 leading-relaxed text-gray-700">{t('rights.paragraph1')}</p>
            <p className="mb-4 leading-relaxed text-gray-700">{t('rights.paragraph2')}</p>
            <p className="leading-relaxed text-gray-700">{t('rights.paragraph3')}</p>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('runbook.title')}</h2>
            </div>
            <p className="mb-4 leading-relaxed text-gray-700">{t('runbook.introduction')}</p>
            <ul className="ml-4 list-inside list-disc space-y-2 text-gray-700">
              <li>{t('runbook.bullet1')}</li>
              <li>{t('runbook.bullet2')}</li>
              <li>{t('runbook.bullet3')}</li>
              <li>{t('runbook.bullet4')}</li>
              <li>{t('runbook.bullet5')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('notice.title')}</h2>
            </div>
            <p className="mb-4 leading-relaxed text-gray-700">{t('notice.paragraph1')}</p>
            <p className="mb-4 leading-relaxed text-gray-700">
              {t.rich('notice.paragraph2', { strong })}
            </p>
            <p className="mb-4 leading-relaxed text-gray-700">
              {t.rich('notice.paragraph3', { strong })}
            </p>
            <ul className="ml-4 list-inside list-disc space-y-2 text-gray-700">
              <li>{t('notice.bullet1')}</li>
              <li>{t('notice.bullet2')}</li>
              <li>{t('notice.bullet3')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">{t('security.title')}</h2>
            </div>
            <p className="mb-4 leading-relaxed text-gray-700">{t('security.paragraph1')}</p>
            <p className="leading-relaxed text-gray-700">{t('security.paragraph2')}</p>
          </section>

          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-gray-500">
              {t('footer.line1')}
              <br />
              {t('footer.line2')}
              <br />
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
