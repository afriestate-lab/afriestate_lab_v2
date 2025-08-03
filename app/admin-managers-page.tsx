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

interface Manager {
  id: string
  full_name: string
  email: string
  phone_number: string
  role: string
  created_at: string
  property_name: string
  property_address: string
  landlord_name: string
  is_active: boolean
  assigned_at: string
}

interface AdminManagersPageProps {
  onBack: () => void
}

export default function AdminManagersPage({ onBack }: AdminManagersPageProps) {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAllManagers()
  }, [])

  const fetchAllManagers = async () => {
    try {
      setLoading(true)
      
      // Use the admin RPC function instead of direct table query
      const { data: managersData, error } = await supabase
        .rpc('get_all_managers_admin')

      if (error) throw error

      const transformedManagers = managersData?.map((manager: any) => ({
        id: manager.id,
        full_name: manager.full_name,
        email: manager.email,
        phone_number: manager.phone_number || '',
        role: manager.role,
        created_at: manager.created_at,
        property_name: manager.property_name,
        property_address: manager.property_address,
        landlord_name: manager.landlord_name,
        is_active: manager.is_active,
        assigned_at: manager.assigned_at
      })) || []

      setManagers(transformedManagers)
    } catch (error) {
      console.error('Error fetching managers:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura abayobozi bose.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAllManagers()
    setRefreshing(false)
  }

  const handleToggleManagerStatus = async (managerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('property_managers')
        .update({ is_active: !currentStatus })
        .eq('manager_id', managerId)

      if (error) throw error

      Alert.alert('Byagenze neza', `Umuyobozi ${!currentStatus ? 'yakorerwemo' : 'yahagaritswe'}.`)
      await fetchAllManagers()
    } catch (error) {
      console.error('Error toggling manager status:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye guhindura uko umuyobozi ahagaze.')
    }
  }

  const getFilteredManagers = () => {
    return managers.filter(manager =>
      manager.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.landlord_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const renderManagerItem = ({ item }: { item: Manager }) => (
    <View style={styles.managerCard}>
      <View style={styles.managerHeader}>
        <View style={styles.managerIcon}>
          <Ionicons name="person-circle" size={24} color="#06b6d4" />
        </View>
        <View style={styles.managerInfo}>
          <Text style={styles.managerName}>{item.full_name}</Text>
          <Text style={styles.managerEmail}>{item.email}</Text>
          {item.phone_number && <Text style={styles.managerPhone}>{item.phone_number}</Text>}
        </View>
        <View style={[
          styles.statusBadge,
          item.is_active ? styles.activeBadge : styles.inactiveBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.is_active ? styles.activeText : styles.inactiveText
          ]}>
            {item.is_active ? 'Arakora' : 'Ntakora'}
          </Text>
        </View>
      </View>

      <View style={styles.managerDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="business" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Inyubako: {item.property_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Aderesi: {item.property_address}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Nyirinyubako: {item.landlord_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Yagizwe umuyobozi: {formatDate(item.assigned_at)}</Text>
        </View>
      </View>

      <View style={styles.managerActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            item.is_active ? styles.disableButton : styles.enableButton
          ]}
          onPress={() => handleToggleManagerStatus(item.id, item.is_active)}
        >
          <Ionicons 
            name={item.is_active ? "pause" : "play"} 
            size={16} 
            color="white" 
          />
          <Text style={styles.actionButtonText}>
            {item.is_active ? 'Hagarika' : 'Emeza'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.managerFooter}>
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
          <Text style={styles.headerTitle}>Abayobozi Bose</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Gukura abayobozi bose...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const filteredManagers = getFilteredManagers()
  const activeManagers = managers.filter(m => m.is_active).length
  const inactiveManagers = managers.filter(m => !m.is_active).length

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abayobozi Bose</Text>
        <View style={styles.headerStats}>
          <Text style={styles.totalCount}>{managers.length}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeManagers}</Text>
          <Text style={styles.statLabel}>Barakora</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{inactiveManagers}</Text>
          <Text style={styles.statLabel}>Ntibakora</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Shakisha umuyobozi, email, cyangwa inyubako..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <FlatList
        data={filteredManagers}
        renderItem={renderManagerItem}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-circle-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta bayobozi baboneka</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? 'Gerageza gushakisha ikindi' : 'Nta bayobozi bashyizweho kuri uru rusobe'}
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
    color: '#06b6d4'
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
  managerCard: {
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
  managerHeader: {
    flexDirection: 'row',
    marginBottom: 16
  },
  managerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#cffafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  managerInfo: {
    flex: 1
  },
  managerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  managerEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2
  },
  managerPhone: {
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
  managerDetails: {
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
  managerActions: {
    marginBottom: 16
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  enableButton: {
    backgroundColor: '#10b981'
  },
  disableButton: {
    backgroundColor: '#f59e0b'
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  managerFooter: {
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