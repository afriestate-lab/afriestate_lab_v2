import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, Image, Modal as RNModal, ScrollView, Alert, Pressable, FlatList } from 'react-native';
import { Text, TextInput, Button, HelperText, Portal, Modal, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useNavigation } from '@react-navigation/native';


const ROLES = [
  { label: 'Umukodesha', value: 'tenant' },
  { label: "Nyirinyubako", value: 'landlord' },
  { label: 'Umuyobozi', value: 'manager' },
  { label: 'Admin', value: 'admin' },
];

const { width } = Dimensions.get('window');

export default function SignInScreen({ onSuccess, onClose, onShowSignUp }: { onSuccess?: () => void, onClose?: () => void, onShowSignUp?: () => void } = {}) {
  const navigation = useNavigation()
  const [role, setRole] = useState<string>('tenant'); // Set default role to tenant
  const [roleModal, setRoleModal] = useState(false);
  const [identifierType, setIdentifierType] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetIdentifierType, setResetIdentifierType] = useState<'phone' | 'email'>('email');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      if (!role) {
        setError('Hitamo uruhare rwawe.');
        setLoading(false);
        return;
      }
      if (!identifier || !password) {
        setError('Uzuza telefoni/imeri n\'ijambo ry\'ibanga.');
        setLoading(false);
        return;
      }
      
      // Determine identifier type and validate format
      let isPhone = false;
      let isEmail = false;
      let formattedPhone = '';
      
      // Check if it's an email
      if (/^\S+@\S+\.\S+$/.test(identifier)) {
        isEmail = true;
      } else {
        // Check if it's a phone number
        const cleanedPhone = identifier.replace(/\D/g, ''); // Remove non-digits
        if (/^[0-9]{10}$/.test(cleanedPhone)) {
          isPhone = true;
          formattedPhone = cleanedPhone;
        }
      }
      
      if (!isPhone && !isEmail) {
        setError('Andika telefoni y\'imibare 10 cyangwa imeri nyayo.');
        setLoading(false);
        return;
      }

      // Find user by the provided identifier
      let userData, userError;
      if (isPhone) {
        console.log('Searching for user with phone number:', formattedPhone);
        ({ data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, phone_number, role, full_name')
          .eq('phone_number', formattedPhone)
          .single());
      } else {
        console.log('Searching for user with email:', identifier);
        ({ data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, phone_number, role, full_name')
          .eq('email', identifier.toLowerCase().trim())
          .single());
      }

      console.log('User lookup result:', { userData, userError });

      if (userError || !userData) {
        console.log('User not found or error:', userError);
        setError('Telefoni/imeri cyangwa ijambo ry\'ibanga bitatubahirije.');
        setLoading(false);
        return;
      }

      console.log('Found user:', userData);
      console.log('Expected role:', role, 'User role:', userData.role);

      if (userData.role !== role) {
        setError(`Uruhare rwawe ni ${userData.role}, ntabwo ari ${role}. Hitamo uruhare rukwiye.`);
        setLoading(false);
        return;
      }

      // Use the actual email for authentication (no more temporary email format)
      const authEmail = userData.email;

      console.log('Attempting sign in with:', { authEmail, role: userData.role, isPhone, formattedPhone });

      // Attempt to sign in with Supabase
      let signInError;
      
      if (isPhone) {
        // For phone numbers, use the temporary email format if no actual email exists
        const tempEmail = `${formattedPhone}@icumbi.temp`;
        const emailToUse = authEmail || tempEmail;
        
        console.log('Using email for phone authentication:', emailToUse);
        
        const { error: phoneSignInError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });
        signInError = phoneSignInError;
      } else {
        // For email login, use the email directly
        if (!authEmail) {
          setError('Iyi konti ntiyemerewe kwinjira. Hamagara umuyobozi.');
          setLoading(false);
          return;
        }
        
        const { error: emailSignInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        signInError = emailSignInError;
      }

      if (signInError) {
        console.error('Sign in error:', signInError);
        
        // Provide more specific error messages
        if (signInError.message?.includes('Invalid login credentials')) {
          setError('Ijambo ry\'ibanga siyo. Gerageza ongera.');
        } else if (signInError.message?.includes('Email not confirmed')) {
          setError('Imeri yawe ntiyemejwe. Reba imeri yawe kugira ngo uyemeze konti yawe.');
        } else if (signInError.message?.includes('User not found')) {
          setError('Konti yawe ntiyabonetse. Reba telefoni/imeri yawe.');
        } else {
          setError('Habaye ikosa mu kwinjira. Gerageza ongera.');
        }
        setLoading(false);
        return;
      }

      console.log('✅ Sign in successful');
      setLoading(false);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate based on role using the correct route format
        if (userData.role === 'tenant') {
          router.replace('/tenant-dashboard' as never);
        } else if (userData.role === 'landlord') {
          router.replace('/landlord-dashboard' as never);
        } else if (userData.role === 'manager') {
          router.replace('/admin-panel' as never);
        } else if (userData.role === 'admin') {
          router.replace('/admin-dashboard' as never);
        } else {
          router.replace('/dashboard' as never);
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError('Habaye ikosa mu kwinjira. Gerageza ongera.');
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetIdentifier.trim()) {
      setResetMessage('Andika telefoni/imeri yawe.');
      return;
    }
    
    // Validate format based on type
    if (resetIdentifierType === 'email' && !/^\S+@\S+\.\S+$/.test(resetIdentifier.trim())) {
      setResetMessage('Andika imeri nyayo.');
      return;
    } else if (resetIdentifierType === 'phone' && !/^[0-9]{10}$/.test(resetIdentifier.replace(/\D/g, ''))) {
      setResetMessage('Andika numero ya telefoni nyayo (imibare 10).');
      return;
    }
    
    setResetLoading(true);
    try {
      // Try multiple API URLs for better connectivity
      const apiUrls = [
        'https://icumbi.com',
        'http://localhost:3000',
        'http://192.168.1.68:3000',
        process.env.EXPO_PUBLIC_API_URL || 'https://icumbi.com'
      ];
      
      let apiResponse = null;
      let lastError = null;
      
      for (const apiUrl of apiUrls) {
        try {
          const fullUrl = `${apiUrl}/api/auth/reset-password`;
          console.log('🔗 Trying API URL:', fullUrl);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          apiResponse = await fetch(fullUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              identifier: resetIdentifier.trim(),
              identifierType: resetIdentifierType
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          console.log('📡 Response status:', apiResponse.status);
          
          if (apiResponse.ok) {
            console.log('✅ API call successful with URL:', fullUrl);
            break;
          }
        } catch (error: any) {
          console.log('❌ Failed with URL:', apiUrl, error.message);
          lastError = error;
        }
      }
      
      if (!apiResponse) {
        throw lastError || new Error('All API URLs failed');
      }

      console.log('📡 Response status:', apiResponse.status);
      console.log('📡 Response headers:', apiResponse.headers);

      if (!apiResponse.ok) {
        console.error('❌ API Error:', apiResponse.status, apiResponse.statusText);
        const errorText = await apiResponse.text();
        console.error('❌ Error response:', errorText);
        
        if (apiResponse.status === 0 || apiResponse.status === 404) {
          setResetMessage('Ntibyashoboye gufata serivisi. Gerageza kongera cyangwa uzuza imeri/telefoni yawe.');
        } else {
          setResetMessage('Habaye ikibazo mu guhindura ijambo ry\'ibanga. Gerageza kongera.');
        }
        return;
      }

      const data = await apiResponse.json();
      console.log('✅ API Response:', data);

      if (data.success) {
        setResetMessage(data.message || 'Ubutumwa bwoherejwe kuri telefoni/imeri yawe ya konti.');
      } else {
        setResetMessage(data.error || 'Ntibyashoboye kohereza ubutumwa bwo guhindura ijambo ry\'ibanga.');
      }
          } catch (error: any) {
        console.error('❌ Password reset error:', error);
        
        if (error.message?.includes('Network request failed')) {
          setResetMessage('Ntibyashoboye gufata serivisi. Gerageza kongera cyangwa uzuza imeri/telefoni yawe.');
        } else {
          setResetMessage('Ntibyashoboye kohereza ubutumwa bwo guhindura ijambo ry\'ibanga.');
        }
      } finally {
      setResetLoading(false);
    }
  };

  console.log('🔍 Component render - showReset:', showReset);

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
              try {
                navigation.goBack();
              } catch (error) {
                // If navigation.goBack() fails, try router.back() as fallback
                router.back();
              }
            }
          }}>
            <Image source={{uri: 'https://img.icons8.com/ios-filled/50/2563eb/left.png'}} style={styles.backIcon} />
          </TouchableOpacity>
          {/* Welcome Title */}
          <Text style={styles.title}>Murakaza neza</Text>
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
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setIdentifierType('phone')} style={{ marginRight: 16 }}>
              <Text style={{ fontWeight: identifierType === 'phone' ? 'bold' : 'normal', color: '#333' }}>Telefone</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIdentifierType('email')}>
              <Text style={{ fontWeight: identifierType === 'email' ? 'bold' : 'normal', color: '#333' }}>Imeri</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            label={identifierType === 'phone' ? 'Numero ya telefone' : 'Imeri'}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType={identifierType === 'phone' ? 'phone-pad' : 'email-address'}
            autoCapitalize={identifierType === 'email' ? 'none' : undefined}
            style={styles.input}
            left={<TextInput.Icon icon={identifierType === 'phone' ? 'phone-outline' : 'email-outline'} />}
            placeholder={identifierType === 'phone' ? '0781234567' : 'example@example.com'}
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          <TextInput
            label="Ijambo ry'ibanga"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
            theme={{ colors: { primary: '#2563eb', text: '#333', placeholder: '#666' } }}
          />
          {/* Forgot Password - moved here */}
          <TouchableOpacity 
            onPress={() => {
              console.log('🔘 Forgot password button clicked!');
              console.log('🔘 Current showReset state:', showReset);
              setShowReset(true);
              console.log('🔘 Set showReset to true');
            }} 
            style={{ marginBottom: 4, alignSelf: 'flex-end' }}
          >
            <Text style={styles.forgotText}>Wibagiwe ijambo ry&apos;ibanga?</Text>
          </TouchableOpacity>
          <HelperText type="error" visible={!!error}>{error}</HelperText>
          {/* Sign In Button */}
          <Button
            mode="contained"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading || !role || !identifier || !password}
            style={[styles.gradientBtn, (!role || !identifier || !password) && styles.btnDisabled]}
            contentStyle={styles.gradientBtnContent}
            labelStyle={styles.gradientBtnLabel}
          >
            Injira
          </Button>
          

          
          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Nta konti ufite? </Text>
            <TouchableOpacity 
              style={styles.signupTouchable}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                if (onShowSignUp) {
                  onShowSignUp();
                } else {
                  try {
                    router.push('/auth/sign-up');
                  } catch (error) {
                    console.error('Navigation failed:', error);
                    Alert.alert(
                      'Fungura Konti',
                      'Habaye ikosa mu kugenda kuri ifishi yo fungura konti.',
                      [{ text: 'Sawa', style: 'cancel' }]
                    );
                  }
                }
              }}
            >
              <Text style={styles.signupLink}>Fungura konti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* Password Reset Modal */}
      {showReset && (
        <RNModal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            console.log('🔘 Modal dismissed');
            setShowReset(false);
          }}
        >
                    <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.resetTitle}>Subiza Ijambo Banga</Text>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('🔘 Close button clicked');
                    setShowReset(false);
                  }}
                  style={{ padding: 5 }}
                >
                  <Text style={{ fontSize: 20, color: '#666' }}>✕</Text>
                </TouchableOpacity>
              </View>
        
        <View style={styles.resetToggleContainer}>
          <TouchableOpacity 
            style={[
              styles.resetToggleButton,
              resetIdentifierType === 'email' && styles.resetToggleButtonActive
            ]}
            onPress={() => setResetIdentifierType('email')}
          >
            <Text style={[
              styles.resetToggleText,
              resetIdentifierType === 'email' && styles.resetToggleTextActive
            ]}>
              Imeyili
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.resetToggleButton,
              resetIdentifierType === 'phone' && styles.resetToggleButtonActive
            ]}
            onPress={() => setResetIdentifierType('phone')}
          >
            <Text style={[
              styles.resetToggleText,
              resetIdentifierType === 'phone' && styles.resetToggleTextActive
            ]}>
              Telefoni
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          mode="outlined"
          label={resetIdentifierType === 'email' ? "Imeyili" : "Telefoni"}
          value={resetIdentifier}
          onChangeText={setResetIdentifier}
          style={styles.input}
          autoCapitalize="none"
          keyboardType={resetIdentifierType === 'email' ? "email-address" : "phone-pad"}
        />
        <Button 
          mode="contained" 
          onPress={handleResetPassword}
          style={styles.gradientBtn}
          contentStyle={styles.gradientBtnContent}
          labelStyle={styles.gradientBtnLabel}
          loading={resetLoading}
          disabled={resetLoading || !resetIdentifier}
        >
          Ohereza
        </Button>
        {resetMessage ? (
          <Text style={{ color: '#2563eb', textAlign: 'center', marginTop: 10 }}>
            {resetMessage}
          </Text>
        ) : null}
            </View>
          </View>
        </RNModal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fa' },
  card: { width: width * 0.92, maxWidth: 400, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, alignItems: 'center' },
  title: { fontWeight: 'bold', fontSize: 22, color: '#2563eb', marginBottom: 8 },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2563eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 12, backgroundColor: '#f3f6fd', width: '100%', justifyContent: 'space-between' },
  dropdownText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  dropdownIcon: { width: 18, height: 18, tintColor: '#2563eb' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: width * 0.8, maxWidth: 340 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12 },
  modalOptionActive: { backgroundColor: '#f3f6fd' },
  modalOptionText: { color: '#2563eb', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  modalOptionTextActive: { color: '#a21caf' },
  roleHelperText: { marginBottom: 8, textAlign: 'center', fontSize: 12 },
  input: { width: '100%', marginBottom: 10, backgroundColor: '#fff', color: '#333', borderWidth: 1, borderColor: '#e5e7eb' },
  gradientBtn: { width: '100%', marginTop: 6, borderRadius: 8, backgroundColor: '#2563eb' },
  btnDisabled: { backgroundColor: '#b3cdfd' },
  gradientBtnContent: { height: 48 },
  gradientBtnLabel: { fontWeight: 'bold', fontSize: 16, color: '#fff' },

  forgotText: { color: '#2563eb', textAlign: 'center', fontSize: 14, marginTop: 2 },
  signupRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'center' },
  signupText: { color: '#333', fontSize: 14 },
  signupLink: { color: '#2563eb', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  signupTouchable: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    marginLeft: 4, 
    backgroundColor: 'transparent', 
    borderRadius: 6, 
    borderWidth: 0, 
    borderColor: 'transparent',
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modal: { 
    backgroundColor: 'white', 
    padding: 20, 
    margin: 20, 
    borderRadius: 12,
    width: width * 0.8,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
  resetTitle: { fontWeight: 'bold', fontSize: 18, color: '#2563eb', marginBottom: 10, textAlign: 'center' },
  backBtn: { position: 'absolute', top: 14, left: 14, zIndex: 10, padding: 4 },
  backIcon: { width: 24, height: 24, tintColor: '#2563eb' },

  // New styles for reset password
  resetToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
  },
  resetToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  resetToggleButtonActive: {
    backgroundColor: '#f3f6fd',
  },
  resetToggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  resetToggleTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
}); 