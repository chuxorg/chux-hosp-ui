import type { ReactNode } from 'react'
import { ArrowRight, LockKeyhole, LogOut } from 'lucide-react'
import { brand } from './brand'
import type { DashboardCopy } from './dashboard-copy'

function Brand() {
  return (
    <div className="brand" lang="en">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {brand.name}
    </div>
  )
}

export function Landing({
  copy,
  preferences,
  children,
}: {
  copy: DashboardCopy
  preferences: ReactNode
  children: ReactNode
}) {
  return (
    <div className="sign-in-layout">
      <div className="landing-image">
        <Brand />
        <div className="landing-tagline">{copy.tagline}</div>
      </div>
      <main className="sign-in-content">
        <div className="landing-top">
          <Brand />
          {preferences}
        </div>
        {children}
      </main>
    </div>
  )
}

export function SignInHeading({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: ReactNode
}) {
  return (
    <>
      <span className="tile-icon tone-pms">
        <LockKeyhole size={24} aria-hidden="true" />
      </span>
      <p className="preview-label">{label}</p>
      <h1 data-view-title tabIndex={-1}>
        {title}
      </h1>
      <p>{children}</p>
    </>
  )
}

export function SignInArrow() {
  return <ArrowRight size={19} aria-hidden="true" />
}

export function Sidebar({
  home,
  label,
  context,
  children,
  signOut,
  signOutLabel,
  signOutDisabled,
}: {
  home: string
  label: string
  context?: ReactNode
  children: ReactNode
  signOut: () => void
  signOutLabel: string
  signOutDisabled?: boolean
}) {
  return (
    <aside className="app-sidebar">
      <a href={home} className="brand-link">
        <Brand />
      </a>
      {context}
      <nav className="app-nav" aria-label={label}>
        {children}
      </nav>
      <div className="sidebar-bottom">
        <button onClick={signOut} disabled={signOutDisabled}>
          <LogOut size={18} aria-hidden="true" /> {signOutLabel}
        </button>
      </div>
    </aside>
  )
}

export function WaypostShell({
  sidebar,
  context,
  preferences,
  operator,
  children,
}: {
  sidebar: ReactNode
  context: string
  preferences: ReactNode
  operator: { name: string; initials: string; title?: string }
  children: ReactNode
}) {
  return (
    <div className="app-shell">
      {sidebar}
      <div className="app-body">
        <header className="app-topbar">
          <div className="topbar-context">
            <span className="preview-dot" />
            <span>{context}</span>
          </div>
          <div className="topbar-actions">
            {preferences}
            <div className="staff-identity">
              <span className="staff-avatar" aria-hidden="true">
                {operator.initials}
              </span>
              <div>
                <strong lang="en">{operator.name}</strong>
                {operator.title && <span>{operator.title}</span>}
              </div>
            </div>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
