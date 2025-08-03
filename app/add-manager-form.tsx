import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { API_ENDPOINTS, config } from '@/config'

interface AddManagerFormProps {
  onBack: () => void
  onSuccess: () => void
}

interface Property {
  id: string
  name: string
  address: string
}

export default function AddManagerForm({ onBack, onSuccess }: AddManagerFormProps) {
  const [loading, setLoading] = useState(false)
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [formData, setFormData] = useState({
    full_name: '',
    id_number: '',
    email: '',
    property_id: ''
  })
  
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true)
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        Alert.alert('Ikosa', 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.')
        return
      }

      // Fetch properties owned by current user
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name, address')
        .eq('landlord_id', user.id)
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('name')

      if (propertiesError) {
        console.error('Properties fetch error:', propertiesError)
        Alert.alert('Ikosa', 'Ntiyashoboye gushaka inyubako zawe.')
        return
      }

      setProperties(propertiesData || [])

    } catch (error) {
      console.error('Error fetching properties:', error)
      Alert.alert('Ikosa', 'Habaye ikosa mu gushaka inyubako.')
    } finally {
      setLoadingProperties(false)
    }
  }

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Ikosa', 'Andika amazina yuzuye')
      return false
    }
    
    if (!formData.id_number.trim()) {
      Alert.alert('Ikosa', 'Andika nomero y\'indangamuntu')
      return false
    }

    if (!formData.email.trim()) {
      Alert.alert('Ikosa', 'Andika aderesi ya imeri')
      return false
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Ikosa', 'Andika aderesi ya imeri nyayo')
      return false
    }

    if (!formData.property_id) {
      Alert.alert('Ikosa', 'Hitamo inyubako azayobora')
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

      // Call the manager invitation API using the models endpoint
      const inviteData = {
        fullName: formData.full_name.trim(),
        idNumber: formData.id_number.trim(),
        email: formData.email.trim(),
        propertyId: formData.property_id,
        landlordId: user.id
      }

      console.log('Sending invitation to:', API_ENDPOINTS.SEND_MANAGER_INVITATION)
      console.log('Invitation data:', inviteData)

      const response = await fetch(API_ENDPOINTS.SEND_MANAGER_INVITATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteData),
      })

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const result = await response.json()

      Alert.alert(
        'Byagenze neza!', 
        `Ubutumwa bwo gutumira bwoherejwe kuri ${formData.email}. Umuyobozi azakira imeli hamwe na PIN yo kwinjira muri sisitemu.`
      )
      onSuccess()

    } catch (error: any) {
      console.error('Error inviting manager:', error)
      Alert.alert('Ikosa', error.message || 'Habaye ikosa mu gutumira umuyobozi. Ongera ugerageze.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingProperties) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Kuraguza inyubako...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (properties.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#DC2626" />
          </TouchableOpacity>
          <Text style={styles.title}>Ongeraho Umuyobozi</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Nta nyubako ufite</Text>
          <Text style={styles.emptySubtext}>Mbanza urondore inyubako mbere yo gutumira abayobozi</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#DC2626" />
        </TouchableOpacity>
        <Text style={styles.title}>Ongeraho Umuyobozi</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Amakuru y\'umuyobozi</Text>
            <Text style={styles.subtitle}>
              Uzana ubutumwa bwo gutumira umuyobozi. Azakira imeli hamwe na PIN yo kwinjira muri sisitemu.
            </Text>
            
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
              <Text style={styles.label}>Nomero y\'indangamuntu *</Text>
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
              <Text style={styles.label}>Aderesi ya imeri *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="manager@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>



            <View style={styles.inputGroup}>
              <Text style={styles.label}>Inyubako azayobora *</Text>
              <View style={styles.propertySelector}>
                {properties.map((property) => (
                  <TouchableOpacity
                    key={property.id}
                    style={[
                      styles.propertyOption,
                      formData.property_id === property.id && styles.propertyOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, property_id: property.id })}
                  >
                    <View style={styles.radioCircle}>
                      {formData.property_id === property.id && <View style={styles.radioSelected} />}
                    </View>
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyName}>{property.name}</Text>
                      <Text style={styles.propertyAddress}>{property.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={24} color="#2563EB" />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Icyitonderwa</Text>
                <Text style={styles.infoDescription}>
                  Umuyobozi azakira imeri hamwe na PIN yo kwinjira. Agomba gukoresha iyi PIN kugira ngo ashobore kwinjira muri sisitemu nk\'umuyobozi w\'inyubako yawe.
                </Text>
              </View>
            </View>
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
            {loading ? 'Kohereza ubutumwa...' : 'Tuma ubutumwa bwo gutumira'}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
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
  propertySelector: {
    gap: 12,
  },
  propertyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  propertyOptionSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  propertyAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  submitContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}) 