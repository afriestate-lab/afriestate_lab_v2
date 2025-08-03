import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { 
  formatCurrency, 
  formatDate
} from '@/lib/helpers'

interface TenantRentalProperty {
  property_id: string
  property_name: string
  property_address: string
  property_city: string
  room_id: string
  room_number: string
  rent_amount: number
  billing_type: string
  room_tenant_id: string
  move_in_date: string
  move_out_date?: string
  next_due_date?: string
  is_active: boolean
}

interface RentalPropertiesSectionProps {
  tenantRecord: {id: string}
  theme: any
}

const RentalPropertiesSection: React.FC<RentalPropertiesSectionProps> = ({ tenantRecord, theme }) => {
  const [rentalProperties, setRentalProperties] = useState<TenantRentalProperty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRentalProperties()
  }, [tenantRecord.id])

  const loadRentalProperties = async () => {
    try {
      setLoading(true)
      
      const { data: propertiesData, error } = await supabase
        .from('room_tenants')
        .select(`
          id,
          room_id,
          move_in_date,
          move_out_date,
          next_due_date,
          is_active,
          rooms!inner (
            id,
            room_number,
            rent_amount,
            billing_type,
            properties!inner (
              id,
              name,
              address,
              city
            )
          )
        `)
        .eq('tenant_id', tenantRecord.id)
        .eq('is_active', true)
        .order('move_in_date', { ascending: false })

      if (error) {
        console.error('Error loading rental properties:', error)
        return
      }

      if (propertiesData) {
        const mappedProperties: TenantRentalProperty[] = propertiesData.map(item => ({
          property_id: (item.rooms as any).properties.id,
          property_name: (item.rooms as any).properties.name,
          property_address: (item.rooms as any).properties.address,
          property_city: (item.rooms as any).properties.city,
          room_id: (item.rooms as any).id,
          room_number: (item.rooms as any).room_number,
          rent_amount: (item.rooms as any).rent_amount,
          billing_type: (item.rooms as any).billing_type,
          room_tenant_id: item.id,
          move_in_date: item.move_in_date,
          move_out_date: item.move_out_date,
          next_due_date: item.next_due_date,
          is_active: item.is_active
        }))
        
        setRentalProperties(mappedProperties)
      }
    } catch (error) {
      console.error('Error loading rental properties:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        paddingVertical: 20 
      }}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={{ 
          marginLeft: 8,
          color: theme.textSecondary,
          fontSize: 14
        }}>
          Gukura amakuru...
        </Text>
      </View>
    )
  }

  if (rentalProperties.length === 0) {
    return (
      <Text style={{ 
        textAlign: 'center',
        color: theme.textSecondary,
        fontSize: 16,
        paddingVertical: 20
      }}>
        Nta nzu ukodesha
      </Text>
    )
  }

  return (
    <View>
      {rentalProperties.map((property, index) => (
        <View 
          key={`property-${property.room_tenant_id}-${index}`} 
          style={{
            backgroundColor: theme.surfaceVariant,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 1
          }}
        >
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 12
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 4
              }}>
                {property.property_name}
              </Text>
              <Text style={{
                fontSize: 14,
                color: theme.textSecondary
              }}>
                {property.property_address}, {property.property_city}
              </Text>
            </View>
            <View style={{
              backgroundColor: property.is_active ? '#10b981' : '#6b7280',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12
            }}>
              <Text style={{
                color: 'white',
                fontSize: 10,
                fontWeight: '600'
              }}>
                {property.is_active ? 'Bikora' : 'Ntibikora'}
              </Text>
            </View>
          </View>
          
          <View style={{ gap: 8 }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text style={{
                fontSize: 14,
                color: theme.textSecondary,
                flex: 1
              }}>
                Icyumba:
              </Text>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: theme.text,
                flex: 1,
                textAlign: 'right'
              }}>
                {property.room_number}
              </Text>
            </View>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text style={{
                fontSize: 14,
                color: theme.textSecondary,
                flex: 1
              }}>
                Ubukode:
              </Text>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: theme.text,
                flex: 1,
                textAlign: 'right'
              }}>
                {formatCurrency(property.rent_amount)} / {
                  property.billing_type === 'monthly' ? 'ukwezi' :
                  property.billing_type === 'daily' ? 'umunsi' :
                  property.billing_type === 'weekly' ? 'icyumweru' :
                  property.billing_type === 'per_night' ? 'nijoro' :
                  property.billing_type
                }
              </Text>
            </View>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text style={{
                fontSize: 14,
                color: theme.textSecondary,
                flex: 1
              }}>
                Winjiriyemo:
              </Text>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: theme.text,
                flex: 1,
                textAlign: 'right'
              }}>
                {formatDate(property.move_in_date)}
              </Text>
            </View>
            
            {property.next_due_date && (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Text style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  flex: 1
                }}>
                  Itariki ikurikira:
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.text,
                  flex: 1,
                  textAlign: 'right'
                }}>
                  {formatDate(property.next_due_date)}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

export default RentalPropertiesSection