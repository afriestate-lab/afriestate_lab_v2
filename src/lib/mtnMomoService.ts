import { config } from '../config'
import { MTNMoMoError, parseMTNMoMoError, getMTNMoMoErrorMessage, isRetryableError } from './mtnMomoErrors'

// MTN MoMo API Types
export interface MTNMoMoAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface MTNMoMoPaymentRequest {
  amount: string
  currency: string
  externalId: string
  payer: {
    partyIdType: string
    partyId: string
  }
  payerMessage: string
  payeeNote: string
}

export interface MTNMoMoPaymentResponse {
  amount: string
  currency: string
  financialTransactionId: string
  externalId: string
  payer: {
    partyIdType: string
    partyId: string
  }
  status: string
  reason?: string
}

export interface MTNMoMoPaymentStatus {
  amount: string
  currency: string
  financialTransactionId: string
  externalId: string
  payer: {
    partyIdType: string
    partyId: string
  }
  status: string
  reason?: string
}

export interface MTNMoMoError {
  code: string
  message: string
  details?: any
}

class MTNMoMoService {
  private baseUrl: string
  private subscriptionKey: string
  private apiUserId: string
  private apiKey: string
  private environment: string
  private collectionPrimaryKey: string
  private collectionSecondaryKey: string
  private callbackUrl: string
  private redirectUrl: string
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor() {
    this.baseUrl = config.MTN_MOMO.BASE_URL
    this.subscriptionKey = config.MTN_MOMO.SUBSCRIPTION_KEY
    this.apiUserId = config.MTN_MOMO.API_USER_ID
    this.apiKey = config.MTN_MOMO.API_KEY
    this.environment = config.MTN_MOMO.ENVIRONMENT
    this.collectionPrimaryKey = config.MTN_MOMO.COLLECTION_PRIMARY_KEY
    this.collectionSecondaryKey = config.MTN_MOMO.COLLECTION_SECONDARY_KEY
    this.callbackUrl = config.MTN_MOMO.CALLBACK_URL
    this.redirectUrl = config.MTN_MOMO.REDIRECT_URL
  }

  /**
   * Get OAuth 2.0 access token for API authentication
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const authUrl = `${this.baseUrl}/collection/token/`
      const authString = Buffer.from(`${this.apiUserId}:${this.apiKey}`).toString('base64')

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw parseMTNMoMoError({
          code: 'AUTHENTICATION_FAILED',
          message: `Authentication failed: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          details: errorData
        })
      }

      const authData: MTNMoMoAuthResponse = await response.json()
      
      this.accessToken = authData.access_token
      this.tokenExpiry = Date.now() + (authData.expires_in * 1000) - 60000 // 1 minute buffer
      
      return this.accessToken
    } catch (error) {
      console.error('MTN MoMo Authentication Error:', error)
      if (error instanceof MTNMoMoError) {
        throw error
      }
      throw parseMTNMoMoError(error)
    }
  }

  /**
   * Create a payment request
   */
  async requestPayment(paymentData: {
    amount: number
    phoneNumber: string
    externalId: string
    payerMessage: string
    payeeNote: string
  }): Promise<MTNMoMoPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken()
      
      const paymentRequest: MTNMoMoPaymentRequest = {
        amount: paymentData.amount.toString(),
        currency: 'RWF',
        externalId: paymentData.externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: this.formatPhoneNumber(paymentData.phoneNumber)
        },
        payerMessage: paymentData.payerMessage,
        payeeNote: paymentData.payeeNote
      }

      const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Target-Environment': this.environment,
          'Ocp-Apim-Subscription-Key': this.collectionPrimaryKey,
          'Content-Type': 'application/json',
          'X-Reference-Id': paymentData.externalId
        },
        body: JSON.stringify(paymentRequest)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw parseMTNMoMoError({
          code: 'PAYMENT_FAILED',
          message: `Payment request failed: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          details: errorData
        })
      }

      const paymentResponse: MTNMoMoPaymentResponse = await response.json()
      return paymentResponse
    } catch (error) {
      console.error('MTN MoMo Payment Request Error:', error)
      if (error instanceof MTNMoMoError) {
        throw error
      }
      throw parseMTNMoMoError(error)
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(externalId: string): Promise<MTNMoMoPaymentStatus> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay/${externalId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Target-Environment': this.environment,
          'Ocp-Apim-Subscription-Key': this.collectionPrimaryKey
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw parseMTNMoMoError({
          code: 'PAYMENT_FAILED',
          message: `Payment status check failed: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          details: errorData
        })
      }

      const statusData: MTNMoMoPaymentStatus = await response.json()
      return statusData
    } catch (error) {
      console.error('MTN MoMo Payment Status Error:', error)
      if (error instanceof MTNMoMoError) {
        throw error
      }
      throw parseMTNMoMoError(error)
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<{ availableBalance: string; currency: string }> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(`${this.baseUrl}/collection/v1_0/account/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Target-Environment': this.environment,
          'Ocp-Apim-Subscription-Key': this.collectionPrimaryKey
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw parseMTNMoMoError({
          code: 'SERVICE_UNAVAILABLE',
          message: `Balance check failed: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          details: errorData
        })
      }

      const balanceData = await response.json()
      return balanceData
    } catch (error) {
      console.error('MTN MoMo Balance Error:', error)
      if (error instanceof MTNMoMoError) {
        throw error
      }
      throw parseMTNMoMoError(error)
    }
  }

  /**
   * Format phone number to MTN MoMo format (remove + and ensure it starts with country code)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // If it starts with 0, replace with 250 (Rwanda country code)
    if (cleaned.startsWith('0')) {
      cleaned = '250' + cleaned.substring(1)
    }
    
    // If it doesn't start with 250, add it
    if (!cleaned.startsWith('250')) {
      cleaned = '250' + cleaned
    }
    
    return cleaned
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = this.formatPhoneNumber(phoneNumber)
    // MTN Rwanda numbers should be 12 digits (250 + 9 digits)
    return /^250[0-9]{9}$/.test(cleaned)
  }

  /**
   * Generate a unique external ID for payment tracking
   */
  generateExternalId(): string {
    return `ICUMBI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.subscriptionKey &&
      this.apiUserId &&
      this.apiKey &&
      this.collectionPrimaryKey
    )
  }

  /**
   * Get service configuration status
   */
  getConfigurationStatus(): {
    isConfigured: boolean
    missingConfig: string[]
  } {
    const missingConfig: string[] = []
    
    if (!this.subscriptionKey) missingConfig.push('SUBSCRIPTION_KEY')
    if (!this.apiUserId) missingConfig.push('API_USER_ID')
    if (!this.apiKey) missingConfig.push('API_KEY')
    if (!this.collectionPrimaryKey) missingConfig.push('COLLECTION_PRIMARY_KEY')
    
    return {
      isConfigured: missingConfig.length === 0,
      missingConfig
    }
  }
}

// Export singleton instance
export const mtnMomoService = new MTNMoMoService()
export default mtnMomoService
