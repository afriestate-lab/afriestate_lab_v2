import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Share
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/helpers'

interface ReportData {
  overview: OverviewMetrics
  revenue: RevenueData
  occupancy: OccupancyData
  trends: TrendData
}

interface OverviewMetrics {
  total_properties: number
  total_rooms: number
  occupied_rooms: number
  vacancy_rate: number
  total_revenue: number
  collection_rate: number
  average_rent: number
  total_tenants: number
  new_tenants_this_month: number
}

interface RevenueData {
  monthly_revenue: MonthlyRevenue[]
  revenue_by_property: PropertyRevenue[]
  payment_methods: PaymentMethodBreakdown[]
}

interface MonthlyRevenue {
  month: string
  revenue: number
  target: number
  growth: number
}

interface PropertyRevenue {
  property_name: string
  revenue: number
  percentage: number
}

interface PaymentMethodBreakdown {
  method: string
  amount: number
  percentage: number
  count: number
}

interface OccupancyData {
  occupancy_by_property: PropertyOccupancy[]
}

interface PropertyOccupancy {
  property_name: string
  occupancy_rate: number
  total_rooms: number
  occupied_rooms: number
}

interface TrendData {
  revenue_growth: number
  tenant_growth: number
}

interface ReportsPageProps {
  onBack: () => void
  userProfile?: any
}

const ReportsPage: React.FC<ReportsPageProps> = ({ onBack, userProfile }) => {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReport, setSelectedReport] = useState<'overview' | 'revenue' | 'occupancy'>('overview')
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (userProfile?.id) {
      fetchReportData()
    }
  }, [userProfile?.id, dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      console.log('📊 [MOBILE_REPORTS] Fetching report data for user:', userProfile?.id)

      // Check if userProfile is defined
      if (!userProfile?.id) {
        console.error('❌ [MOBILE_REPORTS] No user profile or user ID found')
        setReportData(null)
        return
      }

      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      
      switch (dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      // Fetch comprehensive data using RPC functions to avoid RLS recursion
      const propertiesResponse = await supabase
        .rpc('get_landlord_properties', {
          p_landlord_id: userProfile.id
        })
      
      const properties = propertiesResponse.data || []
      const propertyIds = properties.filter((p: any) => p && p.id).map((p: any) => p.id)
      
      // If no properties, return empty data
      if (propertyIds.length === 0) {
        setReportData({
          overview: {
            total_properties: 0,
            total_rooms: 0,
            occupied_rooms: 0,
            vacancy_rate: 0,
            total_revenue: 0,
            collection_rate: 0,
            average_rent: 0,
            total_tenants: 0,
            new_tenants_this_month: 0
          },
          revenue: {
            monthly_revenue: [],
            revenue_by_property: [],
            payment_methods: []
          },
          occupancy: {
            occupancy_by_property: []
          },
          trends: {
            revenue_growth: 0,
            tenant_growth: 0
          }
        })
        return
      }
      
      // Get rooms data using RPC to avoid RLS issues
      let allRoomsWithTenants: any[] = []
      
      try {
        const roomPromises = propertyIds.map(propertyId => 
          supabase.rpc('get_property_rooms', {
            p_property_id: propertyId
          })
        )
        
        const roomResults = await Promise.all(roomPromises)
        
        for (const result of roomResults) {
          if (result.data) {
            allRoomsWithTenants.push(...result.data)
          }
        }
      } catch (error) {
        console.error('Error fetching rooms for reports:', error)
      }
      
      const roomsResponse = { data: allRoomsWithTenants, error: null }
      
      const [paymentsResponse, tenantsResponse] = await Promise.all([
        
        supabase
          .from('payments')
          .select(`
            *, 
            rooms!inner(property_id)
          `)
          .in('rooms.property_id', propertyIds)
          .gte('payment_date', startDate.toISOString()),
        
        supabase
          .from('room_tenants')
          .select(`
            *,
            tenants!inner(*),
            rooms!inner(property_id)
          `)
          .in('rooms.property_id', propertyIds)
          .eq('is_active', true)
      ])

      const rooms = roomsResponse.data || []
      const payments = paymentsResponse.data || []
      const tenants = tenantsResponse.data || []

      // Calculate overview metrics
      const totalProperties = properties.length
      const totalRooms = rooms.length
      const occupiedRooms = rooms.filter(room => 
        room?.room_tenants?.some((rt: any) => rt?.is_active)
      ).length
      const vacancyRate = totalRooms > 0 ? ((totalRooms - occupiedRooms) / totalRooms) * 100 : 0

      const totalRevenue = payments.reduce((sum, p) => sum + Number(p?.amount || 0), 0)
      const onTimePayments = payments.filter(p => 
        p?.payment_date && new Date(p.payment_date) <= new Date(p?.due_date || p.payment_date)
      )
      const collectionRate = payments.length > 0 ? (onTimePayments.length / payments.length) * 100 : 100

      const averageRent = rooms.length > 0 ? 
        rooms.reduce((sum, r) => sum + Number(r?.rent_amount || 0), 0) / rooms.length : 0

      const totalTenants = tenants.length
      const newTenants = tenants.filter(t => 
        t?.move_in_date && new Date(t.move_in_date) >= startDate
      ).length

      // Calculate revenue by property
      const revenueByProperty = properties.map((property: any) => {
        const propertyPayments = payments.filter(p => {
          const room = rooms.find(r => r && r.id === p?.room_id)
          return room?.properties?.id === property?.id
        })
        const revenue = propertyPayments.reduce((sum, p) => sum + Number(p?.amount || 0), 0)
        return {
          property_name: property?.name || 'Unknown Property',
          revenue,
          percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
        }
      }).sort((a: any, b: any) => b.revenue - a.revenue)

      // Calculate payment methods breakdown
      const paymentMethods = payments.reduce((acc, payment) => {
        const method = payment.payment_methods || 'Ikindi'
        if (!acc[method]) {
          acc[method] = { amount: 0, count: 0 }
        }
        acc[method].amount += Number(payment.amount)
        acc[method].count += 1
        return acc
      }, {} as Record<string, { amount: number; count: number }>)

      const paymentMethodBreakdown = Object.entries(paymentMethods).map(([method, methodData]) => {
        const data = methodData as { amount: number; count: number }
        return {
          method,
          amount: data.amount,
          percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
          count: data.count
        }
      }).sort((a, b) => b.amount - a.amount)

      // Calculate occupancy by property
      const occupancyByProperty = properties.map((property: any) => {
        const propertyRooms = rooms.filter(r => r?.properties?.id === property?.id)
        const propertyOccupiedRooms = propertyRooms.filter(room => 
          room.room_tenants?.some((rt: any) => rt.is_active)
        ).length
        
        return {
          property_name: property?.name || 'Unknown Property',
          occupancy_rate: propertyRooms.length > 0 ? 
            (propertyOccupiedRooms / propertyRooms.length) * 100 : 0,
          total_rooms: propertyRooms.length,
          occupied_rooms: propertyOccupiedRooms
        }
      }).sort((a: any, b: any) => b.occupancy_rate - a.occupancy_rate)

      // Calculate monthly revenue trends (last 6 months)
      const monthlyRevenue: MonthlyRevenue[] = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date()
        monthStart.setMonth(monthStart.getMonth() - i)
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)
        
        const monthEnd = new Date(monthStart)
        monthEnd.setMonth(monthEnd.getMonth() + 1)
        
        const monthPayments = payments.filter(p => {
          const paymentDate = new Date(p.payment_date)
          return paymentDate >= monthStart && paymentDate < monthEnd
        })
        
        const revenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
        const target = occupiedRooms * averageRent
        const prevMonthRevenue = i > 0 ? monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0 : revenue
        const growth = prevMonthRevenue > 0 ? ((revenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0
        
        monthlyRevenue.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue,
          target,
          growth
        })
      }

      const overview: OverviewMetrics = {
        total_properties: totalProperties,
        total_rooms: totalRooms,
        occupied_rooms: occupiedRooms,
        vacancy_rate: vacancyRate,
        total_revenue: totalRevenue,
        collection_rate: collectionRate,
        average_rent: averageRent,
        total_tenants: totalTenants,
        new_tenants_this_month: newTenants
      }

      const revenue: RevenueData = {
        monthly_revenue: monthlyRevenue,
        revenue_by_property: revenueByProperty,
        payment_methods: paymentMethodBreakdown
      }

      const occupancy: OccupancyData = {
        occupancy_by_property: occupancyByProperty
      }

      const trends: TrendData = {
        revenue_growth: monthlyRevenue.length > 1 ? 
          monthlyRevenue[monthlyRevenue.length - 1].growth : 0,
        tenant_growth: newTenants > 0 ? (newTenants / totalTenants) * 100 : 0
      }

      const reportData: ReportData = {
        overview,
        revenue,
        occupancy,
        trends
      }

      setReportData(reportData)
      console.log('✅ [MOBILE_REPORTS] Report data loaded')
      
    } catch (error) {
      console.error('❌ [MOBILE_REPORTS] Error fetching report data:', error)
      Alert.alert('Ikosa', 'Habaye ikosa mu gushaka amakuru y&apos;inyishu. Gerageza ukundi.')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchReportData()
    setRefreshing(false)
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return '#10b981'
    if (growth < 0) return '#ef4444'
    return '#64748b'
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return 'trending-up'
    if (growth < 0) return 'trending-down'
    return 'remove'
  }

  // Export handlers
  const handleExportReport = async () => {
    if (!reportData) return

    const reportText = `RAPORO Y'INYUBAKO - ${dateRange.toUpperCase()}\n\n` +
      `RUSANGE:\n` +
      `• Amafaranga yose: ${formatCurrency(reportData.overview.total_revenue)}\n` +
      `• Inyubako: ${reportData.overview.total_properties}\n` +
      `• Ibyumba: ${reportData.overview.total_rooms}\n` +
      `• Ibyumba byuzuye: ${reportData.overview.occupied_rooms}\n` +
      `• Igikerebanyo cy'ibusa: ${Math.round(reportData.overview.vacancy_rate)}%\n` +
      `• Igikerebanyo cy'icyishyu: ${Math.round(reportData.overview.collection_rate)}%\n` +
      `• Abakode: ${reportData.overview.total_tenants}\n\n` +
      `AMAFARANGA Y'INYUBAKO:\n` +
      reportData.revenue.revenue_by_property.slice(0, 5).map(p => 
        `• ${p.property_name}: ${formatCurrency(p.revenue)} (${Math.round(p.percentage)}%)`
      ).join('\n')

    try {
      await Share.share({
        message: reportText,
        title: 'Raporo y&apos;Inyubako'
      })
    } catch (error) {
      console.error('Error sharing report:', error)
      Alert.alert('Ikosa', 'Ntibyshoboye gusangira raporo.')
    }
  }

  const handleEmailReport = () => {
    if (!reportData) return

    const subject = 'Raporo y&apos;Inyubako - MYrent Rwanda'
    const body = `Muraho,\n\nNdaguhere raporo rusange y'inyubako zanjye:\n\n` +
      `Amafaranga yose: ${formatCurrency(reportData.overview.total_revenue)}\n` +
      `Inyubako: ${reportData.overview.total_properties}\n` +
      `Ibyumba: ${reportData.overview.total_rooms}\n` +
      `Ibyumba byuzuye: ${reportData.overview.occupied_rooms}\n` +
      `Igikerebanyo cy'ibusa: ${Math.round(reportData.overview.vacancy_rate)}%\n\n` +
      `Murakoze!\n`

    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    Linking.openURL(url).catch(err => {
      Alert.alert('Ikosa', 'Ntibyshoboye gufungura imeri.')
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Inyishu</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Kuraguza inyishu...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!reportData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Inyishu</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Ikosa mu gushaka amakuru</Text>
          <Text style={styles.errorMessage}>Ntibyshoboye gushaka amakuru y&apos;inyishu</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReportData}>
            <Text style={styles.retryButtonText}>Ongera ugerageze</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Inyishu</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleExportReport}>
            <Ionicons name="share-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
        }
      >
        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filterTitle}>Igihe</Text>
            <View style={styles.filterRow}>
              {(['week', 'month', 'quarter', 'year'] as const).map(period => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.filterChip,
                    dateRange === period && styles.filterChipActive
                  ]}
                  onPress={() => setDateRange(period)}
                >
                  <Text style={[
                    styles.filterChipText,
                    dateRange === period && styles.filterChipTextActive
                  ]}>
                    {period === 'week' ? 'Icyumweru' :
                     period === 'month' ? 'Ukwezi' :
                     period === 'quarter' ? 'Igihembwe' : 'Umwaka'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterTitle}>Ubwoko bw&apos;inyishu</Text>
            <View style={styles.filterRow}>
              {(['overview', 'revenue', 'occupancy'] as const).map(report => (
                <TouchableOpacity
                  key={report}
                  style={[
                    styles.filterChip,
                    selectedReport === report && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedReport(report)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedReport === report && styles.filterChipTextActive
                  ]}>
                    {report === 'overview' ? 'Rusange' :
                     report === 'revenue' ? 'Amafaranga' : 'Uko byuzuye'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Overview Report */}
        {selectedReport === 'overview' && (
          <View style={styles.reportSection}>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="cash" size={20} color="#10b981" />
                  <Text style={styles.metricValue}>{formatCurrency(reportData.overview.total_revenue)}</Text>
                </View>
                <Text style={styles.metricLabel}>Amafaranga yose</Text>
                <View style={styles.trendContainer}>
                  <Ionicons 
                    name={getGrowthIcon(reportData.trends.revenue_growth)} 
                    size={16} 
                    color={getGrowthColor(reportData.trends.revenue_growth)} 
                  />
                  <Text style={[styles.trendText, { color: getGrowthColor(reportData.trends.revenue_growth) }]}>
                    {reportData.trends.revenue_growth >= 0 ? '+' : ''}{Math.round(reportData.trends.revenue_growth)}%
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="business" size={20} color="#3b82f6" />
                  <Text style={styles.metricValue}>{reportData.overview.total_properties}</Text>
                </View>
                <Text style={styles.metricLabel}>Inyubako</Text>
                <Text style={styles.metricSubtext}>{reportData.overview.total_rooms} ibyumba</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="people" size={20} color="#8b5cf6" />
                  <Text style={styles.metricValue}>{reportData.overview.total_tenants}</Text>
                </View>
                <Text style={styles.metricLabel}>Abakode</Text>
                <View style={styles.trendContainer}>
                  <Ionicons 
                    name={getGrowthIcon(reportData.trends.tenant_growth)} 
                    size={16} 
                    color={getGrowthColor(reportData.trends.tenant_growth)} 
                  />
                  <Text style={[styles.trendText, { color: getGrowthColor(reportData.trends.tenant_growth) }]}>
                    {reportData.trends.tenant_growth >= 0 ? '+' : ''}{Math.round(reportData.trends.tenant_growth)}%
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="stats-chart" size={20} color="#f59e0b" />
                  <Text style={styles.metricValue}>{Math.round(100 - reportData.overview.vacancy_rate)}%</Text>
                </View>
                <Text style={styles.metricLabel}>Uko byuzuye</Text>
                <Text style={styles.metricSubtext}>
                  {reportData.overview.occupied_rooms}/{reportData.overview.total_rooms} ibyumba
                </Text>
              </View>
            </View>

            {/* Monthly Revenue Trend */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Amafaranga buri kwezi</Text>
              <View style={styles.chartContent}>
                {reportData.revenue.monthly_revenue.slice(-6).map((month, index) => (
                  <View key={month.month} style={styles.chartRow}>
                    <Text style={styles.chartMonth}>{month.month}</Text>
                    <View style={styles.chartValues}>
                      <Text style={styles.chartRevenue}>{formatCurrency(month.revenue)}</Text>
                      <View style={styles.chartGrowth}>
                        <Ionicons 
                          name={getGrowthIcon(month.growth)} 
                          size={14} 
                          color={getGrowthColor(month.growth)} 
                        />
                        <Text style={[styles.chartGrowthText, { color: getGrowthColor(month.growth) }]}>
                          {month.growth >= 0 ? '+' : ''}{Math.round(month.growth)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Top Properties */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Amafaranga y&apos;inyubako</Text>
              <View style={styles.chartContent}>
                {reportData.revenue.revenue_by_property.slice(0, 5).map((property, index) => (
                  <View key={property.property_name} style={styles.propertyRow}>
                    <View style={styles.propertyInfo}>
                      <View style={[styles.propertyRank, { 
                        backgroundColor: index === 0 ? '#fbbf24' : 
                                       index === 1 ? '#9ca3af' : 
                                       index === 2 ? '#fb7185' : '#3b82f6' 
                      }]}>
                        <Ionicons 
                          name={index === 0 ? 'trophy' : index === 1 ? 'medal' : index === 2 ? 'star' : 'business'} 
                          size={12} 
                          color="white" 
                        />
                      </View>
                      <View>
                        <Text style={styles.propertyName}>{property.property_name}</Text>
                        <Text style={styles.propertyPercentage}>{Math.round(property.percentage)}% y&apos;amafaranga yose</Text>
                      </View>
                    </View>
                    <Text style={styles.propertyRevenue}>{formatCurrency(property.revenue)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Revenue Report */}
        {selectedReport === 'revenue' && (
          <View style={styles.reportSection}>
            {/* Revenue Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Amafaranga y&apos;inyubako</Text>
              <Text style={styles.summaryValue}>{formatCurrency(reportData.overview.total_revenue)}</Text>
              <Text style={styles.summaryPeriod}>Mu gihe cy&apos;{
                dateRange === 'week' ? 'icyumweru' :
                dateRange === 'month' ? 'ukwezi' :
                dateRange === 'quarter' ? 'igihembwe' : 'umwaka'
              }</Text>
            </View>

            {/* Revenue by Property */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Amafaranga y&apos;inyubako</Text>
              <View style={styles.chartContent}>
                {reportData.revenue.revenue_by_property.map((property, index) => (
                  <View key={property.property_name} style={styles.revenuePropertyRow}>
                    <View style={styles.revenuePropertyInfo}>
                      <Text style={styles.revenuePropertyName}>{property.property_name}</Text>
                      <View style={styles.revenueBar}>
                        <View 
                          style={[styles.revenueBarFill, { width: `${property.percentage}%` }]} 
                        />
                      </View>
                    </View>
                    <View style={styles.revenuePropertyValues}>
                      <Text style={styles.revenuePropertyAmount}>{formatCurrency(property.revenue)}</Text>
                      <Text style={styles.revenuePropertyPercent}>{Math.round(property.percentage)}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Uburyo bwo kwishyura</Text>
              <View style={styles.chartContent}>
                {reportData.revenue.payment_methods.map((method, index) => (
                  <View key={method.method} style={styles.paymentMethodRow}>
                    <View style={styles.paymentMethodInfo}>
                      <Ionicons 
                        name={
                          method.method.toLowerCase().includes('mobile') ? 'phone-portrait' :
                          method.method.toLowerCase().includes('bank') ? 'card' :
                          method.method.toLowerCase().includes('cash') ? 'cash' : 'wallet'
                        } 
                        size={20} 
                        color="#6b7280" 
                      />
                      <View style={styles.paymentMethodDetails}>
                        <Text style={styles.paymentMethodName}>{method.method}</Text>
                        <Text style={styles.paymentMethodCount}>{method.count} ubwishyu</Text>
                      </View>
                    </View>
                    <View style={styles.paymentMethodValues}>
                      <Text style={styles.paymentMethodAmount}>{formatCurrency(method.amount)}</Text>
                      <Text style={styles.paymentMethodPercent}>{Math.round(method.percentage)}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Occupancy Report */}
        {selectedReport === 'occupancy' && (
          <View style={styles.reportSection}>
            {/* Occupancy Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Uko byuzuye rusange</Text>
              <Text style={styles.summaryValue}>{Math.round(100 - reportData.overview.vacancy_rate)}%</Text>
              <Text style={styles.summaryPeriod}>
                {reportData.overview.occupied_rooms}/{reportData.overview.total_rooms} ibyumba byuzuye
              </Text>
            </View>

            {/* Occupancy by Property */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Uko byuzuye buri nyubako</Text>
              <View style={styles.chartContent}>
                {reportData.occupancy.occupancy_by_property.map((property, index) => (
                  <View key={property.property_name} style={styles.occupancyPropertyRow}>
                    <View style={styles.occupancyPropertyInfo}>
                      <Text style={styles.occupancyPropertyName}>{property.property_name}</Text>
                      <View style={styles.occupancyBar}>
                        <View 
                          style={[
                            styles.occupancyBarFill, 
                            { 
                              width: `${property.occupancy_rate}%`,
                              backgroundColor: property.occupancy_rate >= 80 ? '#10b981' :
                                             property.occupancy_rate >= 60 ? '#f59e0b' : '#ef4444'
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.occupancyPropertyRooms}>
                        {property.occupied_rooms}/{property.total_rooms} ibyumba
                      </Text>
                    </View>
                    <Text style={[
                      styles.occupancyPropertyRate,
                      { 
                        color: property.occupancy_rate >= 80 ? '#10b981' :
                               property.occupancy_rate >= 60 ? '#f59e0b' : '#ef4444'
                      }
                    ]}>
                      {Math.round(property.occupancy_rate)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Export Options */}
        <View style={styles.exportCard}>
          <Text style={styles.exportTitle}>Gusohora inyishu</Text>
          <View style={styles.exportOptions}>
            <TouchableOpacity style={styles.exportButton} onPress={handleExportReport}>
              <Ionicons name="share-outline" size={20} color="#4f46e5" />
              <Text style={styles.exportButtonText}>Sangira raporo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={handleEmailReport}>
              <Ionicons name="mail-outline" size={20} color="#4f46e5" />
              <Text style={styles.exportButtonText}>Ohereza mu meri</Text>
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    flex: 1,
    padding: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5'
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280'
  },
  filterChipTextActive: {
    color: 'white'
  },
  reportSection: {
    gap: 20
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4
  },
  metricSubtext: {
    fontSize: 11,
    color: '#9ca3af'
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600'
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16
  },
  chartContent: {
    gap: 12
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  chartMonth: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    width: 80
  },
  chartValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  chartRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  chartGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  chartGrowthText: {
    fontSize: 12,
    fontWeight: '500'
  },
  propertyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  propertyRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  propertyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  propertyPercentage: {
    fontSize: 12,
    color: '#6b7280'
  },
  propertyRevenue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 20
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  summaryPeriod: {
    fontSize: 12,
    color: '#9ca3af'
  },
  revenuePropertyRow: {
    gap: 8
  },
  revenuePropertyInfo: {
    gap: 8
  },
  revenuePropertyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  revenueBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden'
  },
  revenueBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4
  },
  revenuePropertyValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  revenuePropertyAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  revenuePropertyPercent: {
    fontSize: 12,
    color: '#6b7280'
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  paymentMethodDetails: {
    gap: 2
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  paymentMethodCount: {
    fontSize: 12,
    color: '#6b7280'
  },
  paymentMethodValues: {
    alignItems: 'flex-end',
    gap: 2
  },
  paymentMethodAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  paymentMethodPercent: {
    fontSize: 12,
    color: '#6b7280'
  },
  occupancyPropertyRow: {
    gap: 8
  },
  occupancyPropertyInfo: {
    gap: 8
  },
  occupancyPropertyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  occupancyBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden'
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: 4
  },
  occupancyPropertyRooms: {
    fontSize: 12,
    color: '#6b7280'
  },
  occupancyPropertyRate: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right'
  },
  exportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16
  },
  exportOptions: {
    flexDirection: 'row',
    gap: 12
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4f46e5'
  }
})

export default ReportsPage 