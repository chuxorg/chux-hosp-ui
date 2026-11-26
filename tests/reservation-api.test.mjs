import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bookingRequest,
  cancellationRequest,
  getSession,
  lookupReservation,
  parseLiveSeed,
  stayLength,
  submitReservation,
} from '../src/reservation-api.ts'

const seed = {
  propertyId: 1,
  propertyName: 'Waypost Pilot A',
  roomTypeId: 2,
  roomType: 'Standard King',
  nightlyMinor: 185000,
}
const session = { user: { id: 4, display_name: 'Synthetic operator' }, csrf_token: 'local-fixture' }
const booking = {
  id: 10,
  property_id: 1,
  room_type_id: 2,
  check_in: '2026-12-01',
  check_out: '2026-12-03',
  status: 'confirmed',
  booking_terms: {
    currency: 'THB',
    nightly_amount_minor: 185000,
    night_count: 2,
    accommodation_base_subtotal_minor: 370000,
  },
}

test('seed and stay parsing require valid IDs and real date-only stays', () => {
  assert.deepEqual(parseLiveSeed(JSON.stringify(seed)), seed)
  assert.equal(parseLiveSeed(JSON.stringify({ ...seed, propertyId: -1 })), null)
  assert.equal(parseLiveSeed(''), null)
  assert.equal(stayLength('2026-02-29', '2026-03-02'), 0)
  assert.equal(stayLength('2026-12-01', '2026-12-03'), 2)
  assert.equal(stayLength('2026-01-01', '2028-01-01'), 0)
})

test('mutation replay uses the original key and payload over property-scoped routes', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    calls.push({ path, init })
    if (calls.length === 1) throw new Error('response interrupted')
    if (path.endsWith('/cancellation')) {
      return Response.json({ reservation_id: 10, property_id: 1, status: 'cancelled' }, { status: 201 })
    }
    return Response.json(booking)
  })
  const request = bookingRequest(seed, booking.check_in, booking.check_out)
  await assert.rejects(submitReservation(1, session, request), { status: 0 })
  assert.deepEqual(await submitReservation(1, session, request), booking)
  assert.equal(calls[1].path, '/pms/v1/properties/1/stay-reservations')
  assert.equal(calls[0].init.body, calls[1].init.body)
  assert.equal(calls[1].init.headers['Idempotency-Key'], request.key)
  assert.equal(calls[0].init.headers['Idempotency-Key'], calls[1].init.headers['Idempotency-Key'])
  assert.equal(calls[1].init.headers['X-CSRF-Token'], session.csrf_token)
  assert.equal(calls[1].init.credentials, 'same-origin')
  assert.equal(JSON.parse(calls[1].init.body).operator_ref, undefined)
  const cancellation = cancellationRequest(10)
  assert.equal(await submitReservation(1, session, cancellation), null)
  assert.equal(calls[2].path, '/pms/v1/properties/1/stay-reservations/10/cancellation')
  assert.notEqual(cancellation.key, request.key)
})

test('the adapter rejects unauthorized, foreign and malformed responses', async (t) => {
  const responses = [
    Response.json(session),
    Response.json({ error: 'permission denied' }, { status: 403 }),
    Response.json({ ...booking, property_id: 2 }),
    Response.json({ ...booking, booking_terms: {} }),
    Response.json({ ...booking, id: 11 }),
  ]
  const transport = t.mock.method(globalThis, 'fetch', async () => responses.shift())
  assert.deepEqual(await getSession(), session)
  await assert.rejects(lookupReservation(2, 10), { status: 403 })
  await assert.rejects(lookupReservation(1, 10), { status: 0 })
  await assert.rejects(lookupReservation(1, 10), { status: 0 })
  await assert.rejects(lookupReservation(1, 10), { status: 0 })
  await assert.rejects(lookupReservation(1, 0), { status: 400 })
  assert.equal(transport.mock.callCount(), 5)
})
