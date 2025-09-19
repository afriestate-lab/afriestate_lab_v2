import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Language, translations } from './translations'

interface LanguageContextType {
  currentLanguage: Language
  changeLanguage: (language: Language) => void
  t: (key: keyof typeof translations.rw) => string
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

  // Load saved language preference on app start
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('userLanguage')
        if (savedLanguage === 'rw' || savedLanguage === 'en') {
          setCurrentLanguage(savedLanguage)
        }
      } catch (error) {
        console.error('Error loading language preference:', error)
      }
    }
    loadLanguagePreference()
  }, [])

  const changeLanguage = async (language: Language) => {
    try {
      await AsyncStorage.setItem('userLanguage', language)
      setCurrentLanguage(language)
    } catch (error) {
      console.error('Error saving language preference:', error)
    }
  }

  const t = (key: keyof typeof translations.rw): string => {
    return translations[currentLanguage][key] || key
  }

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    t,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
} 