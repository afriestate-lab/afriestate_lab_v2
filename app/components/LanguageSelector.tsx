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
    name: 'Ikinyarwanda',
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
  const { currentLanguage, changeLanguage, t } = useLanguage()
  const { theme } = useTheme()
  const [isModalVisible, setIsModalVisible] = React.useState(false)

  const currentLanguageData = languages.find(lang => lang.code === currentLanguage) || languages[0]

  const handleLanguageChange = (languageCode: 'rw' | 'en') => {
    if (languageCode !== currentLanguage) {
      changeLanguage(languageCode)
      Alert.alert(
        t('languageChanged'),
        `${t('languageChangedTo')} ${languageCode === 'rw' ? t('languageKinyarwanda') : t('languageEnglish')}`,
        [{ text: t('confirm') }]
      )
    }
    setIsModalVisible(false)
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: 14, padding: 4 }
      case 'large':
        return { fontSize: 22, padding: 8 }
      default:
        return { fontSize: 18, padding: 6 }
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t('selectLanguage')}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
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
                      borderColor: currentLanguage === language.code ? theme.primary : theme.border
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
                      {language.name}
                    </Text>
                  </View>
                  {currentLanguage === language.code && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark" size={16} color="white" />
                    </View>
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
    borderRadius: 16,
    borderWidth: 1,
    gap: 3
  },
  flag: {
    fontSize: 18
  },
  languageText: {
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  modalContent: {
    width: '75%',
    maxWidth: 280,
    borderRadius: 20,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  closeButton: {
    padding: 4,
    borderRadius: 12
  },
  languageList: {
    gap: 8
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10
  },
  languageFlag: {
    fontSize: 18
  },
  languageInfo: {
    flex: 1
  },
  languageName: {
    fontSize: 15,
    fontWeight: '600'
  },
  languageSubtext: {
    fontSize: 13,
    marginTop: 1
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  }
}) 