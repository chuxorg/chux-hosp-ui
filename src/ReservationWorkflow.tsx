import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import type { PropertyId } from './demo'
import { messages, type Language } from './messages'
import { reservationCopy } from './reservation-copy'
import {
  available,
  cancelReservation,
  confirmReservation,
  findReservation,
  quote,
  roomsForNight,
  roomTypes,
  sampleDates,
  stayNights,
  type Ledger,
  type Stay,
} from './reservation-demo'

type Step = 'new' | 'review' | 'lookup' | 'details' | 'cancel'
type Problem = 'selectDates' | 'soldOut' | 'conflict' | 'missing'
type Notice = 'confirmedMessage' | 'cancelledMessage'

export function ReservationWorkflow({
  language,
  property,
  ledger,
  update,
}: {
  language: Language
  property: PropertyId
  ledger: Ledger
  update: (ledger: Ledger) => void
}) {
  const copy = reservationCopy[language]
  const common = messages[language]
  const [step, setStep] = useState<Step>('new')
  const [stay, setStay] = useState<Stay>({
    arrival: sampleDates[0],
    departure: sampleDates[1],
    room: 'standardKing',
  })
  const [reference, setReference] = useState('')
  const [opened, setOpened] = useState('')
  const [problem, setProblem] = useState<Problem>()
  const [notice, setNotice] = useState<Notice>()
  const [simulated, setSimulated] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(step)

  useLayoutEffect(() => {
    if (step !== previousStep.current) title.current?.focus()
    previousStep.current = step
  }, [step])

  const active = findReservation(ledger, property, opened)
  const price = new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'THB',
    currencyDisplay: 'code',
  })
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' })
  const count = new Intl.NumberFormat(language)
  const reviewed = quote(property, stay)
  const nights = stayNights(stay)
  const lastRoom = nights.find((night) => roomsForNight(ledger, property, stay.room, night) === 1)
  const alternative = roomTypes.find(
    (room) => room !== stay.room && available(ledger, property, { ...stay, room }),
  )
  const displayStay = step === 'review' ? reviewed : active
  const isLookup = step === 'lookup' || step === 'details' || step === 'cancel'

  function go(next: Step) {
    setProblem(undefined)
    setNotice(undefined)
    setStep(next)
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nights.length) {
      setProblem('selectDates')
      return
    }
    if (!available(ledger, property, stay)) {
      setProblem('soldOut')
      return
    }
    setSimulated(false)
    go('review')
  }

  function confirm() {
    const result = confirmReservation(ledger, property, reviewed)
    if (!result) {
      go('new')
      setProblem('conflict')
      return
    }
    setOpened(result.reservation.reference)
    update(result.ledger)
    go('details')
    setNotice('confirmedMessage')
  }

  function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = findReservation(ledger, property, reference)
    if (!found) {
      setProblem('missing')
      return
    }
    setOpened(found.reference)
    go('details')
  }

  function cancel() {
    update(cancelReservation(ledger, property, opened))
    go('details')
    setNotice('cancelledMessage')
  }

  const headings = {
    new: copy.newReservation,
    review: copy.review,
    lookup: copy.findReservation,
    details: copy.details,
    cancel: copy.cancelTitle,
  }

  return (
    <section className="app-panel booking-panel" aria-labelledby="booking-heading">
      <div className="booking-header">
        <h2 id="booking-heading" tabIndex={-1} ref={title}>
          {headings[step]}
        </h2>
        <div className="actions">
          {isLookup ? (
            <>
              <button className="soft-button" onClick={() => go('new')}>
                {copy.newReservation}
              </button>
              {step === 'details' && (
                <button className="soft-button" onClick={() => go('lookup')}>
                  {copy.findReservation}
                </button>
              )}
            </>
          ) : (
            <button className="soft-button" onClick={() => go('lookup')}>
              <Search size={17} aria-hidden="true" />
              {copy.findReservation}
            </button>
          )}
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
      {step === 'new' && (
        <>
          <p>{copy.dates}</p>
          <form className="booking-form" onSubmit={review} noValidate>
            <label>
              {copy.arrival}
              <input
                type="date"
                value={stay.arrival}
                min={sampleDates[0]}
                max={sampleDates.at(-2)}
                onChange={(event) => setStay({ ...stay, arrival: event.currentTarget.value })}
              />
            </label>
            <label>
              {copy.departure}
              <input
                type="date"
                value={stay.departure}
                min={sampleDates[1]}
                max={sampleDates.at(-1)}
                onChange={(event) => setStay({ ...stay, departure: event.currentTarget.value })}
              />
            </label>
            <label>
              {common.roomType}
              <select
                value={stay.room}
                onChange={(event) =>
                  setStay({ ...stay, room: event.currentTarget.value as Stay['room'] })
                }
              >
                {roomTypes.map((room) => (
                  <option key={room} value={room}>
                    {common[room]}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              {copy.review}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
          {(problem === 'soldOut' || problem === 'conflict') && alternative && (
            <button
              className="soft-button booking-alternative"
              onClick={() => {
                setStay({ ...stay, room: alternative })
                setProblem(undefined)
              }}
            >
              {copy.anotherRoom} · {common[alternative]}
            </button>
          )}
        </>
      )}
      {step === 'lookup' && (
        <form className="booking-form lookup-form" onSubmit={lookup}>
          <label>
            {copy.reference}
            <input
              value={reference}
              onChange={(event) => setReference(event.currentTarget.value)}
              aria-describedby="lookup-hint"
              required
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button className="primary-button" type="submit">
            <Search size={16} aria-hidden="true" />
            {copy.findReservation}
          </button>
          <p id="lookup-hint">{copy.lookupHint}</p>
        </form>
      )}
      {displayStay && step !== 'new' && step !== 'lookup' && (
        <>
          {active && isLookup && (
            <div className="booking-reference">
              <div>
                <span>{copy.reference}</span>
                <strong>{active.reference}</strong>
              </div>
              <span
                className="status-badge"
                data-status={active.status === 'confirmed' ? 'clean' : 'departing'}
              >
                {copy[active.status]}
              </span>
            </div>
          )}
          <dl className="booking-summary">
            <div>
              <dt>{copy.arrival}</dt>
              <dd>{date.format(new Date(displayStay.arrival))}</dd>
            </div>
            <div>
              <dt>{copy.departure}</dt>
              <dd>{date.format(new Date(displayStay.departure))}</dd>
            </div>
            <div>
              <dt>{common.roomType}</dt>
              <dd>{common[displayStay.room]}</dd>
            </div>
            <div>
              <dt>{copy.nights}</dt>
              <dd>{count.format(stayNights(displayStay).length)}</dd>
            </div>
            <div>
              <dt>{copy.rate}</dt>
              <dd>{price.format(displayStay.nightlyPrice)}</dd>
            </div>
            <div>
              <dt>{copy.total}</dt>
              <dd>{price.format(displayStay.nightlyPrice * stayNights(displayStay).length)}</dd>
            </div>
          </dl>
        </>
      )}
      {step === 'review' && (
        <>
          <div className="actions booking-actions">
            <button className="soft-button" onClick={() => go('new')}>
              <ArrowLeft size={16} aria-hidden="true" />
              {copy.edit}
            </button>
            <button className="primary-button" onClick={confirm}>
              {copy.confirm}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <details className="booking-scenario">
            <summary>{copy.simulationTitle}</summary>
            {simulated ? (
              <p role="status">{copy.simulationReady}</p>
            ) : lastRoom === undefined ? (
              <p>{copy.simulationCopy}</p>
            ) : (
              <button
                className="soft-button"
                onClick={() => {
                  update({
                    ...ledger,
                    sales: [...ledger.sales, { property, room: stay.room, night: lastRoom }],
                  })
                  setSimulated(true)
                }}
              >
                {copy.simulationButton}
              </button>
            )}
          </details>
        </>
      )}
      {step === 'details' && active?.status === 'confirmed' && (
        <button className="soft-button booking-cancel" onClick={() => go('cancel')}>
          {copy.cancel}
        </button>
      )}
      {step === 'cancel' && (
        <>
          <p>{copy.cancelCopy}</p>
          <div className="actions booking-actions">
            <button className="soft-button" onClick={() => go('details')}>
              {copy.keep}
            </button>
            <button className="booking-danger" onClick={cancel}>
              {copy.confirmCancel}
            </button>
          </div>
        </>
      )}
      <p className="panel-note booking-scope">{copy.scopeNote}</p>
    </section>
  )
}
