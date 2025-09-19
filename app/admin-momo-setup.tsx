import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native'
import {
  Text,
  Button,
  Surface,
  TextInput,
  ActivityIndicator,
  Card,
  useTheme
} from 'react-native-paper'
import { LinearGradient } from 'expo-linear-gradient'
import { mtnMomoApiUserService } from '@/lib/mtnMomoApiUser'
import { mtnMomoApiUserTestSuite } from '@/lib/mtnMomoApiUserTest'
import { getMTNMoMoErrorMessage } from '@/lib/mtnMomoErrors'

interface AdminMomoSetupProps {
  onBack: () => void
}

export default function AdminMomoSetup({ onBack }: AdminMomoSetupProps) {
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])
  const [apiUserCredentials, setApiUserCredentials] = useState<{
    apiUserId: string
    apiKey: string
    referenceId: string
  } | null>(null)

  const handleRunTests = async () => {
    setLoading(true)
    try {
      const results = await mtnMomoApiUserTestSuite.runAllTests()
      setTestResults(results)
    } catch (error) {
      Alert.alert('Test Error', getMTNMoMoErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApiUser = async () => {
    setLoading(true)
    try {
      const credentials = await mtnMomoApiUserService.setupApiUser()
      setApiUserCredentials(credentials)
      Alert.alert(
        'Success',
        'API User and Key created successfully!\n\nSave these credentials securely.'
      )
    } catch (error) {
      Alert.alert('Error', getMTNMoMoErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCredentials = () => {
    if (apiUserCredentials) {
      const credentialsText = `API User ID: ${apiUserCredentials.apiUserId}\nAPI Key: ${apiUserCredentials.apiKey}\nReference ID: ${apiUserCredentials.referenceId}`
      // In a real app, you'd use Clipboard API here
      Alert.alert('Credentials', credentialsText)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return '#10b981'
      case 'FAIL': return '#ef4444'
      case 'SKIP': return '#6b7280'
      default: return '#6b7280'
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text variant="headlineSmall" style={styles.headerTitle}>
          MTN MoMo API Setup
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Create API users and test integration
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Configuration Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Configuration Status
            </Text>
            <Text variant="bodyMedium" style={styles.statusText}>
              {mtnMomoApiUserService.isConfigured() 
                ? '✅ All required configuration present'
                : '❌ Missing configuration - check environment variables'
              }
            </Text>
          </Card.Content>
        </Card>

        {/* Test Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Test Integration
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Run tests to verify MTN MoMo API configuration and connectivity.
            </Text>
            <Button
              mode="contained"
              onPress={handleRunTests}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Run Tests
            </Button>
          </Card.Content>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Test Results
              </Text>
              {testResults.map((result, index) => (
                <View key={index} style={styles.testResult}>
                  <View style={styles.testResultHeader}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(result.status) }
                    ]} />
                    <Text variant="bodyMedium" style={styles.testName}>
                      {result.test}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.testMessage}>
                    {result.message}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* API User Creation */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Create API User
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Create a new API user and generate API key for MTN MoMo integration.
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
          </Card.Content>
        </Card>

        {/* API Credentials */}
        {apiUserCredentials && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                API Credentials
              </Text>
              <Text variant="bodySmall" style={styles.warningText}>
                ⚠️ Save these credentials securely. They will not be shown again.
              </Text>
              <View style={styles.credentialsContainer}>
                <Text variant="bodyMedium" style={styles.credentialLabel}>
                  API User ID:
                </Text>
                <Text variant="bodySmall" style={styles.credentialValue}>
                  {apiUserCredentials.apiUserId}
                </Text>
                
                <Text variant="bodyMedium" style={styles.credentialLabel}>
                  API Key:
                </Text>
                <Text variant="bodySmall" style={styles.credentialValue}>
                  {apiUserCredentials.apiKey}
                </Text>
                
                <Text variant="bodyMedium" style={styles.credentialLabel}>
                  Reference ID:
                </Text>
                <Text variant="bodySmall" style={styles.credentialValue}>
                  {apiUserCredentials.referenceId}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={handleCopyCredentials}
                style={styles.button}
              >
                Copy Credentials
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Instructions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Next Steps
            </Text>
            <Text variant="bodyMedium" style={styles.instructionText}>
              1. Add the generated credentials to your .env file{'\n'}
              2. Update your app configuration{'\n'}
              3. Test payment processing{'\n'}
              4. Deploy to production when ready
            </Text>
          </Card.Content>
        </Card>

        {/* Back Button */}
        <Button
          mode="outlined"
          onPress={onBack}
          style={styles.backButton}
        >
          Back to Admin Panel
        </Button>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  headerSubtitle: {
    color: 'white',
    textAlign: 'center',
    opacity: 0.9
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
    marginBottom: 16,
    elevation: 2
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8
  },
  description: {
    marginBottom: 16,
    color: '#6b7280'
  },
  statusText: {
    fontWeight: '500'
  },
  button: {
    marginTop: 8
  },
  testResult: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  testName: {
    fontWeight: '500'
  },
  testMessage: {
    color: '#6b7280',
    marginLeft: 16
  },
  warningText: {
    color: '#f59e0b',
    fontWeight: '500',
    marginBottom: 12
  },
  credentialsContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  credentialLabel: {
    fontWeight: '500',
    marginTop: 8
  },
  credentialValue: {
    fontFamily: 'monospace',
    backgroundColor: '#e5e7eb',
    padding: 4,
    borderRadius: 4,
    marginTop: 2
  },
  instructionText: {
    lineHeight: 20,
    color: '#6b7280'
  },
  backButton: {
    marginTop: 16,
    marginBottom: 32
  }
})
