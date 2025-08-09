import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  RefreshControl, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/languageContext'
import { formatCurrency, formatDate } from '@/lib/helpers'

interface TenantDetail {
  id: string
  full_name: string
  phone_number: string
  email: string
  national_id: string
  emergency_contact: string
  property_name: string
  room_number: string
  floor_number: number
  rent_amount: number
  move_in_date: string
  lease_end_date: string
  payment_performance: 'excellent' | 'good' | 'moderate' | 'poor'
  payment_score: number
  total_payments: number
  overdue_payments: number
  on_time_payments: number
  late_payments: number
  average_delay_days: number
  total_amount_paid: number
  outstanding_balance: number
  last_payment_date: string
  last_payment_amount: number
  next_due_date: string
  payment_history: PaymentRecord[]
  is_active: boolean
}

interface PaymentRecord {
  id: string
  amount: number
  payment_date: string
  due_date: string
  status: 'paid' | 'late' | 'overdue'
  payment_method: string
  receipt_number: string
}

interface TenantsPageProps {
  onBack: () => void
}

export default function TenantsPage({ onBack }: TenantsPageProps) {
  const { t } = useLanguage()
  const [tenants, setTenants] = useState<TenantDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPerformance, setFilterPerformance] = useState<'all' | 'excellent' | 'good' | 'moderate' | 'poor'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'performance' | 'balance' | 'recent'>('performance')
  const [showFilters, setShowFilters] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    checkUserAndLoadData()
  }, [])

  const checkUserAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        Alert.alert(t('alertError'), t('noAuthAccess'))
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, role, full_name, email')
        .eq('id', user.id)
        .single()

      if (!userData) {
        Alert.alert(t('alertError'), t('noUserInfoAvailable'))
        return
      }

      setProfile(userData)
      await fetchTenants(userData)
    } catch (error) {
      console.error('Error checking user:', error)
      Alert.alert(t('alertError'), t('errorFetchingYourInfo'))
    } finally {
      setLoading(false)
    }
  }

  const fetchTenants = async (userProfile: any) => {
    try {
      setLoading(true)

      // Fetch tenants with comprehensive data using RPC to avoid RLS recursion
      const { data: tenantsData, error: tenantsError } = await supabase
        .rpc('get_landlord_tenants', {
          p_landlord_id: userProfile.id
        })

      if (tenantsError) throw tenantsError

      if (!tenantsData || tenantsData.length === 0) {
        setTenants([])
        return
      }

      // Process tenant data from RPC function
      const detailedTenants = tenantsData.map((tenantData: any) => {
        // Calculate payment performance metrics
        const totalPayments = tenantData.total_payments || 0
        const totalAmountPaid = tenantData.total_amount_paid || 0
        
        // Calculate payment score and performance level (simplified)
        let paymentScore = totalPayments > 0 ? 85 : 50 // Default scoring
        
        let performance: 'excellent' | 'good' | 'moderate' | 'poor'
        if (paymentScore >= 90) performance = 'excellent'
        else if (paymentScore >= 75) performance = 'good'
        else if (paymentScore >= 60) performance = 'moderate'
        else performance = 'poor'

        // Calculate outstanding balance (simplified)
        const now = new Date()
        const monthlyRent = tenantData.rent_amount
        const moveInDate = new Date(tenantData.move_in_date)
        const expectedPayments = Math.ceil((now.getTime() - moveInDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        const expectedTotal = expectedPayments * monthlyRent
        const outstandingBalance = Math.max(0, expectedTotal - totalAmountPaid)

        return {
          id: tenantData.id,
          full_name: tenantData.full_name,
          phone_number: tenantData.phone_number,
          email: tenantData.email,
          national_id: tenantData.national_id,
          emergency_contact: tenantData.emergency_contact,
          property_name: tenantData.property_name,
          room_number: tenantData.room_number,
          floor_number: tenantData.floor_number,
          rent_amount: tenantData.rent_amount,
          move_in_date: tenantData.move_in_date,
          lease_end_date: tenantData.lease_end_date || '',
          payment_performance: performance,
          payment_score: Math.round(paymentScore),
          total_payments: totalPayments,
          overdue_payments: 0, // Would need to be calculated
          on_time_payments: totalPayments, // Simplified
          late_payments: 0, // Would need to be calculated
          average_delay_days: 0, // Would need to be calculated
          total_amount_paid: totalAmountPaid,
          outstanding_balance: outstandingBalance,
          last_payment_date: tenantData.last_payment_date,
          last_payment_amount: tenantData.last_payment_amount,
          next_due_date: tenantData.next_due_date ? new Date(tenantData.next_due_date).toISOString() : new Date().toISOString(),
          payment_history: [], // Simplified - would need separate RPC call
          is_active: tenantData.is_active
        } as TenantDetail
      })

      // Sort tenants based on selected criteria
      let sortedTenants = [...detailedTenants]
      switch (sortBy) {
        case 'name':
          sortedTenants.sort((a, b) => a.full_name.localeCompare(b.full_name))
          break
        case 'performance':
          sortedTenants.sort((a, b) => b.payment_score - a.payment_score)
          break
        case 'balance':
          sortedTenants.sort((a, b) => b.outstanding_balance - a.outstanding_balance)
          break
        case 'recent':
          sortedTenants.sort((a, b) => 
            new Date(b.last_payment_date || 0).getTime() - new Date(a.last_payment_date || 0).getTime()
          )
          break
      }

      setTenants(sortedTenants)
    } catch (error) {
      console.error('Error fetching tenants:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura amakuru y\'abakode.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    if (!profile) return
    setRefreshing(true)
    await fetchTenants(profile)
    setRefreshing(false)
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.phone_number.includes(searchTerm) ||
                         tenant.property_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterPerformance === 'all' || tenant.payment_performance === filterPerformance
    
    return matchesSearch && matchesFilter
  })

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return '#10b981'
      case 'good': return '#3b82f6'
      case 'moderate': return '#f59e0b'
      case 'poor': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getPerformanceText = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'Byiza cyane'
      case 'good': return 'Byiza'
      case 'moderate': return 'Byiza gusa'
      case 'poor': return 'Bibi'
      default: return 'Kitazwi'
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Gukura amakuru y&apos;abakode...</Text>
      </View>
    )
  }

  // Tenant Details View
  if (selectedTenant) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedTenant(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedTenant.full_name}</Text>
            <Text style={styles.headerSubtitle}>Icyumba {selectedTenant.room_number}</Text>
          </View>
          
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Tenant Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedTenant.payment_score}</Text>
            <Text style={styles.statLabel}>Amanota</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedTenant.on_time_payments}</Text>
            <Text style={styles.statLabel}>Byishyuwe kugiti cyawo</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedTenant.late_payments}</Text>
            <Text style={styles.statLabel}>Byatinze</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(selectedTenant.outstanding_balance)}</Text>
            <Text style={styles.statLabel}>Ideni</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Tenant Info */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amakuru y&apos;umukode</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Izina:</Text>
              <Text style={styles.infoValue}>{selectedTenant.full_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefoni:</Text>
              <Text style={styles.infoValue}>{selectedTenant.phone_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{selectedTenant.email || 'Ntabwo yasabwe'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Indangamuntu:</Text>
              <Text style={styles.infoValue}>{selectedTenant.national_id || 'Ntabwo yasabwe'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ubwo yinjiye:</Text>
              <Text style={styles.infoValue}>{formatDate(selectedTenant.move_in_date)}</Text>
            </View>
          </View>

          {/* Payment Performance */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Imyitwarire y&apos;ubwishyu</Text>
            <View style={styles.performanceContainer}>
              <View style={[
                styles.performanceBadge,
                { backgroundColor: getPerformanceColor(selectedTenant.payment_performance) }
              ]}>
                <Text style={styles.performanceText}>
                  {getPerformanceText(selectedTenant.payment_performance)}
                </Text>
              </View>
              <Text style={styles.performanceScore}>
                {selectedTenant.payment_score}/100
              </Text>
            </View>
            
            <View style={styles.performanceStats}>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>{selectedTenant.total_payments}</Text>
                <Text style={styles.performanceStatLabel}>Kwishyura kwose</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>{selectedTenant.on_time_payments}</Text>
                <Text style={styles.performanceStatLabel}>Kugiti cyawo</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>{selectedTenant.average_delay_days}</Text>
                <Text style={styles.performanceStatLabel}>Ikigereranyo cy&apos;ubatindi</Text>
              </View>
            </View>
          </View>

          {/* Payment History */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amateka y&apos;ubwishyu</Text>
            {selectedTenant.payment_history.length > 0 ? (
              selectedTenant.payment_history.slice(0, 5).map((payment, index) => (
                <View key={`payment-${payment.id}-${index}`} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                    <Text style={styles.paymentDate}>
                      {formatDate(payment.payment_date)}
                    </Text>
                  </View>
                  <Text style={styles.paymentMethod}>
                    {payment.payment_method} • {payment.receipt_number}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nta kwishyura kwakorewe</Text>
            )}
          </View>

          {/* Property Info */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amakuru y&apos;inyubako</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inyubako:</Text>
              <Text style={styles.infoValue}>{selectedTenant.property_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Icyumba:</Text>
              <Text style={styles.infoValue}>{selectedTenant.room_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Urubuga:</Text>
              <Text style={styles.infoValue}>{selectedTenant.floor_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ubukode bwa buri kwezi:</Text>
              <Text style={styles.infoValue}>{formatCurrency(selectedTenant.rent_amount)}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Tenants List View
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Abakode Banjye</Text>
          <Text style={styles.headerSubtitle}>{filteredTenants.length} abakode</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Shakira abakode..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Filter Options */}
      {showFilters && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Shakisha ukurikije:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'Bose' },
              { key: 'excellent', label: 'Byiza cyane' },
              { key: 'good', label: 'Byiza' },
              { key: 'moderate', label: 'Byiza gusa' },
              { key: 'poor', label: 'Bibi' }
            ].map((filter, index) => (
              <TouchableOpacity
                key={`filter-${filter.key}-${index}`}
                style={[
                  styles.filterChip,
                  filterPerformance === filter.key && styles.filterChipActive
                ]}
                onPress={() => setFilterPerformance(filter.key as any)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterPerformance === filter.key && styles.filterChipTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tenants List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTenants.map((tenant, index) => (
          <TouchableOpacity
            key={`tenant-${tenant.id}-${tenant.room_number}-${index}`}
            style={styles.tenantCard}
            onPress={() => setSelectedTenant(tenant)}
          >
            <View style={styles.tenantHeader}>
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{tenant.full_name}</Text>
                <Text style={styles.tenantProperty}>
                  {tenant.property_name} • Icyumba {tenant.room_number}
                </Text>
                <Text style={styles.tenantPhone}>{tenant.phone_number}</Text>
              </View>
              
              <View style={styles.tenantStats}>
                <View style={[
                  styles.performanceIndicator,
                  { backgroundColor: getPerformanceColor(tenant.payment_performance) }
                ]}>
                  <Text style={styles.performanceScore}>{tenant.payment_score}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.tenantFooter}>
              <View style={styles.tenantMetric}>
                <Text style={styles.tenantMetricValue}>{formatCurrency(tenant.rent_amount)}</Text>
                <Text style={styles.tenantMetricLabel}>Ubukode bwa buri kwezi</Text>
              </View>
              
              {tenant.outstanding_balance > 0 && (
                <View style={styles.tenantMetric}>
                  <Text style={[styles.tenantMetricValue, { color: '#ef4444' }]}>
                    {formatCurrency(tenant.outstanding_balance)}
                  </Text>
                  <Text style={styles.tenantMetricLabel}>Ideni</Text>
                </View>
              )}
              
              <View style={styles.tenantMetric}>
                <Text style={styles.tenantMetricValue}>
                  {tenant.last_payment_date ? formatDate(tenant.last_payment_date) : 'Ntawe'}
                </Text>
                <Text style={styles.tenantMetricLabel}>Ubwishyu bwa nyuma</Text>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        ))}

        {filteredTenants.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta bakode basanzwe</Text>
            <Text style={styles.emptySubtitle}>
              Ongeramo abakode ba mbere kugira ngo utangire gucuruza.
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerContent: {
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  filterButton: {
    padding: 8
  },
  callButton: {
    backgroundColor: '#10b981',
    padding: 8,
    borderRadius: 8
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  filterTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: '#3b82f6'
  },
  filterChipText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: 'white'
  },
  content: {
    flex: 1,
    paddingHorizontal: 16
  },
  tenantCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  tenantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  tenantInfo: {
    flex: 1
  },
  tenantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  tenantProperty: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  tenantPhone: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 2
  },
  tenantStats: {
    alignItems: 'center'
  },
  performanceIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  performanceScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white'
  },
  tenantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12
  },
  tenantMetric: {
    alignItems: 'center',
    flex: 1
  },
  tenantMetricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  tenantMetricLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20
  },
  
  // Tenant Details Styles
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white'
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center'
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1
  },
  infoValue: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right'
  },
  performanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  performanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  performanceText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600'
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  performanceStat: {
    alignItems: 'center'
  },
  performanceStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  performanceStatLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center'
  },
  paymentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981'
  },
  paymentDate: {
    fontSize: 12,
    color: '#6b7280'
  },
  paymentMethod: {
    fontSize: 10,
    color: '#6b7280'
  }
}) 