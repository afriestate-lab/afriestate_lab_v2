import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet, Modal, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLanguage } from '@/lib/languageContext'
import { useTheme } from '../_layout'

interface LanguageOption {
  code: 'rw' | 'en'
  name: string
  flag: string
  nativeName: string
}

const languages: LanguageOption[] = [
  {
    code: 'rw',
    name: 'Kinyarwanda',
    flag: '🇷🇼',
    nativeName: 'Ikinyarwanda'
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    nativeName: 'English'
  }
]

interface LanguageSelectorProps {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
}

export default function LanguageSelector({ size = 'medium', showText = false }: LanguageSelectorProps) {
  const { currentLanguage, changeLanguage } = useLanguage()
  const { theme } = useTheme()
  const [isModalVisible, setIsModalVisible] = React.useState(false)

  const currentLanguageData = languages.find(lang => lang.code === currentLanguage) || languages[0]

  const handleLanguageChange = (languageCode: 'rw' | 'en') => {
    if (languageCode !== currentLanguage) {
      changeLanguage(languageCode)
      Alert.alert(
        'Language Changed',
        `Language changed to ${languageCode === 'rw' ? 'Kinyarwanda' : 'English'}`,
        [{ text: 'OK' }]
      )
    }
    setIsModalVisible(false)
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: 16, padding: 6 }
      case 'large':
        return { fontSize: 24, padding: 10 }
      default:
        return { fontSize: 20, padding: 8 }
    }
  }

  const sizeStyles = getSizeStyles()

  return (
    <>
      <TouchableOpacity
        style={[
          styles.flagButton,
          {
            backgroundColor: theme.surfaceVariant,
            borderColor: theme.border,
            padding: sizeStyles.padding
          }
        ]}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.flag, { fontSize: sizeStyles.fontSize }]}>
          {currentLanguageData.flag}
        </Text>
        {showText && (
          <Text style={[styles.languageText, { color: theme.textSecondary, fontSize: sizeStyles.fontSize * 0.6 }]}>
            {currentLanguageData.code.toUpperCase()}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setIsModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Language</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    {
                      backgroundColor: currentLanguage === language.code ? theme.primary : theme.surfaceVariant,
                      borderColor: theme.border
                    }
                  ]}
                  onPress={() => handleLanguageChange(language.code)}
                >
                  <Text style={[styles.languageFlag, { fontSize: sizeStyles.fontSize }]}>
                    {language.flag}
                  </Text>
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageName,
                      { color: currentLanguage === language.code ? 'white' : theme.text }
                    ]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[
                      styles.languageSubtext,
                      { color: currentLanguage === language.code ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
                    ]}>
                      {language.name}
                    </Text>
                  </View>
                  {currentLanguage === language.code && (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  flagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 4
  },
  flag: {
    fontSize: 20
  },
  languageText: {
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  languageList: {
    gap: 12
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12
  },
  languageFlag: {
    fontSize: 20
  },
  languageInfo: {
    flex: 1
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600'
  },
  languageSubtext: {
    fontSize: 14,
    marginTop: 2
  }
}) 