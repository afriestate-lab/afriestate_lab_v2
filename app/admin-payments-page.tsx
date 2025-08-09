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
  TextInput,
  FlatList
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../src/lib/supabase'
import { formatDate, formatCurrency } from '../src/lib/helpers'
import { useLanguage } from '@/lib/languageContext'

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  receipt_number: string
  notes: string
  status: string
  created_at: string
  tenant_name: string
  property_name: string
  room_number: string
  landlord_name: string
  admin_approved: boolean
  admin_approved_at: string | null
}

interface AdminPaymentsPageProps {
  onBack: () => void
}

export default function AdminPaymentsPage({ onBack }: AdminPaymentsPageProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all')
  const { t } = useLanguage()

  useEffect(() => {
    fetchAllPayments()
  }, [])

  const fetchAllPayments = async () => {
    try {
      setLoading(true)
      
      // Use the admin RPC function instead of direct table query
      const { data: paymentsData, error } = await supabase
        .rpc('get_all_payments_admin')

      if (error) throw error

      const transformedPayments = paymentsData?.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method || 'Unknown',
        receipt_number: payment.receipt_number,
        notes: payment.notes || '',
        status: payment.status,
        created_at: payment.created_at,
        tenant_name: payment.tenant_name,
        property_name: payment.property_name,
        room_number: payment.room_number,
        landlord_name: payment.landlord_name,
        admin_approved: payment.admin_approved || false,
        admin_approved_at: payment.admin_approved_at
      })) || []

      setPayments(transformedPayments)
    } catch (error) {
      console.error('Error fetching payments:', error)
      Alert.alert(t('alertError'), t('unableFetchAllPayments'))
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAllPayments()
    setRefreshing(false)
  }

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('payments')
        .update({
          admin_approved: true,
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: user?.id
        })
        .eq('id', paymentId)

      if (error) throw error

      Alert.alert(t('alertSuccess'), t('paymentApprovedSuccess'))
      await fetchAllPayments()
    } catch (error) {
      console.error('Error approving payment:', error)
      Alert.alert(t('alertError'), t('unableApprovePayment'))
    }
  }

  const getFilteredPayments = () => {
    let filtered = payments.filter(payment =>
      payment.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.landlord_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.receipt_number.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (filterStatus === 'pending') {
      filtered = filtered.filter(p => !p.admin_approved)
    } else if (filterStatus === 'approved') {
      filtered = filtered.filter(p => p.admin_approved)
    }

    return filtered
  }

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View style={[
      styles.paymentCard,
      item.admin_approved && styles.approvedCard
    ]}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentIcon}>
          <Ionicons 
            name={item.admin_approved ? "checkmark-circle" : "time"} 
            size={24} 
            color={item.admin_approved ? "#10b981" : "#f59e0b"} 
          />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.tenantName}>{item.tenant_name}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.admin_approved ? styles.approvedBadge : styles.pendingBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.admin_approved ? styles.approvedText : styles.pendingText
          ]}>
            {item.admin_approved ? 'Yemejwe' : 'Itegerejwe'}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="business" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.property_name} - Icyumba {item.room_number}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person-circle" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Nyirinyubako: {item.landlord_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Uburyo: {item.payment_method}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Itariki: {formatDate(item.payment_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="receipt" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Receipti: {item.receipt_number}</Text>
        </View>
        {item.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={16} color="#6b7280" />
            <Text style={styles.detailText}>Ibisobanuro: {item.notes}</Text>
          </View>
        )}
      </View>

      {!item.admin_approved && (
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApprovePayment(item.id)}
        >
          <Ionicons name="checkmark" size={16} color="white" />
          <Text style={styles.approveButtonText}>Emeza ubwishyu</Text>
        </TouchableOpacity>
      )}

      {item.admin_approved && item.admin_approved_at && (
        <View style={styles.paymentFooter}>
          <Text style={styles.approvedDate}>
            Yemejwe: {formatDate(item.admin_approved_at)}
          </Text>
        </View>
      )}
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ubwishyu Bwose</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Gukura ubwishyu bwose...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const filteredPayments = getFilteredPayments()
  const pendingPayments = payments.filter(p => !p.admin_approved).length
  const approvedPayments = payments.filter(p => p.admin_approved).length
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ubwishyu Bwose</Text>
        <View style={styles.headerStats}>
          <Text style={styles.totalCount}>{payments.length}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingPayments}</Text>
          <Text style={styles.statLabel}>Bitegerejwe</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{approvedPayments}</Text>
          <Text style={styles.statLabel}>Byemejwe</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatCurrency(totalAmount)}</Text>
          <Text style={styles.statLabel}>Amafaranga yose</Text>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Shakisha ubwishyu..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
          {[
            { key: 'all', label: 'Byose' },
            { key: 'pending', label: 'Bitegerejwe' },
            { key: 'approved', label: 'Byemejwe' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                filterStatus === filter.key && styles.activeFilterButton
              ]}
              onPress={() => setFilterStatus(filter.key as any)}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === filter.key && styles.activeFilterButtonText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentItem}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta bwishyu buboneka</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? 'Gerageza gushakisha ikindi' : 'Nta bwishyu bwakorewe kuri uru rusobe'}
            </Text>
          </View>
        }
      />
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
  headerStats: {
    alignItems: 'center'
  },
  totalCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981'
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280'
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937'
  },
  statusFilters: {
    flexDirection: 'row'
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  activeFilterButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500'
  },
  activeFilterButtonText: {
    color: 'white'
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100
  },
  paymentCard: {
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
  approvedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981'
  },
  paymentHeader: {
    flexDirection: 'row',
    marginBottom: 16
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  paymentInfo: {
    flex: 1
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  tenantName: {
    fontSize: 14,
    color: '#6b7280'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  approvedBadge: {
    backgroundColor: '#dcfce7'
  },
  pendingBadge: {
    backgroundColor: '#fef3c7'
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600'
  },
  approvedText: {
    color: '#16a34a'
  },
  pendingText: {
    color: '#d97706'
  },
  paymentDetails: {
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151'
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  paymentFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  approvedDate: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center',
    fontWeight: '500'
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center'
  }
}) 