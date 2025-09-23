import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Language, translations } from './translations'

interface LanguageContextType {
  currentLanguage: Language
  changeLanguage: (language: Language) => void
  t: (key: keyof typeof translations.rw) => string
  isLanguageLoaded: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

interface LanguageProviderProps {
  children: React.ReactNode
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en') // Default to English
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false)

  // Load saved language preference on app start
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('userLanguage')
        console.log('🔍 [LANGUAGE_CONTEXT] Loading language preference:', savedLanguage)
        
        if (savedLanguage === 'rw' || savedLanguage === 'en') {
          setCurrentLanguage(savedLanguage)
          console.log('✅ [LANGUAGE_CONTEXT] Language loaded from storage:', savedLanguage)
        } else {
          console.log('ℹ️ [LANGUAGE_CONTEXT] No saved language found, using default: en')
          setCurrentLanguage('en') // Explicitly set to English
        }
      } catch (error) {
        console.error('❌ [LANGUAGE_CONTEXT] Error loading language preference:', error)
        setCurrentLanguage('en') // Fallback to English on error
      } finally {
        setIsLanguageLoaded(true)
        console.log('🔄 [LANGUAGE_CONTEXT] Language context initialized, currentLanguage:', currentLanguage)
      }
    }
    loadLanguagePreference()
  }, [])

  const changeLanguage = async (language: Language) => {
    try {
      await AsyncStorage.setItem('userLanguage', language)
      setCurrentLanguage(language)
      console.log('✅ Language changed to:', language)
      console.log('🔄 Language context updated, UI should re-render with new language')
    } catch (error) {
      console.error('❌ Error saving language preference:', error)
    }
  }

  const t = (key: keyof typeof translations.rw): string => {
    const translation = translations[currentLanguage][key] || key
    // Debug: Log when translations are being used
    if (key === 'home' || key === 'dashboard') {
      console.log(`🔤 [TRANSLATION] ${key} -> ${translation} (language: ${currentLanguage})`)
    }
    return translation
  }

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    t,
    isLanguageLoaded,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
} 