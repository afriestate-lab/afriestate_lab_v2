# MTN MoMo API Setup Guide

## Quick Start

### 1. Get MTN MoMo API Credentials

1. Visit [MTN MoMo Developer Portal](https://momoapi.mtn.com/)
2. Create developer account
3. Subscribe to Collections product
4. Get your subscription keys and API credentials

### 2. Configure Environment Variables

Copy `env.example` to `.env` and add your credentials:

```bash
# MTN MoMo API Configuration
EXPO_PUBLIC_MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
EXPO_PUBLIC_MTN_MOMO_SUBSCRIPTION_KEY=your-subscription-key
EXPO_PUBLIC_MTN_MOMO_API_USER_ID=your-api-user-id
EXPO_PUBLIC_MTN_MOMO_API_KEY=your-api-key
EXPO_PUBLIC_MTN_MOMO_ENVIRONMENT=sandbox

# Collection Keys
EXPO_PUBLIC_MTN_MOMO_COLLECTION_PRIMARY_KEY=your-primary-key
EXPO_PUBLIC_MTN_MOMO_COLLECTION_SECONDARY_KEY=your-secondary-key
```

### 3. Test the Integration

```typescript
import { mtnMomoTestSuite } from './src/lib/mtnMomoTest'

// Run tests
const results = await mtnMomoTestSuite.runAllTests()
console.log('Test Results:', results)
```

### 4. Use in Payment Flow

The integration is already active in your payment processor. Users can now:

1. Select MTN MoMo as payment method
2. Enter their MTN phone number
3. Complete payment via USSD (*182*7*1#)
4. Receive real-time confirmation

## Files Added/Modified

- ✅ `src/lib/mtnMomoService.ts` - Main API service
- ✅ `src/lib/mtnMomoErrors.ts` - Error handling
- ✅ `src/lib/mtnMomoTest.ts` - Test suite
- ✅ `app/payment-processor.tsx` - Updated payment flow
- ✅ `src/config.ts` - Added MTN MoMo config
- ✅ `env.example` - Added environment variables

## Next Steps

1. Add your API credentials to `.env`
2. Test with sandbox environment
3. Switch to production when ready
4. Monitor payment success rates

Done! 🎉
