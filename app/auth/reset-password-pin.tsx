import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Dimensions, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, HelperText, ProgressBar } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/languageContext';
import IcumbiLogo from '../components/IcumbiLogo';

const { width } = Dimensions.get('window');

type ResetStep = 'identifier' | 'pin' | 'password';

export default function ResetPasswordPinScreen() {
  const { t, currentLanguage } = useLanguage();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<ResetStep>('identifier');
  
  // Identifier input (email or phone)
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [isIdentifierLoading, setIsIdentifierLoading] = useState(false);
  
  // PIN verification
  const [pin, setPin] = useState('');
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [pinToken, setPinToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  // New password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  
  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const generateSecurePin = (): string => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const validateEmail = (email: string): boolean => {
    return /^\S+@\S+\.\S+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleanedPhone = phone.replace(/\D/g, '');
    return /^[0-9]{10}$/.test(cleanedPhone);
  };

  const formatPhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  const lookupUserByIdentifier = async (identifier: string, type: 'email' | 'phone') => {
    try {
      let query = supabase.from('users').select('id, email, phone_number, full_name');
      
      if (type === 'email') {
        query = query.eq('email', identifier.toLowerCase().trim()).limit(1);
      } else {
        const formattedPhone = formatPhoneNumber(identifier);
        query = query.eq('phone_number', formattedPhone).limit(1);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('User lookup error:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Exception during user lookup:', error);
      return null;
    }
  };

  const sendEmailWithPin = async (email: string, pin: string, fullName: string) => {
    try {
      console.log(`[DEBUG] Sending PIN ${pin} to ${email} for user ${fullName}`);
      
      // Call the Supabase Edge Function to send the reset PIN email
      const { data, error } = await supabase.functions.invoke('send-reset-pin-email', {
        body: {
          email: email,
          pin: pin,
          fullName: fullName,
          language: currentLanguage
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Failed to send email via Edge Function');
      }

      if (!data.success) {
        console.error('Email service error:', data);
        throw new Error(data.message || 'Email service failed');
      }

      console.log('Email sent successfully:', data);
      
      // For development/testing, still show the PIN in the UI as backup
      if (__DEV__) {
        Alert.alert(
          'Development Mode', 
          `PIN sent to ${email}: ${pin}\n\nEmail Result: ${data.data?.email_result?.method || 'unknown'}`,
          [{ text: 'OK' }]
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      
      // For development, still show the PIN even if email fails
      if (__DEV__) {
        Alert.alert(
          'Email Service Error', 
          `Failed to send email, but here's your PIN for testing: ${pin}\n\nError: ${error.message}`,
          [{ text: 'OK' }]
        );
        return true; // Allow the flow to continue in development
      }
      
      return false;
    }
  };

  const handleSendPin = async () => {
    setError('');
    setSuccess('');
    setIsIdentifierLoading(true);

    try {
      // Validate identifier format
      if (identifierType === 'email' && !validateEmail(identifier)) {
        setError(currentLanguage === 'en' ? 'Please enter a valid email address.' : 'Andika imeri nyayo.');
        setIsIdentifierLoading(false);
        return;
      }

      if (identifierType === 'phone' && !validatePhone(identifier)) {
        setError(currentLanguage === 'en' ? 'Please enter a valid 10-digit phone number.' : 'Andika numero ya telefoni nyayo (imibare 10).');
        setIsIdentifierLoading(false);
        return;
      }

      // Look up user by identifier
      const user = await lookupUserByIdentifier(identifier, identifierType);
      
      if (!user) {
        setError(currentLanguage === 'en' ? 'No account found with this email/phone number.' : 'Nta konti yabonetse ifite iyi imeri/telefoni.');
        setIsIdentifierLoading(false);
        return;
      }

      if (!user.email) {
        setError(currentLanguage === 'en' ? 'This account does not have an email address. Please contact support.' : 'Iyi konti ntifite imeri. Hamagara ubufasha.');
        setIsIdentifierLoading(false);
        return;
      }

      // Generate secure 5-digit PIN
      const generatedPin = generateSecurePin();
      
      // Store PIN in database with expiration (15 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token: `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          token_type: 'email',
          pin: generatedPin,
          expires_at: expiresAt.toISOString(),
          email_identifier: user.email,
          phone_identifier: identifierType === 'phone' ? formatPhoneNumber(identifier) : null,
          verification_attempts: 0,
          is_verified: false
        })
        .select()
        .single();

      if (tokenError) {
        console.error('Error creating reset token:', tokenError);
        setError(currentLanguage === 'en' ? 'Failed to create reset request. Please try again.' : 'Ntibyashoboye gukora ubusaba bwo guhindura ijambo ry\'ibanga.');
        setIsIdentifierLoading(false);
        return;
      }

      // Send PIN via email
      const emailSent = await sendEmailWithPin(user.email, generatedPin, user.full_name || 'User');
      
      if (!emailSent) {
        setError(currentLanguage === 'en' ? 'Failed to send verification email. Please try again.' : 'Ntibyashoboye kohereza imeri yo kwemeza. Gerageza kongera.');
        setIsIdentifierLoading(false);
        return;
      }

      // Store token and email for next step
      setPinToken(tokenData.token);
      setUserEmail(user.email);
      
      // Set success message based on how user initiated reset
      if (identifierType === 'phone') {
        setSuccess(
          currentLanguage === 'en' 
            ? `A verification PIN was sent to the email used when creating this account: ${user.email}`
            : `Umubare w'kwemeza woherejwe kuri imeri yakoreshejwe mukugirango konti: ${user.email}`
        );
      } else {
        setSuccess(
          currentLanguage === 'en'
            ? `A 5-digit verification PIN has been sent to ${user.email}`
            : `Umubare w'kwemeza w'imibare 5 woherejwe kuri ${user.email}`
        );
      }

      // Move to PIN verification step
      setCurrentStep('pin');
      setResendCountdown(60); // 60 seconds before allowing resend
      
    } catch (error) {
      console.error('Error in handleSendPin:', error);
      setError(currentLanguage === 'en' ? 'An unexpected error occurred. Please try again.' : 'Habaye ikosa mu byasabwa. Gerageza kongera.');
    } finally {
      setIsIdentifierLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    setError('');
    setIsPinLoading(true);

    try {
      if (!pin || pin.length !== 5) {
        setError(currentLanguage === 'en' ? 'Please enter the 5-digit PIN.' : 'Andika umubare w\'imibare 5.');
        setIsPinLoading(false);
        return;
      }

      // Verify PIN in database
      const { data: tokenData, error: verifyError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', pinToken)
        .eq('pin', pin)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (verifyError || !tokenData) {
        // Increment verification attempts
        await supabase
          .from('password_reset_tokens')
          .update({ 
            verification_attempts: 1 // Will be incremented by the function
          })
          .eq('token', pinToken);

        setError(currentLanguage === 'en' ? 'Invalid or expired PIN. Please check your email and try again.' : 'Umubare si wo cyangwa wabuze umwanya. Reba imeri yawe ukongere ugerageze.');
        setIsPinLoading(false);
        return;
      }

      // Check verification attempts limit
      if (tokenData.verification_attempts >= 3) {
        setError(currentLanguage === 'en' ? 'Too many incorrect attempts. Please request a new PIN.' : 'Wagerageje kenshi cyane. Saba umubare mushya.');
        setIsPinLoading(false);
        return;
      }

      // Mark PIN as verified
      const { error: updateError } = await supabase
        .from('password_reset_tokens')
        .update({ is_verified: true })
        .eq('token', pinToken);

      if (updateError) {
        console.error('Error marking PIN as verified:', updateError);
        setError(currentLanguage === 'en' ? 'Verification failed. Please try again.' : 'Kwemeza byanze. Gerageza kongera.');
        setIsPinLoading(false);
        return;
      }

      setSuccess(currentLanguage === 'en' ? 'PIN verified successfully! Now set your new password.' : 'Umubare wemejwe neza! Ubu shyiraho ijambo ry\'ibanga rishya.');
      setCurrentStep('password');

    } catch (error) {
      console.error('Error in handleVerifyPin:', error);
      setError(currentLanguage === 'en' ? 'An unexpected error occurred. Please try again.' : 'Habaye ikosa mu byasabwa. Gerageza kongera.');
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError('');
    setSuccess('');
    setIsPasswordLoading(true);

    try {
      // Validate passwords
      if (!newPassword || !confirmPassword) {
        setError(currentLanguage === 'en' ? 'Please fill in both password fields.' : 'Uzuza amajambo y\'ibanga yombi.');
        setIsPasswordLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setError(currentLanguage === 'en' ? 'Password must be at least 6 characters long.' : 'Ijambo ry\'ibanga rigomba kugira inyuguti 6 nibura.');
        setIsPasswordLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(currentLanguage === 'en' ? 'Passwords do not match.' : 'Amajambo y\'ibanga ntabwo ahura.');
        setIsPasswordLoading(false);
        return;
      }

      // Additional password strength validation
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        setError(currentLanguage === 'en' ? 'Password must contain uppercase, lowercase, and numbers.' : 'Ijambo ry\'ibanga rigomba kugira inyuguti nkuru, inyuguti nto, n\'imibare.');
        setIsPasswordLoading(false);
        return;
      }

      // Get verified token data
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('user_id')
        .eq('token', pinToken)
        .eq('is_verified', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        setError(currentLanguage === 'en' ? 'Reset session expired. Please start over.' : 'Igihe cy\'uguhindura cyarangiye. Tangira ongera.');
        setIsPasswordLoading(false);
        return;
      }

      // Update password in Supabase Auth using Edge Function
      // Note: This requires an Edge Function since mobile clients don't have admin access
      const { data: updateData, error: updateError } = await supabase.functions.invoke('update-user-password', {
        body: {
          userId: tokenData.user_id,
          newPassword: newPassword,
          resetToken: pinToken
        }
      });

      if (updateError || !updateData?.success) {
        console.error('Error updating password:', updateError || updateData);
        setError(currentLanguage === 'en' ? 'Failed to update password. Please try again.' : 'Ntibyashoboye guhindura ijambo ry\'ibanga. Gerageza kongera.');
        setIsPasswordLoading(false);
        return;
      }

      // Mark token as used
      await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', pinToken);

      setSuccess(currentLanguage === 'en' ? 'Password updated successfully! You can now sign in with your new password.' : 'Ijambo ry\'ibanga ryahinduwe neza! Urashobora kwinjira ukoresheje ijambo ry\'ibanga rishya.');

      // Navigate to sign-in after 3 seconds
      setTimeout(() => {
        router.replace('/auth/sign-in');
      }, 3000);

    } catch (error) {
      console.error('Error in handleUpdatePassword:', error);
      setError(currentLanguage === 'en' ? 'An unexpected error occurred. Please try again.' : 'Habaye ikosa mu byasabwa. Gerageza kongera.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleResendPin = async () => {
    if (resendCountdown > 0) return;
    
    setError('');
    setResendCountdown(60);
    
    // Generate new PIN and resend
    await handleSendPin();
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

  const renderIdentifierStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {currentLanguage === 'en' ? 'Reset Password' : 'Subiza Ijambo ry\'ibanga'}
      </Text>
      
      <Text style={styles.stepDescription}>
        {currentLanguage === 'en' 
          ? 'Enter your email or phone number to receive a verification PIN'
          : 'Andika imeri cyangwa telefoni yawe kugira ngo uhabwe umubare w\'kwemeza'
        }
      </Text>

      {/* Identifier Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, identifierType === 'email' && styles.toggleButtonActive]}
          onPress={() => setIdentifierType('email')}
        >
          <Text style={[styles.toggleText, identifierType === 'email' && styles.toggleTextActive]}>
            {currentLanguage === 'en' ? 'Email' : 'Imeri'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toggleButton, identifierType === 'phone' && styles.toggleButtonActive]}
          onPress={() => setIdentifierType('phone')}
        >
          <Text style={[styles.toggleText, identifierType === 'phone' && styles.toggleTextActive]}>
            {currentLanguage === 'en' ? 'Phone' : 'Telefoni'}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        label={identifierType === 'email' 
          ? (currentLanguage === 'en' ? 'Email Address' : 'Imeri') 
          : (currentLanguage === 'en' ? 'Phone Number' : 'Numero ya Telefoni')
        }
        value={identifier}
        onChangeText={setIdentifier}
        keyboardType={identifierType === 'email' ? 'email-address' : 'phone-pad'}
        autoCapitalize={identifierType === 'email' ? 'none' : undefined}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon={identifierType === 'email' ? 'email-outline' : 'phone-outline'} />}
        placeholder={identifierType === 'email' ? 'example@example.com' : '0781234567'}
        theme={{ colors: { primary: '#2563eb' } }}
      />

      {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}
      {success ? <HelperText type="info" visible={!!success}>{success}</HelperText> : null}

      <Button
        mode="contained"
        onPress={handleSendPin}
        loading={isIdentifierLoading}
        disabled={isIdentifierLoading || !identifier.trim()}
        style={styles.button}
      >
        {t('sendVerificationCode')}
      </Button>
    </View>
  );

  const renderPinStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {t('verifyPin')}
      </Text>
      
      <Text style={styles.stepDescription}>
        {currentLanguage === 'en' 
          ? `Enter the 5-digit PIN sent to ${userEmail}`
          : `Andika umubare w'imibare 5 woherejwe kuri ${userEmail}`
        }
      </Text>

      <TextInput
        label={currentLanguage === 'en' ? '5-Digit PIN' : 'Umubare w\'imibare 5'}
        value={pin}
        onChangeText={(text) => setPin(text.replace(/\D/g, '').substring(0, 5))}
        keyboardType="numeric"
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="shield-key-outline" />}
        placeholder="12345"
        maxLength={5}
        theme={{ colors: { primary: '#2563eb' } }}
      />

      {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}
      {success ? <HelperText type="info" visible={!!success}>{success}</HelperText> : null}

      <Button
        mode="contained"
        onPress={handleVerifyPin}
        loading={isPinLoading}
        disabled={isPinLoading || pin.length !== 5}
        style={styles.button}
      >
        {t('verifyPin')}
      </Button>

      {/* Resend PIN */}
      <TouchableOpacity 
        onPress={handleResendPin}
        disabled={resendCountdown > 0}
        style={styles.resendButton}
      >
        <Text style={[styles.resendText, resendCountdown > 0 && styles.resendTextDisabled]}>
          {resendCountdown > 0 
            ? `${t('resendIn')} ${resendCountdown}s`
            : t('resendPin')
          }
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => setCurrentStep('identifier')}
        style={styles.backButton}
      >
        <Text style={styles.backText}>
          ← {t('back')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {t('newPassword')}
      </Text>
      
      <Text style={styles.stepDescription}>
        {t('createStrongPassword')}
      </Text>

      <TextInput
        label={t('newPassword')}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry={!showPassword}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="lock-outline" />}
        right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
        theme={{ colors: { primary: '#2563eb' } }}
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
             passwordStrength < 0.8 ? t('passwordGood') : 
             t('passwordStrong')}
          </Text>
        </View>
      )}

      <TextInput
        label={t('confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="lock-check-outline" />}
        right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off' : 'eye'} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />}
        theme={{ colors: { primary: '#2563eb' } }}
      />

      {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}
      {success ? <HelperText type="info" visible={!!success}>{success}</HelperText> : null}

      <Button
        mode="contained"
        onPress={handleUpdatePassword}
        loading={isPasswordLoading}
        disabled={isPasswordLoading || !newPassword || !confirmPassword}
        style={styles.button}
      >
        {currentLanguage === 'en' ? 'Update Password' : 'Hindura ijambo ry\'ibanga'}
      </Button>

      {/* Password requirements */}
      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementsTitle}>
          {currentLanguage === 'en' ? 'Password Requirements:' : 'Ibikenewe mu jambo ry\'ibanga:'}
        </Text>
        <Text style={styles.requirement}>• {currentLanguage === 'en' ? 'At least 6 characters' : 'Inyuguti 6 nibura'}</Text>
        <Text style={styles.requirement}>• {currentLanguage === 'en' ? 'Uppercase and lowercase letters' : 'Inyuguti nkuru n\'inyuguti nto'}</Text>
        <Text style={styles.requirement}>• {currentLanguage === 'en' ? 'Numbers (0-9)' : 'Imibare (0-9)'}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="height"
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Back button */}
          <TouchableOpacity 
            style={styles.headerBackBtn} 
            onPress={() => router.back()}
          >
            <Text style={styles.headerBackText}>← {currentLanguage === 'en' ? 'Back' : 'Subira'}</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <IcumbiLogo width={60} height={60} />
          </View>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, currentStep === 'identifier' && styles.stepDotActive]} />
            <View style={[styles.stepDot, currentStep === 'pin' && styles.stepDotActive]} />
            <View style={[styles.stepDot, currentStep === 'password' && styles.stepDotActive]} />
          </View>

          {/* Render current step */}
          {currentStep === 'identifier' && renderIdentifierStep()}
          {currentStep === 'pin' && renderPinStep()}
          {currentStep === 'password' && renderPasswordStep()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    alignItems: 'center',
  },
  headerBackBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  headerBackText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  stepDotActive: {
    backgroundColor: '#2563eb',
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    color: '#64748b',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
  },
  resendButton: {
    marginTop: 16,
    padding: 8,
  },
  resendText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resendTextDisabled: {
    color: '#94a3b8',
  },
  backButton: {
    marginTop: 8,
    padding: 8,
  },
  backText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  strengthContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
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
  requirementsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    width: '100%',
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