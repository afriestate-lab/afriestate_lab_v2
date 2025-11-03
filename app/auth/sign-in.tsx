import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, TouchableOpacity, Dimensions, Image, Modal as RNModal, ScrollView, Alert, Pressable, FlatList } from 'react-native';
import { Text, TextInput, Button, HelperText, Portal, Modal, Divider, ProgressBar } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '@/lib/languageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IcumbiLogo from '../components/IcumbiLogo';


// ROLES will be defined inside the component to use translations

const { width } = Dimensions.get('window');

export default function SignInScreen({ onSuccess, onClose, onShowSignUp }: { onSuccess?: () => void, onClose?: () => void, onShowSignUp?: () => void } = {}) {
  const navigation = useNavigation()
  const { t, currentLanguage } = useLanguage();
  
  const ROLES = [
    { label: t('tenant'), value: 'tenant' },
    { label: t('landlord'), value: 'landlord' },
    { label: t('manager'), value: 'manager' },
  ];
  
  const [role, setRole] = useState<string>('tenant'); // Set default role to tenant
  const [roleModal, setRoleModal] = useState(false);
  const [identifierType, setIdentifierType] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  
  // Reset password flow state
  const [resetStep, setResetStep] = useState<'identifier' | 'pin' | 'password'>('identifier');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetIdentifierType, setResetIdentifierType] = useState<'phone' | 'email'>('email');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // PIN verification state
  const [resetPin, setResetPin] = useState('');
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [pinToken, setPinToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  
  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      if (!role) {
        setError(t('selectRole'));
        setLoading(false);
        return;
      }
      if (!identifier || !password) {
        setError(t('fillPhoneEmailPassword'));
        setLoading(false);
        return;
      }

      // Admin override: Direct admin access regardless of selected role
      if (identifier === 'admin@icumbi.com' && password === 'Icumbi@045') {
        console.log('🔑 Admin override detected - logging in as admin');
        
        try {
          // Direct authentication with admin credentials
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'admin@icumbi.com',
            password: 'Icumbi@045',
          });

          if (authError) {
            console.error('Admin authentication error:', authError);
            setError(t('phoneEmailPasswordInvalid'));
            setLoading(false);
            return;
          }

          if (authData?.user) {
            console.log('✅ Admin override successful');
            setLoading(false);
            
            // Use callback if provided (for modal), otherwise navigate to main app
            if (onSuccess) {
              onSuccess();
            } else {
              // Navigate to main index, the DashboardScreen will detect admin role
              router.replace('/');
            }
            return;
          }
        } catch (error) {
          console.error('Admin override error:', error);
          setError(t('phoneEmailPasswordInvalid'));
          setLoading(false);
          return;
        }
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
        setError(t('enterValidPhoneEmail'));
        setLoading(false);
        return;
      }

      // First, attempt to authenticate with Supabase Auth
      let authEmail = identifier;
      let userData = null;
      
              if (isPhone) {
          // For phone numbers, try to find the user first
          try {
            // Since the users table has RLS and is empty, we'll try to authenticate
            // directly with Supabase Auth using a potential email format
            console.log('⚠️ Users table has RLS restrictions, trying direct auth...');
            
            // Try to find user in tenant_users table first
            const { data: tenantUser, error: tenantUserError } = await supabase
              .from('tenant_users')
              .select('auth_user_id, email, phone_number, full_name')
              .eq('phone_number', formattedPhone)
              .single();
            
            if (tenantUser && !tenantUserError) {
              // Found in tenant_users, use their email for authentication
              userData = {
                id: tenantUser.auth_user_id,
                email: tenantUser.email,
                phone_number: tenantUser.phone_number,
                full_name: tenantUser.full_name,
                role: 'tenant' // Assume tenant role for now
              };
              authEmail = tenantUser.email;
              console.log('✅ Found user via tenant_users:', userData);
            } else {
              // If not found in tenant_users, we can't authenticate with phone
              console.log('❌ No user found with phone number:', formattedPhone);
              setError('Nta konti yabonetse ifite iyi telefoni. Nyamuneka ufungure konti mbere.');
              setLoading(false);
              return;
            }
          } catch (error) {
            console.log('❌ Phone lookup failed:', error);
            setError('Habaye ikosa mu gushakisha konti. Gerageza ongera.');
            setLoading(false);
            return;
          }
        } else {
          // For email login, use the email directly
          authEmail = identifier.toLowerCase().trim();
          console.log('Using email for authentication:', authEmail);
          
          // Try to find user data for email login
          try {
            // Try tenant_users table first
            const { data: tenantUser, error: tenantUserError } = await supabase
              .from('tenant_users')
              .select('auth_user_id, email, phone_number, full_name')
              .eq('email', authEmail)
              .single();
            
            if (tenantUser && !tenantUserError) {
              userData = {
                id: tenantUser.auth_user_id,
                email: tenantUser.email,
                phone_number: tenantUser.phone_number,
                full_name: tenantUser.full_name,
                role: 'tenant' // Assume tenant role for now
              };
              console.log('✅ Found user by email via tenant_users:', userData);
            }
          } catch (error) {
            console.log('⚠️ Could not find user data for email, continuing with auth...');
          }
        }

      // Validate that we have user data and role
      if (!userData) {
        console.log('❌ No user data found for identifier:', identifier);
        setError('Nta konti yabonetse ifite iyi telefoni/imeri. Nyamuneka ufungure konti mbere.');
        setLoading(false);
        return;
      }
      
      if (!userData.role) {
        console.log('⚠️ User found but no role assigned:', userData);
        // Try to get role from users table as fallback
        try {
          const { data: roleUser, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userData.id)
            .single();
          
          if (roleUser && roleUser.role) {
            userData.role = roleUser.role;
            console.log('✅ Retrieved role from users table:', roleUser.role);
          } else {
            console.log('❌ No role found in users table either');
            setError('Konti yawe ntifite uruhare. Nyamuneka vugana nabayobozi.');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.log('❌ Error retrieving role:', error);
          setError('Habaye ikosa mu gushakisha uruhare rwawe. Gerageza ongera.');
          setLoading(false);
          return;
        }
      }

      console.log('🔐 Attempting sign in with:', { authEmail, role: userData.role, isPhone, formattedPhone });

      // Attempt to sign in with Supabase Auth
      console.log('🔐 Attempting Supabase Auth sign in with:', { authEmail, role });
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });
      
      if (signInError) {
        console.error('❌ Supabase Auth sign in error:', signInError);
        setError('Ijambo ry\'ibanga siyo cyangwa konti yawe ntiyabonetse. Gerageza ongera.');
        setLoading(false);
        return;
      }
      
      if (!signInData?.user) {
        console.error('❌ No user data returned from Supabase Auth');
        setError('Habaye ikosa mu kwinjira. Gerageza ongera.');
        setLoading(false);
        return;
      }
      
      console.log('✅ Supabase Auth sign in successful:', signInData.user.id);
      
      // Now that we're authenticated, fetch the user data from our users table
      let finalUserData = userData;
      if (!finalUserData) {
        try {
          console.log('🔍 Fetching user data from users table...');
          const { data: fetchedUser, error: fetchError } = await supabase
            .from('users')
            .select('id, email, phone_number, role, full_name')
            .eq('id', signInData.user.id)
            .single();
          
          if (fetchError || !fetchedUser) {
            console.log('⚠️ Could not fetch user data from users table:', fetchError);
            // Try to find by email as fallback
            const { data: emailUser, error: emailError } = await supabase
              .from('users')
              .select('id, email, phone_number, role, full_name')
              .eq('email', signInData.user.email)
              .single();
            
            if (emailUser && !emailError) {
              finalUserData = emailUser;
              console.log('✅ Found user by email:', finalUserData);
            } else {
              console.log('⚠️ Could not find user by email either:', emailError);
            }
          } else {
            finalUserData = fetchedUser;
            console.log('✅ Fetched user data:', finalUserData);
          }
        } catch (error) {
          console.log('⚠️ Error fetching user data:', error);
        }
      }
      
      // Verify role if we have user data
      if (finalUserData && finalUserData.role) {
        if (finalUserData.role !== role) {
          console.log('❌ Role mismatch:', { expected: role, actual: finalUserData.role });
          setError(`Uruhare rwawe ni ${finalUserData.role}, ntabwo ari ${role}. Hitamo uruhare rukwiye.`);
          // Sign out the user since role doesn't match
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      } else {
        console.log('⚠️ No role data available, using selected role');
      }

      // Error handling is now done above in the Supabase Auth section

      console.log('✅ Sign in successful');
      setLoading(false);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate based on role using the correct route format
        const userRole = finalUserData?.role || role;
        console.log('🧭 Navigating to dashboard with role:', userRole);
        
        if (userRole === 'tenant') {
          router.replace('/tenant-dashboard' as never);
        } else if (userRole === 'landlord') {
          router.replace('/landlord-dashboard' as never);
        } else if (userRole === 'manager') {
          router.replace('/admin-panel' as never);
        } else if (userRole === 'admin') {
          router.replace('/admin-dashboard' as never);
        } else {
          console.log('⚠️ Unknown role, navigating to default dashboard');
          router.replace('/dashboard' as never);
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError('Habaye ikosa mu kwinjira. Gerageza ongera.');
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    // Show the reset modal and reset the step to identifier
    setShowReset(true);
    setResetStep('identifier');
    setError('');
    setResetMessage('');
  };

  // Helper functions for reset password flow
  const generateSecurePin = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
      console.log('🔍 Looking up user by identifier:', { identifier, type });
      
      // First try to find user in our users table
      let query = supabase.from('users').select('id, email, phone_number, full_name, role');
      
      if (type === 'email') {
        query = query.eq('email', identifier.toLowerCase().trim()).limit(1);
      } else {
        const formattedPhone = formatPhoneNumber(identifier);
        query = query.eq('phone_number', formattedPhone).limit(1);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Users table lookup error:', error);
        // If it's an RLS error, try to find by Supabase Auth
        if (error.code === '42501' || error.message?.includes('policy')) {
          console.log('⚠️ RLS policy error, trying Supabase Auth lookup...');
          return await lookupUserInSupabaseAuth(identifier, type);
        }
        return null;
      }

      if (data && data.length > 0) {
        console.log('✅ User found in users table:', data[0]);
        return data[0];
      }

      // If not found in users table, try Supabase Auth
      console.log('⚠️ User not found in users table, trying Supabase Auth...');
      return await lookupUserInSupabaseAuth(identifier, type);
      
    } catch (error) {
      console.error('❌ Exception during user lookup:', error);
      return null;
    }
  };

  const lookupUserInSupabaseAuth = async (identifier: string, type: 'email' | 'phone') => {
    try {
      console.log('🔍 Looking up user in Supabase Auth:', { identifier, type });
      
      // For email lookups, we can try to find the user
      if (type === 'email') {
        // Try to find user in our users table by email
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, email, phone_number, full_name, role')
          .eq('email', identifier.toLowerCase().trim())
          .single();
        
        if (userData && !error) {
          return userData;
        }
        
        // If not found in users table, return null
        console.log('⚠️ User not found in users table for email:', identifier);
        return null;
      } else {
        // For phone numbers, we need to find the associated email
        // This is a limitation - we need the email to send the reset PIN
        console.log('⚠️ Phone number lookup not supported for password reset');
        return null;
      }
    } catch (error) {
      console.error('❌ Supabase Auth lookup error:', error);
      return null;
    }
  };

  const sendEmailWithPin = async (email: string, pin: string, fullName: string) => {
    try {
      console.log(`[DEBUG] Sending PIN ${pin} to ${email} for user ${fullName}`);
      
      console.log('🚀 CALLING EDGE FUNCTION: send-reset-pin-email');
      console.log('📧 Email details:', { email, pin, fullName, language: currentLanguage });
      
      const { data, error } = await supabase.functions.invoke('send-reset-pin-email', {
        body: {
          email: email,
          pin: pin,
          fullName: fullName,
          language: currentLanguage
        }
      });
      
      console.log('📨 Edge Function response - data:', data);
      console.log('📨 Edge Function response - error:', error);

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Failed to send email via Edge Function');
      }

      if (!data.success) {
        console.error('Email service error:', data);
        throw new Error(data.message || 'Email service failed');
      }

      console.log('Email sent successfully:', data);
      
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
      
      if (__DEV__) {
        Alert.alert(
          'Email Service Error', 
          `Failed to send email, but here's your PIN for testing: ${pin}\n\nError: ${error.message}`,
          [{ text: 'OK' }]
        );
        return true;
      }
      
      return false;
    }
  };

  const handleSendPin = async () => {
    console.log('🎯 handleSendPin called!');
    console.log('🎯 Reset identifier:', resetIdentifier);
    console.log('🎯 Reset identifier type:', resetIdentifierType);
    
    setError('');
    setResetMessage('');
    setResetLoading(true);

    try {
      if (resetIdentifierType === 'email' && !validateEmail(resetIdentifier)) {
        setError(currentLanguage === 'en' ? 'Please enter a valid email address.' : 'Andika imeri nyayo.');
        setResetLoading(false);
        return;
      }

      if (resetIdentifierType === 'phone' && !validatePhone(resetIdentifier)) {
        setError(currentLanguage === 'en' ? 'Please enter a valid 10-digit phone number.' : 'Andika numero ya telefoni nyayo (imibare 10).');
        setResetLoading(false);
        return;
      }

      const user = await lookupUserByIdentifier(resetIdentifier, resetIdentifierType);
      
      if (!user) {
        setError(currentLanguage === 'en' ? 'No account found with this email/phone number.' : 'Nta konti yabonetse ifite iyi imeri/telefoni.');
        setResetLoading(false);
        return;
      }

      // Ensure we have an email to send the reset PIN to
      if (!user.email) {
        if (resetIdentifierType === 'phone') {
          setError(currentLanguage === 'en' 
            ? 'Phone number found but no email associated. Please use your email address instead.' 
            : 'Telefoni yabonetse ariko nta imeri yihari. Nyamuneka ukoreshe imeri yawe.');
        } else {
          setError(currentLanguage === 'en' 
            ? 'This account does not have an email address. Please contact support.' 
            : 'Iyi konti ntifite imeri. Hamagara ubufasha.');
        }
        setResetLoading(false);
        return;
      }

      console.log('✅ User found for password reset:', { 
        id: user.id, 
        email: user.email, 
        phone: user.phone_number,
        name: user.full_name 
      });

      const generatedPin = generateSecurePin();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // Generate a unique token
      const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create database token for password reset
      let tokenData = null;
      try {
        const { data: dbToken, error: tokenError } = await supabase
          .from('password_reset_tokens')
          .insert({
            user_id: user.id,
            token: resetToken,
            pin: generatedPin,
            expires_at: expiresAt.toISOString(),
            email_identifier: user.email,
            phone_identifier: resetIdentifierType === 'phone' ? formatPhoneNumber(resetIdentifier) : null,
            verification_attempts: 0,
            is_verified: false
          })
          .select()
          .single();

        if (tokenError) {
          console.error('❌ Failed to create reset token in database:', tokenError);
          setError(currentLanguage === 'en' ? 'Failed to create reset request. Please try again.' : 'Ntibyashoboye gukora ubusaba bwo guhindura ijambo ry\'ibanga.');
          setResetLoading(false);
          return;
        } else {
          tokenData = dbToken;
          console.log('✅ Reset token created in database:', tokenData);
        }
      } catch (error) {
        console.error('❌ Database token creation failed:', error);
        setError(currentLanguage === 'en' ? 'Failed to create reset request. Please try again.' : 'Ntibyashoboye gukora ubusaba bwo guhindura ijambo ry\'ibanga.');
        setResetLoading(false);
        return;
      }

      // Check if we have a valid token
      if (!tokenData) {
        console.error('❌ Failed to create reset token in database');
        setError(currentLanguage === 'en' ? 'Failed to create reset request. Please try again.' : 'Ntibyashoboye gukora ubusaba bwo guhindura ijambo ry\'ibanga.');
        setResetLoading(false);
        return;
      }

      console.log('🎯 About to send email with PIN...');
      console.log('🎯 User email:', user.email);
      console.log('🎯 Generated PIN:', generatedPin);
      console.log('🎯 User full name:', user.full_name);
      
      const emailSent = await sendEmailWithPin(user.email, generatedPin, user.full_name || 'User');
      
      console.log('🎯 Email sent result:', emailSent);
      
      if (!emailSent) {
        setError(currentLanguage === 'en' ? 'Failed to send verification email. Please try again.' : 'Ntibyashoboye kohereza imeri yo kwemeza. Gerageza kongera.');
        setResetLoading(false);
        return;
      }

      setPinToken(resetToken);
      setUserEmail(user.email);
      
      if (resetIdentifierType === 'phone') {
        setResetMessage(
          currentLanguage === 'en' 
            ? `A verification PIN was sent to the email used when creating this account: ${user.email}`
            : `Umubare w'kwemeza woherejwe kuri imeri yakoreshejwe mukugirango konti: ${user.email}`
        );
      } else {
        setResetMessage(
          currentLanguage === 'en'
            ? `A 6-digit verification PIN has been sent to ${user.email}`
            : `Umubare w'kwemeza w'imibare 6 woherejwe kuri ${user.email}`
        );
      }

      setResetStep('pin');
      setResendCountdown(60);
      
    } catch (error) {
      console.error('Error in handleSendPin:', error);
      setError(currentLanguage === 'en' ? 'An unexpected error occurred. Please try again.' : 'Habaye ikosa mu byasabwa. Gerageza kongera.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    setError('');
    setIsPinLoading(true);

    try {
      if (!resetPin || resetPin.length !== 6) {
        setError(currentLanguage === 'en' ? 'Please enter the 6-digit PIN.' : 'Andika umubare w\'imibare 6.');
        setIsPinLoading(false);
        return;
      }

      // PIN verification for all users
      console.log('🔐 Verifying PIN for token:', pinToken);

      // For regular users, verify against database
      const { data: tokenData, error: verifyError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', pinToken)
        .eq('pin', resetPin)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (verifyError || !tokenData) {
        // Increment verification attempts if token exists
        try {
          await supabase
            .from('password_reset_tokens')
            .update({ 
              verification_attempts: (tokenData?.verification_attempts || 0) + 1
            })
            .eq('token', pinToken);
        } catch (updateError) {
          console.warn('⚠️ Could not update verification attempts:', updateError);
        }

        setError(currentLanguage === 'en' ? 'Invalid or expired PIN. Please check your email and try again.' : 'Umubare si wo cyangwa wabuze umwanya. Reba imeri yawe ukongere ugerageze.');
        setIsPinLoading(false);
        return;
      }

      if (tokenData.verification_attempts >= 3) {
        setError(currentLanguage === 'en' ? 'Too many incorrect attempts. Please request a new PIN.' : 'Wagerageje kenshi cyane. Saba umubare mushya.');
        setIsPinLoading(false);
        return;
      }

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

      setResetMessage(currentLanguage === 'en' ? 'PIN verified successfully! Now set your new password.' : 'Umubare wemejwe neza! Ubu shyiraho ijambo ry\'ibanga rishya.');
      setResetStep('password');

    } catch (error) {
      console.error('Error in handleVerifyPin:', error);
      setError(currentLanguage === 'en' ? 'An unexpected error occurred. Please try again.' : 'Habaye ikosa mu byasabwa. Gerageza kongera.');
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError('');
    setResetMessage('');
    setIsPasswordLoading(true);

    try {
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

      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        setError(currentLanguage === 'en' ? 'Password must contain uppercase, lowercase, and numbers.' : 'Ijambo ry\'ibanga rigomba kugira inyuguti nkuru, inyuguti nto, n\'imibare.');
        setIsPasswordLoading(false);
        return;
      }

      // Handle temporary users (who don't have database tokens)
      if (pinToken.startsWith('reset_') && pinToken.includes('temp_')) {
        console.log('⚠️ Temporary user password update - this would need proper implementation');
        setError(currentLanguage === 'en' 
          ? 'Password update not available for temporary accounts. Please contact support.' 
          : 'Guhindura ijambo ry\'ibanga ntabwo birabashoboka kuri konti z\'igihe gito. Hamagara ubufasha.');
        setIsPasswordLoading(false);
        return;
      }

      // For regular users, verify token and update password
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

      // Try to update password using Edge Function
      try {
        const { data: updateData, error: updateError } = await supabase.functions.invoke('update-user-password', {
          body: {
            userId: tokenData.user_id,
            newPassword: newPassword,
            resetToken: pinToken
          }
        });

        if (updateError || !updateData?.success) {
          console.error('❌ Edge Function password update failed:', updateError || updateData);
          
          // Fallback: try direct Supabase Auth update
          console.log('🔄 Trying fallback password update...');
          const { error: directUpdateError } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (directUpdateError) {
            console.error('❌ Fallback password update also failed:', directUpdateError);
            setError(currentLanguage === 'en' 
              ? 'Failed to update password. Please try again or contact support.' 
              : 'Ntibyashoboye guhindura ijambo ry\'ibanga. Gerageza kongera cyangwa hamagara ubufasha.');
            setIsPasswordLoading(false);
            return;
          }
          
          console.log('✅ Fallback password update successful');
        } else {
          console.log('✅ Edge Function password update successful');
        }
      } catch (functionError) {
        console.error('❌ Edge Function invocation error:', functionError);
        
        // Fallback: try direct Supabase Auth update
        try {
          const { error: directUpdateError } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (directUpdateError) {
            throw directUpdateError;
          }
          
          console.log('✅ Fallback password update successful');
        } catch (fallbackError) {
          console.error('❌ All password update methods failed:', fallbackError);
          setError(currentLanguage === 'en' 
            ? 'Failed to update password. Please try again or contact support.' 
            : 'Ntibyashoboye guhindura ijambo ry\'ibanga. Gerageza kongera cyangwa hamagara ubufasha.');
          setIsPasswordLoading(false);
          return;
        }
      }

      // Password update was successful (either via Edge Function or fallback)

      await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', pinToken);

      setResetMessage(currentLanguage === 'en' ? 'Password updated successfully! You can now sign in with your new password.' : 'Ijambo ry\'ibanga ryahinduwe neza! Urashobora kwinjira ukoresheje ijambo ry\'ibanga rishya.');

      setTimeout(() => {
        setShowReset(false);
        setResetStep('identifier');
        setResetMessage('');
        setNewPassword('');
        setConfirmPassword('');
        setResetIdentifier('');
        setResetPin('');
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

  console.log('🔍 Component render - showReset:', showReset);

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={undefined}
      keyboardVerticalOffset={0}
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
          {/* Logo and Welcome Title */}
          <View style={styles.logoContainer}>
            <IcumbiLogo width={60} height={60} />
          </View>
          <Text style={styles.title}>{currentLanguage === 'en' ? 'Welcome' : 'Murakaza neza'}</Text>
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
              <Text style={{ fontWeight: identifierType === 'phone' ? 'bold' : 'normal', color: '#333' }}>{t('phone')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIdentifierType('email')}>
              <Text style={{ fontWeight: identifierType === 'email' ? 'bold' : 'normal', color: '#333' }}>{t('email')}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            label={identifierType === 'phone' ? t('phoneNumber') : t('email')}
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
            label={t('password')}
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
            onPress={handleResetPassword}
            style={{ marginBottom: 4, alignSelf: 'flex-end' }}
          >
            <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
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
            {t('signIn')}
          </Button>
          

          
          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>{currentLanguage === 'en' ? "Don't have an account? " : 'Nta konti ufite? '}</Text>
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
                <Text style={styles.signupLink}>{currentLanguage === 'en' ? 'Create Account' : 'Fungura konti'}</Text>
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
            setResetStep('identifier');
          }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.resetModal}>
                {/* Header */}
                <View style={styles.resetHeader}>
                  <Text style={styles.resetTitle}>
                    {currentLanguage === 'en' ? 'Reset Password' : 'Subiza Ijambo ry\'ibanga'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowReset(false);
                      setResetStep('identifier');
                    }}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Step indicator */}
                <View style={styles.stepIndicator}>
                  <View style={[styles.stepDot, resetStep === 'identifier' && styles.stepDotActive]} />
                  <View style={[styles.stepDot, resetStep === 'pin' && styles.stepDotActive]} />
                  <View style={[styles.stepDot, resetStep === 'password' && styles.stepDotActive]} />
                </View>

                {/* Render current step */}
                {resetStep === 'identifier' && (
                  <View style={styles.stepContainer}>
                    <Text style={styles.stepDescription}>
                      {currentLanguage === 'en' 
                        ? 'Enter your email or phone number to receive a verification PIN'
                        : 'Andika imeri cyangwa telefoni yawe kugira ngo uhabwe umubare w\'kwemeza'
                      }
                    </Text>

                    {/* Identifier Type Toggle */}
                    <View style={styles.resetToggleContainer}>
                      <TouchableOpacity 
                        style={[styles.resetToggleButton, resetIdentifierType === 'email' && styles.resetToggleButtonActive]}
                        onPress={() => setResetIdentifierType('email')}
                      >
                        <Text style={[styles.resetToggleText, resetIdentifierType === 'email' && styles.resetToggleTextActive]}>
                          {currentLanguage === 'en' ? 'Email' : 'Imeri'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.resetToggleButton, resetIdentifierType === 'phone' && styles.resetToggleButtonActive]}
                        onPress={() => setResetIdentifierType('phone')}
                      >
                        <Text style={[styles.resetToggleText, resetIdentifierType === 'phone' && styles.resetToggleTextActive]}>
                          {currentLanguage === 'en' ? 'Phone' : 'Telefoni'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      label={resetIdentifierType === 'email' 
                        ? (currentLanguage === 'en' ? 'Email Address' : 'Imeri') 
                        : (currentLanguage === 'en' ? 'Phone Number' : 'Numero ya Telefoni')
                      }
                      value={resetIdentifier}
                      onChangeText={setResetIdentifier}
                      keyboardType={resetIdentifierType === 'email' ? 'email-address' : 'phone-pad'}
                      autoCapitalize={resetIdentifierType === 'email' ? 'none' : undefined}
                      style={styles.input}
                      mode="outlined"
                      left={<TextInput.Icon icon={resetIdentifierType === 'email' ? 'email-outline' : 'phone-outline'} />}
                      placeholder={resetIdentifierType === 'email' ? 'example@example.com' : '0781234567'}
                      theme={{ colors: { primary: '#2563eb' } }}
                    />

                    {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}
                    {resetMessage ? <HelperText type="info" visible={!!resetMessage}>{resetMessage}</HelperText> : null}

                    <Button
                      mode="contained"
                      onPress={handleSendPin}
                      loading={resetLoading}
                      disabled={resetLoading || !resetIdentifier.trim()}
                      style={styles.gradientBtn}
                      contentStyle={styles.gradientBtnContent}
                      labelStyle={styles.gradientBtnLabel}
                    >
                      {currentLanguage === 'en' ? 'Send Verification PIN' : 'Ohereza Umubare w\'kwemeza'}
                    </Button>
                  </View>
                )}

                {resetStep === 'pin' && (
                  <View style={styles.stepContainer}>
                    <Text style={styles.stepDescription}>
                      {currentLanguage === 'en' 
                        ? `Enter the 5-digit PIN sent to ${userEmail}`
                        : `Andika umubare w'imibare 5 woherejwe kuri ${userEmail}`
                      }
                    </Text>

                    <TextInput
                      label={currentLanguage === 'en' ? '5-Digit PIN' : 'Umubare w\'imibare 5'}
                      value={resetPin}
                      onChangeText={(text) => setResetPin(text.replace(/\D/g, '').substring(0, 5))}
                      keyboardType="numeric"
                      style={styles.input}
                      mode="outlined"
                      left={<TextInput.Icon icon="shield-key-outline" />}
                      placeholder="12345"
                      maxLength={5}
                      theme={{ colors: { primary: '#2563eb' } }}
                    />

                    {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}
                    {resetMessage ? <HelperText type="info" visible={!!resetMessage}>{resetMessage}</HelperText> : null}

                    <Button
                      mode="contained"
                      onPress={handleVerifyPin}
                      loading={isPinLoading}
                      disabled={isPinLoading || resetPin.length !== 5}
                      style={styles.gradientBtn}
                      contentStyle={styles.gradientBtnContent}
                      labelStyle={styles.gradientBtnLabel}
                    >
                      {currentLanguage === 'en' ? 'Verify PIN' : 'Emeza Umubare'}
                    </Button>

                    {/* Resend PIN */}
                    <TouchableOpacity 
                      onPress={handleResendPin}
                      disabled={resendCountdown > 0}
                      style={styles.resendButton}
                    >
                      <Text style={[styles.resendText, resendCountdown > 0 && styles.resendTextDisabled]}>
                        {resendCountdown > 0 
                          ? `${currentLanguage === 'en' ? 'Resend in' : 'Kongera mu'} ${resendCountdown}s`
                          : (currentLanguage === 'en' ? 'Resend PIN' : 'Kongera kohereza')
                        }
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => setResetStep('identifier')}
                      style={styles.backButton}
                    >
                      <Text style={styles.backText}>
                        {currentLanguage === 'en' ? '← Back' : '← Subira inyuma'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {resetStep === 'password' && (
                  <View style={styles.stepContainer}>
                    <Text style={styles.stepDescription}>
                      {currentLanguage === 'en' 
                        ? 'Create a strong password for your account'
                        : 'Kora ijambo ry\'ibanga rikomeye ku konti yawe'
                      }
                    </Text>

                    <TextInput
                      label={currentLanguage === 'en' ? 'New Password' : 'Ijambo ry\'ibanga rishya'}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      style={styles.input}
                      mode="outlined"
                      left={<TextInput.Icon icon="lock-outline" />}
                      right={<TextInput.Icon icon={showNewPassword ? 'eye-off' : 'eye'} onPress={() => setShowNewPassword(!showNewPassword)} />}
                      theme={{ colors: { primary: '#2563eb' } }}
                    />

                    {/* Password strength indicator */}
                    {newPassword.length > 0 && (
                      <View style={styles.strengthContainer}>
                        <ProgressBar
                          progress={getPasswordStrength(newPassword)}
                          color={
                            getPasswordStrength(newPassword) < 0.4 ? '#ef4444' :
                            getPasswordStrength(newPassword) < 0.6 ? '#f59e0b' :
                            getPasswordStrength(newPassword) < 0.8 ? '#3b82f6' : '#10b981'
                          }
                          style={styles.strengthBar}
                        />
                        <Text style={styles.strengthText}>
                          {getPasswordStrength(newPassword) < 0.4 ? (currentLanguage === 'en' ? 'Weak' : 'Ntoya') :
                           getPasswordStrength(newPassword) < 0.6 ? (currentLanguage === 'en' ? 'Fair' : 'Hagati') :
                           getPasswordStrength(newPassword) < 0.8 ? (currentLanguage === 'en' ? 'Good' : 'Neza') : 
                           (currentLanguage === 'en' ? 'Strong' : 'Cyiza cyane')}
                        </Text>
                      </View>
                    )}

                    <TextInput
                      label={currentLanguage === 'en' ? 'Confirm Password' : 'Emeza ijambo ry\'ibanga'}
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
                    {resetMessage ? <HelperText type="info" visible={!!resetMessage}>{resetMessage}</HelperText> : null}

                    <Button
                      mode="contained"
                      onPress={handleUpdatePassword}
                      loading={isPasswordLoading}
                      disabled={isPasswordLoading || !newPassword || !confirmPassword}
                      style={styles.gradientBtn}
                      contentStyle={styles.gradientBtnContent}
                      labelStyle={styles.gradientBtnLabel}
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
                )}
              </View>
            </ScrollView>
          </View>
        </RNModal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fa' },
  card: { width: width * 0.92, maxWidth: 400, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, alignItems: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
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

  // Reset password modal styles
  resetModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  resetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
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
  stepDescription: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  resetToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    width: '100%',
  },
  resetToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 2,
    flex: 1,
    alignItems: 'center',
  },
  resetToggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resetToggleText: {
    color: '#64748b',
    fontWeight: '500',
  },
  resetToggleTextActive: {
    color: '#2563eb',
    fontWeight: '600',
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