# MTN Mobile Money API Integration

This document describes the complete MTN Mobile Money API integration for the Icumbi mobile app.

## Overview

The MTN MoMo integration provides real-time mobile money payment processing for rent payments in Rwanda. It replaces the previous simulation mode with actual API calls to MTN's payment services.

## Features

- ✅ Real-time payment processing
- ✅ Phone number validation
- ✅ Payment status polling
- ✅ Comprehensive error handling
- ✅ Kinyarwanda error messages
- ✅ Retry logic for failed requests
- ✅ Sandbox and production environments

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# MTN MoMo API Configuration
EXPO_PUBLIC_MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
EXPO_PUBLIC_MTN_MOMO_SUBSCRIPTION_KEY=your-mtn-momo-subscription-key
EXPO_PUBLIC_MTN_MOMO_API_USER_ID=your-mtn-momo-api-user-id
EXPO_PUBLIC_MTN_MOMO_API_KEY=your-mtn-momo-api-key
EXPO_PUBLIC_MTN_MOMO_ENVIRONMENT=sandbox

# MTN MoMo Collection Configuration
EXPO_PUBLIC_MTN_MOMO_COLLECTION_PRIMARY_KEY=your-collection-primary-key
EXPO_PUBLIC_MTN_MOMO_COLLECTION_SECONDARY_KEY=your-collection-secondary-key

# MTN MoMo Callback URLs
EXPO_PUBLIC_MTN_MOMO_CALLBACK_URL=https://icumbi.com/api/momo/callback
EXPO_PUBLIC_MTN_MOMO_REDIRECT_URL=https://icumbi.com/payment/momo/success
```

### Getting API Credentials

1. **Register at MTN MoMo Developer Portal**
   - Visit [https://momoapi.mtn.com/](https://momoapi.mtn.com/)
   - Create a developer account
   - Subscribe to the Collections product

2. **Get Subscription Keys**
   - Access your profile in the developer portal
   - Copy the Primary and Secondary Subscription Keys

3. **Create API User**
   - Generate API User ID and API Key
   - These are used for OAuth 2.0 authentication

## API Service

### MTNMoMoService

The main service class handles all MTN MoMo API interactions:

```typescript
import { mtnMomoService } from '../src/lib/mtnMomoService'

// Check if service is configured
if (mtnMomoService.isConfigured()) {
  // Service is ready to use
}

// Validate phone number
const isValid = mtnMomoService.validatePhoneNumber('0780123456')

// Create payment request
const paymentResponse = await mtnMomoService.requestPayment({
  amount: 50000,
  phoneNumber: '0780123456',
  externalId: 'ICUMBI_123456789',
  payerMessage: 'Rent payment for Property A',
  payeeNote: 'Icumbi - Property A'
})

// Check payment status
const status = await mtnMomoService.getPaymentStatus('ICUMBI_123456789')
```

### Methods

#### `requestPayment(paymentData)`
Creates a new payment request.

**Parameters:**
- `amount`: Payment amount in RWF
- `phoneNumber`: Customer's MTN phone number
- `externalId`: Unique transaction identifier
- `payerMessage`: Message shown to payer
- `payeeNote`: Internal note for the transaction

**Returns:** `MTNMoMoPaymentResponse`

#### `getPaymentStatus(externalId)`
Checks the status of a payment request.

**Parameters:**
- `externalId`: The external ID used when creating the payment

**Returns:** `MTNMoMoPaymentStatus`

#### `validatePhoneNumber(phoneNumber)`
Validates if a phone number is a valid MTN Rwanda number.

**Parameters:**
- `phoneNumber`: Phone number to validate

**Returns:** `boolean`

#### `getAccountBalance()`
Gets the account balance for the collection account.

**Returns:** `{ availableBalance: string, currency: string }`

## Error Handling

### Error Types

The integration includes comprehensive error handling with Kinyarwanda messages:

- **Authentication Errors**: Invalid credentials, expired tokens
- **Payment Errors**: Insufficient funds, invalid phone numbers, payment failures
- **Network Errors**: Connection issues, timeouts
- **Configuration Errors**: Missing API keys, invalid setup

### Error Messages

All error messages are provided in Kinyarwanda for better user experience:

```typescript
import { getMTNMoMoErrorMessage } from '../src/lib/mtnMomoErrors'

try {
  await mtnMomoService.requestPayment(paymentData)
} catch (error) {
  const userMessage = getMTNMoMoErrorMessage(error)
  // userMessage will be in Kinyarwanda
}
```

### Retry Logic

The service automatically retries certain types of errors:

- Network errors
- Timeouts
- Service unavailable errors
- Authentication failures

## Payment Flow

### 1. User Initiates Payment
- User selects MTN MoMo as payment method
- Enters phone number
- Confirms payment amount

### 2. Payment Request Creation
- System validates phone number
- Generates unique external ID
- Creates payment request via MTN MoMo API
- Shows USSD prompt to user

### 3. Payment Processing
- User dials *182*7*1# on their phone
- Follows USSD prompts to complete payment
- System polls payment status every 10 seconds

### 4. Payment Confirmation
- Payment status changes to SUCCESSFUL
- System records successful payment
- User receives confirmation

## Testing

### Test Suite

Run the built-in test suite to verify the integration:

```typescript
import { mtnMomoTestSuite } from '../src/lib/mtnMomoTest'

// Run all tests
const results = await mtnMomoTestSuite.runAllTests()

// Get test summary
const summary = mtnMomoTestSuite.getSummary()
console.log(`Tests: ${summary.passed}/${summary.total} passed`)
```

### Test Payment Flow

To test the complete payment flow:

```typescript
// Test with a valid MTN number
const paymentResults = await mtnMomoTestSuite.testPaymentFlow('0780123456', 100)
```

### Sandbox Testing

1. Use sandbox environment for testing
2. Test with MTN sandbox phone numbers
3. Verify all error scenarios
4. Test payment status polling

## Production Deployment

### Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Production API credentials obtained
- [ ] Callback URLs configured
- [ ] Error handling tested
- [ ] Payment flow tested end-to-end
- [ ] Monitoring and logging configured

### Environment Switch

To switch to production:

1. Update environment variables:
   ```bash
   EXPO_PUBLIC_MTN_MOMO_BASE_URL=https://api.momodeveloper.mtn.com
   EXPO_PUBLIC_MTN_MOMO_ENVIRONMENT=production
   ```

2. Update API keys to production values
3. Test with real MTN numbers
4. Monitor payment success rates

## Monitoring

### Key Metrics

- Payment success rate
- Average payment processing time
- Error rates by type
- API response times

### Logging

All API calls are logged with:
- Request/response data
- Error details
- Processing times
- User actions

## Security

### Data Protection

- Phone numbers are validated before sending
- External IDs are generated securely
- API keys are stored in environment variables
- No sensitive data is logged

### API Security

- OAuth 2.0 authentication
- HTTPS for all API calls
- Request validation
- Rate limiting compliance

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check API credentials
   - Verify subscription keys
   - Ensure API user is active

2. **Payment Not Processing**
   - Verify phone number format
   - Check account balance
   - Confirm USSD prompt was completed

3. **Status Polling Timeout**
   - Increase polling duration
   - Check network connectivity
   - Verify external ID is correct

### Debug Mode

Enable debug logging:

```typescript
// Set log level to debug
console.log('MTN MoMo Debug:', {
  configured: mtnMomoService.isConfigured(),
  configStatus: mtnMomoService.getConfigurationStatus()
})
```

## Support

For technical support:

1. Check the test suite results
2. Review error logs
3. Verify configuration
4. Test with sandbox environment
5. Contact MTN MoMo support if needed

## Changelog

### v1.0.0
- Initial MTN MoMo API integration
- Real-time payment processing
- Comprehensive error handling
- Kinyarwanda error messages
- Payment status polling
- Test suite implementation
