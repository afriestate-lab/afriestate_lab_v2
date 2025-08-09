import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native'
import { Modal, Portal, Card, Button, Surface, Divider, ProgressBar } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../src/lib/supabase'
import { formatCurrency } from '../src/lib/helpers'

// Types
interface Room {
  id: string
  room_number: string
  floor_number: number
  rent_amount: number
  status: string
}

interface Floor {
  floor_number: number
  rooms: Room[]
}

interface Property {
  id: string
  name: string
  address: string
  city: string
  floors: Floor[]
}

interface PaymentMethodOption {
  id: string
  name: string
  icon: string
  description: string
}

interface IshyuraModalProps {
  visible: boolean
  onDismiss: () => void
  onSuccess?: () => void
  user: any
  selectedProperty?: Property | null
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    icon: 'phone-portrait',
    description: 'Kwishyura ukoresheje MTN MoMo'
  },
  {
    id: 'airtel_money',
    name: 'Airtel Money',
    icon: 'card',
    description: 'Kwishyura ukoresheje Airtel Money'
  },
  {
    id: 'bank_card',
    name: 'Ikarita ya Bank',
    icon: 'business',
    description: 'Kwishyura ukoresheje ikarita ya bank'
  }
]

export default function IshyuraModal({ visible, onDismiss, onSuccess, user, selectedProperty }: IshyuraModalProps) {
  // Flow state management
  const [currentStep, setCurrentStep] = useState<'property' | 'room' | 'dates' | 'payment' | 'success'>('property')
  const [isLoading, setIsLoading] = useState(false)

  // Property and room selection
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [selectedPropertyState, setSelectedPropertyState] = useState<Property | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isLoadingProperties, setIsLoadingProperties] = useState(false)

  // Date selection
  const [checkInDate, setCheckInDate] = useState<string>('')
  const [checkOutDate, setCheckOutDate] = useState<string>('')
  const [durationMonths, setDurationMonths] = useState<number>(1)
  const [showCheckInCalendar, setShowCheckInCalendar] = useState(false)
  const [showCheckOutCalendar, setShowCheckOutCalendar] = useState(false)

  // Payment data
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState('')

  // Success data
  const [transactionData, setTransactionData] = useState<{
    transactionId: string
    timestamp: string
    amount: number
    property: string
    room: string
    paymentMethod: string
  } | null>(null)

  // Auto-fill user phone number
  useEffect(() => {
    if (user?.phone_number) {
      setPhoneNumber(user.phone_number)
    }
  }, [user])

  // Handle selectedProperty prop - skip to room selection and fetch only this property's rooms
  useEffect(() => {
    if (selectedProperty && visible) {
      console.log('🏠 [MOBILE_ISHYURA] Selected property provided, fetching rooms for:', selectedProperty.name)
      setSelectedPropertyState(selectedProperty)
      // Skip property selection and go directly to room selection
      setCurrentStep('room')
      fetchSelectedPropertyRooms(selectedProperty.id)
    }
  }, [selectedProperty, visible])

  // Fetch available properties when modal opens
  useEffect(() => {
    if (visible) {
      fetchAvailableProperties()
    }
  }, [visible])

  const fetchAvailableProperties = async () => {
    setIsLoadingProperties(true)

    try {
      console.log('🏠 [MOBILE_ISHYURA] Fetching available properties...')
      console.log('👤 [MOBILE_ISHYURA] User:', user?.id, user?.email)
      
      // Check authentication
      if (!user || !user.id) {
        console.error('❌ [MOBILE_ISHYURA] No authenticated user found')
        Alert.alert('Ikosa', 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.')
        return
      }
      
      // First get all published properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          address,
          city,
          landlord_id,
          is_published
        `)
        .eq('is_published', true)
        .is('deleted_at', null)

      console.log('🏠 [MOBILE_ISHYURA] Properties query result:', propertiesData?.length || 0, 'properties')
      console.log('🏠 [MOBILE_ISHYURA] Properties error:', propertiesError)

      if (propertiesError) {
        console.error('❌ [MOBILE_ISHYURA] Properties error:', propertiesError)
        Alert.alert('Ikosa', 'Ntibyashoboka kubona amakuru y\'inyubako')
        return
      }

      if (!propertiesData || propertiesData.length === 0) {
        console.log('⚠️ [MOBILE_ISHYURA] No properties found')
        setAvailableProperties([])
        return
      }

      // Check and update room status based on checkout dates for all properties
      const today = new Date().toISOString().split('T')[0]
      
      // Implement proper checkout date checking for room availability
      console.log('✅ [MOBILE_ISHYURA] Fetching properties with expiry check')

      // For each property, fetch its rooms
      const propertiesWithRooms: Property[] = []

      for (const property of propertiesData) {
        console.log(`🔍 [MOBILE_ISHYURA] Processing property: ${property.name} (ID: ${property.id})`)
        
        // First, get all rooms for this property
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select(`
            id,
            room_number,
            floor_number,
            rent_amount,
            status
          `)
          .eq('property_id', property.id)
          .is('deleted_at', null)

        // Then, get active room tenants to check availability
        const { data: activeTenants, error: tenantsError } = await supabase
          .from('room_tenants')
          .select(`
            room_id,
            move_out_date,
            is_active
          `)
          .eq('is_active', true)
          .not('move_out_date', 'is', null)

        if (tenantsError) {
          console.warn(`⚠️ [MOBILE_ISHYURA] Could not fetch tenant data for property ${property.name}:`, tenantsError)
        }

        // Create a map of occupied rooms
        const occupiedRooms = new Set<string>()
        if (activeTenants) {
          activeTenants.forEach(tenant => {
            if (tenant.move_out_date && tenant.move_out_date > today) {
              occupiedRooms.add(tenant.room_id)
            }
          })
        }

        console.log(`📊 [MOBILE_ISHYURA] Property ${property.name} room query result:`)
        console.log(`📊 [MOBILE_ISHYURA] - Room data:`, roomsData)
        console.log(`📊 [MOBILE_ISHYURA] - Room error:`, roomsError)
        console.log(`📊 [MOBILE_ISHYURA] - Room count:`, roomsData?.length || 0)

        if (roomsError) {
          console.warn(`⚠️ [MOBILE_ISHYURA] Could not fetch rooms for property ${property.name}:`, roomsError)
          continue
        }

        // Group rooms by floor - even if no rooms found, create property structure
        const floorsMap = new Map<number, Room[]>()
        
        if (roomsData && roomsData.length > 0) {
          roomsData.forEach(room => {
            // Check if room is available based on checkout dates
            const isOccupied = occupiedRooms.has(room.id)
            const updatedRoom = {
              ...room,
              status: isOccupied ? 'occupied' : 'available'
            }
            
            console.log(`🏠 [MOBILE_ISHYURA] Processing room: ${room.room_number} (Floor: ${room.floor_number}, Status: ${updatedRoom.status}, Occupied: ${isOccupied})`)
            
            if (!floorsMap.has(room.floor_number)) {
              floorsMap.set(room.floor_number, [])
            }
            floorsMap.get(room.floor_number)!.push(updatedRoom)
          })
        }

        const floors: Floor[] = Array.from(floorsMap.entries()).map(([floorNumber, rooms]) => ({
          floor_number: floorNumber,
          rooms: rooms.sort((a, b) => a.room_number.localeCompare(b.room_number))
        }))

        const propertyWithFloors: Property = {
          ...property,
          floors: floors.sort((a, b) => a.floor_number - b.floor_number)
        }

        console.log(`✅ [MOBILE_ISHYURA] Property ${property.name} has ${floors.length} floors with ${roomsData?.length || 0} rooms`)
        console.log(`📋 [MOBILE_ISHYURA] Floors structure:`, floors)
        propertiesWithRooms.push(propertyWithFloors)
      }

      setAvailableProperties(propertiesWithRooms)
      console.log('✅ [MOBILE_ISHYURA] Processed', propertiesWithRooms.length, 'properties with rooms')

    } catch (error) {
      console.error('❌ [MOBILE_ISHYURA] Error in fetchAvailableProperties:', error)
      Alert.alert('Ikosa', 'Hari ikibazo ko kubona amakuru y\'inyubako')
    } finally {
      setIsLoadingProperties(false)
    }
  }

  const fetchSelectedPropertyRooms = async (propertyId: string) => {
    try {
      console.log('🏠 [MOBILE_ISHYURA] Fetching rooms for property:', propertyId)
      
      // First get the property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          address,
          city
        `)
        .eq('id', propertyId)
        .eq('is_published', true)
        .is('deleted_at', null)
        .single()

      if (propertyError) {
        console.error('❌ [MOBILE_ISHYURA] Property fetch error:', propertyError)
        Alert.alert('Ikosa', 'Ntibyashoboka kubona amakuru y\'inyubako')
        return
      }

      console.log('✅ [MOBILE_ISHYURA] Property found:', propertyData.name)

      // Check and update room status based on checkout dates
      const today = new Date().toISOString().split('T')[0]
      
      // Implement proper checkout date checking for room availability
      console.log('✅ [MOBILE_ISHYURA] Fetching rooms with expiry check')

      // Now fetch all rooms for this property using RPC to avoid RLS issues
      const { data: roomsData, error: roomsError } = await supabase
        .rpc('get_property_rooms', {
          p_property_id: propertyId
        })

      // Create a map of occupied rooms based on tenant data from RPC
      const occupiedRooms = new Set<string>()
      if (roomsData) {
        roomsData.forEach((room: any) => {
          // If room has an active tenant, mark it as occupied
          if (room.tenant_id) {
            occupiedRooms.add(room.id)
          }
        })
      }

      console.log('📊 [MOBILE_ISHYURA] Room query details:')
      console.log('📊 [MOBILE_ISHYURA] Property ID:', propertyId)
      console.log('📊 [MOBILE_ISHYURA] Room query error:', roomsError)
      console.log('📊 [MOBILE_ISHYURA] Raw rooms data:', roomsData)

      if (roomsError) {
        console.error('❌ [MOBILE_ISHYURA] Rooms fetch error:', roomsError)
        Alert.alert('Ikosa', 'Ntibyashoboka kubona amakuru y\'ibyumba')
        return
      }

      // Even if no rooms found, continue processing
      if (!roomsData || roomsData.length === 0) {
        console.warn('⚠️ [MOBILE_ISHYURA] No rooms found for property:', propertyId)
        // Set empty property with no floors
        const propertyWithNoRooms: Property = {
          ...propertyData,
          floors: []
        }
        setSelectedPropertyState(propertyWithNoRooms)
        console.log('⚠️ [MOBILE_ISHYURA] Set property with 0 floors and 0 rooms')
        return
      }

      console.log('✅ [MOBILE_ISHYURA] Fetched', roomsData.length, 'rooms')
      console.log('🏠 [MOBILE_ISHYURA] Room data:', roomsData)

      // Group rooms by floor
      const floorsMap = new Map<number, Room[]>()
      
      roomsData.forEach(room => {
        // Check if room is available based on checkout dates
        const isOccupied = occupiedRooms.has(room.id)
        const updatedRoom = {
          ...room,
          status: isOccupied ? 'occupied' : 'available'
        }
        
        console.log(`🏠 [MOBILE_ISHYURA] Processing room: ${room.room_number} (Floor: ${room.floor_number}, Status: ${updatedRoom.status}, Occupied: ${isOccupied})`)
        
        if (!floorsMap.has(room.floor_number)) {
          floorsMap.set(room.floor_number, [])
        }
        floorsMap.get(room.floor_number)!.push(updatedRoom)
      })

      const floors: Floor[] = Array.from(floorsMap.entries()).map(([floorNumber, rooms]) => ({
        floor_number: floorNumber,
        rooms: rooms.sort((a, b) => a.room_number.localeCompare(b.room_number))
      }))

      const propertyWithFloors: Property = {
        ...propertyData,
        floors: floors.sort((a, b) => a.floor_number - b.floor_number)
      }

      setSelectedPropertyState(propertyWithFloors)
      console.log('✅ [MOBILE_ISHYURA] Processed', floors.length, 'floors with', roomsData.length, 'rooms')
      console.log('🏠 [MOBILE_ISHYURA] Final property state:', propertyWithFloors)

    } catch (error) {
      console.error('❌ [MOBILE_ISHYURA] Error in fetchSelectedPropertyRooms:', error)
      Alert.alert('Ikosa', 'Hari ikibazo ko kubona amakuru y\'ibyumba')
      throw error // Re-throw to be caught by handlePropertySelect
    }
  }

  const handlePropertySelect = async (property: Property) => {
    console.log('🏠 [MOBILE_ISHYURA] Property selected:', property.name)
    console.log('🏠 [MOBILE_ISHYURA] Property ID:', property.id)
    console.log('🏠 [MOBILE_ISHYURA] Property floors:', property.floors?.length || 0)
    console.log('🏠 [MOBILE_ISHYURA] Property floors data:', property.floors)
    
    // Set loading state
    setIsLoadingProperties(true)
    
    try {
      // Use cached data if available and has rooms
      if (property.floors && property.floors.length > 0) {
        console.log('✅ [MOBILE_ISHYURA] Using cached data with', property.floors.length, 'floors')
        setSelectedPropertyState(property)
        setCurrentStep('room')
      } else {
        console.log('🔄 [MOBILE_ISHYURA] No cached data, fetching fresh data')
        // Try to fetch fresh room data from database
        await fetchSelectedPropertyRooms(property.id)
        setCurrentStep('room')
      }
    } catch (error) {
      console.error('❌ [MOBILE_ISHYURA] Error in handlePropertySelect:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye kubona amakuru y\'ibyumba')
    } finally {
      setIsLoadingProperties(false)
    }
  }

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room)
    // Set default dates: check-in today, check-out in 1 month
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
    
    setCheckInDate(today.toISOString().split('T')[0])
    setCheckOutDate(nextMonth.toISOString().split('T')[0])
    setDurationMonths(1)
    setPaymentAmount(room.rent_amount) // Base amount for 1 month
    
    setCurrentStep('dates')
  }

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId)
  }

  const calculatePaymentAmount = (checkIn: string, checkOut: string, monthlyRent: number) => {
    if (!checkIn || !checkOut) return monthlyRent
    
    const startDate = new Date(checkIn)
    const endDate = new Date(checkOut)
    
    if (startDate >= endDate) return monthlyRent
    
    // Calculate months difference
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth())
    
    // Add partial month if there are additional days
    const daysInStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()
    const daysInEndMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()
    
    let totalMonths = monthsDiff
    
    // If check-in is not on the 1st, calculate partial month
    if (startDate.getDate() > 1) {
      const daysRemainingInStartMonth = daysInStartMonth - startDate.getDate() + 1
      totalMonths += daysRemainingInStartMonth / daysInStartMonth
    }
    
    // If check-out is not on the last day, calculate partial month
    if (endDate.getDate() < daysInEndMonth) {
      totalMonths += endDate.getDate() / daysInEndMonth
    }
    
    // Ensure minimum 1 month
    totalMonths = Math.max(1, totalMonths)
    
    return Math.round(monthlyRent * totalMonths)
  }

  const handleDateChange = (type: 'checkIn' | 'checkOut', date: string) => {
    if (type === 'checkIn') {
      setCheckInDate(date)
      // Auto-calculate check-out date if check-in is after current check-out
      if (date && checkOutDate && date >= checkOutDate) {
        const newCheckOut = new Date(date)
        newCheckOut.setMonth(newCheckOut.getMonth() + 1)
        setCheckOutDate(newCheckOut.toISOString().split('T')[0])
      }
    } else {
      setCheckOutDate(date)
    }
    
    // Recalculate payment amount
    if (selectedRoom) {
      const newAmount = calculatePaymentAmount(
        type === 'checkIn' ? date : checkInDate,
        type === 'checkOut' ? date : checkOutDate,
        selectedRoom.rent_amount
      )
      setPaymentAmount(newAmount)
      
      // Calculate duration in months
      if (date && (type === 'checkIn' ? checkOutDate : date)) {
        const start = new Date(type === 'checkIn' ? date : checkInDate)
        const end = new Date(type === 'checkOut' ? date : checkOutDate)
        const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
        setDurationMonths(months)
      }
    }
  }

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod || !phoneNumber.trim() || !selectedRoom || !selectedPropertyState) {
      Alert.alert('Hari ikibazo', 'Uzuza amakuru yose')
      return
    }

    setIsLoading(true)

    try {
      console.log('💰 [MOBILE_ISHYURA] Starting payment process...')
      console.log('💰 [MOBILE_ISHYURA] Room:', selectedRoom.room_number)
      console.log('💰 [MOBILE_ISHYURA] Amount:', paymentAmount)
      console.log('💰 [MOBILE_ISHYURA] Check-in:', checkInDate)
      console.log('💰 [MOBILE_ISHYURA] Check-out:', checkOutDate)

      // SIMULATION MODE: Use database function to process payment
      const { data: simulationResult, error: simulationError } = await supabase
        .rpc('simulate_successful_payment', {
          p_user_id: user.id,
          p_room_id: selectedRoom.id,
          p_amount: paymentAmount,
          p_payment_type: 'rent',
          p_payment_method: selectedPaymentMethod,
          p_user_full_name: user.user_metadata?.full_name || user.email,
          p_user_email: user.email,
          p_user_phone: phoneNumber,
          p_check_in_date: checkInDate,
          p_check_out_date: checkOutDate,
          p_duration_months: durationMonths
        })

      if (simulationError) {
        console.error('❌ [MOBILE_ISHYURA] Payment simulation error:', simulationError)
        throw new Error('Ntibyashoboka kwishyura')
      }

      console.log('✅ [MOBILE_ISHYURA] Payment simulation successful:', simulationResult)

      // Extract payment data from simulation result
      const paymentData = {
        id: simulationResult.payment_id,
        reference: simulationResult.reference
      }

      // Create booking record
      const { error: bookingError } = await supabase
        .from('property_bookings')
        .insert([
          {
            property_id: selectedPropertyState.id,
            room_id: selectedRoom.id,
            booking_type: 'room',
            guest_name: user.user_metadata?.full_name || 'Guest',
            guest_email: user.email || 'guest@example.com',
            guest_phone: phoneNumber || 'N/A',
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            total_amount: paymentAmount,
            payment_status: 'paid',
            payment_method: paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.name || selectedPaymentMethod,
            payment_reference: paymentData.id,
            status: 'confirmed',
            metadata: {
              payment_id: paymentData.id,
              user_id: user.id,
              created_via: 'mobile_ishyura_modal'
            }
          }
        ])

      if (bookingError) {
        console.error('❌ [MOBILE_ISHYURA] Booking creation error:', bookingError)
        // Don't throw error here as payment was successful
      } else {
        console.log('✅ [MOBILE_ISHYURA] Booking record created')
      }

      // Set success data
      setTransactionData({
        transactionId: paymentData.id, // Use payment ID as transaction ID for simplicity
        timestamp: new Date().toISOString(),
        amount: paymentAmount,
        property: selectedPropertyState.name,
        room: selectedRoom.room_number,
        paymentMethod: paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.name || selectedPaymentMethod
      })

      setCurrentStep('success')
      console.log('🎉 [MOBILE_ISHYURA] Payment simulation completed successfully')

    } catch (error) {
      console.error('❌ [MOBILE_ISHYURA] Payment simulation failed:', error)
      Alert.alert('Ikosa', 'Ubwishyu ntibwashoboye kwemezwa. Ongera ugerageze.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetModal = () => {
    setCurrentStep('property')
    setAvailableProperties([])
    setSelectedPropertyState(null)
    setSelectedRoom(null)
    setSelectedPaymentMethod(null)
    setPaymentAmount(0)
    setPhoneNumber('')
    setCheckInDate('')
    setCheckOutDate('')
    setDurationMonths(1)
    setShowCheckInCalendar(false)
    setShowCheckOutCalendar(false)
    setTransactionData(null)
    setIsLoading(false)
  }

  const handleClose = () => {
    resetModal()
    onDismiss()
  }

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
    handleClose()
  }

  const getStepProgress = () => {
    const steps = ['property', 'room', 'dates', 'payment', 'success']
    return (steps.indexOf(currentStep) + 1) / steps.length
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'property': return 'Hitamo Inyubako'
      case 'room': return 'Hitamo Icyumba'  
      case 'dates': return 'Hitamo Itariki'
      case 'payment': return 'Hitamo Uburyo bwo Kwishyura'
      case 'success': return 'Ubwishyu Bwakiriwe!'
      default: return 'Ishyura'
    }
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={{
          backgroundColor: 'white',
          margin: 16,
          borderRadius: 16,
          maxHeight: '90%'
        }}
      >
        <Surface style={{ borderRadius: 16, elevation: 4, backgroundColor: '#ffffff' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#14b8a6',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Ionicons name="card" size={20} color="white" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>Ishyura</Text>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>{getStepTitle()}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3f4f6',
                borderRadius: 16
              }}
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#ffffff' }}>
            <ProgressBar 
              progress={getStepProgress()} 
              color="#14b8a6" 
              style={{ height: 4, borderRadius: 2 }}
            />
            <Text style={{ 
              fontSize: 12, 
              color: '#6b7280', 
              textAlign: 'center', 
              marginTop: 8 
            }}>
              Intambwe {['property', 'room', 'dates', 'payment', 'success'].indexOf(currentStep) + 1} kuri 5
            </Text>
          </View>

          {/* Content */}
          <ScrollView style={{ maxHeight: 500, padding: 20, backgroundColor: '#ffffff' }}>
            {/* Property Selection Step */}
            {currentStep === 'property' && (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                  <View style={{
                    width: 80,
                    height: 80,
                    backgroundColor: '#f0fdfa',
                    borderRadius: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    borderWidth: 2,
                    borderColor: '#14b8a6'
                  }}>
                    <Ionicons name="business" size={40} color="#14b8a6" />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 }}>
                    Hitamo Inyubako
                  </Text>
                  <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24 }}>
                    Shaka inyubako ushaka gukoreramo{'\n'}kandi ukore ubukode
                  </Text>
                </View>

                {isLoadingProperties ? (
                  <View style={{ alignItems: 'center', padding: 50 }}>
                    <ActivityIndicator size="large" color="#14b8a6" />
                    <Text style={{ marginTop: 16, color: '#6b7280', fontSize: 16 }}>Gushaka inyubako...</Text>
                  </View>
                ) : availableProperties.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 40 }}>
                    <View style={{
                      width: 100,
                      height: 100,
                      backgroundColor: '#f9fafb',
                      borderRadius: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 24,
                      borderWidth: 2,
                      borderColor: '#e5e7eb'
                    }}>
                      <Ionicons name="business" size={50} color="#d1d5db" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 8 }}>
                      Nta nyubako ibonetse
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                      Nta nyubako ifite ibyumba bihari.{'\n'}Ongera ushake cyangwa uragubirire.
                    </Text>
                    <Button 
                      mode="contained" 
                      onPress={fetchAvailableProperties}
                      buttonColor="#14b8a6"
                      style={{ paddingHorizontal: 24, paddingVertical: 4 }}
                      labelStyle={{ fontSize: 16, fontWeight: '600' }}
                    >
                      Ongera ushake
                    </Button>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    {availableProperties.map((property) => {
                      const totalRooms = property.floors.reduce((total, floor) => total + floor.rooms.length, 0)
                      const availableRooms = property.floors.reduce((total, floor) => 
                        total + floor.rooms.filter(room => room.status === 'vacant').length, 0
                      )
                      const occupiedRooms = totalRooms - availableRooms

                      console.log(`🏠 [MOBILE_ISHYURA] Displaying property: ${property.name}`)
                      console.log(`🏠 [MOBILE_ISHYURA] - Total floors: ${property.floors.length}`)
                      console.log(`🏠 [MOBILE_ISHYURA] - Total rooms: ${totalRooms}`)
                      console.log(`🏠 [MOBILE_ISHYURA] - Available rooms: ${availableRooms}`)
                      console.log(`🏠 [MOBILE_ISHYURA] - Occupied rooms: ${occupiedRooms}`)

                      return (
                        <TouchableOpacity
                          key={property.id}
                          onPress={() => availableRooms > 0 ? handlePropertySelect(property) : null}
                          style={{
                            padding: 20,
                            borderWidth: 2,
                            borderColor: availableRooms === 0 ? '#fecaca' : '#e5e7eb',
                            borderRadius: 16,
                            backgroundColor: availableRooms === 0 ? '#fef2f2' : 'white',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 4,
                            opacity: availableRooms === 0 ? 0.7 : 1
                          }}
                          activeOpacity={availableRooms === 0 ? 1 : 0.8}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                              <Text 
                                style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 6 }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {property.name}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{
                                  backgroundColor: '#f0fdfa',
                                  borderRadius: 12,
                                  padding: 4,
                                  marginRight: 8
                                }}>
                                  <Ionicons name="location" size={16} color="#14b8a6" />
                                </View>
                                <Text 
                                  style={{ fontSize: 14, color: '#6b7280', flex: 1 }}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {property.address}, {property.city}
                                </Text>
                              </View>
                              
                              {/* Room count info */}
                              <View style={{
                                backgroundColor: totalRooms > 0 ? '#14b8a6' : '#ef4444',
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                alignSelf: 'flex-start',
                                marginBottom: 8
                              }}>
                                <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>
                                  {property.floors.length} ibice • {totalRooms} ibyumba
                                </Text>
                              </View>

                              {/* Status indicator */}
                              {(() => {
                                let statusText = '';
                                let statusColor = '#6b7280';
                                let bgColor = '#f3f4f6';

                                if (totalRooms === 0) {
                                  statusText = 'Nta byumba';
                                  statusColor = '#ef4444';
                                  bgColor = '#fef2f2';
                                } else if (availableRooms === 0) {
                                  statusText = 'Byarafashwe byose';
                                  statusColor = '#ef4444'; 
                                  bgColor = '#fef2f2';
                                } else if (availableRooms === totalRooms) {
                                  statusText = 'Byose bihari';
                                  statusColor = '#10b981';
                                  bgColor = '#f0fdf4';
                                } else {
                                  statusText = `${availableRooms} bihari`;
                                  statusColor = '#f59e0b';
                                  bgColor = '#fffbeb';
                                }

                                return (
                                  <View style={{
                                    backgroundColor: bgColor,
                                    borderRadius: 8,
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    alignSelf: 'flex-start'
                                  }}>
                                    <Text style={{ 
                                      fontSize: 11, 
                                      color: statusColor, 
                                      fontWeight: '600'
                                    }}>
                                      {statusText}
                                    </Text>
                                  </View>
                                );
                              })()}
                            </View>
                            <View style={{
                              backgroundColor: '#f0fdfa',
                              borderRadius: 20,
                              padding: 8
                            }}>
                              <Ionicons name="chevron-forward" size={24} color="#14b8a6" />
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Room Selection Step */}
            {currentStep === 'room' && selectedPropertyState && (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <Ionicons name="home" size={48} color="#14b8a6" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 4 }}>
                    Hitamo Icyumba
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                    {selectedPropertyState.name}
                  </Text>
                </View>

                {/* Room availability summary */}
                {(() => {
                  const totalRooms = selectedPropertyState.floors.reduce((total, floor) => total + floor.rooms.length, 0)
                  const availableRooms = selectedPropertyState.floors.reduce((total, floor) => 
                    total + floor.rooms.filter(room => room.status === 'vacant').length, 0
                  )
                  const occupiedRooms = totalRooms - availableRooms
                  
                  // Determine overall status
                  let propertyStatus = '';
                  let statusColor = '#6b7280';
                  if (totalRooms === 0) {
                    propertyStatus = 'Nta byumba biboneka';
                    statusColor = '#ef4444';
                  } else if (availableRooms === 0) {
                    propertyStatus = 'Byarafashwe byose';
                    statusColor = '#ef4444';
                  } else if (availableRooms === totalRooms) {
                    propertyStatus = 'Byose bihari gukodesha';
                    statusColor = '#10b981';
                  } else {
                    propertyStatus = `${availableRooms} bihari mu ${totalRooms}`;
                    statusColor = '#f59e0b';
                  }
                  
                  return (
                    <Card style={{ padding: 16, backgroundColor: '#f8fafc', marginBottom: 16 }}>
                      <View style={{ alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: statusColor, marginBottom: 4 }}>
                          {propertyStatus}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                          {selectedPropertyState.name}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#10b981' }}>
                            {availableRooms}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Bihari
                          </Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#dc2626' }}>
                            {occupiedRooms}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Byafashwe
                          </Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937' }}>
                            {totalRooms}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Byose
                          </Text>
                        </View>
                      </View>
                    </Card>
                  )
                })()}

                {isLoadingProperties ? (
                  <View style={{ alignItems: 'center', padding: 40 }}>
                    <ActivityIndicator size="large" color="#14b8a6" />
                    <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>
                      Gukura ibyumba...
                    </Text>
                  </View>
                ) : !selectedPropertyState.floors || selectedPropertyState.floors.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 40 }}>
                    <Ionicons name="home-outline" size={48} color="#9ca3af" />
                    <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
                      Nta byumba biboneka kuri iyi nyubako
                    </Text>
                    <Text style={{ marginTop: 8, fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
                      Gerageza gushakisha ikindi
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    {selectedPropertyState.floors.map((floor) => (
                      <Card key={floor.floor_number} style={{ padding: 16, backgroundColor: '#ffffff' }}>
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937', marginBottom: 12 }}>
                          Igice cya {floor.floor_number}
                        </Text>
                        <View style={{ gap: 8 }}>
                          {floor.rooms.map((room) => (
                            <TouchableOpacity
                              key={room.id}
                              onPress={() => room.status === 'occupied' ? null : handleRoomSelect(room)}
                              style={{
                                padding: 12,
                                borderWidth: 1,
                                borderColor: room.status === 'occupied' ? '#ef4444' : '#e5e7eb',
                                borderRadius: 8,
                                backgroundColor: room.status === 'occupied' ? '#fef2f2' : '#ffffff',
                                opacity: room.status === 'occupied' ? 0.7 : 1
                              }}
                              activeOpacity={room.status === 'occupied' ? 1 : 0.7}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ 
                                    fontSize: 14, 
                                    fontWeight: '500', 
                                    color: room.status === 'occupied' ? '#dc2626' : '#1f2937' 
                                  }}>
                                    Icyumba {room.room_number}
                                  </Text>
                                  <Text style={{ 
                                    fontSize: 14, 
                                    fontWeight: '600', 
                                    color: room.status === 'occupied' ? '#dc2626' : '#14b8a6' 
                                  }}>
                                    {room.status === 'occupied' ? 'Yarafashwe' : `${formatCurrency(room.rent_amount)} / ukwezi`}
                                  </Text>
                                  {room.status === 'occupied' ? (
                                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
                                      Ntibishoboka kugura
                                    </Text>
                                  ) : (
                                    <Text style={{ fontSize: 12, color: '#10b981', marginTop: 2 }}>
                                      Kugura
                                    </Text>
                                  )}
                                </View>
                                {room.status === 'occupied' ? (
                                  <Ionicons name="close-circle" size={20} color="#dc2626" />
                                ) : (
                                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </Card>
                    ))}
                    
                    {/* Show message if all rooms are occupied */}
                    {selectedPropertyState.floors.every(floor => floor.rooms.every(room => room.status === 'occupied')) && (
                      <Card style={{ padding: 16, backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Ionicons name="alert-circle" size={20} color="#dc2626" />
                          <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#dc2626' }}>
                            Ibyumba byose byarafashwe
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#dc2626', lineHeight: 16 }}>
                          Nta byumba bihari kugura kuri iyi nyubako. Gerageza gushakisha ikindi inyubako cyangwa subira nyuma.
                        </Text>
                      </Card>
                    )}
                  </View>
                )}

                <Button
                  mode="outlined"
                  onPress={() => setCurrentStep('property')}
                  style={{ marginTop: 16 }}
                  icon="arrow-left"
                >
                  Subira mu nyubako
                </Button>
              </View>
            )}

            {/* Date Selection Step */}
            {currentStep === 'dates' && selectedRoom && selectedPropertyState && (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <Ionicons name="calendar" size={48} color="#14b8a6" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 4 }}>
                    Hitamo Itariki
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                    Icyumba {selectedRoom.room_number} - {formatCurrency(selectedRoom.rent_amount)} / ukwezi
                  </Text>
                </View>

                {/* Date Selection */}
                <Card style={{ padding: 16, marginBottom: 20, backgroundColor: '#ffffff' }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937', marginBottom: 16 }}>
                    Itariki zo Kwinjira no Gusohoka
                  </Text>
                  
                  <View style={{ gap: 16 }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                        Itariki yo Kwinjira
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowCheckInCalendar(true)}
                        style={{
                          borderWidth: 1,
                          borderColor: '#d1d5db',
                          borderRadius: 8,
                          padding: 12,
                          backgroundColor: 'white',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Text style={{ fontSize: 16, color: checkInDate ? '#1f2937' : '#9ca3af' }}>
                          {checkInDate || 'Hitamo itariki yo kwinjira'}
                        </Text>
                        <Ionicons name="calendar" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                    
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                        Itariki yo Gusohoka
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowCheckOutCalendar(true)}
                        style={{
                          borderWidth: 1,
                          borderColor: '#d1d5db',
                          borderRadius: 8,
                          padding: 12,
                          backgroundColor: 'white',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Text style={{ fontSize: 16, color: checkOutDate ? '#1f2937' : '#9ca3af' }}>
                          {checkOutDate || 'Hitamo itariki yo gusohoka'}
                        </Text>
                        <Ionicons name="calendar" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>

                {/* Payment Summary */}
                <Card style={{ padding: 16, marginBottom: 20, backgroundColor: '#ffffff' }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937', marginBottom: 12 }}>
                    Incamake y'ubwishyu
                  </Text>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6b7280' }}>Inyubako:</Text>
                      <Text style={{ fontWeight: '500' }}>{selectedPropertyState.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6b7280' }}>Icyumba:</Text>
                      <Text style={{ fontWeight: '500' }}>{selectedRoom.room_number}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6b7280' }}>Itariki yo Kwinjira:</Text>
                      <Text style={{ fontWeight: '500' }}>{checkInDate}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6b7280' }}>Itariki yo Gusohoka:</Text>
                      <Text style={{ fontWeight: '500' }}>{checkOutDate}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6b7280' }}>Igikoresho:</Text>
                      <Text style={{ fontWeight: '500' }}>{durationMonths} ukwezi</Text>
                    </View>
                    <Divider style={{ marginVertical: 8 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: '600', fontSize: 16 }}>Igitangwa:</Text>
                      <Text style={{ fontWeight: '600', fontSize: 16, color: '#14b8a6' }}>
                        {formatCurrency(paymentAmount)}
                      </Text>
                    </View>
                  </View>
                </Card>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Button
                    mode="outlined"
                    onPress={() => setCurrentStep('room')}
                    style={{ flex: 1 }}
                    icon="arrow-left"
                  >
                    Subira
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => setCurrentStep('payment')}
                    disabled={!checkInDate || !checkOutDate}
                    buttonColor="#14b8a6"
                    style={{ flex: 2 }}
                  >
                    Komeza
                  </Button>
                </View>
              </View>
            )}

            {/* Calendar Modals */}
            {showCheckInCalendar && (
              <Portal>
                <Modal
                  visible={showCheckInCalendar}
                  onDismiss={() => setShowCheckInCalendar(false)}
                  contentContainerStyle={{
                    backgroundColor: 'white',
                    margin: 20,
                    borderRadius: 12,
                    padding: 20
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>
                    Hitamo Itariki yo Kwinjira
                  </Text>
                  
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        const today = new Date()
                        setCheckInDate(today.toISOString().split('T')[0])
                        setShowCheckInCalendar(false)
                        handleDateChange('checkIn', today.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 8,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <Text style={{ fontSize: 16, textAlign: 'center' }}>Uyu munsi</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        setCheckInDate(tomorrow.toISOString().split('T')[0])
                        setShowCheckInCalendar(false)
                        handleDateChange('checkIn', tomorrow.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 8,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <Text style={{ fontSize: 16, textAlign: 'center' }}>Ejo</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        const nextWeek = new Date()
                        nextWeek.setDate(nextWeek.getDate() + 7)
                        setCheckInDate(nextWeek.toISOString().split('T')[0])
                        setShowCheckInCalendar(false)
                        handleDateChange('checkIn', nextWeek.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 8,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <Text style={{ fontSize: 16, textAlign: 'center' }}>Icyumweru gikurikira</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Button
                    mode="outlined"
                    onPress={() => setShowCheckInCalendar(false)}
                    style={{ marginTop: 16 }}
                  >
                    Funga
                  </Button>
                </Modal>
              </Portal>
            )}

            {showCheckOutCalendar && (
              <Portal>
                <Modal
                  visible={showCheckOutCalendar}
                  onDismiss={() => setShowCheckOutCalendar(false)}
                  contentContainerStyle={{
                    backgroundColor: 'white',
                    margin: 20,
                    borderRadius: 12,
                    padding: 20
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>
                    Hitamo Itariki yo Gusohoka
                  </Text>
                  
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        const oneMonth = new Date()
                        oneMonth.setMonth(oneMonth.getMonth() + 1)
                        setCheckOutDate(oneMonth.toISOString().split('T')[0])
                        setShowCheckOutCalendar(false)
                        handleDateChange('checkOut', oneMonth.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 8,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <Text style={{ fontSize: 16, textAlign: 'center' }}>Ukwezi umwe</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        const threeMonths = new Date()
                        threeMonths.setMonth(threeMonths.getMonth() + 3)
                        setCheckOutDate(threeMonths.toISOString().split('T')[0])
                        setShowCheckOutCalendar(false)
                        handleDateChange('checkOut', threeMonths.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 8,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <Text style={{ fontSize: 16, textAlign: 'center' }}>Amezi atatu</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        const sixMonths = new Date()
                        sixMonths.setMonth(sixMonths.getMonth() + 6)
                        setCheckOutDate(sixMonths.toISOString().split('T')[0])
                        setShowCheckOutCalendar(false)
                        handleDateChange('checkOut', sixMonths.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 8,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <Text style={{ fontSize: 16, textAlign: 'center' }}>Amezi atandatu</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        const oneYear = new Date()
                        oneYear.setFullYear(oneYear.getFullYear() + 1)
                        setCheckOutDate(oneYear.toISOString().split('T')[0])
                        setShowCheckOutCalendar(false)
                        handleDateChange('checkOut', oneYear.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 8,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <Text style={{ fontSize: 16, textAlign: 'center' }}>Umwaka umwe</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Button
                    mode="outlined"
                    onPress={() => setShowCheckOutCalendar(false)}
                    style={{ marginTop: 16 }}
                  >
                    Funga
                  </Button>
                </Modal>
              </Portal>
            )}

            {/* Payment Method Step */}
            {currentStep === 'payment' && selectedRoom && selectedPropertyState && (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <Ionicons name="card" size={48} color="#14b8a6" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 4 }}>
                    Hitamo Uburyo bwo Kwishyura
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                    Icyumba {selectedRoom.room_number} - {formatCurrency(paymentAmount)}
                  </Text>
                </View>

                {/* Payment Summary */}
                <Card style={{ padding: 16, marginBottom: 20, backgroundColor: '#ffffff' }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937', marginBottom: 12 }}>
                    Incamake y'ubwishyu
                  </Text>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6b7280' }}>Inyubako:</Text>
                      <Text style={{ fontWeight: '500' }}>{selectedPropertyState.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6b7280' }}>Icyumba:</Text>
                      <Text style={{ fontWeight: '500' }}>{selectedRoom.room_number}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6b7280' }}>Igiciro cy'ukwezi:</Text>
                      <Text style={{ fontWeight: '500' }}>{formatCurrency(paymentAmount)}</Text>
                    </View>
                    <Divider style={{ marginVertical: 8 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: '600', fontSize: 16 }}>Igitangwa:</Text>
                      <Text style={{ fontWeight: '600', fontSize: 16, color: '#14b8a6' }}>
                        {formatCurrency(paymentAmount)}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Date Selection */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                    Igikoresho cy'ubwishyu
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                        Igikoresho cy'ubwishyu
                      </Text>
                      <TextInput
                        value={checkInDate}
                        onChangeText={(date) => handleDateChange('checkIn', date)}
                        placeholder="18/08/2025"
                        keyboardType="numeric"
                        style={{
                          borderWidth: 1,
                          borderColor: '#d1d5db',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: 'white'
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                        Igikoresho cy'ubwishyu
                      </Text>
                      <TextInput
                        value={checkOutDate}
                        onChangeText={(date) => handleDateChange('checkOut', date)}
                        placeholder="18/08/2025"
                        keyboardType="numeric"
                        style={{
                          borderWidth: 1,
                          borderColor: '#d1d5db',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: 'white'
                        }}
                      />
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
                    Igikoresho cy'ukwezi: {durationMonths}
                  </Text>
                </View>

                {/* Phone Number Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                    Nimero ya telefoni
                  </Text>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="078xxxxxxx"
                    keyboardType="phone-pad"
                    style={{
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      backgroundColor: 'white'
                    }}
                  />
                </View>

                {/* Payment Methods */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937', marginBottom: 16 }}>
                    Hitamo uburyo bwo kwishyura
                  </Text>
                  <View style={{ gap: 12 }}>
                    {paymentMethods.map((method) => (
                      <TouchableOpacity
                        key={method.id}
                        onPress={() => handlePaymentMethodSelect(method.id)}
                        style={{
                          padding: 16,
                          borderWidth: 2,
                          borderColor: selectedPaymentMethod === method.id ? '#14b8a6' : '#e5e7eb',
                          borderRadius: 12,
                          backgroundColor: selectedPaymentMethod === method.id ? '#f0fdfa' : 'white'
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons 
                            name={method.icon as any} 
                            size={24} 
                            color="#14b8a6" 
                            style={{ marginRight: 12 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937' }}>
                              {method.name}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#6b7280' }}>
                              {method.description}
                            </Text>
                          </View>
                          {selectedPaymentMethod === method.id && (
                            <Ionicons name="checkmark-circle" size={24} color="#14b8a6" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Button
                    mode="outlined"
                    onPress={() => setCurrentStep('dates')}
                    style={{ flex: 1 }}
                    icon="arrow-left"
                  >
                    Subira
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handlePaymentSubmit}
                    disabled={!selectedPaymentMethod || !phoneNumber.trim() || isLoading}
                    loading={isLoading}
                    buttonColor="#14b8a6"
                    style={{ flex: 2 }}
                  >
                    {isLoading ? 'Kwishyura...' : `Ishyura ${formatCurrency(paymentAmount)}`}
                  </Button>
                </View>
              </View>
            )}

            {/* Success Step */}
            {currentStep === 'success' && transactionData && (
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 80,
                  height: 80,
                  backgroundColor: '#dcfce7',
                  borderRadius: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24
                }}>
                  <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
                </View>

                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'center' }}>
                  Ubwishyu Bwakiriwe!
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
                  Ubwishyu bwawe bwakiriwe neza. Ubu ni umenye wa cyumba!
                </Text>

                {/* Transaction Details */}
                <Card style={{ width: '100%', padding: 16, marginBottom: 24, backgroundColor: '#ffffff' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
                    Amakuru y'ubwishyu
                  </Text>
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>Nomero y'ikwibutso:</Text>
                      <Text style={{ fontFamily: 'monospace', fontWeight: '500', fontSize: 11, flexWrap: 'wrap' }}>
                        {transactionData.transactionId}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>Igihe:</Text>
                      <Text style={{ fontWeight: '500', fontSize: 12 }}>
                        {new Date(transactionData.timestamp).toLocaleString('rw-RW')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>Amafaranga:</Text>
                      <Text style={{ fontWeight: '600', color: '#16a34a', fontSize: 12 }}>
                        {formatCurrency(transactionData.amount)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>Inyubako:</Text>
                      <Text style={{ fontWeight: '500', fontSize: 12, flexWrap: 'wrap' }}>{transactionData.property}</Text>
                    </View>
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>Icyumba:</Text>
                      <Text style={{ fontWeight: '500', fontSize: 12, flexWrap: 'wrap' }}>{transactionData.room}</Text>
                    </View>
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>Uburyo bwo kwishyura:</Text>
                      <Text style={{ fontWeight: '500', fontSize: 12, flexWrap: 'wrap' }}>{transactionData.paymentMethod}</Text>
                    </View>
                    <Divider style={{ marginVertical: 8 }} />
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>Uko bihagaze:</Text>
                      <Text style={{ fontWeight: '500', color: '#ea580c', fontSize: 12, flexWrap: 'wrap' }}>
                        Kwishyuriwe – Bitegereje koherezwa
                      </Text>
                    </View>
                  </View>
                </Card>

                <Card style={{ width: '100%', padding: 12, marginBottom: 24, backgroundColor: '#eff6ff' }}>
                  <Text style={{ fontSize: 11, color: '#1e40af', textAlign: 'center', lineHeight: 16 }}>
                    <Text style={{ fontWeight: '600' }}>Menya:</Text> Amafaranga yawe azohererezwa ku munini w'inyubako nyuma yo kwemezwa n'ubuyobozi.{'\n\n'}
                    Uzabona ubumenyi bwihariye mu buryo bwa dashbord yawe.
                  </Text>
                </Card>

                <Button
                  mode="contained"
                  onPress={handleSuccess}
                  buttonColor="#14b8a6"
                  style={{ width: '100%' }}
                >
                  Soza
                </Button>
              </View>
            )}
          </ScrollView>
        </Surface>
      </Modal>
    </Portal>
  )
} 