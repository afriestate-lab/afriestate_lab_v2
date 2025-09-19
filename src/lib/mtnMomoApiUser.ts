import { config } from '../config'
import { MTNMoMoError, parseMTNMoMoError } from './mtnMomoErrors'

// MTN MoMo API User Types
export interface MTNMoMoApiUserRequest {
  providerCallbackHost: string
}

export interface MTNMoMoApiUserResponse {
  apiUser: string
  targetEnvironment: string
}

export interface MTNMoMoApiKeyRequest {
  providerCallbackHost: string
}

export interface MTNMoMoApiKeyResponse {
  apiKey: string
  targetEnvironment: string
}

export class MTNMoMoApiUserService {
  private baseUrl: string
  private subscriptionKey: string
  private environment: string
  private callbackUrl: string

  constructor() {
    this.baseUrl = config.MTN_MOMO.BASE_URL
    this.subscriptionKey = config.MTN_MOMO.SUBSCRIPTION_KEY
    this.environment = config.MTN_MOMO.ENVIRONMENT
    this.callbackUrl = config.MTN_MOMO.CALLBACK_URL
  }

  /**
   * Create API User
   * This creates a new API user for MTN MoMo integration
   */
  async createApiUser(referenceId: string): Promise<MTNMoMoApiUserResponse> {
    try {
      const apiUserRequest: MTNMoMoApiUserRequest = {
        providerCallbackHost: this.callbackUrl
      }

      const response = await fetch(`${this.baseUrl}/v1_0/apiuser`, {
        method: 'POST',
        headers: {
          'X-Reference-Id': referenceId,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiUserRequest)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw parseMTNMoMoError({
          code: 'API_USER_CREATION_FAILED',
          message: `API User creation failed: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          details: errorData
        })
      }

      // API User creation returns 201 Created with no body
      // The API User ID is the reference ID we provided
      const apiUserResponse: MTNMoMoApiUserResponse = {
        apiUser: referenceId,
        targetEnvironment: this.environment
      }

      return apiUserResponse
    } catch (error) {
      console.error('MTN MoMo API User Creation Error:', error)
      if (error instanceof MTNMoMoError) {
        throw error
      }
      throw parseMTNMoMoError(error)
    }
  }

  /**
   * Create API Key for the API User
   * This generates an API key for the created API user
   */
  async createApiKey(apiUserId: string): Promise<MTNMoMoApiKeyResponse> {
    try {
      const apiKeyRequest: MTNMoMoApiKeyRequest = {
        providerCallbackHost: this.callbackUrl
      }

      const response = await fetch(`${this.baseUrl}/v1_0/apiuser/${apiUserId}/apikey`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiKeyRequest)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw parseMTNMoMoError({
          code: 'API_KEY_CREATION_FAILED',
          message: `API Key creation failed: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          details: errorData
        })
      }

      const apiKeyData: MTNMoMoApiKeyResponse = await response.json()
      return apiKeyData
    } catch (error) {
      console.error('MTN MoMo API Key Creation Error:', error)
      if (error instanceof MTNMoMoError) {
        throw error
      }
      throw parseMTNMoMoError(error)
    }
  }

  /**
   * Get API User details
   * This retrieves information about an existing API user
   */
  async getApiUser(apiUserId: string): Promise<MTNMoMoApiUserResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1_0/apiuser/${apiUserId}`, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw parseMTNMoMoError({
          code: 'API_USER_FETCH_FAILED',
          message: `API User fetch failed: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          details: errorData
        })
      }

      const apiUserData: MTNMoMoApiUserResponse = await response.json()
      return apiUserData
    } catch (error) {
      console.error('MTN MoMo API User Fetch Error:', error)
      if (error instanceof MTNMoMoError) {
        throw error
      }
      throw parseMTNMoMoError(error)
    }
  }

  /**
   * Generate a unique reference ID for API user creation
   */
  generateReferenceId(): string {
    return `ICUMBI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Complete API user setup process
   * This creates both API user and API key in sequence
   */
  async setupApiUser(): Promise<{
    apiUserId: string
    apiKey: string
    referenceId: string
  }> {
    try {
      // Generate unique reference ID
      const referenceId = this.generateReferenceId()
      
      // Create API User
      console.log('Creating MTN MoMo API User...')
      const apiUserResponse = await this.createApiUser(referenceId)
      
      // Wait a moment for the API user to be fully created
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create API Key
      console.log('Creating MTN MoMo API Key...')
      const apiKeyResponse = await this.createApiKey(apiUserResponse.apiUser)
      
      return {
        apiUserId: apiUserResponse.apiUser,
        apiKey: apiKeyResponse.apiKey,
        referenceId: referenceId
      }
    } catch (error) {
      console.error('MTN MoMo API User Setup Error:', error)
      throw error
    }
  }

  /**
   * Check if the service is properly configured for API user creation
   */
  isConfigured(): boolean {
    return !!(
      this.subscriptionKey &&
      this.callbackUrl
    )
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus(): {
    isConfigured: boolean
    missingConfig: string[]
  } {
    const missingConfig: string[] = []
    
    if (!this.subscriptionKey) missingConfig.push('SUBSCRIPTION_KEY')
    if (!this.callbackUrl) missingConfig.push('CALLBACK_URL')
    
    return {
      isConfigured: missingConfig.length === 0,
      missingConfig
    }
  }
}

// Export singleton instance
export const mtnMomoApiUserService = new MTNMoMoApiUserService()
export default mtnMomoApiUserService
