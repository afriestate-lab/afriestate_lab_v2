import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native'
import { Text, Button, Card, ActivityIndicator } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useTheme } from './_layout'
import LeaseExtensionFlow from './components/LeaseExtensionFlow'

interface TenantActionModalProps {
  visible: boolean
  onClose: () => void
  userRole: string
}

type ActionType = 'extend_time' | 'view_menu' | null

interface ConsumableItem {
  id: string
  name: string
  description: string
  category: string
  unit_price: number
  unit_type: string
  is_available: boolean
  property_id: string
  property_name?: string
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
}

export default function TenantActionModal({ visible, onClose, userRole }: TenantActionModalProps) {
  const { theme } = useTheme()
  const [selectedAction, setSelectedAction] = useState<ActionType>(null)
  const [consumableItems, setConsumableItems] = useState<ConsumableItem[]>([])
  const [currentLease, setCurrentLease] = useState<CurrentLease | null>(null)
  const [loading, setLoading] = useState(false)
  const [showExtensionFlow, setShowExtensionFlow] = useState(false)

  useEffect(() => {
    if (visible && userRole === 'tenant') {
      loadTenantData()
    }
  }, [visible, userRole])

  const loadTenantData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get tenant profile
      const { data: tenantProfile } = await supabase
        .from('tenants')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!tenantProfile) return

      // Get current lease
      const { data: leaseData } = await supabase
        .from('leases')
        .select(`
          *,
          rooms!inner (
            room_number,
            properties!inner (
              name
            )
          )
        `)
        .eq('tenant_id', tenantProfile.id)
        .eq('status', 'active')
        .single()

      if (leaseData) {
        setCurrentLease({
          ...leaseData,
          property_name: (leaseData.rooms as any).properties.name,
          room_number: (leaseData.rooms as any).room_number
        })
      }

      // Get consumable items for the property
      if (leaseData) {
        const { data: consumablesData } = await supabase
          .from('consumables_catalog')
          .select('*')
          .eq('property_id', leaseData.rooms.property_id)
          .eq('is_available', true)
          .order('category')
          .order('name')

        if (consumablesData) {
          setConsumableItems(consumablesData)
        }
      }
    } catch (error) {
      console.error('Error loading tenant data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActionSelect = (actionId: string) => {
    if (actionId === 'extend_time') {
      setShowExtensionFlow(true)
    } else {
      setSelectedAction(actionId as ActionType)
    }
  }

  const handleBack = () => {
    if (selectedAction) {
      setSelectedAction(null)
    } else {
      onClose()
    }
  }

  const handleExtensionFlowClose = () => {
    setShowExtensionFlow(false)
    setSelectedAction(null)
  }

  const handleExtensionFlowSuccess = () => {
    setShowExtensionFlow(false)
    setSelectedAction(null)
    onClose()
  }

  const renderActionSelector = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Hitamo icyo ushaka kongeraho</Text>
      </View>

      <ScrollView style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={() => handleActionSelect('extend_time')}
          style={[styles.actionItem, { backgroundColor: theme.surface }]}
        >
          <View style={styles.actionContent}>
            <View style={[styles.actionIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="time" size={32} color="white" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Kongera igihe</Text>
              <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                Saba kongerwa igihe cyo gukodesha
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleActionSelect('view_menu')}
          style={[styles.actionItem, { backgroundColor: theme.surface }]}
        >
          <View style={styles.actionContent}>
            <View style={[styles.actionIcon, { backgroundColor: '#059669' }]}>
              <Ionicons name="restaurant" size={32} color="white" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Menu available</Text>
              <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                Reba ibintu byose byo kunywa, kurya na serivisi
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )



  const renderMenuView = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Menu available</Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Birakora...
            </Text>
          </View>
        ) : consumableItems.length > 0 ? (
          <View>
            {['food', 'drink', 'amenity', 'service', 'other'].map(category => {
              const categoryItems = consumableItems.filter(item => item.category === category)
              if (categoryItems.length === 0) return null

              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>
                    {category === 'food' ? 'Ibintu byo kurya' :
                     category === 'drink' ? 'Ibintu byo kunywa' :
                     category === 'amenity' ? 'Serivisi' :
                     category === 'service' ? 'Serivisi zindi' : 'Ibindi'}
                  </Text>
                  {categoryItems.map(item => (
                    <Card key={item.id} style={[styles.menuItem, { backgroundColor: theme.surface }]}>
                      <Card.Content>
                        <View style={styles.menuItemContent}>
                          <View style={styles.menuItemInfo}>
                            <Text style={[styles.menuItemName, { color: theme.text }]}>
                              {item.name}
                            </Text>
                            {item.description && (
                              <Text style={[styles.menuItemDescription, { color: theme.textSecondary }]}>
                                {item.description}
                              </Text>
                            )}
                          </View>
                          <View style={styles.menuItemPrice}>
                            <Text style={[styles.priceText, { color: theme.primary }]}>
                              {item.unit_price.toLocaleString()} RWF
                            </Text>
                            <Text style={[styles.unitText, { color: theme.textTertiary }]}>
                              per {item.unit_type}
                            </Text>
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              )
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nta menu iboneka kuri iki gihe
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )

  const renderContent = () => {
    switch (selectedAction) {
      case 'view_menu':
        return renderMenuView()
      default:
        return renderActionSelector()
    }
  }

  return (
    <>
      <Modal
        visible={visible && !showExtensionFlow}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleBack}
      >
        {renderContent()}
      </Modal>
      
      <LeaseExtensionFlow
        visible={showExtensionFlow}
        onClose={handleExtensionFlowClose}
        onSuccess={handleExtensionFlowSuccess}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
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
    textAlign: 'center',
  },
  actionsContainer: {
    flex: 1,
    padding: 20,
  },
  actionItem: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  menuContainer: {
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
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  menuItem: {
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
  },
  menuItemPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  unitText: {
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
}) 