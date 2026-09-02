'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ClipboardCheck,
  Github,
  GraduationCap,
  Menu,
  ShieldCheck,
  Users,
} from 'lucide-react'

function Wordmark() {
  return (
    <Link href="/" className="landing-wordmark">
      <span className="landing-wordmark__mark" aria-hidden="true">
        E
      </span>
      <span>EDUCA</span>
    </Link>
  )
}

function ProductBoard() {
  const t = useTranslations('public.landing')
  return (
    <figure className="landing-board">
      <figcaption className="sr-only">{t('boardCaption')}</figcaption>
      <div aria-hidden="true">
        <div className="landing-board__topbar">
          <div className="landing-board__dots">
            <i />
            <i />
            <i />
          </div>
          <span className="landing-board__crumb">{t('boardCrumb')}</span>
          <span className="landing-board__status">
            <span /> {t('synthetic')}
          </span>
        </div>
        <div className="landing-board__body">
          <aside className="landing-board__sidebar">
            <div className="landing-board__mini-brand">EDUCA</div>
            <div className="landing-board__side-item landing-board__side-item--active">{t('overview')}</div>
            <div className="landing-board__side-item">{t('schools')}</div>
            <div className="landing-board__side-item">{t('students')}</div>
            <div className="landing-board__side-item">{t('classes')}</div>
            <div className="landing-board__side-item">{t('attendance')}</div>
            <div className="landing-board__side-item">{t('reports')}</div>
            <div className="landing-board__side-footer">{t('settings')}</div>
          </aside>
          <div className="landing-board__content">
            <div className="landing-board__heading-row">
              <div>
                <p className="landing-board__eyebrow">{t('boardDate')}</p>
                <h2>{t('networkView')}</h2>
              </div>
              <div className="landing-board__filter">{t('allSchools')} <ArrowDownRight size={14} /></div>
            </div>
            <div className="landing-board__metrics">
              <div className="landing-board__metric landing-board__metric--teal"><span>{t('activeSchools')}</span><strong>12</strong><small>{t('networkSuffix')}</small></div>
              <div className="landing-board__metric landing-board__metric--yellow"><span>{t('classesToday')}</span><strong>86</strong><small>{t('underway')}</small></div>
              <div className="landing-board__metric landing-board__metric--ink"><span>{t('attendanceRecorded')}</span><strong>78%</strong><small>{t('soFar')}</small></div>
            </div>
            <div className="landing-board__lower">
              <div className="landing-board__table-wrap">
                <div className="landing-board__table-title"><strong>{t('networkActivity')}</strong><span>{t('viewAll')} <ArrowRight size={13} /></span></div>
                <div className="landing-board__table-row landing-board__table-row--header"><span>{t('schoolHeading')}</span><span>{t('attendanceHeading')}</span><span>{t('statusHeading')}</span></div>
                <div className="landing-board__table-row"><span><b className="landing-avatar">JM</b> E. M. Jardim das Palmeiras</span><span>91%</span><span className="landing-badge landing-badge--ok">{t('upToDate')}</span></div>
                <div className="landing-board__table-row"><span><b className="landing-avatar landing-avatar--orange">SV</b> E. M. Sabiá Verde</span><span>84%</span><span className="landing-badge landing-badge--watch">{t('followUp')}</span></div>
                <div className="landing-board__table-row"><span><b className="landing-avatar landing-avatar--blue">CA</b> C. E. Água Clara</span><span>88%</span><span className="landing-badge landing-badge--ok">{t('upToDate')}</span></div>
              </div>
              <div className="landing-board__note"><span className="landing-board__note-icon"><BookOpen size={15} /></span><strong>{t('classDiary')}</strong><p>{t('pendingReview')}</p><span className="landing-board__note-link">{t('openRoutine')} <ArrowRight size={13} /></span></div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  )
}

export function EducaLanding() {
  const t = useTranslations('public.landing')
  const modules = [
    { icon: GraduationCap, title: t('module1Title'), text: t('module1Text') },
    { icon: ClipboardCheck, title: t('module2Title'), text: t('module2Text') },
    { icon: Users, title: t('module3Title'), text: t('module3Text') },
  ]
  const openSourceBenefits = [t('benefit1'), t('benefit2')]
  return (
    <div className="educa-landing" id="inicio">
      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <Wordmark />
          <nav className="landing-nav" aria-label={t('navLabel')}>
            <a href="#como-funciona">{t('how')}</a>
            <a href="#recursos">{t('resources')}</a>
            <a href="#aberta">{t('openSource')}</a>
          </nav>
          <div className="landing-header__actions">
            <Link href="/login" className="landing-login">{t('login')}</Link>
            <a href="#comecar" className="landing-header__cta">{t('meet')} <ArrowRight size={15} /></a>
          </div>
          <details className="landing-menu">
            <summary aria-label={t('openMenu')}><Menu size={23} /></summary>
            <nav className="landing-mobile-nav" aria-label={t('mobileNavLabel')}>
              <a href="#como-funciona">{t('how')}</a>
              <a href="#recursos">{t('resources')}</a>
              <a href="#aberta">{t('openSource')}</a>
              <Link href="/login">{t('login')}</Link>
            </nav>
          </details>
        </div>
      </header>

      <main>
        <section className="landing-hero landing-container">
          <div className="landing-hero__copy">
            <h1>{t('heroTitle')}{t('heroEmphasis') && <> <em>{t('heroEmphasis')}</em></>}</h1>
            <p className="landing-hero__description">{t('productDescription')}</p>
            <p className="landing-hero__audience">{t('audience')}</p>
            <div className="landing-hero__actions" id="comecar">
              <Link href="/demo" className="landing-button landing-button--primary">{t('demo')} <ArrowRight size={17} /></Link>
              <Link href="/login" className="landing-button landing-button--secondary">{t('enterSystem')}</Link>
            </div>
            <p className="landing-hero__note"><ShieldCheck size={15} /> {t('syntheticState')}</p>
            <div className="landing-hero__path" aria-label={t('pathLabel')}>
              <span>{t('department')}</span><ArrowRight size={13} aria-hidden="true" /><span>{t('school')}</span><ArrowRight size={13} aria-hidden="true" /><span>{t('classroom')}</span>
            </div>
          </div>
          <div className="landing-hero__visual">
            <div className="landing-visual-label landing-visual-label--top">{t('network')} <span>↗</span></div>
            <ProductBoard />
            <div className="landing-visual-label landing-visual-label--bottom"><span className="landing-visual-label__line" /> {t('daily')}</div>
          </div>
        </section>

        <section className="landing-intro" id="como-funciona">
          <div className="landing-container landing-intro__grid">
            <div>
              <h2>{t('introTitle')}<br /><em>{t('introEmphasis')}</em></h2>
              <p className="landing-intro__text">{t('introText')}</p>
              <a href="#recursos" className="landing-text-link">{t('learn')} <ArrowRight size={16} /></a>
            </div>
          </div>
        </section>

        <section className="landing-modules landing-container" id="recursos">
          <div className="landing-section-heading">
            <div>
              <h2>{t('modulesTitle')}<br /><em>{t('modulesEmphasis')}</em></h2>
            </div>
            <p>{t('modulesText')}</p>
          </div>
          <div className="landing-module-list">
            {modules.map(({ icon: Icon, title, text }) => (
              <article className="landing-module" key={title}>
                <div className="landing-module__icon"><Icon size={22} strokeWidth={1.8} /></div>
                <div><h3>{title}</h3><p>{text}</p></div>
                <ArrowUpRightIcon />
              </article>
            ))}
          </div>
        </section>

        <section className="landing-open" id="aberta">
          <div className="landing-container landing-open__grid">
            <div className="landing-open__statement">
              <h2>{t('openTitle')}<br /><em>{t('openEmphasis')}</em></h2>
              <p>{t('openText')}</p>
              <a className="landing-button landing-button--light" href="https://github.com/shishiv/EDUCA" target="_blank" rel="noreferrer">{t('code')} <Github size={16} /></a>
            </div>
            <div className="landing-open__proof">
              <div className="landing-open__proof-head"><Github size={20} /><span>{t('proof')}</span></div>
              <a className="landing-repository" href="https://github.com/shishiv/EDUCA" target="_blank" rel="noreferrer">
                <span>github.com/shishiv</span>
                <strong>EDUCA</strong>
                <ArrowUpRight aria-hidden="true" size={20} />
              </a>
              <div className="landing-license">
                <span className="landing-license__badge">MIT</span>
                <div>
                  <strong>{t('licenseTitle')}</strong>
                  <p>{t('licenseText')}</p>
                </div>
                <a href="https://github.com/shishiv/EDUCA/blob/main/LICENSE" target="_blank" rel="noreferrer">{t('readLicense')}</a>
              </div>
              <ul>{openSourceBenefits.map((item) => <li key={item}><Check size={15} /> {item}</li>)}</ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer" id="menu-mobile">
        <div className="landing-container landing-footer__inner">
          <Wordmark />
          <p>{t('footer')}</p>
          <div><Link href="/login">{t('enterSystem')}</Link><Link href="/politica-privacidade">{t('privacy')}</Link><a href="#inicio">{t('backTop')} <ArrowRight size={14} /></a></div>
        </div>
      </footer>
    </div>
  )
}

function ArrowUpRightIcon() {
  return <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.8} />
}
