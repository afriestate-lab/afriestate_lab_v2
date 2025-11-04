'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { useLanguage } from '@/lib/languageContext'
import { formatCurrency, formatDate, getFallbackPropertyImage } from '@/lib/helpers'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface TenantProfile {
  id: string
  name: string
  email: string
  phone?: string | null
  status: string
}

interface LeaseSummary {
  leaseId: string
  propertyId: string
  propertyName: string
  propertyAddress: string
  propertyCity?: string
  roomNumber: string
  rentAmount: number
  moveInDate?: string
  nextDueDate?: string
  imageUrl?: string
}

interface PaymentRecord {
  id: string
  amount: number
  payment_date: string
  status: string
  propertyName: string
  roomNumber: string
}

interface AnnouncementSummary {
  id: string
  title: string
  content: string
  priority: string
  created_at: string
  expires_at?: string
  propertyName: string
}

export default function TenantDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { currentLanguage } = useLanguage()

  const locale = currentLanguage === 'rw' ? 'rw-RW' : 'en-US'
  const localize = (en: string, rw: string) => (currentLanguage === 'rw' ? rw : en)

  const [profile, setProfile] = useState<TenantProfile | null>(null)
  const [lease, setLease] = useState<LeaseSummary | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementSummary[]>([])
  const [balance, setBalance] = useState({ due: 0, paid: 0, outstanding: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/sign-in')
        return
      }
      void loadDashboard()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const loadDashboard = async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)

      const { data: tenantUserRaw, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select('id, full_name, email, phone_number, status')
        .eq('auth_user_id', user.id)
        .single()

      if (tenantUserError || !tenantUserRaw) {
        setError(localize('No tenant profile found for this account.', 'Nta profili y\'umukiriya ibonetse kuri konti yawe.'))
        setLoading(false)
        return
      }

      const tenantUser = tenantUserRaw as any
      const tenantProfile: TenantProfile = {
        id: tenantUser.id,
        name: tenantUser.full_name || user.email || 'Tenant',
        email: tenantUser.email || user.email || '',
        phone: tenantUser.phone_number || user.user_metadata?.phone_number || null,
        status: tenantUser.status || 'active',
      }
      setProfile(tenantProfile)

      const { data: tenantDataRaw } = await supabase
        .from('tenants')
        .select('id')
        .eq('tenant_user_id', tenantUser.id)
        .single()

      const tenantRecord = tenantDataRaw as any

      if (!tenantRecord?.id) {
        setLease(null)
        setPayments([])
        setAnnouncements([])
        setBalance({ due: 0, paid: 0, outstanding: 0 })
        setLoading(false)
        return
      }

      const tenantId = tenantRecord.id

      const { data: leaseRaw } = await supabase
        .from('room_tenants')
        .select(`
          id,
          rent_amount,
          move_in_date,
          next_due_date,
          rooms!inner (
            id,
            room_number,
            properties!inner (
              id,
              name,
              address,
              city,
              featured_image_url,
              property_images
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single()

      let leaseSummary: LeaseSummary | null = null
      let propertyId: string | null = null

      if (leaseRaw) {
        const leaseData = leaseRaw as any
        const property = leaseData.rooms?.properties
        const propertyImages = (property?.property_images || []) as string[]

        leaseSummary = {
          leaseId: leaseData.id,
          propertyId: property?.id || '',
          propertyName: property?.name || localize('Unknown property', 'Inyubako itazwi'),
          propertyAddress: property?.address || '',
          propertyCity: property?.city || undefined,
          roomNumber: leaseData.rooms?.room_number || '-',
          rentAmount: leaseData.rent_amount || 0,
          moveInDate: leaseData.move_in_date || undefined,
          nextDueDate: leaseData.next_due_date || undefined,
          imageUrl: property?.featured_image_url || propertyImages[0],
        }
        propertyId = property?.id || null
      }

      setLease(leaseSummary)

      const { data: paymentsRaw } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_status,
          rooms!inner (
            room_number,
            properties!inner (
              id,
              name
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false })
        .limit(50)

      const paymentRecords: PaymentRecord[] = (paymentsRaw || []).map((payment: any) => ({
        id: payment.id,
        amount: payment.amount || 0,
        payment_date: payment.payment_date,
        status: payment.payment_status || 'completed',
        propertyName: payment.rooms?.properties?.name || '—',
        roomNumber: payment.rooms?.room_number || '—',
      }))

      setPayments(paymentRecords)

      const now = new Date()
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`
      const paidThisMonth = paymentRecords
        .filter((payment) => {
          const paymentDate = new Date(payment.payment_date)
          return `${paymentDate.getFullYear()}-${paymentDate.getMonth()}` === currentMonthKey
        })
        .reduce((sum, payment) => sum + payment.amount, 0)

      const rentDue = leaseSummary?.rentAmount || 0
      setBalance({
        due: rentDue,
        paid: paidThisMonth,
        outstanding: Math.max(rentDue - paidThisMonth, 0),
      })

      if (propertyId) {
        const { data: announcementsRaw } = await supabase
          .from('property_announcements')
          .select(`
            id,
            title,
            content,
            announcement_type,
            priority,
            created_at,
            expires_at,
            properties!inner ( name )
          `)
          .eq('property_id', propertyId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10)

        const announcementRecords: AnnouncementSummary[] = (announcementsRaw || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          priority: item.priority || 'medium',
          created_at: item.created_at,
          expires_at: item.expires_at || undefined,
          propertyName: item.properties?.name || '',
        }))

        setAnnouncements(announcementRecords)
      } else {
        setAnnouncements([])
      }
    } catch (err) {
      console.error('[TenantDashboard] Unexpected error:', err)
      setError(localize('Failed to load tenant dashboard data.', 'Ntibyakunze kubona amakuru y\'umukiriya.'))
    } finally {
      setLoading(false)
    }
  }

  const isOverdue = useMemo(() => {
    if (!lease?.nextDueDate) return false
    const dueDate = new Date(lease.nextDueDate)
    const today = new Date()
    dueDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return dueDate.getTime() < today.getTime() && balance.outstanding > 0
  }, [lease?.nextDueDate, balance.outstanding])

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">
            {localize('Loading your dashboard...', 'Dashboard yawe iri gutegurwa...')}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl border-destructive/50 bg-destructive/10 text-destructive">
          <CardHeader>
            <CardTitle>{localize('Error', 'Ikosa')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => loadDashboard()}>
              {localize('Retry', 'Ongera ugerageze')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {localize('Welcome back', 'Murakaza neza')} {profile?.name?.split(' ')[0] || ''}
          </h1>
          <p className="text-muted-foreground">
            {localize('Review your lease, payments, and announcements in one place.', 'Reba amasezerano yawe, ubwishyu n\'amatangazo ahurijwe hamwe.')} 
          </p>
        </div>
        {profile?.email ? <p className="text-sm text-muted-foreground">{profile.email}</p> : null}
      </div>

      <Separator className="my-6" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={localize('Rent due this month', 'Ubukode bw\'uku kwezi')}
          value={formatCurrency(balance.due)}
          description={lease?.nextDueDate ? `${localize('Due', 'Bizishyurwa')} ${formatDate(lease.nextDueDate)}` : undefined}
        />
        <MetricCard
          label={localize('Paid this month', 'Byishyuwe uku kwezi')}
          value={formatCurrency(balance.paid)}
          description={localize('Thank you for your payment!', 'Urakoze ku bw\'ubwishyu bwawe!')}
        />
        <MetricCard
          label={localize('Outstanding balance', 'Umwenda usigaye')}
          value={formatCurrency(balance.outstanding)}
          description={isOverdue ? localize('Payment is overdue', 'Ubwishyu butinze') : localize('Keep your account current', 'Komeza wubahirize ubwishyu')}
          highlight={isOverdue}
        />
        <MetricCard
          label={localize('Move-in date', 'Itariki watujemo')}
          value={lease?.moveInDate ? formatDate(lease.moveInDate) : '—'}
          description={localize('Your current stay start date', 'Itariki watangiye gutura')}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{localize('Your lease', 'Amasezerano yawe')}</CardTitle>
              <CardDescription>
                {localize('Details about your current stay and property.', 'Amakuru ajyanye n\'aho utura n\'inyubako yawe.')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/payments')}>
              {localize('Pay rent', 'Ishyura ubukode')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lease ? (
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative h-40 w-full overflow-hidden rounded-lg sm:w-64">
                  <Image
                    src={lease.imageUrl || getFallbackPropertyImage()}
                    alt={lease.propertyName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 256px"
                  />
                </div>
                <div className="flex-1 space-y-3 text-sm">
                  <InfoRow
                    label={localize('Property', 'Inyubako')}
                    value={lease.propertyName}
                    helper={lease.propertyAddress}
                  />
                  <InfoRow label={localize('Room', 'Icyumba')} value={lease.roomNumber} />
                  <InfoRow label={localize('Monthly rent', 'Ubukode bw\'ukwezi')} value={formatCurrency(lease.rentAmount)} />
                  <InfoRow
                    label={localize('Next payment due', 'Itariki yo kwishyura itaha')}
                    value={lease.nextDueDate ? formatDate(lease.nextDueDate) : localize('Not set', 'Ntiteganyijwe')}
                    helper={isOverdue ? localize('Payment overdue', 'Ubwishyu butinze') : undefined}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {localize('No active lease found. Contact support if this is unexpected.', 'Nta masezerano akora abonetse. Vugana n\'ubuyobozi niba biteye ikibazo.')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{localize('Quick actions', 'Ibikorwa byihuse')}</CardTitle>
            <CardDescription>
              {localize('Access common tenant requests and support.', 'Geraho serivisi zikoreshwa kenshi n\'abakiriya.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="secondary" onClick={() => router.push('/payments')}>
              {localize('View payment history', 'Reba amateka y\'ubwishyu')}
            </Button>
            <Button variant="secondary" onClick={() => router.push('/tenant/requests')}>
              {localize('Submit maintenance request', 'Ohereza ubusabe bwo gusana')}
            </Button>
            <Button variant="secondary" onClick={() => router.push('/tenant/extend')}>
              {localize('Request lease extension', 'Saba kongera amasezerano')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{localize('Recent payments', 'Ubwishyu buheruka')}</CardTitle>
              <CardDescription>
                {localize('Track your recent rent payments.', 'Kurikirana ubwishyu bwawe bw\'ubukode.')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/payments')}>
              {localize('Manage payments', 'Tunganya ubwishyu')}
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{localize('Date', 'Itariki')}</TableHead>
                  <TableHead>{localize('Property', 'Inyubako')}</TableHead>
                  <TableHead>{localize('Room', 'Icyumba')}</TableHead>
                  <TableHead>{localize('Amount', 'Umubare')}</TableHead>
                  <TableHead>{localize('Status', 'Imiterere')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      {localize('No payments recorded yet.', 'Nta bwishyu bwanditswe.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.slice(0, 8).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell>{payment.propertyName}</TableCell>
                      <TableCell>{payment.roomNumber}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="capitalize">{localize(payment.status, payment.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{localize('Announcements', 'Amatangazo')}</CardTitle>
            <CardDescription>
              {localize('Updates from your property management team.', 'Amakuru atangwa n\'ubuyobozi bw\'inyubako.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {localize('No announcements at the moment.', 'Nta tangazo rihari ubu.')}
              </p>
            ) : (
              announcements.slice(0, 4).map((announcement) => (
                <div key={announcement.id} className="rounded-lg border bg-muted/40 px-3 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{announcement.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {announcement.created_at ? formatDate(announcement.created_at) : ''}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{announcement.content}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{announcement.priority}</span>
                    {announcement.expires_at ? (
                      <span>
                        {localize('Expires', 'Irangiye')} {formatDate(announcement.expires_at)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ label, value, description, highlight }: { label: string; value: string; description?: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-destructive/60 bg-destructive/5' : 'border-border/80'}>
      <CardHeader className="space-y-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className={`pt-0 text-sm ${highlight ? 'text-destructive' : 'text-muted-foreground'}`}>
          {description}
        </CardContent>
      ) : null}
    </Card>
  )
}

function InfoRow({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

