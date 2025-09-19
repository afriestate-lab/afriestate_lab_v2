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
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/helpers'

interface Landlord {
  id: string
  full_name: string
  email: string
  phone_number: string
  role: string
  created_at: string
  total_properties: number
  total_rooms: number
  occupied_rooms: number
  total_revenue: number
  is_active: boolean
}

interface AdminLandlordsPageProps {
  onBack: () => void
}

export default function AdminLandlordsPage({ onBack }: AdminLandlordsPageProps) {
  const [landlords, setLandlords] = useState<Landlord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAllLandlords()
  }, [])

  const fetchAllLandlords = async () => {
    try {
      setLoading(true)
      
      // Use the admin RPC function instead of direct table query
      const { data: landlordsData, error } = await supabase
        .rpc('get_all_landlords_admin')

      if (error) throw error

      const transformedLandlords = landlordsData?.map((landlord: any) => ({
        id: landlord.id,
        full_name: landlord.full_name,
        email: landlord.email,
        phone_number: landlord.phone_number || '',
        role: landlord.role,
        created_at: landlord.created_at,
        total_properties: landlord.total_properties || 0,
        total_rooms: landlord.total_rooms || 0,
        occupied_rooms: landlord.occupied_rooms || 0,
        total_revenue: landlord.total_revenue || 0,
        is_active: landlord.is_active
      })) || []

      setLandlords(transformedLandlords)
    } catch (error) {
      console.error('Error fetching landlords:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura banyirinyubako bose.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAllLandlords()
    setRefreshing(false)
  }

  const getFilteredLandlords = () => {
    if (!searchTerm.trim()) return landlords
    return landlords.filter(landlord =>
      landlord.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      landlord.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      landlord.phone_number.includes(searchTerm)
    )
  }

  const renderLandlordItem = ({ item }: { item: Landlord }) => (
    <View style={styles.landlordCard}>
      <View style={styles.landlordHeader}>
        <View style={styles.landlordInfo}>
          <Text style={styles.landlordName}>{item.full_name}</Text>
          <Text style={styles.landlordEmail}>{item.email}</Text>
          {item.phone_number && (
            <Text style={styles.landlordPhone}>{item.phone_number}</Text>
          )}
        </View>
        <View style={styles.landlordStatus}>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, item.is_active ? styles.activeText : styles.inactiveText]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.landlordStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Inyubako</Text>
          <Text style={styles.statValue}>{item.total_properties}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ibyumba</Text>
          <Text style={styles.statValue}>{item.total_rooms}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Byatuwemo</Text>
          <Text style={styles.statValue}>{item.occupied_rooms}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Amafaranga</Text>
          <Text style={styles.statValue}>RF {item.total_revenue.toLocaleString()}</Text>
        </View>
      </View>
      
      <Text style={styles.landlordDate}>
        Yinjira: {formatDate(item.created_at)}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Banyirinyubako Bose</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Gukura banyirinyubako...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Banyirinyubako Bose</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Shakisha banyirinyubako..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <FlatList
        data={getFilteredLandlords()}
        renderItem={renderLandlordItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta banyirinyubako basanganywe</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? 'Shakisha indi nzira' : 'Banyirinyubako ntibashoboye gukurwa'}
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
    padding: 8
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937'
  },
  listContainer: {
    padding: 16
  },
  landlordCard: {
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
  landlordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  landlordInfo: {
    flex: 1
  },
  landlordName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  landlordEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2
  },
  landlordPhone: {
    fontSize: 14,
    color: '#6b7280'
  },
  landlordStatus: {
    marginLeft: 12
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  activeBadge: {
    backgroundColor: '#dcfce7'
  },
  inactiveBadge: {
    backgroundColor: '#fef2f2'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  activeText: {
    color: '#166534'
  },
  inactiveText: {
    color: '#dc2626'
  },
  landlordStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  landlordDate: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right'
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
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center'
  }
}) 