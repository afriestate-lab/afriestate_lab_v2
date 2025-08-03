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
import { formatDate } from '../src/lib/helpers'

interface Tenant {
  id: string
  full_name: string
  phone_number: string
  email: string
  id_number: string
  emergency_contact: string
  created_at: string
  property_name: string
  room_number: string
  landlord_name: string
  move_in_date: string
  rent_amount: number
  is_active: boolean
}

interface AdminTenantsPageProps {
  onBack: () => void
}

export default function AdminTenantsPage({ onBack }: AdminTenantsPageProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAllTenants()
  }, [])

  const fetchAllTenants = async () => {
    try {
      setLoading(true)
      
      // Use the admin RPC function instead of direct table query
      const { data: tenantsData, error } = await supabase
        .rpc('get_all_tenants_admin')

      if (error) throw error

      // Remove duplicates based on tenant ID and create unique records
      const uniqueTenants = new Map()
      
      tenantsData?.forEach((tenant: any) => {
        const key = tenant.id
        if (!uniqueTenants.has(key)) {
          uniqueTenants.set(key, {
            id: tenant.id,
            full_name: tenant.full_name,
            phone_number: tenant.phone_number,
            email: tenant.email || '',
            id_number: tenant.id_number,
            emergency_contact: tenant.emergency_contact || '',
            created_at: tenant.created_at,
            property_name: tenant.property_name,
            room_number: tenant.room_number,
            landlord_name: tenant.landlord_name,
            move_in_date: tenant.move_in_date,
            rent_amount: tenant.rent_amount,
            is_active: tenant.is_active
          })
        }
      })

      const transformedTenants = Array.from(uniqueTenants.values())
      setTenants(transformedTenants)
    } catch (error) {
      console.error('Error fetching tenants:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura abakode bose.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAllTenants()
    setRefreshing(false)
  }

  const getFilteredTenants = () => {
    return tenants.filter(tenant =>
      tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone_number.includes(searchTerm) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.landlord_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const renderTenantItem = ({ item }: { item: Tenant }) => (
    <View style={styles.tenantCard}>
      <View style={styles.tenantHeader}>
        <View style={styles.tenantIcon}>
          <Ionicons name="person" size={24} color="#8b5cf6" />
        </View>
        <View style={styles.tenantInfo}>
          <Text style={styles.tenantName}>{item.full_name}</Text>
          <Text style={styles.tenantContact}>{item.phone_number}</Text>
          {item.email && <Text style={styles.tenantEmail}>{item.email}</Text>}
        </View>
        <View style={[
          styles.statusBadge,
          item.is_active ? styles.activeBadge : styles.inactiveBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.is_active ? styles.activeText : styles.inactiveText
          ]}>
            {item.is_active ? 'Aracyatuye' : 'Ntaracyatuye'}
          </Text>
        </View>
      </View>

      <View style={styles.tenantDetails}>
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
          <Text style={styles.detailText}>Ubukode: {item.rent_amount?.toLocaleString()} RWF</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Yinjiyeho: {formatDate(item.move_in_date)}</Text>
        </View>
        {item.id_number && (
          <View style={styles.detailRow}>
            <Ionicons name="document" size={16} color="#6b7280" />
            <Text style={styles.detailText}>Indangamuntu: {item.id_number}</Text>
          </View>
        )}
      </View>

      <View style={styles.tenantFooter}>
        <Text style={styles.createdDate}>
          Yiyandikishije: {formatDate(item.created_at)}
        </Text>
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Abakode Bose</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Gukura abakode bose...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const filteredTenants = getFilteredTenants()
  const activeTenants = tenants.filter(t => t.is_active).length
  const inactiveTenants = tenants.filter(t => !t.is_active).length

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abakode Bose</Text>
        <View style={styles.headerStats}>
          <Text style={styles.totalCount}>{tenants.length}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeTenants}</Text>
          <Text style={styles.statLabel}>Baracyatuye</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{inactiveTenants}</Text>
          <Text style={styles.statLabel}>Ntibacyatuye</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Shakisha umukode, telefoni, cyangwa inyubako..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <FlatList
        data={filteredTenants}
        renderItem={renderTenantItem}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta bakode baboneka</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? 'Gerageza gushakisha ikindi' : 'Nta bakode biyandikishije kuri uru rusobe'}
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
    color: '#8b5cf6'
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
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
  listContainer: {
    padding: 16,
    paddingBottom: 100
  },
  tenantCard: {
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
  tenantHeader: {
    flexDirection: 'row',
    marginBottom: 16
  },
  tenantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  tenantInfo: {
    flex: 1
  },
  tenantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  tenantContact: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2
  },
  tenantEmail: {
    fontSize: 12,
    color: '#9ca3af'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  activeBadge: {
    backgroundColor: '#dcfce7'
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2'
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600'
  },
  activeText: {
    color: '#16a34a'
  },
  inactiveText: {
    color: '#dc2626'
  },
  tenantDetails: {
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
  tenantFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  createdDate: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center'
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