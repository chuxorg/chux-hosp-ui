import type { PropertyId } from './demo'

const inventory = {
  icove: {
    standardKing: [8, 3, 1, 0, 2, 5, 4, 6, 5, 4, 2, 0, 1, 3],
    deluxeTwin: [4, 2, 1, 1, 0, 3, 2, 3, 3, 2, 1, 1, 0, 2],
  },
  river: {
    standardKing: [6, 4, 3, 2, 3, 6, 5, 7, 6, 4, 3, 1, 2, 4],
    deluxeTwin: [6, 2, 0, 1, 2, 4, 3, 5, 4, 3, 2, 1, 1, 2],
  },
  grove: {
    standardKing: [5, 3, 4, 3, 5, 4, 4, 6, 4, 5, 2, 5, 1, 3],
    deluxeTwin: [3, 2, 1, 1, 0, 3, 2, 3, 3, 2, 1, 1, 0, 2],
  },
} as const

export const roomTypes = ['standardKing', 'deluxeTwin'] as const
export const sampleDates = Array.from({ length: 15 }, (_, offset) =>
  new Date(Date.UTC(2026, 10, 25 + offset)).toISOString().slice(0, 10),
)
export type RoomType = (typeof roomTypes)[number]
export type Stay = { arrival: string; departure: string; room: RoomType }
export type Reservation = Stay & {
  property: PropertyId
  reference: string
  nightlyPrice: number
  status: 'confirmed' | 'cancelled'
}
export type ExternalSale = { property: PropertyId; room: RoomType; night: number }
export type Ledger = { reservations: Reservation[]; sales: ExternalSale[] }

const rates: Record<PropertyId, Record<RoomType, number>> = {
  icove: { standardKing: 1850, deluxeTwin: 2250 },
  river: { standardKing: 1650, deluxeTwin: 2100 },
  grove: { standardKing: 1900, deluxeTwin: 2400 },
}

export function stayNights(stay: Stay) {
  const start = sampleDates.indexOf(stay.arrival)
  const end = sampleDates.indexOf(stay.departure)
  return start >= 0 && end > start
    ? Array.from({ length: end - start }, (_, index) => start + index)
    : []
}

export function roomsForNight(ledger: Ledger, property: PropertyId, room: RoomType, night: number) {
  const held = ledger.reservations.filter(
    (item) =>
      item.property === property &&
      item.room === room &&
      item.status === 'confirmed' &&
      stayNights(item).includes(night),
  ).length
  const sold = ledger.sales.filter(
    (item) => item.property === property && item.room === room && item.night === night,
  ).length
  return inventory[property][room][night] - held - sold
}

export function available(ledger: Ledger, property: PropertyId, stay: Stay) {
  const nights = stayNights(stay)
  return (
    nights.length > 0 && nights.every((night) => roomsForNight(ledger, property, stay.room, night) > 0)
  )
}

export function quote(property: PropertyId, stay: Stay) {
  return { ...stay, nightlyPrice: rates[property][stay.room] }
}

export function confirmReservation(
  ledger: Ledger,
  property: PropertyId,
  stay: ReturnType<typeof quote>,
) {
  if (!available(ledger, property, stay)) return null
  const next = ledger.reservations.length + 1
  const reservation: Reservation = {
    ...stay,
    property,
    reference: `WP-${property.toUpperCase()}-${String(next).padStart(3, '0')}`,
    status: 'confirmed',
  }
  return { reservation, ledger: { ...ledger, reservations: [...ledger.reservations, reservation] } }
}

export function findReservation(ledger: Ledger, property: PropertyId, reference: string) {
  const normalized = reference.trim().toUpperCase()
  return ledger.reservations.find((item) => item.property === property && item.reference === normalized)
}

export function cancelReservation(ledger: Ledger, property: PropertyId, reference: string): Ledger {
  const current = findReservation(ledger, property, reference)
  if (current?.status !== 'confirmed') return ledger
  return {
    ...ledger,
    reservations: ledger.reservations.map((item) =>
      item === current ? { ...item, status: 'cancelled' } : item,
    ),
  }
}
