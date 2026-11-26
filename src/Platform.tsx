import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  Building2,
  ChevronRight,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { Availability } from './Availability'
import type { Ledger } from './reservation-demo'
import { FrontDesk } from './FrontDesk'
import { Dashboard, moduleIcons, OperatingDate, PropertyDashboard } from './Dashboards'
import { brand } from './brand'
import { dashboardCopy, type DashboardCopy } from './dashboard-copy'
import { routeFor } from './dashboard-preferences'
import { canOpen, staff, tenants, type ProfileId, type TenantId, workspaceFor } from './demo'
import { messages, type Language } from './messages'

const profiles = Object.keys(staff) as ProfileId[]
const home = '#/platform'
type Workspace = NonNullable<ReturnType<typeof workspaceFor>>

function currentRoute() {
  return routeFor(location.hash.slice(1) || 'platform')
}

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

function SignIn({
  copy,
  preferences,
  onSignIn,
}: {
  copy: DashboardCopy
  preferences: ReactNode
  onSignIn: (profile: ProfileId) => void
}) {
  const [profile, setProfile] = useState<ProfileId>('manager')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSignIn(profile)
  }

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
        <form onSubmit={submit} className="sign-in-form">
          <span className="tile-icon tone-pms">
            <LockKeyhole size={24} aria-hidden="true" />
          </span>
          <p className="preview-label">{copy.demo}</p>
          <h1 data-view-title tabIndex={-1}>
            {copy.signIn}
          </h1>
          <p>{copy.signInCopy}</p>
          <label>
            {copy.profile}
            <select
              value={profile}
              onChange={(event) => setProfile(event.currentTarget.value as ProfileId)}
            >
              {profiles.map((id) => (
                <option key={id} value={id}>
                  {staff[id].name} · {copy[id]}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            {copy.continue}
            <ArrowRight size={19} aria-hidden="true" />
          </button>
          <p className="sign-in-footer">
            <ShieldCheck size={19} aria-hidden="true" />
            {copy.signInFooter}
          </p>
        </form>
      </main>
    </div>
  )
}

function SettingsPreview({ language, tenant }: { language: Language; tenant: TenantId }) {
  const copy = messages[language]
  const [tab, setTab] = useState<'users' | 'groups' | 'roles'>('users')
  const [selected, setSelected] = useState<ProfileId | null>(null)
  const members = profiles.filter((profile) => workspaceFor(profile, tenant))
  const roleFor = (profile: ProfileId) => dashboardCopy[language][profile]
  const groupFor = (profile: ProfileId) => (profile === 'manager' ? copy.platformAdmins : copy.deskTeam)
  const selectedWorkspace = selected ? workspaceFor(selected, tenant) : null

  return (
    <>
      <nav className="tabs" aria-label={copy.settings}>
        {(['users', 'groups', 'roles'] as const).map((view) => (
          <button
            key={view}
            className="soft-button"
            aria-current={tab === view ? 'page' : undefined}
            onClick={() => {
              setTab(view)
              setSelected(null)
            }}
          >
            {copy[view]}
          </button>
        ))}
      </nav>
      {selected && selectedWorkspace ? (
        <section className="app-panel user-detail">
          <button className="soft-button" onClick={() => setSelected(null)}>
            {copy.backToUsers}
          </button>
          <h2 lang="en">{staff[selected].name}</h2>
          <dl className="details">
            <div>
              <dt>{copy.group}</dt>
              <dd>{groupFor(selected)}</dd>
            </div>
            <div>
              <dt>{copy.role}</dt>
              <dd>{roleFor(selected)}</dd>
            </div>
            <div>
              <dt>{copy.propertyAccess}</dt>
              <dd>{selectedWorkspace.properties.map((property) => property.name).join(', ') || '—'}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <div className="app-panel">
          <div className="table-scroll" role="region" tabIndex={0} aria-label={copy[tab]}>
            <table aria-label={copy[tab]}>
              <thead>
                <tr>
                  <th scope="col">{copy[tab]}</th>
                  <th scope="col">{tab === 'roles' ? copy.permissions : copy.role}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((profile) => (
                  <tr key={profile}>
                    <th scope="row">
                      {tab === 'users' ? (
                        <button className="text-button" onClick={() => setSelected(profile)}>
                          <span lang="en">{staff[profile].name}</span>
                        </button>
                      ) : tab === 'groups' ? (
                        groupFor(profile)
                      ) : (
                        roleFor(profile)
                      )}
                    </th>
                    <td>
                      {tab === 'roles'
                        ? workspaceFor(profile, tenant)
                            ?.modules.map((id) => dashboardCopy[language][id])
                            .join(', ')
                        : roleFor(profile)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function Navigation({
  workspace,
  copy,
  area,
  tenant,
  tenantIds,
  switchTenant,
  signOut,
}: {
  workspace: Workspace
  copy: DashboardCopy
  area: string
  tenant: TenantId
  tenantIds: TenantId[]
  switchTenant: (tenant: TenantId) => void
  signOut: () => void
}) {
  return (
    <aside className="app-sidebar">
      <a href={home} className="brand-link">
        <Brand />
      </a>
      <div className="tenant-box">
        <span className="tenant-avatar" aria-hidden="true">
          {tenants[tenant].initials}
        </span>
        <div className="tenant-selector">
          <span id="active-tenant-label">{copy.tenant}</span>
          {tenantIds.length > 1 ? (
            <select
              aria-labelledby="active-tenant-label"
              value={tenant}
              onChange={(event) => switchTenant(event.currentTarget.value as TenantId)}
            >
              {tenantIds.map((id) => (
                <option key={id} value={id}>
                  {tenants[id].name}
                </option>
              ))}
            </select>
          ) : (
            <strong lang="en">{tenants[tenant].name}</strong>
          )}
        </div>
      </div>
      <nav className="app-nav" aria-label={copy.nav}>
        <a href={home} aria-current={area === 'platform' ? 'page' : undefined}>
          <LayoutGrid size={19} aria-hidden="true" />
          {copy.platform}
        </a>
        {workspace.modules.map((id) => {
          const Icon = moduleIcons[id]
          return (
            <a key={id} href={`#/${id}`} aria-current={area === id ? 'location' : undefined}>
              <Icon size={19} aria-hidden="true" />
              {copy[id]}
            </a>
          )
        })}
        {workspace.settings && (
          <a href="#/settings" aria-current={area === 'settings' ? 'page' : undefined}>
            <Settings size={19} aria-hidden="true" />
            {copy.settings}
          </a>
        )}
      </nav>
      <div className="sidebar-bottom">
        <button onClick={signOut}>
          <LogOut size={18} aria-hidden="true" /> {copy.signOut}
        </button>
      </div>
    </aside>
  )
}

export function Platform({ language, preferences }: { language: Language; preferences: ReactNode }) {
  const copy = dashboardCopy[language]
  const [profile, setProfile] = useState<ProfileId | null>(null)
  const [tenant, setTenant] = useState<TenantId>('coast')
  const [ledgers, setLedgers] = useState<Partial<Record<TenantId, Ledger>>>({})
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute())
    addEventListener('hashchange', syncRoute)
    return () => removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    if (profile) {
      document.querySelector<HTMLElement>('[data-view-title]')?.focus()
      window.scrollTo(0, 0)
    }
  }, [profile, tenant, route])

  function returnHome() {
    location.hash = home
    setRoute(['platform'])
  }

  if (!profile)
    return (
      <SignIn
        copy={copy}
        preferences={preferences}
        onSignIn={(next) => {
          const firstTenant = Object.keys(staff[next].memberships)[0] as TenantId
          setTenant(firstTenant)
          setProfile(next)
          returnHome()
        }}
      />
    )

  const person = staff[profile]
  const tenantIds = Object.keys(person.memberships) as TenantId[]
  const workspace = workspaceFor(profile, tenant)
  if (!workspace) return null
  const allowed = canOpen(workspace, route)
  const [area, propertyId, section] = route
  const property =
    allowed && area === 'pms' ? workspace.properties.find((item) => item.id === propertyId) : undefined
  const module = allowed ? workspace.modules.find((id) => id === area) : undefined
  const currentModule = module === 'pms' ? copy.portfolio : module ? copy[module] : copy.settings
  const sectionTitle = section === 'availability' ? copy.availability : copy.frontDesk

  return (
    <div className="app-shell">
      <Navigation
        {...{ workspace, copy, area: allowed ? area : '', tenant, tenantIds }}
        switchTenant={(id) => {
          if (tenantIds.includes(id)) {
            setTenant(id)
            returnHome()
          }
        }}
        signOut={() => {
          setProfile(null)
          returnHome()
        }}
      />
      <div className="app-body">
        <header className="app-topbar">
          <div className="topbar-context">
            <span className="preview-dot" />
            <span>{copy.demo}</span>
          </div>
          <div className="topbar-actions">
            {preferences}
            <div className="staff-identity">
              <span className="staff-avatar" aria-hidden="true">
                {person.initials}
              </span>
              <div>
                <strong lang="en">{person.name}</strong>
                <span>{copy[person.title]}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="app-content">
          <nav className="breadcrumbs" aria-label={copy.primaryNav}>
            {allowed && area !== 'platform' ? (
              <a href={home}>{copy.platform}</a>
            ) : (
              <span>{copy.platform}</span>
            )}
            {allowed && area !== 'platform' && (
              <>
                <ChevronRight size={15} aria-hidden="true" />
                {property ? (
                  <a href="#/pms">{currentModule}</a>
                ) : (
                  <span aria-current="page">{currentModule}</span>
                )}
              </>
            )}
            {property && (
              <>
                <ChevronRight size={15} aria-hidden="true" />
                {section ? (
                  <a href={`#/pms/${property.id}`}>{property.name}</a>
                ) : (
                  <span aria-current="page">{property.name}</span>
                )}
              </>
            )}
            {property && section && (
              <>
                <ChevronRight size={15} aria-hidden="true" />
                <span aria-current="page">{sectionTitle}</span>
              </>
            )}
          </nav>
          {!allowed ? (
            <section className="app-panel module-preview">
              <h1 data-view-title tabIndex={-1}>
                {copy.unavailableView}
              </h1>
              <p>{copy.unavailableCopy}</p>
              <a className="card-action" href={workspace.modules.includes('pms') ? '#/pms' : home}>
                {workspace.modules.includes('pms') ? copy.portfolio : copy.backPlatform}
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </section>
          ) : area === 'platform' || (area === 'pms' && !property) ? (
            <Dashboard
              key={`${profile}/${tenant}/${area}`}
              kind={area}
              {...{ workspace, profile, tenant, language }}
              name={person.name}
            />
          ) : area === 'settings' ? (
            <>
              <div className="dashboard-heading">
                <div>
                  <h1 data-view-title tabIndex={-1}>
                    {copy.settings}
                  </h1>
                  <p>{copy.settingsIntro}</p>
                </div>
              </div>
              <SettingsPreview key={tenant} {...{ language, tenant }} />
            </>
          ) : property && !section ? (
            <PropertyDashboard {...{ property, language }} />
          ) : property ? (
            <>
              <div className="dashboard-heading">
                <div>
                  <h1 data-view-title tabIndex={-1}>
                    {sectionTitle}
                  </h1>
                  <p>
                    {property.name} · {property.location}
                  </p>
                </div>
                <OperatingDate {...{ copy, language }} />
              </div>
              {section === 'availability' ? (
                <Availability
                  key={property.id}
                  property={property.id}
                  language={language}
                  ledger={ledgers[tenant] ?? { reservations: [], sales: [] }}
                  update={(ledger) => setLedgers((previous) => ({ ...previous, [tenant]: ledger }))}
                />
              ) : (
                <FrontDesk {...{ language, property }} />
              )}
            </>
          ) : module && module !== 'pms' ? (
            <>
              <div className="dashboard-heading">
                <div>
                  <h1 data-view-title tabIndex={-1}>
                    {copy[module]}
                  </h1>
                  <p>{copy[`${module}Copy`]}</p>
                </div>
              </div>
              <section className="app-panel module-preview">
                <div className="section-heading">
                  <span className={`tile-icon tone-${module}`}>
                    <Building2 size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{copy.accessPreview}</h2>
                    <p>{copy.modulePreview}</p>
                  </div>
                </div>
                <h3>{copy.moduleFeatures}</h3>
                <ul>
                  {copy[`${module}Scope`].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  )
}
