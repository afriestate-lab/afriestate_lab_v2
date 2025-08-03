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

interface Property {
  id: string
  name: string
  address: string
  city: string
  country: string
  floors_count: number
  landlord_id: string
  created_at: string
  total_rooms: number
  occupied_rooms: number
  landlord_name: string
}

interface AdminPropertiesPageProps {
  onBack: () => void
}

export default function AdminPropertiesPage({ onBack }: AdminPropertiesPageProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAllProperties()
  }, [])

  const fetchAllProperties = async () => {
    try {
      setLoading(true)
      
      // Use the admin RPC function instead of direct table query
      const { data: propertiesData, error } = await supabase
        .rpc('get_all_properties_admin')

      if (error) throw error

      const transformedProperties = propertiesData?.map((property: any) => ({
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        country: property.country,
        floors_count: property.floors_count,
        landlord_id: property.landlord_id,
        created_at: property.created_at,
        total_rooms: property.total_rooms || 0,
        occupied_rooms: property.occupied_rooms || 0,
        landlord_name: property.landlord_name || 'Unknown'
      })) || []

      setProperties(transformedProperties)
    } catch (error) {
      console.error('Error fetching properties:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura inyubako zose.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAllProperties()
    setRefreshing(false)
  }

  const getFilteredProperties = () => {
    return properties.filter(property =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.landlord_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const renderPropertyItem = ({ item }: { item: Property }) => (
    <View style={styles.propertyCard}>
      <View style={styles.propertyHeader}>
        <View style={styles.propertyIcon}>
          <Ionicons name="business" size={24} color="#3b82f6" />
        </View>
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyName}>{item.name}</Text>
          <Text style={styles.propertyAddress}>{item.address}, {item.city}</Text>
          <Text style={styles.landlordName}>Nyirinyubako: {item.landlord_name}</Text>
        </View>
      </View>

      <View style={styles.propertyStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{item.total_rooms}</Text>
          <Text style={styles.statLabel}>Ibyumba</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{item.occupied_rooms}</Text>
          <Text style={styles.statLabel}>Byuzuye</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{item.floors_count}</Text>
          <Text style={styles.statLabel}>Amagorofa</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {item.total_rooms > 0 ? Math.round((item.occupied_rooms / item.total_rooms) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Ikigereranyo</Text>
        </View>
      </View>

      <View style={styles.propertyFooter}>
        <Text style={styles.createdDate}>
          Yashyizweho: {formatDate(item.created_at)}
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
          <Text style={styles.headerTitle}>Inyubako Zose</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Gukura inyubako zose...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const filteredProperties = getFilteredProperties()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inyubako Zose</Text>
        <View style={styles.headerStats}>
          <Text style={styles.totalCount}>{properties.length}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Shakisha inyubako, aderesi, cyangwa nyirinyubako..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <FlatList
        data={filteredProperties}
        renderItem={renderPropertyItem}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta nyubako zaboneka</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? 'Gerageza gushakisha ikindi' : 'Nta nyubako zishyizweho kuri uru rusobe'}
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
    color: '#3b82f6'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
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
  propertyCard: {
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
  propertyHeader: {
    flexDirection: 'row',
    marginBottom: 16
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  propertyInfo: {
    flex: 1
  },
  propertyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  propertyAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4
  },
  landlordName: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600'
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  statItem: {
    alignItems: 'center'
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
  propertyFooter: {
    marginTop: 12,
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