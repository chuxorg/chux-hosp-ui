import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://127.0.0.1:8000' },
    'confirm-disposable': { type: 'boolean' },
  },
})
const base = new URL(values.url)
if (
  !values['confirm-disposable'] ||
  base.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) ||
  base.pathname !== '/' ||
  base.username ||
  base.password ||
  base.search ||
  base.hash
) {
  throw new Error(
    'Use --confirm-disposable and an isolated loopback HTTP origin for a fresh synthetic database.',
  )
}

async function write(method, path, body, expected) {
  const response = await fetch(new URL('/pms/v1' + path, base), {
    method,
    redirect: 'error',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  if (response.status !== expected) throw new Error(`${method} ${path}: HTTP ${response.status}`)
  return response.json()
}

async function seed(name) {
  const { id: propertyId } = await write(
    'POST',
    '/properties',
    { name, time_zone: 'Asia/Bangkok', active: true },
    201,
  )
  const property = `/properties/${propertyId}`
  const roomType = 'Standard King'
  const nightlyMinor = 185000
  const { id: roomTypeId } = await write(
    'POST',
    property + '/room-types',
    { name: roomType, max_occupancy: 2, active: true },
    201,
  )
  await write(
    'POST',
    property + '/rooms',
    { room_type_id: roomTypeId, number: 'SYN-101', active: true },
    201,
  )
  const type = property + `/room-types/${roomTypeId}`
  await write('PUT', type + '/rate', { amount_minor: nightlyMinor, currency: 'THB', active: true }, 201)
  await write(
    'PUT',
    type + '/reservation-pool',
    {
      scope: 'homogeneous_segment_neutral',
      enabled: true,
      attestation_ref: 'SYN-WAYPOST-NEUTRAL',
      operator_ref: 'SYN-WAYPOST-SEED',
    },
    200,
  )
  return { propertyId, propertyName: name, roomTypeId, roomType, nightlyMinor }
}

const property = await seed('Waypost Pilot A')
const denied = await seed('Waypost Pilot B')
console.log(JSON.stringify({ ...property, deniedPropertyId: denied.propertyId }))
