import React, { useState, useEffect, createContext, useContext } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, Modal, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
// NavigationContainer is automatically provided by Expo Router
import { PaperProvider } from 'react-native-paper'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { supabase } from '@/lib/supabase'
// Removed unused import
import { router } from 'expo-router'
// Simple theme implementation
import AsyncStorage from '@react-native-async-storage/async-storage'
import TenantActionModal from './tenant-action-modal'
import AddActionModal from './add-action-modal'
import { LanguageProvider, useLanguage } from '@/lib/languageContext'
import IcumbiLogo from './components/IcumbiLogo'

type ThemeMode = 'light' | 'dark'

interface ThemeColors {
  background: string
  surface: string
  surfaceVariant: string
  text: string
  textSecondary: string
  textTertiary: string
  primary: string
  error: string
  border: string
  borderLight: string
  tabBar: string
  tabBarActive: string
  tabBarInactive: string
  card: string
  cardShadow: string
  themeMode: ThemeMode
}

const lightTheme: ThemeColors = {
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  text: '#374151',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  primary: '#667eea',
  error: '#ef4444',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  tabBar: '#18181b',
  tabBarActive: '#667eea',
  tabBarInactive: '#bdbdbd',
  card: '#ffffff',
  cardShadow: '#000000',
  themeMode: 'light',
}

const darkTheme: ThemeColors = {
  background: '#0f0f23',
  surface: '#1a1a2e',
  surfaceVariant: '#16213e',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  primary: '#667eea',
  error: '#ef4444',
  border: '#27272a',
  borderLight: '#3f3f46',
  tabBar: '#18181b',
  tabBarActive: '#667eea',
  tabBarInactive: '#71717a',
  card: '#1a1a2e',
  cardShadow: '#000000',
  themeMode: 'dark',
}

export const ThemeContext = createContext<{
  theme: ThemeColors
  themeMode: ThemeMode
  toggleTheme: () => void
} | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const [theme, setTheme] = useState<ThemeColors>(lightTheme)

  useEffect(() => {
    loadThemePreference()
  }, [])

  useEffect(() => {
    setTheme(themeMode === 'dark' ? darkTheme : lightTheme)
  }, [themeMode])

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_mode')
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeMode(savedTheme)
      }
    } catch (error) {
      console.error('Error loading theme preference:', error)
    }
  }

  const toggleTheme = async () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light'
    setThemeMode(newMode)
    try {
      await AsyncStorage.setItem('theme_mode', newMode)
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

// StatusBar wrapper component that can use theme context
const StatusBarWrapper = () => {
  const { themeMode } = useTheme()
  return <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
}
import IndexScreen from './index'
import SignInScreen from './auth/sign-in'
import SignUpScreen from './auth/sign-up'
import TenantDashboard from './tenant-dashboard'
import LandlordDashboard from './landlord-dashboard'
import RecentActivities from './recent-activities'

const Tab = createBottomTabNavigator()

// Auth Context
const AuthContext = createContext<{ user: any; loading: boolean }>({ user: null, loading: true })

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  return useContext(AuthContext)
}

// Auth Guard Component
function AuthGuard({ children, requireAuth = true }: { children: React.ReactNode; requireAuth?: boolean }) {
  const { user, loading } = useAuth()
  const { theme } = useTheme()

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Text style={[styles.screenText, { color: theme.text }]}>Gukura...</Text>
      </View>
    )
  }

  if (requireAuth && !user) {
    return <SignInScreen onShowSignUp={() => {
      // Navigate to sign-up screen
      router.push('/auth/sign-up');
    }} />
  }

  return <>{children}</>
}

// Dashboard Screen with Role Detection
function DashboardScreen() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()

  useEffect(() => {
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUserRole('guest')
        setLoading(false)
        return
      }

      console.log('🔍 [ROLE_CHECK] Checking role for user:', user.id)
      console.log('🔍 [ROLE_CHECK] User metadata role:', user.user_metadata?.role)
      console.log('🔍 [ROLE_CHECK] User email:', user.email)

      // HARDCODED ADMIN CHECK - Force admin role for admin@icumbi.com
      if (user.email === 'admin@icumbi.com') {
        console.log('🔧 [ROLE_CHECK] Hardcoded admin detected - forcing admin role')
        setUserRole('admin')
        return
      }

      // Check for admin mode flag in AsyncStorage (for hardcoded admin credentials)
      try {
        const adminMode = await AsyncStorage.getItem('admin_mode')
        if (adminMode === 'true') {
          console.log('🔧 [ROLE_CHECK] Admin mode flag detected - forcing admin role')
          setUserRole('admin')
          // Clear the flag after use
          await AsyncStorage.removeItem('admin_mode')
          return
        }
      } catch (storageError) {
        console.log('⚠️ [ROLE_CHECK] Error checking admin mode flag:', storageError)
      }

      // First check the users table for the definitive role
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

      if (error) {
        console.log('❌ [ROLE_CHECK] User not found in users table:', error)
        setUserRole('guest')
      } else {
              console.log('✅ [ROLE_CHECK] User role from database:', userData?.role)
      console.log('✅ [ROLE_CHECK] User name:', userData?.full_name)
      
      // Special case: Force tenant role for known tenant user
      if (user.id === '08fd1661-dc25-44c5-82f1-b28e9dfc1ea8') {
        console.log('🔧 [ROLE_CHECK] Special case: Forcing tenant role for Hakizimana jack')
        setUserRole('tenant')
      } else {
        setUserRole(userData?.role || 'guest')
      }
      }
    } catch (error) {
      console.error('❌ [ROLE_CHECK] Error checking user role:', error)
      setUserRole('guest')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Text style={[styles.screenText, { color: theme.text }]}>Gukura...</Text>
      </View>
    )
  }

  console.log('🎯 [DASHBOARD_ROUTING] User role:', userRole)

  // Show tenant dashboard for tenant users
  if (userRole === 'tenant') {
    console.log('✅ [DASHBOARD_ROUTING] Routing to TenantDashboard')
    return <TenantDashboard />
  }



  // Show admin dashboard for admin users
  if (userRole === 'admin') {
    console.log('✅ [DASHBOARD_ROUTING] Routing to AdminDashboard')
    const AdminDashboard = require('./admin-dashboard').default
    return <AdminDashboard />
  }

  // Show landlord dashboard for landlords and managers
  if (userRole === 'landlord' || userRole === 'manager') {
    console.log('✅ [DASHBOARD_ROUTING] Routing to LandlordDashboard')
    return <LandlordDashboard />
  }

  // Show welcome screen for guests
  console.log('✅ [DASHBOARD_ROUTING] Routing to Welcome Screen (guest)')
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Text style={[styles.screenText, { color: theme.text }]}>Murakaza neza kuri Icumbi!</Text>
      <Text style={[styles.subText, { color: theme.textSecondary }]}>
        Kugira ngo ukomeze, reba inyubako zacu ziri kuri Ahabanza cyangwa ujya kuri Konti wenyine urebe amakuru yawe.
      </Text>
    </View>
  )
}

function AddScreen() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [showModal, setShowModal] = useState(false)
  const [showTenantModal, setShowTenantModal] = useState(false)
  
  const showAddOptions = React.useCallback(() => {
    if (user && (user.user_metadata?.role === 'landlord' || user.user_metadata?.role === 'manager')) {
      setShowModal(true)
    } else if (user && user.user_metadata?.role === 'tenant') {
      // Show tenant-specific modal
      setShowTenantModal(true)
    } else {
      Alert.alert(
        'Hitamo icyo ushaka kongeraho',
        'Ni iki ushaka kongeraho kuri Icumbi?',
        [
          { 
            text: 'Inyubako',
            onPress: () => {
              Alert.alert(
                'Ongeramo Inyubako',
                'Kugira ngo wongeramo inyubako, ugomba kujya kuri website ya Icumbi.com cyangwa ukoreshe dashboard ya landlord.',
                [
                  { text: 'Siba', style: 'cancel' },
                  { 
                    text: 'Jya kuri Dashibodi',
                    onPress: () => {
                      // Navigate to Dashboard tab
                      Alert.alert('Menya', 'Jya kuri Dashibodi kugira ngo ukoreshe amahitamo yo kongeramo inyubako.')
                    }
                  }
                ]
              )
            }
          },
          { 
            text: 'Ubutumwa',
            onPress: () => {
              Alert.alert(
                'Ohereza Ubutumwa',
                'Kugira ngo wohereze ubutumwa, jya kuri Dashboard (Dashibodi) maze uhitamo "Ubutumwa".',
                [
                  { text: 'Siba', style: 'cancel' },
                  { 
                    text: 'Jya kuri Dashibodi',
                    onPress: () => {
                      Alert.alert('Menya', 'Jya kuri Dashibodi maze ukande kuri "Ubutumwa" kugira ngo wohereze ubutumwa.')
                    }
                  }
                ]
              )
            }
          },
          { text: 'Siba', style: 'cancel' }
        ]
      )
    }
  }, [user])

  // Remove the automatic call - only call when button is pressed
  // useEffect(() => {
  //   if (user) {
  //     showAddOptions()
  //   }
  // }, [user, showAddOptions])
  
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={showAddOptions} style={styles.iconContainer}>
        <Ionicons name="add-circle" size={80} color={theme.primary} />
      </TouchableOpacity>
      <Text style={[styles.screenText, { color: theme.text }]}>Ongeraho</Text>
      {user && user.user_metadata?.role === 'tenant' ? (
        <Text style={[styles.subText, { color: theme.textSecondary }]}>
          Kanda kuri &ldquo;+&rdquo; kugira ngo ukongere igihe cyangwa ubone menu yose iboneka kuri inyubako ukoze.
        </Text>
      ) : (
        <Text style={[styles.subText, { color: theme.textSecondary }]}>
          Kanda kuri &ldquo;+&rdquo; kugira ngo wongeraho inyubako, ubutumwa, cyangwa indi makuru.
        </Text>
      )}
      {user && (
        <TouchableOpacity 
          onPress={showAddOptions}
          style={{
            backgroundColor: theme.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 20
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
            Hitamo icyo ushaka kongeraho
          </Text>
        </TouchableOpacity>
      )}
      {!user && (
        <TouchableOpacity 
          onPress={() => router.push('/auth/sign-in')}
          style={{
            backgroundColor: theme.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 20
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
            Injira mbere
          </Text>
        </TouchableOpacity>
      )}
      
      <AddActionModal 
        visible={showModal}
        onClose={() => setShowModal(false)}
        userRole={user?.user_metadata?.role || 'guest'}
      />
      
      <TenantActionModal
        visible={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        userRole={user?.user_metadata?.role || 'guest'}
      />
    </View>
  )
}

function MessagesScreen() {
  const { user } = useAuth()
  
  return (
    <AuthGuard requireAuth={true}>
      <RecentActivities />
    </AuthGuard>
  )
}

function ProfileScreen() {
  const { user } = useAuth()
  const { theme, themeMode, toggleTheme } = useTheme()
  const { t, currentLanguage, changeLanguage } = useLanguage()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const loadUserProfile = React.useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Get user profile from users table
              const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
      } else {
        setUserProfile(userData)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadUserProfile()
  }, [user, loadUserProfile])

  const handleSignOut = async () => {
    Alert.alert(
      t('signOut'),
      t('logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('signOut'), 
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
            router.replace('/')
          }
        }
      ]
    )
  }

  const toggleDarkMode = () => {
    toggleTheme()
  }

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'rw' ? 'en' : 'rw'
    changeLanguage(newLanguage)
    Alert.alert(
      t('languageChanged'),
      `${t('languageChangedTo')} ${newLanguage === 'rw' ? t('languageKinyarwanda') : t('languageEnglish')}`
    )
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'tenant': return t('roleTenant')
      case 'landlord': return t('roleLandlord')
      case 'manager': return t('roleManager')
      case 'admin': return t('roleAdmin')
      default: return t('roleMember')
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Text style={[styles.screenText, { color: theme.text }]}>{t('loading')}</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={[styles.profileCard, { backgroundColor: theme.card, shadowColor: theme.cardShadow }]}>
          <Ionicons name="person-circle" size={120} color={theme.primary} style={styles.profileIcon} />
          <Text style={[styles.profileTitle, { color: theme.text }]}>{t('myAccount')}</Text>
          <Text style={[styles.profileSubtitle, { color: theme.textSecondary }]}>Injira kugira ngo urebye amakuru yawe</Text>
          <TouchableOpacity 
            onPress={() => router.push('/auth/sign-in')}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.primaryButtonText}>{t('signIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.profileContainer, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.profileHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.profileImageContainer}>
          <Ionicons name="person-circle" size={80} color={theme.primary} />
        </View>
        <Text style={[styles.profileName, { color: theme.text }]}>
          {userProfile?.full_name || userProfile?.phone_number || t('myAccount')}
        </Text>
        <Text style={[styles.profilePhone, { color: theme.textSecondary }]}>{userProfile?.phone_number || t('notSet')}</Text>
      </View>

      {/* Basic Information Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('personalInfo')}</Text>
        
        <View style={[styles.infoCard, { backgroundColor: theme.card, shadowColor: theme.cardShadow }]}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color={theme.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('fullName')}</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {userProfile?.full_name || t('notSet')}
              </Text>
            </View>
          </View>



          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color={theme.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('phone')}</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {userProfile?.phone_number || t('notSet')}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield" size={20} color={theme.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('role')}</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {getRoleText(userProfile?.role || 'guest')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings')}</Text>
        
        <View style={[styles.settingsCard, { backgroundColor: theme.card, shadowColor: theme.cardShadow }]}>
          <TouchableOpacity style={styles.settingRow} onPress={toggleLanguage}>
            <View style={styles.settingLeft}>
              <Ionicons name="language" size={20} color={theme.textSecondary} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>{t('language')}</Text>
                <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                  {currentLanguage === 'rw' ? t('languageKinyarwanda') : t('languageEnglish')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={20} color={theme.textSecondary} />
                          <View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('darkMode')}</Text>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                {themeMode === 'dark' ? t('statusActive') : t('statusInactive')}
              </Text>
            </View>
            </View>
            <TouchableOpacity onPress={toggleDarkMode}>
              <View style={[
                styles.toggleContainer, 
                { backgroundColor: themeMode === 'dark' ? theme.primary : theme.borderLight }
              ]}>
                <View style={[
                  styles.toggleThumb, 
                  { 
                    backgroundColor: theme.surface,
                    transform: themeMode === 'dark' ? [{ translateX: 20 }] : [{ translateX: 0 }]
                  }
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Subscription Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('subscription')}</Text>
        
        <View style={[styles.subscriptionCard, { backgroundColor: theme.card, shadowColor: theme.cardShadow }]}>
          <View style={styles.subscriptionHeader}>
            <Ionicons name="card" size={24} color={theme.primary} />
            <Text style={[styles.subscriptionTitle, { color: theme.text }]}>Ubukode bwawe</Text>
          </View>

          <View style={styles.subscriptionInfo}>
            <View style={styles.subscriptionRow}>
              <Text style={[styles.subscriptionLabel, { color: theme.textSecondary }]}>Amafaranga wishyuye</Text>
              <Text style={[styles.subscriptionValue, { color: theme.text }]}>{t('freeTier')}</Text>
            </View>

            <View style={styles.subscriptionRow}>
              <Text style={[styles.subscriptionLabel, { color: theme.textSecondary }]}>Uburyo bw&apos;kwishyura</Text>
              <Text style={[styles.subscriptionValue, { color: theme.text }]}>{t('notSet')}</Text>
            </View>

            <View style={styles.subscriptionRow}>
              <Text style={[styles.subscriptionLabel, { color: theme.textSecondary }]}>Igihe gikurikiyeho cyo kwishyura</Text>
              <Text style={[styles.subscriptionValue, { color: theme.text }]}>{t('nothingRequired')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.card, shadowColor: theme.cardShadow, borderColor: theme.error }]} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>{t('signOut')}</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <IcumbiLogo width={24} height={24} />
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>Icumbi © 2025</Text>
        </View>
        <Text style={[styles.footerVersion, { color: theme.textTertiary }]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  )
}

// Home screen without auth guard (accessible to everyone)
function HomeScreen() {
  const { theme } = useTheme()
  return (
    <AuthGuard requireAuth={false}>
      <IndexScreen />
    </AuthGuard>
  )
}

function CustomTabBar({ state, descriptors, navigation, onShowSignIn }: BottomTabBarProps & { onShowSignIn: () => void }) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { t } = useLanguage()
  
  return (
    <View style={[styles.tabBar, { backgroundColor: theme.tabBar }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name
        const isFocused = state.index === index
        let iconName: any = ''
        let iconColor = isFocused ? '#fff' : theme.tabBarInactive
        let iconBg = isFocused ? theme.tabBarActive : 'transparent'
        let iconSize = 28
        if (route.name === 'Home') iconName = 'home'
        if (route.name === 'Dashboard') iconName = 'people'
        if (route.name === 'Add') iconName = 'add'
        if (route.name === 'Messages') iconName = 'chatbubble-ellipses'
        if (route.name === 'Profile') iconName = 'person'
        
        const handlePress = () => {
          if (route.name === 'Home') {
            navigation.navigate(route.name)
            return
          }
          if (!user) {
            onShowSignIn()
            return
          }
          navigation.navigate(route.name)
        }
        
        // Special style for Add
        if (route.name === 'Add') {
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={handlePress}
              style={styles.addButtonWrap}
              activeOpacity={0.8}
            >
              <View style={styles.addButtonShadow}>
                <View style={styles.addButton}>
                  <Ionicons name={iconName} size={36} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          )
        }
        let labelText = ''
        if (typeof label === 'function') {
          // Call with default props to get string (fallback)
          const rendered = label({ focused: isFocused, color: iconColor, position: 'below-icon', children: '' })
          labelText = typeof rendered === 'string' ? rendered : ''
        } else {
          labelText = label as string
        }
        
        // Translate tab labels
        const getTranslatedLabel = (routeName: string) => {
          switch (routeName) {
            case 'Home': return t('home')
            case 'Dashboard': return t('dashboard')
            case 'Messages': return t('messages')
            case 'Profile': return t('profile')
            default: return labelText
          }
        }
        
        labelText = getTranslatedLabel(route.name)
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={handlePress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}> 
              <Ionicons name={iconName} size={iconSize} color={iconColor} />
            </View>
            <Text style={[styles.tabLabel, isFocused && { color: '#fff' }, { color: isFocused ? '#fff' : theme.tabBarInactive }]}>{labelText}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function RootLayout() {
  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  

  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <Tab.Navigator
                initialRouteName="Home"
                tabBar={props => <CustomTabBar {...props} onShowSignIn={() => setShowSignIn(true)} />}
                screenOptions={{ headerShown: false }}
              >
                <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Ahabanza' }} />
                <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashibodi' }} />
                <Tab.Screen name="Add" component={AddScreen} options={{ tabBarLabel: '' }} />
                <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarLabel: 'Ubutumwa' }} />
                <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Konti' }} />
              </Tab.Navigator>
              <Modal visible={showSignIn} animationType="slide" onRequestClose={() => setShowSignIn(false)}>
                <SignInScreen 
                  onSuccess={() => setShowSignIn(false)} 
                  onClose={() => setShowSignIn(false)}
                  onShowSignUp={() => {
                    setShowSignIn(false);
                    setShowSignUp(true);
                  }}
                />
              </Modal>
              <Modal visible={showSignUp} animationType="slide" onRequestClose={() => setShowSignUp(false)}>
                <SignUpScreen 
                  onSuccess={() => setShowSignUp(false)} 
                  onClose={() => setShowSignUp(false)}
                  onShowSignIn={() => {
                    setShowSignUp(false);
                    setShowSignIn(true);
                  }}
                />
              </Modal>
            </AuthProvider>
            <StatusBarWrapper />
          </ThemeProvider>
        </LanguageProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    height: Platform.OS === 'ios' ? 80 : 64,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 12,
    color: '#bdbdbd',
    marginTop: 2,
    fontWeight: '600',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  addButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -24,
  },
  addButtonShadow: {
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 32,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#18181b',
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  screenText: {
    fontSize: 24,
    color: '#667eea',
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  profileContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  toggleContainer: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#667eea',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  subscriptionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginLeft: 8,
  },
  subscriptionInfo: {
    gap: 12,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  subscriptionValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  footerVersion: {
    fontSize: 12,
    color: '#d1d5db',
  },
  // Existing styles for logged out state
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileIcon: {
    marginBottom: 16,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  profileSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}) 