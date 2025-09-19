// Simple script to create MTN MoMo API User

const config = {
  baseUrl: 'https://sandbox.momodeveloper.mtn.com',
  subscriptionKey: '26dcf9a019924b9aa43f84d6b3dd016e',
  callbackUrl: 'https://icumbi.com/api/momo/callback'
};

async function createApiUser() {
  try {
    // Generate unique reference ID
    const referenceId = `ICUMBI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🚀 Creating MTN MoMo API User...');
    console.log('Reference ID:', referenceId);
    
    // Create API User
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
      throw new Error(`API User creation failed: ${userResponse.status} ${userResponse.statusText}`);
    }
    
    console.log('✅ API User created successfully!');
    console.log('API User ID:', referenceId);
    
    // Wait for API user to be fully created
    console.log('⏳ Waiting for API user to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create API Key
    console.log('🔑 Creating API Key...');
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
      throw new Error(`API Key creation failed: ${keyResponse.status} ${keyResponse.statusText}`);
    }
    
    const keyData = await keyResponse.json();
    
    console.log('✅ API Key created successfully!');
    console.log('\n🎉 CREDENTIALS GENERATED:');
    console.log('================================');
    console.log('API User ID:', referenceId);
    console.log('API Key:', keyData.apiKey);
    console.log('================================');
    console.log('\n📝 Add these to your .env file:');
    console.log(`EXPO_PUBLIC_MTN_MOMO_API_USER_ID=${referenceId}`);
    console.log(`EXPO_PUBLIC_MTN_MOMO_API_KEY=${keyData.apiKey}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createApiUser();
