# 🔐 Authentication Test Guide

## 🎯 **Issue Fixed**
The authentication system was broken due to:
1. **Missing environment variables** - Fixed by hardcoding Supabase config
2. **Fake email addresses** - Removed `@icumbi.temp` references
3. **Role validation errors** - Added proper null checks
4. **Phone number authentication** - Now requires real email addresses

## ✅ **What Was Fixed**

### 1. **Supabase Configuration**
- Hardcoded Supabase URL and API key in `src/lib/supabase.ts`
- Removed dependency on `.env` file
- Added configuration logging

### 2. **Sign-Up Flow**
- **Email is now REQUIRED** for all accounts
- Removed fallback to `phone@icumbi.temp`
- Users must provide a real email address
- Phone numbers are stored separately

### 3. **Sign-In Flow**
- Phone authentication now requires user to exist in database
- No more fake email addresses
- Proper role validation with null checks
- Better error messages

### 4. **Password Reset**
- Removed temporary user logic
- All users must have real email addresses
- Database tokens are required

## 🧪 **Testing Steps**

### **Step 1: Create a Test Account**
1. Open the mobile app
2. Go to Sign Up screen
3. Fill in the form:
   - **Full Name**: `Test User`
   - **Phone Number**: `0799999999`
   - **Email**: `test@example.com` (REQUIRED)
   - **Role**: `tenant`
   - **Password**: `test123456`
   - **Confirm Password**: `test123456`

4. Tap "Fungura Konti" (Create Account)

### **Step 2: Test Sign In**
1. Go to Sign In screen
2. Enter credentials:
   - **Phone**: `0799999999`
   - **Role**: `tenant`
   - **Password**: `test123456`

3. Tap "Injira" (Sign In)

### **Step 3: Check Console Logs**
Look for these success messages:
```
🔧 Supabase configuration loaded: { url: "https://sgektsymnqkyqcethveh.supabase.co...", hasKey: true }
🔐 Creating Supabase auth user with email: test@example.com
✅ Supabase auth user created: [user-id]
✅ User record created in database: [user-id]
✅ Sign in successful
🧭 Navigating to dashboard with role: tenant
```

## 🚨 **Expected Behavior**

### **Before Fix (Broken)**
- ❌ "Missing Supabase environment variables" error
- ❌ Phone login with `@icumbi.temp` emails
- ❌ "Cannot read property 'role' of null" error
- ❌ Password reset always fails

### **After Fix (Working)**
- ✅ Supabase connects successfully
- ✅ Email is required for signup
- ✅ Phone login works with real emails
- ✅ Role validation works properly
- ✅ Password reset works with database tokens

## 🔍 **Debugging**

### **If Sign Up Fails**
- Check console for Supabase errors
- Ensure email is provided
- Verify phone number format (10 digits)

### **If Sign In Fails**
- Check if user exists in database
- Verify email and password match
- Check role selection matches user's role

### **If Password Reset Fails**
- Ensure user has real email address
- Check database connection
- Verify password_reset_tokens table exists

## 📱 **Mobile App Testing**

### **Test Device Requirements**
- iOS 13+ or Android 8+
- Internet connection
- Expo Go app installed

### **Test Commands**
```bash
# Start the development server
npx expo start

# Run on device
# Scan QR code with Expo Go app
```

## 🎉 **Success Criteria**

The authentication is working when:
1. ✅ Users can create accounts with real emails
2. ✅ Users can sign in with phone/email + password
3. ✅ Role-based navigation works correctly
4. ✅ Password reset sends emails successfully
5. ✅ No more `@icumbi.temp` references
6. ✅ No more "role of null" errors

## 🚀 **Next Steps**

After confirming authentication works:
1. Test all user roles (tenant, landlord, manager)
2. Test password reset functionality
3. Test session persistence
4. Test logout functionality
5. Test role-based access control
