# Create Test User for Phone Login

## Option 1: Use the Mobile App Signup

1. **Open the mobile app**
2. **Go to signup screen**
3. **Create a new user with these details**:
   - **Full Name**: `Test User Login`
   - **Phone Number**: `0799999999`
   - **Role**: `tenant`
   - **Password**: `test123456`
   - **Confirm Password**: `test123456`

4. **After signup, try logging in with**:
   - **Phone**: `0799999999`
   - **Role**: `tenant`
   - **Password**: `test123456`

## Option 2: Use the Web App

1. **Go to the web app** (your main website)
2. **Create a new account** with:
   - **Phone**: `0799999999`
   - **Password**: `test123456`
   - **Role**: `tenant`

3. **Then try logging in on mobile** with the same credentials

## Option 3: Direct Database Insert (For Testing)

If you have database access, you can create a test user directly:

```sql
-- Insert into users table
INSERT INTO users (id, role, full_name, phone_number, email) 
VALUES (
  gen_random_uuid(), 
  'tenant', 
  'Test User Login', 
  '0799999999', 
  '0799999999@icumbi.temp'
);

-- Insert into auth.users table (requires admin access)
-- This would need to be done through Supabase admin panel
```

## Test the Login

Once you have a test user, try this exact sequence:

1. **Enter Phone**: `0799999999`
2. **Select Role**: `tenant`
3. **Enter Password**: `test123456`
4. **Check Console Logs** for debugging info

## Expected Console Output

```
Searching for user with phone number: 0799999999
User lookup result: { userData: {...}, userError: null }
Found user: { id: "...", phone_number: "0799999999", role: "tenant" }
Attempting sign in with: { authEmail: "0799999999@icumbi.temp", role: "tenant" }
✅ Sign in successful
```

## If Login Still Fails

If you still get "Ijambo ry'ibanga siyo. Gerageza ongera." with a known password:

1. **Check the console logs** - look for any error messages
2. **Verify the auth user exists** in Supabase auth panel
3. **Check if the password was set correctly** during signup
4. **Try resetting the password** through the web app

## Debugging Commands

You can also check the database directly:

```sql
-- Check if user exists
SELECT * FROM users WHERE phone_number = '0799999999';

-- Check if auth user exists
SELECT * FROM auth.users WHERE email = '0799999999@icumbi.temp';
```