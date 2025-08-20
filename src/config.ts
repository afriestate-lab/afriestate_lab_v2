// Configuration for the mobile app
export const config = {
  // API Configuration - Use production for now to avoid network issues
  API_URL: 'https://icumbi.com',
  
  // Environment
  APP_ENV: 'production',
  
  // Supabase Configuration (hardcoded for production)
  SUPABASE_URL: 'https://sgektsymnqkyqcethveh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWt0c3ltbnFreXFjZXRodmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjk2MjEsImV4cCI6MjA2NTg0NTYyMX0.9-GgphRm5dMkmuXmBzu2cORM50qj4bLJdngAqDpjErU',
}

// API Endpoints
export const API_ENDPOINTS = {
  SIGNUP: `${config.API_URL}/api/signup`,
  AUTH: `${config.API_URL}/api/auth`,
  VALIDATE_PIN: `${config.API_URL}/api/validate-pin`,
  SEND_MANAGER_INVITATION: `${config.API_URL}/api/managers/invite`,
} 