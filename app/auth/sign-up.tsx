import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, Image, Modal as RNModal, Pressable, FlatList, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { API_ENDPOINTS } from '@/config';

const ROLES = [
  { label: 'Umukodesha', value: 'tenant' },
  { label: "Nyirinyubako", value: 'landlord' },
  { label: 'Umuyobozi', value: 'manager' },
];

const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ onSuccess, onClose, onShowSignIn }: { onSuccess?: () => void, onClose?: () => void, onShowSignIn?: () => void } = {}) {
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
    if (!role) return setError('Hitamo uruhare rwawe.'), false;
    if (!formData.full_name.trim()) return setError('Andika amazina yawe yuzuye.'), false;
    
    // REQUIRE BOTH EMAIL AND PHONE NUMBER
    if (!formData.email.trim()) return setError('Andika imeri yawe.'), false;
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return setError('Imeri wanditse ntiyemewe. Andika imeri nyayo.'), false;
    
    if (!formData.phone_number.trim()) return setError('Andika numero ya telefone.'), false;
    
    // Clean and validate phone number
    const cleanedPhone = formData.phone_number.replace(/\D/g, '');
    if (!/^[0-9]{10}$/.test(cleanedPhone)) return setError('Uzuza telefoni nyayo y\'imibare 10.'), false;
    
    if (formData.password.length < 6) return setError('Ijambo ry\'ibanga rigomba kuba nibura inyuguti 6.'), false;
    if (formData.password !== formData.confirmPassword) return setError('Amagambo y\'ibanga ntabwo ari kimwe.'), false;
    
    if (role === 'manager' && !formData.landlord_pin.trim()) return setError('Andika PIN ya nyir\'inyubako.'), false;
    if (role === 'manager') {
      if (!formData.landlord_pin.trim()) {
        return setError('PIN ya nyir\'inyubako irakenewe kugirango ushobore kwiyandikisha.'), false;
      }
      if (formData.landlord_pin.trim().length !== 6 || !/^\d{6}$/.test(formData.landlord_pin.trim())) {
        return setError('PIN ya nyir\'inyubako igomba kuba imibare 6 gusa.'), false;
      }
      if (!selectedLandlord) {
        return setError('PIN ya nyir\'inyubako ntiyemewe. Saba nyir\'inyubako PIN ikwiye.'), false;
      }
    }
    return true;
  };

  const handleSignUp = async () => {
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

      // Additional validation before sending
      if (!signupPayload.full_name || !signupPayload.email || !signupPayload.phone_number || !signupPayload.password) {
        setError('Uzuza amakuru yose asabwa (amazina, imeri, telefoni, ijambo ry\'ibanga).');
        setLoading(false);
        return;
      }

      // Log the payload for debugging
      console.log('Payload yakozwe:', signupPayload); // Logging in Kinyarwanda
    
      // Both email and phone are required for signup

      // Use the signup API endpoint instead of direct Supabase auth
      const response = await fetch(API_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupPayload),
      });

      console.log('Signup response status:', response.status);
      const data = await response.json();
      console.log('Signup response data:', data);

      if (!response.ok) {
        const errorMsg = data.error || 'Fungura konti byanze. Gerageza ongera.';
        // Translate common error messages to Kinyarwanda
        const kinyarwandaError = errorMsg.includes('already exists') ? 
          'Iyi konti isanzwe ihari. Koresha konti yawe cyangwa ufungure indi.' :
          errorMsg.includes('invalid') ?
          'Amakuru winjije ntiyemewe. Nyamuneka reba neza hanyuma ugerageze ongera.' :
          'Fungura konti byanze. Nyamuneka gerageza ongera.';
        
        setError(kinyarwandaError);
        setLoading(false);
        return;
      }

      setSuccess('Konti yawe yafunguwe neza! Ubu urimo kwinjira...')
      
      // Attempt auto-login after successful signup
      const loginPayload = {
        identifier: signupPayload.email || signupPayload.phone_number,
        password: signupPayload.password,
        role: signupPayload.role,
      }
      
      try {
        const loginResponse = await fetch(API_ENDPOINTS.AUTH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginPayload),
        })
        const loginData = await loginResponse.json()
        
        if (!loginResponse.ok || !loginData.success) {
          setError('Konti yafunguwe ariko kwinjira byanze: ' + (loginData.error || 'Gerageza kwinjira ukoresheje konti yawe.'))
          setLoading(false)
          return
        }
        
        // Successfully logged in, redirect to main app
        setSuccess('Konti yafunguwe kandi winjiye neza!')
        setLoading(false)
        
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
        
        // Navigate to main app after successful auto-login
        setTimeout(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.replace('/')
          }
        }, 1500)
        
      } catch (loginError) {
        setError('Konti yafunguwe ariko kwinjira byanze. Gerageza kwinjira ukoresheje konti yawe.')
        setLoading(false)
        return
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      setError('Habaye ikosa mu gufungura konti. Gerageza ongera.');
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
          {/* Title */}
          <Text style={styles.title}>Fungura Konti</Text>
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
            label="Amazina yawe"
            value={formData.full_name}
            onChangeText={v => handleInputChange('full_name', v)}
            style={styles.input}
            left={<TextInput.Icon icon="account-outline" />}
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          
          {/* Email - REQUIRED */}
          <TextInput
            label="Imeri yawe"
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
            label="Numero ya telefone"
            value={formData.phone_number}
            onChangeText={text => handleInputChange('phone_number', text)}
            keyboardType="phone-pad"
            style={styles.input}
            left={<TextInput.Icon icon="phone-outline" />}
            placeholder="0781234567"
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          <TextInput
            label="Ijambo ry'ibanga"
            value={formData.password}
            onChangeText={v => handleInputChange('password', v)}
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          <TextInput
            label="Subiramo ijambo ry'ibanga"
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
                label="PIN ya nyirinyubako (6 digits)"
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
            Fungura Konti
          </Button>
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
        <Text style={styles.signinLink}>Ufite konti? Injira</Text>
      </TouchableOpacity>
      <Text style={styles.copyright}>&copy; {new Date().getFullYear()} Icumbi. Uburenganzira bwose burabitswe.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fa' },
  bgGradient: { position: 'absolute', top: 0, left: 0, width, height, backgroundColor: 'rgba(37,99,235,0.07)' },
  cardShadow: { shadowColor: '#a21caf', shadowOpacity: 0.18, shadowRadius: 24, elevation: 12, borderRadius: 32 },
  card: { width: width * 0.92, maxWidth: 400, backgroundColor: '#fff', borderRadius: 32, padding: 24, alignItems: 'center', marginVertical: 16 },
  backBtn: { position: 'absolute', top: 14, left: 14, zIndex: 10, padding: 4 },
  backIcon: { width: 24, height: 24, tintColor: '#2563eb' },
  title: { fontWeight: 'bold', fontSize: 22, color: '#2563eb', marginBottom: 12 },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2563eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 12, backgroundColor: '#f3f6fd', width: '100%', justifyContent: 'space-between' },
  dropdownText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  dropdownIcon: { width: 18, height: 18, tintColor: '#2563eb' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: width * 0.8, maxWidth: 340 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12 },
  modalOptionActive: { backgroundColor: '#f3f6fd' },
  modalOptionText: { color: '#2563eb', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  modalOptionTextActive: { color: '#a21caf' },
  input: { width: '100%', marginBottom: 10, backgroundColor: '#fff', borderRadius: 16, color: '#333', borderWidth: 1, borderColor: '#e5e7eb' },
  gradientBtn: { width: '100%', marginTop: 10, borderRadius: 24, backgroundColor: '#2563eb' },
  btnDisabled: { backgroundColor: '#b3cdfd' },
  gradientBtnContent: { height: 48 },
  gradientBtnLabel: { fontWeight: 'bold', fontSize: 16, color: '#fff' },
  signinLinkRow: { alignItems: 'center', marginTop: 18, marginBottom: 4 },
  signinLink: { color: '#a21caf', fontWeight: 'bold', fontSize: 15 },
  copyright: { color: '#666', fontSize: 12, marginTop: 10, textAlign: 'center' },
}); 