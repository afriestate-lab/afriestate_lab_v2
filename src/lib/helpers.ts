// Mobile-specific helper functions for the Icumbi app
import { supabase } from './supabase'

export interface TenantUser {
  id: string
  full_name: string
  email: string
  phone_number: string | null
  auth_user_id: string
  status: string
  preferred_language: string
  created_at: string
}

export interface CurrentLease {
  id: string
  property_name: string
  room_number: string
  rent_amount: number
  move_in_date: string
  move_out_date?: string
  next_due_date?: string
  property_id: string
}

export interface TenantPayment {
  id: string
  amount: number
  payment_date: string
  payment_methods: string[]
  property_name: string
  room_number: string
  receipt_number?: string
  status: string
  created_at: string
}

export interface TenantMessage {
  id: string
  subject: string
  message: string
  message_type: string
  status: string
  is_urgent: boolean
  landlord_reply?: string
  replied_at?: string
  created_at: string
  property_name: string
}

export interface TenantBooking {
  id: string
  property_name: string
  room_number?: string
  booking_type: string
  status: string
  preferred_move_in_date?: string
  created_at: string
  landlord_response?: string
}

export interface PropertyAnnouncement {
  id: string
  title: string
  content: string
  announcement_type: string
  priority: string
  property_name: string
  created_at: string
  expires_at?: string
}

export interface ExtensionRequest {
  id: string
  current_end_date: string
  requested_end_date: string
  extension_months: number
  total_amount: number
  payment_status: string
  approval_status: string
  created_at: string
}

// Check if current user is a tenant
export const checkTenantRole = async (): Promise<TenantUser | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // First check if user has tenant role in users table
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'tenant')
      .single()

    if (userData) {
      // Get tenant_users data linked to this auth user
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_user_id', user.id)
        .single()

      return tenantUser || null
    }

    // If not in users table with tenant role, check tenant_users directly
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    return tenantUser || null
  } catch (error) {
    console.error('Error checking tenant role:', error)
    return null
  }
}

// Get tenant's current lease information
export const getCurrentLease = async (tenantUserId: string): Promise<CurrentLease | null> => {
  try {
    // First get the tenant record linked to this tenant_user
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('tenant_user_id', tenantUserId)
      .single()

    if (!tenant) return null

    // Get current active lease
    const { data: leaseData } = await supabase
      .from('room_tenants')
      .select(`
        id,
        rent_amount,
        move_in_date,
        move_out_date,
        next_due_date,
        rooms!inner (
          room_number,
          properties!inner (
            id,
            name
          )
        )
      `)
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .single()

    if (!leaseData) return null

    return {
      id: leaseData.id,
      property_name: (leaseData.rooms as any).properties.name,
      room_number: (leaseData.rooms as any).room_number,
      rent_amount: leaseData.rent_amount,
      move_in_date: leaseData.move_in_date,
      move_out_date: leaseData.move_out_date,
      next_due_date: leaseData.next_due_date,
      property_id: (leaseData.rooms as any).properties.id
    }
  } catch (error) {
    console.error('Error getting current lease:', error)
    return null
  }
}

// Format currency for Rwanda
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0
  }).format(amount)
}

// Format date for display
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Format date for display in Kinyarwanda format
export const formatDateKinyarwanda = (dateString: string): string => {
  const date = new Date(dateString)
  const months = [
    'Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicuransi', 'Kamena',
    'Nyakanga', 'Kanama', 'Nzeli', 'Ukwakira', 'Ugushyingo', 'Ukuboza'
  ]
  
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

// Get status badge color
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'confirmed':
    case 'approved':
    case 'paid':
    case 'completed':
      return '#10b981' // green
    case 'pending':
      return '#f59e0b' // yellow
    case 'rejected':
    case 'failed':
    case 'cancelled':
      return '#ef4444' // red
    default:
      return '#6b7280' // gray
  }
}

// Get priority color
export const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return '#ef4444' // red
    case 'high':
      return '#f97316' // orange
    case 'normal':
      return '#3b82f6' // blue
    case 'low':
      return '#6b7280' // gray
    default:
      return '#6b7280' // gray
  }
}

// Get message type display text
export const getMessageTypeText = (type: string): string => {
  const messageTypes: { [key: string]: string } = {
    'general': 'Rusange',
    'complaint': 'Ikirego',
    'maintenance': 'Gukora',
    'payment': 'Kwishyura',
    'inquiry': 'Gusobanuza'
  }
  return messageTypes[type] || type
}

// Calculate days until next due date
export const getDaysUntilDue = (dueDateString: string): number => {
  const dueDate = new Date(dueDateString)
  const today = new Date()
  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Check if date is overdue
export const isOverdue = (dueDateString: string): boolean => {
  return getDaysUntilDue(dueDateString) < 0
}

// Format percentage with proper sign
export const formatPercentage = (percentage: number): string => {
  const sign = percentage >= 0 ? '+' : ''
  return `${sign}${percentage.toFixed(1)}%`
}

// Format large numbers (e.g., for revenue display)
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

// Get month name in Kinyarwanda
export const getKinyarwandaMonth = (monthIndex: number): string => {
  const months = [
    'Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicuransi', 'Kamena',
    'Nyakanga', 'Kanama', 'Nzeli', 'Ukwakira', 'Ugushyingo', 'Ukuboza'
  ]
  return months[monthIndex] || 'Unknown'
}

// Validate Rwanda phone number
export const isValidRwandaPhone = (phone: string): boolean => {
  // Remove spaces and special characters
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  // Check for Rwanda phone patterns
  const patterns = [
    /^(\+?250)?[0-9]{9}$/, // +250XXXXXXXXX or 250XXXXXXXXX or XXXXXXXXX (9 digits)
    /^0[0-9]{9}$/ // 0XXXXXXXXX (10 digits starting with 0)
  ]
  
  return patterns.some(pattern => pattern.test(cleanPhone))
} 