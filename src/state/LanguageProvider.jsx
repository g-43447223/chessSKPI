import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getStoredLanguage,
  localeFor,
  normalizeLanguage,
  persistLanguage,
  setRuntimeLanguage,
  translate,
} from '../lib/i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getStoredLanguage())

  const setLanguage = useCallback((next) => {
    const normalized = normalizeLanguage(next)
    setRuntimeLanguage(normalized)
    persistLanguage(normalized)
    setLanguageState(normalized)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => {
      const next = current === 'ms' ? 'en' : 'ms'
      setRuntimeLanguage(next)
      persistLanguage(next)
      return next
    })
  }, [])

  useEffect(() => {
    setRuntimeLanguage(language)
    persistLanguage(language)
    document.documentElement.lang = language === 'ms' ? 'ms' : 'en'
  }, [language])

  const t = useCallback((key, vars) => translate(language, key, vars), [language])

  const value = useMemo(
    () => ({
      language,
      locale: localeFor(language),
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return context
}
