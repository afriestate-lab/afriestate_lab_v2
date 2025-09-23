const linking = {
  prefixes: ['icumbi://', 'https://icumbi.com'],
  config: {
    screens: {
      // Public screens (no authentication required)
      'index': '/',
      'auth': {
        screens: {
          'sign-in': 'auth/sign-in',
          'sign-up': 'auth/sign-up',
          'reset-password': 'auth/reset-password',
        },
      },
      'privacy': {
        screens: {
          'index': 'privacy',
        },
      },
      
      // Protected screens (authentication required)
      'dashboard': '/dashboard',
      'tenant-dashboard': '/tenant-dashboard',
      'landlord-dashboard': '/landlord-dashboard',
      'admin-dashboard': '/admin-dashboard',
      'admin-panel': '/admin-panel',
      
      // Role-specific screens
      'properties-page': '/properties-page',
      'tenants-page': '/tenants-page',
      'payments-page': '/payments-page',
      'managers-page': '/managers-page',
      'reports-page': '/reports-page',
      
      // Admin-only screens
      'admin-properties-page': '/admin-properties-page',
      'admin-tenants-page': '/admin-tenants-page',
      'admin-payments-page': '/admin-payments-page',
      'admin-managers-page': '/admin-managers-page',
      'admin-reports-page': '/admin-reports-page',
      'admin-landlords-page': '/admin-landlords-page',
      'admin-users-page': '/admin-users-page',
      
      // Tenant-specific screens
      'tenant-bookings': '/tenant-bookings',
      'tenant-payments': '/tenant-payments',
      'tenant-messages': '/tenant-messages',
      'tenant-announcements': '/tenant-announcements',
      'tenant-extend': '/tenant-extend',
      
      // Profile and settings (accessible to all authenticated users)
      'profile': '/profile',
      'settings': '/settings',
      'language-selection': '/language-selection',
    },
  },
};

export default linking;
