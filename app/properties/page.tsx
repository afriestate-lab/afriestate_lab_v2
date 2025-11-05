'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { useLanguage } from '@/lib/languageContext'
import { formatCurrency, formatDate, getFallbackPropertyImage } from '@/lib/helpers'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import RoleGuard from '@/components/web-role-guard'

type RoomStatus = 'occupied' | 'vacant' | 'maintenance'

interface Room {
  id: string
  room_number: string
  floor_number: number
  rent_amount: number
  status: RoomStatus
  billing_type?: string
  tenant?: {
    id: string
    full_name: string
    phone_number: string
    move_in_date: string
  }
}

interface Floor {
  floorNumber: number
  floorName: string
  rooms: Room[]
}

interface PropertyDetail {
  id: string
  name: string
  address: string
  city: string
  description: string
  property_type: string
  floors_count: number
  total_rooms: number
  occupied_rooms: number
  vacant_rooms: number
  monthly_target_revenue: number
  actual_monthly_revenue: number
  occupancy_rate: number
  average_rent: number
  featured_image_url?: string
  property_images?: string[]
  floors: Floor[]
}

interface UserProfile {
  id: string
  full_name: string
  email?: string
  role: 'landlord' | 'manager' | 'admin' | 'tenant'
}

const statusLabels = {
  all: { en: 'All rooms', rw: 'Ibyumba byose' },
  occupied: { en: 'Occupied', rw: 'Cyatuwemo' },
  vacant: { en: 'Vacant', rw: 'Cyubusa' },
  maintenance: { en: 'Maintenance', rw: 'Gisuzumwa' },
}

const statusOptions = ['all', 'occupied', 'vacant', 'maintenance'] as const

const statusColors: Record<RoomStatus, string> = {
  occupied: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  vacant: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  maintenance: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
}

function PropertiesPageContent() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t, currentLanguage } = useLanguage()

  const locale = currentLanguage === 'rw' ? 'rw' : 'en'

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [properties, setProperties] = useState<PropertyDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | RoomStatus>('all')
  const [selectedProperty, setSelectedProperty] = useState<PropertyDetail | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/sign-in')
        return
      }
      loadProfileAndProperties()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const loadProfileAndProperties = async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role, full_name, email')
        .eq('id', user.id)
        .single()

      if (userError || !userData) {
        setError(t('unableToLoadProfile') || 'Unable to load profile information.')
        setLoading(false)
        return
      }

      const profileData: UserProfile = {
        id: userData.id,
        role: userData.role,
        full_name: userData.full_name,
        email: userData.email,
      }

      setProfile(profileData)
      await fetchProperties(profileData)
    } catch (err) {
      console.error('Error loading profile:', err)
      setError(t('failedToLoadProperties') || 'Failed to load properties.')
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async (userProfile: UserProfile) => {
    try {
      setLoading(true)
      setError(null)

      const isLandlord = userProfile.role === 'landlord'
      const isManager = userProfile.role === 'manager' || userProfile.role === 'admin'

      let propertiesData: any[] | null = []
      let propertiesError: Error | null = null

      if (isLandlord) {
        const { data, error } = await supabase.rpc('get_landlord_properties', {
          p_landlord_id: userProfile.id,
        })
        propertiesData = data
        propertiesError = error
      } else if (isManager) {
        const { data, error } = await supabase.rpc('get_manager_properties', {
          p_manager_id: userProfile.id,
        })
        propertiesData = data
        propertiesError = error
      } else {
        propertiesData = []
      }

      if (propertiesError) {
        throw propertiesError
      }

      if (!propertiesData || propertiesData.length === 0) {
        setProperties([])
        return
      }

      const detailedProperties: PropertyDetail[] = await Promise.all(
        propertiesData.map(async (property: any) => {
          const { data: roomsData, error: roomsError } = await supabase.rpc('get_property_rooms', {
            p_property_id: property.id,
          })

          if (roomsError) {
            throw roomsError
          }

          const roomIds = roomsData?.map((room: any) => room.id) || []
          let paymentsData: { amount: number; payment_date: string }[] = []

          if (roomIds.length > 0) {
            const { data: payments } = await supabase
              .from('payments')
              .select('amount, payment_date')
              .in('room_id', roomIds)
              .gte('payment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

            paymentsData = payments || []
          }

          const floorMap = new Map<number, Room[]>()
          let occupiedCount = 0
          let totalRent = 0

          roomsData?.forEach((room: any) => {
            const activeTenant = room.room_tenants?.find((rt: any) => rt.is_active)
            const roomStatus: RoomStatus = activeTenant ? 'occupied' : 'vacant'

            if (roomStatus === 'occupied') {
              occupiedCount += 1
            }

            totalRent += room.rent_amount || 0

            const roomDetail: Room = {
              id: room.id,
              room_number: room.room_number,
              floor_number: room.floor_number,
              rent_amount: room.rent_amount,
              status: roomStatus,
              billing_type: room.billing_type,
              tenant: activeTenant
                ? {
                    id: activeTenant.tenants?.id,
                    full_name: activeTenant.tenants?.full_name,
                    phone_number: activeTenant.tenants?.phone_number,
                    move_in_date: activeTenant.move_in_date,
                  }
                : undefined,
            }

            if (!floorMap.has(room.floor_number)) {
              floorMap.set(room.floor_number, [])
            }

            floorMap.get(room.floor_number)!.push(roomDetail)
          })

          const floors: Floor[] = []
          const expectedFloors = property.floors_count || Math.max(...(floorMap.size ? Array.from(floorMap.keys()) : [1]))

          for (let floorNum = 1; floorNum <= expectedFloors; floorNum += 1) {
            floors.push({
              floorNumber: floorNum,
              floorName: currentLanguage === 'en' ? `Floor ${floorNum}` : `Urugero ${floorNum}`,
              rooms: floorMap.get(floorNum) || [],
            })
          }

          const totalRooms = roomsData?.length || 0
          const occupancyRate = totalRooms > 0 ? (occupiedCount / totalRooms) * 100 : 0
          const actualRevenue = paymentsData.reduce((sum, payment) => sum + payment.amount, 0)

          return {
            id: property.id,
            name: property.name,
            address: property.address,
            city: property.city,
            description: property.description || '',
            property_type: property.property_type || 'residential',
            floors_count: expectedFloors,
            total_rooms: totalRooms,
            occupied_rooms: occupiedCount,
            vacant_rooms: totalRooms - occupiedCount,
            monthly_target_revenue: totalRent,
            actual_monthly_revenue: actualRevenue,
            occupancy_rate: Math.round(occupancyRate * 10) / 10,
            average_rent: totalRooms > 0 ? Math.round(totalRent / totalRooms) : 0,
            featured_image_url: property.featured_image_url,
            property_images: property.property_images,
            floors,
          }
        })
      )

      setProperties(detailedProperties)
    } catch (err) {
      console.error('Error fetching properties:', err)
      setError(t('failedToLoadProperties') || 'Failed to load properties.')
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return properties.filter((property) => {
      const matchesSearch =
        term.length === 0 ||
        property.name.toLowerCase().includes(term) ||
        property.city?.toLowerCase().includes(term) ||
        property.address?.toLowerCase().includes(term)

      if (!matchesSearch) {
        return false
      }

      if (selectedStatus === 'all') {
        return true
      }

      const hasRoomsWithStatus = property.floors
        .flatMap((floor) => floor.rooms)
        .some((room) => room.status === selectedStatus)

      return hasRoomsWithStatus
    })
  }, [properties, searchTerm, selectedStatus])

  const selectedPropertyRooms = useMemo(() => {
    if (!selectedProperty) {
      return []
    }

    const rooms = selectedProperty.floors.flatMap((floor) => floor.rooms)

    if (selectedStatus === 'all') {
      return rooms
    }

    return rooms.filter((room) => room.status === selectedStatus)
  }, [selectedProperty, selectedStatus])

  const handleOpenProperty = (property: PropertyDetail) => {
    setSelectedProperty(property)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedProperty(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('properties')}</h1>
          <p className="text-muted-foreground">
            {t('propertiesSubtitle') || 'Monitor and manage your properties, occupancy, and revenue insights.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder={t('searchProperties') || 'Search properties'}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="md:w-64"
          />
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as RoomStatus | 'all')}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder={t('filterByStatus') || 'Filter by status'} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => {
                const label = statusLabels[option][locale]
                return (
                  <SelectItem key={option} value={option}>
                    {label}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-6" />

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">{t('loadingProperties') || 'Loading property data...'}</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5 text-destructive">
          <CardHeader>
            <CardTitle>{t('error') || 'Error'}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={loadProfileAndProperties}>
              {t('retry') || 'Retry'}
            </Button>
          </CardFooter>
        </Card>
      ) : filteredProperties.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('noPropertiesFound') || 'No properties found'}</CardTitle>
            <CardDescription>
              {t('adjustSearchOrFilters') || 'Try adjusting your search or filters to see your properties.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map((property) => {
            const occupancyLabel = `${property.occupied_rooms}/${property.total_rooms} ${statusLabels.occupied[locale]}`
            const vacancyLabel = `${property.vacant_rooms} ${statusLabels.vacant[locale]}`

            const imageUrl = property.featured_image_url || property.property_images?.[0] || getFallbackPropertyImage()

            return (
              <Card key={property.id} className="flex flex-col overflow-hidden">
                <div className="relative h-48 w-full">
                  <Image
                    src={imageUrl}
                    alt={property.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium capitalize shadow">
                      {property.property_type}
                    </span>
                    <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium shadow">
                      {property.city || (currentLanguage === 'en' ? 'Unknown city' : 'Umujyi utazwi')}
                    </span>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle>{property.name}</CardTitle>
                  <CardDescription>{property.address}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">{t('occupancy') || 'Occupancy'}</p>
                      <p className="text-lg font-semibold">{property.occupancy_rate}%</p>
                      <p className="text-xs text-muted-foreground">{occupancyLabel}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">{t('vacancy') || 'Vacancy'}</p>
                      <p className="text-lg font-semibold">{vacancyLabel}</p>
                      <p className="text-xs text-muted-foreground">{t('floorsCount') || 'Floors'}: {property.floors_count}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">{t('targetRevenue') || 'Target revenue'}</p>
                      <p className="text-lg font-semibold">{formatCurrency(property.monthly_target_revenue)}</p>
                      <p className="text-xs text-muted-foreground">{t('averageRent') || 'Average rent'}: {formatCurrency(property.average_rent)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">{t('last30Days') || 'Last 30 days'}</p>
                      <p className="text-lg font-semibold">{formatCurrency(property.actual_monthly_revenue)}</p>
                      <p className="text-xs text-muted-foreground">{t('actualRevenue') || 'Actual revenue'}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" onClick={() => handleOpenProperty(property)}>
                    {t('viewDetails') || 'View details'}
                  </Button>
                  <Button onClick={() => router.push(`/properties/${property.id}`)}>
                    {t('manageProperty') || 'Manage property'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : handleCloseDialog())}>
        <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-2xl font-semibold">
              {selectedProperty?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedProperty?.address}</p>
          </DialogHeader>

          {selectedProperty ? (
            <div className="h-[70vh] overflow-y-auto">
              <div className="space-y-6 px-6 py-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label={t('occupancyRate') || 'Occupancy rate'}
                    description={`${selectedProperty.occupied_rooms}/${selectedProperty.total_rooms} ${t('occupied') || 'occupied'}`}
                    value={`${selectedProperty.occupancy_rate}%`}
                  />
                  <MetricCard
                    label={t('vacantRooms') || 'Vacant rooms'}
                    description={t('roomsAvailable') || 'Rooms available'}
                    value={String(selectedProperty.vacant_rooms)}
                  />
                  <MetricCard
                    label={t('monthlyTarget') || 'Monthly target'}
                    description={t('averageRent') || 'Average rent'}
                    value={formatCurrency(selectedProperty.monthly_target_revenue)}
                    extra={formatCurrency(selectedProperty.average_rent)}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('propertySummary') || 'Property summary'}</CardTitle>
                      <CardDescription>{selectedProperty.description || t('propertySummaryDescription') || 'Overview of property details.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('propertyType') || 'Property type'}</span>
                        <span className="font-medium capitalize">{selectedProperty.property_type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('floorsCount') || 'Floors'}</span>
                        <span className="font-medium">{selectedProperty.floors_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('rooms') || 'Rooms'}</span>
                        <span className="font-medium">{selectedProperty.total_rooms}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('last30Days') || 'Last 30 days'}</span>
                        <span className="font-medium">{formatCurrency(selectedProperty.actual_monthly_revenue)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle>{t('roomsOverview') || 'Rooms overview'}</CardTitle>
                        <CardDescription>
                          {t('roomsOverviewDescription') || 'Room occupancy status and tenant details.'}
                        </CardDescription>
                      </div>
                      <Select
                        value={selectedStatus}
                        onValueChange={(value) => setSelectedStatus(value as RoomStatus | 'all')}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder={t('filterByStatus') || 'Filter'} />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => {
                            const label = statusLabels[option][locale]
                            return (
                              <SelectItem key={option} value={option}>
                                {label}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </CardHeader>
                    <CardContent className="px-0">
                      <div className="h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('room') || 'Room'}</TableHead>
                              <TableHead>{t('floor') || 'Floor'}</TableHead>
                              <TableHead>{t('status') || 'Status'}</TableHead>
                              <TableHead>{t('tenant') || 'Tenant'}</TableHead>
                              <TableHead>{t('rent') || 'Rent'}</TableHead>
                              <TableHead>{t('moveInDate') || 'Move-in'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedPropertyRooms.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                                  {t('noRoomsForFilter') || 'No rooms match the current filter.'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              selectedPropertyRooms.map((room) => (
                                <TableRow key={room.id}>
                                  <TableCell className="font-medium">{room.room_number}</TableCell>
                                  <TableCell>{room.floor_number}</TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[room.status]}`}>
                                      {statusLabels[room.status][locale]}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {room.tenant ? (
                                      <div className="flex flex-col">
                                        <span className="font-medium">{room.tenant.full_name}</span>
                                        <span className="text-xs text-muted-foreground">{room.tenant.phone_number}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">{currentLanguage === 'en' ? 'No tenant' : 'Nta mukiriya'}</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{formatCurrency(room.rent_amount)}</TableCell>
                                  <TableCell>
                                    {room.tenant?.move_in_date ? formatDate(room.tenant.move_in_date) : '—'}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {selectedProperty.floors.map((floor) => (
                    <Card key={floor.floorNumber}>
                      <CardHeader>
                        <CardTitle>{floor.floorName}</CardTitle>
                        <CardDescription>
                          {t('floorRoomsCount') || 'Rooms'}: {floor.rooms.length}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {floor.rooms.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t('noRoomsOnFloor') || 'No rooms on this floor.'}</p>
                        ) : (
                          floor.rooms.map((room) => (
                            <div key={room.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">{t('room')} {room.room_number}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {room.tenant ? t('occupiedBy') || 'Occupied by' : t('status') || 'Status'}{' '}
                                    {room.tenant ? room.tenant.full_name : t(room.status as any) || room.status}
                                  </p>
                                </div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusColors[room.status]}`}>
                                  {statusLabels[room.status][locale]}
                                </span>
                              </div>
                              <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                  <span>{t('rent') || 'Rent'}</span>
                                  <span className="font-medium text-foreground">{formatCurrency(room.rent_amount)}</span>
                                </div>
                                {room.tenant && room.tenant.move_in_date && (
                                  <div className="flex items-center justify-between">
                                    <span>{t('moveInDate') || 'Move-in'}</span>
                                    <span>{formatDate(room.tenant.move_in_date)}</span>
                                  </div>
                                )}
                                {room.tenant?.phone_number && (
                                  <div className="flex items-center justify-between">
                                    <span>{t('phone') || 'Phone'}</span>
                                    <span>{room.tenant.phone_number}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="border-t bg-muted/40 px-6 py-4">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                {t('close') || 'Close'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface MetricCardProps {
  label: string
  description?: string
  value: string
  extra?: string
}

function MetricCard({ label, description, value, extra }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {(description || extra) && (
        <CardContent className="pt-0">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {extra && <p className="mt-1 text-xs text-muted-foreground">{extra}</p>}
        </CardContent>
      )}
    </Card>
  )
}

export default function PropertiesPage() {
  return (
    <RoleGuard allowedRoles={['landlord', 'manager', 'admin']} screenName="properties-page">
      <PropertiesPageContent />
    </RoleGuard>
  )
}

