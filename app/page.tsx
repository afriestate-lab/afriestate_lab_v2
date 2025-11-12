'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useLanguage } from '@/lib/languageContext'
import { supabase, webUtils } from '@/lib/supabase'
import { formatCurrency, getFallbackPropertyImage } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, MapPin, Home as HomeIcon, Bed, Calendar, DollarSign, AlertCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Property {
  id: string
  name: string
  address: string
  city: string
  country: string
  floors_count: number
  landlord_id: string
  description?: string
  featured_image_url?: string
  image_url?: string
  property_images?: string[]
  amenities?: string[]
  property_type: 'apartment' | 'house' | 'villa' | 'studio' | 'room'
  is_published: boolean
  price_range_min?: number
  price_range_max?: number
  total_rooms: number
  available_rooms: number
  created_at: string
  updated_at: string
}

export default function HomePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('newest')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const fetchProperties = async (page = 1, searchQuery = '', sortOrder = 'newest') => {
    try {
      setLoading(true)

      const { data: propertiesData, error } = await webUtils.retryRequest(async () => {
        if (sortOrder === 'price_low' || sortOrder === 'price_high') {
          return await supabase
            .rpc('get_public_properties_by_price', {
              p_search_query: searchQuery || null,
              p_sort_order: sortOrder,
              p_page: page,
              p_items_per_page: 20
            })
        } else {
          return await supabase
            .rpc('get_public_properties', {
              p_search_query: searchQuery || null,
              p_sort_order: sortOrder,
              p_page: page,
              p_items_per_page: 20
            })
        }
      })

      if (error) {
        console.error('Error fetching properties:', error)
        return
      }

      const transformedProperties: Property[] = (propertiesData || []).map((property: any) => ({
        ...property,
        amenities: Array.isArray(property.amenities) ? property.amenities : ['WiFi', 'Parking', 'Security']
      }))

      setProperties(transformedProperties)
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      fetchProperties(1, search, sortBy)
    }
  }, [search, sortBy, authLoading])

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property)
    setShowDetails(true)
  }

  const handleBookNow = (property: Property) => {
    if (!user) {
      const redirectUrl = `/booking?property=${property.id}`
      router.push(`/auth/sign-in?redirect=${encodeURIComponent(redirectUrl)}`)
      return
    }
    router.push(`/booking?property=${property.id}`)
  }

  const getPropertyImage = (property: Property) => {
    // For web, all URLs are HTTP/HTTPS, so no need to check for local file URIs
    if (property.featured_image_url) {
      return property.featured_image_url
    }
    if (property.image_url) {
      return property.image_url
    }
    if (property.property_images && property.property_images.length > 0) {
      const validImage = property.property_images.find(img => img && img.startsWith('http'))
      if (validImage) return validImage
    }
    return getFallbackPropertyImage()
  }

  const currentLanguage = t('home') === 'Ahabanza' ? 'rw' : 'en'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Profile Access */}
        {user && (
          <div className="mb-6 flex justify-end">
            <Button
              variant="ghost"
              onClick={() => router.push('/profile')}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              {currentLanguage === 'rw' ? 'Konti' : 'Profile'}
            </Button>
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-block mb-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
              {currentLanguage === 'rw' ? 'Hitamo icumbi rikunogeye' : 'Find Your Perfect Home'}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {currentLanguage === 'rw' 
                ? '🤗 inzu yo gukoreramo mu nyubako zikunzwe mu Rwanda ku giciro gito 😍'
                : 'Easy rentals, better life. Discover quality properties in Rwanda at affordable prices.'}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4 md:flex md:items-center md:gap-4 md:space-y-0">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={currentLanguage === 'rw' ? 'Shakisha inyubako...' : 'Search properties...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 text-base shadow-sm"
              />
            </div>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[220px] h-12">
              <SelectValue placeholder={currentLanguage === 'rw' ? 'Gutondekanya' : 'Sort by'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{currentLanguage === 'rw' ? 'Gishya cyane' : 'Newest First'}</SelectItem>
              <SelectItem value="oldest">{currentLanguage === 'rw' ? 'Gishize' : 'Oldest First'}</SelectItem>
              <SelectItem value="price_low">{currentLanguage === 'rw' ? 'Igiciro: Guke cyangwa Gikabije' : 'Price: Low to High'}</SelectItem>
              <SelectItem value="price_high">{currentLanguage === 'rw' ? 'Igiciro: Gikabije cyangwa Guke' : 'Price: High to Low'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : properties.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-md">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{currentLanguage === 'rw' ? 'Nta nyubako ziboneka' : 'No properties found'}</h3>
          <p className="text-muted-foreground">{currentLanguage === 'rw' ? 'Gerageza gushakisha amagambo atandukanye' : 'Try searching with different terms'}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const imageUrl = getPropertyImage(property)
            const isAvailable = property.available_rooms > 0

            return (
              <Card key={property.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md group">
                <div className="relative h-64 w-full overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={property.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm",
                      isAvailable
                        ? "bg-green-500/90 text-white"
                        : "bg-red-500/90 text-white"
                    )}>
                      {isAvailable 
                        ? `${property.available_rooms} ${currentLanguage === 'rw' ? 'Bihari' : 'Available'}`
                        : currentLanguage === 'rw' ? 'Byuzuye' : 'Fully Occupied'}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="text-lg font-bold mb-1 line-clamp-1">{property.name}</h3>
                    <div className="flex items-center gap-1 text-sm opacity-90">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{property.city}, {property.country}</span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {/* Price */}
                    <div className="flex items-center justify-between pb-3 border-b">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {currentLanguage === 'rw' ? 'Agaciro' : 'Price Range'}
                      </span>
                      <span className="font-bold text-primary text-lg">
                        {property.price_range_min
                          ? `${formatCurrency(property.price_range_min)}${property.price_range_max && property.price_range_max !== property.price_range_min ? ` - ${formatCurrency(property.price_range_max)}` : ''}`
                          : currentLanguage === 'rw' ? 'Bishakishwa' : 'Price on request'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Bed className="h-4 w-4" />
                        <span>{property.total_rooms} {currentLanguage === 'rw' ? 'ibyumba' : 'rooms'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <HomeIcon className="h-4 w-4" />
                        <span className="capitalize">{property.property_type}</span>
                      </div>
                    </div>

                    {/* Amenities */}
                    {property.amenities && property.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {property.amenities.slice(0, 3).map((amenity, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 3 && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">
                            +{property.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handlePropertyClick(property)}
                      >
                        {currentLanguage === 'rw' ? 'Reba' : 'View'}
                      </Button>
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90"
                        onClick={() => handleBookNow(property)}
                        disabled={!isAvailable}
                      >
                        {!user ? (
                          <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {currentLanguage === 'rw' ? 'Injira' : 'Sign In'}
                          </>
                        ) : (
                          currentLanguage === 'rw' ? 'Saba' : 'Book Now'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      </div>

      {/* Property Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProperty && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProperty.name}</DialogTitle>
                <DialogDescription>
                  {selectedProperty.city}, {selectedProperty.country}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative h-64 w-full rounded-lg overflow-hidden">
                  <Image
                    src={getPropertyImage(selectedProperty)}
                    alt={selectedProperty.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProperty.description || 'No description available'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium">{selectedProperty.property_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rooms</p>
                    <p className="font-medium">{selectedProperty.total_rooms}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Rooms</p>
                    <p className="font-medium">{selectedProperty.available_rooms}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price Range</p>
                    <p className="font-medium">
                      {selectedProperty.price_range_min
                        ? `${formatCurrency(selectedProperty.price_range_min)} - ${formatCurrency(selectedProperty.price_range_max || selectedProperty.price_range_min)}`
                        : 'Price on request'}
                    </p>
                  </div>
                </div>
                {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, idx) => (
                        <span key={idx} className="px-3 py-1 bg-secondary rounded-full text-sm">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => handleBookNow(selectedProperty)}
                  disabled={selectedProperty.available_rooms === 0}
                >
                  {!user ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {currentLanguage === 'rw' ? 'Injira kugira ngo ushobore gusaba' : 'Sign In to Book'}
                    </>
                  ) : (
                    currentLanguage === 'rw' ? 'Saba' : 'Book Now'
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
