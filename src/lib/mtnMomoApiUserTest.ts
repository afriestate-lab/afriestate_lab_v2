import { mtnMomoApiUserService } from './mtnMomoApiUser'
import { getMTNMoMoErrorMessage } from './mtnMomoErrors'

export interface ApiUserTestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
}

export class MTNMoMoApiUserTestSuite {
  private results: ApiUserTestResult[] = []

  async runAllTests(): Promise<ApiUserTestResult[]> {
    this.results = []
    
    console.log('🧪 Starting MTN MoMo API User Test Suite...')
    
    // Test 1: Configuration Check
    await this.testConfiguration()
    
    // Test 2: Reference ID Generation
    await this.testReferenceIdGeneration()
    
    // Test 3: API User Creation (if configured)
    if (mtnMomoApiUserService.isConfigured()) {
      await this.testApiUserCreation()
      await this.testApiKeyCreation()
      await this.testCompleteSetup()
    } else {
      this.addResult('API User Creation', 'SKIP', 'MTN MoMo API not configured')
      this.addResult('API Key Creation', 'SKIP', 'MTN MoMo API not configured')
      this.addResult('Complete Setup', 'SKIP', 'MTN MoMo API not configured')
    }
    
    console.log('✅ MTN MoMo API User Test Suite completed')
    return this.results
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
    this.results.push({ test, status, message, details })
    console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️'} ${test}: ${message}`)
  }

  private async testConfiguration(): Promise<void> {
    try {
      const configStatus = mtnMomoApiUserService.getConfigurationStatus()
      
      if (configStatus.isConfigured) {
        this.addResult('Configuration', 'PASS', 'All required configuration present')
      } else {
        this.addResult('Configuration', 'FAIL', `Missing configuration: ${configStatus.missingConfig.join(', ')}`)
      }
    } catch (error) {
      this.addResult('Configuration', 'FAIL', 'Configuration check failed', error)
    }
  }

  private async testReferenceIdGeneration(): Promise<void> {
    try {
      const id1 = mtnMomoApiUserService.generateReferenceId()
      const id2 = mtnMomoApiUserService.generateReferenceId()
      
      if (id1 && id2 && id1 !== id2 && id1.startsWith('ICUMBI_') && id2.startsWith('ICUMBI_')) {
        this.addResult('Reference ID Generation', 'PASS', 'Reference IDs generated successfully and are unique')
      } else {
        this.addResult('Reference ID Generation', 'FAIL', 'Reference ID generation failed or IDs are not unique')
      }
    } catch (error) {
      this.addResult('Reference ID Generation', 'FAIL', 'Reference ID generation error', error)
    }
  }

  private async testApiUserCreation(): Promise<void> {
    try {
      const referenceId = mtnMomoApiUserService.generateReferenceId()
      const apiUserResponse = await mtnMomoApiUserService.createApiUser(referenceId)
      
      if (apiUserResponse && apiUserResponse.apiUser === referenceId) {
        this.addResult('API User Creation', 'PASS', `API User created successfully: ${apiUserResponse.apiUser}`)
      } else {
        this.addResult('API User Creation', 'FAIL', 'API User creation returned unexpected data')
      }
    } catch (error) {
      const errorMessage = getMTNMoMoErrorMessage(error)
      this.addResult('API User Creation', 'FAIL', `API User creation failed: ${errorMessage}`, error)
    }
  }

  private async testApiKeyCreation(): Promise<void> {
    try {
      // First create an API user
      const referenceId = mtnMomoApiUserService.generateReferenceId()
      await mtnMomoApiUserService.createApiUser(referenceId)
      
      // Wait for API user to be fully created
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Then create API key
      const apiKeyResponse = await mtnMomoApiUserService.createApiKey(referenceId)
      
      if (apiKeyResponse && apiKeyResponse.apiKey && apiKeyResponse.apiKey.length > 0) {
        this.addResult('API Key Creation', 'PASS', 'API Key created successfully')
      } else {
        this.addResult('API Key Creation', 'FAIL', 'API Key creation returned unexpected data')
      }
    } catch (error) {
      const errorMessage = getMTNMoMoErrorMessage(error)
      this.addResult('API Key Creation', 'FAIL', `API Key creation failed: ${errorMessage}`, error)
    }
  }

  private async testCompleteSetup(): Promise<void> {
    try {
      const setupResult = await mtnMomoApiUserService.setupApiUser()
      
      if (setupResult && setupResult.apiUserId && setupResult.apiKey) {
        this.addResult('Complete Setup', 'PASS', `Complete API user setup successful. User ID: ${setupResult.apiUserId}`)
      } else {
        this.addResult('Complete Setup', 'FAIL', 'Complete setup returned incomplete data')
      }
    } catch (error) {
      const errorMessage = getMTNMoMoErrorMessage(error)
      this.addResult('Complete Setup', 'FAIL', `Complete setup failed: ${errorMessage}`, error)
    }
  }

  /**
   * Test API user creation with specific reference ID
   */
  async testApiUserCreationWithId(referenceId: string): Promise<ApiUserTestResult[]> {
    const testResults: ApiUserTestResult[] = []
    
    try {
      console.log(`🧪 Testing API User Creation with ID: ${referenceId}`)
      
      // Create API User
      const apiUserResponse = await mtnMomoApiUserService.createApiUser(referenceId)
      
      testResults.push({
        test: 'API User Creation',
        status: 'PASS',
        message: `API User created successfully: ${apiUserResponse.apiUser}`,
        details: apiUserResponse
      })

      // Wait for API user to be fully created
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Create API Key
      const apiKeyResponse = await mtnMomoApiUserService.createApiKey(apiUserResponse.apiUser)
      
      testResults.push({
        test: 'API Key Creation',
        status: 'PASS',
        message: 'API Key created successfully',
        details: apiKeyResponse
      })

      // Get API User details
      const userDetails = await mtnMomoApiUserService.getApiUser(apiUserResponse.apiUser)
      
      testResults.push({
        test: 'API User Details',
        status: 'PASS',
        message: 'API User details retrieved successfully',
        details: userDetails
      })

    } catch (error) {
      const errorMessage = getMTNMoMoErrorMessage(error)
      testResults.push({
        test: 'API User Creation',
        status: 'FAIL',
        message: `API User creation failed: ${errorMessage}`,
        details: error
      })
    }

    return testResults
  }

  /**
   * Get test summary
   */
  getSummary(): { total: number; passed: number; failed: number; skipped: number } {
    const total = this.results.length
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const skipped = this.results.filter(r => r.status === 'SKIP').length

    return { total, passed, failed, skipped }
  }
}

// Export test suite instance
export const mtnMomoApiUserTestSuite = new MTNMoMoApiUserTestSuite()
export default mtnMomoApiUserTestSuite
