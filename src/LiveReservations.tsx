import { useRef, useState } from 'react'
import { liveCopy } from './live-copy'
import type { Language } from './messages'
import {
  bookingRequest,
  cancellationRequest,
  lookupReservation,
  ReservationApiError,
  stayLength,
  submitReservation,
  type LiveReservation,
  type LiveSeed,
  type ReservationMutation,
  type Session,
} from './reservation-api'
import { reservationCopy } from './reservation-copy'

export type PendingReservation = { operatorId: number; request: ReservationMutation }
type ErrorKey = keyof typeof liveCopy.en

function failure(error: unknown, mutation: boolean): ErrorKey {
  if (!(error instanceof ReservationApiError)) return mutation ? 'uncertain' : 'unavailableApi'
  if (error.status === 401) return 'expired'
  if (error.status === 403) return 'forbidden'
  if (error.status === 404) return 'notFound'
  if (error.code === 'inventory_exhausted') return 'conflict'
  if (error.code === 'price_changed') return 'priceChanged'
  if (error.code === 'cancellation_cutoff_reached') return 'cutoff'
  if (error.code === 'already_cancelled') return 'alreadyCancelled'
  return error.status === 0 || error.status >= 500 || error.status === 429
    ? mutation
      ? 'uncertain'
      : 'unavailableApi'
    : 'rejected'
}

export function LiveReservations({
  language,
  seed,
  session,
  pending,
  setPending,
  mutating,
  setMutating,
  onExpired,
}: {
  language: Language
  seed: LiveSeed
  session: Session
  pending?: PendingReservation
  setPending: (pending?: PendingReservation) => void
  mutating: boolean
  setMutating: (mutating: boolean) => void
  onExpired: (session: Session) => void
}) {
  const copy = liveCopy[language]
  const labels = reservationCopy[language]
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [problem, setProblem] = useState<ErrorKey>()
  const [notice, setNotice] = useState<'booked' | 'cancelled'>()
  const [stay, setStay] = useState({ arrival: '', departure: '' })
  const [review, setReview] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reference, setReference] = useState('')
  const [reservation, setReservation] = useState<LiveReservation>()
  const nights = stayLength(stay.arrival, stay.departure)
  const money = new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'THB',
    currencyDisplay: 'code',
  })
  const format = (minor: number) => money.format(minor / 100)

  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setProblem(undefined)
    setNotice(undefined)
    try {
      await action()
    } finally {
      setBusy(false)
      lock.current = false
    }
  }

  function showError(error: unknown, mutation = false) {
    const message = failure(error, mutation)
    setProblem(message)
    if (message === 'expired') onExpired(session)
    return message
  }

  function mutate(action: PendingReservation) {
    if (mutating || session.user.id !== action.operatorId) return
    void run(async () => {
      setPending(action)
      setMutating(true)
      try {
        const result = await submitReservation(seed.propertyId, session, action.request)
        setPending(undefined)
        setReview(false)
        setCancelling(false)
        if (result) {
          setReservation(result)
          setReference(String(result.id))
          setNotice(result.status === 'confirmed' ? 'booked' : 'cancelled')
        } else if (action.request.kind === 'cancel') {
          const id = action.request.reservationId
          setReference(String(id))
          setReservation((previous) =>
            previous?.id === id ? { ...previous, status: 'cancelled' } : undefined,
          )
          setNotice('cancelled')
        }
      } catch (error) {
        const message = showError(error, true)
        if (message !== 'uncertain' && message !== 'expired') {
          setPending(undefined)
          setReview(false)
          setCancelling(false)
          if (action.request.kind === 'cancel' && message === 'alreadyCancelled')
            setReservation(undefined)
        }
      } finally {
        setMutating(false)
      }
    })
  }

  return (
    <div className="availability-layout">
      <div className="dashboard-heading">
        <div>
          <h1 data-view-title tabIndex={-1}>
            {copy.heading}
          </h1>
          <p>
            {seed.propertyName} · {seed.roomType}
          </p>
        </div>
      </div>
      {problem && (
        <p className="booking-feedback booking-error" role="alert">
          {copy[problem]}
        </p>
      )}
      {notice && (
        <p className="booking-feedback booking-success" role="status">
          {copy[notice]}
        </p>
      )}
      {busy && <p role="status">{copy.loading}</p>}
      {pending ? (
        <section className="app-panel">
          {pending.operatorId === session.user.id ? (
            <>
              {!busy && !mutating && problem !== 'uncertain' && <p>{copy.uncertain}</p>}
              <button
                className="soft-button"
                disabled={busy || mutating}
                onClick={() => mutate(pending)}
              >
                {copy.retry}
              </button>
            </>
          ) : (
            <p>{copy.otherOperator}</p>
          )}
        </section>
      ) : (
        <>
          <section className="app-panel booking-panel">
            <h2>{review ? labels.review : labels.newReservation}</h2>
            <p>{copy.seedExplanation}</p>
            {review ? (
              <>
                <dl className="booking-summary">
                  <div>
                    <dt>{labels.arrival}</dt>
                    <dd>{stay.arrival}</dd>
                  </div>
                  <div>
                    <dt>{labels.departure}</dt>
                    <dd>{stay.departure}</dd>
                  </div>
                  <div>
                    <dt>{copy.estimate}</dt>
                    <dd>{format(seed.nightlyMinor * nights)}</dd>
                  </div>
                </dl>
                <div className="actions">
                  <button className="soft-button" disabled={busy} onClick={() => setReview(false)}>
                    {labels.edit}
                  </button>
                  <button
                    className="primary-button"
                    disabled={busy}
                    onClick={() =>
                      mutate({
                        operatorId: session.user.id,
                        request: bookingRequest(seed, stay.arrival, stay.departure),
                      })
                    }
                  >
                    {labels.confirm}
                  </button>
                </div>
              </>
            ) : (
              <form
                className="booking-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (nights > 0) {
                    setProblem(undefined)
                    setNotice(undefined)
                    setReview(true)
                  } else setProblem('rejected')
                }}
              >
                <label>
                  {labels.arrival}
                  <input
                    type="date"
                    required
                    value={stay.arrival}
                    onChange={(event) => setStay({ ...stay, arrival: event.currentTarget.value })}
                  />
                </label>
                <label>
                  {labels.departure}
                  <input
                    type="date"
                    required
                    value={stay.departure}
                    onChange={(event) => setStay({ ...stay, departure: event.currentTarget.value })}
                  />
                </label>
                <button className="primary-button" disabled={busy} type="submit">
                  {labels.review}
                </button>
              </form>
            )}
          </section>
          <section className="app-panel booking-panel">
            <h2>{copy.lookup}</h2>
            <form
              className="booking-form lookup-form"
              onSubmit={(event) => {
                event.preventDefault()
                const id = Number(reference)
                void run(async () => {
                  setReservation(undefined)
                  setCancelling(false)
                  try {
                    setReservation(await lookupReservation(seed.propertyId, id))
                  } catch (error) {
                    showError(error)
                  }
                })
              }}
            >
              <label>
                {copy.reference}
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]+"
                  value={reference}
                  onChange={(event) => setReference(event.currentTarget.value)}
                />
              </label>
              <button className="soft-button" disabled={busy} type="submit">
                {copy.lookup}
              </button>
            </form>
            {reservation && (
              <>
                <dl className="booking-summary">
                  <div>
                    <dt>{copy.reference}</dt>
                    <dd>
                      {reservation.id} · {labels[reservation.status]}
                    </dd>
                  </div>
                  <div>
                    <dt>{labels.arrival}</dt>
                    <dd>{reservation.check_in}</dd>
                  </div>
                  <div>
                    <dt>{labels.departure}</dt>
                    <dd>{reservation.check_out}</dd>
                  </div>
                  <div>
                    <dt>{labels.nights}</dt>
                    <dd>{reservation.booking_terms.night_count}</dd>
                  </div>
                  <div>
                    <dt>{copy.subtotal}</dt>
                    <dd>{format(reservation.booking_terms.accommodation_base_subtotal_minor)}</dd>
                  </div>
                </dl>
                {reservation.status === 'confirmed' &&
                  (cancelling ? (
                    <div className="actions">
                      <p>{labels.cancelTitle}</p>
                      <button
                        className="soft-button"
                        disabled={busy}
                        onClick={() => setCancelling(false)}
                      >
                        {labels.keep}
                      </button>
                      <button
                        className="booking-danger"
                        disabled={busy}
                        onClick={() =>
                          mutate({
                            operatorId: session.user.id,
                            request: cancellationRequest(reservation.id),
                          })
                        }
                      >
                        {labels.confirmCancel}
                      </button>
                    </div>
                  ) : (
                    <button className="soft-button" disabled={busy} onClick={() => setCancelling(true)}>
                      {labels.cancel}
                    </button>
                  ))}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
