# 🔐 Booking RLS Policy Fix

## Problem

The booking submission fails with the error:
```
new row violates row-level security policy for table "tenant_bookings"
```

This occurs because Row Level Security (RLS) policies on the `tenant_bookings` table are preventing tenants from inserting their own booking records.

## Solution Options

You have two options to fix this:

### Option 1: Create an RPC Function (Recommended)

This approach bypasses RLS by using a database function that runs with elevated privileges.

**SQL to run in Supabase SQL Editor:**

```sql
-- Create a function to insert tenant bookings
CREATE OR REPLACE FUNCTION create_tenant_booking(
  p_tenant_user_id UUID,
  p_property_id UUID,
  p_booking_type TEXT DEFAULT 'room',
  p_status TEXT DEFAULT 'pending',
  p_preferred_move_in_date DATE,
  p_contact_name TEXT,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  INSERT INTO tenant_bookings (
    tenant_user_id,
    property_id,
    booking_type,
    status,
    preferred_move_in_date,
    contact_name,
    contact_email,
    contact_phone
  )
  VALUES (
    p_tenant_user_id,
    p_property_id,
    p_booking_type,
    p_status,
    p_preferred_move_in_date,
    p_contact_name,
    p_contact_email,
    p_contact_phone
  )
  RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$;
```

**Then update the booking code to use the RPC function:**

In `app/booking/page.tsx`, replace the direct insert with:

```typescript
// Replace the insert call around line 213-216 with:
const { data: bookingData, error: bookingError } = await supabase.rpc('create_tenant_booking', {
  p_tenant_user_id: tenantUser.id,
  p_property_id: propertyId,
  p_booking_type: 'room',
  p_status: 'pending',
  p_preferred_move_in_date: formState.moveInDate,
  p_contact_name: contactName,
  p_contact_email: tenantUser.email || user.email || null,
  p_contact_phone: tenantUser.phone_number || null,
})
```

### Option 2: Update RLS Policy (Alternative)

If you prefer to allow direct inserts, update the RLS policy on `tenant_bookings`:

**SQL to run in Supabase SQL Editor:**

```sql
-- First, ensure RLS is enabled
ALTER TABLE tenant_bookings ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows tenants to insert their own bookings
CREATE POLICY "Tenants can insert their own bookings"
ON tenant_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.id = tenant_bookings.tenant_user_id
    AND tu.auth_user_id = auth.uid()
  )
);

-- Optionally, also allow tenants to read their own bookings
CREATE POLICY "Tenants can read their own bookings"
ON tenant_bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.id = tenant_bookings.tenant_user_id
    AND tu.auth_user_id = auth.uid()
  )
);
```

**Note:** Make sure the `tenant_bookings` table has a foreign key relationship with `tenant_users` on `tenant_user_id`.

## Verification

After applying either fix:

1. Sign in as a tenant user
2. Navigate to a property listing
3. Click "Book Now"
4. Fill out the booking form
5. Submit the booking request

The booking should now be created successfully without RLS errors.

## Troubleshooting

### If Option 1 fails:
- Check that the function was created successfully: `SELECT * FROM pg_proc WHERE proname = 'create_tenant_booking';`
- Verify the function has `SECURITY DEFINER` set
- Check function permissions: `GRANT EXECUTE ON FUNCTION create_tenant_booking TO authenticated;`

### If Option 2 fails:
- Verify the `tenant_users` table exists and has an `auth_user_id` column
- Check that the foreign key relationship exists between `tenant_bookings.tenant_user_id` and `tenant_users.id`
- Ensure the authenticated user has a corresponding record in `tenant_users` with matching `auth_user_id`

### Common Issues:
- **Function not found**: Make sure you ran the SQL in the Supabase SQL Editor
- **Permission denied**: The function needs `SECURITY DEFINER` and proper grants
- **Policy not working**: Check that `auth.uid()` returns the correct user ID and matches `tenant_users.auth_user_id`

