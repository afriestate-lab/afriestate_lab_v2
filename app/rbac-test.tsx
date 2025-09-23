import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from './_layout'
import { getCurrentUserRole, UserRole, hasRoleAccess, redirectToRoleDashboard } from '@/lib/roleGuard'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'

interface TestResult {
  test: string
  passed: boolean
  message: string
  details?: string
}

export default function RBACTestScreen() {
  const { theme } = useTheme()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runTests()
  }, [])

  const runTests = async () => {
    setLoading(true)
    const results: TestResult[] = []
    
    try {
      // Test 1: Get current user role
      const role = await getCurrentUserRole()
      setUserRole(role)
      results.push({
        test: 'Get Current User Role',
        passed: role !== null,
        message: role ? `Role detected: ${role}` : 'No role detected',
        details: `Expected: Valid role, Got: ${role}`
      })

      // Test 2: Check role-based access to tenant dashboard
      const tenantAccess = hasRoleAccess(role, 'tenant-dashboard')
      results.push({
        test: 'Tenant Dashboard Access',
        passed: tenantAccess === (role === 'tenant'),
        message: tenantAccess ? 'Access granted' : 'Access denied',
        details: `Role: ${role}, Expected: ${role === 'tenant'}, Got: ${tenantAccess}`
      })

      // Test 3: Check role-based access to landlord dashboard
      const landlordAccess = hasRoleAccess(role, 'landlord-dashboard')
      results.push({
        test: 'Landlord Dashboard Access',
        passed: landlordAccess === (role === 'landlord' || role === 'manager'),
        message: landlordAccess ? 'Access granted' : 'Access denied',
        details: `Role: ${role}, Expected: ${role === 'landlord' || role === 'manager'}, Got: ${landlordAccess}`
      })

      // Test 4: Check role-based access to admin dashboard
      const adminAccess = hasRoleAccess(role, 'admin-dashboard')
      results.push({
        test: 'Admin Dashboard Access',
        passed: adminAccess === (role === 'admin'),
        message: adminAccess ? 'Access granted' : 'Access denied',
        details: `Role: ${role}, Expected: ${role === 'admin'}, Got: ${adminAccess}`
      })

      // Test 5: Check authentication status
      const { data: { user } } = await supabase.auth.getUser()
      results.push({
        test: 'Authentication Status',
        passed: !!user,
        message: user ? 'User authenticated' : 'User not authenticated',
        details: `User ID: ${user?.id || 'None'}`
      })

      // Test 6: Check redirect functionality
      const redirectTo = redirectToRoleDashboard(role)
      results.push({
        test: 'Dashboard Redirect',
        passed: !!redirectTo,
        message: `Redirects to: ${redirectTo}`,
        details: `Role: ${role} → Dashboard: ${redirectTo}`
      })

      // Test 7: Test unauthorized access attempts
      const unauthorizedTests = [
        { role: 'tenant' as UserRole, screen: 'admin-dashboard' },
        { role: 'landlord' as UserRole, screen: 'tenant-dashboard' },
        { role: 'manager' as UserRole, screen: 'admin-dashboard' },
        { role: 'guest' as UserRole, screen: 'tenant-dashboard' }
      ]

      unauthorizedTests.forEach(({ role: testRole, screen }) => {
        const access = hasRoleAccess(testRole, screen)
        results.push({
          test: `Unauthorized Access Test (${testRole} → ${screen})`,
          passed: !access,
          message: access ? 'Access incorrectly granted' : 'Access correctly denied',
          details: `Role: ${testRole}, Screen: ${screen}, Access: ${access}`
        })
      })

    } catch (error) {
      results.push({
        test: 'Test Execution',
        passed: false,
        message: 'Error running tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    setTestResults(results)
    setLoading(false)
  }

  const getTestIcon = (passed: boolean) => {
    return passed ? 'checkmark-circle' : 'close-circle'
  }

  const getTestColor = (passed: boolean) => {
    return passed ? '#10b981' : '#ef4444'
  }

  const navigateToDashboard = () => {
    if (userRole) {
      const dashboardRoute = redirectToRoleDashboard(userRole)
      router.replace(dashboardRoute as never)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      router.replace('/' as never)
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out')
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Running RBAC Tests...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const passedTests = testResults.filter(test => test.passed).length
  const totalTests = testResults.length

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>RBAC Test Results</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Current Role: {userRole || 'Unknown'}
        </Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>
          Tests Passed: {passedTests}/{totalTests}
        </Text>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={[styles.testItem, { backgroundColor: theme.surface }]}>
            <View style={styles.testHeader}>
              <Ionicons 
                name={getTestIcon(result.passed)} 
                size={20} 
                color={getTestColor(result.passed)} 
              />
              <Text style={[styles.testName, { color: theme.text }]}>
                {result.test}
              </Text>
            </View>
            <Text style={[styles.testMessage, { color: theme.textSecondary }]}>
              {result.message}
            </Text>
            {result.details && (
              <Text style={[styles.testDetails, { color: theme.textTertiary }]}>
                {result.details}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={runTests}
        >
          <Text style={styles.buttonText}>Run Tests Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={navigateToDashboard}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>Go to Dashboard</Text>
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
  testMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  testDetails: {
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
