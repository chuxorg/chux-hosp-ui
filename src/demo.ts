export const moduleIds = ['pms', 'experiences', 'operations', 'loyalty', 'procurement'] as const
export type ModuleId = (typeof moduleIds)[number]
export type Route = readonly string[]

const properties = {
  icove: {
    name: 'iCove Suites',
    location: 'Bang Phli',
    rooms: 64,
    occupied: 48,
    available: 12,
    unavailable: 4,
    arrivals: 9,
    departures: 6,
  },
  river: {
    name: 'River House',
    location: 'Kanchanaburi',
    rooms: 42,
    occupied: 28,
    available: 12,
    unavailable: 2,
    arrivals: 6,
    departures: 4,
  },
  grove: {
    name: 'The Grove',
    location: 'Chiang Mai',
    rooms: 36,
    occupied: 27,
    available: 8,
    unavailable: 1,
    arrivals: 5,
    departures: 3,
  },
}

export type PropertyId = keyof typeof properties
export type Property = { id: PropertyId } & (typeof properties)[PropertyId]
export type TenantId = 'coast' | 'north' | 'kitchen'
export type ProfileId = 'manager' | 'deskAgent' | 'host'
type Grant = { modules: ModuleId[]; properties: PropertyId[]; settings: boolean }
type Staff = {
  name: string
  initials: string
  title: ProfileId
  memberships: Partial<Record<TenantId, Grant>>
}
type Tenant = { name: string; initials: string; modules: ModuleId[]; properties: PropertyId[] }
type Workspace = { modules: ModuleId[]; properties: Property[]; settings: boolean }

export const tenants: Record<TenantId, Tenant> = {
  coast: {
    name: 'Coast & Canopy',
    initials: 'CC',
    modules: ['pms', 'experiences', 'operations'],
    properties: ['icove', 'river'],
  },
  north: {
    name: 'Northern Collection',
    initials: 'NC',
    modules: ['pms', 'loyalty'],
    properties: ['grove'],
  },
  kitchen: { name: 'Siam Kitchen', initials: 'SK', modules: ['experiences'], properties: [] },
}

export const staff: Record<ProfileId, Staff> = {
  manager: {
    name: 'Maya Chen',
    initials: 'MC',
    title: 'manager',
    memberships: {
      coast: {
        modules: ['pms', 'experiences', 'operations', 'loyalty'],
        properties: ['icove', 'river'],
        settings: true,
      },
      north: { modules: ['pms', 'loyalty'], properties: ['grove'], settings: false },
    },
  },
  deskAgent: {
    name: 'Alex Reyes',
    initials: 'AR',
    title: 'deskAgent',
    memberships: {
      coast: { modules: ['pms', 'experiences', 'loyalty'], properties: ['icove'], settings: false },
    },
  },
  host: {
    name: 'Nora Tan',
    initials: 'NT',
    title: 'host',
    memberships: {
      kitchen: { modules: ['experiences'], properties: [], settings: false },
    },
  },
}

export function workspaceFor(profileId: string, tenantId: string): Workspace | null {
  const person = Object.hasOwn(staff, profileId) ? staff[profileId as ProfileId] : undefined
  const tenant = Object.hasOwn(tenants, tenantId) ? tenants[tenantId as TenantId] : undefined
  const grant =
    person && Object.hasOwn(person.memberships, tenantId)
      ? person.memberships[tenantId as TenantId]
      : undefined
  if (!tenant || !grant) return null

  const modules = moduleIds.filter((id) => tenant.modules.includes(id) && grant.modules.includes(id))
  return {
    modules,
    properties: modules.includes('pms')
      ? tenant.properties
          .filter((id) => grant.properties.includes(id))
          .map((id) => ({ id, ...properties[id] }))
      : [],
    settings: grant.settings,
  }
}

export function canOpen(workspace: Workspace | null, route: Route) {
  const [area, propertyId, section, ...extra] = route
  if (extra.length || !workspace) return false
  if (area === 'platform') return route.length === 1
  if (area === 'settings') return route.length === 1 && workspace.settings
  if (!workspace.modules.some((module) => module === area)) return false
  if (area !== 'pms') return route.length === 1
  if (route.length === 1) return true
  return (
    (route.length === 2 || ['availability', 'front-desk'].includes(section)) &&
    workspace.properties.some((property) => property.id === propertyId)
  )
}

export function inventoryTotals(properties: Property[]) {
  const totals = { rooms: 0, occupied: 0, available: 0, unavailable: 0, arrivals: 0, departures: 0 }
  for (const property of properties) {
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += property[key]
  }
  const inService = totals.rooms - totals.unavailable
  return { ...totals, occupancy: inService > 0 ? totals.occupied / inService : null }
}
