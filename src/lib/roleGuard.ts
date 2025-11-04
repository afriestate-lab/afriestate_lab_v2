import { supabase } from './supabase'

export type UserRole = 'tenant' | 'landlord' | 'manager' | 'admin' | 'guest'

export interface UserProfile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone_number?: string
}

// Role hierarchy for access control
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  tenant: 1,
  landlord: 2,
  manager: 3,
  admin: 4
}

// Define which roles can access which screens
export const ROLE_ACCESS_MATRIX: Record<string, UserRole[]> = {
  // Dashboard screens
  'tenant-dashboard': ['tenant'],
  'landlord-dashboard': ['landlord', 'manager'],
  'admin-dashboard': ['admin'],
  'admin-panel': ['manager', 'admin'],
  
  // Property management
  'properties-page': ['landlord', 'manager', 'admin'],
  'admin-properties-page': ['admin'],
  
  // Tenant management
  'tenants-page': ['landlord', 'manager', 'admin'],
  'admin-tenants-page': ['admin'],
  
  // Payment management
  'payments-page': ['landlord', 'manager', 'admin'],
  'admin-payments-page': ['admin'],
  
  // Manager management
  'managers-page': ['landlord', 'admin'],
  'admin-managers-page': ['admin'],
  
  // Reports
  'reports-page': ['landlord', 'manager', 'admin'],
  'admin-reports-page': ['admin'],
  
  // User management (admin only)
  'admin-landlords-page': ['admin'],
  'admin-users-page': ['admin'],
  
  // Tenant-specific screens
  'tenant-bookings': ['tenant'],
  'tenant-payments': ['tenant'],
  'tenant-messages': ['tenant'],
  'tenant-announcements': ['tenant'],
  'tenant-extend': ['tenant'],
  
  // Public screens (accessible to all authenticated users)
  'profile': ['tenant', 'landlord', 'manager', 'admin'],
  'settings': ['tenant', 'landlord', 'manager', 'admin'],
  'language-selection': ['tenant', 'landlord', 'manager', 'admin']
}

/**
 * Check if a user has access to a specific screen/route
 */
export const hasRoleAccess = (userRole: UserRole, screenName: string): boolean => {
  const allowedRoles = ROLE_ACCESS_MATRIX[screenName]
  if (!allowedRoles) {
    console.warn(`⚠️ No access rules defined for screen: ${screenName}`)
    return false
  }
  
  return allowedRoles.includes(userRole)
}

/**
 * Get the current user's role with comprehensive checking
 */
export const getCurrentUserRole = async (): Promise<UserRole> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return 'guest'
    }

    console.log('🔍 [ROLE_CHECK] Checking role for user:', user.id)
    console.log('🔍 [ROLE_CHECK] User email:', user.email)

    // HARDCODED ADMIN CHECK - Force admin role for admin@afriestate.com
    if (user.email === 'admin@afriestate.com') {
      console.log('🔧 [ROLE_CHECK] Hardcoded admin detected - forcing admin role')
      return 'admin'
    }

    // Check for admin mode flag in localStorage (for hardcoded admin credentials)
    if (typeof window !== 'undefined') {
      try {
        const adminMode = window.localStorage.getItem('admin_mode')
        if (adminMode === 'true') {
          console.log('🔧 [ROLE_CHECK] Admin mode flag detected - forcing admin role')
          window.localStorage.removeItem('admin_mode')
          return 'admin'
        }
      } catch (storageError) {
        console.log('⚠️ [ROLE_CHECK] Error checking admin mode flag:', storageError)
      }
    }

    // First check the users table for the definitive role
    const { data: userData, error } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (error) {
      console.log('❌ [ROLE_CHECK] User not found in users table:', error)
      
      // Fallback: Check tenant_users table
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()
      
      if (tenantUser) {
        console.log('✅ [ROLE_CHECK] Found user in tenant_users table')
        return 'tenant'
      }
      
      return 'guest'
    }

    console.log('✅ [ROLE_CHECK] User role from database:', userData?.role)
    console.log('✅ [ROLE_CHECK] User name:', userData?.full_name)
    
    // Special case: Force tenant role for known tenant user
    if (user.id === '08fd1661-dc25-44c5-82f1-b28e9dfc1ea8') {
      console.log('🔧 [ROLE_CHECK] Special case: Forcing tenant role for Hakizimana jack')
      return 'tenant'
    }
    
    return (userData?.role as UserRole) || 'guest'
  } catch (error) {
    console.error('❌ [ROLE_CHECK] Error checking user role:', error)
    return 'guest'
  }
}

/**
 * Get current user profile with role information
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const role = await getCurrentUserRole()
    
    // Get user data from appropriate table based on role
    let userData: any = null
    
    if (role === 'tenant') {
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()
      userData = tenantUser
    } else {
      const { data: userRecord } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      userData = userRecord
    }

    if (!userData) {
      return null
    }

    return {
      id: user.id,
      role,
      full_name: userData.full_name || userData.name || 'Unknown User',
      email: userData.email || user.email || '',
      phone_number: userData.phone_number || userData.phone || null
    }
  } catch (error) {
    console.error('❌ [PROFILE_CHECK] Error getting user profile:', error)
    return null
  }
}

/**
 * Redirect user to appropriate dashboard based on their role
 */
export const redirectToRoleDashboard = (userRole: UserRole): string => {
  switch (userRole) {
    case 'tenant':
      return '/tenant-dashboard'
    case 'landlord':
      return '/landlord-dashboard'
    case 'manager':
      return '/admin-panel'
    case 'admin':
      return '/admin-dashboard'
    default:
      return '/'
  }
}

/**
 * Check if user can access a screen and redirect if not
 */
export const checkScreenAccess = async (screenName: string): Promise<{
  hasAccess: boolean
  userRole: UserRole
  redirectTo?: string
}> => {
  const userRole = await getCurrentUserRole()
  const hasAccess = hasRoleAccess(userRole, screenName)
  
  if (!hasAccess) {
    const redirectTo = redirectToRoleDashboard(userRole)
    return { hasAccess: false, userRole, redirectTo }
  }
  
  return { hasAccess: true, userRole }
}
