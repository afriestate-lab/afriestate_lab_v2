# Feature Parity Status (November 2025)

This document tracks how the current Next.js web build maps to the full feature set that existed in the pre-migration Android app. Each row captures the current implementation, the parity status, and recommended next steps to close remaining gaps.

| Feature | Current Web Implementation | Status | Key Gaps / Next Steps |
| --- | --- | --- | --- |
| Multi-role authentication | `AuthProvider` keeps session state; `/auth/sign-in` and `/auth/sign-up` flows are live | ⚠️ Partial | Role is selected manually during sign-in without validating against Supabase; dashboard routes rely on Expo-era guards. Enforce role checks before redirecting and add server/client route protection. |
| Property management | `/properties` page shows landlord/manager inventory with Supabase RPC calls | ⚠️ Partial | Add/edit property flows (`add-property-form`, `add-manager-form`, etc.) still use React Native components and are not exposed in the web UI. Convert forms to Shadcn/ui and wire modal triggers into `/properties`. |
| Room booking | Public catalog on `/` lists properties with “Book Now” CTA | ❌ Missing | `router.push('/booking?property=…')` points to a non-existent route; booking modal remains React Native-only. Rebuild a web-based booking flow (detail page + dialog) backed by Supabase reservations. |
| Payment processing | Admin/landlord payment views are placeholders | ❌ Missing | `/payments` and `/admin/payments` only show “coming soon”. Port the legacy payment history tables, MTN MoMo initiation, and manual record forms using Supabase RPCs and the existing `payment-processor` logic. |
| Tenant dashboard | `/tenant` renders leases, balances, announcements | ⚠️ Partial | Core data loads, but lease extension actions, rent reminders, and support contacts from mobile are not surfaced. Add action buttons and Supabase mutations. |
| Landlord dashboard | `/landlord` delivers stats, revenue charts, upcoming dues | ✅ In place | Feature parity achieved after the web rewrite; continue UX polish and hook up admin panel modal enablement. |
| Manager portal | Legacy manager view lives in `managers-page.tsx` | ⚠️ Partial | UI still uses React Native primitives and is reachable only via internal navigation. Rebuild as `/manager` in Shadcn/ui and expose manager-specific metrics/actions. |
| Admin panel | `/admin` shell exists with navigation to sub-pages | ⚠️ Partial | Cards render zero values; detailed sub-pages require Supabase data and actions (user roles, property approvals, audit logs). Port remaining admin workflows. |
| Real-time updates | Data fetched via Supabase RPC (`get_landlord_properties`, etc.) | ⚠️ Partial | No Supabase realtime subscriptions yet; payments/properties require manual refresh. Introduce `supabase.channel` listeners or optimistic UI updates for bookings, payments, and tenant status. |
| Multi-language support | `LanguageProvider` + translation catalog covers EN/RW | ✅ In place | Ensure newly rebuilt pages keep using `useLanguage()`; extend translations for upcoming booking/payment flows. |
| Responsive design | Tailwind-based layouts across `/`, `/tenant`, `/landlord` | ⚠️ Partial | Major dashboards adapt, but legacy RN screens (managers, add forms) do not. Convert remaining pages to web components for consistent responsiveness. |
| SEO & metadata | `app/layout.tsx` defines comprehensive metadata/open graph | ✅ In place | Add per-page metadata (title/description) once booking, payments, and admin pages are rebuilt. |

## Evidence & References

```88:137:app/auth/sign-in/page.tsx
      if (data?.user) {
        type SupportedRole = 'tenant' | 'landlord' | 'manager' | 'admin'
        let resolvedRole: SupportedRole | null = null

        const { data: userRecord } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (userRecord?.role) {
          resolvedRole = userRecord.role as SupportedRole
        }

        if (!resolvedRole) {
          if (tenantUserRecord) {
            resolvedRole = (tenantUserRecord.role as SupportedRole) || 'tenant'
          } else {
            const { data: tenantRecord } = await supabase
              .from('tenant_users')
              .select('role')
              .eq('auth_user_id', data.user.id)
              .single()

            if (tenantRecord) {
              resolvedRole = (tenantRecord.role as SupportedRole) || 'tenant'
            }
          }
        }

        if (!resolvedRole) {
          await supabase.auth.signOut()
          setError('Unable to determine your assigned role. Please contact support.')
          return
        }

        if (resolvedRole !== role) {
          await supabase.auth.signOut()
          setError(`Your assigned role is ${resolvedRole}. Please sign in using that role.`)
          return
        }

        const redirectMap: Record<SupportedRole, string> = {
          tenant: '/tenant',
          landlord: '/landlord',
          manager: '/landlord',
          admin: '/admin',
        }

        router.push(redirectMap[resolvedRole] ?? '/')
      }
```

```84:143:app/properties/page.tsx
export default function PropertiesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t, currentLanguage } = useLanguage()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [properties, setProperties] = useState<PropertyDetail[]>([])
```

```101:112:app/page.tsx
  const handleBookNow = (property: Property) => {
    if (!user) {
      router.push('/auth/sign-in')
      return
    }
    router.push(`/booking?property=${property.id}`)
  }
```

```5:18:app/payments/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Payments</h1>

      <Card>
        <CardHeader>
```

```57:125:app/tenant/page.tsx
export default function TenantDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { currentLanguage } = useLanguage()

  const [profile, setProfile] = useState<TenantProfile | null>(null)
  const [lease, setLease] = useState<LeaseSummary | null>(null)
```

```80:176:app/landlord/page.tsx
export default function LandlordDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { currentLanguage } = useLanguage()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
```

```1:28:app/admin/page.tsx
'use client'

import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
```

```27:83:src/lib/languageContext.tsx
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en')
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false)

  // Load saved language preference on app start (client-side only)
  useEffect(() => {
    const loadLanguagePreference = () => {
      if (typeof window === 'undefined') {
        setIsLanguageLoaded(true)
        return
      }
```

```1:52:app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/lib/languageContext'
import { AuthProvider } from '@/components/auth-provider'
import { Navigation } from '@/components/navigation'

export const metadata: Metadata = {
  title: {
    default: 'Afri Estate - Easy Rentals, Better Life',
```

## Implementation Backlog

- **P0 · Booking & payments parity**
  - Build `/booking` route with property detail, availability calendar, and the legacy multi-step booking flow.
  - Port `payment-processor` into a web dialog; surface recent transactions and MTN MoMo initiation inside `/payments` and `/admin/payments`.
- **P0 · Role-aware routing & guards**
  - Replace Expo `RoleGuard` with a web-specific guard (middleware + component) and apply it to `/tenant`, `/landlord`, `/admin`, and upcoming `/manager` routes.
- **P1 · Manager & admin workspaces**
  - Rebuild `managers-page.tsx` as `/manager` using Shadcn/ui, including property assignments and performance metrics.
  - Fill in admin sub-pages (properties, tenants, users, reports) with Supabase RPC queries and mutation workflows.
- **P1 · Property CRUD tooling**
  - Convert add/edit property, manager, and tenant forms from React Native to Shadcn forms and connect them to `/properties` and `/tenants`.
- **P2 · Real-time UX polish**
  - Introduce Supabase realtime listeners for payments, bookings, and tenant status to mirror mobile live updates.
  - Audit responsiveness on the newly converted pages and extend translation keys for every new surface.


