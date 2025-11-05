'use client'

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import RoleGuard from '@/components/web-role-guard'
import { useLanguage } from '@/lib/languageContext'
import { getFallbackPropertyImage, formatCurrency } from '@/lib/helpers'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface PropertySummary {
  id: string
  name: string
  address: string | null
  city: string | null
  country?: string | null
  description?: string | null
  featured_image_url?: string | null
  property_images?: string[] | null
  amenities?: string[] | null
  property_type?: string | null
  price_range_min?: number | null
  price_range_max?: number | null
  available_rooms?: number | null
}

interface BookingFormState {
  moveInDate: string
  stayLength: string
  guests: string
  notes: string
}

const initialForm: BookingFormState = {
  moveInDate: '',
  stayLength: '12',
  guests: '1',
  notes: '',
}

function BookingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { t, currentLanguage } = useLanguage()

  const propertyId = searchParams.get('property')

  const [property, setProperty] = useState<PropertySummary | null>(null)
  const [propertyLoading, setPropertyLoading] = useState(true)
  const [propertyError, setPropertyError] = useState<string | null>(null)

  const [formState, setFormState] = useState<BookingFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const moveInMin = useMemo(() => {
    const today = new Date()
    today.setDate(today.getDate() + 1)
    return today.toISOString().slice(0, 10)
  }, [])

  useEffect(() => {
    const loadProperty = async () => {
      if (!propertyId) {
        setPropertyError('Missing property identifier. Please start from the listings page.')
        setPropertyLoading(false)
        return
      }

      setPropertyLoading(true)
      setPropertyError(null)

      try {
        const { data, error } = await supabase
          .from('properties')
          .select(`
            id,
            name,
            address,
            city,
            country,
            description,
            featured_image_url,
            property_images,
            amenities,
            property_type,
            price_range_min,
            price_range_max,
            available_rooms
          `)
          .eq('id', propertyId)
          .single()

        if (error) {
          console.error('[Booking] Failed to load property', error)
          setPropertyError('We could not load the selected property. You can still submit a booking request and our team will follow up.')
        } else {
          setProperty(data)
        }
      } catch (error) {
        console.error('[Booking] Unexpected property load error', error)
        setPropertyError('Something went wrong while fetching this property. Please try again later.')
      } finally {
        setPropertyLoading(false)
      }
    }

    loadProperty()
  }, [propertyId])

  const handleChange = (field: keyof BookingFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!propertyId) {
      setSubmitError('Missing property identifier. Please start from the listings page.')
      return
    }

    if (!user) {
      router.push(`/auth/sign-in?redirect=/booking?property=${encodeURIComponent(propertyId)}`)
      return
    }

    setSubmitError(null)
    setSubmitSuccess(false)

    if (!formState.moveInDate) {
      setSubmitError('Please choose your preferred move-in date.')
      return
    }

    setSubmitting(true)

    try {
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('id, full_name, phone_number, email')
        .eq('auth_user_id', user.id)
        .single<{ id: string; full_name: string; phone_number: string | null; email: string | null }>()

      if (tenantError || !tenantUser) {
        console.error('[Booking] Could not resolve tenant user', tenantError)
        setSubmitError('We could not verify your tenant profile. Please contact support if the issue persists.')
        setSubmitting(false)
        return
      }

      const stayMonthsRaw = Number.parseInt(formState.stayLength, 10)
      const guestsRaw = Number.parseInt(formState.guests, 10)

      const stayMonths = Number.isFinite(stayMonthsRaw) && stayMonthsRaw > 0 ? stayMonthsRaw : null
      const guests = Number.isFinite(guestsRaw) && guestsRaw > 0 ? guestsRaw : null

      // Validate required fields before building payload
      if (!tenantUser.id) {
        setSubmitError('Unable to verify your tenant account. Please contact support.')
        setSubmitting(false)
        return
      }

      if (!propertyId) {
        setSubmitError('Property information is missing. Please start over from the listings page.')
        setSubmitting(false)
        return
      }

      const contactName = tenantUser.full_name || user.email?.split('@')[0] || 'Tenant'
      if (!contactName || contactName.trim() === '') {
        setSubmitError('Your profile is missing a name. Please update your profile and try again.')
        setSubmitting(false)
        return
      }

      const bookingPayload: Record<string, any> = {
        tenant_user_id: tenantUser.id,
        property_id: propertyId,
        booking_type: 'room',
        status: 'pending',
        preferred_move_in_date: formState.moveInDate,
        contact_name: contactName,
        contact_email: tenantUser.email || user.email || null,
        contact_phone: tenantUser.phone_number || null,
      }

      // Note: The 'notes' column doesn't exist in tenant_bookings table
      // If you need to store additional information, consider:
      // 1. Adding a notes column to the database schema
      // 2. Using a separate table for booking notes
      // 3. Storing notes in landlord_response or other existing fields

      // Log the payload for debugging (remove sensitive data in production)
      console.log('[Booking] Submitting payload:', {
        ...bookingPayload,
        contact_email: bookingPayload.contact_email ? '***' : null,
        contact_phone: bookingPayload.contact_phone ? '***' : null,
      })

      // Try RPC function first (bypasses RLS), fall back to direct insert
      let bookingError: any = null
      let bookingData: any = null

      try {
        // Attempt to use RPC function if it exists
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc('create_tenant_booking', {
          p_tenant_user_id: tenantUser.id,
          p_property_id: propertyId,
          p_booking_type: 'room',
          p_status: 'pending',
          p_preferred_move_in_date: formState.moveInDate,
          p_contact_name: contactName,
          p_contact_email: tenantUser.email || user.email || null,
          p_contact_phone: tenantUser.phone_number || null,
        })

        if (!rpcError && rpcData) {
          // RPC function succeeded
          bookingData = [{ id: rpcData }] // Convert to array format for consistency
          console.log('[Booking] Booking created via RPC function')
        } else if (rpcError?.code === '42883' || rpcError?.message?.includes('function') || rpcError?.message?.includes('does not exist')) {
          // RPC function doesn't exist, fall back to direct insert
          console.log('[Booking] RPC function not found, using direct insert')
          const { error: insertError, data: insertData } = await (supabase as any)
            .from('tenant_bookings')
            .insert([bookingPayload])
            .select()
          bookingError = insertError
          bookingData = insertData
        } else {
          // RPC function exists but returned an error
          bookingError = rpcError
        }
      } catch (rpcException) {
        // RPC call failed, try direct insert
        console.log('[Booking] RPC call failed, falling back to direct insert:', rpcException)
        const { error: insertError, data: insertData } = await (supabase as any)
          .from('tenant_bookings')
          .insert([bookingPayload])
          .select()
        bookingError = insertError
        bookingData = insertData
      }

      if (bookingError) {
        // Log the full error object to see its actual structure
        console.error('[Booking] Booking request failed - Full error object:', bookingError)
        console.error('[Booking] Error type:', typeof bookingError)
        console.error('[Booking] Error constructor:', bookingError?.constructor?.name)
        console.error('[Booking] Error keys:', Object.keys(bookingError || {}))
        
        // Try to stringify the error (may fail if it has circular refs)
        try {
          console.error('[Booking] Error stringified:', JSON.stringify(bookingError, null, 2))
        } catch (e) {
          console.error('[Booking] Could not stringify error:', e)
        }

        let errorMessage = 'Unable to submit your booking request. Please try again later.'
        
        // Try multiple ways to extract the error message from PostgrestError
        const errorMsg = 
          (bookingError as any)?.message || 
          (bookingError as any)?.details ||
          (bookingError as any)?.hint ||
          (typeof bookingError === 'string' ? bookingError : null) ||
          String(bookingError)
        
        if (errorMsg && errorMsg !== '[object Object]' && errorMsg !== 'null' && errorMsg !== 'undefined') {
          if (errorMsg.includes('row-level security') || errorMsg.includes('RLS') || errorMsg.includes('violates row-level security policy')) {
            errorMessage = 'Unable to submit booking due to security restrictions. Please contact support or try again later.'
            console.error('[Booking] RLS Policy Violation - The tenant_bookings table requires RLS policies to allow tenant inserts. See BOOKING_RLS_FIX.md for database setup instructions.')
          } else if (errorMsg.includes('contact_name')) {
            errorMessage = 'Missing contact information. Please update your profile and try again.'
          } else if (errorMsg.includes('null value') || errorMsg.includes('violates not-null constraint')) {
            errorMessage = 'Some required information is missing. Please check all fields and try again.'
          } else {
            errorMessage = errorMsg
          }
        }

        setSubmitError(errorMessage)
        setSubmitting(false)
        return
      }

      if (!bookingData || bookingData.length === 0) {
        console.warn('[Booking] Insert succeeded but no data returned')
      }

      setSubmitSuccess(true)
      setFormState(initialForm)

      setTimeout(() => {
        router.push('/tenant')
      }, 1500)
    } catch (error) {
      console.error('[Booking] Unexpected error', error)
      setSubmitError('An unexpected error occurred while submitting your booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const propertyImage = property?.featured_image_url || property?.property_images?.[0] || getFallbackPropertyImage()

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ← {currentLanguage === 'rw' ? 'Subira inyuma' : 'Back'}
        </Button>
        <Button variant="outline" onClick={() => router.push('/')}>
          {currentLanguage === 'rw' ? 'Sura izindi nyubako' : 'Browse more properties'}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              {propertyLoading
                ? currentLanguage === 'rw'
                  ? 'Ibiranga inyubako...'
                  : 'Loading property details...'
                : property?.name || (currentLanguage === 'rw' ? 'Inyubako idasobanutse' : 'Unknown property')}
            </CardTitle>
            <CardDescription>
              {property?.city || property?.address
                ? [property?.city, property?.address].filter(Boolean).join(' • ')
                : currentLanguage === 'rw'
                ? 'Aho iri ntarahita aboneka. Uzaza ubibarize.'
                : 'Location will be confirmed with the landlord.'}
            </CardDescription>
          </CardHeader>
          {propertyImage ? (
            <Image
              src={propertyImage}
              alt={property?.name || 'Property photo'}
              width={1200}
              height={720}
              className="h-64 w-full object-cover"
            />
          ) : null}

          <CardContent className="space-y-4">
            {propertyError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {propertyError}
              </div>
            ) : null}

            {property?.description ? (
              <p className="text-sm text-muted-foreground">{property.description}</p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {currentLanguage === 'rw' ? 'Ubwoko' : 'Unit type'}
                </p>
                <p className="text-sm font-medium text-foreground">{property?.property_type || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {currentLanguage === 'rw' ? 'Ibyumba biboneka' : 'Available rooms'}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {property?.available_rooms ?? currentLanguage === 'rw' ? 'Bishakishwa' : 'Check with landlord'}
                </p>
              </div>
            </div>

            {(property?.price_range_min || property?.price_range_max) && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  {currentLanguage === 'rw' ? 'Agaciro kagereranyo' : 'Estimated monthly rent'}
                </p>
                <p className="text-muted-foreground">
                  {property?.price_range_min && property?.price_range_max
                    ? `${formatCurrency(property.price_range_min)} – ${formatCurrency(property.price_range_max)}`
                    : property?.price_range_min
                    ? formatCurrency(property.price_range_min)
                    : property?.price_range_max
                    ? formatCurrency(property.price_range_max)
                    : '—'}
                </p>
              </div>
            )}

            {property?.amenities && property.amenities.length > 0 ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {currentLanguage === 'rw' ? 'Ibikoresho bihari' : 'Amenities'}
                </p>
                <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {property.amenities.slice(0, 8).map((amenity) => (
                    <li key={amenity}>• {amenity}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{currentLanguage === 'rw' ? 'Saba Icyumba' : 'Request a booking'}</CardTitle>
            <CardDescription>
              {currentLanguage === 'rw'
                ? 'Twohereze ibisobanuro wifuza, tuzabihuza n’umukiriya wawe kandi tugusubize vuba.'
                : 'Share your preferred move-in date and stay details. The landlord will follow up with confirmation.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitError ? (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

            {submitSuccess ? (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {currentLanguage === 'rw'
                  ? 'Ibisabwa byawe byoherejwe! Uzabona igisubizo cya nyirinyubako vuba.'
                  : 'Your booking request has been submitted! The landlord will get back to you shortly.'}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="move-in-date">
                  {currentLanguage === 'rw' ? 'Itariki wifuza kwinjiraho' : 'Preferred move-in date'}
                </Label>
                <Input
                  id="move-in-date"
                  type="date"
                  min={moveInMin}
                  value={formState.moveInDate}
                  onChange={handleChange('moveInDate')}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stay-length">
                    {currentLanguage === 'rw' ? 'Amezi uteganya kumara' : 'How many months will you stay?'}
                  </Label>
                  <Input
                    id="stay-length"
                    type="number"
                    min={1}
                    value={formState.stayLength}
                    onChange={handleChange('stayLength')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guests">
                    {currentLanguage === 'rw' ? 'Umubare w’abantu bazatura' : 'How many guests?'}
                  </Label>
                  <Input
                    id="guests"
                    type="number"
                    min={1}
                    value={formState.guests}
                    onChange={handleChange('guests')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {currentLanguage === 'rw' ? 'Ibyifuzo byihariye' : 'Anything else we should know?'}
                </Label>
                <textarea
                  id="notes"
                  rows={4}
                  value={formState.notes}
                  onChange={handleChange('notes')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder={currentLanguage === 'rw' ? 'Urugero: Ndashaka icyumba gifite igikoni.' : 'Example: I need a furnished room with fast internet.'}
                />
              </div>

              <Separator className="my-6" />

              <CardDescription className="text-xs text-muted-foreground">
                {currentLanguage === 'rw'
                  ? 'Ibisabwa byawe bizoherezwa kuri nyirinyubako. Ntiwishyura ubu kugeza igihe booking yemejwe.'
                  : 'Your request will be shared with the property owner. No payment is processed at this stage.'}
              </CardDescription>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? currentLanguage === 'rw'
                    ? 'Kohereza...'
                    : 'Submitting...'
                  : currentLanguage === 'rw'
                  ? 'Ohereza ibisabwa'
                  : 'Submit booking request'}
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {currentLanguage === 'rw'
                ? 'Niba ukeneye ubufasha bwihuse, hamagara itsinda ryacu kuri +250 780 056 626.'
                : 'Need help right now? Call our support team at +250 780 056 626.'}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function BookingPage() {
  return (
    <RoleGuard allowedRoles={['tenant']} screenName="tenant-bookings">
      <BookingPageContent />
    </RoleGuard>
  )
}

