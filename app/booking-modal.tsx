import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard
} from 'react-native'
import {
  Text,
  Button,
  Surface,
  TextInput,
  Card,
  Chip,
  ActivityIndicator,
  Divider,
  IconButton,
  useTheme
} from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import PaymentProcessor from './payment-processor'
import DatePicker from './date-picker'
import { supabase } from '@/lib/supabase'

const { width, height } = Dimensions.get('window')

interface Property {
  id: string
  izina: string
  aho: string
  igiciro: string
  ifoto: string
  amanota: number
  ubwoko: string
  code: string
  irimo: boolean
  uburyo: string
  ibisobanuro: string
}

interface BookingModalProps {
  visible: boolean
  onClose: () => void
  property: Property
}

interface UserDetails {
  fullName: string
  phone: string
  password: string
}

interface PaymentDetails {
  airtelPhone: string
  spennAccount: string
}

const paymentMethods = [
  {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    icon: '📱',
    color: '#ffd700',
    description: 'Kohereza *182*7*1#'
  },
  {
    id: 'airtel_money',
    name: 'Airtel Money',
    icon: '📱',
    color: '#ff0000',
    description: 'Kohereza *185*1#'
  },
  {
    id: 'card',
    name: 'Ikarita ya Banki',
    icon: '💳',
    color: '#0066cc',
    description: 'Visa, Mastercard, American Express'
  },
  {
    id: 'bank_transfer',
    name: 'Amabanki',
    icon: '🏦',
    color: '#9333ea',
    description: 'I&M Bank, Bank of Kigali, Ecobank'
  },
  {
    id: 'cash',
    name: 'Amafaranga mu ntoki',
    icon: '💰',
    color: '#00aa00',
    description: 'Kwishyura igihe ugera aho utura'
  }
]

export default function BookingModal({ visible, onClose, property }: BookingModalProps) {
  const theme = useTheme()
  const [step, setStep] = useState(0)
  const [userDetails, setUserDetails] = useState<UserDetails>({
    fullName: '',
    phone: '',
    password: ''
  })
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    airtelPhone: '',
    spennAccount: ''
  })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successRef, setSuccessRef] = useState<string | null>(null)
  const [successAt, setSuccessAt] = useState<string | null>(null)
  const [userExists, setUserExists] = useState(false)
  const [paymentProcessorVisible, setPaymentProcessorVisible] = useState(false)
  const [checkInDatePickerVisible, setCheckInDatePickerVisible] = useState(false)
  const [checkOutDatePickerVisible, setCheckOutDatePickerVisible] = useState(false)

  // Reset modal when opened and load user details
  useEffect(() => {
    if (visible) {
      setStep(0)
      setPaymentDetails({ airtelPhone: '', spennAccount: '' })
      setSelectedPaymentMethod(null)
      setCheckInDate('')
      setCheckOutDate('')
      setIsProcessing(false)
      setIsSuccess(false)
      loadUserDetails()
    }
  }, [visible])

  const loadUserDetails = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        Alert.alert('Ikosa', 'Ntibashobora kubona amakuru yawe. Ongera ugerageze.')
        onClose()
        return
      }

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        Alert.alert('Ikosa', 'Ntibashobora kubona amakuru yawe. Ongera ugerageze.')
        onClose()
        return
      }

      // Set user details from authenticated user
      setUserDetails({
        fullName: userProfile.full_name || user.user_metadata?.full_name || '',
        phone: userProfile.phone_number || '',
        password: ''
      })
      setUserExists(true)
    } catch (error) {
      console.error('Error loading user details:', error)
      Alert.alert('Ikosa', 'Ntibashobora kubona amakuru yawe. Ongera ugerageze.')
      onClose()
    }
  }

  const extractNumericPrice = () => {
    const priceStr = property.igiciro
    const match = priceStr.match(/(\d+(?:,\d+)*)/)
    return match ? parseInt(match[1].replace(/,/g, '')) : 150000
  }

  const calculateTotalCost = () => {
    if (!checkInDate || !checkOutDate) return 0
    const start = new Date(checkInDate)
    const end = new Date(checkOutDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const monthlyRate = extractNumericPrice()
    const dailyRate = monthlyRate / 30
    return dailyRate * diffDays
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} RWF`
  }

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId)
  }

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Ikosa', 'Hitamo uburyo bwo kwishyura')
      return
    }

    if (!checkInDate || !checkOutDate) {
      Alert.alert('Ikosa', 'Hitamo iminsi yo kwinjira na gusohokamo')
      return
    }

    // Open payment processor
    setPaymentProcessorVisible(true)
  }

  const handlePaymentSuccess = () => {
    setPaymentProcessorVisible(false)
    setIsSuccess(true)
    setSuccessRef(`SIM-BOOK-${Date.now()}`)
    setSuccessAt(new Date().toISOString())
  }

  const handlePaymentError = (error: string) => {
    setPaymentProcessorVisible(false)
    Alert.alert('Ikosa', error)
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2].map((stepIndex) => (
        <View key={stepIndex} style={styles.stepRow}>
          <View style={[
            styles.stepCircle,
            step >= stepIndex ? styles.stepActive : styles.stepInactive
          ]}>
            <Text style={[
              styles.stepNumber,
              step >= stepIndex ? styles.stepNumberActive : styles.stepNumberInactive
            ]}>
              {stepIndex + 1}
            </Text>
          </View>
          {stepIndex < 2 && (
            <View style={[
              styles.stepLine,
              step > stepIndex ? styles.stepLineActive : styles.stepLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  )

  const renderDatesStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <Ionicons name="calendar" size={24} color="#667eea" />
          <Text variant="titleMedium" style={styles.stepTitle}>
            Hitamo Iminsi
          </Text>
        </View>

        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setCheckInDatePickerVisible(true)}
        >
          <View style={styles.dateInputContent}>
            <Ionicons name="calendar" size={20} color="#667eea" />
            <View style={styles.dateInputText}>
              <Text style={styles.dateInputLabel}>Itariki yo kwinjira</Text>
              <Text style={styles.dateInputValue}>
                {checkInDate || 'Hitamo itariki'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setCheckOutDatePickerVisible(true)}
        >
          <View style={styles.dateInputContent}>
            <Ionicons name="calendar" size={20} color="#667eea" />
            <View style={styles.dateInputText}>
              <Text style={styles.dateInputLabel}>Itariki yo gusohokamo</Text>
              <Text style={styles.dateInputValue}>
                {checkOutDate || 'Hitamo itariki'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        {checkInDate && checkOutDate && (
          <Surface style={styles.priceSummary} elevation={1}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Igiciro cy&apos;umunsi: {formatCurrency(extractNumericPrice() / 30)}
            </Text>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Iminsi: {Math.max(1, Math.ceil(Math.abs(new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)))}
            </Text>
            <Divider style={styles.divider} />
            <Text variant="titleMedium" style={styles.totalPrice}>
              Igiciro cyose: {formatCurrency(calculateTotalCost())}
            </Text>
          </Surface>
        )}

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={onClose}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
            accessible={true}
            accessibilityLabel="Funga"
            accessibilityHint="Kanda kugira ngo ufunge"
          >
            Funga
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              if (!checkInDate || !checkOutDate) {
                Alert.alert('Ikosa', 'Nyamuneka hitamo iminsi yo kwinjira no gusohokamo.')
                return
              }
              setStep(1)
            }}
            style={styles.continueButton}
            contentStyle={styles.buttonContent}
            disabled={!checkInDate || !checkOutDate}
            accessible={true}
            accessibilityLabel="Komeza kuri hitamo uburyo bwo kwishyura"
            accessibilityHint="Kanda kugira ngo ukomeze kuri hitamo uburyo bwo kwishyura"
          >
            Komeza
          </Button>
        </View>
      </Card.Content>
    </Card>
  )

  const renderPaymentStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <Ionicons name="card" size={24} color="#667eea" />
          <Text variant="titleMedium" style={styles.stepTitle}>
            Hitamo Uburyo bwo Kwishyura
          </Text>
        </View>

        <ScrollView style={styles.paymentMethodsContainer}>
          {paymentMethods.map((method) => (
            <TouchableWithoutFeedback
              key={method.id}
              onPress={() => handlePaymentMethodSelect(method.id)}
            >
              <Surface
                style={[
                  styles.paymentMethodCard,
                  selectedPaymentMethod === method.id && styles.paymentMethodSelected
                ]}
                elevation={1}
              >
                <View style={styles.paymentMethodContent}>
                  <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentMethodName}>{method.name}</Text>
                    <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                  </View>
                  {selectedPaymentMethod === method.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  )}
                </View>
              </Surface>
            </TouchableWithoutFeedback>
          ))}
        </ScrollView>

        {selectedPaymentMethod === 'airtel_money' && (
          <TextInput
            label="Nimero ya Airtel"
            value={paymentDetails.airtelPhone}
            onChangeText={(text) => setPaymentDetails(prev => ({ ...prev, airtelPhone: text }))}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
            placeholder="0730123456"
            dense
          />
        )}

        {selectedPaymentMethod === 'spenn' && (
          <TextInput
            label="Email cyangwa telefoni ya SPENN"
            value={paymentDetails.spennAccount}
            onChangeText={(text) => setPaymentDetails(prev => ({ ...prev, spennAccount: text }))}
            style={styles.input}
            mode="outlined"
            dense
          />
        )}

        {selectedPaymentMethod === 'mtn_momo' && (
          <Surface style={styles.momoInfo} elevation={1}>
            <Text style={styles.momoInfoText}>
              🎉 Hitamo "Ishyura" kugira ngo ukomeze ubwishyu bwa MTN MoMo
            </Text>
            <Text style={styles.momoInfoSubtext}>
              Uzashyirwa nimero yawe ya telefoni na PIN mu buryo bwizeye
            </Text>
          </Surface>
        )}

        {selectedPaymentMethod === 'card' && (
          <Surface style={styles.cardInfo} elevation={1}>
            <Text style={styles.cardInfoText}>
              🎉 Hitamo "Ishyura" kugira ngo ukomeze ubwishyu bwa Stripe
            </Text>
            <Text style={styles.cardInfoSubtext}>
              Uzajya kuri Stripe Checkout kugira ngo ujye kwishyura ukoresheje ikarita yawe
            </Text>
          </Surface>
        )}

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setStep(1)}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
            accessible={true}
            accessibilityLabel="Subira inyuma"
            accessibilityHint="Kanda kugira ngo usubirire ku hitamo iminsi"
          >
            Subira inyuma
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              if (!selectedPaymentMethod) {
                Alert.alert('Ikosa', 'Nyamuneka hitamo uburyo bwo kwishyura.')
                return
              }
              setStep(2)
            }}
            style={styles.continueButton}
            contentStyle={styles.buttonContent}
            disabled={!selectedPaymentMethod}
            accessible={true}
            accessibilityLabel="Komeza kuri emeza amakuru"
            accessibilityHint="Kanda kugira ngo ukomeze kuri emeza amakuru y'ubwishyu"
          >
            Komeza
          </Button>
        </View>
      </Card.Content>
    </Card>
  )

  const renderConfirmStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#667eea" />
          <Text variant="titleMedium" style={styles.stepTitle}>
            Emeza Amakuru
          </Text>
        </View>

        <Surface style={styles.confirmationCard} elevation={1}>
          <Text variant="titleSmall" style={styles.propertyName}>
            {property.izina}
          </Text>
          <Text variant="bodySmall" style={styles.propertyLocation}>
            {property.aho} • {property.ubwoko}
          </Text>
          
          <Divider style={styles.divider} />
          
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Itariki yo kwinjira:</Text>
            <Text style={styles.confirmationValue}>{checkInDate}</Text>
          </View>
          
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Itariki yo gusohokamo:</Text>
            <Text style={styles.confirmationValue}>{checkOutDate}</Text>
          </View>
          
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Uburyo bwo kwishyura:</Text>
            <Text style={styles.confirmationValue}>
              {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
            </Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.confirmationRow}>
            <Text style={styles.totalLabel}>Igiciro cyose:</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateTotalCost())}</Text>
          </View>
        </Surface>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setStep(1)}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
          >
            Subira inyuma
          </Button>
          <Button
            mode="contained"
            onPress={handlePaymentSubmit}
            style={[
              styles.payButton,
              (isProcessing || isSuccess) && styles.payButtonDisabled
            ]}
            contentStyle={styles.buttonContent}
            disabled={isProcessing || isSuccess}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : isSuccess ? (
              <Ionicons name="checkmark" size={20} color="white" />
            ) : (
              <Ionicons name="card" size={20} color="white" />
            )}
            {isProcessing ? 'Birimo...' : isSuccess ? 'Byagenze neza!' : 'Ishyura'}
          </Button>
        </View>
      </Card.Content>
    </Card>
  )

  const renderSuccessStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text variant="titleMedium" style={styles.stepTitle}>
            Kwishyura Byagenze Neza
          </Text>
        </View>

        <Surface style={styles.confirmationCard} elevation={1}>
          <Text variant="titleSmall" style={styles.propertyName}>
            {property.izina}
          </Text>
          <Text variant="bodySmall" style={styles.propertyLocation}>
            {property.aho} • {property.ubwoko}
          </Text>

          <Divider style={styles.divider} />

          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Itariki yo kwinjira:</Text>
            <Text style={styles.confirmationValue}>{checkInDate}</Text>
          </View>

          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Itariki yo gusohokamo:</Text>
            <Text style={styles.confirmationValue}>{checkOutDate}</Text>
          </View>

          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Uburyo bwo kwishyura:</Text>
            <Text style={styles.confirmationValue}>
              {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
            </Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.confirmationRow}>
            <Text style={styles.totalLabel}>Igiciro cyose:</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateTotalCost())}</Text>
          </View>

          {successRef && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>Reference:</Text>
                <Text style={styles.confirmationValue}>{successRef}</Text>
              </View>
            </>
          )}
        </Surface>

        <View style={styles.buttonRow}>
          <Button
            mode="contained"
            onPress={onClose}
            style={styles.payButton}
            contentStyle={styles.buttonContent}
          >
            Byiza
          </Button>
        </View>
      </Card.Content>
    </Card>
  )

  const renderCurrentStep = () => {
    switch (step) {
      case 0:
        return renderDatesStep()
      case 1:
        return renderPaymentStep()
      case 2:
        return isSuccess ? renderSuccessStep() : renderConfirmStep()
      default:
        return renderDatesStep()
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Header */}
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <IconButton
                  icon="close"
                  iconColor="white"
                  size={24}
                  onPress={onClose}
                />
                <Text variant="titleLarge" style={styles.headerTitle}>
                  Gufata Inzu
                </Text>
                <View style={{ width: 48 }} />
              </View>
            </LinearGradient>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {renderCurrentStep()}
                         </ScrollView>
           </View>
         </TouchableWithoutFeedback>
       </KeyboardAvoidingView>

       {/* Payment Processor */}
                <PaymentProcessor
           visible={paymentProcessorVisible}
           onClose={() => setPaymentProcessorVisible(false)}
           onSuccess={handlePaymentSuccess}
           onError={handlePaymentError}
           amount={calculateTotalCost()}
           propertyName={property.izina}
           paymentMethod={selectedPaymentMethod || ''}
            userPhone={selectedPaymentMethod === 'airtel_money' ? paymentDetails.airtelPhone : userDetails.phone}
         />

         {/* Date Pickers */}
         <DatePicker
           visible={checkInDatePickerVisible}
           onClose={() => setCheckInDatePickerVisible(false)}
           onDateSelect={setCheckInDate}
           title="Itariki yo kwinjira"
           minDate={new Date().toISOString().split('T')[0]}
         />

         <DatePicker
           visible={checkOutDatePickerVisible}
           onClose={() => setCheckOutDatePickerVisible(false)}
           onDateSelect={setCheckOutDate}
           title="Itariki yo gusohokamo"
           minDate={checkInDate || new Date().toISOString().split('T')[0]}
         />
       </Modal>
     )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold'
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepActive: {
    backgroundColor: '#667eea'
  },
  stepInactive: {
    backgroundColor: '#e5e7eb'
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  stepNumberActive: {
    color: 'white'
  },
  stepNumberInactive: {
    color: '#6b7280'
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8
  },
  stepLineActive: {
    backgroundColor: '#667eea'
  },
  stepLineInactive: {
    backgroundColor: '#e5e7eb'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40
  },
  stepCard: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    elevation: 2,
    borderRadius: 12
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  stepTitle: {
    marginLeft: 12,
    fontWeight: 'bold',
    color: '#374151'
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db'
  },
  continueButton: {
    marginTop: 8,
    backgroundColor: '#667eea'
  },
  buttonContent: {
    height: 48
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  backButton: {
    flex: 1,
    marginRight: 8
  },
  payButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#667eea'
  },
  payButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  priceSummary: {
    padding: 16,
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f0f9ff'
  },
  summaryLabel: {
    color: '#0369a1',
    marginBottom: 4
  },
  divider: {
    marginVertical: 8
  },
  totalPrice: {
    color: '#1e40af',
    fontWeight: 'bold'
  },
  paymentMethodsContainer: {
    maxHeight: 300
  },
  paymentMethodCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  paymentMethodSelected: {
    borderColor: '#667eea',
    borderWidth: 2
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12
  },
  paymentMethodName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151'
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  momoInfo: {
    padding: 16,
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fef3c7'
  },
  momoInfoText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 4
  },
  momoInfoSubtext: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center'
  },
  cardInfo: {
    padding: 16,
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: '#dbeafe'
  },
  cardInfoText: {
    fontSize: 14,
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 4
  },
  cardInfoSubtext: {
    fontSize: 12,
    color: '#1e40af',
    textAlign: 'center'
  },
  confirmationCard: {
    padding: 16,
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  propertyName: {
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4
  },
  propertyLocation: {
    color: '#6b7280',
    marginBottom: 12
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  confirmationLabel: {
    color: '#6b7280',
    fontSize: 14
  },
  confirmationValue: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500'
  },
  totalLabel: {
    color: '#1e40af',
    fontSize: 16,
    fontWeight: 'bold'
  },
  totalValue: {
    color: '#1e40af',
    fontSize: 16,
    fontWeight: 'bold'
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#ffffff'
  },
  dateInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  dateInputText: {
    flex: 1,
    marginLeft: 12
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
    fontWeight: '500'
  },
  dateInputValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500'
  }
}) 