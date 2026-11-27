export type LiveSeed = {
  propertyId: number
  propertyName: string
  roomTypeId: number
  roomType: string
  nightlyMinor: number
}

export type Session = { user: { id: number; display_name: string }; csrf_token: string }
type Terms = {
  currency: 'THB'
  nightly_amount_minor: number
  night_count: number
  accommodation_base_subtotal_minor: number
}
export type LiveReservation = {
  id: number
  property_id: number
  room_type_id: number
  check_in: string
  check_out: string
  status: 'confirmed' | 'cancelled'
  booking_terms: Terms
}
type Cancellation = { reservation_id: number; property_id: number; status: 'cancelled' }

export type BookingRequest = {
  kind: 'confirm'
  key: string
  body: {
    room_type_id: number
    guest_ref: string
    check_in: string
    check_out: string
    expected_nightly_rate_minor: number
    currency: 'THB'
  }
}
export type CancellationRequest = {
  kind: 'cancel'
  key: string
  reservationId: number
  body: { reason_ref: string }
}
export type ReservationMutation = BookingRequest | CancellationRequest

export class ReservationApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code = '') {
    super(`Reservation API status ${status}`)
    this.status = status
    this.code = code
  }
}

function positiveInt(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && Number.isSafeInteger(value)
}

export function parseLiveSeed(value: string): LiveSeed | null {
  try {
    const seed = JSON.parse(value)
    if (
      positiveInt(seed?.propertyId) &&
      positiveInt(seed?.roomTypeId) &&
      positiveInt(seed?.nightlyMinor) &&
      typeof seed.propertyName === 'string' &&
      seed.propertyName.trim() &&
      typeof seed.roomType === 'string' &&
      seed.roomType.trim()
    )
      return seed
  } catch {
    return null
  }
  return null
}

async function json(path: string, options: RequestInit = {}): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(16000),
    })
  } catch {
    throw new ReservationApiError(0)
  }
  const body = await response.json().catch(() => null)
  if (!response.ok)
    throw new ReservationApiError(response.status, typeof body?.error === 'string' ? body.error : '')
  return body
}

function scopedBooking(value: unknown, propertyId: number, reservationId?: number): LiveReservation {
  const booking = value as Partial<LiveReservation> | null
  const terms = booking?.booking_terms
  if (
    !booking ||
    booking.property_id !== propertyId ||
    !positiveInt(booking.id) ||
    (reservationId !== undefined && booking.id !== reservationId) ||
    !positiveInt(booking.room_type_id) ||
    !isoDate(booking.check_in) ||
    !isoDate(booking.check_out) ||
    !stayLength(booking.check_in, booking.check_out) ||
    (booking.status !== 'confirmed' && booking.status !== 'cancelled') ||
    terms?.currency !== 'THB' ||
    !positiveInt(terms.nightly_amount_minor) ||
    !positiveInt(terms.accommodation_base_subtotal_minor) ||
    terms.night_count !== stayLength(booking.check_in, booking.check_out)
  )
    throw new ReservationApiError(0)
  return booking as LiveReservation
}

function isoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}

export function stayLength(checkIn: string, checkOut: string) {
  if (!isoDate(checkIn) || !isoDate(checkOut)) return 0
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000
  return nights > 0 && nights <= 366 ? nights : 0
}

export function bookingRequest(seed: LiveSeed, checkIn: string, checkOut: string): BookingRequest {
  return {
    kind: 'confirm',
    key: crypto.randomUUID(),
    body: {
      room_type_id: seed.roomTypeId,
      guest_ref: 'SYN-WAYPOST-GUEST',
      check_in: checkIn,
      check_out: checkOut,
      expected_nightly_rate_minor: seed.nightlyMinor,
      currency: 'THB',
    },
  }
}

export function cancellationRequest(reservationId: number): CancellationRequest {
  return {
    kind: 'cancel',
    key: crypto.randomUUID(),
    reservationId,
    body: { reason_ref: 'SYN-WAYPOST-CANCEL' },
  }
}

export async function getSession(): Promise<Session> {
  const session = (await json('/auth/v1/session')) as Partial<Session> | null
  if (
    !session?.user ||
    !positiveInt(session.user.id) ||
    typeof session.user.display_name !== 'string' ||
    typeof session.csrf_token !== 'string' ||
    !session.csrf_token
  )
    throw new ReservationApiError(0)
  return session as Session
}

export async function endSession(session: Session) {
  // The redirect belongs to the provider. Check the application session after revocation.
  const response = await fetch('/auth/v1/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': session.csrf_token },
    credentials: 'same-origin',
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  })
  if (response.type !== 'opaqueredirect' && !response.ok) throw new ReservationApiError(response.status)
}

function reservationPath(propertyId: number) {
  return `/pms/v1/properties/${propertyId}/stay-reservations`
}

export async function lookupReservation(propertyId: number, reservationId: number) {
  if (!positiveInt(reservationId)) throw new ReservationApiError(400)
  return scopedBooking(
    await json(`${reservationPath(propertyId)}/${reservationId}`),
    propertyId,
    reservationId,
  )
}

export async function submitReservation(
  propertyId: number,
  session: Session,
  mutation: ReservationMutation,
) {
  const base = reservationPath(propertyId)
  const path = mutation.kind === 'confirm' ? base : `${base}/${mutation.reservationId}/cancellation`
  const value = await json(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': session.csrf_token,
      'Idempotency-Key': mutation.key,
    },
    body: JSON.stringify(mutation.body),
  })
  if (mutation.kind === 'confirm') return scopedBooking(value, propertyId)
  const event = value as Partial<Cancellation> | null
  if (
    event?.property_id !== propertyId ||
    event.reservation_id !== mutation.reservationId ||
    event.status !== 'cancelled'
  )
    throw new ReservationApiError(0)
  return null
}
