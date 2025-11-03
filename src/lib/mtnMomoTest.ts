import { mtnMomoService } from './mtnMomoService'
import { getMTNMoMoErrorMessage } from './mtnMomoErrors'

export interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
}

export class MTNMoMoTestSuite {
  private results: TestResult[] = []

  async runAllTests(): Promise<TestResult[]> {
    this.results = []
    
    console.log('🧪 Starting MTN MoMo API Test Suite...')
    
    // Test 1: Configuration Check
    await this.testConfiguration()
    
    // Test 2: Phone Number Validation
    await this.testPhoneNumberValidation()
    
    // Test 3: Authentication (if configured)
    if (mtnMomoService.isConfigured()) {
      await this.testAuthentication()
      await this.testAccountBalance()
    } else {
      this.addResult('Authentication', 'SKIP', 'MTN MoMo API not configured')
      this.addResult('Account Balance', 'SKIP', 'MTN MoMo API not configured')
    }
    
    // Test 4: External ID Generation
    await this.testExternalIdGeneration()
    
    console.log('✅ MTN MoMo API Test Suite completed')
    return this.results
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
    this.results.push({ test, status, message, details })
    console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️'} ${test}: ${message}`)
  }

  private async testConfiguration(): Promise<void> {
    try {
      const configStatus = mtnMomoService.getConfigurationStatus()
      
      if (configStatus.isConfigured) {
        this.addResult('Configuration', 'PASS', 'All required configuration present')
      } else {
        this.addResult('Configuration', 'FAIL', `Missing configuration: ${configStatus.missingConfig.join(', ')}`)
      }
    } catch (error) {
      this.addResult('Configuration', 'FAIL', 'Configuration check failed', error)
    }
  }

  private async testPhoneNumberValidation(): Promise<void> {
    const testCases = [
      { phone: '0780123456', expected: true, description: 'Valid MTN number starting with 0' },
      { phone: '250780123456', expected: true, description: 'Valid MTN number with country code' },
      { phone: '+250780123456', expected: true, description: 'Valid MTN number with + country code' },
      { phone: '0730123456', expected: false, description: 'Invalid Airtel number' },
      { phone: '123456789', expected: false, description: 'Invalid short number' },
      { phone: '250780123456789', expected: false, description: 'Invalid long number' },
      { phone: '', expected: false, description: 'Empty number' }
    ]

    let passed = 0
    let total = testCases.length

    for (const testCase of testCases) {
      try {
        const result = mtnMomoService.validatePhoneNumber(testCase.phone)
        if (result === testCase.expected) {
          passed++
        } else {
          console.warn(`Phone validation failed for ${testCase.phone}: expected ${testCase.expected}, got ${result}`)
        }
      } catch (error) {
        console.warn(`Phone validation error for ${testCase.phone}:`, error)
      }
    }

    if (passed === total) {
      this.addResult('Phone Number Validation', 'PASS', `All ${total} test cases passed`)
    } else {
      this.addResult('Phone Number Validation', 'FAIL', `${passed}/${total} test cases passed`)
    }
  }

  private async testAuthentication(): Promise<void> {
    try {
      // This will attempt to get an access token
      const token = await mtnMomoService.getAccessToken()
      
      if (token && token.length > 0) {
        this.addResult('Authentication', 'PASS', 'Successfully authenticated with MTN MoMo API')
      } else {
        this.addResult('Authentication', 'FAIL', 'Authentication returned empty token')
      }
    } catch (error) {
      const errorMessage = getMTNMoMoErrorMessage(error)
      this.addResult('Authentication', 'FAIL', `Authentication failed: ${errorMessage}`, error)
    }
  }

  private async testAccountBalance(): Promise<void> {
    try {
      const balance = await mtnMomoService.getAccountBalance()
      
      if (balance && balance.availableBalance !== undefined) {
        this.addResult('Account Balance', 'PASS', `Account balance retrieved: ${balance.availableBalance} ${balance.currency}`)
      } else {
        this.addResult('Account Balance', 'FAIL', 'Account balance data incomplete')
      }
    } catch (error) {
      const errorMessage = getMTNMoMoErrorMessage(error)
      this.addResult('Account Balance', 'FAIL', `Account balance check failed: ${errorMessage}`, error)
    }
  }

  private async testExternalIdGeneration(): Promise<void> {
    try {
      const id1 = mtnMomoService.generateExternalId()
      const id2 = mtnMomoService.generateExternalId()
      
      if (id1 && id2 && id1 !== id2 && id1.startsWith('AFRIESTATE_') && id2.startsWith('AFRIESTATE_')) {
        this.addResult('External ID Generation', 'PASS', 'External IDs generated successfully and are unique')
      } else {
        this.addResult('External ID Generation', 'FAIL', 'External ID generation failed or IDs are not unique')
      }
    } catch (error) {
      this.addResult('External ID Generation', 'FAIL', 'External ID generation error', error)
    }
  }

  /**
   * Test payment flow (use with caution - this creates actual payment requests)
   */
  async testPaymentFlow(phoneNumber: string, amount: number = 100): Promise<TestResult[]> {
    const paymentResults: TestResult[] = []
    
    try {
      console.log('🧪 Testing MTN MoMo Payment Flow...')
      
      // Validate phone number first
      if (!mtnMomoService.validatePhoneNumber(phoneNumber)) {
        paymentResults.push({
          test: 'Payment Flow - Phone Validation',
          status: 'FAIL',
          message: 'Invalid phone number provided'
        })
        return paymentResults
      }

      // Generate external ID
      const externalId = mtnMomoService.generateExternalId()
      
      // Create payment request
      const paymentResponse = await mtnMomoService.requestPayment({
        amount,
        phoneNumber,
        externalId,
        payerMessage: 'Test Payment - Afri Estate',
        payeeNote: 'Test Payment'
      })

      paymentResults.push({
        test: 'Payment Flow - Request Creation',
        status: 'PASS',
        message: 'Payment request created successfully',
        details: paymentResponse
      })

      // Check payment status
      const status = await mtnMomoService.getPaymentStatus(externalId)
      
      paymentResults.push({
        test: 'Payment Flow - Status Check',
        status: 'PASS',
        message: `Payment status retrieved: ${status.status}`,
        details: status
      })

    } catch (error) {
      const errorMessage = getMTNMoMoErrorMessage(error)
      paymentResults.push({
        test: 'Payment Flow',
        status: 'FAIL',
        message: `Payment flow failed: ${errorMessage}`,
        details: error
      })
    }

    return paymentResults
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
export const mtnMomoTestSuite = new MTNMoMoTestSuite()
export default mtnMomoTestSuite
