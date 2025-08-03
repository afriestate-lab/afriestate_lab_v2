import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native'
import { Text, Button, Card, ActivityIndicator } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AddPropertyForm from './add-property-form'
import AddTenantForm from './add-tenant-form'
import AddManagerForm from './add-manager-form'
import AddPaymentForm from './add-payment-form'
import AddCatalogForm from './add-catalog-form'

interface AddActionModalProps {
  visible: boolean
  onClose: () => void
  userRole: string
  initialAction?: 'property' | 'tenant' | 'manager' | 'payment' | 'catalog' | null
}

type ActionType = 'property' | 'tenant' | 'manager' | 'payment' | 'catalog' | null

interface ActionItem {
  id: string
  title: string
  subtitle: string
  icon: string
  color: string
  gradient: string[]
  roles?: string[]
}

export default function AddActionModal({ visible, onClose, userRole, initialAction }: AddActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>(null)

  // Set initial action when modal becomes visible
  useEffect(() => {
    if (visible && initialAction) {
      setSelectedAction(initialAction)
    } else if (!visible) {
      setSelectedAction(null)
    }
  }, [visible, initialAction])

  const allActions: ActionItem[] = [
    {
      id: 'property',
      title: 'Ongeraho Inyubako',
      subtitle: 'Shyiraho inyubako nshya',
      icon: 'home',
      color: '#4F46E5',
      gradient: ['#4F46E5', '#7C3AED'],
      roles: ['landlord', 'admin']
    },
    {
      id: 'tenant',
      title: 'Ongeraho Umukodesha',
      subtitle: 'Ongeraho umukodesha mushya',
      icon: 'person',
      color: '#059669',
      gradient: ['#059669', '#0891B2'],
      roles: ['landlord', 'manager', 'admin']
    },
    {
      id: 'manager',
      title: 'Ongeraho Umuyobozi',
      subtitle: 'Tuma ubutumwa bwo gutumira umuyobozi',
      icon: 'people',
      color: '#DC2626',
      gradient: ['#DC2626', '#EA580C'],
      roles: ['landlord', 'admin']
    },
    {
      id: 'payment',
      title: 'Ongeraho Ubwishyu',
      subtitle: 'Andika ubwishyu bwatanzwe',
      icon: 'card',
      color: '#7C2D12',
      gradient: ['#7C2D12', '#A16207'],
      roles: ['landlord', 'manager', 'admin']
    },
    {
      id: 'catalog',
      title: 'Ongeraho Katalogo',
      subtitle: 'Ongeraho ibintu byo kunywa, kurya na serivisi',
      icon: 'cube',
      color: '#EC4899',
      gradient: ['#EC4899', '#F59E0B'],
      roles: ['landlord', 'manager', 'admin']
    }
  ]

  // Filter actions based on user role
  const actions = allActions.filter(action => {
    if (!action.roles) return true
    return action.roles.includes(userRole)
  })

  const handleActionSelect = (actionId: string) => {
    setSelectedAction(actionId as ActionType)
  }

  const handleBack = () => {
    if (selectedAction) {
      setSelectedAction(null)
    } else {
      onClose()
    }
  }

  const handleFormSuccess = () => {
    setSelectedAction(null)
    onClose()
    Alert.alert('Byagenze neza!', 'Ibyo wasabye byakoreshejwe neza.')
  }

  const renderActionSelector = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Hitamo icyo ushaka kongeraho</Text>
      </View>

      <View style={styles.actionsContainer}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            onPress={() => handleActionSelect(action.id)}
            style={styles.actionItem}
          >
            <View style={[styles.actionGradient, { backgroundColor: action.color }]}>
              <View style={styles.actionContent}>
                <View style={styles.actionIcon}>
                  <Ionicons name={action.icon as any} size={32} color="white" />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Hitamo kimwe muri ibi bikurikira kugira ngo ubashe gukoresha sisitemu yacu
        </Text>
      </View>
    </SafeAreaView>
  )

  const renderForm = () => {
    switch (selectedAction) {
      case 'property':
        return (
          <AddPropertyForm
            onBack={handleBack}
            onSuccess={handleFormSuccess}
          />
        )
      case 'tenant':
        return (
          <AddTenantForm
            onBack={handleBack}
            onSuccess={handleFormSuccess}
          />
        )
      case 'manager':
        return (
          <AddManagerForm
            onBack={handleBack}
            onSuccess={handleFormSuccess}
          />
        )
      case 'payment':
        return (
          <AddPaymentForm
            onBack={handleBack}
            onSuccess={handleFormSuccess}
          />
        )
      case 'catalog':
        return (
          <AddCatalogForm
            onBack={handleBack}
            onSuccess={handleFormSuccess}
          />
        )
      default:
        return renderActionSelector()
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleBack}
    >
      {renderForm()}
    </Modal>
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
    justifyContent: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    top: 10,
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  actionsContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  actionItem: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionGradient: {
    padding: 20,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
}) 