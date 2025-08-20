import React, { useState, useEffect, useRef } from 'react'
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  RefreshControl, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Animated,
  TextInput,
  FlatList
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../src/lib/supabase'
import { formatCurrency, formatDate } from '../src/lib/helpers'
import { LineChart } from 'react-native-chart-kit'
import { useTheme } from './_layout'
import { useLanguage } from '@/lib/languageContext'
import IcumbiLogo from './components/IcumbiLogo'
import LanguageSelector from './components/LanguageSelector'

const chartConfig = {
  backgroundGradientFrom: '#f8fafc',
  backgroundGradientTo: '#f8fafc',
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // green for revenue
  labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#059669',
  },
  propsForBackgroundLines: {
    stroke: '#e5e7eb',
  },
  propsForLabels: {
    fontSize: 12,
  },
}

// Import mobile pages (need to create admin-specific ones)
import AdminPropertiesPage from './admin-properties-page'
import AdminTenantsPage from './admin-tenants-page'
import AdminPaymentsPage from './admin-payments-page'
import AdminManagersPage from './admin-managers-page'
import AdminReportsPage from './admin-reports-page'
import AdminLandlordsPage from './admin-landlords-page'
import AdminUsersPage from './admin-users-page'

const { width, height } = Dimensions.get('window')

// Types matching landlord implementation but enhanced for admin
type TabType = 'overview' | 'urgent' | 'charts' | 'upcoming'
type ActivityType = 'payment' | 'tenant' | 'property' | 'manager' | 'other' | 'all'

interface AdminDashboardData {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  totalTenants: number
  totalRevenue: number
  previousRevenue: number
  occupancyRate: number
  revenueChangePercent: number
  tenantChangePercent: number
  propertyChangePercent: number
  revenueData: RevenueDataPoint[]
  paymentStatus: PaymentStatusItem[]
  upcomingDueDates: UpcomingDueDate[]
  properties: any[]
  managers: any[]
  landlords: any[]
  tenants: any[]
  urgentPayments: any[]
  recentPayments: any[]
  totalUsers: number
}

interface RevenueDataPoint {
  month: string
  revenue: number
  target: number
}

interface PaymentStatusItem {
  name: string
  value: number
  units: number
}

interface UpcomingDueDate {
  id: string
  tenantName: string
  property: string
  room: string
  dueDate: string
  amount: number
  status: 'urgent' | 'upcoming'
  daysUntilDue: number
  phoneNumber?: string
  email?: string
  landlordName?: string
}

interface DashboardActivity {
  id: string
  type: ActivityType
  title: string
  details: string
  timestamp: Date
  iconName: string
  iconColor: string
}

interface UserProfile {
  id: string
  role: string
  full_name: string
  email: string
}

// Stats Card Component - exactly matching landlord dashboard
const StatsCard = ({ 
  title, 
  value, 
  type, 
  trend, 
  icon, 
  delay = 0,
  onPress
}: {
  title: string
  value: number
  type: 'number' | 'currency'
  trend: {
    value: number
    isPositive: boolean
    label: string
  }
  icon: string
  delay?: number
  onPress?: () => void
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 500,
      delay: delay * 100,
      useNativeDriver: true,
    }).start()
  }, [animatedValue, delay])

  const getIconName = (iconType: string) => {
    switch (iconType) {
      case 'properties': return 'business'
      case 'tenants': return 'people'
      case 'revenue': return 'cash'
      case 'landlords': return 'person'
      case 'users': return 'people-circle'
      default: return 'analytics'
    }
  }

  const getIconColor = (iconType: string) => {
    switch (iconType) {
      case 'properties': return '#3b82f6'
      case 'tenants': return '#8b5cf6'
      case 'revenue': return '#f59e0b'
      case 'landlords': return '#06b6d4'
      case 'users': return '#ef4444'
      default: return '#10b981'
    }
  }

  return (
    <Animated.View 
      style={[
        styles.statsCard, 
        { 
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        }
      ]}
      onTouchEnd={onPress}
    >
      <View style={styles.statsCardHeader}>
        <Ionicons 
          name={getIconName(icon) as any} 
          size={24} 
          color={getIconColor(icon)} 
        />
        <Text style={styles.statsCardTitle}>{title}</Text>
      </View>
      
      <Text style={styles.statsCardValue}>
        {type === 'currency' ? formatCurrency(value) : value.toLocaleString()}
      </Text>
      
      <View style={styles.statsCardTrend}>
        <Ionicons 
          name={trend.isPositive ? 'trending-up' : 'trending-down'} 
          size={16} 
          color={trend.isPositive ? '#10b981' : '#ef4444'} 
        />
        <Text style={[
          styles.trendText,
          { color: trend.isPositive ? '#10b981' : '#ef4444' }
        ]}>
          {trend.value}%
        </Text>
        <Text style={styles.trendLabel}>{trend.label}</Text>
      </View>
    </Animated.View>
  )
}

// Chart Card Component - exactly matching landlord dashboard
const ChartCard = ({ 
  title, 
  subtitle, 
  children, 
  delay = 0 
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  delay?: number
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 600,
      delay: delay * 100,
      useNativeDriver: true,
    }).start()
  }, [animatedValue, delay])

  return (
    <Animated.View 
      style={[
        styles.chartCard, 
        { 
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          }],
        }
      ]}
    >
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        {subtitle && <Text style={styles.chartSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </Animated.View>
  )
}

export default function AdminDashboard() {
  const { theme } = useTheme()
  const { t } = useLanguage()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Dashboard data for admin - enhanced to include all platform data
  const [dashboardData, setDashboardData] = useState<AdminDashboardData>({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    totalTenants: 0,
    totalRevenue: 0,
    previousRevenue: 0,
    occupancyRate: 0,
    revenueChangePercent: 0,
    tenantChangePercent: 0,
    propertyChangePercent: 0,
    revenueData: [],
    paymentStatus: [],
    upcomingDueDates: [],
    properties: [],
    managers: [],
    landlords: [],
    tenants: [],
    urgentPayments: [],
    recentPayments: [],
    totalUsers: 0
  })

  // Activity and filtering states
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [activityFilter, setActivityFilter] = useState<ActivityType>('all')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  
  // Modal states
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Navigation state
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'properties' | 'tenants' | 'payments' | 'managers' | 'reports' | 'landlords' | 'users'>('dashboard')

  // Handle navigation to specific pages
  const navigateToPage = (page: 'dashboard' | 'properties' | 'tenants' | 'payments' | 'managers' | 'reports' | 'landlords' | 'users') => {
    setCurrentPage(page)
    setIsMenuOpen(false)
  }

  const generateAdminRevenueData = React.useCallback(async (): Promise<RevenueDataPoint[]> => {
    try {
      console.log('Generating admin revenue data...')
      const data: RevenueDataPoint[] = []
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        
        // Get all payments for this month across the platform
        const { data: payments, error } = await supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', monthStart.toISOString())
          .lte('payment_date', monthEnd.toISOString())

        if (error) {
          console.error('Error fetching payments for revenue data:', error)
        }

        const revenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
        const target = revenue * 1.1
        
        data.push({
          month: date.toLocaleDateString('rw-RW', { month: 'short' }),
          revenue,
          target
        })
      }

      console.log('Generated revenue data points:', data.length)
      return data
    } catch (error) {
      console.error('Error generating admin revenue data:', error)
      return []
    }
  }, [])

  const getAdminPaymentStatusData = React.useCallback(async (): Promise<PaymentStatusItem[]> => {
    try {
      console.log('Getting admin payment status data...')
      // Get all active room tenants across the platform
      const { data: roomTenants, error } = await supabase
        .from('room_tenants')
        .select('id, next_due_date, is_active')
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching room tenants for payment status:', error)
      }

      const today = new Date()
      let paidCount = 0, pendingCount = 0, overdueCount = 0

      roomTenants?.forEach((rt: any) => {
        if (rt.next_due_date) {
          const dueDate = new Date(rt.next_due_date)
          const daysSinceDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysSinceDue <= -7) {
            paidCount++
          } else if (daysSinceDue <= 5) {
            pendingCount++
          } else {
            overdueCount++
          }
        } else {
          pendingCount++
        }
      })

      const total = paidCount + pendingCount + overdueCount
      
      const result = [
        { 
          name: 'Paid', 
          value: total > 0 ? Math.round((paidCount / total) * 100 * 10) / 10 : 0,
          units: paidCount
        },
        { 
          name: 'Pending', 
          value: total > 0 ? Math.round((pendingCount / total) * 100 * 10) / 10 : 0,
          units: pendingCount
        },
        { 
          name: 'Overdue', 
          value: total > 0 ? Math.round((overdueCount / total) * 100 * 10) / 10 : 0,
          units: overdueCount
        }
      ]
      
      console.log('Payment status data:', { total, paidCount, pendingCount, overdueCount, result })
      return result
    } catch (error) {
      console.error('Error getting admin payment status data:', error)
      return [
        { name: 'Paid', value: 0, units: 0 },
        { name: 'Pending', value: 0, units: 0 },
        { name: 'Overdue', value: 0, units: 0 }
      ]
    }
  }, [])

  const getAdminUpcomingDueDates = React.useCallback(async (): Promise<UpcomingDueDate[]> => {
    try {
      console.log('Getting admin upcoming due dates...')
      // Try using the new admin function first
      const { data: upcomingTenants, error } = await supabase.rpc(
        'get_all_upcoming_due_dates_admin'
      )

      if (error) {
        console.error('Error fetching admin upcoming due dates:', error)
        return []
      }

      console.log('Upcoming tenants data:', upcomingTenants?.length || 0)

      if (upcomingTenants) {
        const today = new Date()
        const result = upcomingTenants.map((item: any) => {
          const dueDate = new Date(item.next_due_date)
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          return {
            id: item.id,
            tenantName: item.tenant_name || 'Umukode utazwi',
            property: item.property_name || 'Inyubako itazwi',
            room: item.room_number || 'Icyumba kitazwi',
            dueDate: item.next_due_date,
            amount: item.rent_amount || 0,
            status: daysUntilDue <= 3 ? 'urgent' : 'upcoming',
            daysUntilDue: daysUntilDue,
            phoneNumber: item.phone_number,
            email: item.email,
            landlordName: item.landlord_name
          } as UpcomingDueDate
        })
        
        console.log('Processed upcoming due dates:', result.length)
        return result
      }
      return []
    } catch (error) {
      console.error('Error getting admin upcoming due dates:', error)
      return []
    }
  }, [])

  const fetchAllProperties = React.useCallback(async () => {
    try {
      console.log('Fetching all properties...')
      const { data: properties, error } = await supabase
        .rpc('get_admin_properties')

      if (error) {
        console.error('Error fetching properties:', error)
        return []
      }

      console.log('Fetched properties:', properties?.length || 0)
      return properties || []
    } catch (error) {
      console.error('Error fetching all properties:', error)
      return []
    }
  }, [])

  const fetchAllLandlords = React.useCallback(async () => {
    try {
      console.log('Fetching all landlords...')
      const { data: landlords, error } = await supabase
        .rpc('get_all_landlords_admin')

      if (error) {
        console.error('Error fetching landlords:', error)
        return []
      }

      console.log('Fetched landlords:', landlords?.length || 0)
      return landlords || []
    } catch (error) {
      console.error('Error fetching all landlords:', error)
      return []
    }
  }, [])

  const fetchAllManagers = React.useCallback(async () => {
    try {
      console.log('Fetching all managers...')
      const { data: managers, error } = await supabase
        .rpc('get_all_managers_admin')

      if (error) {
        console.error('Error fetching managers:', error)
        return []
      }

      console.log('Fetched managers:', managers?.length || 0)
      return managers || []
    } catch (error) {
      console.error('Error fetching all managers:', error)
      return []
    }
  }, [])

  const fetchAllUsers = React.useCallback(async () => {
    try {
      console.log('Fetching all users...')
      const { data: users, error } = await supabase
        .rpc('get_all_users_admin_simple')

      if (error) {
        console.error('Error fetching users:', error)
        return []
      }

      console.log('Fetched users:', users?.length || 0)
      return users || []
    } catch (error) {
      console.error('Error fetching all users:', error)
      return []
    }
  }, [])

  const fetchAllTenants = React.useCallback(async () => {
    try {
      console.log('Fetching all tenants...')
      const { data: tenants, error } = await supabase
        .rpc('get_all_tenants_admin')

      if (error) {
        console.error('Error fetching tenants:', error)
        return []
      }

      console.log('Fetched tenants:', tenants?.length || 0)
      return tenants || []
    } catch (error) {
      console.error('Error fetching all tenants:', error)
      return []
    }
  }, [])

  const fetchUrgentPayments = React.useCallback(async () => {
    try {
      console.log('Fetching urgent payments...')
      const { data: urgentPayments, error } = await supabase
        .rpc('get_urgent_payments_admin')

      if (error) {
        console.error('Error fetching urgent payments:', error)
        return []
      }

      console.log('Fetched urgent payments:', urgentPayments?.length || 0)
      return urgentPayments || []
    } catch (error) {
      console.error('Error fetching urgent payments:', error)
      return []
    }
  }, [])

  const fetchRecentPayments = React.useCallback(async () => {
    try {
      console.log('Fetching recent payments...')
      const { data: recentPayments, error } = await supabase
        .rpc('get_recent_payments_admin', { limit_count: 20 })

      if (error) {
        console.error('Error fetching recent payments:', error)
        return []
      }

      console.log('Fetched recent payments:', recentPayments?.length || 0)
      return recentPayments || []
    } catch (error) {
      console.error('Error fetching recent payments:', error)
      return []
    }
  }, [])

  // Fallback method if SQL function isn't available yet
  const fetchAdminDashboardDataFallback = React.useCallback(async () => {
    try {
      console.log('Using fallback admin data fetch method...')
      
      // Use RPC function to get admin dashboard data safely
      const { data: adminStats, error: adminStatsError } = await supabase
        .rpc('get_admin_dashboard_data')
      
      if (adminStatsError) {
        console.error('Error fetching admin dashboard data:', adminStatsError)
        return {
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          totalTenants: 0,
          totalRevenue: 0,
          previousRevenue: 0,
          occupancyRate: 0,
          revenueChangePercent: 0,
          tenantChangePercent: 0,
          propertyChangePercent: 0,
          revenueData: [],
          paymentStatus: [],
          upcomingDueDates: [],
          properties: [],
          managers: [],
          landlords: [],
          tenants: [],
          urgentPayments: [],
          recentPayments: [],
          totalUsers: 0
        }
      }
      
      const stats = adminStats?.[0] || {}
      
      // Get additional data using RPC functions
      const [
        revenueData,
        paymentStatus,
        upcomingDueDates,
        allLandlords,
        allManagers,
        allUsers
      ] = await Promise.all([
        generateAdminRevenueData(),
        getAdminPaymentStatusData(),
        getAdminUpcomingDueDates(),
        fetchAllLandlords(),
        fetchAllManagers(),
        fetchAllUsers()
      ])
      
      console.log('Admin dashboard data results:', {
        properties: stats.total_properties || 0,
        rooms: stats.total_rooms || 0,
        tenants: stats.total_tenants || 0,
        revenue: stats.total_revenue || 0,
        landlords: allLandlords.length,
        managers: allManagers.length,
        users: allUsers.length
      })
      
      const currentMonthRevenue = stats.monthly_revenue || 0
      const previousMonthRevenue = 0 // Would need separate calculation
      
      const fallbackData = {
        totalProperties: stats.total_properties || 0,
        totalUnits: stats.total_rooms || 0,
        occupiedUnits: stats.occupied_rooms || 0,
        totalTenants: stats.total_tenants || 0,
        totalRevenue: currentMonthRevenue,
        previousRevenue: previousMonthRevenue,
        occupancyRate: stats.total_rooms ? Math.round((stats.occupied_rooms || 0) / stats.total_rooms * 100 * 10) / 10 : 0,
        revenueChangePercent: 0, // Would need historical data
        tenantChangePercent: 0,
        propertyChangePercent: 0,
        revenueData,
        paymentStatus,
        upcomingDueDates,
        properties: [],
        managers: allManagers,
        landlords: allLandlords,
        tenants: [],
        urgentPayments: [],
        recentPayments: [],
        totalUsers: allUsers.length
      }
      
      console.log('Setting fallback dashboard data:', fallbackData)
      setDashboardData(fallbackData)
      
    } catch (error) {
      console.error('Error in fallback admin data fetch:', error)
      Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka amakuru ya dashibodi.')
    }
  }, [generateAdminRevenueData, getAdminPaymentStatusData, getAdminUpcomingDueDates, fetchAllLandlords, fetchAllManagers, fetchAllUsers])

  const fetchAdminDashboardData = React.useCallback(async () => {
    try {
      console.log('Fetching admin dashboard data...')
      
      // First, try to get admin stats
      const { data: adminStats, error: statsError } = await supabase
        .rpc('get_admin_dashboard_stats')
      
      console.log('Admin stats result:', { adminStats, statsError })
      
      if (statsError) {
        console.error('Admin dashboard stats error:', statsError)
        console.log('Falling back to manual data fetch...')
        await fetchAdminDashboardDataFallback()
        return
      }
      
      const stats = adminStats?.[0] || {}
      console.log('Admin stats:', stats)
      
      // Fetch all related data in parallel
      const [
        revenueData, 
        paymentStatus, 
        upcomingDueDates, 
        allProperties,
        allLandlords,
        allManagers,
        allUsers,
        allTenants,
        urgentPayments,
        recentPayments
      ] = await Promise.all([
        generateAdminRevenueData(),
        getAdminPaymentStatusData(),
        getAdminUpcomingDueDates(),
        fetchAllProperties(),
        fetchAllLandlords(),
        fetchAllManagers(),
        fetchAllUsers(),
        fetchAllTenants(),
        fetchUrgentPayments(),
        fetchRecentPayments()
      ])
      
      console.log('Fetched data:', {
        revenueData: revenueData.length,
        paymentStatus: paymentStatus.length,
        upcomingDueDates: upcomingDueDates.length,
        allProperties: allProperties.length,
        allLandlords: allLandlords.length,
        allManagers: allManagers.length,
        allUsers: allUsers.length,
        allTenants: allTenants.length,
        urgentPayments: urgentPayments.length,
        recentPayments: recentPayments.length
      })
      
      const dashboardDataUpdate = {
        totalProperties: Number(stats.total_properties || 0),
        totalUnits: Number(stats.total_rooms || 0),
        occupiedUnits: Number(stats.occupied_rooms || 0),
        totalTenants: Number(stats.total_tenants || 0),
        totalRevenue: Number(stats.current_month_revenue || 0),
        previousRevenue: Number(stats.previous_month_revenue || 0),
        occupancyRate: Math.round(Number(stats.occupancy_rate || 0) * 10) / 10,
        revenueChangePercent: Math.round(Number(stats.revenue_change_percent || 0) * 10) / 10,
        tenantChangePercent: Math.round(Number(stats.tenant_change_percent || 0) * 10) / 10,
        propertyChangePercent: Math.round(Number(stats.property_change_percent || 0) * 10) / 10,
        revenueData,
        paymentStatus,
        upcomingDueDates,
        properties: allProperties,
        managers: allManagers,
        landlords: allLandlords,
        tenants: allTenants,
        urgentPayments: urgentPayments,
        recentPayments: recentPayments,
        totalUsers: allUsers.length
      }
      
      console.log('Setting dashboard data:', dashboardDataUpdate)
      setDashboardData(dashboardDataUpdate)
      
    } catch (error) {
      console.error('Error loading admin dashboard data:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura amakuru ya dashibodi y\'ubuyobozi.')
    }
  }, [generateAdminRevenueData, getAdminPaymentStatusData, getAdminUpcomingDueDates, fetchAllProperties, fetchAllLandlords, fetchAllManagers, fetchAllUsers, fetchAdminDashboardDataFallback])

  const fetchAdminActivities = React.useCallback(async () => {
    try {
      const activities: DashboardActivity[] = []
      
      // Add recent payments from all landlords
      const { data: recentPayments } = await supabase
        .from('payments')
        .select(`
          id, amount, payment_date,
          rooms!inner (
            room_number,
            properties!inner (
              name,
              landlord_id,
              users!inner (
                full_name
              )
            )
          ),
          tenants!inner (
            full_name
          )
        `)
        .order('payment_date', { ascending: false })
        .limit(20)

      recentPayments?.forEach(payment => {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: `Ubwishyu bwakiriwe: ${formatCurrency(payment.amount)}`,
          details: `${(payment.tenants as any).full_name} - ${(payment.rooms as any).properties.name} (Nyir.: ${(payment.rooms as any).properties.users.full_name})`,
          timestamp: new Date(payment.payment_date),
          iconName: 'card',
          iconColor: '#10b981'
        })
      })

      // Add recent tenant activities from all properties
      const { data: recentTenants } = await supabase
        .from('room_tenants')
        .select(`
          id, move_in_date, created_at,
          rooms!inner (
            room_number,
            properties!inner (
              name,
              landlord_id,
              users!inner (
                full_name
              )
            )
          ),
          tenants!inner (
            full_name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10)

      recentTenants?.forEach(tenant => {
        activities.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant',
          title: `Umukode mushya winjiye`,
          details: `${(tenant.tenants as any).full_name} - ${(tenant.rooms as any).properties.name} ${(tenant.rooms as any).room_number} (Nyir.: ${(tenant.rooms as any).properties.users.full_name})`,
          timestamp: new Date(tenant.created_at),
          iconName: 'person-add',
          iconColor: '#8b5cf6'
        })
      })

      // Add recent property activities
      const { data: recentProperties } = await supabase
        .from('properties')
        .select(`
          id, name, created_at,
          users!inner (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      recentProperties?.forEach(property => {
        activities.push({
          id: `property-${property.id}`,
          type: 'property',
          title: `Inyubako nshya yongerewe`,
          details: `${property.name} (Nyir.: ${(property.users as any).full_name})`,
          timestamp: new Date(property.created_at),
          iconName: 'business',
          iconColor: '#3b82f6'
        })
      })

      // Sort activities by timestamp
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      setActivities(activities)
    } catch (error) {
      console.error('Error fetching admin activities:', error)
    }
  }, [])

  const checkUserAndLoadData = React.useCallback(async () => {
    try {
      setLoading(true)
      console.log('Checking user authentication and role...')
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka bucukumbuzi.')
        return
      }
      
      if (!user) {
        console.log('No authenticated user found')
        Alert.alert('Ikosa', 'Nta bucukumbuzi bwemerewe busanganywe. Injira mbere.')
        return
      }

      console.log('User authenticated:', user.id)
      
      const { data: userData, error: userError } = await supabase
        .rpc('get_all_users_admin_simple')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.error('User data error:', userError)
        Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka amakuru yawe.')
        return
      }

      if (!userData) {
        console.log('No user data found')
        Alert.alert('Ikosa', 'Nta bucukumbuzi bwemerewe busanganywe.')
        return
      }

      console.log('User data:', { id: userData.id, role: userData.role, name: userData.full_name })

      if (userData.role !== 'admin') {
        console.log('User is not admin:', userData.role)
        Alert.alert('Ikosa', 'Nta bucukumbuzi bwo gucunga busanganywe.')
        return
      }

      console.log('User is admin, setting profile and loading data...')
      setProfile(userData)
      await fetchAdminDashboardData()
      await fetchAdminActivities()
      
    } catch (error) {
      console.error('Error checking user:', error)
      Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka amakuru yawe.')
    } finally {
      setLoading(false)
    }
  }, [fetchAdminDashboardData, fetchAdminActivities])

  useEffect(() => {
    setMounted(true)
    checkUserAndLoadData()
  }, [checkUserAndLoadData])

  const getFilteredActivities = () => {
    if (activityFilter === 'all') {
      return activities
    }
    return activities.filter(activity => activity.type === activityFilter)
  }

  const onRefresh = async () => {
    if (!profile) return
    setRefreshing(true)
    await fetchAdminDashboardData()
    await fetchAdminActivities()
    setRefreshing(false)
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'urgent':
        return renderUrgentTab()
      case 'charts':
        return renderChartsTab()
      case 'upcoming':
        return renderUpcomingDueDatesTab()
      default:
        return renderOverviewTab()
    }
  }

  const renderUrgentTab = () => {
    // Use the dedicated urgent payments data from the database
    const urgentPayments = dashboardData.urgentPayments || []
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.urgentTitle}>Ibyihutirwa: Ubwishyu bushya</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          {urgentPayments.length === 0 ? (
            <View style={styles.emptyActivities}>
              <Ionicons name="alert-circle" size={48} color="#ea580c" />
              <Text style={styles.emptyTitle}>Nta bwishyu byihutirwa biriho ubu</Text>
            </View>
          ) : urgentPayments.map((payment, index) => (
            <View key={`payment-${payment.id}-${index}`} style={styles.urgentCard}>
              <Text style={styles.urgentLabel}>Umukode:</Text>
              <Text style={styles.urgentValue}>{payment.tenantName}</Text>
              <Text style={styles.urgentLabel}>Icyumba:</Text>
              <Text style={styles.urgentValue}>{payment.room}</Text>
              <Text style={styles.urgentLabel}>Amafaranga:</Text>
              <Text style={styles.urgentValue}>{formatCurrency(payment.amount)}</Text>
              <Text style={styles.urgentLabel}>Itariki yo kwishyura:</Text>
              <Text style={styles.urgentValue}>{formatDate(payment.dueDate)}</Text>
              <Text style={styles.urgentLabel}>Inyubako:</Text>
              <Text style={styles.urgentValue}>{payment.property}</Text>
              <Text style={styles.urgentLabel}>Nyirinyubako:</Text>
              <Text style={styles.urgentValue}>{payment.landlordName}</Text>
              {payment.phoneNumber && <Text style={styles.urgentLabel}>Terefone: <Text style={styles.urgentValue}>{payment.phoneNumber}</Text></Text>}
              {payment.email && <Text style={styles.urgentLabel}>Email: <Text style={styles.urgentValue}>{payment.email}</Text></Text>}
              <Text style={[styles.urgentLabel, {marginTop: 4}]}>Iminsi isigaye: <Text style={styles.urgentValue}>{payment.daysUntilDue}</Text></Text>
              <Text style={[styles.urgentLabel, {marginTop: 4}]}>Status: <Text style={[styles.urgentValue, {color: payment.status === 'urgent' ? '#dc2626' : '#ea580c'}]}>{payment.status}</Text></Text>
            </View>
          ))}
        </View>
      </ScrollView>
    )
  }

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Admin Stats Cards Grid - enhanced with admin-specific metrics */}
      <View style={styles.statsGrid}>
        <StatsCard
          title="Inyubako Zose"
          value={dashboardData.totalProperties}
          type="number"
          trend={{
            value: Math.round((dashboardData.occupancyRate || 0) * 10) / 10,
            isPositive: (dashboardData.occupancyRate || 0) > 50,
            label: "Ikigereranyo"
          }}
          icon="properties"
          delay={1}
          onPress={() => navigateToPage('properties')}
        />
        
        <StatsCard
          title="Ibyumba Byose"
          value={dashboardData.totalUnits}
          type="number"
          trend={{
            value: dashboardData.occupiedUnits,
            isPositive: true,
            label: "Byatuwemo"
          }}
          icon="properties"
          delay={2}
          onPress={() => navigateToPage('properties')}
        />
        
        <StatsCard
          title="Abakode Bose"
          value={dashboardData.totalTenants}
          type="number"
          trend={{
            value: Math.round(Math.abs(dashboardData.tenantChangePercent || 0) * 10) / 10,
            isPositive: (dashboardData.tenantChangePercent || 0) >= 0,
            label: "vs ukwezi gushize"
          }}
          icon="tenants"
          delay={3}
          onPress={() => navigateToPage('tenants')}
        />
        
        <StatsCard
          title="Amafaranga Yose"
          value={dashboardData.totalRevenue}
          type="currency"
          trend={{
            value: Math.round(Math.abs(dashboardData.revenueChangePercent || 0) * 10) / 10,
            isPositive: (dashboardData.revenueChangePercent || 0) >= 0,
            label: "vs ukwezi gushize"
          }}
          icon="revenue"
          delay={4}
          onPress={() => navigateToPage('payments')}
        />

        <StatsCard
          title="Banyirinyubako"
          value={dashboardData.landlords.length}
          type="number"
          trend={{
            value: 0,
            isPositive: true,
            label: "Bose hamwe"
          }}
          icon="landlords"
          delay={5}
          onPress={() => navigateToPage('landlords')}
        />
        
        <StatsCard
          title="Abakoresha Bose"
          value={dashboardData.totalUsers}
          type="number"
          trend={{
            value: 0,
            isPositive: true,
            label: "Kuri sisitemu"
          }}
          icon="users"
          delay={6}
          onPress={() => navigateToPage('users')}
        />
      </View>

      {/* Admin Quick Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Incamake y&apos;Ubuyobozi</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ikigereranyo cy&apos;Ibyumba:</Text>
          <Text style={styles.summaryValue}>{dashboardData.occupancyRate}%</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ubwishyu Bukurikira:</Text>
          <Text style={styles.summaryValue}>{dashboardData.upcomingDueDates.length} mu minsi 20</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ubwishyu Bwishyuwe:</Text>
          <Text style={styles.summaryValue}>
            {dashboardData.paymentStatus.find(p => p.name === 'Paid')?.units || 0}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Banyirinyubako Bafite Inyubako:</Text>
          <Text style={styles.summaryValue}>{dashboardData.landlords.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Abayobozi:</Text>
          <Text style={styles.summaryValue}>{dashboardData.managers.length}</Text>
        </View>
      </View>
    </ScrollView>
  )

  const renderChartsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Platform Revenue Chart */}
      <ChartCard
        title="Amafaranga yinjira ku rusobe buri kwezi"
        subtitle="Ugereranyo w'amafaranga yinjiye ku rusobe rwose n'intego"
        delay={5}
      >
        {dashboardData.revenueData.length > 0 ? (
          <LineChart
            data={{
              labels: dashboardData.revenueData.map(item => item.month),
              datasets: [
                {
                  data: dashboardData.revenueData.map(item => item.revenue),
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // green
                  strokeWidth: 2,
                  withDots: true,
                },
                {
                  data: dashboardData.revenueData.map(item => item.target),
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // blue for target
                  strokeWidth: 2,
                  withDots: false,
                },
              ],
              legend: ['Amafaranga yinjiye', 'Intego'],
            }}
            width={width - 48}
            height={260}
            yAxisLabel="RWF "
            yAxisSuffix=""
            yAxisInterval={1}
            chartConfig={chartConfig}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
            formatYLabel={y => `${parseInt(y, 10) / 1000}K`}
            fromZero
          />
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="bar-chart" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>Nta makuru y&apos;amafaranga</Text>
          </View>
        )}
      </ChartCard>

      {/* Platform Payment Status Chart */}
      <ChartCard
        title="Uko Ubwishyu Buhagaze ku Rusobe"
        subtitle="Uburyo ubwishyu buhagaze ku rusobe rwose"
        delay={6}
      >
        <View style={styles.paymentStatusContainer}>
          {dashboardData.paymentStatus.map((item, index) => (
            <View key={index} style={styles.paymentStatusItem}>
              <View 
                style={[
                  styles.statusIndicator, 
                  { 
                    backgroundColor: 
                      item.name === 'Paid' ? '#10b981' : 
                      item.name === 'Pending' ? '#f59e0b' : '#ef4444' 
                  }
                ]} 
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusName}>
                  {item.name === 'Paid' ? 'Byishyuwe' : 
                   item.name === 'Pending' ? 'Bitegerejwe' : 'Byarengeje'}
                </Text>
                <Text style={styles.statusValue}>{item.value}% ({item.units} abakode)</Text>
              </View>
            </View>
          ))}
        </View>
      </ChartCard>
    </ScrollView>
  )

  const renderUpcomingDueDatesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.activityTitle}>Itariki zegereje ku rusobe rwose (mu minsi 20)</Text>
      {dashboardData.upcomingDueDates.length === 0 ? (
        <View style={styles.emptyActivities}>
          <Ionicons name="calendar" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>Nta bwishyu bugomba kwishyurwa vuba ku rusobe</Text>
        </View>
      ) : (
        dashboardData.upcomingDueDates.map((item, index) => (
          <View key={item.id} style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: item.status === 'urgent' ? '#fee2e2' : '#dbeafe' }]}> 
              <Ionicons name="calendar" size={20} color={item.status === 'urgent' ? '#ef4444' : '#3b82f6'} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{item.tenantName}</Text>
              <Text style={styles.activityDetails}>{item.property} • {item.room}</Text>
              <Text style={styles.activityDetails}>Nyirinyubako: {item.landlordName}</Text>
              <Text style={styles.activityDetails}>Itariki yo kwishyura: {formatDate(item.dueDate)}</Text>
              <Text style={styles.activityDetails}>Amafaranga: {formatCurrency(item.amount)}</Text>
              <Text style={[styles.activityDetails, { color: item.status === 'urgent' ? '#ef4444' : '#3b82f6' }]}>
                Status: {item.status === 'urgent' ? 'Byihutirwa' : 'Igihe kiracyahari'} ({item.daysUntilDue} iminsi)
              </Text>
              {item.phoneNumber && <Text style={styles.activityDetails}>Terefone: {item.phoneNumber}</Text>}
              {item.email && <Text style={styles.activityDetails}>Email: {item.email}</Text>}
            </View>
          </View>
        ))
      )}
    </View>
  )

  // Test function to verify data fetching
  const testDataFetching = async () => {
    try {
      console.log('=== TESTING DATA FETCHING ===')
      
      // Test 1: Check if we can access properties
      const { data: testProperties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name')
        .limit(5)
      
      console.log('Test Properties:', { data: testProperties?.length || 0, error: propertiesError })
      
      // Test 2: Check if we can access users
      const { data: testUsers, error: usersError } = await supabase
        .rpc('get_all_users_admin_simple')
        .limit(5)
      
      console.log('Test Users:', { data: testUsers?.length || 0, error: usersError })
      
      // Test 3: Check if we can access payments
      const { data: testPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount')
        .limit(5)
      
      console.log('Test Payments:', { data: testPayments?.length || 0, error: paymentsError })
      
      // Test 4: Check if we can call the admin function
      const { data: testStats, error: statsError } = await supabase
        .rpc('get_admin_dashboard_stats')
      
      console.log('Test Admin Stats:', { data: testStats, error: statsError })
      
      Alert.alert('Test Complete', 'Check console for results')
      
    } catch (error) {
      console.error('Test error:', error)
      Alert.alert('Test Error', 'Check console for details')
    }
  }

  // Test admin login (for development only)
  const testAdminLogin = async () => {
    try {
      console.log('=== TESTING ADMIN LOGIN ===')
      
      // Test admin login with known credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@icumbi.com',
        password: 'admin123' // This should be the actual admin password
      })
      
      console.log('Login result:', { data, error })
      
      if (error) {
        Alert.alert('Login Failed', `Error: ${error.message}`)
        return
      }
      
      if (data.user) {
        console.log('Login successful, user:', data.user.id)
        Alert.alert('Login Success', 'Admin login successful!')
        
        // Reload the dashboard data
        await checkUserAndLoadData()
      }
      
    } catch (error) {
      console.error('Login test error:', error)
      Alert.alert('Login Test Error', 'Check console for details')
    }
  }

  // Test admin authentication
  const testAdminAuth = async () => {
    try {
      console.log('=== TESTING ADMIN AUTHENTICATION ===')
      
      // Test 1: Check current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('Current user:', { user: user?.id, error: authError })
      
      if (!user) {
        Alert.alert('No User', 'No authenticated user found')
        return
      }
      
      // Test 2: Check user role
      const { data: userData, error: userError } = await supabase
        .rpc('get_all_users_admin_simple')
        .eq('id', user.id)
        .single()
      
      console.log('User data:', { userData, error: userError })
      
      if (userError) {
        Alert.alert('User Error', `Error fetching user data: ${userError.message}`)
        return
      }
      
      if (!userData) {
        Alert.alert('No User Data', 'No user data found')
        return
      }
      
      if (userData.role !== 'admin') {
        Alert.alert('Not Admin', `User role is: ${userData.role}`)
        return
      }
      
      Alert.alert('Admin Auth Success', `Welcome ${userData.full_name}!`)
      
    } catch (error) {
      console.error('Auth test error:', error)
      Alert.alert('Auth Test Error', 'Check console for details')
    }
  }

  // Test admin signup (for development only)
  const testAdminSignup = async () => {
    try {
      console.log('=== TESTING ADMIN SIGNUP ===')
      
      // Test admin signup
      const { data, error } = await supabase.auth.signUp({
        email: 'testadmin@icumbi.com',
        password: 'testadmin123',
        options: {
          data: {
            full_name: 'Test Admin',
            role: 'admin'
          }
        }
      })
      
      console.log('Signup result:', { data, error })
      
      if (error) {
        Alert.alert('Signup Failed', `Error: ${error.message}`)
        return
      }
      
      if (data.user) {
        console.log('Signup successful, user:', data.user.id)
        Alert.alert('Signup Success', 'Test admin account created!')
      }
      
    } catch (error) {
      console.error('Signup test error:', error)
      Alert.alert('Signup Test Error', 'Check console for details')
    }
  }

  // Check current auth status
  const checkAuthStatus = async () => {
    try {
      console.log('=== CHECKING AUTH STATUS ===')
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('Auth status:', { user: user?.id, error: authError })
      
      if (!user) {
        Alert.alert('Auth Status', 'No authenticated user')
        return
      }
      
      const { data: userData, error: userError } = await supabase
        .rpc('get_all_users_admin_simple')
        .eq('id', user.id)
        .single()
      
      if (userError) {
        Alert.alert('Auth Status', `Error: ${userError.message}`)
        return
      }
      
      if (!userData) {
        Alert.alert('Auth Status', 'No user data found')
        return
      }
      
      Alert.alert('Auth Status', 
        `User: ${userData.full_name}\nRole: ${userData.role}\nEmail: ${userData.email}`
      )
      
    } catch (error) {
      console.error('Auth status check error:', error)
      Alert.alert('Auth Status Error', 'Check console for details')
    }
  }

  // Manual refresh dashboard data
  const refreshDashboardData = async () => {
    try {
      console.log('=== MANUAL REFRESH DASHBOARD DATA ===')
      
      if (!profile) {
        Alert.alert('No Profile', 'No admin profile found')
        return
      }
      
      await fetchAdminDashboardData()
      await fetchAdminActivities()
      
      Alert.alert('Refresh Complete', 'Dashboard data has been refreshed')
      
    } catch (error) {
      console.error('Refresh error:', error)
      Alert.alert('Refresh Error', 'Check console for details')
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Gukura dashibodi y&apos;ubuyobozi...</Text>
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="warning" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>Nta bucukumbuzi bwo gucunga busanganywe</Text>
      </View>
    )
  }

  // Navigation to admin-specific pages
  if (currentPage === 'properties') {
    return <AdminPropertiesPage onBack={() => setCurrentPage('dashboard')} />
  }
  
  if (currentPage === 'tenants') {
    return <AdminTenantsPage onBack={() => setCurrentPage('dashboard')} />
  }
  
  if (currentPage === 'payments') {
    return <AdminPaymentsPage onBack={() => setCurrentPage('dashboard')} />
  }
  
  if (currentPage === 'managers') {
    return <AdminManagersPage onBack={() => setCurrentPage('dashboard')} />
  }
  
  if (currentPage === 'reports') {
    return <AdminReportsPage onBack={() => setCurrentPage('dashboard')} />
  }
  
  if (currentPage === 'landlords') {
    return <AdminLandlordsPage onBack={() => setCurrentPage('dashboard')} />
  }
  
  if (currentPage === 'users') {
    return <AdminUsersPage onBack={() => setCurrentPage('dashboard')} />
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with menu - Clean admin dashboard header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsMenuOpen(true)}
        >
          <Ionicons name="menu" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={[styles.welcomeText, { color: theme.text }]}>Murakaza neza, {profile.full_name?.split(' ')[0]}!</Text>
          <Text style={[styles.roleText, { color: theme.textSecondary }]}>Umugenzuzi</Text>
        </View>
        
        <View style={styles.headerActions}>
          <LanguageSelector size="small" />
          <TouchableOpacity onPress={refreshDashboardData} style={styles.actionButton}>
            <Ionicons name="refresh" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation - exactly matching landlord dashboard */}
      <View style={[styles.tabNavigation, { backgroundColor: theme.surface }]}>
        {[
          { key: 'overview', label: 'Muri rusange', icon: 'analytics' },
          { key: 'urgent', label: 'Ibyihutirwa', icon: 'alert-circle' },
          { key: 'charts', label: 'Amashusho', icon: 'bar-chart' },
          { key: 'upcoming', label: 'Itariki zegereje', icon: 'time' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab, 
              { backgroundColor: theme.card },
              activeTab === tab.key && { backgroundColor: theme.primary }
            ]}
            onPress={() => setActiveTab(tab.key as TabType)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.key ? 'white' : theme.textSecondary} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === tab.key ? 'white' : theme.text },
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* Sidebar Menu Modal - EXACTLY matching landlord dashboard */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMenuOpen}
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            onPress={() => setIsMenuOpen(false)}
          />
          <View style={styles.sidebarMenu}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogo}>
                <IcumbiLogo width={32} height={32} />
                <Text style={styles.sidebarTitle}>Icumbi Hub</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sidebarContent}>
              <Text style={styles.sidebarWelcome}>Murakaza neza,</Text>
              <Text style={styles.sidebarName}>{profile.full_name}</Text>
              <Text style={styles.sidebarRole}>Umugenzuzi Dashboard</Text>
            </View>

            {/* Admin Navigation Items */}
            <View style={styles.navigationList}>
              {[
                { label: 'Inyubako Zose', icon: 'business', page: 'properties' as const },
                { label: 'Abakode Bose', icon: 'people', page: 'tenants' as const },
                { label: 'Ubwishyu Bwose', icon: 'card', page: 'payments' as const },
                { label: 'Banyirinyubako', icon: 'person-circle', page: 'landlords' as const },
                { label: 'Abayobozi', icon: 'people-circle', page: 'managers' as const },
                { label: 'Abakoresha Bose', icon: 'people', page: 'users' as const },
                { label: 'Raporo Rusange', icon: 'bar-chart', page: 'reports' as const }
              ].map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.navItem}
                  onPress={() => navigateToPage(item.page)}
                >
                  <Ionicons name={item.icon as any} size={20} color="#6b7280" />
                  <Text style={styles.navItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// EXACTLY matching styles from landlord dashboard
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  menuButton: {
    padding: 8
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8
  },
  welcomeText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'center'
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  roleText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 2
  },
  signOutButton: {
    padding: 8
  },
  testButton: {
    padding: 8,
    marginRight: 8
  },
  tabNavigation: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 8
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    backgroundColor: '#f0f9ff'
  },
  tabText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100
  },
  
  // Stats Cards
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  statsCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  statsCardTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1
  },
  statsCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8
  },
  statsCardTrend: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  trendLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 4
  },

  // Summary Card
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },

  // Chart Card
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  chartHeader: {
    marginBottom: 16
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6b7280'
  },
  simpleChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2
  },
  chartMonth: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 8
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2
  },
  revenueBar: {
    width: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    minHeight: 20
  },
  targetBar: {
    width: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    minHeight: 20
  },
  chartValue: {
    fontSize: 8,
    color: '#374151',
    marginTop: 4,
    textAlign: 'center'
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280'
  },

  // Payment Status
  paymentStatusContainer: {
    marginTop: 8
  },
  paymentStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12
  },
  statusInfo: {
    flex: 1
  },
  statusName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  statusValue: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },

  // Activities Tab
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  filterButtonText: {
    fontSize: 12,
    color: '#374151',
    marginRight: 4
  },
  filterDropdown: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  filterOptionText: {
    fontSize: 14,
    color: '#374151'
  },
  filterOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  activityContent: {
    flex: 1
  },
  activityDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  activityTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4
  },
  emptyActivities: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center'
  },

  // Sidebar Menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalBackdrop: {
    flex: 1
  },
  sidebarMenu: {
    position: 'absolute',
    left: 0,
    top: 120,
    bottom: 90,
    width: 280,
    backgroundColor: 'white',
    paddingTop: 20,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  sidebarContent: {
    padding: 20
  },
  sidebarWelcome: {
    fontSize: 12,
    color: '#6b7280'
  },
  sidebarName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 2
  },
  sidebarRole: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2
  },
  navigationList: {
    paddingTop: 20
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  navItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500'
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ea580c',
    marginBottom: 4
  },
  urgentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    minWidth: 180,
    borderWidth: 1,
    borderColor: '#fdba74',
    marginBottom: 8
  },
  urgentLabel: {
    fontSize: 11,
    color: '#ea580c',
    fontWeight: '600',
    marginTop: 2
  },
  urgentValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 2
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
  }
}) 