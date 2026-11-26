import { StrictMode, useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope/wght.css'
import '@fontsource/noto-sans-thai/thai-400.css'
import '@fontsource/noto-sans-thai/thai-600.css'
import '@fontsource/noto-sans-thai/thai-700.css'
import { Platform } from './Platform'
import { LiveReservations } from './LiveReservations'
import { parseLiveSeed } from './reservation-api'
import { brand } from './brand'
import { messages, type Language } from './messages'
import { languagePreference, themePreference, themes, type Theme } from './preferences'
import './colors.css'
import './styles.css'

const live = import.meta.env.VITE_WAYPOST_LIVE_SEED as string | undefined
const seed = live === undefined ? null : parseLiveSeed(live)

function App() {
  const [language, setLanguage] = useState(languagePreference.get)
  const [theme, setTheme] = useState(themePreference.get)
  const copy = messages[language]

  useLayoutEffect(() => {
    document.documentElement.lang = language
    document.title = brand.name
  }, [language])

  useLayoutEffect(() => {
    if (theme !== 'system') {
      document.documentElement.dataset.theme = theme
      return
    }
    const system = matchMedia('(prefers-color-scheme: dark)')
    const applySystemTheme = () => {
      document.documentElement.dataset.theme = system.matches ? 'dark' : 'light'
    }
    applySystemTheme()
    system.addEventListener('change', applySystemTheme)
    return () => system.removeEventListener('change', applySystemTheme)
  }, [theme])

  const preferences = (
    <div className="preferences">
      <label>
        <span className="sr-only">{copy.language}</span>
        <select
          value={language}
          onChange={(event) => {
            const next = event.currentTarget.value as Language
            languagePreference.set(next)
            setLanguage(next)
          }}
        >
          <option value="en" lang="en">
            English
          </option>
          <option value="th" lang="th">
            ไทย
          </option>
        </select>
      </label>
      <label>
        <span className="sr-only">{copy.theme}</span>
        <select
          value={theme}
          onChange={(event) => {
            const next = event.currentTarget.value as Theme
            themePreference.set(next)
            setTheme(next)
          }}
        >
          {themes.map((option) => (
            <option value={option} key={option}>
              {copy[option]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
  return live === undefined ? (
    <Platform language={language} preferences={preferences} />
  ) : (
    <LiveReservations language={language} preferences={preferences} seed={seed} />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
