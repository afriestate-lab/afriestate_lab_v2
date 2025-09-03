import React, { useState } from 'react'
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Platform
} from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { translations } from '@/lib/translations'

const { width, height } = Dimensions.get('window')

interface LanguageSelectionOverlayProps {
  onLanguageSelected: (language: 'rw' | 'en') => void
  children: React.ReactNode
}

export default function LanguageSelectionOverlay({ onLanguageSelected, children }: LanguageSelectionOverlayProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'rw' | 'en' | null>(null)
  const [showLanguageSelection, setShowLanguageSelection] = useState(true)

  const handleLanguageSelect = (language: 'rw' | 'en') => {
    setSelectedLanguage(language)
  }

  const handleEnterApp = async () => {
    if (!selectedLanguage) return

    try {
      // Save language selection to AsyncStorage
      await AsyncStorage.setItem('userLanguage', selectedLanguage)
      
      // Call the callback to set the language
      onLanguageSelected(selectedLanguage)
      
      // Hide the language selection overlay
      setShowLanguageSelection(false)
    } catch (error) {
      console.error('Error saving language preference:', error)
      onLanguageSelected(selectedLanguage)
      setShowLanguageSelection(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Render the main app content behind */}
      {children}
      
      {/* Language Selection Overlay */}
      {showLanguageSelection && (
        <View style={styles.overlayContainer}>
          <StatusBar style="light" />
          
          {/* Blur the entire screen behind */}
          <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFillObject} />
          
          {/* Main Content Container */}
          <View style={styles.contentContainer}>
            {/* Glassmorphism Card */}
            <BlurView intensity={25} tint="light" style={styles.glassCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                style={styles.cardGradient}
              >
                {/* Header */}
                <Text style={styles.title}>
                  {selectedLanguage === 'rw' ? translations.rw.chooseYourLanguage : 
                   selectedLanguage === 'en' ? translations.en.chooseYourLanguage : 
                   'Choose your\nlanguage'}
                </Text>
                
                {/* Language Options */}
                <View style={styles.languageContainer}>
                  {/* Kinyarwanda Option */}
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      selectedLanguage === 'rw' && styles.languageOptionSelected
                    ]}
                    onPress={() => handleLanguageSelect('rw')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.languageContent}>
                      <Text style={styles.languageFlag}>🇷🇼</Text>
                      <Text style={styles.languageText}>Kinyarwanda</Text>
                    </View>
                    {selectedLanguage === 'rw' && (
                      <View style={styles.selectedIndicator}>
                        <View style={styles.selectedDot} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* English Option */}
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      selectedLanguage === 'en' && styles.languageOptionSelected
                    ]}
                    onPress={() => handleLanguageSelect('en')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.languageContent}>
                      <Text style={styles.languageFlag}>🇺🇸</Text>
                      <Text style={styles.languageText}>English</Text>
                    </View>
                    {selectedLanguage === 'en' && (
                      <View style={styles.selectedIndicator}>
                        <View style={styles.selectedDot} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Enter App Button */}
                <TouchableOpacity
                  style={[
                    styles.enterButton,
                    !selectedLanguage && styles.enterButtonDisabled
                  ]}
                  onPress={handleEnterApp}
                  disabled={!selectedLanguage}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      selectedLanguage
                        ? ['#667eea', '#764ba2']
                        : ['rgba(102, 126, 234, 0.3)', 'rgba(118, 75, 162, 0.3)']
                    }
                    style={styles.enterButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={[
                      styles.enterButtonText,
                      !selectedLanguage && styles.enterButtonTextDisabled
                    ]}>
                      {selectedLanguage === 'rw' ? translations.rw.enterApp : translations.en.enterApp}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  cardGradient: {
    paddingHorizontal: 32,
    paddingVertical: 40,
    minWidth: width * 0.8,
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  languageContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    transform: [{ scale: 1.02 }],
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  languageFlag: {
    fontSize: 28,
  },
  languageText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  enterButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  enterButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  enterButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  enterButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
})
