import type { Language } from './messages'

export const themes = ['system', 'light', 'dark'] as const
export type Theme = (typeof themes)[number]

const languages = ['en', 'th'] as const

function readPreference<T extends string>(key: string, options: readonly T[]): T | undefined {
  try {
    const saved = localStorage.getItem(key)
    return options.find((option) => option === saved)
  } catch {
    return undefined
  }
}

function savePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Preferences still apply during this visit if storage is unavailable.
  }
}

export const languagePreference = {
  get(): Language {
    const browserLanguage = navigator.language.split('-')[0].toLowerCase()
    return (
      readPreference('hospitality.language', languages) ??
      languages.find((language) => language === browserLanguage) ??
      'en'
    )
  },
  set(language: Language) {
    savePreference('hospitality.language', language)
  },
}

export const themePreference = {
  get(): Theme {
    return readPreference('hospitality.theme', themes) ?? 'system'
  },
  set(theme: Theme) {
    savePreference('hospitality.theme', theme)
  },
}
