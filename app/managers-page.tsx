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

interface ManagerDetail {
  id: string
  full_name: string
  email: string
  phone_number: string
  role: string
  created_at: string
  assigned_properties: AssignedProperty[]
  total_properties: number
  total_tenants: number
  total_revenue: number
  collection_rate: number
  performance_score: number
  last_activity: string
  status: 'active' | 'inactive' | 'pending'
  assigned_at: string
}

interface AssignedProperty {
  id: string
  name: string
  address: string
  total_rooms: number
  occupied_rooms: number
  monthly_revenue: number
  occupancy_rate: number
  assigned_at: string
}

interface ManagersPageProps {
  onBack: () => void
}

export default function ManagersPage({ onBack }: ManagersPageProps) {
  const [managers, setManagers] = useState<ManagerDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedManager, setSelectedManager] = useState<ManagerDetail | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'properties' | 'performance' | 'recent'>('performance')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'performance'>('cards')
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

      if (!userData || userData.role !== 'landlord') {
        Alert.alert('Ikosa', 'Gusa nyir\'inyubako ashobora kureba amakuru y\'abayobozi.')
        return
      }

      setProfile(userData)
      await fetchManagers(userData)
    } catch (error) {
      console.error('Error checking user:', error)
      Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka amakuru yawe.')
    } finally {
      setLoading(false)
    }
  }

  const fetchManagers = async (userProfile: any) => {
    try {
      setLoading(true)

      // Fetch managers data from property_managers table with user details
      const { data: managersData, error: managersError } = await supabase
        .from('property_managers')
        .select(`
          manager_id,
          property_id,
          assigned_at,
          status,
          users!inner (
            id,
            email,
            full_name,
            phone_number,
            role,
            created_at,
            updated_at
          ),
          properties!inner (
            id,
            name,
            address,
            city,
            landlord_id
          )
        `)
        .eq('properties.landlord_id', userProfile.id)
        .eq('users.role', 'manager')
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })

      if (managersError) throw managersError

      if (!managersData || managersData.length === 0) {
        setManagers([])
        return
      }

      // Group assignments by manager to create manager profiles
      const managerMap = new Map<string, any>()

      for (const assignment of managersData) {
        const manager = (assignment.users as any)
        const property = (assignment.properties as any)

        if (!managerMap.has(manager.id)) {
          managerMap.set(manager.id, {
            id: manager.id,
            full_name: manager.full_name,
            email: manager.email,
            phone_number: manager.phone_number,
            role: manager.role,
            created_at: manager.created_at,
            assigned_properties: [],
            total_properties: 0,
            total_tenants: 0,
            total_revenue: 0,
            collection_rate: 0,
            performance_score: 0,
            last_activity: assignment.assigned_at,
            status: assignment.status,
            assigned_at: assignment.assigned_at
          })
        }

        const managerData = managerMap.get(manager.id)
        
        // Fetch detailed property data
        const { data: roomsData } = await supabase
          .from('rooms')
          .select(`
            id, rent_amount,
            room_tenants!left (
              id, is_active, tenant_id,
              tenants (id, full_name)
            )
          `)
          .eq('property_id', property.id)
          .is('deleted_at', null)

        const totalRooms = roomsData?.length || 0
        const occupiedRooms = roomsData?.filter(room => 
          room.room_tenants?.some((rt: any) => rt.is_active)
        ).length || 0
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0
        const monthlyRevenue = roomsData?.reduce((sum, room) => 
          sum + (room.rent_amount || 0), 0) || 0

        // Fetch recent payments for this property
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount, payment_date')
          .in('room_id', roomsData?.map(r => r.id) || [])
          .gte('payment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

        const actualRevenue = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0

        managerData.assigned_properties.push({
          id: property.id,
          name: property.name,
          address: property.address,
          total_rooms: totalRooms,
          occupied_rooms: occupiedRooms,
          monthly_revenue: actualRevenue,
          occupancy_rate: Math.round(occupancyRate * 10) / 10,
          assigned_at: assignment.assigned_at
        })

        managerData.total_properties++
        managerData.total_tenants += occupiedRooms
        managerData.total_revenue += actualRevenue
      }

      // Calculate performance metrics for each manager
      const processedManagers = Array.from(managerMap.values()).map(manager => {
        const avgOccupancy = manager.assigned_properties.length > 0 ? 
          manager.assigned_properties.reduce((sum: number, p: any) => sum + p.occupancy_rate, 0) / manager.assigned_properties.length : 0
        
        const collectionRate = manager.assigned_properties.length > 0 ? avgOccupancy : 100
        
        // Calculate performance score (0-100 based on occupancy and collection)
        const performanceScore = Math.round((avgOccupancy + collectionRate) / 2)

        return {
          ...manager,
          collection_rate: Math.round(collectionRate * 10) / 10,
          performance_score: performanceScore
        }
      })

      // Sort managers based on selected criteria
      let sortedManagers = [...processedManagers]
      switch (sortBy) {
        case 'name':
          sortedManagers.sort((a, b) => a.full_name.localeCompare(b.full_name))
          break
        case 'performance':
          sortedManagers.sort((a, b) => b.performance_score - a.performance_score)
          break
        case 'properties':
          sortedManagers.sort((a, b) => b.total_properties - a.total_properties)
          break
        case 'recent':
          sortedManagers.sort((a, b) => 
            new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
          )
          break
      }

      setManagers(sortedManagers)
    } catch (error) {
      console.error('Error fetching managers:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura amakuru y\'abayobozi.')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    if (!profile) return
    setRefreshing(true)
    await fetchManagers(profile)
    setRefreshing(false)
  }

  const filteredManagers = managers.filter(manager => {
    const matchesSearch = manager.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         manager.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         manager.assigned_properties.some(p => 
                           p.name.toLowerCase().includes(searchTerm.toLowerCase())
                         )
    
    const matchesFilter = filterStatus === 'all' || manager.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return '#10b981'
    if (score >= 75) return '#3b82f6'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getPerformanceText = (score: number) => {
    if (score >= 90) return 'Byiza cyane'
    if (score >= 75) return 'Byiza'
    if (score >= 60) return 'Byiza gusa'
    return 'Bibi'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981'
      case 'inactive': return '#6b7280'
      case 'pending': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Arakora'
      case 'inactive': return 'Ntawe'
      case 'pending': return 'Birategereje'
      default: return 'Kitazwi'
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Gukura amakuru y&apos;abayobozi...</Text>
      </View>
    )
  }

  // Manager Details View
  if (selectedManager) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedManager(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedManager.full_name}</Text>
            <Text style={styles.headerSubtitle}>Umuyobozi w&apos;inyubako</Text>
          </View>
          
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="mail" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Manager Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedManager.performance_score}</Text>
            <Text style={styles.statLabel}>Amanota</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedManager.total_properties}</Text>
            <Text style={styles.statLabel}>Inyubako</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{selectedManager.total_tenants}</Text>
            <Text style={styles.statLabel}>Abakode</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(selectedManager.total_revenue)}</Text>
            <Text style={styles.statLabel}>Amafaranga</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Manager Info */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amakuru y&apos;umuyobozi</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Izina:</Text>
              <Text style={styles.infoValue}>{selectedManager.full_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{selectedManager.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefoni:</Text>
              <Text style={styles.infoValue}>{selectedManager.phone_number || 'Ntabwo yasabwe'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Uko bimeze:</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(selectedManager.status) }
              ]}>
                <Text style={styles.statusText}>
                  {getStatusText(selectedManager.status)}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Yashyizweho:</Text>
              <Text style={styles.infoValue}>{formatDate(selectedManager.assigned_at)}</Text>
            </View>
          </View>

          {/* Performance */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Imikorere</Text>
            <View style={styles.performanceContainer}>
              <View style={[
                styles.performanceBadge,
                { backgroundColor: getPerformanceColor(selectedManager.performance_score) }
              ]}>
                <Text style={styles.performanceText}>
                  {getPerformanceText(selectedManager.performance_score)}
                </Text>
              </View>
              <Text style={styles.performanceScore}>
                {selectedManager.performance_score}/100
              </Text>
            </View>
            
            <View style={styles.performanceStats}>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>{selectedManager.total_properties}</Text>
                <Text style={styles.performanceStatLabel}>Inyubako zose</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>{selectedManager.total_tenants}</Text>
                <Text style={styles.performanceStatLabel}>Abakode bose</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>{selectedManager.collection_rate}%</Text>
                <Text style={styles.performanceStatLabel}>Ikigereranyo cy&apos;abatuwemo</Text>
              </View>
            </View>
          </View>

          {/* Assigned Properties */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Inyubako zahawe</Text>
            {selectedManager.assigned_properties.length > 0 ? (
              selectedManager.assigned_properties.map((property) => (
                <View key={property.id} style={styles.propertyCard}>
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
                      {formatCurrency(property.monthly_revenue)}
                    </Text>
                    <Text style={styles.propertyDate}>
                      Yahawe: {formatDate(property.assigned_at)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nta nyubako zahawe</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Main Managers View
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
          <Text style={styles.headerTitle}>Abayobozi</Text>
          <Text style={styles.headerSubtitle}>{filteredManagers.length} abayobozi</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => Alert.alert('Ubwiyongere', 'Iki kikorwa kizashyirwaho vuba.')}
        >
          <Ionicons name="person-add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'cards' && styles.toggleButtonActive]}
          onPress={() => setViewMode('cards')}
        >
          <Text style={[styles.toggleText, viewMode === 'cards' && styles.toggleTextActive]}>
            Amakarita
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'performance' && styles.toggleButtonActive]}
          onPress={() => setViewMode('performance')}
        >
          <Text style={[styles.toggleText, viewMode === 'performance' && styles.toggleTextActive]}>
            Imikorere
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Shakira abayobozi..."
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
              { key: 'all', label: 'Bose' },
              { key: 'active', label: 'Barakora' },
              { key: 'inactive', label: 'Ntibakora' },
              { key: 'pending', label: 'Birategereje' }
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

      {/* Managers List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {viewMode === 'cards' ? (
          // Cards View
          filteredManagers.map((manager) => (
            <TouchableOpacity
              key={manager.id}
              style={styles.managerCard}
              onPress={() => setSelectedManager(manager)}
            >
              <View style={styles.managerHeader}>
                <View style={styles.managerInfo}>
                  <Text style={styles.managerName}>{manager.full_name}</Text>
                  <Text style={styles.managerEmail}>{manager.email}</Text>
                  <Text style={styles.managerPhone}>{manager.phone_number || 'Ntawe'}</Text>
                </View>
                
                <View style={styles.managerStats}>
                  <View style={[
                    styles.performanceIndicator,
                    { backgroundColor: getPerformanceColor(manager.performance_score) }
                  ]}>
                    <Text style={styles.indicatorScore}>{manager.performance_score}</Text>
                  </View>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(manager.status) }
                  ]}>
                    <Text style={styles.statusIndicatorText}>
                      {getStatusText(manager.status)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.managerMetrics}>
                <View style={styles.managerMetric}>
                  <Text style={styles.managerMetricValue}>{manager.total_properties}</Text>
                  <Text style={styles.managerMetricLabel}>Inyubako</Text>
                </View>
                <View style={styles.managerMetric}>
                  <Text style={styles.managerMetricValue}>{manager.total_tenants}</Text>
                  <Text style={styles.managerMetricLabel}>Abakode</Text>
                </View>
                <View style={styles.managerMetric}>
                  <Text style={styles.managerMetricValue}>{formatCurrency(manager.total_revenue)}</Text>
                  <Text style={styles.managerMetricLabel}>Amafaranga</Text>
                </View>
                <View style={styles.managerMetric}>
                  <Text style={styles.managerMetricValue}>{manager.collection_rate}%</Text>
                  <Text style={styles.managerMetricLabel}>Ikigereranyo</Text>
                </View>
              </View>
              
              <View style={styles.managerFooter}>
                <Text style={styles.managerDate}>
                  Yashyizweho: {formatDate(manager.assigned_at)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          // Performance View
          <View style={styles.performanceView}>
            <Text style={styles.performanceTitle}>Uko abayobozi bakora</Text>
            {filteredManagers
              .sort((a, b) => b.performance_score - a.performance_score)
              .map((manager, index) => (
                <TouchableOpacity
                  key={manager.id}
                  style={styles.performanceItem}
                  onPress={() => setSelectedManager(manager)}
                >
                  <View style={styles.performanceRank}>
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  </View>
                  
                  <View style={styles.performanceManagerInfo}>
                    <Text style={styles.performanceManagerName}>{manager.full_name}</Text>
                    <Text style={styles.performanceManagerDetails}>
                      {manager.total_properties} inyubako • {manager.total_tenants} abakode
                    </Text>
                  </View>
                  
                  <View style={styles.performanceScore}>
                    <Text style={[
                      styles.performanceScoreValue,
                      { color: getPerformanceColor(manager.performance_score) } as any
                    ]}>
                      {manager.performance_score}
                    </Text>
                    <Text style={styles.performanceScoreLabel}>
                      {getPerformanceText(manager.performance_score)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {filteredManagers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta bayobozi basanzwe</Text>
            <Text style={styles.emptySubtitle}>
              Ongeramo abayobozi ba mbere kugira ngo batange kuyobora inyubako zawe.
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
    backgroundColor: '#10b981',
    padding: 8,
    borderRadius: 8
  },
  contactButton: {
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
  
  // Manager Card Styles
  managerCard: {
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
  managerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  managerInfo: {
    flex: 1
  },
  managerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  managerEmail: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 2
  },
  managerPhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  managerStats: {
    alignItems: 'flex-end'
  },
  performanceIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  indicatorScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white'
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusIndicatorText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600'
  },
  managerMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  managerMetric: {
    alignItems: 'center',
    flex: 1
  },
  managerMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  managerMetricLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center'
  },
  managerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12
  },
  managerDate: {
    fontSize: 12,
    color: '#6b7280'
  },
  
  // Performance View Styles
  performanceView: {
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
  performanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center'
  },
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  performanceRank: {
    width: 40,
    alignItems: 'center'
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280'
  },
  performanceManagerInfo: {
    flex: 1,
    marginLeft: 12
  },
  performanceManagerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  performanceManagerDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  performanceScore: {
    alignItems: 'flex-end'
  },
  performanceScoreValue: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  performanceScoreLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2
  },
  
  // Manager Details Styles
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
  performanceScoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937'
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
  propertyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  propertyHeader: {
    marginBottom: 8
  },
  propertyName: {
    fontSize: 14,
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
    marginBottom: 8
  },
  propertyStat: {
    alignItems: 'center'
  },
  propertyStatValue: {
    fontSize: 14,
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
    borderTopColor: '#e5e7eb',
    paddingTop: 8
  },
  propertyRevenue: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600'
  },
  propertyDate: {
    fontSize: 10,
    color: '#6b7280'
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
  }
}) 