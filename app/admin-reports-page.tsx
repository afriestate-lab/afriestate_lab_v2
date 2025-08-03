import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../src/lib/supabase'
import { formatCurrency, formatDate } from '../src/lib/helpers'

const { width } = Dimensions.get('window')

interface PlatformStats {
  totalProperties: number
  totalTenants: number
  totalRevenue: number
  totalPayments: number
  occupancyRate: number
  landlordCount: number
  managerCount: number
  monthlyGrowth: {
    properties: number
    tenants: number
    revenue: number
  }
}

interface MonthlyData {
  month: string
  properties: number
  tenants: number
  revenue: number
  payments: number
}

interface AdminReportsPageProps {
  onBack: () => void
}

export default function AdminReportsPage({ onBack }: AdminReportsPageProps) {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchPlatformReports()
  }, [])

  const fetchPlatformReports = async () => {
    try {
      setLoading(true)
      
      // Fetch platform-wide statistics
      const [propertiesData, tenantsData, paymentsData, usersData] = await Promise.all([
        supabase.from('properties').select('id, created_at'),
        supabase.from('room_tenants').select('id, created_at, is_active'),
        supabase.from('payments').select('amount, created_at'),
        supabase.from('users').select('id, role, created_at')
      ])

      const properties = propertiesData.data || []
      const tenants = tenantsData.data || []
      const payments = paymentsData.data || []
      const users = usersData.data || []

      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const activeTenants = tenants.filter(t => t.is_active).length
      const landlords = users.filter(u => u.role === 'landlord')
      const managers = users.filter(u => u.role === 'manager')

      // Calculate occupancy rate (simplified)
      const totalRoomsData = await supabase.from('rooms').select('id, status')
      const totalRooms = totalRoomsData.data?.length || 1
      const occupiedRooms = totalRoomsData.data?.filter(r => r.status === 'occupied').length || 0
      const occupancyRate = (occupiedRooms / totalRooms) * 100

      // Calculate monthly growth (last 2 months comparison)
      const currentDate = new Date()
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      const twoMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1)

      const lastMonthProperties = properties.filter(p => new Date(p.created_at) >= lastMonth).length
      const prevMonthProperties = properties.filter(p => 
        new Date(p.created_at) >= twoMonthsAgo && new Date(p.created_at) < lastMonth
      ).length

      const lastMonthTenants = tenants.filter(t => new Date(t.created_at) >= lastMonth).length
      const prevMonthTenants = tenants.filter(t => 
        new Date(t.created_at) >= twoMonthsAgo && new Date(t.created_at) < lastMonth
      ).length

      const lastMonthRevenue = payments
        .filter(p => new Date(p.created_at) >= lastMonth)
        .reduce((sum, p) => sum + (p.amount || 0), 0)
      const prevMonthRevenue = payments
        .filter(p => new Date(p.created_at) >= twoMonthsAgo && new Date(p.created_at) < lastMonth)
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const platformStats: PlatformStats = {
        totalProperties: properties.length,
        totalTenants: activeTenants,
        totalRevenue,
        totalPayments: payments.length,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        landlordCount: landlords.length,
        managerCount: managers.length,
        monthlyGrowth: {
          properties: prevMonthProperties > 0 ? Math.round(((lastMonthProperties - prevMonthProperties) / prevMonthProperties) * 100) : 0,
          tenants: prevMonthTenants > 0 ? Math.round(((lastMonthTenants - prevMonthTenants) / prevMonthTenants) * 100) : 0,
          revenue: prevMonthRevenue > 0 ? Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : 0
        }
      }

      setStats(platformStats)

      // Generate monthly data for the last 6 months
      const monthlyStats: MonthlyData[] = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1)
        
        const monthProperties = properties.filter(p => {
          const createdDate = new Date(p.created_at)
          return createdDate <= nextMonth
        }).length

        const monthTenants = tenants.filter(t => {
          const createdDate = new Date(t.created_at)
          return createdDate >= monthDate && createdDate < nextMonth
        }).length

        const monthRevenue = payments.filter(p => {
          const createdDate = new Date(p.created_at)
          return createdDate >= monthDate && createdDate < nextMonth
        }).reduce((sum, p) => sum + (p.amount || 0), 0)

        const monthPayments = payments.filter(p => {
          const createdDate = new Date(p.created_at)
          return createdDate >= monthDate && createdDate < nextMonth
        }).length

        monthlyStats.push({
          month: monthDate.toLocaleDateString('rw-RW', { month: 'short' }),
          properties: monthProperties,
          tenants: monthTenants,
          revenue: monthRevenue,
          payments: monthPayments
        })
      }

      setMonthlyData(monthlyStats)

    } catch (error) {
      console.error('Error fetching platform reports:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura raporo.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchPlatformReports()
    setRefreshing(false)
  }

  const renderStatsCard = (title: string, value: string, icon: string, color: string, growth?: number) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statsTitle}>{title}</Text>
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      {growth !== undefined && (
        <View style={styles.growthContainer}>
          <Ionicons 
            name={growth >= 0 ? "trending-up" : "trending-down"} 
            size={14} 
            color={growth >= 0 ? "#10b981" : "#ef4444"} 
          />
          <Text style={[
            styles.growthText,
            { color: growth >= 0 ? "#10b981" : "#ef4444" }
          ]}>
            {Math.abs(growth)}% ukwezi gushize
          </Text>
        </View>
      )}
    </View>
  )

  const renderMonthlyChart = () => {
    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue))
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Amafaranga yinjira buri kwezi</Text>
        <View style={styles.chartBars}>
          {monthlyData.map((data, index) => {
            const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 120 : 20
            
            return (
              <View key={index} style={styles.chartBarContainer}>
                <View style={[styles.chartBar, { height: Math.max(height, 10) }]} />
                <Text style={styles.chartLabel}>{data.month}</Text>
                <Text style={styles.chartValue}>{formatCurrency(data.revenue)}</Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Raporo Rusange</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Gukura raporo...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Raporo Rusange</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Ntibyashoboye gukura raporo</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raporo Rusange</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => fetchPlatformReports()}>
          <Ionicons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          {renderStatsCard(
            'Inyubako Zose',
            stats.totalProperties.toString(),
            'business',
            '#3b82f6',
            stats.monthlyGrowth.properties
          )}
          
          {renderStatsCard(
            'Abakode Bakora',
            stats.totalTenants.toString(),
            'people',
            '#8b5cf6',
            stats.monthlyGrowth.tenants
          )}
          
          {renderStatsCard(
            'Amafaranga Yose',
            formatCurrency(stats.totalRevenue),
            'cash',
            '#10b981',
            stats.monthlyGrowth.revenue
          )}
          
          {renderStatsCard(
            'Ubwishyu Bwose',
            stats.totalPayments.toString(),
            'card',
            '#f59e0b'
          )}
          
          {renderStatsCard(
            'Ikigereranyo',
            `${stats.occupancyRate}%`,
            'pie-chart',
            '#06b6d4'
          )}
          
          {renderStatsCard(
            'Banyirinyubako',
            stats.landlordCount.toString(),
            'person-circle',
            '#ef4444'
          )}
        </View>

        {renderMonthlyChart()}

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Incamake y&apos;Urusobem</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Abayobozi:</Text>
              <Text style={styles.summaryValue}>{stats.managerCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Ikigereranyo cy&apos;ibyumba:</Text>
              <Text style={styles.summaryValue}>{stats.occupancyRate}%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Ikigereranyo cy&apos;amafaranga ukwezi:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(stats.totalRevenue / 12)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Ikigereranyo cy&apos;ubwishyu ukwezi:</Text>
              <Text style={styles.summaryValue}>
                {Math.round(stats.totalPayments / 12)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  refreshButton: {
    padding: 8
  },
  content: {
    flex: 1
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12
  },
  statsCard: {
    width: (width - 44) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  statsTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  growthText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4
  },
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1
  },
  chartBar: {
    backgroundColor: '#10b981',
    width: 20,
    borderRadius: 4,
    marginBottom: 8
  },
  chartLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2
  },
  chartValue: {
    fontSize: 8,
    color: '#9ca3af'
  },
  summaryContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16
  },
  summaryGrid: {
    gap: 12
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center'
  }
}) 