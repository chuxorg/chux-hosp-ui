import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Building2, CalendarDays } from 'lucide-react'
import { LiveReservations, type PendingReservation } from './LiveReservations'
import { Landing, Sidebar, SignInArrow, SignInHeading, WaypostShell } from './WaypostShell'
import { dashboardCopy } from './dashboard-copy'
import { liveCopy } from './live-copy'
import type { Language } from './messages'
import {
  endSession,
  getSession,
  ReservationApiError,
  type LiveSeed,
  type Session,
} from './reservation-api'

const pms = '#/pms'
const reservations = '#/pms/reservations'
const currentRoute = () => location.hash || pms

export function ConnectedPlatform({
  language,
  preferences,
  seed,
}: {
  language: Language
  preferences: ReactNode
  seed: LiveSeed | null
}) {
  const copy = liveCopy[language]
  const dashboard = dashboardCopy[language]
  const [route, setRoute] = useState(currentRoute)
  const [session, setSession] = useState<Session>()
  const [pending, setPending] = useState<PendingReservation>()
  const [mutating, setMutating] = useState(false)
  const [message, setMessage] = useState<'expired' | 'sessionUnavailable' | 'sessionMissing'>()
  const [checking, setChecking] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const request = useRef(0)
  const checkingSession = useRef(false)
  const endingSession = useRef(false)
  const hadSession = useRef(false)
  const sessionToken = useRef<string | undefined>(undefined)

  const updateSession = useCallback((value?: Session) => {
    sessionToken.current = value?.csrf_token
    setSession(value)
  }, [])

  const expire = useCallback(() => {
    request.current++
    checkingSession.current = false
    setChecking(false)
    hadSession.current = false
    updateSession(undefined)
    setMessage('expired')
  }, [updateSession])

  const checkSession = useCallback(
    async (manual = false) => {
      if (!seed || checkingSession.current || endingSession.current) return
      checkingSession.current = true
      setChecking(true)
      const version = ++request.current
      try {
        const result = await getSession()
        if (version !== request.current) return
        hadSession.current = true
        updateSession(result)
        setMessage(undefined)
      } catch (error) {
        if (version !== request.current) return
        updateSession(undefined)
        if (error instanceof ReservationApiError && error.status === 401) {
          if (hadSession.current) expire()
          else if (manual)
            setMessage((previous) => (previous === 'expired' ? previous : 'sessionMissing'))
        } else {
          setMessage('sessionUnavailable')
        }
      } finally {
        if (version === request.current) {
          checkingSession.current = false
          setChecking(false)
        }
      }
    },
    [expire, seed, updateSession],
  )

  useEffect(() => {
    void checkSession()
    const syncRoute = () => setRoute(currentRoute())
    const resume = () => {
      if (document.visibilityState === 'visible') void checkSession()
    }
    const suspend = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      // Keep a cached document signed out until its session is verified again.
      request.current++
      checkingSession.current = false
      flushSync(() => {
        updateSession(undefined)
        setChecking(false)
      })
    }
    addEventListener('hashchange', syncRoute)
    addEventListener('focus', resume)
    addEventListener('pageshow', resume)
    addEventListener('pagehide', suspend)
    document.addEventListener('visibilitychange', resume)
    return () => {
      request.current++
      checkingSession.current = false
      removeEventListener('hashchange', syncRoute)
      removeEventListener('focus', resume)
      removeEventListener('pageshow', resume)
      removeEventListener('pagehide', suspend)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [checkSession, updateSession])

  const operatorId = session?.user.id
  useEffect(() => {
    document.querySelector<HTMLElement>('[data-view-title]')?.focus()
    window.scrollTo(0, 0)
  }, [operatorId, route])

  async function signOut() {
    if (!session || endingSession.current || pending?.operatorId === session.user.id) return
    endingSession.current = true
    request.current++
    checkingSession.current = false
    setChecking(false)
    setSigningOut(true)
    setMessage(undefined)
    try {
      // A lost logout response can still mean the session was revoked.
      await endSession(session).catch(() => {})
      const result = await getSession()
      updateSession(result)
      setMessage('sessionUnavailable')
    } catch (error) {
      updateSession(undefined)
      if (error instanceof ReservationApiError && error.status === 401) {
        hadSession.current = false
      } else {
        setMessage('sessionUnavailable')
      }
    } finally {
      endingSession.current = false
      setSigningOut(false)
    }
  }

  if (!session || !seed) {
    return (
      <Landing copy={dashboard} preferences={preferences}>
        <section className="sign-in-form">
          <SignInHeading label={copy.environment} title={dashboard.signIn}>
            {copy.signInHelp}
          </SignInHeading>
          {seed ? (
            <>
              <a className="primary-button" href="/auth/v1/login" target="_blank" rel="noopener">
                {copy.signIn}
                <SignInArrow />
              </a>
              <button
                className="soft-button"
                disabled={checking}
                onClick={() => void checkSession(true)}
              >
                {copy.sessionCheck}
              </button>
            </>
          ) : (
            <p role="alert">{copy.unavailable}</p>
          )}
          {message && <p role="alert">{copy[message]}</p>}
        </section>
      </Landing>
    )
  }

  const isReservations = route === reservations
  const showReservations = isReservations || Boolean(pending)
  const name = session.user.display_name
  return (
    <WaypostShell
      context={copy.environment}
      preferences={preferences}
      operator={{
        name,
        initials: name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => Array.from(word)[0])
          .join(''),
      }}
      sidebar={
        <Sidebar
          home={pms}
          label={dashboard.nav}
          signOut={() => void signOut()}
          signOutLabel={copy.endSession}
          signOutDisabled={signingOut || pending?.operatorId === session.user.id}
        >
          <a
            href={pms}
            aria-current={showReservations ? 'location' : route === pms ? 'page' : undefined}
          >
            <Building2 size={19} aria-hidden="true" />
            {dashboard.pms}
          </a>
          <a
            className="app-nav-child"
            href={reservations}
            aria-current={showReservations ? 'page' : undefined}
          >
            <CalendarDays size={18} aria-hidden="true" />
            {copy.reservations}
          </a>
        </Sidebar>
      }
    >
      {message && (
        <p className="booking-feedback booking-error" role="alert">
          {copy[message]}
        </p>
      )}
      {showReservations ? (
        <LiveReservations
          key={session.user.id}
          {...{ language, seed, session, pending, setPending, mutating, setMutating }}
          onExpired={(expiredSession) => {
            if (sessionToken.current === expiredSession.csrf_token) expire()
          }}
        />
      ) : route === pms ? (
        <section className="app-panel module-preview">
          <h1 data-view-title tabIndex={-1}>
            {dashboard.pms}
          </h1>
          <p>{seed.propertyName}</p>
          <a href={reservations} className="card-action">
            {copy.reservations}
            <SignInArrow />
          </a>
        </section>
      ) : (
        <section className="app-panel module-preview">
          <h1 data-view-title tabIndex={-1}>
            {dashboard.unavailableView}
          </h1>
          <a href={pms} className="card-action">
            {dashboard.pms}
          </a>
        </section>
      )}
    </WaypostShell>
  )
}
