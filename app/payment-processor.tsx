import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Modal,
  Alert,
  Linking,
  Platform,
  Dimensions
} from 'react-native'
import {
  Text,
  Button,
  Surface,
  TextInput,
  ActivityIndicator,
  IconButton,
  useTheme
} from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

interface PaymentProcessorProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (error: string) => void
  amount: number
  propertyName: string
  paymentMethod: string
  userPhone?: string
}

interface PaymentState {
  step: 'processing' | 'success' | 'error'
  message: string
  transactionId?: string
}

export default function PaymentProcessor({
  visible,
  onClose,
  onSuccess,
  onError,
  amount,
  propertyName,
  paymentMethod,
  userPhone
}: PaymentProcessorProps) {
  const theme = useTheme()
  const [paymentState, setPaymentState] = useState<PaymentState>({
    step: 'processing',
    message: 'Gutegura ubwishyu...'
  })
  const [phoneNumber, setPhoneNumber] = useState(userPhone || '')

  useEffect(() => {
    if (visible) {
      setPaymentState({
        step: 'processing',
        message: 'Gutegura ubwishyu...'
      })
      setPhoneNumber(userPhone || '')
      processPayment()
    }
  }, [visible, paymentMethod])

  const processPayment = async () => {
    try {
      console.log('🚀 [MOBILE_PAYMENT_SIMULATION] Processing payment:', {
        method: paymentMethod,
        amount,
        property: propertyName
      })

      // SIMULATION MODE: All payment methods are processed as successful
      switch (paymentMethod) {
        case 'mtn_momo':
          await processMTNMoMo()
          break
        case 'airtel_money':
          await processAirtelMoney()
          break
        case 'card':
          await processCardPayment()
          break
        case 'bank_transfer':
          await processBankTransfer()
          break
        case 'cash':
          await processCashPayment()
          break
        default:
          throw new Error('Uburyo bw\'kwishyura budasubirwaho')
      }
    } catch (error) {
      console.error('❌ [MOBILE_PAYMENT_SIMULATION] Payment error:', error)
      setPaymentState({
        step: 'error',
        message: error instanceof Error ? error.message : 'Habaye ikosa mu gukora ubwishyu'
      })
    }
  }



  const processMTNMoMo = async () => {
    setPaymentState({
      step: 'processing',
      message: 'Gukora ubwishyu na MTN Mobile Money...'
    })

    // Validate phone number
    if (!phoneNumber.trim()) {
      throw new Error('Uzuza nimero ya telefoni ya MTN')
    }

    setPaymentState({
      step: 'processing',
      message: 'Kohereza *182*7*1# hanyuma ukurikire amabwiriza'
    })

    // SIMULATION MODE: Simulate USSD prompt and processing
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setPaymentState({
      step: 'processing',
      message: 'Tegereza ubwishyu bwemezwe...'
    })

    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const transactionId = `SIM-MTN-${Date.now()}`
    setPaymentState({
      step: 'success',
      message: 'Ubwishyu bwa MTN MoMo bwemezwe! (Simulation)',
      transactionId
    })
    
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  const processAirtelMoney = async () => {
    if (!phoneNumber.trim()) {
      throw new Error('Uzuza nimero ya telefoni ya Airtel')
    }

    setPaymentState({
      step: 'processing',
      message: 'Gukora ubwishyu na Airtel Money...'
    })

    setPaymentState({
      step: 'processing',
      message: 'Kohereza *185*1# hanyuma ukurikire amabwiriza'
    })

    // SIMULATION MODE: Simulate processing
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setPaymentState({
      step: 'processing',
      message: 'Tegereza ubwishyu bwemezwe...'
    })

    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const transactionId = `SIM-AIRTEL-${Date.now()}`
    setPaymentState({
      step: 'success',
      message: 'Ubwishyu bwa Airtel Money bwemezwe! (Simulation)',
      transactionId
    })
    
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  const processCardPayment = async () => {
    setPaymentState({
      step: 'processing',
      message: 'Gukora ubwishyu na ikarita ya banki...'
    })

    // SIMULATION MODE: Simulate card processing
    console.log('🎯 [MOBILE_PAYMENT_SIMULATION] Simulating card payment')
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setPaymentState({
      step: 'processing',
      message: 'Gutegura ikarita ya banki...'
    })
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setPaymentState({
      step: 'processing',
      message: 'Tegereza ubwishyu bwemezwe...'
    })
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const transactionId = `SIM-CARD-${Date.now()}`
    setPaymentState({
      step: 'success',
      message: 'Ubwishyu bwa ikarita ya banki bwemezwe! (Simulation)',
      transactionId
    })
    
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  const processBankTransfer = async () => {
    setPaymentState({
      step: 'processing',
      message: 'Gukora ubwishyu na banki...'
    })

    setPaymentState({
      step: 'processing',
      message: 'Gufungura urubuga rwa banki...'
    })

    // SIMULATION MODE: Simulate bank transfer
    console.log('🎯 [MOBILE_PAYMENT_SIMULATION] Simulating bank transfer')
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setPaymentState({
      step: 'processing',
      message: 'Tegereza ubwishyu bwemezwe...'
    })
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const transactionId = `SIM-BANK-${Date.now()}`
    setPaymentState({
      step: 'success',
      message: 'Ubwishyu bwa banki bwemezwe! (Simulation)',
      transactionId
    })
    
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  const processCashPayment = async () => {
    setPaymentState({
      step: 'processing',
      message: 'Kwemeza ubwishyu bwa cash...'
    })

    // SIMULATION MODE: Simulate cash payment confirmation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const transactionId = `SIM-CASH-${Date.now()}`
    setPaymentState({
      step: 'success',
      message: 'Ubusabe bwemejwe! Uzishyura mu ntoki igihe ugera aho utura. (Simulation)',
      transactionId
    })
    
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} RWF`
  }

  const getPaymentMethodInfo = () => {
    switch (paymentMethod) {
      case 'mtn_momo':
        return {
          name: 'MTN Mobile Money',
          icon: '📱',
          color: '#ffd700'
        }
      case 'airtel_money':
        return {
          name: 'Airtel Money',
          icon: '📱',
          color: '#ff0000'
        }
      case 'card':
        return {
          name: 'Ikarita ya Banki',
          icon: '💳',
          color: '#0066cc'
        }
      case 'bank_transfer':
        return {
          name: 'Amabanki',
          icon: '🏦',
          color: '#9333ea'
        }
      case 'cash':
        return {
          name: 'Amafaranga mu ntoki',
          icon: '💰',
          color: '#00aa00'
        }
      default:
        return {
          name: 'Uburyo bwo kwishyura',
          icon: '💳',
          color: '#667eea'
        }
    }
  }

  const renderProcessingStep = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color="#667eea" style={styles.loader} />
      <Text style={styles.stepTitle}>Gukora ubwishyu...</Text>
      <Text style={styles.stepMessage}>{paymentState.message}</Text>
      
      {(paymentMethod === 'airtel_money' || paymentMethod === 'mtn_momo') && (
        <View style={styles.phoneInputContainer}>
          <TextInput
            label={`Nimero ya ${paymentMethod === 'mtn_momo' ? 'MTN' : 'Airtel'}`}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            style={styles.phoneInput}
            mode="outlined"
            keyboardType="phone-pad"
            placeholder={paymentMethod === 'mtn_momo' ? '0780123456' : '0730123456'}
            dense
          />
        </View>
      )}
    </View>
  )

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color="#10b981" />
      </View>
      <Text style={styles.stepTitle}>Ubwishyu bwemezwe!</Text>
      <Text style={styles.stepMessage}>{paymentState.message}</Text>
      
      {paymentState.transactionId && (
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionLabel}>Nimero y&apos;ubwishyu:</Text>
          <Text style={styles.transactionId}>{paymentState.transactionId}</Text>
        </View>
      )}
    </View>
  )

  const renderErrorStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.errorIcon}>
        <Ionicons name="close-circle" size={80} color="#ef4444" />
      </View>
      <Text style={styles.stepTitle}>Ubwishyu ntibwashobaye</Text>
      <Text style={styles.stepMessage}>{paymentState.message}</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => {
            setPaymentState({
              step: 'processing',
              message: 'Gutegura ubwishyu...'
            })
            processPayment()
          }}
          style={styles.retryButton}
        >
          Gerageza ukurisubiza
        </Button>
        <Button
          mode="contained"
          onPress={onClose}
          style={styles.closeButton}
        >
          Funga
        </Button>
      </View>
    </View>
  )

  const renderCurrentStep = () => {
    switch (paymentState.step) {
      case 'processing':
        return renderProcessingStep()
      case 'success':
        return renderSuccessStep()
      case 'error':
        return renderErrorStep()
      default:
        return renderProcessingStep()
    }
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
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
              Ubwishyu
            </Text>
            <View style={{ width: 48 }} />
          </View>
        </LinearGradient>

        {/* Payment Info */}
        <Surface style={styles.paymentInfo} elevation={1}>
          <View style={styles.paymentMethodRow}>
            <Text style={styles.paymentMethodIcon}>
              {getPaymentMethodInfo().icon}
            </Text>
            <Text style={styles.paymentMethodName}>
              {getPaymentMethodInfo().name}
            </Text>
          </View>
          
          <Text style={styles.propertyName}>{propertyName}</Text>
          <Text style={styles.amount}>{formatCurrency(amount)}</Text>
        </Surface>

        {/* Payment Step */}
        {renderCurrentStep()}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold'
  },
  paymentInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white'
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  },
  propertyName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loader: {
    marginBottom: 20
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center'
  },
  stepMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24
  },
  phoneInputContainer: {
    width: '100%',
    marginTop: 20
  },
  phoneInput: {
    backgroundColor: 'white'
  },
  successIcon: {
    marginBottom: 20
  },
  errorIcon: {
    marginBottom: 20
  },
  transactionDetails: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center'
  },
  transactionLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4
  },
  transactionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12
  },
  retryButton: {
    flex: 1
  },
  closeButton: {
    flex: 1
  }
}) 