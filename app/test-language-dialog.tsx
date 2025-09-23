import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from './_layout'
import LanguageSelectionOverlay from './language-selection'

export default function TestLanguageDialogScreen() {
  const { theme } = useTheme()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <LanguageSelectionOverlay 
        onLanguageSelected={(language) => {
          console.log('Language selected in test:', language)
          // Navigate back to home after selection
          setTimeout(() => {
            window.location.href = '/'
          }, 1000)
        }}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>Language Dialog Test</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            This page forces the language selection dialog to appear for testing.
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            The dialog should appear on top of this content.
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            If you don't see the dialog, there might be a language preference already saved.
          </Text>
        </View>
      </LanguageSelectionOverlay>
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
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
})
