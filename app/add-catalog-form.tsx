import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Text, Button, Card, TextInput, SegmentedButtons, Checkbox, ActivityIndicator } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../src/lib/supabase'

interface AddCatalogFormProps {
  onBack: () => void
  onSuccess: () => void
}

interface Property {
  id: string
  name: string
  address: string
}

interface CatalogItem {
  id: string
  name: string
  category: 'drink' | 'food' | 'amenity' | 'service' | 'other'
  unit_price: string
  unit_type: string
  is_available: boolean
  property_id: string
}

export default function AddCatalogForm({ onBack, onSuccess }: AddCatalogFormProps) {
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [items, setItems] = useState<CatalogItem[]>([
    {
      id: '1',
      name: '',
      category: 'drink',
      unit_price: '',
      unit_type: 'piece',
      is_available: true,
      property_id: ''
    }
  ])

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        Alert.alert('Ikosa', 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.')
        return
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        Alert.alert('Ikosa', 'Ntiwashoboye kubona amakuru yawe.')
        return
      }

      let propertiesData: any[] = []

      if (profile.role === 'landlord') {
        // Get properties owned by landlord using RPC to avoid RLS recursion
        const { data, error } = await supabase
          .rpc('get_landlord_properties', {
            p_landlord_id: profile.id
          })

        if (error) throw error
        propertiesData = data || []
      } else if (profile.role === 'manager') {
        // Get properties assigned to manager using RPC to avoid RLS recursion
        const { data, error: assignmentError } = await supabase
          .rpc('get_manager_properties', {
            p_manager_id: profile.id
          })

        if (assignmentError) throw assignmentError
        propertiesData = data || []
      } else if (profile.role === 'admin') {
        // Admin can see all properties - use a safe admin RPC if available
        const { data, error } = await supabase
          .rpc('get_all_properties_admin')

        if (error) {
          // Fallback to direct query for admin only
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('properties')
            .select('id, name, address')
            .is('deleted_at', null)
            .order('name')
          
          if (fallbackError) throw fallbackError
          propertiesData = fallbackData || []
        } else {
          propertiesData = data || []
        }
      }

      setProperties(propertiesData)
      if (propertiesData.length > 0) {
        setItems(prev => prev.map(item => ({ ...item, property_id: propertiesData[0].id })))
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      Alert.alert('Ikosa', 'Ntiwashoboye kubona inyubako')
    }
  }

  const validateForm = () => {
    // Check if at least one item has data
    const validItems = items.filter(item => 
      item.name.trim() && 
      item.property_id && 
      item.unit_price && 
      parseFloat(item.unit_price) > 0
    )

    if (validItems.length === 0) {
      Alert.alert('Ikosa', 'Ongeraho ibintu by\'umubare mu buryo bwemewe')
      return false
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.name.trim() && (!item.property_id || !item.unit_price || parseFloat(item.unit_price) <= 0)) {
        Alert.alert('Ikosa', `Ibintu ${i + 1}: Injiza amakuru yose yemewe`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        Alert.alert('Ikosa', 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.')
        return
      }

      console.log('Current user:', user)

      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError)
        Alert.alert('Ikosa', 'Ntiwashoboye kubona amakuru yawe.')
        return
      }

      console.log('User profile:', profile)
      console.log('User role:', profile.role)

      // Filter valid items and prepare for insertion
      const validItems = items.filter(item => 
        item.name.trim() && 
        item.property_id && 
        item.unit_price && 
        parseFloat(item.unit_price) > 0
      )

      console.log('All items:', items)
      console.log('Valid items:', validItems)

      if (validItems.length === 0) {
        Alert.alert('Ikosa', 'Nta bintu byemewe byabonetse')
        return
      }

      // Prepare data for insertion
      const itemsToInsert = validItems.map(item => ({
        name: item.name.trim(),
        category: item.category,
        unit_price: parseFloat(item.unit_price),
        unit_type: item.unit_type,
        is_available: item.is_available,
        property_id: item.property_id,
        description: '' // Default empty description
      }))

      console.log('Items to insert:', itemsToInsert)
      console.log('Number of items:', itemsToInsert.length)

      // First, let's check if the table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('consumables_catalog')
        .select('id')
        .limit(1)

      console.log('Table check - data:', tableCheck)
      console.log('Table check - error:', tableError)

      if (tableError) {
        console.error('Table does not exist or access denied:', tableError)
        Alert.alert('Ikosa', 'Katalogo ntiyashoboye kuboneka. Ongera ukinjire.')
        return
      }

      // Insert all items
      const { data, error } = await supabase
        .from('consumables_catalog')
        .insert(itemsToInsert)
        .select()

      console.log('Insert result - data:', data)
      console.log('Insert result - error:', error)

      if (error) throw error

      Alert.alert(
        'Byagenze neza!', 
        `${validItems.length} ibintu byongewe mu katalogo`, 
        [{ text: 'OK', onPress: onSuccess }]
      )
    } catch (error: any) {
      console.error('Error adding catalog items:', error)
      
      // Better error handling
      let errorMessage = 'Habaye ikosa mu kongeraho ibintu'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error) {
        errorMessage = JSON.stringify(error)
      }
      
      console.log('Full error object:', error)
      console.log('Error message:', errorMessage)
      
      Alert.alert('Ikosa', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'drink':
        return 'Ibinyobwa'
      case 'food':
        return 'Ibiryo'
      case 'amenity':
        return 'Serivisi'
      case 'service':
        return 'Serivisi'
      case 'other':
        return 'Ibindi'
      default:
        return category
    }
  }

  const addNewItem = () => {
    const newId = (items.length + 1).toString()
    setItems(prev => [...prev, {
      id: newId,
      name: '',
      category: 'drink',
      unit_price: '',
      unit_type: 'piece',
      is_available: true,
      property_id: items[0]?.property_id || ''
    }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof CatalogItem, value: any) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button onPress={onBack} mode="text" icon="arrow-left">
          Subiramo
        </Button>
        <Text style={styles.title}>Ongeraho Katalogo</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Selection - Global for all items */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.sectionTitle}>Inyubako</Text>
            <View style={styles.selectContainer}>
              {properties.map(property => (
                <Button
                  key={property.id}
                  mode={items[0]?.property_id === property.id ? 'contained' : 'outlined'}
                  onPress={() => {
                    setItems(prev => prev.map(item => ({ ...item, property_id: property.id })))
                  }}
                  style={styles.propertyButton}
                  contentStyle={styles.propertyButtonContent}
                >
                  <Text style={styles.propertyButtonText}>{property.name}</Text>
                </Button>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Items List */}
        {items.map((item, index) => (
          <Card key={item.id} style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Ibintu {index + 1}</Text>
                {items.length > 1 && (
                  <Button
                    mode="text"
                    onPress={() => removeItem(item.id)}
                    textColor="#EF4444"
                    icon="delete"
                  >
                    Subiramo
                  </Button>
                )}
              </View>

              {/* Name */}
              <TextInput
                label="Amazina y'ibintu"
                value={item.name}
                onChangeText={(text) => updateItem(item.id, 'name', text)}
                mode="outlined"
                style={styles.input}
                placeholder="Injiza amazina y'ibintu"
              />

              {/* Price */}
              <TextInput
                label="Igiciro (RWF)"
                value={item.unit_price}
                onChangeText={(text) => updateItem(item.id, 'unit_price', text)}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                placeholder="Injiza igiciro mu RWF"
              />

              {/* Category */}
              <Text style={styles.label}>Ibyiciro</Text>
              <SegmentedButtons
                value={item.category}
                onValueChange={(value) => updateItem(item.id, 'category', value)}
                buttons={[
                  { value: 'drink', label: 'Ibinyobwa' },
                  { value: 'food', label: 'Ibiryo' },
                  { value: 'amenity', label: 'Serivisi' },
                  { value: 'other', label: 'Ibindi' }
                ]}
                style={styles.segmentedButton}
              />

              {/* Unit Type */}
              <TextInput
                label="Ubwoko bw'ibintu"
                value={item.unit_type}
                onChangeText={(text) => updateItem(item.id, 'unit_type', text)}
                mode="outlined"
                style={styles.input}
                placeholder="nka: piece, bottle, plate"
              />

              {/* Available */}
              <View style={styles.checkboxContainer}>
                <Checkbox
                  status={item.is_available ? 'checked' : 'unchecked'}
                  onPress={() => updateItem(item.id, 'is_available', !item.is_available)}
                />
                <Text style={styles.checkboxLabel}>Ibintu bihari</Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        {/* Add Another Item Button */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Button
              mode="outlined"
              onPress={addNewItem}
              icon="plus"
              style={styles.addButton}
            >
              Ongeraho Ibindi Bintu
            </Button>
          </Card.Content>
        </Card>

        {/* Summary Card */}
        <Card style={styles.summaryCard} mode="outlined">
          <Card.Content>
            <Text style={styles.sectionTitle}>Icyegeranyo</Text>
            {items.map((item, index) => (
              <View key={item.id} style={styles.summaryItem}>
                <Text style={styles.summaryItemTitle}>Ibintu {index + 1}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amazina:</Text>
                  <Text style={styles.summaryValue}>{item.name || 'Nta amazina'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ibyiciro:</Text>
                  <Text style={styles.summaryValue}>{getCategoryName(item.category)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Igiciro:</Text>
                  <Text style={styles.summaryValue}>
                    {item.unit_price ? `${parseFloat(item.unit_price).toLocaleString()} RWF` : 'Nta giciro'}
                  </Text>
                </View>
              </View>
            ))}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Inyubako:</Text>
              <Text style={styles.summaryValue}>
                {properties.find(p => p.id === items[0]?.property_id)?.name || 'Nta nyubako'}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Bika Ibintu</Text>
            </>
          )}
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  card: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    backgroundColor: '#F8FAFC',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  segmentedButton: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  propertyButton: {
    marginBottom: 8,
    borderRadius: 8,
    borderColor: '#E2E8F0',
  },
  propertyButtonContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  propertyButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  addButton: {
    marginTop: 8,
    borderColor: '#EC4899',
    borderWidth: 2,
  },
  summaryItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    borderRadius: 12,
    backgroundColor: '#EC4899',
  },
  submitButtonContent: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}) 