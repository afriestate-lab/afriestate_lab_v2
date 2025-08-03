# Phone Number Login Test Guide

## Test User Information

Based on the database, here are some test users you can try:

### Test User 1
- **Phone**: `0788123456`
- **Role**: `tenant`
- **Name**: `Test User Mobile`
- **Auth Email**: `0788123456@icumbi.temp`

### Test User 2
- **Phone**: `0787777777`
- **Role**: `tenant`
- **Name**: `Test User`
- **Auth Email**: `0787777777@icumbi.temp`

### Test User 3
- **Phone**: `0788999999`
- **Role**: `tenant`
- **Name**: `Test User Demo`
- **Auth Email**: `0788999999@icumbi.temp`

## Debugging Steps

### Step 1: Check Console Logs
When you try to login, look for these logs in the mobile app console:

```
Searching for user with phone number: 0788123456
User lookup result: { userData: {...}, userError: null }
Found user: { id: "24053827-ed5c-408c-9a3e-77392642fa9c", phone_number: "0788123456", role: "tenant" }
Attempting sign in with: { authEmail: "0788123456@icumbi.temp", role: "tenant" }
```

### Step 2: Test with Known User
Try logging in with:
- **Phone**: `0788123456`
- **Role**: `tenant`
- **Password**: (You'll need to know the password or reset it)

### Step 3: Check Password Reset
If you don't know the password, you can:

1. **Use the web app** to reset password
2. **Create a new test user** with a known password
3. **Check if there's a default password**

## Common Issues

### Issue 1: User Not Found
**Error**: "Telefoni/imeri cyangwa ijambo ry'ibanga bitatubahirije."
**Solution**: Make sure you're using a phone number that exists in the database

### Issue 2: Wrong Password
**Error**: "Ijambo ry'ibanga siyo. Gerageza ongera."
**Solution**: The password is incorrect or the auth user doesn't exist

### Issue 3: Role Mismatch
**Error**: "Uruhare rwawe ni tenant, ntabwo ari landlord. Hitamo uruhare rukwiye."
**Solution**: Select the correct role for the user

## Testing Checklist

- [ ] Use a phone number that exists in the database
- [ ] Select the correct role (tenant/landlord/admin)
- [ ] Enter the correct password
- [ ] Check console logs for debugging info
- [ ] Verify the auth email format matches

## Quick Test

Try this exact sequence:
1. Enter phone: `0788123456`
2. Select role: `tenant`
3. Enter password: (you'll need to know it)
4. Check console logs for the authentication process

If you get "Ijambo ry'ibanga siyo. Gerageza ongera.", it means:
- The user exists in the database ✅
- The auth email format is correct ✅
- But the password is wrong ❌

## Next Steps

1. **Check if you know the password** for any of these test users
2. **Try creating a new user** with a password you know
3. **Use the web app** to reset a password
4. **Check the console logs** to see exactly what's happening