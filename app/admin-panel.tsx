import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Dimensions
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/helpers'

const { width } = Dimensions.get('window')

// Types based on web version
interface Property {
  id: string
  name: string
  address: string
  city: string
  country: string
  floors_count: number
  landlord_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  total_rooms: number
  occupied_rooms: number
}

interface Tenant {
  id: string
  full_name: string
  phone_number: string
  email: string
  id_number: string
  emergency_contact: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_methods: any
  receipt_number: string
  notes: string
  tenant_id: string
  room_id: string
  status: string
  created_at: string
  deleted_at: string | null
  tenants?: { full_name: string }
  rooms?: { 
    properties?: { name: string }
    room_number: string
  }
  admin_approved?: boolean
  admin_approved_at?: string
  admin_approved_by?: string
}

interface Manager {
  id: string
  full_name: string
  email: string
  phone_number: string
  role: string
  created_at: string
  assigned_at: string
  property_id: string
  property_name: string
  property_address: string
  is_active: boolean
  is_assigned: boolean
  deleted_at?: string | null
}

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
  userProfile?: any
}

type TabType = 'properties' | 'tenants' | 'payments' | 'managers'
type ViewMode = 'active' | 'trashed' | 'all'

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onRefresh, userProfile }) => {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('properties')
  const [viewMode, setViewMode] = useState<ViewMode>('active')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  
  // Trash stats
  const [trashStats, setTrashStats] = useState<any>({})
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({
    show: false,
    type: '',
    item: null as any,
    id: '',
    isPermanent: false
  })
  
  // Loading states for individual operations
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null)
  const [isPermanentDeleting, setIsPermanentDeleting] = useState<string | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Fetch functions for each data type
  const fetchPropertiesRealTime = useCallback(async () => {
    console.log('🏠 [MOBILE_ADMIN] Fetching properties...')
    try {
      let query = supabase
        .from('properties')
        .select(`
          id,
          name,
          address,
          city,
          country,
          floors_count,
          landlord_id,
          created_at,
          updated_at,
          deleted_at,
          rooms(
            id,
            status,
            rent_amount
          )
        `)
        .eq('landlord_id', userProfile?.id)

      // Apply view mode filters
      if (viewMode === 'active') {
        query = query.is('deleted_at', null)
      } else if (viewMode === 'trashed') {
        query = query.not('deleted_at', 'is', null)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const transformedData = data?.map(property => ({
        ...property,
        total_rooms: property.rooms?.length || 0,
        occupied_rooms: property.rooms?.filter(room => room.status === 'occupied').length || 0
      }))

      setProperties(transformedData || [])
      return transformedData
    } catch (error) {
      console.error('❌ [MOBILE_ADMIN] Error fetching properties:', error)
      return []
    }
  }, [userProfile?.id, viewMode])

  const fetchTenantsRealTime = useCallback(async () => {
    console.log('👥 [MOBILE_ADMIN] Fetching tenants...')
    try {
      // Get landlord's property IDs first
      const { data: propertyIds } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', userProfile?.id)

      if (!propertyIds || propertyIds.length === 0) {
        setTenants([])
        return []
      }

      // Get room IDs for those properties
      const { data: roomIds } = await supabase
        .from('rooms')
        .select('id')
        .in('property_id', propertyIds.map(p => p.id))

      if (!roomIds || roomIds.length === 0) {
        setTenants([])
        return []
      }

      // Get tenant IDs through room_tenants relationship
      const { data: tenantAssignments } = await supabase
        .from('room_tenants')
        .select('tenant_id')
        .in('room_id', roomIds.map(r => r.id))
        .eq('is_active', true)

      if (!tenantAssignments || tenantAssignments.length === 0) {
        setTenants([])
        return []
      }

      const uniqueTenantIds = Array.from(new Set(tenantAssignments.map(ta => ta.tenant_id)))

      let query = supabase
        .from('tenants')
        .select(`
          id,
          full_name,
          phone_number,
          email,
          id_number,
          emergency_contact,
          created_at,
          updated_at,
          deleted_at
        `)
        .in('id', uniqueTenantIds)

      // Apply view mode filters
      if (viewMode === 'active') {
        query = query.is('deleted_at', null)
      } else if (viewMode === 'trashed') {
        query = query.not('deleted_at', 'is', null)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      setTenants(data || [])
      return data
    } catch (error) {
      console.error('❌ [MOBILE_ADMIN] Error fetching tenants:', error)
      return []
    }
  }, [userProfile?.id, viewMode])

  const fetchPaymentsRealTime = useCallback(async () => {
    console.log('💳 [MOBILE_ADMIN] Fetching payments...')
    try {
      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_methods,
          receipt_number,
          notes,
          tenant_id,
          room_id,
          status,
          created_at,
          deleted_at,
          admin_approved,
          admin_approved_at,
          admin_approved_by,
          tenants!inner(full_name),
          rooms!inner(
            room_number,
            properties!inner(landlord_id, name)
          )
        `)
        .eq('rooms.properties.landlord_id', userProfile?.id)

      // Apply view mode filters
      if (viewMode === 'active') {
        query = query.is('deleted_at', null)
      } else if (viewMode === 'trashed') {
        query = query.not('deleted_at', 'is', null)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Map payments to use first tenant and room
      const mappedPayments = (data || []).map(p => ({
        id: p.id,
        amount: p.amount,
        payment_date: p.payment_date,
        payment_methods: p.payment_methods,
        receipt_number: p.receipt_number,
        notes: p.notes,
        tenant_id: p.tenant_id,
        room_id: p.room_id,
        status: p.status,
        created_at: p.created_at,
        deleted_at: p.deleted_at,
        admin_approved: p.admin_approved,
        admin_approved_at: p.admin_approved_at,
        admin_approved_by: p.admin_approved_by,
        tenantName: (p.tenants as any)?.full_name,
        roomNumber: (p.rooms as any)?.room_number,
        propertyName: (p.rooms as any)?.properties?.name,
        landlordId: (p.rooms as any)?.properties?.landlord_id
      }))
      setPayments(mappedPayments)
      return data
    } catch (error) {
      console.error('❌ [MOBILE_ADMIN] Error fetching payments:', error)
      return []
    }
  }, [userProfile?.id, viewMode])

  const fetchManagersRealTime = useCallback(async () => {
    console.log('👨‍💼 [MOBILE_ADMIN] Fetching managers...')
    try {
      // Get landlord's property IDs first
      const { data: propertyIds } = await supabase
        .from('properties')
        .select('id, name, address')
        .eq('landlord_id', userProfile?.id)

      if (!propertyIds || propertyIds.length === 0) {
        setManagers([])
        return []
      }

      const { data: assignments } = await supabase
        .from('property_managers')
        .select(`
          property_id,
          manager_id,
          assigned_at,
          is_active,
          status,
          users!inner(
            id,
            full_name,
            email,
            phone_number,
            role,
            created_at,
            deleted_at
          ),
          properties!inner(
            id,
            name,
            address
          )
        `)
        .in('property_id', propertyIds.map(p => p.id))

      if (!assignments || assignments.length === 0) {
        setManagers([])
        return []
      }

      const formattedManagers = assignments.map(pm => ({
        id: (pm.users as any)?.id || pm.manager_id,
        full_name: (pm.users as any)?.full_name || 'Unknown',
        email: (pm.users as any)?.email || '',
        phone_number: (pm.users as any)?.phone_number || '',
        role: (pm.users as any)?.role || 'manager',
        created_at: (pm.users as any)?.created_at || pm.assigned_at,
        assigned_at: pm.assigned_at,
        property_id: pm.property_id,
        property_name: (pm.properties as any)?.name || 'Unknown Property',
        property_address: (pm.properties as any)?.address || 'Unknown Address',
        is_active: pm.is_active || false,
        is_assigned: true,
        deleted_at: (pm.users as any)?.deleted_at
      }))

      // Apply view mode filters
      const filteredManagers = formattedManagers.filter(manager => {
        if (viewMode === 'active') return !manager.deleted_at
        if (viewMode === 'trashed') return manager.deleted_at
        return true // 'all' mode
      })

      setManagers(filteredManagers)
      return filteredManagers
    } catch (error) {
      console.error('❌ [MOBILE_ADMIN] Error fetching managers:', error)
      return []
    }
  }, [userProfile?.id, viewMode])

  // Fetch trash statistics
  const fetchTrashStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_trash_stats')
      if (error) throw error
      setTrashStats(data || {})
    } catch (error) {
      console.error('❌ [MOBILE_ADMIN] Error fetching trash stats:', error)
    }
  }, [])

  // Comprehensive data fetching
  const fetchAllDataManual = useCallback(async () => {
    console.log('📊 [MOBILE_ADMIN] Fetching all data...')
    setLoading(true)
    
    try {
      await Promise.all([
        fetchPropertiesRealTime(),
        fetchTenantsRealTime(),
        fetchPaymentsRealTime(),
        fetchManagersRealTime(),
        fetchTrashStats()
      ])
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('❌ [MOBILE_ADMIN] Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchPropertiesRealTime, fetchTenantsRealTime, fetchPaymentsRealTime, fetchManagersRealTime, fetchTrashStats])

  // Initial data fetch
  useEffect(() => {
    if (isOpen && userProfile?.id) {
      fetchAllDataManual()
    }
  }, [isOpen, userProfile?.id, viewMode])

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    await fetchAllDataManual()
    setRefreshing(false)
  }

  // Delete operations
  const handleSoftDelete = async (type: string, id: string) => {
    try {
      setIsDeletingId(id)
      console.log(`🗑️ [MOBILE_ADMIN] Soft deleting ${type}:`, id)

      let tableName = ''
      switch (type) {
        case 'property':
          tableName = 'properties'
          break
        case 'tenant':
          tableName = 'tenants'
          break
        case 'payment':
          tableName = 'payments'
          break
        case 'manager':
          tableName = 'users'
          break
        default:
          throw new Error(`Unknown type: ${type}`)
      }

      const { error } = await supabase.rpc('soft_delete_record', {
        table_name: tableName,
        record_id: id
      })

      if (error) throw error

      console.log(`✅ [MOBILE_ADMIN] ${type} moved to trash`)
      await fetchAllDataManual()
      onRefresh()
      
    } catch (error) {
      console.error(`❌ [MOBILE_ADMIN] Error soft deleting ${type}:`, error)
      Alert.alert('Ikosa', `Ntibyshoboye gusiba ${type}. Gerageza ukundi.`)
    } finally {
      setIsDeletingId(null)
      setShowDeleteConfirm({ show: false, type: '', item: null, id: '', isPermanent: false })
    }
  }

  const handleRestore = async (type: string, id: string) => {
    try {
      setIsRestoringId(id)
      console.log(`♻️ [MOBILE_ADMIN] Restoring ${type}:`, id)

      let tableName = ''
      switch (type) {
        case 'property':
          tableName = 'properties'
          break
        case 'tenant':
          tableName = 'tenants'
          break
        case 'payment':
          tableName = 'payments'
          break
        case 'manager':
          tableName = 'users'
          break
        default:
          throw new Error(`Unknown type: ${type}`)
      }

      const { error } = await supabase.rpc('restore_from_trash', {
        table_name: tableName,
        record_id: id
      })

      if (error) throw error

      console.log(`✅ [MOBILE_ADMIN] ${type} restored`)
      await fetchAllDataManual()
      onRefresh()
      
    } catch (error) {
      console.error(`❌ [MOBILE_ADMIN] Error restoring ${type}:`, error)
      Alert.alert('Ikosa', `Ntibyshoboye kugarura ${type}. Gerageza ukundi.`)
    } finally {
      setIsRestoringId(null)
    }
  }

  const handlePermanentDelete = async (type: string, id: string) => {
    try {
      setIsPermanentDeleting(id)
      console.log(`💀 [MOBILE_ADMIN] Permanently deleting ${type}:`, id)

      let tableName = ''
      switch (type) {
        case 'property':
          tableName = 'properties'
          break
        case 'tenant':
          tableName = 'tenants'
          break
        case 'payment':
          tableName = 'payments'
          break
        case 'manager':
          tableName = 'users'
          break
        default:
          throw new Error(`Unknown type: ${type}`)
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (error) throw error

      console.log(`✅ [MOBILE_ADMIN] ${type} permanently deleted`)
      await fetchAllDataManual()
      onRefresh()
      
    } catch (error) {
      console.error(`❌ [MOBILE_ADMIN] Error permanently deleting ${type}:`, error)
      Alert.alert('Ikosa', `Ntibyshoboye gusiba ${type} burundu. Gerageza ukundi.`)
    } finally {
      setIsPermanentDeleting(null)
      setShowDeleteConfirm({ show: false, type: '', item: null, id: '', isPermanent: false })
    }
  }

  // Manager operations
  const handleToggleManagerStatus = async (manager: Manager) => {
    const newStatus = !manager.is_active
    const action = newStatus ? 'kwemeza' : 'guhagarika'
    
    Alert.alert(
      'Kwemeza',
      `Wifuza ${action} umuyobozi ${manager.full_name}?`,
      [
        { text: 'Hoya', style: 'cancel' },
        { 
          text: 'Yego', 
          onPress: async () => {
            try {
              setLoading(true)

              const { error } = await supabase
                .from('property_managers')
                .update({ is_active: newStatus })
                .eq('manager_id', manager.id)
                .eq('property_id', manager.property_id)

              if (error) throw error

              Alert.alert('Byagenze neza', `Umuyobozi ${manager.full_name} ${newStatus ? 'yemejwe' : 'yahagaritswe'}.`)
              await fetchAllDataManual()
              
            } catch (error) {
              console.error('❌ [MOBILE_ADMIN] Error toggling manager:', error)
              Alert.alert('Ikosa', `Ntibyshoboye ${action} umuyobozi.`)
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  // Confirmation dialogs
  const confirmDelete = (type: string, item: any, id: string, isPermanent: boolean = false) => {
    const itemName = item.name || item.full_name || item.receipt_number || 'item'
    const message = isPermanent 
      ? `Wifuza gusiba ${itemName} burundu? Ntizongera igaruka.`
      : `Wifuza gusiba ${itemName}? Birashobora garurwa mu cyuma.`

    Alert.alert(
      isPermanent ? 'Gusiba burundu' : 'Gusiba',
      message,
      [
        { text: 'Hoya', style: 'cancel' },
        { 
          text: 'Yego', 
          style: 'destructive',
          onPress: () => {
            if (isPermanent) {
              handlePermanentDelete(type, id)
            } else {
              handleSoftDelete(type, id)
            }
          }
        }
      ]
    )
  }

  const confirmRestore = (type: string, item: any, id: string) => {
    const itemName = item.name || item.full_name || item.receipt_number || 'item'
    
    Alert.alert(
      'Kugarura',
      `Wifuza kugarura ${itemName}?`,
      [
        { text: 'Hoya', style: 'cancel' },
        { 
          text: 'Yego', 
          onPress: () => handleRestore(type, id)
        }
      ]
    )
  }

  // Filter data based on search and view mode
  const getFilteredData = () => {
    const search = searchTerm.toLowerCase()
    
    const filterByViewMode = (items: any[]) => {
      if (viewMode === 'active') {
        return items.filter(item => !item.deleted_at)
      } else if (viewMode === 'trashed') {
        return items.filter(item => item.deleted_at)
      }
      return items
    }
    
    switch (activeTab) {
      case 'properties':
        return filterByViewMode(properties).filter(p => 
          p.name.toLowerCase().includes(search) || 
          p.address.toLowerCase().includes(search)
        )
      case 'tenants':
        return filterByViewMode(tenants).filter(t => 
          t.full_name.toLowerCase().includes(search) ||
          t.phone_number.includes(search) ||
          (t.email && t.email.toLowerCase().includes(search))
        )
      case 'payments':
        return filterByViewMode(payments).filter(p => 
          p.tenantName.toLowerCase().includes(search) ||
          p.roomNumber.toLowerCase().includes(search) ||
          p.propertyName.toLowerCase().includes(search)
        )
      case 'managers':
        return filterByViewMode(managers).filter(m => 
          m.full_name.toLowerCase().includes(search) ||
          m.email.toLowerCase().includes(search)
        )
      default:
        return []
    }
  }

  // Get counts for tabs
  const getCounts = () => {
    return {
      properties: properties.length,
      tenants: tenants.length,
      payments: payments.length,
      managers: managers.length
    }
  }

  // Get counts for view modes
  const getViewModeCounts = () => {
    const currentData = (() => {
      switch (activeTab) {
        case 'properties': return properties
        case 'tenants': return tenants
        case 'payments': return payments
        case 'managers': return managers
        default: return []
      }
    })()
    
    return {
      active: currentData.filter(item => !item.deleted_at).length,
      trashed: currentData.filter(item => item.deleted_at).length,
      all: currentData.length
    }
  }

  // Removed AuthContext usage to fix circular dependency
  const user: any = null // Will be passed as prop if needed

  const handleApprovePayment = async (paymentId: string) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('payments')
        .update({
          admin_approved: true,
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: user?.id || null
        })
        .eq('id', paymentId)
      if (error) throw error
      await fetchAllDataManual()
    } catch (error) {
      Alert.alert('Ikosa', 'Ntibyashoboye kwemeza ubwishyu.');
    } finally {
      setLoading(false)
    }
  }

  // Render item based on type
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isTrashed = (item as any).deleted_at !== null && (item as any).deleted_at !== undefined
    const deletedDate = isTrashed ? new Date((item as any).deleted_at) : null
    const daysInTrash = deletedDate ? Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
    const daysLeft = 30 - daysInTrash

    return (
      <View style={[
        styles.itemCard,
        isTrashed && styles.trashedCard,
        activeTab === 'payments' && item.admin_approved && styles.approvedCard
      ]}>
        {/* Trash indicator */}
        {isTrashed && (
          <View style={styles.trashIndicator}>
            <Text style={styles.trashBadge}>🗑️ Mu cyuma</Text>
            {daysLeft > 0 && (
              <Text style={styles.daysLeftBadge}>{daysLeft} iminsi yasigaye</Text>
            )}
          </View>
        )}

        {/* Item content based on type */}
        {activeTab === 'properties' && (
          <View>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>{item.address}, {item.city}</Text>
            <View style={styles.itemStats}>
              <Text style={styles.statText}>Ibyumba: {item.total_rooms}</Text>
              <Text style={styles.statText}>Byuzuye: {item.occupied_rooms}</Text>
              <Text style={styles.statText}>Amagorofa: {item.floors_count}</Text>
            </View>
          </View>
        )}

        {activeTab === 'tenants' && (
          <View>
            <Text style={styles.itemTitle}>{item.full_name}</Text>
            <Text style={styles.itemSubtitle}>{item.phone_number}</Text>
            {item.email && <Text style={styles.itemDetail}>{item.email}</Text>}
            <Text style={styles.itemDetail}>ID: {item.id_number}</Text>
          </View>
        )}

        {activeTab === 'payments' && (
          <View>
            <Text style={styles.itemTitle}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.itemSubtitle}>{item.tenantName}</Text>
            <Text style={styles.itemDetail}>{item.propertyName} - Icyumba {item.roomNumber}</Text>
            <Text style={styles.itemDetail}>Landlord: {item.landlordId}</Text>
            {/* Optionally fetch and show landlord payment details here if available */}
            {item.admin_approved ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={{ color: '#10b981', marginLeft: 6 }}>Yemejwe</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={{ marginTop: 8, backgroundColor: '#f59e0b', borderRadius: 8, padding: 8, alignSelf: 'flex-start' }}
                onPress={() => handleApprovePayment(item.id)}
              >
                <Ionicons name="checkmark" size={16} color="white" />
                <Text style={{ color: 'white', marginLeft: 4 }}>Emeza ko byoherejwe</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'managers' && (
          <View>
            <View style={styles.managerHeader}>
              <Text style={styles.itemTitle}>{item.full_name}</Text>
              <View style={[
                styles.statusBadge, 
                item.is_active ? styles.activeBadge : styles.inactiveBadge
              ]}>
                <Text style={[
                  styles.statusText,
                  item.is_active ? styles.activeText : styles.inactiveText
                ]}>
                  {item.is_active ? 'Arimo akora' : 'Ntabwo akora'}
                </Text>
              </View>
            </View>
            <Text style={styles.itemSubtitle}>{item.email}</Text>
            <Text style={styles.itemDetail}>{item.phone_number}</Text>
            <Text style={styles.itemDetail}>Inyubako: {item.property_name}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {isTrashed ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.restoreButton]}
                onPress={() => confirmRestore(activeTab.slice(0, -1), item, item.id)}
                disabled={isRestoringId === item.id}
              >
                <Ionicons name="refresh" size={16} color="white" />
                <Text style={styles.buttonText}>
                  {isRestoringId === item.id ? 'Iragarura...' : 'Garura'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.permanentDeleteButton]}
                onPress={() => confirmDelete(activeTab.slice(0, -1), item, item.id, true)}
                disabled={isPermanentDeleting === item.id}
              >
                <Ionicons name="trash" size={16} color="white" />
                <Text style={styles.buttonText}>
                  {isPermanentDeleting === item.id ? 'Irasiba...' : 'Siba burundu'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {activeTab === 'managers' && (
                <TouchableOpacity
                  style={[
                    styles.actionButton, 
                    item.is_active ? styles.disableButton : styles.enableButton
                  ]}
                  onPress={() => handleToggleManagerStatus(item)}
                >
                  <Ionicons 
                    name={item.is_active ? "pause" : "play"} 
                    size={16} 
                    color="white" 
                  />
                  <Text style={styles.buttonText}>
                    {item.is_active ? 'Hagarika' : 'Emeza'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => confirmDelete(activeTab.slice(0, -1), item, item.id, false)}
                disabled={isDeletingId === item.id}
              >
                <Ionicons name="trash-outline" size={16} color="white" />
                <Text style={styles.buttonText}>
                  {isDeletingId === item.id ? 'Irasiba...' : 'Siba'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    )
  }

  if (!isOpen) return null

  const counts = getCounts()
  const viewModeCounts = getViewModeCounts()
  const filteredData = getFilteredData()

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="shield" size={20} color="#dc2626" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Ikigo cy&apos;Ubuyobozi</Text>
              <Text style={styles.headerSubtitle}>⚡ Ubugenzuzi busesuye</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
            <Ionicons name="refresh" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: 'properties', label: 'Inyubako', icon: 'business', count: counts.properties },
              { id: 'tenants', label: 'Abakode', icon: 'people', count: counts.tenants },
              { id: 'payments', label: 'Ubwishyu', icon: 'card', count: counts.payments },
              { id: 'managers', label: 'Abayobozi', icon: 'person-circle', count: counts.managers }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.activeTab
                ]}
                onPress={() => setActiveTab(tab.id as TabType)}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={16} 
                  color={activeTab === tab.id ? 'white' : '#6b7280'} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText
                ]}>
                  {tab.label}
                </Text>
                <View style={[
                  styles.tabBadge,
                  activeTab === tab.id && styles.activeTabBadge
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    activeTab === tab.id && styles.activeTabBadgeText
                  ]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search and View Mode */}
        <View style={styles.controlsContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Shakisha..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.viewModeContainer}>
            {[
              { mode: 'active', label: 'Bikora', icon: '✅', count: viewModeCounts.active },
              { mode: 'trashed', label: 'Mu cyuma', icon: '🗑️', count: viewModeCounts.trashed },
              { mode: 'all', label: 'Byose', icon: '📋', count: viewModeCounts.all }
            ].map((option) => (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.viewModeButton,
                  viewMode === option.mode && styles.activeViewMode
                ]}
                onPress={() => setViewMode(option.mode as ViewMode)}
              >
                <Text style={[
                  styles.viewModeText,
                  viewMode === option.mode && styles.activeViewModeText
                ]}>
                  {option.icon} {option.label} ({option.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data List */}
        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={styles.loadingText}>Kuraguza amakuru...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredData}
              renderItem={renderItem}
              keyExtractor={(item, index) => `${activeTab}-${item.id}-${index}`}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
              }
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyText}>Nta makuru aboneka</Text>
                  <Text style={styles.emptySubtext}>
                    {searchTerm ? 'Gerageza gushakisha ikindi' : 'Nta makuru ari muri uru rwego'}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* Last Updated */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Gusoza: {lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 20
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600'
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f8fafc'
  },
  activeTab: {
    backgroundColor: '#4f46e5'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280'
  },
  activeTabText: {
    color: 'white'
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    minWidth: 20,
    alignItems: 'center'
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151'
  },
  activeTabBadgeText: {
    color: 'white'
  },
  controlsContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937'
  },
  viewModeContainer: {
    flexDirection: 'row',
    gap: 8
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center'
  },
  activeViewMode: {
    backgroundColor: '#4f46e5'
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280'
  },
  activeViewModeText: {
    color: 'white'
  },
  contentContainer: {
    flex: 1
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  trashedCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    opacity: 0.8
  },
  approvedCard: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  trashIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4
  },
  trashBadge: {
    fontSize: 10,
    backgroundColor: '#dc2626',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600'
  },
  daysLeftBadge: {
    fontSize: 10,
    backgroundColor: '#f59e0b',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600'
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4
  },
  itemDetail: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  statText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500'
  },
  managerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  restoreButton: {
    backgroundColor: '#10b981'
  },
  permanentDeleteButton: {
    backgroundColor: '#dc2626'
  },
  enableButton: {
    backgroundColor: '#10b981'
  },
  disableButton: {
    backgroundColor: '#f59e0b'
  },
  deleteButton: {
    backgroundColor: '#ef4444'
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center'
  }
})

export default AdminPanel 