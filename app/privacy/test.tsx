import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'

export default function PrivacyTestScreen() {
  console.log('🔍 Privacy Test Screen Loading...')
  console.log('🔍 Privacy Test Screen Component Rendered')

  return (
    <SafeAreaView style={[styles.container, { zIndex: 9999 }]}>
      <View style={styles.content}>
        <Text style={styles.title}>
          🔍 PRIVACY TEST PAGE
        </Text>
        <Text style={styles.subtitle}>
          If you can see this, routing is working!
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            console.log('🔍 Test back button pressed')
            router.back()
          }}
        >
          <Text style={styles.backButtonText}>
            ← Go Back
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ff0000',
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
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ff0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
}) 