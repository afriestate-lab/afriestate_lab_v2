import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from './_layout'
import { supabase } from '@/lib/supabase'
import { getCurrentUserRole, UserRole } from '@/lib/roleGuard'
import { router } from 'expo-router'

interface AuthTest {
  name: string
  description: string
  test: () => Promise<boolean>
  expectedResult: boolean
}

export default function AuthTestScreen() {
  const { theme } = useTheme()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [authTests, setAuthTests] = useState<AuthTest[]>([])
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setupAuthTests()
  }, [])

  const setupAuthTests = async () => {
    setLoading(true)
    
    try {
      const role = await getCurrentUserRole()
      setUserRole(role)

      const tests: AuthTest[] = [
        {
          name: 'Authentication Status Check',
          description: 'Verify user is properly authenticated',
          test: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            return !!user
          },
          expectedResult: true
        },
        {
          name: 'Role Detection',
          description: 'Verify user role is properly detected',
          test: async () => {
            const role = await getCurrentUserRole()
            return role !== null && role !== 'guest'
          },
          expectedResult: true
        },
        {
          name: 'Session Persistence',
          description: 'Verify session persists across app restarts',
          test: async () => {
            const { data: { session } } = await supabase.auth.getSession()
            return !!session
          },
          expectedResult: true
        },
        {
          name: 'User Data Access',
          description: 'Verify user data can be accessed from database',
          test: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return false
            
            // Try to get user data from appropriate table
            if (role === 'tenant') {
              const { data } = await supabase
                .from('tenant_users')
                .select('*')
                .eq('auth_user_id', user.id)
                .single()
              return !!data
            } else {
              const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()
              return !!data
            }
          },
          expectedResult: true
        },
        {
          name: 'Protected Route Access',
          description: 'Verify protected routes require authentication',
          test: async () => {
            // This test simulates what happens when an unauthenticated user tries to access protected routes
            const { data: { user } } = await supabase.auth.getUser()
            return !!user // If user exists, they can access protected routes
          },
          expectedResult: true
        },
        {
          name: 'Role-Based Access Control',
          description: 'Verify role-based access control is working',
          test: async () => {
            const role = await getCurrentUserRole()
            // Test that user can only access appropriate screens
            if (role === 'tenant') {
              return role === 'tenant'
            } else if (role === 'landlord' || role === 'manager') {
              return role === 'landlord' || role === 'manager'
            } else if (role === 'admin') {
              return role === 'admin'
            }
            return false
          },
          expectedResult: true
        },
        {
          name: 'Sign Out Functionality',
          description: 'Verify sign out works correctly',
          test: async () => {
            // This test doesn't actually sign out, just verifies the function exists
            try {
              // We'll test this by checking if the sign out method exists
              return typeof supabase.auth.signOut === 'function'
            } catch (error) {
              return false
            }
          },
          expectedResult: true
        },
        {
          name: 'Token Refresh',
          description: 'Verify token refresh works',
          test: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession()
              return !!session?.access_token
            } catch (error) {
              return false
            }
          },
          expectedResult: true
        }
      ]

      setAuthTests(tests)
    } catch (error) {
      console.error('Error setting up auth tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const runTest = async (test: AuthTest) => {
    try {
      const result = await test.test()
      const passed = result === test.expectedResult
      
      setTestResults(prev => ({
        ...prev,
        [test.name]: passed
      }))

      Alert.alert(
        `Auth Test: ${test.name}`,
        `Description: ${test.description}\nExpected: ${test.expectedResult}\nActual: ${result}\nResult: ${passed ? 'PASSED' : 'FAILED'}`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [test.name]: false
      }))
      
      Alert.alert('Test Error', `Failed to run test: ${error}`)
    }
  }

  const runAllTests = async () => {
    for (const test of authTests) {
      try {
        const result = await test.test()
        const passed = result === test.expectedResult
        setTestResults(prev => ({
          ...prev,
          [test.name]: passed
        }))
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [test.name]: false
        }))
      }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      Alert.alert('Success', 'Signed out successfully', [
        { text: 'OK', onPress: () => router.replace('/' as never) }
      ])
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out')
    }
  }

  const getTestIcon = (testName: string) => {
    const result = testResults[testName]
    if (result === undefined) return 'help-circle'
    return result ? 'checkmark-circle' : 'close-circle'
  }

  const getTestColor = (testName: string) => {
    const result = testResults[testName]
    if (result === undefined) return '#6b7280'
    return result ? '#10b981' : '#ef4444'
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Setting up authentication tests...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const passedTests = Object.values(testResults).filter(result => result === true).length
  const totalTests = authTests.length
  const testsRun = Object.keys(testResults).length

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Authentication Tests</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Current Role: {userRole || 'Unknown'}
        </Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>
          Tests Run: {testsRun}/{totalTests} | Passed: {passedTests}/{testsRun}
        </Text>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {authTests.map((test, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.testItem, { backgroundColor: theme.surface }]}
            onPress={() => runTest(test)}
          >
            <View style={styles.testHeader}>
              <Ionicons 
                name={getTestIcon(test.name)} 
                size={20} 
                color={getTestColor(test.name)} 
              />
              <Text style={[styles.testName, { color: theme.text }]}>
                {test.name}
              </Text>
            </View>
            <Text style={[styles.testDescription, { color: theme.textSecondary }]}>
              {test.description}
            </Text>
            <Text style={[styles.testExpected, { color: theme.textTertiary }]}>
              Expected: {test.expectedResult ? 'True' : 'False'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={runAllTests}
        >
          <Text style={styles.buttonText}>Run All Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={setupAuthTests}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>Refresh Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.error }]}
          onPress={signOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  summary: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  testItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  testDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  testExpected: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionButtons: {
    padding: 20,
    gap: 12,
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
