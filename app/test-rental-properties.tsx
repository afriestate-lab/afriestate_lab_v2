import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { 
  formatCurrency, 
  formatDate
} from '@/lib/helpers'
import { useTheme } from './_layout'
import RentalPropertiesSection from './components/RentalPropertiesSection'

export default function TestRentalProperties() {
  const { theme } = useTheme()
  const [tenantRecord, setTenantRecord] = useState<{id: string} | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkTenantAndLoadData()
  }, [])

  const checkTenantAndLoadData = async () => {
    try {
      setLoading(true)
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('No authenticated user')
        return
      }

      // Load tenant record first - use tenant_users table to get the correct tenant record
      const { data: tenantUserData } = await supabase
        .from('tenant_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (tenantUserData) {
        // Now get the tenant record using the tenant_users.id
        const { data: tenantRecord } = await supabase
          .from('tenants')
          .select('id')
          .eq('tenant_user_id', tenantUserData.id)
          .single()

        if (tenantRecord) {
          setTenantRecord(tenantRecord)
        }
      }
    } catch (error) {
      console.error('Error checking tenant:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Gukura amakuru...
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.titleText, { color: theme.text }]}>Test - Hitamo icyo ukodesha</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        <View style={styles.tabContent}>
          {/* Section: Hitamo icyo ukodesha */}
          <View style={[styles.leaseCard, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={24} color="#3b82f6" />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Hitamo icyo ukodesha</Text>
            </View>
            
            {/* All Rental Properties */}
            {tenantRecord ? (
              <RentalPropertiesSection 
                tenantRecord={tenantRecord} 
                theme={theme}
              />
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Nta makuru y'umukodesha yasanganywe
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280'
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerContent: {
    alignItems: 'center'
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  content: {
    flex: 1
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16
  },
  leaseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    marginTop: 20
  }
})