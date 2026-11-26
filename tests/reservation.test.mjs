import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  available,
  cancelReservation,
  confirmReservation,
  findReservation,
  quote,
  roomsForNight,
  sampleDates,
  stayNights,
} from '../src/reservation-demo.ts'

const empty = { reservations: [], sales: [] }
const stay = { arrival: sampleDates[0], departure: sampleDates[2], room: 'standardKing' }

test('a room-type reservation changes each occupied night and cancellation releases those nights once', () => {
  const reviewed = quote('icove', stay)
  const { reservation, ledger } = confirmReservation(empty, 'icove', reviewed)
  assert.deepEqual(stayNights(reservation), [0, 1])
  assert.equal(reservation.nightlyPrice, 1850)
  const inventory = (state) => [0, 1, 2].map((night) => roomsForNight(state, 'icove', stay.room, night))
  assert.deepEqual(inventory(ledger), [7, 2, 1])
  assert.equal(findReservation(ledger, 'river', reservation.reference), undefined)
  assert.equal(findReservation(ledger, 'icove', reservation.reference.toLowerCase()), reservation)
  assert.equal(cancelReservation(ledger, 'river', reservation.reference), ledger)
  const cancelled = cancelReservation(ledger, 'icove', reservation.reference)
  assert.equal(findReservation(cancelled, 'icove', reservation.reference).status, 'cancelled')
  assert.deepEqual(inventory(cancelled), [8, 3, 1])
  assert.equal(cancelReservation(cancelled, 'icove', reservation.reference), cancelled)
})

test('invalid dates, sold-out nights, and loss of the last room prevent confirmation', () => {
  const oneNight = { ...stay, arrival: sampleDates[2], departure: sampleDates[3] }
  assert.equal(available(empty, 'icove', { ...oneNight, departure: sampleDates[2] }), false)
  assert.equal(available(empty, 'icove', { ...oneNight, departure: sampleDates[4] }), false)
  assert.equal(available(empty, 'icove', oneNight), true)
  const changed = { ...empty, sales: [{ property: 'icove', room: 'standardKing', night: 2 }] }
  assert.equal(confirmReservation(changed, 'icove', quote('icove', oneNight)), null)
  assert.equal(available(changed, 'icove', { ...oneNight, room: 'deluxeTwin' }), true)
})
