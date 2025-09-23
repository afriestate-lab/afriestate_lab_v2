import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../app/_layout'
import { 
  getCurrentUserRole, 
  hasRoleAccess, 
  redirectToRoleDashboard, 
  UserRole 
} from '../lib/roleGuard'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  screenName: string
  fallbackComponent?: React.ReactNode
}

export default function RoleGuard({ 
  children, 
  allowedRoles, 
  screenName, 
  fallbackComponent 
}: RoleGuardProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const { theme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true)
        const role = await getCurrentUserRole()
        setUserRole(role)
        
        const access = hasRoleAccess(role, screenName)
        setHasAccess(access)
        
        if (!access) {
          console.log(`❌ [ROLE_GUARD] Access denied for ${role} to ${screenName}`)
          const redirectTo = redirectToRoleDashboard(role)
          router.replace(redirectTo as never)
        } else {
          console.log(`✅ [ROLE_GUARD] Access granted for ${role} to ${screenName}`)
        }
      } catch (error) {
        console.error('❌ [ROLE_GUARD] Error checking access:', error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [screenName, router])

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Gukura...
        </Text>
      </View>
    )
  }

  if (!hasAccess) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>
    }
    
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>
          Nta bucukumbuzi bwo gucunga busanganywe.{'\n'}
          Uruhare rwawe ni {userRole}, ntabwo ari {allowedRoles.join(' cyangwa ')}.
        </Text>
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
})
