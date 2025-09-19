import React, { useState } from 'react'
import { View, StyleSheet, Alert, ScrollView } from 'react-native'
import { Text, Button, TextInput, Card } from 'react-native-paper'
import { LinearGradient } from 'expo-linear-gradient'
import { config } from '@/config'

// Generate UUID without external library
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function MomoApiUserScreen() {
  const [subscriptionKey, setSubscriptionKey] = useState(
    config.MTN_MOMO.COLLECTION_SECONDARY_KEY || config.MTN_MOMO.SUBSCRIPTION_KEY || ''
  )
  const [callbackHost, setCallbackHost] = useState(config.MTN_MOMO.CALLBACK_URL || '')
  const [baseUrl] = useState(config.MTN_MOMO.BASE_URL || 'https://sandbox.momodeveloper.mtn.com')
  const [loading, setLoading] = useState(false)
  const [referenceId, setReferenceId] = useState('')
  const [apiUserId, setApiUserId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [env, setEnv] = useState('sandbox')

  const createCredentials = async () => {
    if (!subscriptionKey.trim()) {
      Alert.alert('Missing key', 'Enter your MTN MoMo subscription key')
      return
    }
    if (!callbackHost.trim()) {
      Alert.alert('Missing callback', 'Enter providerCallbackHost URL')
      return
    }

    const refId = generateUUID()
    setReferenceId(refId)
    setLoading(true)
    setApiUserId('')
    setApiKey('')

    try {
      // Step 1: Create API User (matches PHP: X-Reference-Id, Ocp-Apim-Subscription-Key, Content-Type)
      const createUserRes = await fetch(`${baseUrl}/v1_0/apiuser`, {
        method: 'POST',
        headers: {
          'X-Reference-Id': refId,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ providerCallbackHost: callbackHost })
      })

      if (createUserRes.status !== 201) {
        const errText = await createUserRes.text().catch(() => '')
        throw new Error(`API user create failed (${createUserRes.status}): ${errText}`)
      }

      setApiUserId(refId)

      // Small wait to allow backend propagation
      await new Promise(resolve => setTimeout(resolve, 2500))

      // Step 2: Create API Key
      const createKeyRes = await fetch(`${baseUrl}/v1_0/apiuser/${refId}/apikey`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ providerCallbackHost: callbackHost })
      })

      if (!createKeyRes.ok) {
        const errText = await createKeyRes.text().catch(() => '')
        throw new Error(`API key create failed (${createKeyRes.status}): ${errText}`)
      }

      const keyData = await createKeyRes.json()
      setApiKey(keyData.apiKey || '')
      setEnv(keyData.targetEnvironment || 'sandbox')
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>MTN MoMo - Create API User & Key</Text>
        <Text variant="bodyMedium" style={styles.headerSub}>Replicates the PHP cURL flow in React Native</Text>
      </LinearGradient>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Subscription Key (Primary or Secondary)"
            value={subscriptionKey}
            onChangeText={setSubscriptionKey}
            autoCapitalize='none'
            style={styles.input}
          />
          <TextInput
            label="providerCallbackHost"
            value={callbackHost}
            onChangeText={setCallbackHost}
            autoCapitalize='none'
            style={styles.input}
          />
          <Button mode="contained" onPress={createCredentials} loading={loading} disabled={loading}>
            Create API User & Key
          </Button>
        </Card.Content>
      </Card>

      {(apiUserId || apiKey) && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Generated Credentials</Text>
            {!!referenceId && <Text variant="bodySmall">Reference ID: {referenceId}</Text>}
            {!!apiUserId && <Text variant="bodySmall">API User ID: {apiUserId}</Text>}
            {!!apiKey && <Text variant="bodySmall">API Key: {apiKey}</Text>}
            {!!env && <Text variant="bodySmall">Environment: {env}</Text>}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold'
  },
  headerSub: {
    color: 'white',
    opacity: 0.9,
    marginTop: 4
  },
  card: {
    marginBottom: 16
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white'
  }
})


