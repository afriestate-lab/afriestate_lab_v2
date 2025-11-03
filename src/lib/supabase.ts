import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Supabase configuration - using hardcoded values for production
const supabaseUrl = 'https://sgektsymnqkyqcethveh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWt0c3ltbnFreXFjZXRodmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjk2MjEsImV4cCI6MjA2NTg0NTYyMX0.9-GgphRm5dMkmuXmBzu2cORM50qj4bLJdngAqDpjErU'

console.log('🔧 Supabase configuration loaded:', { 
  url: supabaseUrl?.substring(0, 30) + '...',
  hasKey: !!supabaseAnonKey 
})

// Create Supabase client with React Native specific settings
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disabled for mobile
  },
  global: {
    headers: {
      'X-Client-Info': 'afri-estate-mobile-client'
    }
  },
  // Add network timeout and retry settings
  realtime: {
    timeout: 20000, // 20 seconds timeout
    heartbeatIntervalMs: 30000, // 30 seconds heartbeat
  }
})

// Helper types for better TypeScript support
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type UserTable = Tables<'users'>
export type PropertyTable = Tables<'properties'>
export type RoomTable = Tables<'rooms'>
export type TenantTable = Tables<'tenants'>
export type PaymentTable = Tables<'payments'>

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  if (error.message) {
    throw new Error(`Database error: ${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (Hint: ${error.hint})` : ''}`)
  }
  
  throw new Error(`Database error: ${JSON.stringify(error)}`)
}

// Common database queries optimized for mobile
export const queries = {
  // Properties
  getProperties: (userId: string) => 
    supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', userId)
      .order('created_at', { ascending: false }),

  // Rooms - Use RPC function to avoid RLS issues
  getRooms: (propertyId: string) =>
    supabase
      .rpc('get_property_rooms', {
        p_property_id: propertyId
      }),

  // Tenants
  getTenants: (propertyId: string) =>
    supabase
      .from('tenants')
      .select(`
        *,
        room_tenants!inner(
          room_id,
          rent_portion,
          move_in_date,
          move_out_date,
          is_active,
          rooms!inner(
            property_id
          )
        )
      `)
      .eq('room_tenants.rooms.property_id', propertyId)
      .eq('room_tenants.is_active', true),

  // Payments
  getPayments: (propertyId: string, startDate?: string, endDate?: string) => {
    let query = supabase
      .from('payments')
      .select(`
        *,
        rooms!inner(
          property_id,
          room_number,
          floor_number
        ),
        tenants!inner(
          full_name,
          phone_number
        )
      `)
      .eq('rooms.property_id', propertyId)
      .order('payment_date', { ascending: false })

    if (startDate) {
      query = query.gte('payment_date', startDate)
    }
    if (endDate) {
      query = query.lte('payment_date', endDate)
    }

    return query
  }
}

// Mobile-specific utilities
export const mobileUtils = {
  // Check if user is online
  isOnline: async () => {
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
      // If it's an RLS error, the network is actually working
      if (error && (error.code === '42501' || error.message?.includes('policy'))) {
        return true
      }
      return !error
    } catch {
      return false
    }
  },

  // Sync local data when back online
  syncWhenOnline: async () => {
    // Implementation for offline sync will be added later
    console.log('Sync when online functionality will be implemented')
  },

  // Test network connectivity with detailed error reporting
  testConnectivity: async () => {
    try {
      console.log('🔍 [MOBILE] Testing network connectivity...')
      console.log('🔍 [MOBILE] Supabase URL:', supabaseUrl?.substring(0, 30) + '...')
      console.log('🔍 [MOBILE] Environment variables loaded:', !!process.env.EXPO_PUBLIC_SUPABASE_URL)
      
      // Test basic connectivity first with a simple query that doesn't require authentication
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        console.error('❌ [MOBILE] Network test failed:', error)
        // If it's an RLS error, the network is actually working
        if (error.code === '42501' || error.message?.includes('policy')) {
          console.log('✅ [MOBILE] Network is working (RLS policy error is expected)')
          return { success: true, note: 'Network working, RLS policy triggered' }
        }
        return { success: false, error: error.message || 'Unknown database error' }
      }
      
      console.log('✅ [MOBILE] Network test successful')
      return { success: true, count: data }
    } catch (error) {
      console.error('❌ [MOBILE] Network test exception:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error'
      return { success: false, error: errorMessage }
    }
  },

  // Retry function for network requests
  retryRequest: async (requestFn: () => Promise<any>, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn()
      } catch (error) {
        console.log(`🔄 [MOBILE] Retry ${i + 1}/${maxRetries} failed:`, (error as Error).message)
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
  }
} 