import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from './_layout'

export default function ResetLanguageScreen() {
  const { theme } = useTheme()
  const [currentLanguage, setCurrentLanguage] = React.useState<string>('Unknown')

  React.useEffect(() => {
    const checkCurrentLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('userLanguage')
        setCurrentLanguage(savedLanguage || 'None')
        console.log('🔍 [RESET_LANGUAGE] Current saved language:', savedLanguage)
      } catch (error) {
        setCurrentLanguage('Error')
        console.error('❌ [RESET_LANGUAGE] Error checking language:', error)
      }
    }
    checkCurrentLanguage()
  }, [])

  const resetLanguagePreference = async () => {
    try {
      await AsyncStorage.removeItem('userLanguage')
      setCurrentLanguage('None')
      Alert.alert('Success', 'Language preference has been reset. Please restart the app to see the language selection dialog.')
    } catch (error) {
      Alert.alert('Error', 'Failed to reset language preference')
    }
  }

  const setEnglishDefault = async () => {
    try {
      await AsyncStorage.setItem('userLanguage', 'en')
      setCurrentLanguage('en')
      Alert.alert('Success', 'Language set to English. Please restart the app.')
    } catch (error) {
      Alert.alert('Error', 'Failed to set language preference')
    }
  }

  const setKinyarwandaDefault = async () => {
    try {
      await AsyncStorage.setItem('userLanguage', 'rw')
      setCurrentLanguage('rw')
      Alert.alert('Success', 'Language set to Kinyarwanda. Please restart the app.')
    } catch (error) {
      Alert.alert('Error', 'Failed to set language preference')
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Language Settings</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Use these options to test language selection
        </Text>
        <Text style={[styles.currentLanguage, { color: theme.textSecondary }]}>
          Current Language: {currentLanguage}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={resetLanguagePreference}
          >
            <Text style={styles.buttonText}>Reset Language Preference</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={setEnglishDefault}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Set English Default</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={setKinyarwandaDefault}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Set Kinyarwanda Default</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#f59e0b' }]}
            onPress={() => {
              Alert.alert('Debug Info', `Current Language: ${currentLanguage}\n\nTo test language dialog:\n1. Click "Reset Language Preference"\n2. Refresh the page\n3. Dialog should appear`)
            }}
          >
            <Text style={styles.buttonText}>Debug Language Dialog</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#10b981' }]}
            onPress={() => {
              // Navigate to test page
              window.location.href = '/test-language-dialog'
            }}
          >
            <Text style={styles.buttonText}>Test Language Dialog Page</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  currentLanguage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
