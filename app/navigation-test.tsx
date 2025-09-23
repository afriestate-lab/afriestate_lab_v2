import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from './_layout'
import { getCurrentUserRole, UserRole, hasRoleAccess } from '@/lib/roleGuard'
import { router } from 'expo-router'

interface NavigationTest {
  name: string
  route: string
  expectedAccess: boolean
  description: string
}

export default function NavigationTestScreen() {
  const { theme } = useTheme()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [navigationTests, setNavigationTests] = useState<NavigationTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setupNavigationTests()
  }, [])

  const setupNavigationTests = async () => {
    setLoading(true)
    
    try {
      const role = await getCurrentUserRole()
      setUserRole(role)

      // Define navigation tests based on current user role
      const tests: NavigationTest[] = [
        // Dashboard tests
        {
          name: 'Tenant Dashboard',
          route: 'tenant-dashboard',
          expectedAccess: role === 'tenant',
          description: 'Access to tenant-specific dashboard'
        },
        {
          name: 'Landlord Dashboard',
          route: 'landlord-dashboard',
          expectedAccess: role === 'landlord' || role === 'manager',
          description: 'Access to landlord/manager dashboard'
        },
        {
          name: 'Admin Dashboard',
          route: 'admin-dashboard',
          expectedAccess: role === 'admin',
          description: 'Access to admin dashboard'
        },
        {
          name: 'Admin Panel',
          route: 'admin-panel',
          expectedAccess: role === 'manager' || role === 'admin',
          description: 'Access to admin panel'
        },

        // Property management tests
        {
          name: 'Properties Page',
          route: 'properties-page',
          expectedAccess: role === 'landlord' || role === 'manager' || role === 'admin',
          description: 'Access to properties management'
        },
        {
          name: 'Admin Properties Page',
          route: 'admin-properties-page',
          expectedAccess: role === 'admin',
          description: 'Access to admin properties management'
        },

        // Tenant management tests
        {
          name: 'Tenants Page',
          route: 'tenants-page',
          expectedAccess: role === 'landlord' || role === 'manager' || role === 'admin',
          description: 'Access to tenant management'
        },
        {
          name: 'Admin Tenants Page',
          route: 'admin-tenants-page',
          expectedAccess: role === 'admin',
          description: 'Access to admin tenant management'
        },

        // Payment management tests
        {
          name: 'Payments Page',
          route: 'payments-page',
          expectedAccess: role === 'landlord' || role === 'manager' || role === 'admin',
          description: 'Access to payment management'
        },
        {
          name: 'Admin Payments Page',
          route: 'admin-payments-page',
          expectedAccess: role === 'admin',
          description: 'Access to admin payment management'
        },

        // Manager management tests
        {
          name: 'Managers Page',
          route: 'managers-page',
          expectedAccess: role === 'landlord' || role === 'admin',
          description: 'Access to manager management'
        },
        {
          name: 'Admin Managers Page',
          route: 'admin-managers-page',
          expectedAccess: role === 'admin',
          description: 'Access to admin manager management'
        },

        // Reports tests
        {
          name: 'Reports Page',
          route: 'reports-page',
          expectedAccess: role === 'landlord' || role === 'manager' || role === 'admin',
          description: 'Access to reports'
        },
        {
          name: 'Admin Reports Page',
          route: 'admin-reports-page',
          expectedAccess: role === 'admin',
          description: 'Access to admin reports'
        },

        // Admin-only tests
        {
          name: 'Admin Landlords Page',
          route: 'admin-landlords-page',
          expectedAccess: role === 'admin',
          description: 'Access to admin landlord management'
        },
        {
          name: 'Admin Users Page',
          route: 'admin-users-page',
          expectedAccess: role === 'admin',
          description: 'Access to admin user management'
        },

        // Tenant-specific tests
        {
          name: 'Tenant Bookings',
          route: 'tenant-bookings',
          expectedAccess: role === 'tenant',
          description: 'Access to tenant booking history'
        },
        {
          name: 'Tenant Payments',
          route: 'tenant-payments',
          expectedAccess: role === 'tenant',
          description: 'Access to tenant payment history'
        },
        {
          name: 'Tenant Messages',
          route: 'tenant-messages',
          expectedAccess: role === 'tenant',
          description: 'Access to tenant messages'
        },
        {
          name: 'Tenant Announcements',
          route: 'tenant-announcements',
          expectedAccess: role === 'tenant',
          description: 'Access to tenant announcements'
        },
        {
          name: 'Tenant Extend',
          route: 'tenant-extend',
          expectedAccess: role === 'tenant',
          description: 'Access to tenant lease extension'
        },

        // Public screens (should be accessible to all authenticated users)
        {
          name: 'Profile',
          route: 'profile',
          expectedAccess: role !== 'guest',
          description: 'Access to user profile'
        },
        {
          name: 'Settings',
          route: 'settings',
          expectedAccess: role !== 'guest',
          description: 'Access to user settings'
        },
        {
          name: 'Language Selection',
          route: 'language-selection',
          expectedAccess: role !== 'guest',
          description: 'Access to language selection'
        }
      ]

      setNavigationTests(tests)
    } catch (error) {
      console.error('Error setting up navigation tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const testNavigation = async (test: NavigationTest) => {
    try {
      const hasAccess = hasRoleAccess(userRole!, test.route)
      const passed = hasAccess === test.expectedAccess
      
      Alert.alert(
        `Navigation Test: ${test.name}`,
        `Route: ${test.route}\nExpected Access: ${test.expectedAccess}\nActual Access: ${hasAccess}\nResult: ${passed ? 'PASSED' : 'FAILED'}\n\n${test.description}`,
        [
          { text: 'OK' },
          ...(hasAccess ? [{
            text: 'Navigate',
            onPress: () => {
              // Note: In a real app, you would use the navigation guard here
              console.log(`Would navigate to: ${test.route}`)
            }
          }] : [])
        ]
      )
    } catch (error) {
      Alert.alert('Error', `Failed to test navigation: ${error}`)
    }
  }

  const getTestIcon = (test: NavigationTest) => {
    const hasAccess = hasRoleAccess(userRole!, test.route)
    const passed = hasAccess === test.expectedAccess
    return passed ? 'checkmark-circle' : 'close-circle'
  }

  const getTestColor = (test: NavigationTest) => {
    const hasAccess = hasRoleAccess(userRole!, test.route)
    const passed = hasAccess === test.expectedAccess
    return passed ? '#10b981' : '#ef4444'
  }

  const getAccessText = (test: NavigationTest) => {
    const hasAccess = hasRoleAccess(userRole!, test.route)
    return hasAccess ? 'Access Granted' : 'Access Denied'
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Setting up navigation tests...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const passedTests = navigationTests.filter(test => {
    const hasAccess = hasRoleAccess(userRole!, test.route)
    return hasAccess === test.expectedAccess
  }).length

  const totalTests = navigationTests.length

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Navigation Flow Tests</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Current Role: {userRole || 'Unknown'}
        </Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>
          Tests Passed: {passedTests}/{totalTests}
        </Text>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {navigationTests.map((test, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.testItem, { backgroundColor: theme.surface }]}
            onPress={() => testNavigation(test)}
          >
            <View style={styles.testHeader}>
              <Ionicons 
                name={getTestIcon(test)} 
                size={20} 
                color={getTestColor(test)} 
              />
              <Text style={[styles.testName, { color: theme.text }]}>
                {test.name}
              </Text>
            </View>
            <Text style={[styles.testRoute, { color: theme.textSecondary }]}>
              Route: {test.route}
            </Text>
            <Text style={[styles.testAccess, { color: getTestColor(test) }]}>
              {getAccessText(test)}
            </Text>
            <Text style={[styles.testDescription, { color: theme.textTertiary }]}>
              {test.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={setupNavigationTests}
        >
          <Text style={styles.buttonText}>Refresh Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>Go Back</Text>
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
  testRoute: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testAccess: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  testDescription: {
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
