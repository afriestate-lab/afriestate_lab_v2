import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native'
import { Text, Button, Card, Checkbox } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

interface AddTenantFormProps {
  onBack: () => void
  onSuccess: () => void
}

interface Property {
  id: string
  name: string
  address: string
}

interface Room {
  id: string
  room_number: string
  rent_amount: number
  floor_number: number
  property_id: string
}

export default function AddTenantForm({ onBack, onSuccess }: AddTenantFormProps) {
  const [loading, setLoading] = useState(false)
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    id_number: '',
    emergency_contact: '',
    move_in_date: new Date().toISOString().split('T')[0]
  })
  
  const [properties, setProperties] = useState<Property[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [selectedRooms, setSelectedRooms] = useState<{roomId: string, price: number}[]>([])

  useEffect(() => {
    fetchPropertiesAndRooms()
  }, [])

  const fetchPropertiesAndRooms = async () => {
    try {
      setLoadingProperties(true)
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        Alert.alert('Ikosa', 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.')
        return
      }

      // Fetch properties owned by current user using RPC to avoid RLS recursion
      const { data: propertiesData, error: propertiesError } = await supabase
        .rpc('get_landlord_properties', {
          p_landlord_id: user.id
        })

      if (propertiesError) {
        console.error('Properties fetch error:', propertiesError)
        Alert.alert('Ikosa', 'Ntiyashoboye gushaka inyubako zawe.')
        return
      }

      setProperties(propertiesData || [])

      if (propertiesData && propertiesData.length > 0) {
        const propertyIds = propertiesData.map((p: any) => p.id)
        
        // Fetch rooms from these properties using RPC to avoid RLS issues
        let allRooms: any[] = []
        
        try {
          const roomPromises = propertyIds.map((propertyId: string) => 
            supabase.rpc('get_property_rooms', {
              p_property_id: propertyId
            })
          )
          
          const roomResults = await Promise.all(roomPromises)
          
          for (const result of roomResults) {
            if (result.error) {
              console.error('Rooms error:', result.error)
              continue
            }
            if (result.data) {
              // Filter for vacant rooms only
              const vacantRooms = result.data.filter((room: any) => 
                room.status === 'vacant' || !room.tenant_id
              )
              allRooms.push(...vacantRooms)
            }
          }
          
          // Sort rooms by property_id, floor_number, room_number
          allRooms.sort((a, b) => {
            if (a.property_id !== b.property_id) {
              return a.property_id.localeCompare(b.property_id)
            }
            if (a.floor_number !== b.floor_number) {
              return a.floor_number - b.floor_number
            }
            return a.room_number.localeCompare(b.room_number)
          })
          
          const roomsData = allRooms
          const roomsError = null
          
        } catch (error) {
          console.error('Error fetching rooms:', error)
          Alert.alert('Ikosa', 'Ntiyashoboye gushaka ibyumba.')
          return
        }

        if (allRooms.length === 0) {
          console.warn('No vacant rooms found')
          Alert.alert('Ikosa', 'Ntiyashoboye gushaka ibyumba byubusa.')
          return
        }

        setAvailableRooms(roomsData || [])
      }

    } catch (error) {
      console.error('Error fetching properties and rooms:', error)
      Alert.alert('Ikosa', 'Habaye ikosa mu gushaka inyubako n\'ibyumba.')
    } finally {
      setLoadingProperties(false)
    }
  }

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Ikosa', 'Andika amazina yuzuye y\'umukodesha')
      return false
    }
    
    if (!formData.phone_number.trim()) {
      Alert.alert('Ikosa', 'Andika nimero ya telefoni')
      return false
    }

    // Validate Rwanda phone number format
    const phoneRegex = /^(\+250|250|07[238]\d{7}|\+25[0-9]\d{8})$/
    if (!phoneRegex.test(formData.phone_number.replace(/\s/g, ''))) {
      Alert.alert('Ikosa', 'Andika nimero ya telefoni iyo mu Rwanda (078XXXXXXX)')
      return false
    }

    if (selectedRooms.length === 0) {
      Alert.alert('Ikosa', 'Hitamo byibura icyumba kimwe')
      return false
    }

    // Validate room prices
    const invalidRooms = selectedRooms.filter(room => !room.price || room.price <= 0)
    if (invalidRooms.length > 0) {
      Alert.alert('Ikosa', 'Andika ikiguzi cy\'ibyumba byose byahiswemo')
      return false
    }

    return true
  }

  const handleRoomSelection = (room: Room, selected: boolean) => {
    if (selected) {
      setSelectedRooms([...selectedRooms, { roomId: room.id, price: room.rent_amount }])
    } else {
      setSelectedRooms(selectedRooms.filter(r => r.roomId !== room.id))
    }
  }

  const handleRoomPriceChange = (roomId: string, price: string) => {
    const numericPrice = parseFloat(price) || 0
    setSelectedRooms(selectedRooms.map(room => 
      room.roomId === roomId ? { ...room, price: numericPrice } : room
    ))
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

      // Check if tenant with this ID already exists
      let tenantId = null
      
      if (formData.id_number.trim()) {
        const { data: existingTenant, error: checkError } = await supabase
          .from('tenants')
          .select('id, full_name')
          .eq('landlord_id', user.id)
          .eq('id_number', formData.id_number.trim())
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing tenant:', checkError)
          Alert.alert('Ikosa', 'Habaye ikosa mu gusuzuma umukodesha usanzwe ahari.')
          return
        }

        if (existingTenant) {
          Alert.alert(
            'Umukodesha asanzwe ahari',
            `Umukodesha w\'indangamuntu "${formData.id_number}" asanzwe ahari mu nyandiko zawe: "${existingTenant.full_name}". Hitamo ikindi nomero cy\'indangamuntu.`
          )
          return
        }
      }

      // Create new tenant
      const tenantData = {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
        email: formData.email.trim() || null,
        id_number: formData.id_number.trim() || null,
        emergency_contact: formData.emergency_contact.trim() || null,
        landlord_id: user.id
      }

      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert([tenantData])
        .select()
        .single()

      if (tenantError) {
        console.error('Tenant creation error:', tenantError)
        Alert.alert('Ikosa', 'Ntiyashoboye kurondora umukodesha. Ongera ugerageze.')
        return
      }

      tenantId = newTenant.id

      // Create room assignments
      const roomAssignments = selectedRooms.map(room => ({
        tenant_id: tenantId,
        room_id: room.roomId,
        rent_amount: room.price,
        move_in_date: formData.move_in_date,
        next_due_date: calculateNextDueDate(formData.move_in_date),
        is_active: true
      }))

      const { error: assignmentError } = await supabase
        .from('room_tenants')
        .insert(roomAssignments)

      if (assignmentError) {
        console.error('Room assignment error:', assignmentError)
        Alert.alert('Ikosa', 'Umukodesha yarongoye ariko ntibyashoboye kumuha ibyumba. Ongera ugerageze mu cyumba cy\'abakodesha.')
        onSuccess()
        return
      }

      // Update room status to occupied
      const roomIds = selectedRooms.map(r => r.roomId)
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .in('id', roomIds)

      if (updateError) {
        console.error('Room status update error:', updateError)
        // Don't fail the operation for this
      }

      Alert.alert('Byagenze neza!', 'Umukodesha yarongoye neza hamwe n\'ibyumba bye.')
      onSuccess()

    } catch (error) {
      console.error('Error creating tenant:', error)
      Alert.alert('Ikosa', 'Habaye ikosa. Ongera ugerageze.')
    } finally {
      setLoading(false)
    }
  }

  const calculateNextDueDate = (moveInDate: string) => {
    const date = new Date(moveInDate)
    date.setMonth(date.getMonth() + 1)
    return date.toISOString().split('T')[0]
  }

  const getRoomDisplayName = (room: Room) => {
    const property = properties.find(p => p.id === room.property_id)
    return `${property?.name || 'Inyubako'} - Riko ${room.floor_number} - ${room.room_number}`
  }

  if (loadingProperties) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Kuraguza inyubako n\'ibyumba...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (properties.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#059669" />
          </TouchableOpacity>
          <Text style={styles.title}>Ongeraho Umukodesha</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Nta nyubako ufite</Text>
          <Text style={styles.emptySubtext}>Mbanza urondore inyubako mbere yo kongeraho abakodesha</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#059669" />
        </TouchableOpacity>
        <Text style={styles.title}>Ongeraho Umukodesha</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Amakuru y\'umukodesha</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amazina yuzuye *</Text>
              <TextInput
                style={styles.input}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Urugero: Jean Baptiste Mukamana"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nimero ya telefoni *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone_number}
                onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                placeholder="078X XXX XXX"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Imeli</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="umukodesha@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomero y\'indangamuntu</Text>
              <TextInput
                style={styles.input}
                value={formData.id_number}
                onChangeText={(text) => setFormData({ ...formData, id_number: text })}
                placeholder="1234567890123456"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefoni y\'uhamagarwa mu bihe by\'ihutanye</Text>
              <TextInput
                style={styles.input}
                value={formData.emergency_contact}
                onChangeText={(text) => setFormData({ ...formData, emergency_contact: text })}
                placeholder="078X XXX XXX"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Itariki yo kwinjira</Text>
              <TextInput
                style={styles.input}
                value={formData.move_in_date}
                onChangeText={(text) => setFormData({ ...formData, move_in_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </Card.Content>
        </Card>

        {availableRooms.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Hitamo ibyumba</Text>
              <Text style={styles.subtitle}>Hitamo ibyumba umukodesha azabamo:</Text>
              
              {availableRooms.map((room) => (
                <View key={room.id} style={styles.roomItem}>
                  <View style={styles.roomHeader}>
                    <Checkbox
                      status={selectedRooms.some(r => r.roomId === room.id) ? 'checked' : 'unchecked'}
                      onPress={() => handleRoomSelection(room, !selectedRooms.some(r => r.roomId === room.id))}
                    />
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomName}>{getRoomDisplayName(room)}</Text>
                      <Text style={styles.roomPrice}>Ikiguzi gisanzwe: {room.rent_amount.toLocaleString()} RWF</Text>
                    </View>
                  </View>
                  
                  {selectedRooms.some(r => r.roomId === room.id) && (
                    <View style={styles.priceInput}>
                      <Text style={styles.label}>Ikiguzi cy\'umukodesha:</Text>
                      <TextInput
                        style={styles.input}
                        value={selectedRooms.find(r => r.roomId === room.id)?.price.toString() || ''}
                        onChangeText={(text) => handleRoomPriceChange(room.id, text)}
                        placeholder="150000"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                      />
                    </View>
                  )}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {availableRooms.length === 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.emptyRoomsContainer}>
                <Ionicons name="bed-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>Nta cyumba gisanzwe kibarizwa</Text>
                <Text style={styles.emptySubtext}>Ibyumba byose byawe biri bitandukanijwe</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.submitContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || availableRooms.length === 0}
            style={[styles.submitButton, availableRooms.length === 0 && styles.disabledButton]}
            labelStyle={styles.submitButtonText}
          >
            {loading ? 'Kurondora...' : 'Rondora Umukodesha'}
          </Button>
        </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
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
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
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
  roomItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomInfo: {
    flex: 1,
    marginLeft: 12,
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
  priceInput: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  emptyRoomsContainer: {
    alignItems: 'center',
    padding: 32,
  },
  submitContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 4,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}) 