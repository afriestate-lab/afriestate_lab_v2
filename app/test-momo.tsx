import React, { useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { mtnMomoApiUserService } from '@/lib/mtnMomoApiUser'
import { getMTNMoMoErrorMessage } from '@/lib/mtnMomoErrors'

export default function TestMomo() {
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState<any>(null)

  const handleCreateApiUser = async () => {
    setLoading(true)
    try {
      const result = await mtnMomoApiUserService.setupApiUser()
      setCredentials(result)
      Alert.alert('Success!', `API User ID: ${result.apiUserId}\nAPI Key: ${result.apiKey}`)
    } catch (error) {
      Alert.alert('Error', getMTNMoMoErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall">MTN MoMo API Test</Text>
          <Text variant="bodyMedium" style={styles.description}>
            Create API user and key for MTN MoMo integration
          </Text>
          
          <Button
            mode="contained"
            onPress={handleCreateApiUser}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Create API User & Key
          </Button>
          
          {credentials && (
            <View style={styles.credentials}>
              <Text variant="titleMedium">Generated Credentials:</Text>
              <Text variant="bodySmall">API User ID: {credentials.apiUserId}</Text>
              <Text variant="bodySmall">API Key: {credentials.apiKey}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  card: {
    padding: 20
  },
  description: {
    marginVertical: 16
  },
  button: {
    marginVertical: 16
  },
  credentials: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  }
})
