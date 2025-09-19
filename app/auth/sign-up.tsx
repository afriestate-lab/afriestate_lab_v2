import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, Image, Modal as RNModal, Pressable, FlatList, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { API_ENDPOINTS } from '@/config';
import { useLanguage } from '@/lib/languageContext';
import IcumbiLogo from '../components/IcumbiLogo';

// ROLES will be defined inside the component to use translations

const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ onSuccess, onClose, onShowSignIn }: { onSuccess?: () => void, onClose?: () => void, onShowSignIn?: () => void } = {}) {
  
  const { t, currentLanguage } = useLanguage();
  
  const ROLES = [
    { label: t('tenant'), value: 'tenant' },
    { label: t('landlord'), value: 'landlord' },
    { label: t('manager'), value: 'manager' },
  ];
  
  // Debug mode - set to true to enable detailed logging
  const DEBUG_MODE = true;
  const [role, setRole] = useState<string>('tenant'); // Set default role to tenant
  const [roleModal, setRoleModal] = useState(false);
  const [identifierType, setIdentifierType] = useState<'phone' | 'email'>('phone');
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    password: '',
    confirmPassword: '',
    landlord_pin: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinValidating, setPinValidating] = useState(false);
  interface Landlord {
    name: string;
    email: string;
    invitation_id: string;
  }
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Test function for debugging
  const testSignUpFlow = async () => {
    if (DEBUG_MODE) {
      console.log('🧪 Testing sign-up flow...');
      console.log('🧪 Current form data:', formData);
      console.log('🧪 Current role:', role);
      console.log('🧪 API endpoints:', API_ENDPOINTS);
      
      // Test API connectivity
      try {
        const response = await fetch(API_ENDPOINTS.SIGNUP, {
          method: 'OPTIONS',
          headers: { 'Content-Type': 'application/json' },
        });
        console.log('🧪 API connectivity test:', response.status);
      } catch (error) {
        console.error('🧪 API connectivity test failed:', error);
      }
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    
    // Trigger PIN validation when either PIN or email changes
    if (name === 'landlord_pin' || name === 'email') {
      const currentPin = name === 'landlord_pin' ? value : formData.landlord_pin;
      const currentEmail = name === 'email' ? value : formData.email;
      
      if (currentPin && currentPin.length === 6 && currentEmail && /^\S+@\S+\.\S+$/.test(currentEmail)) {
        setPinValidating(true);
        console.log('Validating PIN:', currentPin, 'for email:', currentEmail);
        
        fetch(API_ENDPOINTS.VALIDATE_PIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: currentPin, email: currentEmail }),
        })
          .then(res => res.json())
          .then(result => {
            console.log('PIN validation result:', result);
            if (result.valid) {
              // Handle both local and production API response formats
              const invitationId = result.invitation?.id || result.invitation_id;
              const landlordName = result.landlord?.full_name || result.landlord?.name;
              const landlordEmail = result.landlord?.email;
              
              setSelectedLandlord({
                name: landlordName || 'Unknown',
                email: landlordEmail || 'Unknown',
                invitation_id: invitationId
              });
              console.log('PIN validation successful, landlord set:', {
                name: landlordName,
                email: landlordEmail,
                invitation_id: invitationId
              });
            } else {
              setSelectedLandlord(null);
              console.log('PIN validation failed:', result.error);
            }
          })
          .catch((error) => {
            console.error('PIN validation error:', error);
            setSelectedLandlord(null);
          })
          .finally(() => setPinValidating(false));
      } else if (name === 'landlord_pin' && value.length < 6) {
        setSelectedLandlord(null);
      }
    }
  };

  const validateForm = () => {
    if (!role) return setError(t('selectRole')), false;
    if (!formData.full_name.trim()) return setError(t('enterFullName')), false;
    
    // REQUIRE BOTH EMAIL AND PHONE NUMBER
    if (!formData.email.trim()) return setError(t('enterEmail')), false;
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return setError(t('invalidEmail')), false;
    
    if (!formData.phone_number.trim()) return setError(t('enterPhoneNumber')), false;
    
    // Clean and validate phone number
    const cleanedPhone = formData.phone_number.replace(/\D/g, '');
    if (!/^[0-9]{10}$/.test(cleanedPhone)) return setError(t('enterValidPhoneEmail')), false;
    
    if (formData.password.length < 6) return setError(currentLanguage === 'en' ? 'Password must be at least 6 characters.' : 'Ijambo ry\'ibanga rigomba kuba nibura inyuguti 6.'), false;
    if (formData.password !== formData.confirmPassword) return setError(currentLanguage === 'en' ? 'Passwords do not match.' : 'Amagambo y\'ibanga ntabwo ari kimwe.'), false;
    
    if (role === 'manager' && !formData.landlord_pin.trim()) return setError(currentLanguage === 'en' ? 'Enter landlord PIN.' : 'Andika PIN ya nyir\'inyubako.'), false;
    if (role === 'manager') {
      if (!formData.landlord_pin.trim()) {
         return setError(currentLanguage === 'en' ? 'Landlord PIN is required to register as manager.' : 'PIN ya nyir\'inyubako irakenewe kugirango ushobore kwiyandikisha.'), false;
      }
      if (formData.landlord_pin.trim().length !== 6 || !/^\d{6}$/.test(formData.landlord_pin.trim())) {
         return setError(currentLanguage === 'en' ? 'Landlord PIN must be exactly 6 digits.' : 'PIN ya nyir\'inyubako igomba kuba imibare 6 gusa.'), false;
      }
      if (!selectedLandlord) {
         return setError(currentLanguage === 'en' ? 'Invalid landlord PIN. Ask the landlord for the correct PIN.' : 'PIN ya nyir\'inyubako ntiyemewe. Saba nyir\'inyubako PIN ikwiye.'), false;
      }
    }
    return true;
  };

  const handleSignUp = async () => {
    if (DEBUG_MODE) console.log('🚀 Starting sign-up process...');
    setError('');
    setSuccess('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      console.log('Attempting signup with data:', {
        role,
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        landlord_pin: role === 'manager' ? formData.landlord_pin : undefined,
      });
      console.log('API endpoint:', API_ENDPOINTS.SIGNUP);
      
      // Create signup payload with all required fields
      const signupPayload = {
        role,
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phone_number.replace(/\D/g, ''),
        password: formData.password,
        // Include landlord_pin and invitation_id for managers
        ...(role === 'manager' && formData.landlord_pin && selectedLandlord ? {
          landlord_pin: formData.landlord_pin.trim(),
          invitation_id: selectedLandlord.invitation_id
        } : {})
      };

      console.log('📤 Signup payload:', {
        ...signupPayload,
        password: '[HIDDEN]' // Don't log password
      });

      // Additional validation before sending
      if (!signupPayload.full_name || !signupPayload.email || !signupPayload.phone_number || !signupPayload.password) {
        setError(currentLanguage === 'en' ? 'Fill all required fields (name, email, phone, password).' : 'Uzuza amakuru yose asabwa (amazina, imeri, telefoni, ijambo ry\'ibanga).');
        setLoading(false);
        return;
      }

      // Log the payload for debugging
      console.log('Payload created:', signupPayload);
    
      // Both email and phone are required for signup
      
      // Ensure we have a valid email for authentication
      if (!formData.email.trim()) {
        setError(currentLanguage === 'en' ? 'Email address is required for account creation.' : 'Imeri iba ngombwa mu gufungura konti.');
        setLoading(false);
        return;
      }
      
      const email = formData.email.trim().toLowerCase();
      console.log('🔐 Creating Supabase auth user with email:', email);
      
      // Create user in Supabase Auth
      console.log('🔐 Creating Supabase auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name.trim(),
            phone_number: formData.phone_number.trim(),
            role: role,
          }
        }
      });

      if (authError) {
        console.error('❌ Supabase auth error:', authError);
        
        if (authError.message.includes('already registered')) {
          setError(currentLanguage === 'en' ? 'This account already exists. Use your account or create another.' : 'Iyi konti isanzwe ihari. Koresha konti yawe cyangwa ufungure indi.');
        } else if (authError.message.includes('invalid email')) {
          setError(currentLanguage === 'en' ? 'Email or phone is invalid.' : 'Email cyangwa telefoni ntabwo ari neza.');
        } else if (authError.message.includes('weak password')) {
          setError(currentLanguage === 'en' ? 'Password must be stronger.' : 'Ijambo ry\'ibanga rigomba kuba rikomeye.');
        } else {
          setError(currentLanguage === 'en' ? 'Sign up failed. Please try again.' : 'Fungura konti byanze. Gerageza ongera.');
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        console.error('❌ No user returned from Supabase auth');
        setError(currentLanguage === 'en' ? 'Sign up failed. Please try again.' : 'Fungura konti byanze. Gerageza ongera.');
        setLoading(false);
        return;
      }

      console.log('✅ Supabase auth user created:', authData.user.id);
      
      // Create user record based on role
      console.log('📝 Creating user record based on role:', role);
      
      let userData;
      let userError = null;
      
      try {
        if (role === 'tenant') {
          // Create tenant_users record for tenants
          console.log('📝 Creating tenant_users record...');
          const { data: tenantUserData, error: tenantUserError } = await supabase
            .from('tenant_users')
            .insert({
              auth_user_id: authData.user.id,
              full_name: formData.full_name.trim(),
              email: email,
              phone_number: formData.phone_number.trim(),
              status: 'active'
            })
            .select()
            .single();

          if (tenantUserError) {
            console.error('❌ Tenant user creation failed:', tenantUserError.message);
            console.error('Error code:', tenantUserError.code);
            console.error('Error details:', tenantUserError.details);
            userError = tenantUserError;
          } else {
            console.log('✅ Tenant user record created:', tenantUserData.id);
          }
        } else {
          // Create users record for landlords and managers
          console.log('📝 Creating users record for', role);
          const { data: userRecordData, error: userRecordError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              role: role,
              full_name: formData.full_name.trim(),
              phone_number: formData.phone_number.trim(),
              email: email,
              avatar_url: null
            })
            .select()
            .single();

          if (userRecordError) {
            console.error('❌ User record creation failed:', userRecordError.message);
            console.error('Error code:', userRecordError.code);
            console.error('Error details:', userRecordError.details);
            userError = userRecordError;
          } else {
            console.log('✅ User record created:', userRecordData.id);
          }
        }
        
        // Create userData object
        userData = {
          id: authData.user.id,
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim(),
          email: email,
          role: role
        };
      } catch (error) {
        console.error('❌ Exception during user creation:', error);
        userError = error;
      }

      // If user creation failed, we cannot continue
      if (userError) {
        console.error('❌ CRITICAL: User record creation failed. Authentication will not work.');
        setError(currentLanguage === 'en' 
          ? 'Account creation failed. Please try again or contact support.' 
          : 'Fungura konti byanze. Gerageza ongera cyangwa hamagara ubufasha.');
        setLoading(false);
        return;
      }
      setSuccess(currentLanguage === 'en' ? 'Your account has been created! Signing you in...' : 'Konti yawe yafunguwe neza! Ubu urimo kwinjira...')
      
      // Create additional tenant records if needed
      try {
        if (userData.role === 'tenant') {
          console.log('🔧 Creating additional tenant records...');
          
          // Try to create tenants record
          try {
            const { data: tenantData, error: tenantError } = await supabase
              .from('tenants')
              .insert({
                tenant_user_id: userData.id, // Use the auth user ID
                full_name: userData.full_name,
                phone_number: userData.phone_number,
                email: userData.email,
                id_number: '', // Will be filled later
                emergency_contact: null,
                landlord_id: null // Will be set when assigned to a property
              })
              .select()
              .single();
              
            if (tenantError) {
              console.error('❌ Failed to create tenants record:', tenantError);
              console.error('Error code:', tenantError.code);
              console.error('Error details:', tenantError.details);
            } else {
              console.log('✅ Created tenants record:', tenantData.id);
            }
          } catch (error) {
            console.error('❌ Exception creating tenants record:', error);
          }
        } else {
          console.log('✅ No additional records needed for', userData.role);
        }
      } catch (verifyError) {
        console.error('❌ Additional record creation error:', verifyError);
        // Continue with auto-login anyway
      }
      
      // User is already authenticated from the signup process, so we're done
      console.log('✅ Signup completed successfully. User is authenticated.');
      setSuccess(currentLanguage === 'en' ? 'Account created! Signing you in...' : 'Konti yafunguwe neza! Ubu urimo kwinjira...')
      
      // Clear form data
      setFormData({
        full_name: '',
        phone_number: '',
        email: '',
        password: '',
        confirmPassword: '',
        landlord_pin: '',
      })
      setRole('tenant') // Reset to default role
      setSelectedLandlord(null)
      
      // Navigate to main app after successful signup
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          router.replace('/')
        }
      }, 1500)
      
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      
      if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
        setError(currentLanguage === 'en' ? 'Network request failed. Please check your internet and try again.' : 'Ntibyashoboye gufata serivisi. Nyamuneka reba internet yawe hanyuma ugerageze ongera.');
      } else if (error.message?.includes('database') || error.message?.includes('supabase')) {
        setError(currentLanguage === 'en' ? 'There was a database error. Please try again.' : 'Habaye ikosa muri ububiko bw\'amakuru. Gerageza ongera.');
      } else {
        setError(currentLanguage === 'en' ? 'There was an error creating your account. Please try again.' : 'Habaye ikosa mu gufungura konti. Gerageza ongera.');
      }
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { 
            if (onClose) {
              onClose(); 
            } else {
              router.back();
            }
          }}>
            <Image source={{uri: 'https://img.icons8.com/ios-filled/50/2563eb/left.png'}} style={styles.backIcon} />
          </TouchableOpacity>
          {/* Logo and Title */}
          <View style={styles.logoContainer}>
            <IcumbiLogo width={60} height={60} />
          </View>
          <Text style={styles.title}>{t('signUp')}</Text>
          {/* Role Dropdown */}
          <TouchableOpacity style={styles.dropdown} onPress={() => setRoleModal(true)}>
            <Text style={styles.dropdownText}>{ROLES.find(r => r.value === role)?.label}</Text>
            <Image source={{uri: 'https://img.icons8.com/ios-filled/50/2563eb/expand-arrow--v1.png'}} style={styles.dropdownIcon} />
          </TouchableOpacity>
          {/* Modal Picker for Role */}
          <RNModal
            visible={roleModal}
            transparent
            animationType="fade"
            onRequestClose={() => setRoleModal(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setRoleModal(false)}>
              <View style={styles.modalCard}>
                <FlatList
                  data={ROLES}
                  keyExtractor={item => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalOption, role === item.value && styles.modalOptionActive]}
                      onPress={() => { setRole(item.value); setRoleModal(false); }}
                    >
                      <Text style={[styles.modalOptionText, role === item.value && styles.modalOptionTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </Pressable>
          </RNModal>
          {/* Inputs */}
          <TextInput
            label={t('fullName')}
            value={formData.full_name}
            onChangeText={v => handleInputChange('full_name', v)}
            style={styles.input}
            left={<TextInput.Icon icon="account-outline" />}
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          
          {/* Email - REQUIRED */}
          <TextInput
            label={t('email')}
            value={formData.email}
            onChangeText={text => handleInputChange('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="email-outline" />}
            placeholder="example@example.com"
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          
          {/* Phone Number - REQUIRED */}
          <TextInput
            label={t('phoneNumber')}
            value={formData.phone_number}
            onChangeText={text => handleInputChange('phone_number', text)}
            keyboardType="phone-pad"
            style={styles.input}
            left={<TextInput.Icon icon="phone-outline" />}
            placeholder="0781234567"
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          <TextInput
            label={t('password')}
            value={formData.password}
            onChangeText={v => handleInputChange('password', v)}
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          <TextInput
            label={t('confirmPassword')}
            value={formData.confirmPassword}
            onChangeText={v => handleInputChange('confirmPassword', v)}
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off' : 'eye'} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />}
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          {role === 'manager' && (
            <>
              <TextInput
                label={t('landlordPinLabel')}
                value={formData.landlord_pin}
                onChangeText={v => handleInputChange('landlord_pin', v)}
                keyboardType="number-pad"
                style={styles.input}
                left={<TextInput.Icon icon="key-outline" />}
                right={pinValidating ? <ActivityIndicator animating size="small" /> : null}
                theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
              />
              <HelperText type="info" visible={true}>
                Saba nyirinyubako PIN yihariye kugira ngo wiyandikishe nk'umuyobozi.
              </HelperText>
            </>
          )}
          <HelperText type="error" visible={!!error}>{error}</HelperText>
          <HelperText type="info" visible={!!success}>{success}</HelperText>
          {/* Sign Up Button */}
          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading || !role || !formData.full_name || !formData.phone_number || !formData.password || !formData.confirmPassword}
            style={[styles.gradientBtn, (!role || !formData.full_name || !formData.phone_number || !formData.password || !formData.confirmPassword) && styles.btnDisabled]}
            contentStyle={styles.gradientBtnContent}
            labelStyle={styles.gradientBtnLabel}
          >
            {t('signUp')}
          </Button>
          
          {/* Debug button removed for production UI */}
        </View>
      </ScrollView>
      {/* Sign In Link */}
      <TouchableOpacity onPress={() => {
        if (onShowSignIn) {
          onShowSignIn();
        } else {
          router.replace('/auth/sign-in');
        }
      }} style={styles.signinLinkRow}>
        <Text style={styles.signinLink}>{currentLanguage === 'en' ? 'Have an account? Sign In' : 'Ufite konti? Injira'}</Text>
      </TouchableOpacity>
      <Text style={styles.copyright}>{currentLanguage === 'en' ? `© ${new Date().getFullYear()} Icumbi. All rights reserved.` : `© ${new Date().getFullYear()} Icumbi. Uburenganzira bwose burabitswe.`}</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fa' },
  bgGradient: { position: 'absolute', top: 0, left: 0, width, height, backgroundColor: 'rgba(37,99,235,0.07)' },
  cardShadow: { shadowColor: '#a21caf', shadowOpacity: 0.18, shadowRadius: 24, elevation: 12, borderRadius: 32 },
  card: { 
    width: width * 0.92, 
    maxWidth: 400, 
    backgroundColor: '#fff', 
    borderRadius: width <= 768 ? 20 : 32, 
    padding: width <= 768 ? 20 : 24, 
    alignItems: 'center', 
    marginVertical: width <= 768 ? 12 : 16 
  },
  backBtn: { position: 'absolute', top: 14, left: 14, zIndex: 10, padding: 4 },
  backIcon: { width: 24, height: 24, tintColor: '#2563eb' },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  title: { 
    fontWeight: 'bold', 
    fontSize: width <= 768 ? 20 : 22, 
    color: '#2563eb', 
    marginBottom: width <= 768 ? 10 : 12 
  },
  dropdown: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#2563eb', 
    borderRadius: width <= 768 ? 16 : 20, 
    paddingHorizontal: width <= 768 ? 14 : 16, 
    paddingVertical: width <= 768 ? 6 : 8, 
    marginBottom: width <= 768 ? 10 : 12, 
    backgroundColor: '#f3f6fd', 
    width: '100%', 
    justifyContent: 'space-between' 
  },
  dropdownText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  dropdownIcon: { width: 18, height: 18, tintColor: '#2563eb' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: width * 0.8, maxWidth: 340 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12 },
  modalOptionActive: { backgroundColor: '#f3f6fd' },
  modalOptionText: { color: '#2563eb', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  modalOptionTextActive: { color: '#a21caf' },
  input: { 
    width: '100%', 
    marginBottom: width <= 768 ? 8 : 10, 
    backgroundColor: '#fff', 
    borderRadius: width <= 768 ? 12 : 16, 
    color: '#333', 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    fontSize: width <= 768 ? 14 : 16,
  },
  gradientBtn: { 
    width: '100%', 
    marginTop: width <= 768 ? 8 : 10, 
    borderRadius: width <= 768 ? 20 : 24, 
    backgroundColor: '#2563eb' 
  },
  btnDisabled: { backgroundColor: '#b3cdfd' },
  gradientBtnContent: { height: width <= 768 ? 44 : 48 },
  gradientBtnLabel: { 
    fontWeight: 'bold', 
    fontSize: width <= 768 ? 15 : 16, 
    color: '#fff' 
  },
  signinLinkRow: { alignItems: 'center', marginTop: 18, marginBottom: 4 },
  signinLink: { color: '#a21caf', fontWeight: 'bold', fontSize: 15 },
  copyright: { color: '#666', fontSize: 12, marginTop: 10, textAlign: 'center' },
}); 