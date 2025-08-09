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
  Modal
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { 
  formatCurrency, 
  formatDate
} from '@/lib/helpers'
import { useTheme } from './_layout'
import { useLanguage } from '@/lib/languageContext'
import LeaseExtensionFlow from './components/LeaseExtensionFlow'
import IcumbiLogo from './components/IcumbiLogo'
import LanguageSelector from './components/LanguageSelector'

// Local type definitions
interface TenantUser {
  id: string
  full_name: string
  email: string
  phone_number: string | null
  auth_user_id: string
  status: string
  preferred_language: string
  created_at: string
}

interface CurrentLease {
  id: string
  tenant_id: string
  room_id: string
  property_id: string
  start_date: string
  end_date: string
  rent_amount: number
  status: string
  property_name?: string
  room_number?: string
  move_in_date?: string
  move_out_date?: string
  next_due_date?: string
}

interface TenantPayment {
  id: string
  amount: number
  payment_date: string
  payment_methods: string[]
  receipt_number: string
  status: string
  created_at: string
  property_name: string
  room_number: string
}

interface TenantMessage {
  id: string
  subject: string
  message: string
  message_type: string
  is_urgent: boolean
  created_at: string
  status?: string
  property_name?: string
  landlord_reply?: string
  replied_at?: string
}

interface TenantBooking {
  id: string
  booking_type: string
  status: string
  created_at: string
  property_name?: string
  room_number?: string
  preferred_move_in_date?: string
  landlord_response?: string
}

interface PropertyAnnouncement {
  id: string
  title: string
  content: string
  announcement_type: string
  priority: string
  created_at: string
  expires_at: string
  property_name: string
}

interface ExtensionRequest {
  id: string
  extension_months: number
  notes: string
  status: string
  created_at: string
  approval_status: string
  total_amount: number
  current_end_date: string
  requested_end_date: string
  payment_status: string
}

// New interfaces for consumables and catalog
interface ConsumableItem {
  id: string
  name: string
  category: string
  unit_price: number
  unit_type: string
  is_available: boolean
  property_id: string
  description?: string
}

interface ConsumableConsumption {
  id: string
  tenant_id: string
  room_id: string
  consumable_id: string
  quantity: number
  consumed_at: string
  notes?: string
  created_at: string
  consumable_name?: string
  unit_price?: number
  total_amount?: number
  unit_type?: string
}

interface ConsumableBill {
  id: string
  tenant_id: string
  room_id: string
  booking_id?: string
  total: number
  notes?: string
  created_at: string
  bill_items?: ConsumableBillItem[]
}

interface ConsumableBillItem {
  id: string
  bill_id: string
  consumable_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  consumable_name?: string
}

interface CartItem {
  consumable: ConsumableItem
  quantity: number
  total_price: number
}

// Local helper functions
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active': return '#10b981'
    case 'pending': return '#f59e0b'
    case 'overdue': return '#ef4444'
    case 'completed': return '#3b82f6'
    default: return '#6b7280'
  }
}

const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high': return '#ef4444'
    case 'medium': return '#f59e0b'
    case 'low': return '#10b981'
    default: return '#6b7280'
  }
}

const getMessageTypeText = (type: string): string => {
  switch (type) {
    case 'general': return 'General'
    case 'maintenance': return 'Maintenance'
    case 'payment': return 'Payment'
    case 'emergency': return 'Emergency'
    default: return 'General'
  }
}

const getDaysUntilDue = (dueDateString: string): number => {
  const dueDate = new Date(dueDateString)
  const today = new Date()
  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const isOverdue = (dueDateString: string): boolean => {
  return getDaysUntilDue(dueDateString) < 0
}

type TabType = 'overview' | 'bookings' | 'payments' | 'messages' | 'announcements' | 'extend'

export default function TenantDashboard() {
  const { theme } = useTheme()
  const { t } = useLanguage()
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null)
  const [currentLease, setCurrentLease] = useState<CurrentLease | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Data states
  const [bookings, setBookings] = useState<TenantBooking[]>([])
  const [payments, setPayments] = useState<TenantPayment[]>([])
  const [messages, setMessages] = useState<TenantMessage[]>([])
  const [announcements, setAnnouncements] = useState<PropertyAnnouncement[]>([])
  const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([])
  
  // New data states for consumables and catalog
  const [consumableItems, setConsumableItems] = useState<ConsumableItem[]>([])
  const [consumptions, setConsumptions] = useState<ConsumableConsumption[]>([])
  const [consumableBills, setConsumableBills] = useState<ConsumableBill[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [tenantRecord, setTenantRecord] = useState<{id: string} | null>(null)

  // Form states
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [showExtensionFlow, setShowExtensionFlow] = useState(false)
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [showConsumptionModal, setShowConsumptionModal] = useState(false)
  const [newMessage, setNewMessage] = useState({
    subject: '',
    message: '',
    message_type: 'general',
    is_urgent: false
  })
  const [extensionForm, setExtensionForm] = useState({
    extension_months: 1,
    notes: ''
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    checkTenantAndLoadData()
  }, [])

  const checkTenantAndLoadData = async () => {
    try {
      setLoading(true)
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        Alert.alert('Ikosa', 'Nta bucukumbuzi bwemerewe busanganywe. Injira nk&apos;umukodesha.')
        return
      }

      // First check if user has a tenant_users record
      const { data: tenantUserRecord, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select('id, full_name, email, phone_number, status')
        .eq('auth_user_id', user.id)
        .single()

      if (tenantUserRecord) {
        // Set tenant info from tenant_users record
        const tenantInfo: TenantUser = {
          id: tenantUserRecord.id,
          full_name: tenantUserRecord.full_name || user.email || 'Tenant',
          email: tenantUserRecord.email || user.email || '',
          phone_number: tenantUserRecord.phone_number || user.user_metadata?.phone_number || null,
          auth_user_id: user.id,
          status: tenantUserRecord.status || 'active',
          preferred_language: 'rw',
          created_at: new Date().toISOString()
        }
        setTenantUser(tenantInfo)
        await loadTenantData(user.id) // Pass auth user id
      } else {
        console.log('❌ [TENANT-DASHBOARD] No tenant_users record found for auth user:', user.id)
        
        // Try to create tenant_users record if it doesn't exist
        try {
          console.log('🔧 Attempting to create missing tenant_users record...')
          
          // Get user data from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, email, phone_number')
            .eq('id', user.id)
            .single()
            
          if (userData) {
            const { data: newTenantUser, error: createError } = await supabase
              .from('tenant_users')
              .insert({
                auth_user_id: user.id,
                full_name: userData.full_name,
                email: userData.email || user.email || '',
                phone_number: userData.phone_number,
                status: 'active'
              })
              .select()
              .single()
              
            if (newTenantUser && !createError) {
              console.log('✅ Created missing tenant_users record:', newTenantUser.id)
              
              // Set tenant info from newly created record
              const tenantInfo: TenantUser = {
                id: newTenantUser.id,
                full_name: newTenantUser.full_name || user.email || 'Tenant',
                email: newTenantUser.email || user.email || '',
                phone_number: newTenantUser.phone_number || user.user_metadata?.phone_number || null,
                auth_user_id: user.id,
                status: newTenantUser.status || 'active',
                preferred_language: 'rw',
                created_at: new Date().toISOString()
              }
              setTenantUser(tenantInfo)
              await loadTenantData(user.id)
              return
            } else {
              console.error('❌ Failed to create tenant_users record:', createError)
            }
          }
        } catch (createError) {
          console.error('❌ Error creating tenant_users record:', createError)
        }
        
        // If we can't create the record, show error
        Alert.alert('Ikosa', 'Nta makuru ya mukode asanzwe. Nyamuneka vugana nabayobozi.')
        return
      }
    } catch (error) {
      console.error('Error checking tenant:', error)
      Alert.alert('Ikosa', 'Hari ikosa ryabaye mu gushaka amakuru yawe.')
    } finally {
      setLoading(false)
    }
  }

  const loadTenantData = async (authUserId: string) => {
    try {
      console.log('🔍 [TENANT-DASHBOARD] Loading tenant data for auth user:', authUserId)
      
      // First, find the tenant_user record using auth_user_id
      const { data: tenantUserData, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select('id, full_name, email, phone_number')
        .eq('auth_user_id', authUserId)
        .single()

      if (tenantUserError || !tenantUserData) {
        console.error('❌ [TENANT-DASHBOARD] No tenant_user found for auth user:', authUserId, tenantUserError)
        
        // Try to create the missing tenant_user record
        try {
          console.log('🔧 Attempting to create missing tenant_user record in loadTenantData...')
          
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, email, phone_number')
            .eq('id', authUserId)
            .single()
            
          if (userData) {
            const { data: newTenantUser, error: createError } = await supabase
              .from('tenant_users')
              .insert({
                auth_user_id: authUserId,
                full_name: userData.full_name,
                email: userData.email || '',
                phone_number: userData.phone_number,
                status: 'active'
              })
              .select()
              .single()
              
            if (newTenantUser && !createError) {
              console.log('✅ Created missing tenant_user record in loadTenantData:', newTenantUser.id)
              // Continue with the newly created record
              const tenantUserData = newTenantUser
            } else {
              console.error('❌ Failed to create tenant_user record in loadTenantData:', createError)
              setCurrentLease(null)
              return
            }
          } else {
            setCurrentLease(null)
            return
          }
        } catch (createError) {
          console.error('❌ Error creating tenant_user record in loadTenantData:', createError)
          setCurrentLease(null)
          return
        }
      }

      console.log('✅ [TENANT-DASHBOARD] Found tenant_user:', tenantUserData)

      // Now find the tenant record using tenant_user_id
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('tenant_user_id', tenantUserData?.id)
        .single()

      if (tenantError || !tenantData) {
        console.error('❌ [TENANT-DASHBOARD] No tenant found for tenant_user:', tenantUserData?.id, tenantError)
        setCurrentLease(null)
        return
      }

      console.log('✅ [TENANT-DASHBOARD] Found tenant:', tenantData)
      setTenantRecord(tenantData)

      // Load current lease from room_tenants
      const { data: currentLeaseData, error: leaseError } = await supabase
        .from('room_tenants')
        .select(`
          id,
          room_id,
          tenant_id,
          rent_amount,
          move_in_date,
          move_out_date,
          next_due_date,
          is_active,
          rooms!inner (
            id,
            room_number,
            floor_number,
            properties!inner (
              id,
              name
            )
          )
        `)
        .eq('tenant_id', tenantData.id)
        .eq('is_active', true)
        .single()

      if (currentLeaseData && !leaseError) {
        console.log('✅ [TENANT-DASHBOARD] Found current lease:', currentLeaseData)
        const lease: CurrentLease = {
          id: currentLeaseData.id,
          tenant_id: currentLeaseData.tenant_id,
          room_id: currentLeaseData.room_id,
          property_id: (currentLeaseData.rooms as any).properties.id,
          start_date: currentLeaseData.move_in_date,
          end_date: currentLeaseData.move_out_date || '',
          rent_amount: currentLeaseData.rent_amount,
          status: 'active',
          property_name: (currentLeaseData.rooms as any).properties.name,
          room_number: (currentLeaseData.rooms as any).room_number,
          move_in_date: currentLeaseData.move_in_date,
          move_out_date: currentLeaseData.move_out_date,
          next_due_date: currentLeaseData.next_due_date
        }
        setCurrentLease(lease)
        console.log('✅ [TENANT-DASHBOARD] Current lease set:', lease)
      } else {
        console.log('⚠️ [TENANT-DASHBOARD] No active lease found or error:', leaseError)
        setCurrentLease(null)
      }

      if (tenantData) {
        setTenantRecord(tenantData)
      }

      // Load bookings using auth user id
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tenant_bookings')
        .select(`
          id,
          booking_type,
          status,
          preferred_move_in_date,
          landlord_response,
          created_at,
          properties!inner (name),
          rooms (room_number)
        `)
        .eq('tenant_user_id', authUserId)
        .order('created_at', { ascending: false })

      if (bookingsData && !bookingsError) {
        console.log('✅ [TENANT-DASHBOARD] Found bookings:', bookingsData.length)
        setBookings(bookingsData.map(booking => ({
          id: booking.id,
          property_name: (booking.properties as any).name,
          room_number: (booking.rooms as any)?.room_number || 'Rusange',
          booking_type: booking.booking_type,
          status: booking.status,
          preferred_move_in_date: booking.preferred_move_in_date,
          created_at: booking.created_at,
          landlord_response: booking.landlord_response
        })))
      } else {
        console.log('⚠️ [TENANT-DASHBOARD] No bookings found or error:', bookingsError)
        setBookings([])
      }

      // Load payments using the found tenant record
      if (tenantData) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id,
            amount,
            payment_date,
            payment_methods,
            receipt_number,
            status,
            created_at,
            rooms!inner (
              room_number,
              properties!inner (name)
            )
          `)
          .eq('tenant_id', tenantData.id)
          .order('payment_date', { ascending: false })

        if (paymentsData && !paymentsError) {
          console.log('✅ [TENANT-DASHBOARD] Found payments:', paymentsData.length)
          setPayments(paymentsData.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            payment_date: payment.payment_date,
            payment_methods: payment.payment_methods || [],
            receipt_number: payment.receipt_number,
            status: payment.status || 'completed',
            created_at: payment.created_at,
            property_name: (payment.rooms as any).properties.name,
            room_number: (payment.rooms as any).room_number
          })))
        } else {
          console.log('⚠️ [TENANT-DASHBOARD] No payments found or error:', paymentsError)
          setPayments([])
        }
      }

      // Load messages using auth user id
      const { data: messagesData, error: messagesError } = await supabase
        .from('tenant_messages')
        .select(`
          id,
          subject,
          message,
          message_type,
          status,
          is_urgent,
          landlord_reply,
          replied_at,
          created_at,
          properties!inner (name)
        `)
        .eq('tenant_user_id', authUserId)
        .order('created_at', { ascending: false })

      if (messagesData && !messagesError) {
        console.log('✅ [TENANT-DASHBOARD] Found messages:', messagesData.length)
        setMessages(messagesData.map(msg => ({
          id: msg.id,
          subject: msg.subject,
          message: msg.message,
          message_type: msg.message_type,
          status: msg.status,
          is_urgent: msg.is_urgent,
          landlord_reply: msg.landlord_reply,
          replied_at: msg.replied_at,
          created_at: msg.created_at,
          property_name: (msg.properties as any).name
        })))
      } else {
        console.log('⚠️ [TENANT-DASHBOARD] No messages found or error:', messagesError)
        setMessages([])
      }

      // Load announcements for tenant's property
      if (currentLease) {
        const { data: announcementsData } = await supabase
          .from('property_announcements')
          .select(`
            id,
            title,
            content,
            announcement_type,
            priority,
            created_at,
            expires_at,
            properties!inner (name)
          `)
          .eq('property_id', currentLease.property_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (announcementsData) {
          setAnnouncements(announcementsData.map(ann => ({
            id: ann.id,
            title: ann.title,
            content: ann.content,
            announcement_type: ann.announcement_type,
            priority: ann.priority,
            created_at: ann.created_at,
            expires_at: ann.expires_at,
            property_name: (ann.properties as any).name
          })))
        }
      }

      // Load extension requests using auth user id
      const { data: extensionsData, error: extensionsError } = await supabase
        .from('stay_extension_requests')
        .select('*')
        .eq('tenant_user_id', authUserId)
        .order('created_at', { ascending: false })

      if (extensionsData && !extensionsError) {
        console.log('✅ [TENANT-DASHBOARD] Found extension requests:', extensionsData.length)
        setExtensionRequests(extensionsData)
      } else {
        console.log('⚠️ [TENANT-DASHBOARD] No extension requests found or error:', extensionsError)
        setExtensionRequests([])
      }

      // Load consumable items for tenant's property
      const lease = currentLeaseData ? {
        property_id: (currentLeaseData.rooms as any).properties.id
      } : null

      if (lease) {
        const { data: consumablesData, error: consumablesError } = await supabase
          .from('consumables_catalog')
          .select('*')
          .eq('property_id', lease.property_id)
          .eq('is_available', true)
          .order('name', { ascending: true })

        if (consumablesData && !consumablesError) {
          console.log('✅ [TENANT-DASHBOARD] Found consumable items:', consumablesData.length)
          setConsumableItems(consumablesData)
        } else {
          console.log('⚠️ [TENANT-DASHBOARD] No consumable items found or error:', consumablesError)
          setConsumableItems([])
        }
      }

      // Load consumptions for tenant
      if (tenantData) {
        const { data: consumptionsData, error: consumptionsError } = await supabase
          .from('consumable_consumptions')
          .select(`
            *,
            consumables_catalog!inner (name, unit_price, unit_type)
          `)
          .eq('tenant_id', tenantData.id)
          .order('consumed_at', { ascending: false })

        if (consumptionsData && !consumptionsError) {
          console.log('✅ [TENANT-DASHBOARD] Found consumptions:', consumptionsData.length)
          setConsumptions(consumptionsData.map(consumption => ({
            ...consumption,
            consumable_name: (consumption.consumables_catalog as any).name,
            unit_price: (consumption.consumables_catalog as any).unit_price,
            unit_type: (consumption.consumables_catalog as any).unit_type,
            total_amount: consumption.quantity * (consumption.consumables_catalog as any).unit_price
          })))
        } else {
          console.log('⚠️ [TENANT-DASHBOARD] No consumptions found or error:', consumptionsError)
          setConsumptions([])
        }

        // Load consumable bills
        const { data: billsData, error: billsError } = await supabase
          .from('consumable_bills')
          .select(`
            *,
            consumable_bill_items (
              *,
              consumables_catalog!inner (name)
            )
          `)
          .eq('tenant_id', tenantData.id)
          .order('created_at', { ascending: false })

        if (billsData && !billsError) {
          console.log('✅ [TENANT-DASHBOARD] Found consumable bills:', billsData.length)
          setConsumableBills(billsData.map(bill => ({
            ...bill,
            bill_items: (bill.consumable_bill_items as any[]).map(item => ({
              ...item,
              consumable_name: (item.consumables_catalog as any).name
            }))
          })))
        } else {
          console.log('⚠️ [TENANT-DASHBOARD] No consumable bills found or error:', billsError)
          setConsumableBills([])
        }
      }

    } catch (error) {
      console.error('Error loading tenant data:', error)
    }
  }

  const onRefresh = async () => {
    if (!tenantUser) return
    setRefreshing(true)
    await loadTenantData(tenantUser.auth_user_id)
    setRefreshing(false)
  }

  const sendMessage = async () => {
    if (!newMessage.subject.trim() || !newMessage.message.trim() || !currentLease || !tenantUser) return

    try {
      setSending(true)
      
      const { error } = await supabase
        .from('tenant_messages')
        .insert({
          tenant_user_id: tenantUser.auth_user_id, // Use auth_user_id for messages
          property_id: currentLease.property_id,
          recipient_type: 'landlord',
          subject: newMessage.subject,
          message: newMessage.message,
          message_type: newMessage.message_type,
          is_urgent: newMessage.is_urgent
        })

      if (error) throw error

      setNewMessage({
        subject: '',
        message: '',
        message_type: 'general',
        is_urgent: false
      })
      setShowMessageModal(false)
      
      Alert.alert(t('messageSent'), t('messageSentSuccess'))
      await loadTenantData(tenantUser.auth_user_id)
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert(t('error'), t('messageSendError'))
    } finally {
      setSending(false)
    }
  }

  const requestExtension = async () => {
    if (!currentLease || !extensionForm.extension_months || !tenantUser) return

    try {
      setSending(true)
      
      const currentEndDate = new Date(currentLease.end_date || '')
      const requestedEndDate = new Date(currentEndDate)
      requestedEndDate.setMonth(requestedEndDate.getMonth() + extensionForm.extension_months)

      const totalAmount = currentLease.rent_amount * extensionForm.extension_months

      const { error } = await supabase
        .from('stay_extension_requests')
        .insert({
          tenant_user_id: tenantUser.auth_user_id, // Use auth_user_id for extension requests
          room_tenant_id: currentLease.id,
          current_end_date: currentEndDate.toISOString().split('T')[0],
          requested_end_date: requestedEndDate.toISOString().split('T')[0],
          extension_months: extensionForm.extension_months,
          total_amount: totalAmount,
          notes: extensionForm.notes
        })

      if (error) throw error

      setExtensionForm({
        extension_months: 1,
        notes: ''
      })
      setShowExtensionModal(false)
      
      Alert.alert(t('extensionRequestSent'), t('extensionRequestSuccess'))
      await loadTenantData(tenantUser.auth_user_id)
    } catch (error) {
      console.error('Error requesting extension:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye kohereza icyifuzo. Ongera ugerageze.')
    } finally {
      setSending(false)
    }
  }

  // Catalog and consumption functions
  const addToCart = (consumable: ConsumableItem, quantity: number = 1) => {
    const existingItem = cartItems.find(item => item.consumable.id === consumable.id)
    
    if (existingItem) {
      setCartItems(cartItems.map(item => 
        item.consumable.id === consumable.id 
          ? { ...item, quantity: item.quantity + quantity, total_price: (item.quantity + quantity) * consumable.unit_price }
          : item
      ))
    } else {
      setCartItems([...cartItems, {
        consumable,
        quantity,
        total_price: quantity * consumable.unit_price
      }])
    }
  }

  const removeFromCart = (consumableId: string) => {
    setCartItems(cartItems.filter(item => item.consumable.id !== consumableId))
  }

  const updateCartQuantity = (consumableId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(consumableId)
    } else {
      setCartItems(cartItems.map(item => 
        item.consumable.id === consumableId 
          ? { ...item, quantity, total_price: quantity * item.consumable.unit_price }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.total_price, 0)
  }

  const processCatalogOrder = async () => {
    if (!tenantRecord || !currentLease || cartItems.length === 0) return

    try {
      setSending(true)

      // Create consumable bill
      const totalAmount = getCartTotal()
      const { data: billData, error: billError } = await supabase
        .from('consumable_bills')
        .insert({
          tenant_id: tenantRecord.id,
          room_id: currentLease.room_id,
          total: totalAmount,
          notes: 'Catalog order'
        })
        .select()
        .single()

      if (billError) throw billError

      // Create bill items and consumptions
      for (const cartItem of cartItems) {
        // Create bill item
        await supabase
          .from('consumable_bill_items')
          .insert({
            bill_id: billData.id,
            consumable_id: cartItem.consumable.id,
            quantity: cartItem.quantity,
            unit_price: cartItem.consumable.unit_price,
            total_price: cartItem.total_price
          })

        // Create consumption record
        await supabase
          .from('consumable_consumptions')
          .insert({
            tenant_id: tenantRecord.id,
            room_id: currentLease.room_id,
            consumable_id: cartItem.consumable.id,
            quantity: cartItem.quantity,
            consumed_at: new Date().toISOString(),
            notes: 'Catalog order'
          })
      }

      // Clear cart
      setCartItems([])
      setShowCatalogModal(false)
      
      Alert.alert('Icyifuzo cyoherejwe', 'Icyifuzo cyawe cyoherejwe neza.')
      await loadTenantData(tenantUser!.auth_user_id)
    } catch (error) {
      console.error('Error processing catalog order:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye kohereza icyifuzo. Ongera ugerageze.')
    } finally {
      setSending(false)
    }
  }

  const addConsumption = async (consumableId: string, quantity: number, notes?: string) => {
    if (!tenantRecord || !currentLease) return

    try {
      setSending(true)

      await supabase
        .from('consumable_consumptions')
        .insert({
          tenant_id: tenantRecord.id,
          room_id: currentLease.room_id,
          consumable_id: consumableId,
          quantity,
          consumed_at: new Date().toISOString(),
          notes
        })

      setShowConsumptionModal(false)
      Alert.alert('Kongerwa', 'Ibintu byongewe neza.')
      await loadTenantData(tenantUser!.auth_user_id)
    } catch (error) {
      console.error('Error adding consumption:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye kongerwa ibintu. Ongera ugerageze.')
    } finally {
      setSending(false)
    }
  }

  // Sign out functionality removed as requested

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'bookings':
        return renderBookingsTab()
      case 'payments':
        return renderPaymentsTab()
      case 'messages':
        return renderMessagesTab()
      case 'announcements':
        return renderAnnouncementsTab()
      case 'extend':
        return renderExtendTab()
      default:
        return renderOverviewTab()
    }
  }

  const renderOverviewTab = () => {
    // Calculate days remaining for rent
    const getDaysRemaining = () => {
      if (!currentLease?.end_date) return null
      const today = new Date()
      const dueDate = new Date(currentLease.end_date)
      const diffTime = dueDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    const daysRemaining = getDaysRemaining()
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const monthlyRent = currentLease?.rent_amount || 0
    const monthsPaid = Math.floor(totalPaid / monthlyRent)

    return (
      <ScrollView style={styles.tabContent}>
        {/* Current Lease Card with Enhanced Details */}
        {currentLease && (
          <View style={[styles.leaseCard, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="home" size={24} color="#3b82f6" />
              <Text style={styles.cardTitle}>Kontrayi yawe</Text>
            </View>
            
            {/* Property Details */}
            <View style={styles.propertySection}>
              <View style={styles.propertyHeader}>
                <Ionicons name="business" size={20} color="#6b7280" />
                <Text style={styles.sectionTitle}>Amakuru y&apos;inzu</Text>
              </View>
              <View style={styles.leaseDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Inzu:</Text>
                  <Text style={styles.detailValue}>{currentLease.property_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Icyumba:</Text>
                  <Text style={styles.detailValue}>{currentLease.room_number || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ubukode buri kwezi:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(currentLease.rent_amount)}</Text>
                </View>
              </View>
            </View>

            {/* Lease Period Details */}
            <View style={styles.leasePeriodSection}>
              <View style={styles.propertyHeader}>
                <Ionicons name="calendar" size={20} color="#6b7280" />
                <Text style={styles.sectionTitle}>Igihe cyo ubukode</Text>
              </View>
              <View style={styles.leaseDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Itangira:</Text>
                  <Text style={styles.detailValue}>{formatDate(currentLease.move_in_date || currentLease.start_date)}</Text>
                </View>
                {(currentLease.move_out_date || currentLease.end_date) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Irangira:</Text>
                    <Text style={styles.detailValue}>{formatDate(currentLease.move_out_date || currentLease.end_date)}</Text>
                  </View>
                )}
                {currentLease.next_due_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Itariki yo kwishyura ikurikira:</Text>
                    <Text style={[
                      styles.detailValue,
                      isOverdue(currentLease.next_due_date) && styles.overdueText
                    ]}>
                      {formatDate(currentLease.next_due_date)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Countdown Timer */}
            {daysRemaining !== null && (
              <View style={styles.countdownSection}>
                <View style={styles.countdownHeader}>
                  <Ionicons name="time" size={20} color={daysRemaining <= 7 ? "#ef4444" : "#6b7280"} />
                  <Text style={styles.sectionTitle}>Igihe gisigaye</Text>
                </View>
                <View style={styles.countdownCard}>
                  <Text style={[
                    styles.countdownNumber,
                    daysRemaining <= 7 && styles.urgentCountdown
                  ]}>
                    {daysRemaining}
                  </Text>
                  <Text style={styles.countdownLabel}>
                    {daysRemaining === 1 ? "Umunsi" : "Iminsi"} gisigaye
                  </Text>
                  {daysRemaining <= 7 && (
                                         <Text style={styles.urgentText}>
                       {daysRemaining <= 0 ? "Igihe cyarangiye!" : "Igihe gisigaye gito!"}
                     </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Payment Summary Card */}
        <View style={[styles.paymentSummaryCard, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="card" size={24} color="#10b981" />
            <Text style={styles.cardTitle}>{t('financialInfo')}</Text>
          </View>
          
          <View style={styles.paymentStats}>
            <View style={[styles.paymentStat, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.paymentStatLabel, { color: theme.textSecondary }]}>{t('totalPaid')}</Text>
              <Text style={[styles.paymentStatValue, { color: theme.text }]}>{formatCurrency(totalPaid)}</Text>
            </View>
            <View style={[styles.paymentStat, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.paymentStatLabel, { color: theme.textSecondary }]}>{t('monthsPaid')}</Text>
              <Text style={[styles.paymentStatValue, { color: theme.text }]}>{monthsPaid}</Text>
            </View>
            <View style={[styles.paymentStat, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.paymentStatLabel, { color: theme.textSecondary }]}>{t('receipts')}</Text>
              <Text style={[styles.paymentStatValue, { color: theme.text }]}>{payments.length}</Text>
            </View>
          </View>

          {/* Recent Payments */}
          {payments.length > 0 && (
            <View style={styles.recentPaymentsSection}>
              <Text style={styles.subsectionTitle}>{t('recentPayments')}</Text>
                              {payments.slice(0, 3).map((payment, index) => (
                  <View key={`payment-${payment.id}-${index}`} style={[styles.paymentItem, { backgroundColor: theme.surfaceVariant }]}>
                  <View style={styles.paymentItemHeader}>
                    <Text style={[styles.paymentAmount, { color: theme.text }]}>{formatCurrency(payment.amount)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
                      <Text style={styles.statusText}>{payment.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.paymentDate, { color: theme.textSecondary }]}>{formatDate(payment.payment_date)}</Text>
                  {payment.receipt_number && (
                                          <Text style={[styles.receiptNumber, { color: theme.primary }]}>{t('receiptNumber')} {payment.receipt_number}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="calendar" size={24} color="#3b82f6" />
            <Text style={[styles.statNumber, { color: theme.text }]}>{bookings.length}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('reservations')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="chatbubble" size={24} color="#8b5cf6" />
            <Text style={[styles.statNumber, { color: theme.text }]}>{messages.length}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('messages')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="megaphone" size={24} color="#f59e0b" />
            <Text style={[styles.statNumber, { color: theme.text }]}>{announcements.length}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('announcements')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="time" size={24} color="#ef4444" />
            <Text style={[styles.statNumber, { color: theme.text }]}>{extensionRequests.length}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('extensionRequests')}</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={[styles.activityCard, { backgroundColor: theme.card }]}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>{t('recentActivities')}</Text>
                          {payments.slice(0, 2).map((payment, index) => (
                  <View key={`payment-${payment.id}-${index}`} style={styles.activityItem}>
              <Ionicons name="card" size={20} color="#10b981" />
              <View style={styles.activityText}>
                <Text style={[styles.activityTitle, { color: theme.text }]}>
                  Kwishyura {formatCurrency(payment.amount)}
                </Text>
                <Text style={[styles.activitySubtitle, { color: theme.textSecondary }]}>
                  {payment.property_name} - {formatDate(payment.payment_date)}
                </Text>
              </View>
            </View>
          ))}
                          {announcements.slice(0, 2).map((announcement, index) => (
                  <View key={`announcement-${announcement.id}-${index}`} style={styles.activityItem}>
              <Ionicons name="megaphone" size={20} color="#f59e0b" />
              <View style={styles.activityText}>
                <Text style={[styles.activityTitle, { color: theme.text }]}>{announcement.title}</Text>
                <Text style={[styles.activitySubtitle, { color: theme.textSecondary }]}>
                  {announcement.property_name} - {formatDate(announcement.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    )
  }

  const renderBookingsTab = () => {
    // Sort bookings by newest first or approaching soonest
    const sortedBookings = [...bookings].sort((a, b) => {
      // If both have move-in dates, sort by approaching soonest
      if (a.preferred_move_in_date && b.preferred_move_in_date) {
        const dateA = new Date(a.preferred_move_in_date)
        const dateB = new Date(b.preferred_move_in_date)
        return dateA.getTime() - dateB.getTime()
      }
      // Otherwise sort by created date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.sortingHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('reservationHistory')}</Text>
          <Text style={[styles.sortingInfo, { color: theme.textSecondary }]}>
            Ibisobanura: {sortedBookings.length > 0 && sortedBookings[0].preferred_move_in_date ? 'Igihe gisigaye' : 'Bishya'}
          </Text>
        </View>
        
        {sortedBookings.map((booking, index) => (
          <View key={`booking-${booking.id}-${index}`} style={[styles.listItem, { backgroundColor: theme.card }]}>
            <View style={styles.listItemHeader}>
              <Text style={[styles.listItemTitle, { color: theme.text }]}>{booking.property_name || 'Property'}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                <Text style={styles.statusText}>{booking.status}</Text>
              </View>
            </View>
            <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
              {booking.booking_type} - {booking.room_number || 'Room'}
            </Text>
            {booking.preferred_move_in_date && (
              <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
                Itariki yo kwinjira: {formatDate(booking.preferred_move_in_date)}
              </Text>
            )}
            <Text style={[styles.listItemDate, { color: theme.textSecondary }]}>
              {formatDate(booking.created_at)}
            </Text>
            {booking.landlord_response && (
              <Text style={[styles.listItemReply, { color: theme.primary }]}>
                Igisubizo: {booking.landlord_response}
              </Text>
            )}
          </View>
        ))}
        {sortedBookings.length === 0 && (
                      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noReservations')}</Text>
        )}
      </ScrollView>
    )
  }

  const renderPaymentsTab = () => (
    <ScrollView style={styles.tabContent}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('paymentHistory')}</Text>
      
      {/* Regular Payments */}
      <Text style={[styles.subsectionTitle, { color: theme.text }]}>Kwishyura</Text>
      {payments.map((payment, index) => (
        <View key={`payment-${payment.id}-${index}`} style={[styles.listItem, { backgroundColor: theme.card }]}>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemTitle, { color: theme.text }]}>{formatCurrency(payment.amount)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
              <Text style={styles.statusText}>{payment.status}</Text>
            </View>
          </View>
          <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
            {payment.property_name} - {payment.room_number}
          </Text>
          <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
            Itariki: {formatDate(payment.payment_date)}
          </Text>
          {payment.receipt_number && (
            <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
              {t('receiptNumber')} {payment.receipt_number}
            </Text>
          )}
          {payment.payment_methods.length > 0 && (
            <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
              Uburyo: {payment.payment_methods.join(', ')}
            </Text>
          )}
        </View>
      ))}
      
      {/* Consumptions */}
      <Text style={[styles.subsectionTitle, { color: theme.text }]}>Kongerwa</Text>
      {consumptions.map((consumption, index) => (
        <View key={`consumption-${consumption.id}-${index}`} style={[styles.listItem, { backgroundColor: theme.card }]}>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemTitle, { color: theme.text }]}>{consumption.consumable_name}</Text>
            <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
              {consumption.quantity} {consumption.unit_type || 'units'}
            </Text>
          </View>
          <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
            Igiciro: {formatCurrency(consumption.total_amount || 0)}
          </Text>
          <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
            Itariki: {formatDate(consumption.consumed_at)}
          </Text>
          {consumption.notes && (
            <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
              Inyandiko: {consumption.notes}
            </Text>
          )}
        </View>
      ))}
      
      {/* Consumable Bills */}
      <Text style={[styles.subsectionTitle, { color: theme.text }]}>Amabwiriza y&apos;ibintu</Text>
      {consumableBills.map((bill, index) => (
        <View key={`bill-${bill.id}-${index}`} style={[styles.listItem, { backgroundColor: theme.card }]}>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemTitle, { color: theme.text }]}>{formatCurrency(bill.total)}</Text>
            <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
              {formatDate(bill.created_at)}
            </Text>
          </View>
          {bill.bill_items && bill.bill_items.length > 0 && (
            <View style={styles.billItems}>
              {bill.bill_items.map((item, itemIndex) => (
                <Text key={itemIndex} style={[styles.billItem, { color: theme.textSecondary }]}>
                  • {item.consumable_name}: {item.quantity} x {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                </Text>
              ))}
            </View>
          )}
          {bill.notes && (
            <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
              Inyandiko: {bill.notes}
            </Text>
          )}
        </View>
      ))}
      
      {payments.length === 0 && consumptions.length === 0 && consumableBills.length === 0 && (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nta mafaranga yishyuwe</Text>
      )}
    </ScrollView>
  )

  const renderMessagesTab = () => (
    <ScrollView style={styles.tabContent}>
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowMessageModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.addButtonText}>{t('sendMessage')}</Text>
      </TouchableOpacity>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('messageHistory')}</Text>
                      {messages.map((message, index) => (
                  <View key={`message-${message.id}-${index}`} style={[styles.listItem, { backgroundColor: theme.card }]}>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemTitle, { color: theme.text }]}>{message.subject}</Text>
            <View style={styles.messageBadges}>
              {message.is_urgent && (
                <Ionicons name="warning" size={16} color={theme.error} />
              )}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(message.status || 'pending') }]}>
                <Text style={styles.statusText}>{message.status || 'pending'}</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
            {getMessageTypeText(message.message_type)} - {message.property_name || t('property')}
          </Text>
          <Text style={[styles.messageContent, { color: theme.text }]}>{message.message}</Text>
          {message.landlord_reply && (
            <View style={styles.replyContainer}>
              <Text style={[styles.replyTitle, { color: theme.primary }]}>{t('reply')}:</Text>
              <Text style={[styles.replyContent, { color: theme.text }]}>{message.landlord_reply}</Text>
              <Text style={[styles.replyDate, { color: theme.textSecondary }]}>
                {message.replied_at && formatDate(message.replied_at)}
              </Text>
            </View>
          )}
          <Text style={[styles.listItemDate, { color: theme.textSecondary }]}>
            {formatDate(message.created_at)}
          </Text>
        </View>
      ))}
      {messages.length === 0 && (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noMessages')}</Text>
      )}
    </ScrollView>
  )

  const renderAnnouncementsTab = () => (
    <ScrollView style={styles.tabContent}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('houseAnnouncements')}</Text>
                      {announcements.map((announcement, index) => (
                  <View key={`announcement-${announcement.id}-${index}`} style={[styles.listItem, { backgroundColor: theme.card }]}>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemTitle, { color: theme.text }]}>{announcement.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getPriorityColor(announcement.priority) }]}>
              <Text style={styles.statusText}>{announcement.priority}</Text>
            </View>
          </View>
          <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
            {announcement.announcement_type} - {announcement.property_name}
          </Text>
          <Text style={[styles.messageContent, { color: theme.text }]}>{announcement.content}</Text>
          <Text style={[styles.listItemDate, { color: theme.textSecondary }]}>
            {formatDate(announcement.created_at)}
          </Text>
          {announcement.expires_at && (
            <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
              Irangira: {formatDate(announcement.expires_at)}
            </Text>
          )}
        </View>
      ))}
      {announcements.length === 0 && (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nta matangazo ahari</Text>
      )}
    </ScrollView>
  )

  const renderExtendTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Current Lease Info */}
      {currentLease && (
        <View style={[styles.leaseCard, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="home" size={24} color="#3b82f6" />
            <Text style={styles.cardTitle}>Kontrayi yawe</Text>
          </View>
          <View style={styles.leaseDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Inzu:</Text>
              <Text style={styles.detailValue}>{currentLease.property_name || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Icyumba:</Text>
              <Text style={styles.detailValue}>{currentLease.room_number || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ubukode buri kwezi:</Text>
              <Text style={styles.detailValue}>{formatCurrency(currentLease.rent_amount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Itariki yo kurangiza:</Text>
              <Text style={styles.detailValue}>{formatDate(currentLease.end_date)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Extension Request Button */}
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowExtensionFlow(true)}
      >
        <Ionicons name="time" size={24} color="white" />
                    <Text style={styles.addButtonText}>{t('extendTimeButton')}</Text>
      </TouchableOpacity>

      {/* Catalog Section */}
      {currentLease && consumableItems.length > 0 && (
        <View style={styles.catalogSection}>
          <View style={styles.catalogHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ibintu byo kongerwa</Text>
            <TouchableOpacity 
              style={[styles.catalogButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowCatalogModal(true)}
            >
              <Ionicons name="cart" size={20} color="white" />
              <Text style={styles.catalogButtonText}>
                {cartItems.length > 0 ? `${cartItems.length} ibintu` : 'Kongera'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.catalogGrid}>
            {consumableItems.slice(0, 6).map((item, index) => (
              <TouchableOpacity
                key={`catalog-${item.id}-${index}`}
                style={[styles.catalogItem, { backgroundColor: theme.card }]}
                onPress={() => addToCart(item, 1)}
              >
                <View style={styles.catalogItemHeader}>
                  <Text style={[styles.catalogItemName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.catalogItemPrice, { color: theme.primary }]}>
                    {formatCurrency(item.unit_price)}
                  </Text>
                </View>
                <Text style={[styles.catalogItemUnit, { color: theme.textSecondary }]}>
                  {item.unit_type || 'unit'}
                </Text>
                {item.description && (
                  <Text style={[styles.catalogItemDesc, { color: theme.textSecondary }]}>
                    {item.description}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          {consumableItems.length > 6 && (
            <TouchableOpacity 
              style={[styles.viewAllButton, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => setShowCatalogModal(true)}
            >
              <Text style={[styles.viewAllText, { color: theme.primary }]}>
                Reba ibintu byose ({consumableItems.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Extension Requests */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('extensionRequests')}</Text>
      {extensionRequests.map((request, index) => (
        <View key={`request-${request.id}-${index}`} style={[styles.listItem, { backgroundColor: theme.card }]}>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemTitle, { color: theme.text }]}>
              {request.extension_months} amezi
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.approval_status) }]}>
              <Text style={styles.statusText}>{request.approval_status}</Text>
            </View>
          </View>
          <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
            {formatCurrency(request.total_amount)}
          </Text>
          <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>
            Kuva {formatDate(request.current_end_date)} kugeza {formatDate(request.requested_end_date)}
          </Text>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemDetail, { color: theme.textSecondary }]}>Kwishyura:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.payment_status) }]}>
              <Text style={styles.statusText}>{request.payment_status}</Text>
            </View>
          </View>
          <Text style={[styles.listItemDate, { color: theme.textSecondary }]}>
            {formatDate(request.created_at)}
          </Text>
        </View>
      ))}
      {extensionRequests.length === 0 && (
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noExtensionRequests')}</Text>
      )}
    </ScrollView>
  )

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Gukura amakuru...</Text>
      </View>
    )
  }

  if (!tenantUser) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="warning" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>Nta bucukumbuzi bwemerewe busanganywe</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLogo}>
            <IcumbiLogo width={32} height={32} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>{t('welcome')}</Text>
            <Text style={[styles.nameText, { color: theme.text }]}>{tenantUser.full_name}</Text>
          </View>
        </View>
        <LanguageSelector size="small" />
      </View>

      {/* Main Navigation Grid */}
      <View style={styles.mainNavigation}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navCard, activeTab === 'overview' && styles.activeNavCard, { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons 
              name="home" 
              size={28} 
              color={activeTab === 'overview' ? theme.primary : theme.textSecondary} 
            />
            <Text style={[styles.navLabel, activeTab === 'overview' && styles.activeNavLabel, { color: activeTab === 'overview' ? theme.primary : theme.text }]}>
              Ahabanza
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navCard, activeTab === 'bookings' && styles.activeNavCard, { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('bookings')}
          >
            <Ionicons 
              name="calendar" 
              size={28} 
              color={activeTab === 'bookings' ? theme.primary : theme.textSecondary} 
            />
            <Text style={[styles.navLabel, activeTab === 'bookings' && styles.activeNavLabel, { color: activeTab === 'bookings' ? theme.primary : theme.text }]}>
              {t('reservations')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navCard, activeTab === 'payments' && styles.activeNavCard, { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('payments')}
          >
            <Ionicons 
              name="card" 
              size={28} 
              color={activeTab === 'payments' ? theme.primary : theme.textSecondary} 
            />
            <Text style={[styles.navLabel, activeTab === 'payments' && styles.activeNavLabel, { color: activeTab === 'payments' ? theme.primary : theme.text }]}>
              {t('money')}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navCard, activeTab === 'messages' && styles.activeNavCard, { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('messages')}
          >
            <Ionicons 
              name="chatbubble" 
              size={28} 
              color={activeTab === 'messages' ? theme.primary : theme.textSecondary} 
            />
            <Text style={[styles.navLabel, activeTab === 'messages' && styles.activeNavLabel, { color: activeTab === 'messages' ? theme.primary : theme.text }]}>
              {t('messages')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navCard, activeTab === 'announcements' && styles.activeNavCard, { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('announcements')}
          >
            <Ionicons 
              name="megaphone" 
              size={28} 
              color={activeTab === 'announcements' ? theme.primary : theme.textSecondary} 
            />
            <Text style={[styles.navLabel, activeTab === 'announcements' && styles.activeNavLabel, { color: activeTab === 'announcements' ? theme.primary : theme.text }]}>
              {t('announcements')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navCard, activeTab === 'extend' && styles.activeNavCard, { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('extend')}
          >
            <Ionicons 
              name="time" 
              size={28} 
              color={activeTab === 'extend' ? theme.primary : theme.textSecondary} 
            />
            <Text style={[styles.navLabel, activeTab === 'extend' && styles.activeNavLabel, { color: activeTab === 'extend' ? theme.primary : theme.text }]}>
              {t('extendTime')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* Message Modal */}
      <Modal visible={showMessageModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t('sendMessageModal')}</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
              placeholder={t('messageSubject')}
              placeholderTextColor={theme.textSecondary}
              value={newMessage.subject}
              onChangeText={(text) => setNewMessage(prev => ({ ...prev, subject: text }))}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                                placeholder={t('messagePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={newMessage.message}
              onChangeText={(text) => setNewMessage(prev => ({ ...prev, message: text }))}
              multiline
              numberOfLines={4}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton, 
                { backgroundColor: theme.primary },
                (!newMessage.subject.trim() || !newMessage.message.trim() || sending) && { backgroundColor: theme.textTertiary }
              ]}
              onPress={() => {
                if (!newMessage.subject.trim() || !newMessage.message.trim()) {
                  Alert.alert(t('error'), t('fillSubjectMessage'))
                  return
                }
                sendMessage()
              }}
              disabled={!newMessage.subject.trim() || !newMessage.message.trim() || sending}
              accessible={true}
                              accessibilityLabel={t('sendMessageAccessibility')}
                accessibilityHint={t('sendMessageHint')}
            >
              {sending ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text style={styles.sendButtonText}>{t('sendMessage')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Extension Modal */}
      <Modal visible={showExtensionModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('requestExtensionModal')}</Text>
              <TouchableOpacity onPress={() => setShowExtensionModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {currentLease && (
              <View style={styles.extensionInfo}>
                <Text style={styles.extensionLabel}>
                  Ubukode buri kwezi: {formatCurrency(currentLease.rent_amount)}
                </Text>
                <Text style={styles.extensionLabel}>
                  Uburyo: {extensionForm.extension_months} amezi
                </Text>
                <Text style={styles.extensionTotal}>
                  Igiciro cyose: {formatCurrency(currentLease.rent_amount * extensionForm.extension_months)}
                </Text>
              </View>
            )}
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Impamvu (biteganywa)..."
              value={extensionForm.notes}
              onChangeText={(text) => setExtensionForm(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.disabledButton]}
              onPress={() => {
                if (!extensionForm.extension_months || extensionForm.extension_months < 1) {
                  Alert.alert('Ikosa', 'Nyamuneka hitamo umubare w\'amezi ugomba kongera.')
                  return
                }
                requestExtension()
              }}
              disabled={sending}
              accessible={true}
                              accessibilityLabel={t('requestExtensionAccessibility')}
                accessibilityHint={t('requestExtensionHint')}
            >
              {sending ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.sendButtonText}>Ohereza icyifuzo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Catalog Modal */}
      <Modal visible={showCatalogModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Ibintu byo kongerwa</Text>
              <TouchableOpacity onPress={() => setShowCatalogModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.catalogModalContent}>
              {consumableItems.map((item, index) => (
                <View key={`modal-catalog-${item.id}-${index}`} style={[styles.catalogModalItem, { backgroundColor: theme.card }]}>
                  <View style={styles.catalogModalItemHeader}>
                    <View>
                      <Text style={[styles.catalogModalItemName, { color: theme.text }]}>{item.name}</Text>
                      <Text style={[styles.catalogModalItemUnit, { color: theme.textSecondary }]}>
                        {item.unit_type || 'unit'} • {formatCurrency(item.unit_price)}
                      </Text>
                      {item.description && (
                        <Text style={[styles.catalogModalItemDesc, { color: theme.textSecondary }]}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.catalogModalItemActions}>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: theme.surfaceVariant }]}
                        onPress={() => {
                          const currentQuantity = cartItems.find(cartItem => cartItem.consumable.id === item.id)?.quantity || 0
                          if (currentQuantity > 0) {
                            updateCartQuantity(item.id, currentQuantity - 1)
                          }
                        }}
                      >
                        <Ionicons name="remove" size={16} color={theme.text} />
                      </TouchableOpacity>
                      <Text style={[styles.quantityText, { color: theme.text }]}>
                        {cartItems.find(cartItem => cartItem.consumable.id === item.id)?.quantity || 0}
                      </Text>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: theme.primary }]}
                        onPress={() => addToCart(item, 1)}
                      >
                        <Ionicons name="add" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {cartItems.length > 0 && (
              <View style={[styles.cartSummary, { backgroundColor: theme.surfaceVariant }]}>
                <View style={styles.cartSummaryHeader}>
                  <Text style={[styles.cartSummaryTitle, { color: theme.text }]}>Igiciro cyose:</Text>
                  <Text style={[styles.cartSummaryTotal, { color: theme.primary }]}>
                    {formatCurrency(getCartTotal())}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.processOrderButton, { backgroundColor: theme.primary }]}
                  onPress={processCatalogOrder}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.processOrderText}>Ohereza icyifuzo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Lease Extension Flow */}
      <LeaseExtensionFlow
        visible={showExtensionFlow}
        onClose={() => setShowExtensionFlow(false)}
        onSuccess={() => {
          setShowExtensionFlow(false)
          onRefresh()
        }}
      />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center'
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    // Logo container styles
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280'
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  mainNavigation: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  navCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  activeNavCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6'
  },
  navLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500'
  },
  activeNavLabel: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16
  },
  leaseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8
  },
  leaseDetails: {
    gap: 8
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'right'
  },
  overdueText: {
    color: '#ef4444'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
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
    marginTop: 8
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center'
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  activityText: {
    marginLeft: 12,
    flex: 1
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12
  },
  addButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8
  },
  listItem: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4
  },
  listItemDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2
  },
  listItemDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8
  },
  listItemReply: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 8,
    fontStyle: 'italic'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600'
  },
  messageBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  messageContent: {
    fontSize: 14,
    color: '#374151',
    marginVertical: 8
  },
  replyContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8
  },
  replyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4
  },
  replyContent: {
    fontSize: 12,
    color: '#374151'
  },
  replyDate: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    marginTop: 32
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8
  },
  disabledButton: {
    backgroundColor: '#9ca3af'
  },
  extensionInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  extensionLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4
  },
  extensionTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  propertySection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  leasePeriodSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  countdownSection: {
    marginBottom: 8
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  countdownCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb'
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4
  },
  urgentCountdown: {
    color: '#ef4444'
  },
  countdownLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4
  },
  urgentText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600'
  },
  paymentSummaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  paymentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8
  },
  paymentStat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    padding: 12
  },
  paymentStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center'
  },
  paymentStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  recentPaymentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  paymentItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  paymentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  paymentDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2
  },
  receiptNumber: {
    fontSize: 12,
    color: '#3b82f6',
    fontStyle: 'italic'
  },
  sortingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sortingInfo: {
    fontSize: 12,
    fontStyle: 'italic'
  },
  billItems: {
    marginTop: 8,
    paddingLeft: 8
  },
  billItem: {
    fontSize: 12,
    marginBottom: 2
  },
  catalogSection: {
    marginBottom: 16
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  catalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  catalogButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8
  },
  catalogItem: {
    width: '48%',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  catalogItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  catalogItemName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  catalogItemPrice: {
    fontSize: 12,
    fontWeight: '600'
  },
  catalogItemUnit: {
    fontSize: 10,
    marginBottom: 2
  },
  catalogItemDesc: {
    fontSize: 10,
    fontStyle: 'italic'
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600'
  },
  catalogModalContent: {
    maxHeight: 400
  },
  catalogModalItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  catalogModalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  catalogModalItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  catalogModalItemUnit: {
    fontSize: 12,
    marginBottom: 2
  },
  catalogModalItemDesc: {
    fontSize: 11,
    fontStyle: 'italic'
  },
  catalogModalItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center'
  },
  cartSummary: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16
  },
  cartSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cartSummaryTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  cartSummaryTotal: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  processOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8
  },
  processOrderText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8
  }
}) 