import { useState } from 'react'
import { messages, type Language } from './messages'
import type { PropertyId } from './demo'
import { ReservationWorkflow } from './ReservationWorkflow'
import { roomsForNight, roomTypes, sampleDates, type Ledger } from './reservation-demo'

export function Availability({
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
  const [week, setWeek] = useState(0)
  const copy = messages[language]
  const dateFormat = new Intl.DateTimeFormat(language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const numbers = new Intl.NumberFormat(language)
  const firstNight = week * 7
  const dates = Array.from({ length: 7 }, (_, index) =>
    dateFormat.format(new Date(sampleDates[firstNight + index])),
  )

  return (
    <div className="availability-layout">
      <ReservationWorkflow {...{ language, property, ledger, update }} />
      <section className="panel" aria-labelledby="calendar">
        <div className="panel-heading">
          <div>
            <h2 id="calendar">{copy.availableRooms}</h2>
            <p aria-live="polite">
              {copy.startDate} <strong>{dates[0]}</strong>
            </p>
          </div>
          <div className="actions">
            <button disabled={week === 0} onClick={() => setWeek(0)}>
              {copy.previousWeek}
            </button>
            <button disabled={week === 1} onClick={() => setWeek(1)}>
              {copy.nextWeek}
            </button>
          </div>
        </div>
        <div className="table-scroll" tabIndex={0} role="region" aria-labelledby="calendar">
          <table className="calendar" aria-labelledby="calendar">
            <thead>
              <tr>
                <th scope="col">
                  <span>{copy.roomType}</span>
                </th>
                {dates.map((date) => (
                  <th scope="col" key={date}>
                    {date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((type) => (
                <tr key={type}>
                  <th scope="row">
                    <span>{copy[type]}</span>
                  </th>
                  {dates.map((date, index) => {
                    const rooms = roomsForNight(ledger, property, type, firstNight + index)
                    return (
                      <td key={date} data-sold-out={rooms === 0 || undefined}>
                        {rooms === 0 ? copy.soldOut : numbers.format(rooms)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note">{copy.firstDemoWeek}</p>
      </section>
    </div>
  )
}
