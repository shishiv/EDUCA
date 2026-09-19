'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ClipboardCheck,
  Github,
  GraduationCap,
  Landmark,
  Menu,
  Presentation,
  School,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { BrandLogo } from '@/components/marketing/brand-logo'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'

function Wordmark() {
  return <Link href="/" className="landing-wordmark"><BrandLogo /></Link>
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('public.landing')
  return (
    <>
      <a href="#como-funciona" onClick={onNavigate}>{t('how')}</a>
      <a href="#recursos" onClick={onNavigate}>{t('resources')}</a>
      <a href="#aberta" onClick={onNavigate}>{t('openSource')}</a>
      <Link href="/blog" onClick={onNavigate}>{t('blog')}</Link>
    </>
  )
}

function HeaderActions() {
  const t = useTranslations('public.landing')
  return (
    <>
      <Link href="/login" className="landing-button landing-button--secondary">{t('login')}</Link>
      <Link href="/demo" className="landing-button landing-button--primary">{t('demo')} <ArrowRight size={15} /></Link>
    </>
  )
}

/**
 * Mobile disclosure with an explicit close contract: choosing a destination,
 * pressing Escape, or pointing outside the menu all close it. The published
 * `<details>` menu stayed open through every one of those paths.
 */
function LandingMenu() {
  const t = useTranslations('public.landing')
  const locale = useTranslations('common.locale')
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !event.composedPath().includes(rootRef.current)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="landing-menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="landing-menu__trigger"
        aria-label={t('openMenu')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(current => !current)}
      >
        <Menu size={23} aria-hidden="true" />
      </button>
      <div className="landing-menu__panel" id={panelId} hidden={!open}>
        <nav className="landing-mobile-nav" aria-label={t('mobileNavLabel')}>
          <NavLinks onNavigate={() => setOpen(false)} />
        </nav>
        <div className="landing-menu__language">
          <span>{locale('label')}</span>
          <LocaleSwitcher variant="button" />
        </div>
        <div className="landing-menu__actions">
          <HeaderActions />
        </div>
      </div>
    </div>
  )
}

/**
 * Illustrative preview of the Overview screen. Every value stays a dash: no
 * network has been measured. The inner composition is `aria-hidden` and the
 * caption carries that contract in the document flow.
 */
function ProductBoard() {
  const t = useTranslations('public.landing')
  // Class names stay literal: `@layer components` rules in globals.css are
  // dropped by Tailwind's content scan when a selector is built at runtime.
  const schools = [
    { initial: 'A', avatarClass: 'landing-avatar', badgeClass: 'landing-badge landing-badge--ok', status: t('upToDate') },
    { initial: 'B', avatarClass: 'landing-avatar landing-avatar--orange', badgeClass: 'landing-badge landing-badge--watch', status: t('followUp') },
    { initial: 'C', avatarClass: 'landing-avatar landing-avatar--blue', badgeClass: 'landing-badge landing-badge--ok', status: t('upToDate') },
  ]
  return (
    <figure className="landing-board-figure">
      <div className="landing-board" aria-hidden="true">
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
          <div className="landing-board__sidebar">
            <div className="landing-board__mini-brand">EDUCA</div>
            <div className="landing-board__side-item landing-board__side-item--active">{t('overview')}</div>
            <div className="landing-board__side-item">{t('schools')}</div>
            <div className="landing-board__side-item">{t('students')}</div>
            <div className="landing-board__side-item">{t('classes')}</div>
            <div className="landing-board__side-item">{t('attendance')}</div>
            <div className="landing-board__side-item">{t('reports')}</div>
            <div className="landing-board__side-footer">{t('settings')}</div>
          </div>
          <div className="landing-board__content">
            <p className="landing-board__title">{t('networkView')}</p>
            <div className="landing-board__metrics">
              <div className="landing-board__metric landing-board__metric--teal"><span>{t('activeSchools')}</span><strong>-</strong><small>{t('networkSuffix')}</small></div>
              <div className="landing-board__metric landing-board__metric--yellow"><span>{t('classesToday')}</span><strong>-</strong><small>{t('underway')}</small></div>
              <div className="landing-board__metric landing-board__metric--ink"><span>{t('attendanceRecorded')}</span><strong>-</strong><small>{t('soFar')}</small></div>
            </div>
            <p className="landing-board__table-title">{t('networkActivity')}</p>
            <table className="landing-board__table">
              <thead>
                <tr>
                  <th scope="col">{t('schoolHeading')}</th>
                  <th scope="col">{t('attendanceHeading')}</th>
                  <th scope="col">{t('statusHeading')}</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(({ initial, avatarClass, badgeClass, status }) => (
                  <tr key={initial}>
                    <td>
                      <span className="landing-board__school">
                        <b className={avatarClass}>{initial}</b>
                        {t('exampleSchool')} {initial}
                      </span>
                    </td>
                    <td>-</td>
                    <td><span className={badgeClass}>{status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="landing-board__note">
              <span className="landing-board__note-icon"><BookOpen size={15} /></span>
              <strong>{t('classDiary')}</strong>
              <p>{t('pendingReview')}</p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="landing-board__caption">
        <b>{t('boardCaptionLead')}</b> {t('boardCaption')}
      </figcaption>
    </figure>
  )
}

export function EducaLanding() {
  const t = useTranslations('public.landing')
  const steps = [
    { icon: Landmark, title: t('department'), text: t('departmentText') },
    { icon: School, title: t('school'), text: t('schoolText') },
    { icon: Presentation, title: t('classroom'), text: t('classroomText') },
  ]
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
            <NavLinks />
          </nav>
          <div className="landing-header__actions">
            <LocaleSwitcher variant="button" />
            <HeaderActions />
          </div>
          <LandingMenu />
        </div>
      </header>

      <main>
        <section className="landing-hero landing-container">
          <div className="landing-hero__copy">
            <h1>{t('heroTitle')} <em>{t('heroEmphasis')}</em></h1>
            <p className="landing-hero__description">{t('productDescription')}</p>
            <div className="landing-hero__actions" id="comecar">
              <Link href="/demo" className="landing-button landing-button--primary">{t('demo')} <ArrowRight size={17} /></Link>
              <Link href="/login" className="landing-button landing-button--secondary">{t('enterSystem')}</Link>
            </div>
            <p className="landing-hero__note"><ShieldCheck size={15} /> {t('syntheticState')}</p>
          </div>
          <div className="landing-hero__visual">
            <ProductBoard />
          </div>
        </section>

        <section className="landing-intro" id="como-funciona">
          <div className="landing-container landing-intro__grid">
            <div>
              <h2>{t('introTitle')}<br /><em>{t('introEmphasis')}</em></h2>
              <p className="landing-intro__text">{t('introText')}</p>
              <a href="#recursos" className="landing-text-link">{t('learn')} <ArrowRight size={16} /></a>
            </div>
            <ol className="landing-steps">
              {steps.map(({ icon: Icon, title, text }) => (
                <li className="landing-step" key={title}>
                  <span className="landing-step__icon"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-modules landing-container" id="recursos">
          <div className="landing-section-heading">
            <div>
              <h2>{t('modulesTitle')}<br /><em>{t('modulesEmphasis')}</em></h2>
            </div>
            <p>{t('modulesText')}</p>
          </div>
          <ul className="landing-module-list">
            {modules.map(({ icon: Icon, title, text }) => (
              <li className="landing-module" key={title}>
                <span className="landing-module__icon"><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-open" id="aberta">
          <div className="landing-container landing-open__grid">
            <div className="landing-open__statement">
              <h2>{t('openTitle')}<br /><em>{t('openEmphasis')}</em></h2>
              <p>{t('openText')}</p>
              <a className="landing-button landing-button--light" href="https://github.com/shishiv/EDUCA" target="_blank" rel="noreferrer">{t('code')} <Github size={16} /></a>
            </div>
            <div className="landing-open__proof">
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

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <Wordmark />
          <p>{t('footer')}</p>
          <div><Link href="/login">{t('enterSystem')}</Link><Link href="/politica-privacidade">{t('privacy')}</Link><a href="#inicio">{t('backTop')} <ArrowRight size={14} /></a></div>
        </div>
      </footer>
    </div>
  )
}
