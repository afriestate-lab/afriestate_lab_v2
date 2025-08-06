import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native'
import { Text, Button, Card, Checkbox } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/helpers'

interface AddPaymentFormProps {
  onBack: () => void
  onSuccess: () => void
}

interface Tenant {
  id: string
  full_name: string
  phone_number: string
  id_number: string
  properties: {
    name: string
  }
  rooms: {
    id: string
    room_number: string
    rent_amount: number
    floor_number: number
  }[]
}

export default function AddPaymentForm({ onBack, onSuccess }: AddPaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [nextDueDate, setNextDueDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const paymentMethods = [
    { value: 'cash', label: 'Amafaranga' },
    { value: 'mtn_momo', label: 'MTN Mobile Money' },
    { value: 'airtel_money', label: 'Airtel Money' },
    { value: 'card', label: 'Ikarita' }
  ]

  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    filterTenants()
  }, [searchQuery, allTenants])

  useEffect(() => {
    if (paymentDate) {
      // Calculate next due date (1 month from payment date)
      const date = new Date(paymentDate)
      date.setMonth(date.getMonth() + 1)
      setNextDueDate(date.toISOString().split('T')[0])
    }
  }, [paymentDate])

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true)
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        Alert.alert('Ikosa', 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.')
        return
      }

      // Get properties for this landlord using RPC to avoid RLS recursion
      const { data: properties, error: propertiesError } = await supabase
        .rpc('get_landlord_properties', {
          p_landlord_id: user.id
        })

      if (propertiesError) {
        console.error('Properties error:', propertiesError)
        Alert.alert('Ikosa', 'Ntiyashoboye gushaka inyubako zawe.')
        return
      }

      if (!properties || properties.length === 0) {
        setAllTenants([])
        return
      }

      const propertyIds = properties?.map((p: any) => p.id) || []

      // Get rooms for these properties
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id')
        .in('property_id', propertyIds)
        .is('deleted_at', null)

      if (roomsError) {
        console.error('Rooms error:', roomsError)
        Alert.alert('Ikosa', 'Ntiyashoboye gushaka ibyumba.')
        return
      }

      if (!rooms || rooms.length === 0) {
        setAllTenants([])
        return
      }

      const roomIds = rooms.map(r => r.id)

      // Get tenants with their room assignments
      const { data: tenantData, error: tenantError } = await supabase
        .from('room_tenants')
        .select(`
          tenant_id,
          room_id,
          rent_amount,
          tenants!fk_room_tenants_tenant (
            id,
            full_name,
            phone_number,
            id_number
          ),
          rooms!fk_room_tenants_room (
            id,
            room_number,
            rent_amount,
            floor_number,
            properties (
              name
            )
          )
        `)
        .in('room_id', roomIds)
        .eq('is_active', true)

      if (tenantError) {
        console.error('Tenant data error:', tenantError)
        Alert.alert('Ikosa', 'Ntiyashoboye gushaka abakodesha.')
        return
      }

      // Group by tenant
      const tenantsMap = new Map<string, Tenant>()
      
      tenantData?.forEach((item: any) => {
        if (!item.tenants || !item.rooms) return
        
        const tenantId = item.tenants.id
        if (!tenantsMap.has(tenantId)) {
          tenantsMap.set(tenantId, {
            id: tenantId,
            full_name: item.tenants.full_name,
            phone_number: item.tenants.phone_number || '',
            id_number: item.tenants.id_number || '',
            properties: {
              name: item.rooms.properties?.name || 'Inyubako'
            },
            rooms: []
          })
        }
        
        const tenant = tenantsMap.get(tenantId)!
        tenant.rooms.push({
          id: item.rooms.id,
          room_number: item.rooms.room_number,
          rent_amount: item.rent_amount || item.rooms.rent_amount,
          floor_number: item.rooms.floor_number
        })
      })

      setAllTenants(Array.from(tenantsMap.values()))

    } catch (error) {
      console.error('Error fetching tenants:', error)
      Alert.alert('Ikosa', 'Habaye ikosa mu gushaka abakodesha.')
    } finally {
      setLoadingTenants(false)
    }
  }

  const filterTenants = () => {
    if (!searchQuery.trim()) {
      setFilteredTenants(allTenants)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = allTenants.filter(tenant =>
      tenant.full_name.toLowerCase().includes(query) ||
      tenant.phone_number.toLowerCase().includes(query) ||
      tenant.id_number.toLowerCase().includes(query)
    )
    setFilteredTenants(filtered)
  }

  const handleTenantSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setSelectedRoomIds(tenant.rooms.map(room => room.id))
    
    // Calculate default payment amount (sum of all room rents)
    const totalRent = tenant.rooms.reduce((sum, room) => sum + room.rent_amount, 0)
    setPaymentAmount(totalRent.toString())
  }

  const handleRoomToggle = (roomId: string) => {
    if (selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds(selectedRoomIds.filter(id => id !== roomId))
    } else {
      setSelectedRoomIds([...selectedRoomIds, roomId])
    }
  }

  const validateForm = () => {
    if (!selectedTenant) {
      Alert.alert('Ikosa', 'Hitamo umukodesha')
      return false
    }

    if (selectedRoomIds.length === 0) {
      Alert.alert('Ikosa', 'Hitamo byibura icyumba kimwe')
      return false
    }

    if (!paymentAmount.trim() || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Ikosa', 'Andika amafaranga yishyuwe')
      return false
    }

    if (!paymentDate.trim()) {
      Alert.alert('Ikosa', 'Hitamo itariki y\'ubwishyu')
      return false
    }

    if (!nextDueDate.trim()) {
      Alert.alert('Ikosa', 'Hitamo itariki ikurikira y\'ubwishyu')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        Alert.alert('Ikosa', 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.')
        return
      }

      const amount = parseFloat(paymentAmount)

      // SIMULATION MODE: Create payment records for each selected room
      console.log('🎯 [MOBILE_PAYMENT_SIMULATION] Processing mobile payment:', {
        amount,
        method: paymentMethod,
        rooms: selectedRoomIds.length
      })

      const paymentPromises = selectedRoomIds.map(async (roomId) => {
        const roomData = selectedTenant!.rooms.find(r => r.id === roomId)
        if (!roomData) return null

        // Calculate proportional payment amount for this room
        const totalSelectedRent = selectedTenant!.rooms
          .filter(r => selectedRoomIds.includes(r.id))
          .reduce((sum, r) => sum + r.rent_amount, 0)
        
        const roomPaymentAmount = totalSelectedRent > 0 
          ? Math.round((roomData.rent_amount / totalSelectedRent) * amount)
          : Math.round(amount / selectedRoomIds.length)

        console.log('🎯 [MOBILE_PAYMENT_SIMULATION] Processing payment for room:', roomId, 'amount:', roomPaymentAmount)

        // SIMULATION MODE: Use database function to process payment
        const { data: simulationResult, error } = await supabase
          .rpc('simulate_successful_payment', {
            p_user_id: user.id,
            p_room_id: roomId,
            p_amount: roomPaymentAmount,
            p_payment_type: 'rent',
            p_payment_method: paymentMethod,
            p_user_full_name: user.user_metadata?.full_name || user.email,
            p_user_email: user.email,
                         p_user_phone: selectedTenant?.phone_number || '',
            p_check_in_date: paymentDate,
            p_check_out_date: null,
            p_duration_months: null
          })

        if (error) throw error
        
        // Return payment data in expected format
        return {
          id: simulationResult.payment_id,
          reference: simulationResult.reference,
          amount: roomPaymentAmount,
          room_id: roomId
        }
      })

      const payments = await Promise.all(paymentPromises)
      const validPayments = payments.filter(p => p !== null)

      if (validPayments.length === 0) {
        throw new Error('Nta bwishyu bwashyizweho')
      }

      // Update tenant payment status for each room
      const updatePromises = selectedRoomIds.map(async (roomId) => {
        // Calculate next due date (1 month from payment date)
        const nextDueDate = new Date(paymentDate)
        nextDueDate.setMonth(nextDueDate.getMonth() + 1)

        const { error } = await supabase
          .from('room_tenants')
          .update({
            last_payment_date: paymentDate,
            next_due_date: nextDueDate.toISOString().split('T')[0],
            payment_status: 'paid'
          })
          .eq('room_id', roomId)
          .eq('tenant_id', selectedTenant!.id)
          .eq('is_active', true)

        if (error) {
          console.error('Error updating room tenant status:', error)
        }
      })

      await Promise.all(updatePromises)

      // Create activity log
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          type: 'payment_processed',
          description: `Mobile payment of ${amount} RWF processed for ${selectedTenant!.full_name} (Simulation)`,
          metadata: {
            payment_ids: validPayments.map(p => p.id),
            tenant_id: selectedTenant!.id,
            amount,
            payment_method: paymentMethod,
            simulation: true
          }
        })

      console.log('✅ [MOBILE_PAYMENT_SIMULATION] Payment processed successfully:', {
        payments_count: validPayments.length,
        total_amount: amount,
        method: paymentMethod
      })

      Alert.alert(
        'Byagenze neza!', 
        `Ubwishyu bwa ${amount.toLocaleString()} RWF bwemezwe neza! (Simulation Mode)`
      )
      onSuccess()

    } catch (error) {
      console.error('❌ [MOBILE_PAYMENT_SIMULATION] Error processing payment:', error)
      Alert.alert('Ikosa', 'Ntiyashoboye kwandika ubwishyu. Ongera ugerageze.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingTenants) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Kuraguza abakodesha...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#7C2D12" />
        </TouchableOpacity>
        <Text style={styles.title}>Ongeraho Ubwishyu</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!selectedTenant ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Shakisha umukodesha</Text>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Shakisha izina, telefoni cyangwa nomero y'indangamuntu..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {filteredTenants.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>
                    {allTenants.length === 0 ? 'Nta bakodesha bahari' : 'Nta mukodesha usanga'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {allTenants.length === 0 ? 'Ongeraho abakodesha mbere yo kwandika ubwishyu' : 'Ongera ushakishe izindi jambo'}
                  </Text>
                </View>
              ) : (
                <View style={styles.tenantsList}>
                  {filteredTenants.map((tenant) => (
                    <TouchableOpacity
                      key={tenant.id}
                      style={styles.tenantItem}
                      onPress={() => handleTenantSelect(tenant)}
                    >
                      <View style={styles.tenantInfo}>
                        <Text style={styles.tenantName}>{tenant.full_name}</Text>
                        <Text style={styles.tenantDetails}>
                          {tenant.phone_number} • {tenant.properties.name}
                        </Text>
                        <Text style={styles.tenantRooms}>
                          Ibyumba: {tenant.rooms.map(r => r.room_number).join(', ')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.selectedTenantHeader}>
                  <Text style={styles.sectionTitle}>Ubwishyu bwa {selectedTenant.full_name}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedTenant(null)
                      setSelectedRoomIds([])
                      setPaymentAmount('')
                    }}
                    style={styles.changeButton}
                  >
                    <Text style={styles.changeButtonText}>Hindura</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tenantSummary}>
                  <Text style={styles.tenantSummaryText}>📱 {selectedTenant.phone_number}</Text>
                  <Text style={styles.tenantSummaryText}>🏠 {selectedTenant.properties.name}</Text>
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Amakuru y'ubwishyu</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amafaranga yishyuwe *</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="150000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Uburyo bwishyurwamo</Text>
                  <View style={styles.paymentMethodsContainer}>
                    {paymentMethods.map((method) => (
                      <TouchableOpacity
                        key={method.value}
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === method.value && styles.paymentMethodSelected
                        ]}
                        onPress={() => setPaymentMethod(method.value)}
                      >
                        <View style={styles.radioCircle}>
                          {paymentMethod === method.value && <View style={styles.radioSelected} />}
                        </View>
                        <Text style={styles.paymentMethodLabel}>{method.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Itariki y'ubwishyu *</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentDate}
                    onChangeText={setPaymentDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Itariki ikurikira y'ubwishyu *</Text>
                  <TextInput
                    style={styles.input}
                    value={nextDueDate}
                    onChangeText={setNextDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Hitamo ibyumba byishyurirwa</Text>
                
                {selectedTenant.rooms.map((room) => (
                  <View key={room.id} style={styles.roomItem}>
                    <Checkbox
                      status={selectedRoomIds.includes(room.id) ? 'checked' : 'unchecked'}
                      onPress={() => handleRoomToggle(room.id)}
                    />
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomName}>Riko {room.floor_number} - {room.room_number}</Text>
                      <Text style={styles.roomPrice}>{formatCurrency(room.rent_amount)}</Text>
                    </View>
                  </View>
                ))}
              </Card.Content>
            </Card>

            <View style={styles.submitContainer}>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                labelStyle={styles.submitButtonText}
              >
                {loading ? 'Kwandika...' : 'Andika Ubwishyu'}
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  tenantsList: {
    gap: 12,
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  tenantDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  tenantRooms: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectedTenantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#7C2D12',
    borderRadius: 6,
  },
  changeButtonText: {
    color: '#7C2D12',
    fontSize: 14,
    fontWeight: '600',
  },
  tenantSummary: {
    gap: 4,
  },
  tenantSummaryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'white',
  },
  paymentMethodsContainer: {
    gap: 8,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  paymentMethodSelected: {
    borderColor: '#7C2D12',
    backgroundColor: '#FEF2F2',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioSelected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C2D12',
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: '#374151',
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  roomInfo: {
    flex: 1,
    marginLeft: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  roomPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  submitContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: '#7C2D12',
    borderRadius: 8,
    paddingVertical: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}) 