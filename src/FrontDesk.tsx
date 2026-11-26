import type { Property } from './demo'
import { messages, type Language } from './messages'

const statusLegend = ['clean', 'occupied', 'dirty', 'outOfOrder', 'arriving', 'departing'] as const

export function FrontDesk({ language, property }: { language: Language; property: Property }) {
  const copy = messages[language]
  const count = new Intl.NumberFormat(language)
  const sampleArrivals = Array.from(
    { length: property.arrivals },
    (_, index) =>
      ({
        reference: `DEMO-${property.id.toUpperCase()}-${1042 + index}`,
        roomType: index % 2 === 0 ? 'standardKing' : 'deluxeTwin',
      }) as const,
  )

  return (
    <>
      <section aria-labelledby="today">
        <h2 id="today">{copy.today}</h2>
        <dl className="summary">
          <div>
            <dt>{copy.arrivals}</dt>
            <dd>{count.format(sampleArrivals.length)}</dd>
          </div>
          <div>
            <dt>{copy.departures}</dt>
            <dd>{count.format(property.departures)}</dd>
          </div>
        </dl>
      </section>
      <section className="arrivals" aria-labelledby="arrivals">
        <h2 id="arrivals">{copy.arrivals}</h2>
        <table aria-labelledby="arrivals">
          <thead>
            <tr>
              <th scope="col">{copy.reservation}</th>
              <th scope="col">{copy.roomType}</th>
            </tr>
          </thead>
          <tbody>
            {sampleArrivals.map(({ reference, roomType }) => (
              <tr key={reference}>
                <th scope="row">{reference}</th>
                <td>{copy[roomType]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="status-legend" aria-labelledby="status-legend">
        <h2 id="status-legend">{copy.statusLegend}</h2>
        <ul className="status-list" role="list">
          {statusLegend.map((status) => (
            <li key={status} className="status-badge" data-status={status}>
              {copy[status]}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
