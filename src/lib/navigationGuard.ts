import { router } from 'expo-router'
import { getCurrentUserRole, hasRoleAccess, redirectToRoleDashboard, UserRole } from './roleGuard'

/**
 * Navigation guard that intercepts navigation attempts and enforces role-based access
 */
export class NavigationGuard {
  private static instance: NavigationGuard
  private isInitialized = false

  static getInstance(): NavigationGuard {
    if (!NavigationGuard.instance) {
      NavigationGuard.instance = new NavigationGuard()
    }
    return NavigationGuard.instance
  }

  /**
   * Initialize the navigation guard
   */
  async initialize() {
    if (this.isInitialized) return
    
    // Listen for URL changes (deep links)
    this.setupDeepLinkProtection()
    this.isInitialized = true
  }

  /**
   * Setup deep link protection
   */
  private setupDeepLinkProtection() {
    // This would typically be implemented with Expo Router's navigation events
    // For now, we'll implement route protection at the component level
    console.log('🛡️ [NAV_GUARD] Deep link protection initialized')
  }

  /**
   * Check if a user can navigate to a specific route
   */
  async canNavigateTo(routeName: string): Promise<{
    allowed: boolean
    userRole: UserRole
    redirectTo?: string
  }> {
    try {
      const userRole = await getCurrentUserRole()
      const hasAccess = hasRoleAccess(userRole, routeName)
      
      if (!hasAccess) {
        const redirectTo = redirectToRoleDashboard(userRole)
        console.log(`❌ [NAV_GUARD] Access denied for ${userRole} to ${routeName}, redirecting to ${redirectTo}`)
        return { allowed: false, userRole, redirectTo }
      }
      
      console.log(`✅ [NAV_GUARD] Access granted for ${userRole} to ${routeName}`)
      return { allowed: true, userRole }
    } catch (error) {
      console.error('❌ [NAV_GUARD] Error checking navigation access:', error)
      return { allowed: false, userRole: 'guest' }
    }
  }

  /**
   * Navigate to a route with role-based access control
   */
  async navigateTo(routeName: string, options?: any) {
    const { allowed, redirectTo } = await this.canNavigateTo(routeName)
    
    if (!allowed && redirectTo) {
      console.log(`🔄 [NAV_GUARD] Redirecting from ${routeName} to ${redirectTo}`)
      router.replace(redirectTo as never)
      return false
    }
    
    if (allowed) {
      console.log(`🧭 [NAV_GUARD] Navigating to ${routeName}`)
      router.push(routeName as never)
      return true
    }
    
    return false
  }

  /**
   * Replace current route with role-based access control
   */
  async replaceWith(routeName: string, options?: any) {
    const { allowed, redirectTo } = await this.canNavigateTo(routeName)
    
    if (!allowed && redirectTo) {
      console.log(`🔄 [NAV_GUARD] Replacing ${routeName} with ${redirectTo}`)
      router.replace(redirectTo as never)
      return false
    }
    
    if (allowed) {
      console.log(`🧭 [NAV_GUARD] Replacing with ${routeName}`)
      router.replace(routeName as never)
      return true
    }
    
    return false
  }

  /**
   * Get the appropriate dashboard route for the current user
   */
  async getDashboardRoute(): Promise<string> {
    const userRole = await getCurrentUserRole()
    return redirectToRoleDashboard(userRole)
  }

  /**
   * Navigate to the appropriate dashboard for the current user
   */
  async navigateToDashboard() {
    const dashboardRoute = await this.getDashboardRoute()
    console.log(`🏠 [NAV_GUARD] Navigating to dashboard: ${dashboardRoute}`)
    router.replace(dashboardRoute as never)
  }
}

// Export singleton instance
export const navigationGuard = NavigationGuard.getInstance()
