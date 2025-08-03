import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Platform 
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import DatePicker from '../date-picker'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { useTheme } from '../_layout'

interface Property {
  id: string
  name: string
  address: string
}

interface Room {
  id: string
  room_number: string
  property_id: string
  property_name: string
  property_address: string
}

interface CurrentLease {
  id: string
  tenant_id: string
  room_id: string
  property_id: string
  rent_amount: number
  move_in_date: string
  next_due_date: string
  room_number: string
  property_name: string
  property_address: string
}

interface LeaseExtensionFlowProps {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
}

type FlowStep = 'property_selection' | 'date_selection' | 'confirmation' | 'payment'

export default function LeaseExtensionFlow({ visible, onClose, onSuccess }: LeaseExtensionFlowProps) {
  const { theme } = useTheme()
  const [currentStep, setCurrentStep] = useState<FlowStep>('property_selection')
  const [loading, setLoading] = useState(false)
  const [tenantLeases, setTenantLeases] = useState<CurrentLease[]>([])
  const [selectedLease, setSelectedLease] = useState<CurrentLease | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [calculatedAmount, setCalculatedAmount] = useState(0)
  const [extensionMonths, setExtensionMonths] = useState(0)

  useEffect(() => {
    if (visible) {
      loadTenantLeases()
      setCurrentStep('property_selection')
      setSelectedLease(null)
      setSelectedEndDate(new Date())
      setCalculatedAmount(0)
      setExtensionMonths(0)
    }
  }, [visible])

  useEffect(() => {
    if (selectedLease && selectedEndDate) {
      calculateAmount()
    }
  }, [selectedLease, selectedEndDate])

  const loadTenantLeases = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No authenticated user found')
        return
      }

      console.log('Loading leases for user:', user.id)

      // First, get the tenant_user record
      const { data: tenantUserData, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (tenantUserError || !tenantUserData) {
        console.error('Error getting tenant user:', tenantUserError)
        Alert.alert('Ikosa', 'Ntitwashoboye kubona amakuru yawe')
        return
      }

      console.log('Found tenant user:', tenantUserData.id)

      // Then get the tenant record
      const { data: tenantRecord, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('tenant_user_id', tenantUserData.id)
        .single()

      if (tenantError || !tenantRecord) {
        console.error('Error getting tenant record:', tenantError)
        Alert.alert('Ikosa', 'Ntitwashoboye kubona ibinyujijwe n\'umukodesha')
        return
      }

      console.log('Found tenant record:', tenantRecord.id)

      // Use a simpler approach with RPC call to bypass RLS recursion issues
      const { data: leasesData, error: leasesError } = await supabase
        .rpc('get_tenant_leases', { 
          p_auth_user_id: user.id 
        })

      if (leasesError) {
        console.error('Error getting leases:', leasesError)
        Alert.alert('Ikosa', 'Ntitwashoboye kubona amakuru y\'inzu zawe')
        return
      }

      console.log('Found leases data:', leasesData)

      if (leasesData && leasesData.length > 0) {
        const leases: CurrentLease[] = leasesData.map((lease: any) => ({
          id: lease.id,
          tenant_id: lease.tenant_id,
          room_id: lease.room_id,
          property_id: lease.property_id,
          rent_amount: parseFloat(lease.rent_amount),
          move_in_date: lease.move_in_date,
          next_due_date: lease.next_due_date || new Date().toISOString().split('T')[0],
          end_date: lease.move_out_date,
          room_number: lease.room_number,
          property_name: lease.property_name,
          property_address: lease.property_address
        }))
        
        console.log('Processed leases from RPC:', leases)
        setTenantLeases(leases)
      } else {
        console.log('No active leases found')
        Alert.alert('Amakuru', 'Nta nzu ufite kuri ubu')
      }
    } catch (error) {
      console.error('Error loading tenant leases:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye gukura amakuru yawe. Ongera ugerageze.')
    } finally {
      setLoading(false)
    }
  }

  const calculateAmount = () => {
    if (!selectedLease) return

    const currentEndDate = new Date(selectedLease.next_due_date)
    const newEndDate = new Date(selectedEndDate)
    
    // Calculate months difference
    const monthsDiff = (newEndDate.getFullYear() - currentEndDate.getFullYear()) * 12 + 
                      (newEndDate.getMonth() - currentEndDate.getMonth())
    
    if (monthsDiff <= 0) {
      setExtensionMonths(0)
      setCalculatedAmount(0)
      return
    }

    setExtensionMonths(monthsDiff)
    setCalculatedAmount(monthsDiff * selectedLease.rent_amount)
  }

  const handlePropertySelect = (lease: CurrentLease) => {
    setSelectedLease(lease)
    // Set minimum date to current lease end date + 1 day
    const minDate = new Date(lease.next_due_date)
    minDate.setDate(minDate.getDate() + 1)
    setSelectedEndDate(minDate)
    setCurrentStep('date_selection')
  }

  const handleDateConfirm = () => {
    if (extensionMonths <= 0) {
      Alert.alert('Ikosa', 'Nyamuneka hitamo itariki iri nyuma y\'itariki yarangiye.')
      return
    }
    setCurrentStep('confirmation')
  }

  const handleConfirmExtension = () => {
    if (calculatedAmount > 0) {
      // Integrate with payment system
      setCurrentStep('payment')
    } else {
      submitExtensionRequest()
    }
  }

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      // Create payment record for the extension
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !selectedLease) return

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: selectedLease.tenant_id,
          room_id: selectedLease.room_id,
          amount: calculatedAmount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentData.method || 'extension_payment',
          status: 'completed',
          receipt_number: `EXT-${Date.now()}`,
          notes: `Lease extension payment for ${extensionMonths} month(s)`,
          recorded_by: user.id
        })

      if (paymentError) {
        console.error('Payment record error:', paymentError)
        // Continue with extension request even if payment record fails
      }

      // Submit the extension request
      await submitExtensionRequest()
    } catch (error) {
      console.error('Payment integration error:', error)
      Alert.alert('Ikosa', 'Hari ikibazo ko kwishyura. Ongera ugerageze.')
    }
  }

  const handlePaymentCancel = () => {
    setCurrentStep('confirmation')
  }

  const submitExtensionRequest = async () => {
    if (!selectedLease) return

    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use RPC function to create lease extension request
      const { data: result, error } = await supabase
        .rpc('create_lease_extension_request', {
          p_auth_user_id: user.id,
          p_room_tenant_id: selectedLease.id,
          p_current_end_date: selectedLease.next_due_date,
          p_new_end_date: selectedEndDate.toISOString().split('T')[0],
          p_extension_months: extensionMonths,
          p_payment_amount: calculatedAmount,
          p_notes: `Extension request for ${extensionMonths} month(s) - ${selectedLease.property_name}, Room ${selectedLease.room_number}`
        })

      console.log('Extension request result:', result)

      if (error) throw error

      // Check if the RPC function succeeded
      if (!result?.[0]?.success) {
        throw new Error(result?.[0]?.message || 'Failed to create extension request')
      }

      Alert.alert(
        'Byagenze neza!',
        `Icyifuzo cyo kongera igihe cyoherejwe neza. Uzabona ubutumwa bwo gutanga uko byagenze.\n\nIgihe: ${extensionMonths} amezi\nIgiciro: ${formatCurrency(calculatedAmount)}`,
        [
          {
            text: 'Menya',
            onPress: () => {
              onClose()
              onSuccess?.()
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error submitting extension request:', error)
      Alert.alert('Ikosa', 'Ntibyashoboye kohereza icyifuzo. Ongera ugerageze.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'date_selection':
        setCurrentStep('property_selection')
        setSelectedLease(null)
        break
      case 'confirmation':
        setCurrentStep('date_selection')
        break
      case 'payment':
        setCurrentStep('confirmation')
        break
      default:
        onClose()
    }
  }

  const renderPropertySelection = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.stepHeader, { borderBottomColor: '#e8f4fd' }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#4a90e2" />
        </TouchableOpacity>
        <Text style={[styles.stepTitle, { color: '#2c3e50', fontWeight: '700' }]}>Hitamo icyo ukodesha</Text>
      </View>

      <ScrollView style={styles.stepContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={[styles.loadingText, { color: '#7f8c8d', fontSize: 16 }]}>Gukura amakuru...</Text>
          </View>
        ) : tenantLeases.length > 0 ? (
          tenantLeases.map((lease: CurrentLease, index) => (
            <TouchableOpacity
              key={`lease-${lease.id}-${index}`}
              style={[styles.propertyCard, { 
                backgroundColor: '#ffffff',
                borderLeftWidth: 4,
                borderLeftColor: '#3498db',
                shadowColor: '#3498db',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 6
              }]}
              onPress={() => handlePropertySelect(lease)}
            >
              <View style={styles.propertyInfo}>
                <Text style={[styles.propertyName, { color: '#2c3e50', fontWeight: '700', fontSize: 16 }]}>{lease.property_name}</Text>
                <Text style={[styles.propertyAddress, { color: '#7f8c8d', fontSize: 14 }]}>{lease.property_address}</Text>
                <Text style={[styles.roomNumber, { color: '#7f8c8d', fontSize: 14 }]}>
                  Umuriro: {lease.room_number}
                </Text>
                <Text style={[styles.rentAmount, { color: '#3498db', fontWeight: '700', fontSize: 16 }]}>
                  {formatCurrency(lease.rent_amount)}/ukwezi
                </Text>
                <Text style={[styles.currentEndDate, { color: '#7f8c8d', fontSize: 12 }]}>
                  Irangira: {formatDate(lease.next_due_date)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#3498db" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={64} color="#bdc3c7" />
            <Text style={[styles.emptyText, { color: '#7f8c8d', fontSize: 16 }]}>
              Nta bintu ukodesha biboneka
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )

  const renderDateSelection = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.stepHeader, { borderBottomColor: '#e8f4fd' }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4a90e2" />
        </TouchableOpacity>
        <Text style={[styles.stepTitle, { color: '#2c3e50' }]}>Hitamo itariki nshya</Text>
      </View>

      <ScrollView style={styles.stepContent}>
        {selectedLease && (
          <View style={[styles.selectedPropertyCard, { 
            backgroundColor: '#ffffff',
            borderLeftWidth: 4,
            borderLeftColor: '#3498db',
            shadowColor: '#3498db',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6
          }]}>
            <Text style={[styles.selectedPropertyName, { color: '#2c3e50', fontWeight: '700' }]}>
              {selectedLease.property_name} - Umuriro {selectedLease.room_number}
            </Text>
            <Text style={[styles.currentEndInfo, { color: '#7f8c8d', fontSize: 15 }]}>
              Irangira kuri ubu: {formatDate(selectedLease.next_due_date)}
            </Text>
          </View>
        )}

        <View style={[styles.dateSelectionCard, { 
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#e8f4fd',
          shadowColor: '#3498db',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8
        }]}>
          <Text style={[styles.dateSelectionTitle, { 
            color: '#2c3e50', 
            fontWeight: '700',
            fontSize: 18,
            marginBottom: 20
          }]}>
            Itariki nshya yo kurangirira
          </Text>
          
          <TouchableOpacity
            style={[styles.datePickerButton, { 
              backgroundColor: '#ffffff',
              borderColor: '#e1e8ed',
              borderWidth: 1,
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 12,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1
            }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={16} color="#3498db" />
            <Text style={[styles.datePickerText, { 
              color: '#2c3e50',
              fontSize: 14,
              fontWeight: '500',
              marginLeft: 8
            }]}>
              {formatDate(selectedEndDate.toISOString())}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#7f8c8d" />
          </TouchableOpacity>

          {extensionMonths > 0 && (
            <View style={[styles.extensionSummary, { 
              backgroundColor: '#f8f9fa',
              borderWidth: 1,
              borderColor: '#e1e8ed',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1
            }]}>
              <Text style={[styles.extensionSummaryTitle, { 
                color: '#27ae60',
                fontWeight: '600',
                fontSize: 13,
                marginBottom: 6
              }]}>
                Ibyongerewe
              </Text>
              <Text style={[styles.extensionMonths, { 
                color: '#2ecc71',
                fontSize: 16,
                fontWeight: '700',
                marginBottom: 4
              }]}>
                {extensionMonths} {extensionMonths === 1 ? 'ukwezi' : 'amezi'}
              </Text>
              <Text style={[styles.extensionAmount, { 
                color: '#2c3e50',
                fontSize: 14,
                fontWeight: '600'
              }]}>
                Igiciro: {formatCurrency(calculatedAmount)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.confirmDateButton,
              { 
                backgroundColor: extensionMonths > 0 ? '#3498db' : '#e1e8ed',
                borderRadius: 8,
                paddingVertical: 12,
                shadowColor: extensionMonths > 0 ? '#3498db' : '#e1e8ed',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3
              }
            ]}
            onPress={handleDateConfirm}
            disabled={extensionMonths <= 0}
          >
            <Text style={[styles.confirmDateButtonText, { 
              fontSize: 14,
              fontWeight: '600',
              letterSpacing: 0.3
            }]}>Komeza</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )

  // Render DatePicker as a separate modal overlay
  const renderDateTimePicker = () => {
    if (!showDatePicker) return null

    return (
      <DatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onDateSelect={(dateString) => {
          setSelectedEndDate(new Date(dateString))
          setShowDatePicker(false)
        }}
        title="Hitamo itariki"
        minDate={selectedLease?.next_due_date}
      />
    )
  }

  const renderConfirmation = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.stepHeader, { borderBottomColor: '#e8f4fd' }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4a90e2" />
        </TouchableOpacity>
        <Text style={[styles.stepTitle, { color: '#2c3e50', fontWeight: '700' }]}>Emeza icyifuzo</Text>
      </View>

      <ScrollView style={styles.stepContent}>
        <View style={[styles.confirmationCard, { 
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#e8f4fd',
          shadowColor: '#3498db',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8
        }]}>
          <View style={styles.confirmationHeader}>
            <Ionicons name="checkmark-circle" size={32} color="#27ae60" />
            <Text style={[styles.confirmationTitle, { 
              color: '#2c3e50',
              fontWeight: '700',
              fontSize: 18
            }]}>
              Emeza icyifuzo cyo kongera igihe
            </Text>
          </View>

          <View style={styles.confirmationDetails}>
            <View style={styles.confirmationRow}>
              <Text style={[styles.confirmationLabel, { color: '#7f8c8d', fontSize: 14 }]}>Inyubako:</Text>
              <Text style={[styles.confirmationValue, { color: '#2c3e50', fontWeight: '600' }]}>
                {selectedLease?.property_name}
              </Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={[styles.confirmationLabel, { color: '#7f8c8d', fontSize: 14 }]}>Umuriro:</Text>
              <Text style={[styles.confirmationValue, { color: '#2c3e50', fontWeight: '600' }]}>
                {selectedLease?.room_number}
              </Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={[styles.confirmationLabel, { color: '#7f8c8d', fontSize: 14 }]}>Irangira kuri ubu:</Text>
              <Text style={[styles.confirmationValue, { color: '#2c3e50', fontWeight: '600' }]}>
                {selectedLease && formatDate(selectedLease.next_due_date)}
              </Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={[styles.confirmationLabel, { color: '#7f8c8d', fontSize: 14 }]}>Itariki nshya:</Text>
              <Text style={[styles.confirmationValue, { color: '#2c3e50', fontWeight: '600' }]}>
                {formatDate(selectedEndDate.toISOString())}
              </Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={[styles.confirmationLabel, { color: '#7f8c8d', fontSize: 14 }]}>Igihe cyongewe:</Text>
              <Text style={[styles.confirmationValue, { color: '#27ae60', fontWeight: '700' }]}>
                {extensionMonths} {extensionMonths === 1 ? 'ukwezi' : 'amezi'}
              </Text>
            </View>
            <View style={[styles.confirmationRow, styles.totalRow]}>
              <Text style={[styles.confirmationLabel, styles.totalLabel, { color: '#2c3e50', fontWeight: '700' }]}>Igiciro cyose:</Text>
              <Text style={[styles.confirmationValue, styles.totalValue, { color: '#3498db', fontWeight: '800' }]}>
                {formatCurrency(calculatedAmount)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmButton, { 
              backgroundColor: '#27ae60',
              borderRadius: 12,
              shadowColor: '#27ae60',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6
            }]}
            onPress={handleConfirmExtension}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={[styles.confirmButtonText, { fontWeight: '700' }]}>Emeza no kohereza</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )

  const renderPayment = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.stepHeader, { borderBottomColor: '#e8f4fd' }]}>
        <TouchableOpacity style={styles.backButton} onPress={handlePaymentCancel}>
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={[styles.stepTitle, { color: '#2c3e50' }]}>Kwishyura</Text>
      </View>

      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.paymentContainer}>
          <View style={styles.paymentHeader}>
            <Ionicons name="card" size={48} color="#3498db" />
            <Text style={styles.paymentTitle}>Kwishyura Kongera Igihe</Text>
            <Text style={styles.paymentSubtitle}>
              Hitamo uburyo bwo kwishyura kugira ngo wongere igihe cyo gutura
            </Text>
          </View>

          <View style={styles.paymentDetails}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Inyubako:</Text>
              <Text style={styles.paymentValue}>{selectedLease?.property_name}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Icyumba:</Text>
              <Text style={styles.paymentValue}>{selectedLease?.room_number}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Igihe:</Text>
              <Text style={styles.paymentValue}>{extensionMonths} amezi</Text>
            </View>
            <View style={[styles.paymentRow, styles.totalRow]}>
              <Text style={styles.paymentLabel}>Igiciro:</Text>
              <Text style={styles.paymentValue}>{formatCurrency(calculatedAmount)}</Text>
            </View>
          </View>

          <View style={styles.paymentMethods}>
            <Text style={styles.paymentMethodsTitle}>Uburyo bwo kwishyura:</Text>
            
            <TouchableOpacity 
              style={styles.paymentMethod}
              onPress={() => handlePaymentSuccess({ method: 'mtn_momo' })}
            >
              <Ionicons name="phone-portrait" size={24} color="#e74c3c" />
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>MTN Mobile Money</Text>
                <Text style={styles.paymentMethodDesc}>Kwishyura ukoresheje MTN MoMo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.paymentMethod}
              onPress={() => handlePaymentSuccess({ method: 'airtel_money' })}
            >
              <Ionicons name="card" size={24} color="#e67e22" />
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>Airtel Money</Text>
                <Text style={styles.paymentMethodDesc}>Kwishyura ukoresheje Airtel Money</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.paymentMethod}
              onPress={() => handlePaymentSuccess({ method: 'bank_card' })}
            >
              <Ionicons name="business" size={24} color="#27ae60" />
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>Ikarita ya Bank</Text>
                <Text style={styles.paymentMethodDesc}>Kwishyura ukoresheje ikarita ya bank</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  )

  const renderContent = () => {
    switch (currentStep) {
      case 'property_selection':
        return renderPropertySelection()
      case 'date_selection':
        return renderDateSelection()
      case 'confirmation':
        return renderConfirmation()
      case 'payment':
        return renderPayment()
      default:
        return renderPropertySelection()
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleBack}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: '#f8fbfe' }]}>
        {renderContent()}
        {renderDateTimePicker()}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 10,
    padding: 5,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  propertyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  roomNumber: {
    fontSize: 14,
    marginBottom: 4,
  },
  rentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentEndDate: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  selectedPropertyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedPropertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentEndInfo: {
    fontSize: 14,
  },
  dateSelectionCard: {
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  extensionSummary: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  extensionSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  extensionMonths: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  extensionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDateButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationCard: {
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  confirmationDetails: {
    marginBottom: 24,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  confirmationLabel: {
    fontSize: 14,
    flex: 1,
  },
  confirmationValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Payment styles
  paymentContainer: {
    flex: 1,
  },
  paymentHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    color: '#2c3e50',
  },
  paymentSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#7f8c8d',
    paddingHorizontal: 20,
  },
  paymentDetails: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'right',
  },
  paymentMethods: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentMethodsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: '#7f8c8d',
  },
})