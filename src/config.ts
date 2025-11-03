// Configuration for the mobile app
export const config = {
  // API Configuration - Use production for now to avoid network issues
  API_URL: 'https://afriestate.com',
  
  // Environment
  APP_ENV: 'production',
  
  // Supabase Configuration (hardcoded for production)
  SUPABASE_URL: 'https://sgektsymnqkyqcethveh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWt0c3ltbnFreXFjZXRodmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjk2MjEsImV4cCI6MjA2NTg0NTYyMX0.9-GgphRm5dMkmuXmBzu2cORM50qj4bLJdngAqDpjErU',
  
  // MTN MoMo API Configuration
  MTN_MOMO: {
    BASE_URL: process.env.EXPO_PUBLIC_MTN_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com',
    SUBSCRIPTION_KEY: process.env.EXPO_PUBLIC_MTN_MOMO_SUBSCRIPTION_KEY || '26dcf9a019924b9aa43f84d6b3dd016e',
    API_USER_ID: process.env.EXPO_PUBLIC_MTN_MOMO_API_USER_ID || '',
    API_KEY: process.env.EXPO_PUBLIC_MTN_MOMO_API_KEY || '',
    ENVIRONMENT: process.env.EXPO_PUBLIC_MTN_MOMO_ENVIRONMENT || 'sandbox',
    COLLECTION_PRIMARY_KEY: process.env.EXPO_PUBLIC_MTN_MOMO_COLLECTION_PRIMARY_KEY || '26dcf9a019924b9aa43f84d6b3dd016e',
    COLLECTION_SECONDARY_KEY: process.env.EXPO_PUBLIC_MTN_MOMO_COLLECTION_SECONDARY_KEY || 'f30c4de14fbc4f15981cc3409faf0d81',
    CALLBACK_URL: process.env.EXPO_PUBLIC_MTN_MOMO_CALLBACK_URL || 'https://afriestate.com/api/momo/callback',
    REDIRECT_URL: process.env.EXPO_PUBLIC_MTN_MOMO_REDIRECT_URL || 'https://afriestate.com/payment/momo/success',
  }
}

// API Endpoints
export const API_ENDPOINTS = {
  SIGNUP: `${config.API_URL}/api/signup`,
  AUTH: `${config.API_URL}/api/auth`,
  VALIDATE_PIN: `${config.API_URL}/api/validate-pin`,
  SEND_MANAGER_INVITATION: `${config.API_URL}/api/managers/invite`,
} 