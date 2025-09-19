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
import { useLanguage } from '@/lib/languageContext'

interface User {
  id: string
  full_name: string
  email: string
  phone_number: string
  role: string
  created_at: string
  last_sign_in_at: string | null
  is_active: boolean
  total_properties?: number
  total_tenants?: number
  total_revenue?: number
}

interface AdminUsersPageProps {
  onBack: () => void
}

export default function AdminUsersPage({ onBack }: AdminUsersPageProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'landlord' | 'manager' | 'tenant' | 'admin'>('all')
  const { t } = useLanguage()

  useEffect(() => {
    fetchAllUsers()
  }, [])

  const fetchAllUsers = async () => {
    try {
      setLoading(true)
      
      // Use the admin RPC function instead of direct table query
      const { data: usersData, error } = await supabase
        .rpc('get_all_users_admin')

      if (error) throw error

      const transformedUsers = usersData?.map((user: any) => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number || '',
        role: user.role,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        is_active: user.is_active,
        total_properties: user.total_properties || 0,
        total_tenants: user.total_tenants || 0,
        total_revenue: user.total_revenue || 0
      })) || []

      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      Alert.alert(t('alertError'), t('unableFetchAllUsers'))
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAllUsers()
    setRefreshing(false)
  }

  const getFilteredUsers = () => {
    let filtered = users

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone_number.includes(searchTerm)
      )
    }

    return filtered
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#dc2626'
      case 'landlord': return '#3b82f6'
      case 'manager': return '#8b5cf6'
      case 'tenant': return '#059669'
      default: return '#6b7280'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Umugenzuzi'
      case 'landlord': return 'Umunyirinyubako'
      case 'manager': return 'Umu yobozi'
      case 'tenant': return 'Umukode'
      default: return role
    }
  }

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.phone_number && (
            <Text style={styles.userPhone}>{item.phone_number}</Text>
          )}
        </View>
        <View style={styles.userStatus}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, item.is_active ? styles.activeText : styles.inactiveText]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      
      {(item.role === 'landlord' || item.role === 'manager') && (
        <View style={styles.userStats}>
          {item.role === 'landlord' && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Inyubako</Text>
                <Text style={styles.statValue}>{item.total_properties}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Amafaranga</Text>
                <Text style={styles.statValue}>RF {item.total_revenue?.toLocaleString()}</Text>
              </View>
            </>
          )}
          {item.role === 'manager' && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Abakode</Text>
              <Text style={styles.statValue}>{item.total_tenants}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.userDates}>
        <Text style={styles.userDate}>
          Yinjira: {formatDate(item.created_at)}
        </Text>
        {item.last_sign_in_at && (
          <Text style={styles.userDate}>
            Urugero rwanyuma: {formatDate(item.last_sign_in_at)}
          </Text>
        )}
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Abakoresha Bose</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Gukura abakoresha...</Text>
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
        <Text style={styles.headerTitle}>Abakoresha Bose</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Shakisha abakoresha..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Bose' },
            { key: 'admin', label: 'Abagenzuzi' },
            { key: 'landlord', label: 'Banyirinyubako' },
            { key: 'manager', label: 'Abayobozi' },
            { key: 'tenant', label: 'Abakode' }
          ].map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                filterRole === filter.key && styles.activeFilterButton
              ]}
              onPress={() => setFilterRole(filter.key as any)}
            >
              <Text style={[
                styles.filterText,
                filterRole === filter.key && styles.activeFilterText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={getFilteredUsers()}
        renderItem={renderUserItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nta bakoresha basanganywe</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm || filterRole !== 'all' ? 'Shakisha indi nzira' : 'Abakoresha ntibashoboye gukurwa'}
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
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6'
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6'
  },
  filterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500'
  },
  activeFilterText: {
    color: 'white'
  },
  listContainer: {
    padding: 16
  },
  userCard: {
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2
  },
  userPhone: {
    fontSize: 14,
    color: '#6b7280'
  },
  userStatus: {
    alignItems: 'flex-end'
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600'
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
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  userDates: {
    alignItems: 'flex-end'
  },
  userDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2
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