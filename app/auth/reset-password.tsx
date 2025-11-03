import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Dimensions, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText, ProgressBar } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/languageContext';

const { width } = Dimensions.get('window');

export default function ResetPasswordScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [validating, setValidating] = useState(true);

  // Get the token from the URL params
  useEffect(() => {
    if (!params?.token) {
      setError('Ibibikenewe ntibibashije kuboneka. Gerageza kongera.');
      setValidating(false);
      return;
    }
    setToken(params.token as string);
    validateToken(params.token as string);
  }, [params]);

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: tokenToValidate, 
          newPassword: 'temp_validation' 
        })
      });

      if (response.status === 400) {
        const data = await response.json();
        if (data.error?.includes('Token not found') || 
            data.error?.includes('expired') || 
            data.error?.includes('already been used')) {
          setError('Urugero rwawe rwabuze umwanya cyangwa rwakoze. Gerageza kongera.');
        } else {
          setTokenValid(true);
        }
      } else if (response.status === 200) {
        setTokenValid(true);
      } else {
        setError('Ibibikenewe ntibibashije kuboneka. Gerageza kongera.');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setError('Ibibikenewe ntibibashije kuboneka. Gerageza kongera.');
    } finally {
      setValidating(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError('');
    setSuccess(false);
    
    // Validate passwords
    if (!newPassword || !confirmPassword) {
      setError('Uzuza amajambo y\'ibanga yombi.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Ijambo ry\'ibanga rigomba kugira inyuguti 6 nibura.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Amajambo y\'ibanga ntabwo ahura.');
      return;
    }

    // Additional password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError('Ijambo ry\'ibanga rigomba kugira inyuguti nto, inyuguti nto, n\'imibare.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.replace('/auth/sign-in');
        }, 3000);
      } else {
        setError(data.error || 'Ntibyashoboye guhindura ijambo ry\'ibanga. Gerageza kongera.');
      }
    } catch (error) {
      console.error('Password update error:', error);
      setError('Ntibyashoboye guhindura ijambo ry\'ibanga. Gerageza kongera.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 0.2;
    
    let score = 0;
    if (password.length >= 8) score += 0.2;
    if (/[A-Z]/.test(password)) score += 0.2;
    if (/[a-z]/.test(password)) score += 0.2;
    if (/\d/.test(password)) score += 0.2;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 0.2;

    return Math.min(score, 1);
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (validating) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Birimo gusuzuma...</Text>
        </View>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Urugero rwawe rwabuze umwanya</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/auth/sign-in')}
            style={styles.button}
          >
            Subira inyuma
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior="height"
    >
      <ScrollView contentContainerStyle={styles.container}>
        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Ijambo ry'ibanga ryahindutse neza!</Text>
            <Text style={styles.successMessage}>
              Urashobora kwinjira ubu. Birimo kuguhereza kuri ahantu ho kwinjira...
            </Text>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.title}>Hindura ijambo ry'ibanga</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ijambo ry'ibanga rishya</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                placeholder="Andika ijambo ry'ibanga rishya"
                mode="outlined"
              />
              
              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <ProgressBar
                    progress={passwordStrength}
                    color={
                      passwordStrength < 0.4 ? '#ef4444' :
                      passwordStrength < 0.6 ? '#f59e0b' :
                      passwordStrength < 0.8 ? '#3b82f6' : '#10b981'
                    }
                    style={styles.strengthBar}
                  />
                  <Text style={styles.strengthText}>
                    {passwordStrength < 0.4 ? t('passwordWeak') :
                     passwordStrength < 0.6 ? t('passwordFair') :
                     passwordStrength < 0.8 ? t('passwordGood') : t('passwordStrong')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Emeza ijambo ry'ibanga</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                style={styles.input}
                placeholder="Andika ijambo ry'ibanga kongera"
                mode="outlined"
              />
            </View>

            {error ? (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={handleUpdatePassword}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Birimo guhindura...' : 'Hindura ijambo ry\'ibanga'}
            </Button>

            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>
                Ibikenewe kugira ijambo ry'ibanga cyiza:
              </Text>
              <Text style={styles.requirement}>• Inyuguti 6 nibura</Text>
              <Text style={styles.requirement}>• Inyuguti nto n'inyuguti nto</Text>
              <Text style={styles.requirement}>• Imibare (0-9)</Text>
              <Text style={styles.requirement}>• Inyuguti zitandukanye (ibintu byoherezwa)</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  requirementsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: '#1e40af',
    marginBottom: 4,
  },
});
