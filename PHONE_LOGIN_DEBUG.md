# Phone Number Login Debug Guide

## Issue Description
Phone number login is not working in the mobile app.

## Root Cause Analysis

### 1. Phone Number Format
- **Expected Format**: 10 digits (e.g., 0781234567)
- **Current Validation**: Removes non-digits and validates 10-digit format
- **Backend Format**: Uses `${phoneNumber}@icumbi.temp` for Supabase auth

### 2. Authentication Flow
1. User enters phone number
2. App cleans phone number (removes spaces, dashes, etc.)
3. App searches for user in `users` table by `phone_number`
4. App creates auth email: `${phoneNumber}@icumbi.temp`
5. App attempts Supabase auth with email and password

### 3. Potential Issues

#### Issue 1: Phone Number Format Mismatch
- **Problem**: User enters phone with spaces/dashes, but backend stores clean format
- **Solution**: ✅ Fixed - App now cleans phone number before lookup

#### Issue 2: Email Format Mismatch
- **Problem**: Auth email format doesn't match what was used during signup
- **Solution**: ✅ Fixed - Using `${phoneNumber}@icumbi.temp` format

#### Issue 3: User Not Found
- **Problem**: User doesn't exist in database
- **Solution**: Check if user was properly created during signup

#### Issue 4: Role Mismatch
- **Problem**: User exists but role doesn't match selected role
- **Solution**: ✅ Fixed - Added role validation

## Debugging Steps

### Step 1: Check Console Logs
Look for these logs in the mobile app:
```
Searching for user with phone number: 0781234567
User lookup result: { userData: {...}, userError: null }
Found user: { id: "...", phone_number: "0781234567", role: "tenant" }
Attempting sign in with: { authEmail: "0781234567@icumbi.temp", role: "tenant" }
```

### Step 2: Test Phone Number Format
- Enter: `078 123 4567` → Should be cleaned to `0781234567`
- Enter: `078-123-4567` → Should be cleaned to `0781234567`
- Enter: `0781234567` → Should work as-is

### Step 3: Check Database
Verify user exists in database:
```sql
SELECT * FROM users WHERE phone_number = '0781234567';
```

### Step 4: Check Auth Users
Verify auth user exists:
```sql
SELECT * FROM auth.users WHERE email = '0781234567@icumbi.temp';
```

## Common Error Messages

### "Telefoni/imeri cyangwa ijambo ry'ibanga bitatubahirije."
- **Cause**: User not found in database
- **Solution**: Check if user was created during signup

### "Ijambo ry'ibanga siyo. Gerageza ongera."
- **Cause**: Wrong password or auth user doesn't exist
- **Solution**: Check if auth user was created during signup

### "Uruhare rwawe ni tenant, ntabwo ari landlord. Hitamo uruhare rukwiye."
- **Cause**: User selected wrong role
- **Solution**: Select correct role for the user

## Testing Checklist

- [ ] Enter valid 10-digit phone number
- [ ] Select correct user role
- [ ] Enter correct password
- [ ] Check console logs for debugging info
- [ ] Verify user exists in database
- [ ] Verify auth user exists in Supabase

## Recent Fixes Applied

1. ✅ **Phone Number Cleaning**: Remove non-digits before validation
2. ✅ **Consistent Email Format**: Use `${phoneNumber}@icumbi.temp` for auth
3. ✅ **Enhanced Logging**: Added detailed console logs
4. ✅ **Better Error Messages**: More specific error handling
5. ✅ **Role Validation**: Check user role matches selected role