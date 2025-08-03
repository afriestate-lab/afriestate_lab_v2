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
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { LineChart } from 'react-native-chart-kit'
import { useTheme } from './_layout'

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

// Import mobile pages
import PropertiesPage from './properties-page'
import TenantsPage from './tenants-page'
import PaymentsPage from './payments-page'
import ManagersPage from './managers-page'
import ReportsPage from './reports-page'
import AdminPanel from './admin-panel'

const { width, height } = Dimensions.get('window')

// Types matching web implementation
type TabType = 'overview' | 'charts' | 'upcoming' | 'urgent'
type ActivityType = 'payment' | 'tenant' | 'property' | 'manager' | 'other' | 'all'

interface MobileDashboardData {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  totalTenants: number
  totalRevenue: number
  expectedRevenue: number
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

// Stats Card Component matching web implementation
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
      default: return 'analytics'
    }
  }

  const getIconColor = (iconType: string) => {
    switch (iconType) {
      case 'properties': return '#3b82f6'
      case 'tenants': return '#8b5cf6'
      case 'revenue': return '#f59e0b'
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

// Chart Card Component for mobile
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

export default function LandlordDashboard() {
  const { theme } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Dashboard data matching web implementation
  const [dashboardData, setDashboardData] = useState<MobileDashboardData>({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    totalTenants: 0,
    totalRevenue: 0,
    expectedRevenue: 0,
    previousRevenue: 0,
    occupancyRate: 0,
    revenueChangePercent: 0,
    tenantChangePercent: 0,
    propertyChangePercent: 0,
    revenueData: [],
    paymentStatus: [],
    upcomingDueDates: [],
    properties: [],
    managers: []
  })

  // Activity and filtering states
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [activityFilter, setActivityFilter] = useState<ActivityType>('all')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  
  // Modal states
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false)
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false)
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false)
  const [isAddManagerModalOpen, setIsAddManagerModalOpen] = useState(false)

  // Navigation state
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'properties' | 'tenants' | 'payments' | 'managers' | 'reports'>('dashboard')
  
  // Admin panel state
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)

  // Handle navigation to specific pages
  const navigateToPage = (page: 'dashboard' | 'properties' | 'tenants' | 'payments' | 'managers' | 'reports') => {
    setCurrentPage(page)
    setIsMenuOpen(false)
  }

  const generateRevenueData = React.useCallback(async (userId: string, isManager: boolean): Promise<RevenueDataPoint[]> => {
    try {
      const data: RevenueDataPoint[] = []
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        
        let query
        if (isManager) {
          const { data: managerProperties } = await supabase
            .from('property_managers')
            .select('property_id')
            .eq('manager_id', userId)
            .eq('status', 'active')

          const propertyIds = managerProperties?.map(mp => mp.property_id) || []
          
          query = supabase
            .from('payments')
            .select(`
              amount,
              rooms!inner (
                property_id
              )
            `)
            .in('rooms.property_id', propertyIds)
        } else {
          query = supabase
            .from('payments')
            .select(`
              amount,
              rooms!inner (
                properties!inner (
                  landlord_id
                )
              )
            `)
            .eq('rooms.properties.landlord_id', userId)
        }

        const { data: payments } = await query
          .gte('payment_date', monthStart.toISOString())
          .lte('payment_date', monthEnd.toISOString())

        const revenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
        const target = revenue * 1.1
        
        data.push({
          month: date.toLocaleDateString('rw-RW', { month: 'short' }),
          revenue,
          target
        })
      }

      return data
    } catch (error) {
      console.error('Error generating revenue data:', error)
      return []
    }
  }, [])

    const getPaymentStatusData = React.useCallback(async (userId: string, isManager: boolean): Promise<PaymentStatusItem[]> => {
    try {
      // Use last 30 days instead of current month for more relevant data
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const currentDate = new Date()
      
      let roomTenantsQuery
      let paymentsQuery
      
      if (isManager) {
        const { data: managerProperties } = await supabase
          .from('property_managers')
          .select('property_id')
          .eq('manager_id', userId)
          .eq('status', 'active')

        const propertyIds = managerProperties?.map(mp => mp.property_id) || []
        
        roomTenantsQuery = supabase
          .from('room_tenants')
          .select(`
            id,
            tenant_id,
            room_id,
            next_due_date,
            is_active,
            rooms!inner (
              id,
              property_id
            )
          `)
          .eq('is_active', true)
          .in('rooms.property_id', propertyIds)

        paymentsQuery = supabase
          .from('payments')
          .select(`
            tenant_id,
            room_id,
            payment_date,
            rooms!inner (
              property_id
            )
          `)
          .gte('payment_date', thirtyDaysAgo.toISOString().split('T')[0])
          .lte('payment_date', currentDate.toISOString().split('T')[0])
          .in('rooms.property_id', propertyIds)
      } else {
        roomTenantsQuery = supabase
          .from('room_tenants')
          .select(`
            id,
            tenant_id,
            room_id,
            next_due_date,
            is_active,
            rooms!inner (
              id,
              properties!inner (
                landlord_id
              )
            )
          `)
          .eq('is_active', true)
          .eq('rooms.properties.landlord_id', userId)

        paymentsQuery = supabase
          .from('payments')
          .select(`
            tenant_id,  
            room_id,
            payment_date,
            rooms!inner (
              properties!inner (
                landlord_id
              )
            )
          `)
          .gte('payment_date', thirtyDaysAgo.toISOString().split('T')[0])
          .lte('payment_date', currentDate.toISOString().split('T')[0])
          .eq('rooms.properties.landlord_id', userId)
      }

      const [{ data: roomTenants }, { data: payments }] = await Promise.all([
        roomTenantsQuery,
        paymentsQuery
      ])

      let paidCount = 0, pendingCount = 0, overdueCount = 0

      // Create set of tenant-room combinations that have paid in the last 30 days
      const paidTenantRooms = new Set(
        payments?.map(p => `${p.tenant_id}-${p.room_id}`) || []
      )

      roomTenants?.forEach((rt: any) => {
        const tenantRoomKey = `${rt.tenant_id}-${rt.room_id}`
        const hasPaidRecently = paidTenantRooms.has(tenantRoomKey)
        
        if (hasPaidRecently) {
          paidCount++
        } else if (rt.next_due_date) {
          const dueDate = new Date(rt.next_due_date)
          const daysSinceDue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysSinceDue > 5) {
            overdueCount++
          } else {
            pendingCount++
          }
        } else {
          pendingCount++
        }
      })

      const total = paidCount + pendingCount + overdueCount
      
      return [
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
    } catch (error) {
      console.error('Error getting payment status data:', error)
      return [
        { name: 'Paid', value: 0, units: 0 },
        { name: 'Pending', value: 0, units: 0 }, 
        { name: 'Overdue', value: 0, units: 0 }
      ]
    }
  }, [])

  const getUpcomingDueDates = React.useCallback(async (userId: string, isManager: boolean): Promise<UpcomingDueDate[]> => {
    try {
      const currentDate = new Date()
      const twentyDaysFromNow = new Date(currentDate.getTime() + (20 * 24 * 60 * 60 * 1000))

      let query
      if (isManager) {
        const { data: managerProperties } = await supabase
          .from('property_managers')
          .select('property_id')
          .eq('manager_id', userId)
          .eq('status', 'active')

        const propertyIds = managerProperties?.map(mp => mp.property_id) || []

        query = supabase
          .from('room_tenants')
          .select(`
            id, room_id, tenant_id, rent_amount, next_due_date, move_in_date, is_active,
            rooms!fk_room_tenants_room (
              id, room_number, property_id,
              properties!rooms_property_id_fkey (
                id, name
              )
            ),
            tenants!fk_room_tenants_tenant (
              id, full_name, phone_number, email
            )
          `)
          .eq('is_active', true)
          .not('next_due_date', 'is', null)
          .gte('next_due_date', currentDate.toISOString().split('T')[0])
          .lte('next_due_date', twentyDaysFromNow.toISOString().split('T')[0])
          .in('rooms.property_id', propertyIds)
          .order('next_due_date', { ascending: true })
      } else {
        const { data: upcomingTenants } = await supabase.rpc(
          'get_upcoming_due_dates',
          {
            landlord_id: userId,
            start_date: currentDate.toISOString().split('T')[0],
            end_date: twentyDaysFromNow.toISOString().split('T')[0]
          }
        )

        if (upcomingTenants) {
          return upcomingTenants.map((item: any) => {
            const dueDate = new Date(item.next_due_date)
            const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
            
            return {
              id: item.id,
              tenantName: item.full_name || 'Umukode utazwi',
              property: item.name || 'Inyubako itazwi',
              room: item.room_number || 'Icyumba kitazwi',
              dueDate: item.next_due_date,
              amount: item.rent_portion || 0,
              status: daysUntilDue <= 3 ? 'urgent' : 'upcoming',
              daysUntilDue: daysUntilDue,
              phoneNumber: item.phone_number,
              email: undefined
            } as UpcomingDueDate
          })
        }
        return []
      }

      // Handle manager case
      const { data: roomTenants } = await query

      if (!roomTenants || roomTenants.length === 0) {
        return []
      }

      return roomTenants.map((tenant: any) => {
        const tenantName = tenant.tenants?.full_name
        const roomNumber = tenant.rooms?.room_number
        const propertyName = tenant.rooms?.properties?.name
        const rentAmount = tenant.rent_amount || tenant.rooms?.rent_amount
        const dueDate = tenant.next_due_date

        const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: tenant.id,
          tenantName,
          property: propertyName,
          room: roomNumber,
          dueDate,
          amount: Number(rentAmount || 0),
          status: daysUntilDue <= 3 ? 'urgent' : 'upcoming',
          daysUntilDue: daysUntilDue,
          phoneNumber: tenant.tenants?.phone_number,
          email: tenant.tenants?.email
        } as UpcomingDueDate
      })
    } catch (error) {
      console.error('Error getting upcoming due dates:', error)
      return []
    }
  }, [])

  const fetchProperties = React.useCallback(async (userId: string, isManager: boolean) => {
    try {
      if (isManager) {
        const { data: managerProperties } = await supabase
          .from('property_managers')
          .select(`
            properties!inner (*)
          `)
          .eq('manager_id', userId)
          .eq('status', 'active')

        return managerProperties?.map(mp => (mp.properties as any)) || []
      } else {
        const { data: properties } = await supabase
          .from('properties')
          .select('*')
          .eq('landlord_id', userId)

        return properties || []
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      return []
    }
  }, [])

  const fetchDashboardData = React.useCallback(async (userProfile: UserProfile) => {
    try {
      const isLandlord = userProfile.role === 'landlord'
      const isManager = userProfile.role === 'manager'
      if (isLandlord) {
        const { data: dashboardStats, error: statsError } = await supabase
          .rpc('get_enhanced_dashboard_stats', { landlord_user_id: userProfile.id })
        if (statsError) {
          console.error('Dashboard stats error:', statsError)
          throw statsError
        }
        const stats = dashboardStats?.[0] || {}
        const [revenueData, paymentStatus, upcomingDueDates, properties] = await Promise.all([
          generateRevenueData(userProfile.id, false),
          getPaymentStatusData(userProfile.id, false),
          getUpcomingDueDates(userProfile.id, false),
          fetchProperties(userProfile.id, false)
        ])
        // Calculate expected monthly revenue from occupied rooms
        const expectedMonthlyRevenue = Number(stats.occupied_rooms || 0) * 100000 // Assuming 100k per room
        
        // Get recent payments (last 30 days) instead of just current month
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const { data: recentPayments } = await supabase
          .from('payments')
          .select(`
            amount,
            rooms!inner (
              properties!inner (
                landlord_id
              )
            )
          `)
          .eq('rooms.properties.landlord_id', userProfile.id)
          .gte('payment_date', thirtyDaysAgo.toISOString().split('T')[0])
          .lte('payment_date', new Date().toISOString().split('T')[0])
        
        const actualRevenue = recentPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
        
        setDashboardData({
          totalProperties: Number(stats.total_properties || 0),
          totalUnits: Number(stats.total_rooms || 0),
          occupiedUnits: Number(stats.occupied_rooms || 0),
          totalTenants: Number(stats.total_tenants || 0),
          totalRevenue: actualRevenue, // Show actual payments received
          expectedRevenue: expectedMonthlyRevenue,
          previousRevenue: Number(stats.previous_month_revenue || 0),
          occupancyRate: Math.round(Number(stats.occupancy_rate || 0) * 10) / 10,
          revenueChangePercent: Math.round(Number(stats.revenue_change_percent || 0) * 10) / 10,
          tenantChangePercent: Math.round(Number(stats.tenant_change_percent || 0) * 10) / 10,
          propertyChangePercent: Math.round(Number(stats.property_change_percent || 0) * 10) / 10,
          revenueData,
          paymentStatus,
          upcomingDueDates,
          properties,
          managers: []
        })
      } else if (isManager) {
        const { data: managerProperties } = await supabase
          .from('property_managers')
          .select(`properties!inner (id, name)`)
          .eq('manager_id', userProfile.id)
          .eq('status', 'active')
        if (!managerProperties || managerProperties.length === 0) {
          setDashboardData({
            totalProperties: 0,
            totalUnits: 0,
            occupiedUnits: 0,
            totalTenants: 0,
            totalRevenue: 0,
            expectedRevenue: 0,
            previousRevenue: 0,
            occupancyRate: 0,
            revenueChangePercent: 0,
            tenantChangePercent: 0,
            propertyChangePercent: 0,
            revenueData: [],
            paymentStatus: [],
            upcomingDueDates: [],
            properties: [],
            managers: []
          })
          return
        }
        const propertyIds = managerProperties.map(mp => (mp.properties as any).id)
        const { data: properties } = await supabase
          .from('property_overview')
          .select('*')
          .in('id', propertyIds)
        const totalProperties = properties?.length || 0
        const totalRooms = properties?.reduce((sum: number, p: any) => sum + (p.total_rooms || 0), 0) || 0
        const occupiedRooms = properties?.reduce((sum: number, p: any) => sum + (p.occupied_rooms || 0), 0) || 0
        const totalTenants = properties?.reduce((sum: number, p: any) => sum + (p.total_tenants || 0), 0) || 0
        const [revenueData, paymentStatus, upcomingDueDates] = await Promise.all([
          generateRevenueData(userProfile.id, true),
          getPaymentStatusData(userProfile.id, true),
          getUpcomingDueDates(userProfile.id, true)
        ])
        const currentMonthRevenue = revenueData.length > 0 
          ? revenueData[revenueData.length - 1]?.revenue || 0 
          : 0
        const expectedRevenue = occupiedRooms * 100000 // Assuming 100k per room
        setDashboardData({
          totalProperties,
          totalUnits: totalRooms,
          occupiedUnits: occupiedRooms,
          totalTenants,
          totalRevenue: currentMonthRevenue,
          expectedRevenue,
          previousRevenue: 0,
          occupancyRate: Math.round((totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0) * 10) / 10,
          revenueChangePercent: 0,
          tenantChangePercent: 0,
          propertyChangePercent: 0,
          revenueData,
          paymentStatus,
          upcomingDueDates,
          properties: properties || [],
          managers: []
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura amakuru ya dashibodi.')
    }
  }, [generateRevenueData, getPaymentStatusData, getUpcomingDueDates, fetchProperties])

  const fetchActivities = React.useCallback(async (userProfile: UserProfile) => {
    try {
      const activities: DashboardActivity[] = []
      const { data: recentPayments } = await supabase
        .from('payments')
        .select(`id, amount, payment_date, rooms!inner (room_number, properties!inner (name, landlord_id)), tenants!inner (full_name)`)
        .eq('rooms.properties.landlord_id', userProfile.id)
        .order('payment_date', { ascending: false })
        .limit(10)
      recentPayments?.forEach(payment => {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: `Ubwishyu bwakiriwe: ${formatCurrency(payment.amount)}`,
          details: `${(payment.tenants as any).full_name} - ${(payment.rooms as any).properties.name}`,
          timestamp: new Date(payment.payment_date),
          iconName: 'card',
          iconColor: '#10b981'
        })
      })
      const { data: recentTenants } = await supabase
        .from('room_tenants')
        .select(`id, move_in_date, created_at, rooms!inner (room_number, properties!inner (name, landlord_id)), tenants!inner (full_name)`)
        .eq('rooms.properties.landlord_id', userProfile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5)
      recentTenants?.forEach(tenant => {
        activities.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant',
          title: `Umukode mushya winjiye`,
          details: `${(tenant.tenants as any).full_name} - ${(tenant.rooms as any).properties.name} ${(tenant.rooms as any).room_number}`,
          timestamp: new Date(tenant.created_at),
          iconName: 'person-add',
          iconColor: '#8b5cf6'
        })
      })
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setActivities(activities)
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }, [])

  const checkUserAndLoadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Ikosa', 'Nta bucukumbuzi bwemerewe busanganywe. Injira mbere.')
        return
      }
      const { data: userData } = await supabase
        .from('users')
        .select('id, role, full_name, email')
        .eq('id', user.id)
        .single()
      if (!userData || (userData.role !== 'landlord' && userData.role !== 'manager')) {
        Alert.alert('Ikosa', 'Nta bucukumbuzi bwo gutwara inyubako busanganywe.')
        return
      }
      setProfile(userData)
      await fetchDashboardData(userData)
      await fetchActivities(userData)
    } catch (error) {
      console.error('Error checking user:', error)
      Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka amakuru yawe.')
    } finally {
      setLoading(false)
    }
  }, [fetchDashboardData, fetchActivities])

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
    await fetchDashboardData(profile)
    await fetchActivities(profile)
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
      case 'charts':
        return renderChartsTab()
      case 'upcoming':
        return renderUpcomingDueDatesTab()
      default:
        return renderOverviewTab()
    }
  }

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Stats Cards Grid - matching web layout */}
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
          title="Ibyumba"
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
      </View>

      {/* Quick Summary matching web */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Incamake y&apos;Ubu</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ikigereranyo cy&apos;Ibyumba:</Text>
          <Text style={styles.summaryValue}>{dashboardData.occupancyRate}%</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ubwishyu Bukurikira:</Text>
          <Text style={styles.summaryValue}>{dashboardData.upcomingDueDates.length} mu minsi 20</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ubwishyu Bwishyuwe (30 iminsi):</Text>
          <Text style={styles.summaryValue}>
            {dashboardData.paymentStatus.find(p => p.name === 'Paid')?.units || 0}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amafaranga Yatunganywe (30 iminsi):</Text>
          <Text style={styles.summaryValue}>{formatCurrency(dashboardData.totalRevenue)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amafaranga Yateguwe:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(dashboardData.expectedRevenue)}</Text>
        </View>
      </View>
    </ScrollView>
  )

  const renderChartsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Revenue Chart */}
      <ChartCard
        title="Amafaranga yinjira buri kwezi"
        subtitle="Ugereranyo w'amafaranga yinjiye n'intego"
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

      {/* Payment Status Chart */}
      <ChartCard
        title="Uko Ubwishyu Buhagaze"
        subtitle="Uburyo ubwishyu buhagaze"
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

  const renderActivitiesTab = () => (
    <View style={styles.tabContent}>
      {/* Activity Filter */}
      <View style={styles.activityHeader}>
        <Text style={styles.activityTitle}>Ibikorwa bya vuba</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
        >
          <Text style={styles.filterButtonText}>
            {activityFilter === 'all' ? 'Byose' : 
             activityFilter === 'payment' ? 'Ubwishyu' :
             activityFilter === 'tenant' ? 'Abakode' :
             activityFilter === 'property' ? 'Inyubako' :
             activityFilter === 'manager' ? 'Abayobozi' : 'Ibindi'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Filter Dropdown */}
      {isFilterDropdownOpen && (
        <View style={styles.filterDropdown}>
          {[
            { key: 'all', label: 'Byose' },
            { key: 'payment', label: 'Ubwishyu' },
            { key: 'tenant', label: 'Abakode' },
            { key: 'property', label: 'Inyubako' },
            { key: 'manager', label: 'Abayobozi' },
            { key: 'other', label: 'Ibindi' }
          ].map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={styles.filterOption}
              onPress={() => {
                setActivityFilter(filter.key as ActivityType)
                setIsFilterDropdownOpen(false)
              }}
            >
              <Text style={[
                styles.filterOptionText,
                activityFilter === filter.key && styles.filterOptionTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Activities List */}
      <FlatList
        data={getFilteredActivities()}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: item.iconColor + '20' }]}>
              <Ionicons name={item.iconName as any} size={20} color={item.iconColor} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityDetails}>{item.details}</Text>
                             <Text style={styles.activityTime}>{formatDate(item.timestamp.toISOString())}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyActivities}>
            <Ionicons name="time" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>
              {activityFilter !== 'all' 
                                 ? `Nta bikorwa by&apos;${activityFilter === 'payment' ? 'ubwishyu' : activityFilter === 'tenant' ? 'abakode' : activityFilter} basanze` 
                 : 'Nta bikorwa by&apos;ibihe bya vuba'
              }
            </Text>
          </View>
        )}
      />
    </View>
  )

  const renderUpcomingDueDatesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.activityTitle}>Itariki zegereje (mu minsi 20)</Text>
      {dashboardData.upcomingDueDates.length === 0 ? (
        <View style={styles.emptyActivities}>
          <Ionicons name="calendar" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>Nta bwishyu bugomba kwishyurwa vuba</Text>
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
              <Text style={styles.activityDetails}>Itariki yo kwishyura: {formatDate(item.dueDate)}</Text>
              <Text style={styles.activityDetails}>Amafaranga: {formatCurrency(item.amount)}</Text>
              <Text style={[styles.activityDetails, { color: item.status === 'urgent' ? '#ef4444' : '#3b82f6' }]}>Status: {item.status === 'urgent' ? 'Byihutirwa' : 'Igihe kiracyahari'} ({item.daysUntilDue} iminsi)</Text>
              {item.phoneNumber && <Text style={styles.activityDetails}>Terefone: {item.phoneNumber}</Text>}
              {item.email && <Text style={styles.activityDetails}>Email: {item.email}</Text>}
            </View>
          </View>
        ))
      )}
    </View>
  )

  // Demo payments data for Ibyihutirwa (replace with real fetch logic)
  const [urgentPayments, setUrgentPayments] = useState([
    {
      id: '1',
      tenantName: 'Niyonsenga Jean',
      room: '101',
      amount: 120000,
      paymentMethod: 'Mobile Money',
      property: 'Icumbi Plaza',
      landlord: 'Mukamana Alice',
      approved: false
    },
    {
      id: '2',
      tenantName: 'Uwase Aline',
      room: '202',
      amount: 95000,
      paymentMethod: 'Bank',
      property: 'Green Tower',
      landlord: 'Habimana Claude',
      approved: false
    }
  ])

  const handleApproveUrgent = (id: string) => {
    setUrgentPayments(prev => prev.map(p => p.id === id ? { ...p, approved: true } : p))
  }

  // Render Ibyihutirwa tab
  const renderUrgentTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.urgentTitle}>Ibyihutirwa: Ubwishyu bushya</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {urgentPayments.map((payment, index) => (
          <View key={`payment-${payment.id}-${index}`} style={[styles.urgentCard, payment.approved && styles.urgentCardApproved]}>
            <Text style={styles.urgentLabel}>Umukode:</Text>
            <Text style={styles.urgentValue}>{payment.tenantName}</Text>
            <Text style={styles.urgentLabel}>Icyumba:</Text>
            <Text style={styles.urgentValue}>{payment.room}</Text>
            <Text style={styles.urgentLabel}>Amafaranga:</Text>
            <Text style={styles.urgentValue}>{formatCurrency(payment.amount)}</Text>
            <Text style={styles.urgentLabel}>Uburyo bwo kwishyura:</Text>
            <Text style={styles.urgentValue}>{payment.paymentMethod}</Text>
            <Text style={styles.urgentLabel}>Inyubako:</Text>
            <Text style={styles.urgentValue}>{payment.property}</Text>
            <Text style={styles.urgentLabel}>Nyirinyubako:</Text>
            <Text style={styles.urgentValue}>{payment.landlord}</Text>
            {payment.approved ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={{ color: '#10b981', marginLeft: 6 }}>Yemejwe</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={{ marginTop: 8, backgroundColor: '#f59e0b', borderRadius: 8, padding: 8, alignSelf: 'flex-start' }}
                onPress={() => handleApproveUrgent(payment.id)}
              >
                <Ionicons name="checkmark" size={16} color="white" />
                <Text style={{ color: 'white', marginLeft: 4 }}>Emeza ko byoherejwe</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  )

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Gukura dashibodi y&apos;inyubako...</Text>
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="warning" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>Nta bucukumbuzi bwemerewe busanganywe</Text>
      </View>
    )
  }

  // Navigation to different pages
  if (currentPage === 'properties') {
    return <PropertiesPage onBack={() => setCurrentPage('dashboard')} />
  }

  if (currentPage === 'tenants') {
    return <TenantsPage onBack={() => setCurrentPage('dashboard')} />
  }

  if (currentPage === 'payments') {
    return <PaymentsPage onBack={() => setCurrentPage('dashboard')} />
  }

  if (currentPage === 'managers') {
    return <ManagersPage onBack={() => setCurrentPage('dashboard')} />
  }

  if (currentPage === 'reports') {
    return <ReportsPage onBack={() => setCurrentPage('dashboard')} userProfile={profile} />
  }

  // Admin Panel Modal
  if (adminPanelOpen) {
    return (
      <AdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        onRefresh={() => {
          // Refresh dashboard data when admin panel operations complete
          fetchDashboardData(profile).catch(err => {
            console.error('❌ [DASHBOARD] Error refreshing after admin operations:', err)
          })
        }}
        userProfile={profile}
      />
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with menu - matching web mobile header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsMenuOpen(true)}
        >
          <Ionicons name="menu" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Murakaza neza,</Text>
          <Text style={[styles.nameText, { color: theme.text }]}>{profile.full_name?.split(' ')[0]}!</Text>
          <Text style={[styles.roleText, { color: theme.textSecondary }]}>
                         {profile.role === 'landlord' && 'Nyirinyubako'}
             {profile.role === 'manager' && 'Umuyobozi'}
             {profile.role === 'admin' && 'Umugenzuzi'}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => setAdminPanelOpen(true)} style={styles.dangerZoneButton}>
          <Ionicons name="shield" size={24} color={theme.error} />
          <View style={styles.dangerBadge}>
            <View style={styles.dangerPulse} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation - matching web implementation */}
      <View style={[styles.tabNavigation, { backgroundColor: theme.surface }]}>
        {[
          { key: 'overview', label: 'Muri rusange', icon: 'analytics' },
          { key: 'charts', label: 'Amashusho', icon: 'bar-chart' },
          { key: 'upcoming', label: 'Itariki zegereje', icon: 'time' },
          ...(profile?.role === 'admin' ? [{ key: 'urgent', label: 'Ibyihutirwa', icon: 'alert-circle' }] : [])
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
              size={20} 
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
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'charts' && renderChartsTab()}
        {activeTab === 'upcoming' && renderUpcomingDueDatesTab()}
        {activeTab === 'urgent' && profile?.role === 'admin' && renderUrgentTab()}
      </ScrollView>



      {/* Sidebar Menu Modal */}
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
          <View style={[styles.sidebarMenu, { backgroundColor: theme.surface }]}>
            <View style={styles.sidebarHeader}>
              <Text style={[styles.sidebarTitle, { color: theme.text }]}>Icumbi Hub</Text>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sidebarContent}>
              <Text style={styles.sidebarWelcome}>Murakaza neza,</Text>
              <Text style={styles.sidebarName}>{profile.full_name}</Text>
                             <Text style={styles.sidebarRole}>
                 {profile.role === 'landlord' ? 'Nyirinyubako' : 'Umuyobozi'} Dashboard
               </Text>
            </View>

            {/* Navigation Items */}
            <View style={styles.navigationList}>
              {[
                { label: 'Inyubako', icon: 'business', page: 'properties' as const },
                { label: 'Abakode', icon: 'people', page: 'tenants' as const },
                { label: 'Ubwishyu', icon: 'card', page: 'payments' as const },
                ...(profile.role === 'landlord' ? [
                  { label: 'Abayobozi', icon: 'person-circle', page: 'managers' as const },
                  { label: 'Raporo', icon: 'bar-chart', page: 'reports' as const }
                ] : [])
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
    alignItems: 'center'
  },
  welcomeText: {
    fontSize: 12,
    color: '#6b7280'
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  roleText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600'
  },
  signOutButton: {
    padding: 8
  },
  dangerZoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dangerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
    opacity: 0.8,
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
    borderBottomColor: '#3b82f6'
  },
  tabText: {
    marginLeft: 6,
    fontSize: 12,
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
    backgroundColor: 'white',
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
  
  // Page navigation styles
  pageContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  pageBackButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center'
  },
  urgentSection: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2
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
  urgentCardApproved: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
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
}) 