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
import { Search, MapPin, Home as HomeIcon, Bed, Calendar, DollarSign, AlertCircle } from 'lucide-react'
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
      router.push('/auth/sign-in')
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Find Your Perfect Home</h1>
        <p className="text-muted-foreground text-lg">Easy rentals, better life</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4 md:flex md:items-center md:gap-4 md:space-y-0">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price_low">Price: Low to High</SelectItem>
            <SelectItem value="price_high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : properties.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No properties found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const imageUrl = getPropertyImage(property)
            const isAvailable = property.available_rooms > 0

            return (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48 w-full">
                  <Image
                    src={imageUrl}
                    alt={property.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      isAvailable
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                    )}>
                      {isAvailable ? `${property.available_rooms} Available` : 'Fully Occupied'}
                    </span>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-1">{property.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {property.city}, {property.country}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price Range</span>
                      <span className="font-semibold">
                        {property.price_range_min
                          ? `${formatCurrency(property.price_range_min)} - ${formatCurrency(property.price_range_max || property.price_range_min)}`
                          : 'Price on request'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        {property.total_rooms} rooms
                      </span>
                      <span className="flex items-center gap-1">
                        <HomeIcon className="h-4 w-4" />
                        {property.property_type}
                      </span>
                    </div>
                    {property.amenities && property.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {property.amenities.slice(0, 3).map((amenity, idx) => (
                          <span key={idx} className="px-2 py-1 bg-secondary text-xs rounded">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handlePropertyClick(property)}
                      >
                        View Details
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => handleBookNow(property)}
                        disabled={!isAvailable}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
                  Book Now
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
