// Simple script to create MTN MoMo API User and Key
// Run with: node create-momo-credentials.js

const config = {
  baseUrl: 'https://sandbox.momodeveloper.mtn.com',
  subscriptionKey: '26dcf9a019924b9aa43f84d6b3dd016e',
  callbackUrl: 'https://afriestate.com/api/momo/callback'
};

async function createMomoCredentials() {
  try {
    console.log('🚀 Creating MTN MoMo API User and Key...');
    console.log('=====================================');
    
    // Generate unique reference ID
    const referenceId = `AFRIESTATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('📝 Reference ID:', referenceId);
    
    // Step 1: Create API User
    console.log('\n1️⃣ Creating API User...');
    const userResponse = await fetch(`${config.baseUrl}/v1_0/apiuser`, {
      method: 'POST',
      headers: {
        'X-Reference-Id': referenceId,
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        providerCallbackHost: config.callbackUrl
      })
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`API User creation failed: ${userResponse.status} ${userResponse.statusText}\n${errorText}`);
    }
    
    console.log('✅ API User created successfully!');
    console.log('   API User ID:', referenceId);
    
    // Step 2: Wait for API user to be ready
    console.log('\n⏳ Waiting for API user to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Create API Key
    console.log('\n2️⃣ Creating API Key...');
    const keyResponse = await fetch(`${config.baseUrl}/v1_0/apiuser/${referenceId}/apikey`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        providerCallbackHost: config.callbackUrl
      })
    });
    
    if (!keyResponse.ok) {
      const errorText = await keyResponse.text();
      throw new Error(`API Key creation failed: ${keyResponse.status} ${keyResponse.statusText}\n${errorText}`);
    }
    
    const keyData = await keyResponse.json();
    console.log('✅ API Key created successfully!');
    
    // Step 4: Display credentials
    console.log('\n🎉 CREDENTIALS GENERATED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('API User ID:', referenceId);
    console.log('API Key:', keyData.apiKey);
    console.log('Environment:', keyData.targetEnvironment);
    console.log('=====================================');
    
    // Step 5: Show how to add to config
    console.log('\n📝 Add these to your src/config.ts file:');
    console.log('=====================================');
    console.log(`API_USER_ID: process.env.EXPO_PUBLIC_MTN_MOMO_API_USER_ID || '${referenceId}',`);
    console.log(`API_KEY: process.env.EXPO_PUBLIC_MTN_MOMO_API_KEY || '${keyData.apiKey}',`);
    console.log('=====================================');
    
    console.log('\n✅ MTN MoMo integration is now ready!');
    
  } catch (error) {
    console.error('❌ Error creating credentials:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Check your internet connection');
    console.log('- Verify the subscription key is correct');
    console.log('- Make sure you have access to MTN MoMo sandbox');
  }
}

// Run the script
createMomoCredentials();
