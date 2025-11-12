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
import { Calendar, Home, MapPin, Bed, DollarSign, CheckCircle2, ArrowLeft, ArrowRight, CreditCard, Phone, Building2, AlertCircle } from 'lucide-react'

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
  const { user, loading: authLoading } = useAuth()
  const { t, currentLanguage } = useLanguage()

  const propertyId = searchParams.get('property')

  const [property, setProperty] = useState<PropertySummary | null>(null)
  const [propertyLoading, setPropertyLoading] = useState(true)
  const [propertyError, setPropertyError] = useState<string | null>(null)

  const [formState, setFormState] = useState<BookingFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectUrl = `/booking?property=${encodeURIComponent(propertyId || '')}`
      router.push(`/auth/sign-in?redirect=${encodeURIComponent(redirectUrl)}`)
    }
  }, [user, authLoading, propertyId, router])

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

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">
            {currentLanguage === 'rw' ? 'Gukura amakuru...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {currentLanguage === 'rw' ? 'Subira inyuma' : 'Back'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/')} className="gap-2">
            <Home className="h-4 w-4" />
            {currentLanguage === 'rw' ? 'Sura izindi nyubako' : 'Browse more properties'}
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr]">
          {/* Property Details Card */}
          <Card className="overflow-hidden shadow-lg border-0">
            {propertyImage && (
              <div className="relative h-80 w-full overflow-hidden">
                <Image
                  src={propertyImage}
                  alt={property?.name || 'Property photo'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5" />
                    <h1 className="text-2xl font-bold">{property?.name || (currentLanguage === 'rw' ? 'Inyubako' : 'Property')}</h1>
                  </div>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <MapPin className="h-4 w-4" />
                    <span>{property?.city || property?.address || (currentLanguage === 'rw' ? 'Aho iri' : 'Location')}</span>
                  </div>
                </div>
                {property?.available_rooms !== undefined && property.available_rooms !== null && property.available_rooms > 0 && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-500 text-white text-sm font-semibold shadow-lg">
                    {property.available_rooms} {currentLanguage === 'rw' ? 'Bihari' : 'Available'}
                  </span>
                )}
              </div>
            )}

            <CardContent className="p-6 space-y-6">
              {propertyError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {propertyError}
                </div>
              )}

              {property?.description && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    {currentLanguage === 'rw' ? 'Ibisobanuro' : 'Description'}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground">{property.description}</p>
                </div>
              )}

              {/* Property Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {currentLanguage === 'rw' ? 'Ubwoko' : 'Type'}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{property?.property_type || '—'}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {currentLanguage === 'rw' ? 'Ibyumba' : 'Rooms'}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {property?.available_rooms ?? (currentLanguage === 'rw' ? 'Bishakishwa' : 'Check')}
                  </p>
                </div>
              </div>

              {/* Price Range */}
              {(property?.price_range_min || property?.price_range_max) && (
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-foreground">
                      {currentLanguage === 'rw' ? 'Agaciro kagereranyo' : 'Estimated monthly rent'}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary">
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

              {/* Amenities */}
              {property?.amenities && property.amenities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    {currentLanguage === 'rw' ? 'Ibikoresho bihari' : 'Amenities'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.slice(0, 8).map((amenity, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Form Card */}
          <Card className="shadow-lg border-0 sticky top-8 h-fit">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">{currentLanguage === 'rw' ? 'Saba Icyumba' : 'Request a booking'}</CardTitle>
                  <CardDescription className="mt-1">
                    {currentLanguage === 'rw'
                      ? 'Twohereze ibisobanuro wifuza'
                      : 'Share your preferred move-in date'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {submitError && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {currentLanguage === 'rw'
                    ? 'Ibisabwa byawe byoherejwe! Uzabona igisubizo cya nyirinyubako vuba.'
                    : 'Your booking request has been submitted! The landlord will get back to you shortly.'}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="move-in-date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {currentLanguage === 'rw' ? 'Itariki wifuza kwinjiraho' : 'Preferred move-in date'}
                  </Label>
                  <Input
                    id="move-in-date"
                    type="date"
                    min={moveInMin}
                    value={formState.moveInDate}
                    onChange={handleChange('moveInDate')}
                    required
                    className="h-11"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stay-length" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {currentLanguage === 'rw' ? 'Amezi' : 'Months'}
                    </Label>
                    <Input
                      id="stay-length"
                      type="number"
                      min={1}
                      value={formState.stayLength}
                      onChange={handleChange('stayLength')}
                      placeholder="12"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guests" className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      {currentLanguage === 'rw' ? 'Abantu' : 'Guests'}
                    </Label>
                    <Input
                      id="guests"
                      type="number"
                      min={1}
                      value={formState.guests}
                      onChange={handleChange('guests')}
                      placeholder="1"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    {currentLanguage === 'rw' ? 'Ibyifuzo byihariye' : 'Additional notes (optional)'}
                  </Label>
                  <textarea
                    id="notes"
                    rows={4}
                    value={formState.notes}
                    onChange={handleChange('notes')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                    placeholder={currentLanguage === 'rw' ? 'Urugero: Ndashaka icyumba gifite igikoni.' : 'Example: I need a furnished room with fast internet.'}
                  />
                </div>

                <Separator className="my-6" />

                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentLanguage === 'rw'
                      ? 'Ibisabwa byawe bizoherezwa kuri nyirinyubako. Ntiwishyura ubu kugeza igihe booking yemejwe.'
                      : 'Your request will be shared with the property owner. No payment is processed at this stage.'}
                  </p>
                </div>

                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      {currentLanguage === 'rw' ? 'Kohereza...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {currentLanguage === 'rw' ? 'Ohereza ibisabwa' : 'Submit booking request'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="bg-slate-50 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                <Phone className="h-3 w-3" />
                <span>
                  {currentLanguage === 'rw'
                    ? 'Niba ukeneye ubufasha: +250 780 056 626'
                    : 'Need help? Call +250 780 056 626'}
                </span>
              </div>
            </CardFooter>
          </Card>
        </div>
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

