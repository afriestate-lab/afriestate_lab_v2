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
  Dimensions
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/helpers'

const { width } = Dimensions.get('window')

interface PaymentDetail {
  id: string
  amount: number
  payment_date: string
  due_date: string
  payment_methods: string
  receipt_number: string
  status: 'completed' | 'pending' | 'overdue'
  tenant_name: string
  tenant_phone: string
  property_name: string
  room_number: string
  floor_number: number
  rent_amount: number
  late_fee: number
  days_late: number
  recorded_by: string
  notes: string
  created_at: string
}

interface PaymentSummary {
  total_amount: number
  total_payments: number
  completed_amount: number
  completed_count: number
  pending_amount: number
  pending_count: number
  overdue_amount: number
  overdue_count: number
  average_payment: number
  collection_rate: number
  on_time_rate: number
}

interface PaymentsPageProps {
  onBack: () => void
}

export default function PaymentsPage({ onBack }: PaymentsPageProps) {
  const [payments, setPayments] = useState<PaymentDetail[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all')
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'tenant' | 'status'>('date')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list')
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    checkUserAndLoadData()
  }, [filterPeriod])

  const checkUserAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        Alert.alert('Ikosa', 'Nta bucukumbuzi bwemerewe busanganywe.')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, role, full_name, email')
        .eq('id', user.id)
        .single()

      if (!userData) {
        Alert.alert('Ikosa', 'Nta makuru y\'umukoresha asanganywe.')
        return
      }

      setProfile(userData)
      await fetchPayments(userData)
    } catch (error) {
      console.error('Error checking user:', error)
      Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka amakuru yawe.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPayments = async (userProfile: any) => {
    try {
      setLoading(true)

      // Calculate date range based on filter
      const now = new Date()
      let startDate = new Date()
      
      switch (filterPeriod) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        case 'all':
        default:
          startDate = new Date('2020-01-01')
          break
      }

      // Fetch payments with comprehensive data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id, amount, payment_date, payment_methods, receipt_number,
          notes, recorded_by, created_at,
          tenants!inner (
            id, full_name, phone_number
          ),
          rooms!inner (
            id, room_number, floor_number, rent_amount,
            properties!inner (
              id, name, landlord_id
            )
          )
        `)
        .eq('rooms.properties.landlord_id', userProfile.id)
        .gte('payment_date', startDate.toISOString())
        .order('payment_date', { ascending: false })

      if (paymentsError) throw paymentsError

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([])
        setSummary({
          total_amount: 0,
          total_payments: 0,
          completed_amount: 0,
          completed_count: 0,
          pending_amount: 0,
          pending_count: 0,
          overdue_amount: 0,
          overdue_count: 0,
          average_payment: 0,
          collection_rate: 100,
          on_time_rate: 100
        })
        return
      }

      // Process payments data
      const processedPayments = paymentsData.map(payment => {
        const tenant = (payment.tenants as any)
        const room = (payment.rooms as any)
        const property = (room.properties as any)

        // Determine payment status based on dates
        const paymentDate = new Date(payment.payment_date)
        const now = new Date()
        let status: 'completed' | 'pending' | 'overdue' = 'completed'
        
        // For this implementation, we'll consider all fetched payments as completed
        // In a real scenario, you'd have due dates and pending payments logic

        return {
          id: payment.id,
          amount: payment.amount,
          payment_date: payment.payment_date,
          due_date: payment.payment_date, // Simplified - would normally be separate
          payment_methods: payment.payment_methods || 'Ntabwo byasobanuwe',
          receipt_number: payment.receipt_number || `RCP-${payment.id.slice(-6)}`,
          status,
          tenant_name: (tenant as any).full_name,
          tenant_phone: (tenant as any).phone_number,
          property_name: property.name,
          room_number: (room as any).room_number,
          floor_number: (room as any).floor_number,
          rent_amount: (room as any).rent_amount,
          late_fee: 0, // Would be calculated based on payment date vs due date
          days_late: 0,
          recorded_by: payment.recorded_by || 'System',
          notes: payment.notes || '',
          created_at: payment.created_at
        } as PaymentDetail
      })

      // Calculate summary statistics
      const totalAmount = processedPayments.reduce((sum, p) => sum + p.amount, 0)
      const totalPayments = processedPayments.length
      const completedPayments = processedPayments.filter(p => p.status === 'completed')
      const pendingPayments = processedPayments.filter(p => p.status === 'pending')
      const overduePayments = processedPayments.filter(p => p.status === 'overdue')

      const paymentSummary: PaymentSummary = {
        total_amount: totalAmount,
        total_payments: totalPayments,
        completed_amount: completedPayments.reduce((sum, p) => sum + p.amount, 0),
        completed_count: completedPayments.length,
        pending_amount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        pending_count: pendingPayments.length,
        overdue_amount: overduePayments.reduce((sum, p) => sum + p.amount, 0),
        overdue_count: overduePayments.length,
        average_payment: totalPayments > 0 ? totalAmount / totalPayments : 0,
        collection_rate: totalPayments > 0 ? (completedPayments.length / totalPayments) * 100 : 100,
        on_time_rate: totalPayments > 0 ? (completedPayments.length / totalPayments) * 100 : 100
      }

      // Sort payments
      let sortedPayments = [...processedPayments]
      switch (sortBy) {
        case 'date':
          sortedPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
          break
        case 'amount':
          sortedPayments.sort((a, b) => b.amount - a.amount)
          break
        case 'tenant':
          sortedPayments.sort((a, b) => a.tenant_name.localeCompare(b.tenant_name))
          break
        case 'status':
          sortedPayments.sort((a, b) => a.status.localeCompare(b.status))
          break
      }

      setPayments(sortedPayments)
      setSummary(paymentSummary)
    } catch (error) {
      console.error('Error fetching payments:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura amakuru y\'ubwishyu.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    if (!profile) return
    setRefreshing(true)
    await fetchPayments(profile)
    setRefreshing(false)
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.receipt_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || payment.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981'
      case 'pending': return '#f59e0b'
      case 'overdue': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Byarangiye'
      case 'pending': return 'Birategereje'
      case 'overdue': return 'Byarenze igihe'
      default: return 'Kitazwi'
    }
  }

  const getPeriodText = (period: string) => {
    switch (period) {
      case 'today': return 'Uyu munsi'
      case 'week': return 'Icyumweru gishize'
      case 'month': return 'Ukwezi gushize'
      case 'year': return 'Umwaka ushize'
      case 'all': return 'Byose'
      default: return 'Byose'
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Gukura amakuru y&apos;ubwishyu...</Text>
      </View>
    )
  }

  // Payment Details View
  if (selectedPayment) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedPayment(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Amakuru y&apos;ubwishyu</Text>
            <Text style={styles.headerSubtitle}>{selectedPayment.receipt_number}</Text>
          </View>
          
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Payment Info */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amakuru y&apos;ubwishyu</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Umubare w&apos;ubwishyu:</Text>
              <Text style={styles.infoValue}>{selectedPayment.receipt_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Amafaranga:</Text>
              <Text style={[styles.infoValue, { color: '#10b981', fontWeight: 'bold' }]}>
                {formatCurrency(selectedPayment.amount)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Italiki y&apos;ubwishyu:</Text>
              <Text style={styles.infoValue}>{formatDate(selectedPayment.payment_date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Uburyo bwo kwishyura:</Text>
              <Text style={styles.infoValue}>{selectedPayment.payment_methods}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Uko bimeze:</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(selectedPayment.status) }
              ]}>
                <Text style={styles.statusText}>
                  {getStatusText(selectedPayment.status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Tenant Info */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amakuru y&apos;umukode</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Izina:</Text>
              <Text style={styles.infoValue}>{selectedPayment.tenant_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefoni:</Text>
              <Text style={styles.infoValue}>{selectedPayment.tenant_phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inyubako:</Text>
              <Text style={styles.infoValue}>{selectedPayment.property_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Icyumba:</Text>
              <Text style={styles.infoValue}>{selectedPayment.room_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Urubuga:</Text>
              <Text style={styles.infoValue}>{selectedPayment.floor_number}</Text>
            </View>
          </View>

          {/* Additional Notes */}
          {selectedPayment.notes && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Inyandiko</Text>
              <Text style={styles.notesText}>{selectedPayment.notes}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Main Payments View
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
          <Text style={styles.headerTitle}>Ubwishyu</Text>
          <Text style={styles.headerSubtitle}>
            {filteredPayments.length} ubwishyu • {getPeriodText(filterPeriod)}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'list' ? 'analytics' : 'list')}
        >
          <Ionicons 
            name={viewMode === 'list' ? 'bar-chart' : 'list'} 
            size={20} 
            color="#6b7280" 
          />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            Urutonde
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'analytics' && styles.toggleButtonActive]}
          onPress={() => setViewMode('analytics')}
        >
          <Text style={[styles.toggleText, viewMode === 'analytics' && styles.toggleTextActive]}>
            Imibare
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'analytics' && summary ? (
        // Analytics View
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{formatCurrency(summary.total_amount)}</Text>
              <Text style={styles.summaryLabel}>Amafaranga yose</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.total_payments}</Text>
              <Text style={styles.summaryLabel}>Ubwishyu bwose</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{formatCurrency(summary.average_payment)}</Text>
              <Text style={styles.summaryLabel}>Ikigereranyo</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{Math.round(summary.collection_rate)}%</Text>
              <Text style={styles.summaryLabel}>Igipimo cy&apos;ukusanya</Text>
            </View>
          </View>

          {/* Status Breakdown */}
          <View style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>Uko ubwishyu buhagaze</Text>
            
            <View style={styles.statusItem}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.statusLabel}>Byarangiye</Text>
              </View>
              <View style={styles.statusValues}>
                <Text style={styles.statusCount}>{summary.completed_count}</Text>
                <Text style={styles.statusAmount}>{formatCurrency(summary.completed_amount)}</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.statusLabel}>Birategereje</Text>
              </View>
              <View style={styles.statusValues}>
                <Text style={styles.statusCount}>{summary.pending_count}</Text>
                <Text style={styles.statusAmount}>{formatCurrency(summary.pending_amount)}</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.statusLabel}>Byarenze igihe</Text>
              </View>
              <View style={styles.statusValues}>
                <Text style={styles.statusCount}>{summary.overdue_count}</Text>
                <Text style={styles.statusAmount}>{formatCurrency(summary.overdue_amount)}</Text>
              </View>
            </View>
          </View>

          {/* Period Filter */}
          <View style={styles.periodCard}>
            <Text style={styles.periodTitle}>Hitamo igihe</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: 'today', label: 'Uyu munsi' },
                { key: 'week', label: 'Icyumweru' },
                { key: 'month', label: 'Ukwezi' },
                { key: 'year', label: 'Umwaka' },
                { key: 'all', label: 'Byose' }
              ].map(period => (
                <TouchableOpacity
                  key={period.key}
                  style={[
                    styles.periodChip,
                    filterPeriod === period.key && styles.periodChipActive
                  ]}
                  onPress={() => setFilterPeriod(period.key as any)}
                >
                  <Text style={[
                    styles.periodChipText,
                    filterPeriod === period.key && styles.periodChipTextActive
                  ]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      ) : (
        // List View
        <>
          {/* Search and Filters */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Shakira ubwishyu..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <TouchableOpacity 
              style={styles.filterToggle}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="filter" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Filter Options */}
          {showFilters && (
            <View style={styles.filterContainer}>
              <Text style={styles.filterTitle}>Shakisha ukurikije:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  { key: 'all', label: 'Byose' },
                  { key: 'completed', label: 'Byarangiye' },
                  { key: 'pending', label: 'Birategereje' },
                  { key: 'overdue', label: 'Byarenze igihe' }
                ].map(filter => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      filterStatus === filter.key && styles.filterChipActive
                    ]}
                    onPress={() => setFilterStatus(filter.key as any)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterStatus === filter.key && styles.filterChipTextActive
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Payments List */}
          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredPayments.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={styles.paymentCard}
                onPress={() => setSelectedPayment(payment)}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                    <Text style={styles.paymentTenant}>{payment.tenant_name}</Text>
                    <Text style={styles.paymentProperty}>
                      {payment.property_name} • Icyumba {payment.room_number}
                    </Text>
                  </View>
                  
                  <View style={styles.paymentMeta}>
                    <View style={[
                      styles.paymentStatusBadge,
                      { backgroundColor: getStatusColor(payment.status) }
                    ]}>
                      <Text style={styles.paymentStatusText}>
                        {getStatusText(payment.status)}
                      </Text>
                    </View>
                    <Text style={styles.paymentDate}>
                      {formatDate(payment.payment_date)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.paymentFooter}>
                  <Text style={styles.paymentMethod}>{payment.payment_methods}</Text>
                  <Text style={styles.paymentReceipt}>{payment.receipt_number}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))}

            {filteredPayments.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="card" size={64} color="#9ca3af" />
                <Text style={styles.emptyTitle}>Nta bwishyu busanzwe</Text>
                <Text style={styles.emptySubtitle}>
                  Nta makuru y&apos;ubwishyu yasanzwe mu gihe cyahiswemo.
                </Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
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
  viewModeButton: {
    padding: 8
  },
  shareButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 4
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6'
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600'
  },
  toggleTextActive: {
    color: 'white'
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    alignItems: 'center'
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8
  },
  filterToggle: {
    padding: 8
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
  
  // Analytics View Styles
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 12,
    gap: 8
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 40) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center'
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151'
  },
  statusValues: {
    alignItems: 'flex-end'
  },
  statusCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  statusAmount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  periodCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8
  },
  periodChipActive: {
    backgroundColor: '#3b82f6'
  },
  periodChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600'
  },
  periodChipTextActive: {
    color: 'white'
  },
  
  // List View Styles
  paymentCard: {
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
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  paymentInfo: {
    flex: 1
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981'
  },
  paymentTenant: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 4
  },
  paymentProperty: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  paymentMeta: {
    alignItems: 'flex-end'
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4
  },
  paymentStatusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600'
  },
  paymentDate: {
    fontSize: 12,
    color: '#6b7280'
  },
  paymentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12
  },
  paymentMethod: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1
  },
  paymentReceipt: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 8
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
  
  // Payment Details Styles
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600'
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20
  }
}) 