'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { useLanguage } from '@/lib/languageContext'
import { formatCurrency, formatDate, getFallbackPropertyImage } from '@/lib/helpers'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type DashboardRole = 'landlord' | 'manager' | 'admin'

interface UserProfile {
  id: string
  role: DashboardRole
  full_name: string
  email?: string
}

interface PropertySummary {
  id: string
  name: string
  address: string
  city: string
  property_type: string
  floors_count: number
  total_rooms: number
  occupied_rooms: number
  vacant_rooms: number
  occupancy_rate: number
  monthly_target_revenue: number
  actual_monthly_revenue: number
  featured_image_url?: string
  property_images?: string[]
}

interface TenantSummary {
  id: string
  name: string
  phone?: string
  propertyName: string
  roomNumber: string
  rent: number
  moveInDate?: string
}

interface PaymentSummary {
  id: string
  amount: number
  payment_date: string
  propertyName: string
  tenantName: string
  status: string
}

interface RevenuePoint {
  month: string
  amount: number
}

interface DashboardStats {
  totalProperties: number
  totalRooms: number
  occupiedRooms: number
  totalTenants: number
  occupancyRate: number
  monthlyRevenue: number
  previousMonthRevenue: number
}

const ALLOWED_ROLES: DashboardRole[] = ['landlord', 'manager', 'admin']

export default function LandlordDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { currentLanguage } = useLanguage()

  const locale = currentLanguage === 'rw' ? 'rw-RW' : 'en-US'
  const localize = (en: string, rw: string) => (currentLanguage === 'rw' ? rw : en)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [tenants, setTenants] = useState<TenantSummary[]>([])
  const [payments, setPayments] = useState<PaymentSummary[]>([])
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([])
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

      const { data: userRecordRaw, error: userError } = await supabase
        .from('users')
        .select('id, role, full_name, email')
        .eq('id', user.id)
        .single()

      const userRecord = userRecordRaw as any

      if (userError || !userRecord) {
        setError(localize('Unable to load profile information.', 'Ntibishobotse kubona amakuru yawe.'))
        setLoading(false)
        return
      }

      if (!ALLOWED_ROLES.includes(userRecord.role as DashboardRole)) {
        setError(localize('You do not have permission to view this dashboard.', 'Ntiwemerewe kureba iri dashboard.'))
        setLoading(false)
        return
      }

      const userProfile: UserProfile = {
        id: userRecord.id,
        role: userRecord.role as DashboardRole,
        full_name: userRecord.full_name,
        email: userRecord.email ?? undefined,
      }

      setProfile(userProfile)

      const { propertySummaries, tenantSummaries, statsSummary } = await fetchPropertySummaries(userProfile)
      setProperties(propertySummaries)
      setTenants(tenantSummaries)
      setStats(statsSummary)

      const propertyIds = propertySummaries.map((property) => property.id)

      if (propertyIds.length === 0) {
        setPayments([])
        setRevenueTrend([])
        return
      }

      const { paymentRows, revenuePoints, currentMonthRevenue, previousMonthRevenue } = await fetchRevenueAndPayments(
        propertyIds,
        propertySummaries,
        locale,
      )

      // reflect updated revenue totals inside property cards
      setProperties([...propertySummaries])
      setPayments(paymentRows)
      setRevenueTrend(revenuePoints)

      setStats((prev) =>
        prev
          ? {
              ...prev,
              monthlyRevenue: currentMonthRevenue,
              previousMonthRevenue,
            }
          : prev,
      )
    } catch (err) {
      console.error('[LandlordDashboard] Unexpected error:', err)
      setError(localize('Failed to load dashboard data.', 'Ntibyakunze kubona amakuru ya dashboard.'))
    } finally {
      setLoading(false)
    }
  }

  const occupancyLabel = useMemo(() => {
    if (!stats) return '0%'
    return `${stats.occupancyRate.toFixed(1)}%`
  }, [stats])

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">
            {localize('Loading dashboard...', 'Dashboard iri gutegurwa...')}
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

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{localize('No properties yet', 'Nta nyubako ziraboneka.')}</CardTitle>
            <CardDescription>
              {localize(
                'Add your first property to start tracking occupancy, tenants, and payments.',
                'Ongeraho inyubako yawe ya mbere kugira ngo utangire gukurikirana ubucamo, abakiriya n\'ubwishyu.',
              )}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/properties/add')}>
              {localize('Add property', 'Ongeraho inyubako')}
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
            {localize('Landlord dashboard', 'Dashboard y\'umukodeshabutaka')}
          </h1>
          <p className="text-muted-foreground">
            {localize('Track performance, occupancy, and tenant activity in real time.', 'Kurikirana imikorere, ubucamo n\'ibikorwa by\'abakiriya mu gihe nyacyo.')}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {profile?.full_name}
          {profile?.email ? <span className="ml-2 text-xs text-muted-foreground">{profile.email}</span> : null}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={localize('Total properties', 'Inyubako zose')}
          value={stats.totalProperties.toString()}
          description={localize('Active buildings in portfolio', 'Inyubako zikora mu mutungo')}
        />
        <MetricCard
          label={localize('Total tenants', 'Abakiriya bose')}
          value={stats.totalTenants.toString()}
          description={localize('Active tenants across all properties', 'Abakiriya bakora mu nyubako zose')}
        />
        <MetricCard
          label={localize('Monthly revenue', 'Umun收益 w\'ukwezi')}
          value={formatCurrency(stats.monthlyRevenue)}
          description={localize('Last 30 days collections', 'Ubwishyu bw\'iminsi 30 ishize')}
        />
        <MetricCard
          label={localize('Occupancy rate', 'Igipimo cy\'ubucamo')}
          value={occupancyLabel}
          description={`${stats.occupiedRooms}/${stats.totalRooms} ${localize('occupied', 'byatuyemo')}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="h-full">
          <CardHeader className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle>{localize('Revenue trend', 'Imigendekere y\'ubwishyu')}</CardTitle>
              <CardDescription>
                {localize('Monthly rent collections over the last 6 months.', 'Ubwishyu bw\'ubukode mu mezi atandatu ashize.')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {revenueTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {localize('Not enough data to display revenue trend yet.', 'Ntabwo dufite amakuru ahagije yo kwerekana imigendekere y\'ubwishyu.')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatCurrency(value)} width={100} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--background))', borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{localize('Portfolio snapshot', 'Incamake y\'umutungo')}</CardTitle>
            <CardDescription>
              {localize('Overview of rooms, tenants, and revenue goals.', 'Incamake y\'ibyumba, abakiriya n\'intego z\'ubwishyu.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SnapshotRow
              label={localize('Total rooms', 'Ibyumba byose')}
              value={stats.totalRooms.toString()}
              helper={`${stats.totalProperties} ${localize('properties', 'inyubako')}`}
            />
            <SnapshotRow
              label={localize('Occupied rooms', 'Ibyumba byatuyemo')}
              value={stats.occupiedRooms.toString()}
              helper={occupancyLabel}
            />
            <SnapshotRow
              label={localize('Expected revenue', 'Umun收益 uteganyijwe')}
              value={formatCurrency(
                properties.reduce((sum, property) => sum + property.monthly_target_revenue, 0)
              )}
              helper={localize('Based on listed rent amounts', 'Hashingiwe ku mafaranga y\'ubukode yatangajwe')}
            />
            <SnapshotRow
              label={localize('Collected revenue', 'Umun收益 wakusanyijwe')}
              value={formatCurrency(stats.monthlyRevenue)}
              helper={localize('Last 30 days', 'Iminsi 30 ishize')}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{localize('Properties', 'Inyubako')}</CardTitle>
              <CardDescription>
                {localize('Occupancy, revenue, and performance by property.', 'Ubucamo, umusaruro n\'imikorere ya buri nyubako.')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/properties')}>
              {localize('View all properties', 'Reba inyubako zose')}
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{localize('Property', 'Inyubako')}</TableHead>
                  <TableHead>{localize('Occupancy', 'Ubucamo')}</TableHead>
                  <TableHead>{localize('Vacant', 'Bubusa')}</TableHead>
                  <TableHead>{localize('Target revenue', 'Intego y\'umusanzu')}</TableHead>
                  <TableHead>{localize('Actual revenue', 'Umun收益 nyawo')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{localize('City', 'Umujyi')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      {localize('No properties found.', 'Nta nyubako ziboneka.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  properties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-14 overflow-hidden rounded-md">
                            <Image
                              src={property.featured_image_url || property.property_images?.[0] || getFallbackPropertyImage()}
                              alt={property.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                          <div>
                            <p className="font-medium">{property.name}</p>
                            <p className="text-xs text-muted-foreground">{property.address}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{property.occupancy_rate}%</span>
                          <span className="text-xs text-muted-foreground">
                            {property.occupied_rooms}/{property.total_rooms} {localize('occupied', 'byatuyemo')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{property.vacant_rooms}</TableCell>
                      <TableCell>{formatCurrency(property.monthly_target_revenue)}</TableCell>
                      <TableCell>{formatCurrency(property.actual_monthly_revenue)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{property.city || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle>{localize('Active tenants', 'Abakiriya bakora')}</CardTitle>
            <CardDescription>
              {localize('Top tenants by rent amount and recent move-ins.', 'Abakiriya bakomeye ku mafaranga batanga n\'igihe binjiyemo vuba.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {localize('No active tenants found.', 'Nta bakiriya bakora babonetse.')}
              </p>
            ) : (
              tenants.slice(0, 6).map((tenant) => (
                <div key={tenant.id} className="rounded-lg border bg-muted/40 px-3 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.propertyName}</p>
                    </div>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(tenant.rent)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {localize('Room', 'Icyumba')} {tenant.roomNumber}
                    </span>
                    <span>{tenant.moveInDate ? formatDate(tenant.moveInDate) : '—'}</span>
                  </div>
                  {tenant.phone ? (
                    <p className="mt-1 text-xs text-muted-foreground">{tenant.phone}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{localize('Recent payments', 'Ubwishyu bwaherukaga')}</CardTitle>
              <CardDescription>
                {localize('Latest rent payments collected across your properties.', 'Ubwishyu bushya bwakiriwe mu nyubako zawe.')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/payments')}>
              {localize('View all payments', 'Reba ubwishyu bwose')}
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{localize('Date', 'Itariki')}</TableHead>
                  <TableHead>{localize('Tenant', 'Umukiriya')}</TableHead>
                  <TableHead>{localize('Property', 'Inyubako')}</TableHead>
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
                      <TableCell>{payment.tenantName}</TableCell>
                      <TableCell>{payment.propertyName}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="capitalize">{payment.status || 'completed'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">{description}</CardContent>
      ) : null}
    </Card>
  )
}

function SnapshotRow({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

async function fetchPropertySummaries(userProfile: UserProfile) {
  const propertySummaries: PropertySummary[] = []
  const tenantSummaries: TenantSummary[] = []

  const isLandlord = userProfile.role === 'landlord'
  const rpcName = isLandlord ? 'get_landlord_properties' : 'get_manager_properties'
  const rpcPayload = isLandlord
    ? { p_landlord_id: userProfile.id }
    : { p_manager_id: userProfile.id }

  const { data: propertiesData, error: propertiesError } = await supabase.rpc<any>(
    rpcName as any,
    rpcPayload as any,
  )

  if (propertiesError) {
    throw propertiesError
  }

  const propertiesList = (propertiesData || []) as any[]

  let totalRooms = 0
  let occupiedRooms = 0
  let totalTenants = 0

  for (const property of propertiesList) {
    const { data: roomsData, error: roomsError } = await supabase.rpc('get_property_rooms', {
      p_property_id: property.id,
    } as any)

    if (roomsError) {
      throw roomsError
    }

    const rooms = (roomsData || []) as any[]
    const propertyRooms = rooms.length
    let propertyOccupied = 0
    let propertyTarget = 0
    const activeTenantsForProperty: TenantSummary[] = []

    rooms.forEach((room: any) => {
      const activeTenant = room.room_tenants?.find((tenant: any) => tenant.is_active)
      const roomOccupied = Boolean(activeTenant)

      propertyTarget += room.rent_amount || 0

      if (roomOccupied) {
        propertyOccupied += 1
        occupiedRooms += 1
        totalTenants += 1

        activeTenantsForProperty.push({
          id: activeTenant?.tenants?.id || `${room.id}-tenant`,
          name: activeTenant?.tenants?.full_name || 'Tenant',
          phone: activeTenant?.tenants?.phone_number || undefined,
          propertyName: property.name,
          roomNumber: room.room_number || '-',
          rent: room.rent_amount || 0,
          moveInDate: activeTenant?.move_in_date || room.created_at,
        })
      }
    })

    totalRooms += propertyRooms
    tenantSummaries.push(...activeTenantsForProperty)

    propertySummaries.push({
      id: property.id,
      name: property.name,
      address: property.address,
      city: property.city,
      property_type: property.property_type || 'residential',
      floors_count: property.floors_count || 0,
      total_rooms: propertyRooms,
      occupied_rooms: propertyOccupied,
      vacant_rooms: propertyRooms - propertyOccupied,
      occupancy_rate: propertyRooms > 0 ? Math.round((propertyOccupied / propertyRooms) * 1000) / 10 : 0,
      monthly_target_revenue: propertyTarget,
      actual_monthly_revenue: 0,
      featured_image_url: property.featured_image_url,
      property_images: property.property_images,
    })
  }

  const statsSummary: DashboardStats | null = propertiesList.length
    ? {
        totalProperties: propertiesList.length,
        totalRooms,
        occupiedRooms,
        totalTenants,
        occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
        monthlyRevenue: 0,
        previousMonthRevenue: 0,
      }
    : null

  return {
    propertySummaries,
    tenantSummaries,
    statsSummary,
  }
}

async function fetchRevenueAndPayments(
  propertyIds: string[],
  propertySummaries: PropertySummary[],
  locale: string,
) {
  const propertyMap = new Map(propertySummaries.map((property) => [property.id, property]))

  const { data: paymentsData, error: paymentsError } = await supabase
    .from('payments')
    .select(
      `id, amount, payment_date, payment_status, rooms!inner(id, room_number, property_id), tenants!inner(id, full_name, phone_number)`
    )
    .in('rooms.property_id', propertyIds)
    .order('payment_date', { ascending: false })
    .limit(200)

  if (paymentsError) {
    throw paymentsError
  }

  const paymentsList = paymentsData || []

  const revenueByMonth = new Map<string, number>()
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${previousMonthDate.getMonth()}`

  let currentMonthRevenue = 0
  let previousMonthRevenue = 0

  const paymentRows: PaymentSummary[] = paymentsList.map((payment: any) => {
    const propertyId = payment.rooms?.property_id
    const property = propertyMap.get(propertyId)
    const paymentDate = payment.payment_date

    const paymentMonth = new Date(paymentDate)
    const monthKey = `${paymentMonth.getFullYear()}-${paymentMonth.getMonth()}`
    const existing = revenueByMonth.get(monthKey) || 0
    revenueByMonth.set(monthKey, existing + (payment.amount || 0))

    if (monthKey === thisMonthKey) {
      currentMonthRevenue += payment.amount || 0
    }
    if (monthKey === previousMonthKey) {
      previousMonthRevenue += payment.amount || 0
    }

    if (property) {
      property.actual_monthly_revenue += payment.amount || 0
    }

    return {
      id: payment.id,
      amount: payment.amount || 0,
      payment_date: paymentDate,
      propertyName: property?.name || '—',
      tenantName: payment.tenants?.full_name || '—',
      status: payment.payment_status || 'completed',
    }
  })

  const revenuePoints: RevenuePoint[] = Array.from(revenueByMonth.entries())
    .map(([monthKey, amount]) => {
      const [year, monthIndex] = monthKey.split('-').map(Number)
      const labelDate = new Date(year, monthIndex, 1)
      const monthLabel = new Intl.DateTimeFormat(locale, { month: 'short' }).format(labelDate)
      return {
        month: monthLabel,
        amount,
        order: year * 12 + monthIndex,
      }
    })
    .sort((a, b) => a.order - b.order)
    .map(({ month, amount }) => ({ month, amount }))

  return {
    paymentRows,
    revenuePoints,
    currentMonthRevenue,
    previousMonthRevenue,
  }
}

