# 🚨 Icumbi App - Critical Fixes Action Plan

## Priority 0: IMMEDIATE BLOCKERS (Fix within 1-2 weeks)

### 1. Fix TypeScript Compilation Errors (2-3 days)

#### Issue: 44 TypeScript errors preventing clean build

**Files to fix:**
- `app/_layout.tsx` - Missing translation function import
- `app/admin-dashboard.tsx` - Type issues with UserProfile
- `app/auth/reset-password-pin.tsx` - Type mismatches
- `app/auth/sign-in.tsx` - Type and API issues
- `app/add-payment-form.tsx` - Missing parameter types
- `app/add-tenant-form.tsx` - Undefined variables

**Quick Fix Actions:**
```typescript
// 1. Add to app/_layout.tsx at top
import { useLanguage } from '../src/lib/languageContext'

// 2. Fix UserProfile type in admin-dashboard.tsx
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  // add other properties
}

// 3. Fix timeout types
const timer: NodeJS.Timeout = setTimeout(() => {}, 1000)

// 4. Remove .raw property usage - use proper Supabase client methods
```

### 2. Remove Payment Simulation Mode (3-4 days)

#### Issue: All payments are simulated, no real transactions

**Files to update:**
- `app/payment-processor.tsx`
- `app/add-payment-form.tsx`
- `app/ishyura-modal.tsx`
- Database function: `simulate_successful_payment`

**Integration Steps:**
1. **MTN MoMo Integration:**
   ```javascript
   // Replace simulation with real API
   const initiateMTNPayment = async (amount, phoneNumber) => {
     const response = await fetch('https://api.mtn.com/payment', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${process.env.MTN_API_KEY}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         amount,
         phone: phoneNumber,
         reference: generateReference()
       })
     });
     return response.json();
   };
   ```

2. **Remove all SIMULATION comments and console.logs**
3. **Add payment verification webhooks**
4. **Implement payment status checking**

### 3. Fix Critical Security Issues (2-3 days)

#### A. Add Missing RLS Policies

**SQL to execute:**
```sql
-- Example for consumable_bills table
ALTER TABLE public.consumable_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bills" ON public.consumable_bills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Landlords can manage bills" ON public.consumable_bills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.landlord_id = auth.uid()
      AND p.id = consumable_bills.property_id
    )
  );

-- Repeat for other 8 tables
```

#### B. Fix Function Search Paths

**SQL template for all 112 functions:**
```sql
ALTER FUNCTION public.function_name() SET search_path = public, pg_catalog;
```

#### C. Remove Hardcoded Admin Credentials

**In `app/auth/sign-in.tsx`:**
```typescript
// REMOVE THIS ENTIRE BLOCK
if (email === 'admin@icumbi.com' && password === 'Icumbi@045') {
  // admin override logic
}
```

### 4. Disable Debug Mode (1 day)

**Files to update:**
- `app/auth/sign-up.tsx` - Set DEBUG_MODE to false
- `app/admin-dashboard.tsx` - Remove all test functions
- Remove all console.log statements

**Quick script to find all console.logs:**
```bash
grep -r "console\." --include="*.tsx" --include="*.ts" app/ src/
```

---

## Implementation Schedule

### Week 1:
**Monday-Tuesday:** Fix TypeScript errors
- Fix missing imports
- Add proper types
- Remove deprecated API usage

**Wednesday-Friday:** Security fixes
- Add RLS policies
- Fix function search paths
- Remove hardcoded credentials

### Week 2:
**Monday-Wednesday:** Payment integration
- Integrate MTN MoMo API
- Add Airtel Money API
- Implement webhook handlers

**Thursday-Friday:** Testing & cleanup
- Remove debug code
- Test all critical flows
- Basic security testing

---

## Validation Checklist

After implementing fixes, verify:

- [ ] `npm run build` completes with 0 errors
- [ ] No hardcoded credentials in codebase
- [ ] All 9 tables have RLS policies
- [ ] Payment flow works with test credentials
- [ ] No console.log in production code
- [ ] All TypeScript files compile cleanly
- [ ] Basic security scan passes

---

## Emergency Contacts

For urgent assistance:
- **Technical Support**: [[memory:5563623]]
- **Security Issues**: Report immediately to [[memory:5563623]]

---

## Commands for Quick Fixes

```bash
# Check TypeScript errors
npx tsc --noEmit

# Find all TODO/FIXME comments
grep -r "TODO\|FIXME\|HACK" --include="*.tsx" --include="*.ts" .

# Check for console.log statements
grep -r "console\." --include="*.tsx" --include="*.ts" app/ src/

# Run security audit
npm audit

# Test build
npm run build:android-preview
```

---

*Last Updated: ${new Date().toISOString()}*