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
import { formatCurrency, formatDate } from '@/lib/helpers'

interface PropertyDetail {
  id: string
  name: string
  address: string
  city: string
  description: string
  property_type: string
  floors_count: number
  total_rooms: number
  occupied_rooms: number
  vacant_rooms: number
  monthly_target_revenue: number
  actual_monthly_revenue: number
  occupancy_rate: number
  average_rent: number
  floors: Floor[]
}

interface Floor {
  floorNumber: number
  floorName: string
  rooms: Room[]
}

interface Room {
  id: string
  room_number: string
  floor_number: number
  rent_amount: number
  status: 'occupied' | 'vacant' | 'maintenance'
  tenant?: {
    id: string
    full_name: string
    phone_number: string
    move_in_date: string
  }
}

interface PropertiesPageProps {
  onBack: () => void
}

export default function PropertiesPage({ onBack }: PropertiesPageProps) {
  const [properties, setProperties] = useState<PropertyDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PropertyDetail | null>(null)
  const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'vacant' | 'maintenance'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    checkUserAndLoadData()
  }, [])

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
      await fetchProperties(userData)
    } catch (error) {
      console.error('Error checking user:', error)
      Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka amakuru yawe.')
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async (userProfile: any) => {
    try {
      setLoading(true)
      
      const isLandlord = userProfile.role === 'landlord'
      const isManager = userProfile.role === 'manager'
      
      let propertiesData, propertiesError

      if (isLandlord) {
        const result = await supabase
          .from('properties')
          .select(`
            id, name, address, city, country, floors_count,
            created_at, updated_at
          `)
          .eq('landlord_id', userProfile.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
        
        propertiesData = result.data
        propertiesError = result.error
      } else if (isManager) {
        const { data: managerAssignments, error: assignmentError } = await supabase
          .from('property_managers')
          .select(`
            properties!inner (
              id, name, address, city, country, floors_count,
              created_at, updated_at
            )
          `)
          .eq('manager_id', userProfile.id)
          .eq('status', 'active')
          .is('deleted_at', null)

        if (assignmentError) throw assignmentError

        propertiesData = managerAssignments?.map(assignment => (assignment.properties as any)) || []
        propertiesError = null
      }

      if (propertiesError) throw propertiesError

      if (!propertiesData || propertiesData.length === 0) {
        setProperties([])
        return
      }

      // Fetch detailed data for each property
      const detailedProperties = await Promise.all(
        propertiesData.map(async (property) => {
          // Fetch rooms with tenant information
          const { data: roomsData, error: roomsError } = await supabase
            .from('rooms')
            .select(`
              id, room_number, floor_number, rent_amount, description, status,
              room_tenants!left (
                id, tenant_id, is_active, move_in_date,
                tenants (
                  id, full_name, phone_number
                )
              )
            `)
            .eq('property_id', property.id)
            .is('deleted_at', null)
            .order('floor_number', { ascending: true })
            .order('room_number', { ascending: true })

          if (roomsError) throw roomsError

          // Get room IDs for this property
          const roomIds = roomsData?.map(room => room.id) || []
          
          let paymentsData: any[] = []
          if (roomIds.length > 0) {
            const { data: payments } = await supabase
              .from('payments')
              .select('amount, payment_date')
              .in('room_id', roomIds)
              .gte('payment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            
            paymentsData = payments || []
          }

          // Process rooms by floor
          const floorMap = new Map<number, Room[]>()
          let occupiedCount = 0
          let totalRent = 0

          roomsData?.forEach(room => {
            const activeTenant = room.room_tenants?.find((rt: any) => rt.is_active)
            const roomStatus = activeTenant ? 'occupied' : 'vacant'
            
            if (roomStatus === 'occupied') occupiedCount++
            totalRent += room.rent_amount || 0

            const roomDetail: Room = {
              id: room.id,
              room_number: room.room_number,
              floor_number: room.floor_number,
              rent_amount: room.rent_amount,
              status: roomStatus,
              tenant: activeTenant ? {
                id: (activeTenant.tenants as any)?.id,
                full_name: (activeTenant.tenants as any)?.full_name,
                phone_number: (activeTenant.tenants as any)?.phone_number,
                move_in_date: activeTenant.move_in_date
              } : undefined
            }

            if (!floorMap.has(room.floor_number)) {
              floorMap.set(room.floor_number, [])
            }
            floorMap.get(room.floor_number)!.push(roomDetail)
          })

          // Create floors array
          const floors: Floor[] = []
          const expectedFloors = property.floors_count || Math.max(...Array.from(floorMap.keys()), 1)
          
          for (let floorNum = 1; floorNum <= expectedFloors; floorNum++) {
            floors.push({
              floorNumber: floorNum,
              floorName: `Urubuga ${floorNum}`,
              rooms: floorMap.get(floorNum) || []
            })
          }

          const totalRooms = roomsData?.length || 0
          const occupancyRate = totalRooms > 0 ? (occupiedCount / totalRooms) * 100 : 0
          const actualRevenue = paymentsData.reduce((sum, p) => sum + p.amount, 0)

          return {
            id: property.id,
            name: property.name,
            address: property.address,
            city: property.city,
            description: property.description || '',
            property_type: property.property_type || 'residential',
            floors_count: expectedFloors,
            total_rooms: totalRooms,
            occupied_rooms: occupiedCount,
            vacant_rooms: totalRooms - occupiedCount,
            monthly_target_revenue: totalRent,
            actual_monthly_revenue: actualRevenue,
            occupancy_rate: Math.round(occupancyRate * 10) / 10,
            average_rent: totalRooms > 0 ? Math.round(totalRent / totalRooms) : 0,
            floors
          } as PropertyDetail
        })
      )

      setProperties(detailedProperties)
    } catch (error) {
      console.error('Error fetching properties:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura amakuru y\'inyubako.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    if (!profile) return
    setRefreshing(true)
    await fetchProperties(profile)
    setRefreshing(false)
  }

  const toggleFloor = (floorNumber: number) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floorNumber]: !prev[floorNumber]
    }))
  }

  const filteredRooms = selectedProperty ? 
    selectedProperty.floors.flatMap(floor => floor.rooms).filter(room => {
      if (filterStatus === 'all') return true
      return room.status === filterStatus
    }) : []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return '#10b981'
      case 'vacant': return '#f59e0b'
      case 'maintenance': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'occupied': return 'Cyatuwemo'
      case 'vacant': return 'Cyubusa'
      case 'maintenance': return 'Gisuzumwa'
      default: return 'Kitazwi'
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Gukura amakuru y&apos;inyubako...</Text>
      </View>
    )
  }

  // Property Details View
  if (selectedProperty) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedProperty(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedProperty.name}</Text>
            <Text style={styles.headerSubtitle}>{selectedProperty.address}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Property Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedProperty.total_rooms}</Text>
            <Text style={styles.statLabel}>Ibyumba byose</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedProperty.occupied_rooms}</Text>
            <Text style={styles.statLabel}>Byatuwemo</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedProperty.occupancy_rate}%</Text>
            <Text style={styles.statLabel}>Ikigereranyo</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(selectedProperty.actual_monthly_revenue)}</Text>
            <Text style={styles.statLabel}>Injiza z&apos;ukwezi</Text>
          </View>
        </View>

        {/* Filter Dropdown */}
        {showFilters && (
          <View style={styles.filterDropdown}>
            {[
              { key: 'all', label: 'Byose' },
              { key: 'occupied', label: 'Byatuwemo' },
              { key: 'vacant', label: 'Byubusa' },
              { key: 'maintenance', label: 'Bisuzumwa' }
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={styles.filterOption}
                onPress={() => {
                  setFilterStatus(filter.key as any)
                  setShowFilters(false)
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === filter.key && styles.filterOptionTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Floors List */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {selectedProperty.floors.map((floor) => (
            <View key={floor.floorNumber} style={styles.floorCard}>
              <TouchableOpacity
                style={styles.floorHeader}
                onPress={() => toggleFloor(floor.floorNumber)}
              >
                <Text style={styles.floorTitle}>{floor.floorName}</Text>
                <Text style={styles.floorSubtitle}>
                  {floor.rooms.length} ibyumba
                </Text>
                <Ionicons 
                  name={expandedFloors[floor.floorNumber] ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6b7280" 
                />
              </TouchableOpacity>

              {expandedFloors[floor.floorNumber] && (
                <View style={styles.roomsList}>
                  {floor.rooms
                    .filter(room => filterStatus === 'all' || room.status === filterStatus)
                    .map((room) => (
                    <View key={room.id} style={styles.roomCard}>
                      <View style={styles.roomHeader}>
                        <Text style={styles.roomNumber}>Icyumba {room.room_number}</Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(room.status) }
                        ]}>
                          <Text style={styles.statusText}>
                            {getStatusText(room.status)}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.roomRent}>
                        {formatCurrency(room.rent_amount)}/ukwezi
                      </Text>
                      
                      {room.tenant && (
                        <View style={styles.tenantInfo}>
                          <Text style={styles.tenantName}>{room.tenant.full_name}</Text>
                          <Text style={styles.tenantPhone}>{room.tenant.phone_number}</Text>
                          <Text style={styles.tenantDate}>
                            Yinjiye: {formatDate(room.tenant.move_in_date)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Properties List View
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
          <Text style={styles.headerTitle}>Inyubako Zanjye</Text>
          <Text style={styles.headerSubtitle}>{properties.length} inyubako</Text>
        </View>
        
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Shakira inyubako..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Properties List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {properties
          .filter(property => 
            property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.address.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((property) => (
          <TouchableOpacity
            key={property.id}
            style={styles.propertyCard}
            onPress={() => setSelectedProperty(property)}
          >
            <View style={styles.propertyHeader}>
              <Text style={styles.propertyName}>{property.name}</Text>
              <Text style={styles.propertyAddress}>{property.address}</Text>
            </View>
            
            <View style={styles.propertyStats}>
              <View style={styles.propertyStat}>
                <Text style={styles.propertyStatValue}>{property.total_rooms}</Text>
                <Text style={styles.propertyStatLabel}>Ibyumba</Text>
              </View>
              <View style={styles.propertyStat}>
                <Text style={styles.propertyStatValue}>{property.occupied_rooms}</Text>
                <Text style={styles.propertyStatLabel}>Byatuwemo</Text>
              </View>
              <View style={styles.propertyStat}>
                <Text style={styles.propertyStatValue}>{property.occupancy_rate}%</Text>
                <Text style={styles.propertyStatLabel}>Ikigereranyo</Text>
              </View>
            </View>
            
            <View style={styles.propertyFooter}>
              <Text style={styles.propertyRevenue}>
                {formatCurrency(property.actual_monthly_revenue)} / {formatCurrency(property.monthly_target_revenue)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        ))}

        {properties.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="business" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta nyubako zisanzwe</Text>
            <Text style={styles.emptySubtitle}>
              Ongeramo inyubako za mbere kugira ngo utangire gucuruza.
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
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8
  },
  filterButton: {
    padding: 8
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
  content: {
    flex: 1,
    paddingHorizontal: 16
  },
  propertyCard: {
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
  propertyHeader: {
    marginBottom: 12
  },
  propertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  propertyAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  propertyStat: {
    alignItems: 'center'
  },
  propertyStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  propertyStatLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12
  },
  propertyRevenue: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600'
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
  
  // Property Details Styles
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
  filterDropdown: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8
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
  floorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1
  },
  floorSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8
  },
  roomsList: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  roomCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  roomNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
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
  roomRent: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 8
  },
  tenantInfo: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 6
  },
  tenantName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937'
  },
  tenantPhone: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2
  },
  tenantDate: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2
  }
}) 