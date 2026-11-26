import { useState } from 'react'
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarDays,
  CircleOff,
  ClipboardList,
  DoorOpen,
  Gauge,
  HeartHandshake,
  MapPin,
  Pin,
  Settings2,
  ShoppingBasket,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { dashboardCopy, type DashboardCopy } from './dashboard-copy'
import {
  defaultPreferences,
  getDashboardPreferences,
  preferenceKey,
  routeFor,
  saveDashboardPreferences,
  type DashboardPreferences,
} from './dashboard-preferences'
import {
  canOpen,
  inventoryTotals,
  type ModuleId,
  type ProfileId,
  type Property,
  type TenantId,
  workspaceFor,
} from './demo'
import type { Language } from './messages'

type Workspace = NonNullable<ReturnType<typeof workspaceFor>>
export type Shortcut = { path: string; label: string; icon: LucideIcon }

export const moduleIcons = {
  pms: Building2,
  experiences: Sparkles,
  operations: ClipboardList,
  loyalty: HeartHandshake,
  procurement: ShoppingBasket,
} satisfies Record<ModuleId, LucideIcon>

export function moduleShortcuts(copy: DashboardCopy, workspace: Workspace): Shortcut[] {
  return workspace.modules.map((id) => ({ path: id, label: copy[id], icon: moduleIcons[id] }))
}

function propertyShortcuts(property: Property, copy: DashboardCopy): Shortcut[] {
  const path = `pms/${property.id}`
  return [
    { path, label: property.name, icon: Building2 },
    {
      path: `${path}/availability`,
      label: `${property.name} · ${copy.availability}`,
      icon: CalendarDays,
    },
    { path: `${path}/front-desk`, label: `${property.name} · ${copy.frontDesk}`, icon: ClipboardList },
  ]
}

export function DashboardLink({ shortcut, className }: { shortcut: Shortcut; className?: string }) {
  const Icon = shortcut.icon
  return (
    <a className={className ?? 'shortcut'} href={`#/${shortcut.path}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{shortcut.label}</span>
      <ArrowRight className="shortcut-arrow" size={16} aria-hidden="true" />
    </a>
  )
}

function PinButton({
  shortcut,
  preferences,
  update,
  copy,
}: {
  shortcut: Shortcut
  preferences: DashboardPreferences
  update: (next: DashboardPreferences) => void
  copy: DashboardCopy
}) {
  const pinned = preferences.pins.includes(shortcut.path)
  return (
    <button
      className="icon-button pin-button"
      aria-pressed={pinned}
      type="button"
      aria-label={`${pinned ? copy.unpin : copy.pin} · ${shortcut.label}`}
      title={pinned ? copy.unpin : copy.pin}
      onClick={() =>
        update({
          ...preferences,
          pins: pinned
            ? preferences.pins.filter((path) => path !== shortcut.path)
            : [...preferences.pins, shortcut.path],
        })
      }
    >
      <Pin size={17} aria-hidden="true" />
    </button>
  )
}

function QuickAccess({
  candidates,
  preferences,
  copy,
}: {
  candidates: Shortcut[]
  preferences: DashboardPreferences
  copy: DashboardCopy
}) {
  const pinned = preferences.pins.flatMap((path) =>
    candidates.filter((shortcut) => shortcut.path === path),
  )
  return (
    <section className="app-panel quick-panel" aria-labelledby="quick-access">
      <div className="section-heading">
        <span className="tile-icon tone-pms">
          <Pin size={19} aria-hidden="true" />
        </span>
        <div>
          <h2 id="quick-access">{copy.quickAccess}</h2>
          <p>{copy.quickHint}</p>
        </div>
      </div>
      <div className="quick-list">
        {pinned.length ? (
          pinned.map((shortcut) => <DashboardLink key={shortcut.path} shortcut={shortcut} />)
        ) : (
          <p className="empty-pins">{copy.noPins}</p>
        )}
      </div>
    </section>
  )
}

function Customization({
  copy,
  dashboard,
  candidates,
  preferences,
  update,
  reset,
}: {
  copy: DashboardCopy
  dashboard: 'platform' | 'pms'
  candidates: Shortcut[]
  preferences: DashboardPreferences
  update: (next: DashboardPreferences) => void
  reset: () => void
}) {
  const choices =
    dashboard === 'platform'
      ? (['quick'] as const)
      : (['quick', 'inventory', 'properties', 'activity'] as const)
  const labels = {
    quick: copy.showQuick,
    inventory: copy.showInventory,
    properties: copy.showProperties,
    activity: copy.showActivity,
  }
  return (
    <section
      className="app-panel customize-panel"
      id="customize-panel"
      aria-labelledby="customize-heading"
    >
      <h2 id="customize-heading">
        {dashboard === 'platform' ? copy.customizePlatform : copy.customizePms}
      </h2>
      <fieldset>
        <legend>{copy.show}</legend>
        {choices.map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={(event) => update({ ...preferences, [key]: event.currentTarget.checked })}
            />{' '}
            {labels[key]}
          </label>
        ))}
      </fieldset>
      {candidates.length > 0 && (
        <fieldset>
          <legend>{copy.quickAccess}</legend>
          {candidates.map((shortcut) => (
            <label key={shortcut.path}>
              <input
                type="checkbox"
                checked={preferences.pins.includes(shortcut.path)}
                onChange={(event) =>
                  update({
                    ...preferences,
                    pins: event.currentTarget.checked
                      ? [...preferences.pins, shortcut.path]
                      : preferences.pins.filter((path) => path !== shortcut.path),
                  })
                }
              />{' '}
              {shortcut.label}
            </label>
          ))}
        </fieldset>
      )}
      <button className="soft-button" onClick={reset}>
        {copy.reset}
      </button>
    </section>
  )
}

function Inventory({
  properties,
  copy,
  language,
}: {
  properties: Property[]
  copy: DashboardCopy
  language: Language
}) {
  const totals = inventoryTotals(properties)
  const number = new Intl.NumberFormat(language)
  const percent = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 })
  const metrics = [
    { key: 'rooms', icon: BedDouble, tone: 'pms' },
    { key: 'available', icon: DoorOpen, tone: 'operations' },
    { key: 'occupancy', icon: Gauge, tone: 'experiences' },
    { key: 'unavailable', icon: CircleOff, tone: 'neutral' },
  ] as const
  return (
    <section aria-label={copy.roomInventory} className="kpi-grid">
      {metrics.map(({ key, icon: Icon, tone }) => (
        <div className="app-panel kpi" key={key}>
          <span className={`tile-icon tone-${tone}`}>
            <Icon size={19} aria-hidden="true" />
          </span>
          <dl>
            <dt>{copy[key]}</dt>
            <dd>
              {key === 'occupancy'
                ? totals.occupancy === null
                  ? copy.noOccupancy
                  : percent.format(totals.occupancy)
                : number.format(totals[key])}
            </dd>
          </dl>
          {key === 'occupancy' && <small>{copy.occupancyHint}</small>}
        </div>
      ))}
    </section>
  )
}

function Movements({
  properties,
  copy,
  language,
}: {
  properties: Property[]
  copy: DashboardCopy
  language: Language
}) {
  const totals = inventoryTotals(properties)
  const format = new Intl.NumberFormat(language)
  return (
    <section className="app-panel movement-panel" aria-labelledby="movement-heading">
      <div className="section-heading">
        <span className="tile-icon tone-operations">
          <Activity size={19} aria-hidden="true" />
        </span>
        <h2 id="movement-heading">{copy.showActivity}</h2>
      </div>
      <dl>
        <div>
          <dt>
            <ArrowDownLeft size={17} aria-hidden="true" />
            {copy.arrivals}
          </dt>
          <dd>{format.format(totals.arrivals)}</dd>
        </div>
        <div>
          <dt>
            <ArrowUpRight size={17} aria-hidden="true" />
            {copy.departures}
          </dt>
          <dd>{format.format(totals.departures)}</dd>
        </div>
      </dl>
    </section>
  )
}

export function OperatingDate({ copy, language }: { copy: DashboardCopy; language: Language }) {
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    Date.UTC(2026, 10, 25),
  )
  return (
    <p className="operating-date">
      <CalendarDays size={16} aria-hidden="true" />
      {copy.snapshot} <time dateTime="2026-11-25">{date}</time>
    </p>
  )
}

function PropertyList({
  properties,
  copy,
  language,
  preferences,
  update,
}: {
  properties: Property[]
  copy: DashboardCopy
  language: Language
  preferences: DashboardPreferences
  update: (next: DashboardPreferences) => void
}) {
  const number = new Intl.NumberFormat(language)
  const percent = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 })
  return (
    <section className="app-panel property-panel" aria-labelledby="property-list-heading">
      <h2 id="property-list-heading">{copy.properties}</h2>
      {properties.length === 0 ? (
        <p>{copy.noProperties}</p>
      ) : (
        <div className="table-scroll" tabIndex={0} role="region" aria-labelledby="property-list-heading">
          <table className="property-table">
            <thead>
              <tr>
                <th scope="col">{copy.property}</th>
                <th scope="col">{copy.rooms}</th>
                <th scope="col">{copy.available}</th>
                <th scope="col">{copy.occupancy}</th>
                <th scope="col">{copy.access}</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const shortcut = propertyShortcuts(property, copy)[0]
                const { occupancy } = inventoryTotals([property])
                return (
                  <tr key={property.id}>
                    <th scope="row">
                      <a href={`#/${shortcut.path}`}>{property.name}</a>
                      <span>
                        <MapPin size={13} aria-hidden="true" /> {property.location}
                      </span>
                    </th>
                    <td>{number.format(property.rooms)}</td>
                    <td>{number.format(property.available)}</td>
                    <td>{occupancy === null ? copy.noOccupancy : percent.format(occupancy)}</td>
                    <td>
                      <div className="row-actions">
                        <PinButton {...{ shortcut, preferences, update, copy }} />
                        <a
                          className="icon-link"
                          href={`#/${shortcut.path}`}
                          aria-label={`${copy.openProperty} · ${property.name}`}
                        >
                          <ArrowRight size={18} />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function Dashboard({
  kind,
  workspace,
  profile,
  tenant,
  name,
  language,
}: {
  kind: 'platform' | 'pms'
  workspace: Workspace
  profile: ProfileId
  tenant: TenantId
  name: string
  language: Language
}) {
  const copy = dashboardCopy[language]
  const key = preferenceKey(profile, tenant, kind)
  const [preferences, setPreferences] = useState(() => getDashboardPreferences(key, workspace, kind))
  const [customizing, setCustomizing] = useState(false)
  const [scope, setScope] = useState('all')
  const platform = kind === 'platform'
  const modules = moduleShortcuts(copy, workspace)
  const propertyLinks = workspace.properties.flatMap((property) => propertyShortcuts(property, copy))
  const candidates = platform ? [...modules, ...propertyLinks] : propertyLinks
  const scopedProperties = workspace.properties.filter(
    (property) => scope === 'all' || property.id === scope,
  )
  const update = (next: DashboardPreferences) => {
    const valid = { ...next, pins: next.pins.filter((path) => canOpen(workspace, routeFor(path))) }
    setPreferences(valid)
    saveDashboardPreferences(key, valid)
  }
  return (
    <>
      <div className={platform ? 'dashboard-hero' : 'dashboard-heading'}>
        <div>
          <h1 data-view-title tabIndex={-1}>
            {platform ? (
              <>
                {copy.welcome} <span lang="en">{name.split(' ')[0]}</span>
              </>
            ) : (
              copy.portfolio
            )}
          </h1>
          <p>{platform ? copy.platformIntro : copy.portfolioIntro}</p>
        </div>
        <button
          className={platform ? 'hero-button' : 'soft-button'}
          onClick={() => setCustomizing(!customizing)}
          aria-expanded={customizing}
          aria-controls={customizing ? 'customize-panel' : undefined}
        >
          <Settings2 size={17} aria-hidden="true" /> {customizing ? copy.done : copy.customize}
        </button>
      </div>
      {customizing && (
        <Customization
          dashboard={kind}
          reset={() => update(defaultPreferences(workspace, kind))}
          {...{ copy, candidates, preferences, update }}
        />
      )}
      {platform ? (
        <div className={preferences.quick ? 'dashboard-grid' : 'dashboard-grid single-column'}>
          <section aria-labelledby="modules-heading">
            <div className="dashboard-section-title">
              <h2 id="modules-heading">{copy.modules}</h2>
              <p>{copy.modulesHint}</p>
            </div>
            {!modules.length && <div className="app-panel">{copy.noModules}</div>}
            <div className="module-grid">
              {workspace.modules.map((id) => {
                const Icon = moduleIcons[id]
                const shortcut = { path: id, label: copy[id], icon: Icon }
                return (
                  <article className="app-panel module-card" key={id}>
                    <div className="module-card-top">
                      <span className={`tile-icon tone-${id}`}>
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <PinButton {...{ shortcut, preferences, update, copy }} />
                    </div>
                    <h3>
                      <a href={`#/${id}`}>{copy[id]}</a>
                    </h3>
                    <p>{copy[`${id}Copy`]}</p>
                    <a
                      className="card-action"
                      href={`#/${id}`}
                      aria-label={`${copy.openModule} · ${copy[id]}`}
                    >
                      {copy.openModule} <ArrowRight size={17} aria-hidden="true" />
                    </a>
                  </article>
                )
              })}
            </div>
          </section>
          {preferences.quick && <QuickAccess {...{ candidates, preferences, copy }} />}
        </div>
      ) : (
        <>
          <div className="portfolio-controls">
            <OperatingDate {...{ copy, language }} />
            {workspace.properties.length > 0 && (
              <div className="portfolio-scope">
                <label>
                  {copy.scope}
                  <select value={scope} onChange={(event) => setScope(event.currentTarget.value)}>
                    <option value="all">{copy.all}</option>
                    {workspace.properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
                {scope !== 'all' && (
                  <a className="card-action" href={`#/pms/${scope}`}>
                    {copy.openProperty}
                    <ArrowRight size={17} aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>
          {!workspace.properties.length && (
            <p className="app-panel" role="status">
              {copy.noProperties}
            </p>
          )}
          {workspace.properties.length > 0 && preferences.inventory && (
            <Inventory properties={scopedProperties} {...{ copy, language }} />
          )}
          <div className="dashboard-grid portfolio-grid">
            {preferences.properties && workspace.properties.length > 0 && (
              <PropertyList
                properties={workspace.properties}
                {...{ copy, language, preferences, update }}
              />
            )}
            {(preferences.activity || preferences.quick) && (
              <div className="dashboard-stack">
                {preferences.activity && workspace.properties.length > 0 && (
                  <Movements properties={scopedProperties} {...{ copy, language }} />
                )}
                {preferences.quick && <QuickAccess {...{ candidates, preferences, copy }} />}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

export function PropertyDashboard({ property, language }: { property: Property; language: Language }) {
  const copy = dashboardCopy[language]
  const tools = propertyShortcuts(property, copy).slice(1)
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <h1 data-view-title tabIndex={-1}>
            {property.name}
          </h1>
          <p>{copy.propertyIntro}</p>
        </div>
        <OperatingDate {...{ copy, language }} />
      </div>
      <Inventory properties={[property]} {...{ copy, language }} />
      <div className="dashboard-grid portfolio-grid">
        <section className="app-panel property-tools" aria-labelledby="property-tools">
          <h2 id="property-tools">{copy.propertyTools}</h2>
          {tools.map((shortcut, index) => (
            <div key={shortcut.path}>
              <DashboardLink
                shortcut={{ ...shortcut, label: index === 0 ? copy.availability : copy.frontDesk }}
              />
              <p>{index === 0 ? copy.availabilityCopy : copy.frontDeskCopy}</p>
            </div>
          ))}
        </section>
        <Movements properties={[property]} {...{ copy, language }} />
      </div>
    </>
  )
}
