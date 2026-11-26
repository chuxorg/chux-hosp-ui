import { canOpen, type ProfileId, type Route, type TenantId, workspaceFor } from './demo'

const defaults = { quick: true, inventory: true, properties: true, activity: true, pins: [] as string[] }
export type DashboardPreferences = typeof defaults
type Workspace = NonNullable<ReturnType<typeof workspaceFor>>
type Dashboard = 'platform' | 'pms'

export function preferenceKey(profile: ProfileId, tenant: TenantId, dashboard: Dashboard) {
  return `waypost.dashboard.v1.${profile}.${tenant}.${dashboard}`
}

export function defaultPreferences(workspace: Workspace, dashboard: Dashboard): DashboardPreferences {
  const property = workspace.properties[0]
  const propertyPath = property ? `pms/${property.id}` : null
  const shortcuts =
    dashboard === 'platform'
      ? [workspace.modules[0], propertyPath && `${propertyPath}/availability`]
      : [propertyPath && `${propertyPath}/availability`, propertyPath && `${propertyPath}/front-desk`]
  return { ...defaults, pins: shortcuts.filter((path): path is string => Boolean(path)) }
}

export function routeFor(path: string): Route {
  return path.split('/').filter(Boolean)
}

export function getDashboardPreferences(
  key: string,
  workspace: Workspace,
  dashboard: Dashboard,
): DashboardPreferences {
  try {
    const stored = JSON.parse(
      localStorage.getItem(key) ?? 'null',
    ) as Partial<DashboardPreferences> | null
    if (!stored || typeof stored !== 'object') return defaultPreferences(workspace, dashboard)
    const pins = Array.isArray(stored.pins)
      ? stored.pins.filter(
          (path): path is string => typeof path === 'string' && canOpen(workspace, routeFor(path)),
        )
      : []
    return {
      quick: stored.quick !== false,
      inventory: stored.inventory !== false,
      properties: stored.properties !== false,
      activity: stored.activity !== false,
      pins: [...new Set(pins)],
    }
  } catch {
    return defaultPreferences(workspace, dashboard)
  }
}

export function saveDashboardPreferences(key: string, preferences: DashboardPreferences) {
  try {
    localStorage.setItem(key, JSON.stringify(preferences))
  } catch {
    // The current view still retains preferences when storage is unavailable.
  }
}
