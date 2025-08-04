import React, { useState, useEffect, useContext } from 'react'
import { View, StyleSheet, Image, Dimensions, ScrollView, RefreshControl, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native'
import { Text, Button, Surface, Searchbar, Chip, ActivityIndicator } from 'react-native-paper'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import IshyuraModal from './ishyura-modal'
import PropertyDetailsModal from './property-details-modal'
import { supabase, mobileUtils } from '@/lib/supabase'
import { formatCurrency, isLocalFileUri, getFallbackPropertyImage } from '@/lib/helpers'
import { BlurView } from 'expo-blur';
import SignInScreen from './auth/sign-in'
import SignUpScreen from './auth/sign-up'
import { useNavigation } from '@react-navigation/native'
import AddActionModal from './add-action-modal'
import IcumbiLogo from './components/IcumbiLogo'

import { useTheme } from './_layout'
import { useLanguage } from '@/lib/languageContext'

const { width, height } = Dimensions.get('window')

// Types for IshyuraModal compatibility
interface Room {
  id: string
  room_number: string
  floor_number: number
  rent_amount: number
  status: string
}

interface Floor {
  floor_number: number
  rooms: Room[]
}

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
  // Additional fields for display (required for backward compatibility)
  izina: string
  aho: string
  igiciro: string
  ifoto: string
  amanota: number
  ubwoko: string
  code: string
  irimo: boolean
  uburyo: string
  ibisobanuro: string
  // For IshyuraModal compatibility
  floors: Floor[]
}

export default function PropertiesScreen() {
  const [search, setSearch] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // Get theme from context
  const { theme } = useTheme()
  
  // Get language from context
  const { t } = useLanguage()
  
  // Get navigation
  const navigation = useNavigation()
  
  // Authentication state
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [firstName, setFirstName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')

  // New state for sign-in modal
  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)

  // Fetch properties from Supabase
  const fetchProperties = async (page = 1, searchQuery = '', sortOrder = 'newest', refresh = false) => {
    try {
      console.log('=== DEBUG: Starting fetchProperties ===')
      console.log('Page:', page, 'Search:', searchQuery, 'Sort:', sortOrder, 'Refresh:', refresh)

      if (refresh) {
        setRefreshing(true)
      } else if (page === 1) {
        setLoading(true)
      }

      // Simplified query first to test basic functionality
      let query = supabase
        .from('properties')
        .select('*')
        .eq('is_published', true)
        .is('deleted_at', null)

      // Add search filter if provided
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
      }

      // Add sorting
      switch (sortOrder) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'price_low':
          query = query.order('price_range_min', { ascending: true, nullsFirst: false })
          break
        case 'price_high':
          query = query.order('price_range_max', { ascending: false, nullsFirst: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      // Add pagination
      const itemsPerPage = 10
      const startIndex = (page - 1) * itemsPerPage
      query = query.range(startIndex, startIndex + itemsPerPage - 1)

      console.log('=== DEBUG: About to execute query ===')
      
      // Use retry mechanism for network requests
      const { data: propertiesData, error } = await mobileUtils.retryRequest(async () => {
        return await query
      })

      console.log('=== DEBUG: Query executed ===')
      console.log('Properties data:', propertiesData)
      console.log('Error:', error)

      if (error) {
        console.error('Error fetching properties:', error)
        Alert.alert('Error', `Failed to load properties: ${error.message}`)
        return
      }

      // Simple transformation without complex room logic for now
      const transformedProperties: Property[] = (propertiesData || []).map((property: any) => {
        // Simple code generation
        const generatePropertyCode = (name: string, id: string): string => {
          const nameCode = (name || 'PR').substring(0, 3).toUpperCase().replace(/\s/g, '')
          const idCode = id.substring(0, 3).toUpperCase()
          return `IC${nameCode}${idCode}`
        }

        const formatRWF = (amount?: number) => amount ? `RWF ${amount.toLocaleString()}` : 'Price on request'
        
        return {
          ...property,
          id: property.id,
          izina: property.name || 'Property Name',
          aho: property.city || property.address || 'Location',
          igiciro: property.price_range_min ? formatRWF(property.price_range_min) : 'Price on request',
          ifoto: (() => {
            // Check if featured_image_url exists and is not a local file URI
            if (property.featured_image_url && !isLocalFileUri(property.featured_image_url)) {
              return property.featured_image_url
            }
            // Check if property_images array has valid URLs
            if (property.property_images && property.property_images.length > 0) {
              const validImage = property.property_images.find(img => img && !isLocalFileUri(img))
              if (validImage) return validImage
            }
            // Return fallback image
            return getFallbackPropertyImage()
          })(),
          amanota: 4.5,
          ubwoko: property.property_type || 'apartment',
          irimo: false, // Default to available
          uburyo: 'ukwezi',
          ibisobanuro: property.description || 'Beautiful property with modern amenities',
          code: generatePropertyCode(property.name || '', property.id),
          total_rooms: property.total_rooms || 1,
          available_rooms: property.available_rooms || 1,
          floors: [], // Simplified for now
          amenities: property.amenities || ['WiFi', 'Parking', 'Security']
        }
      })

      console.log('=== DEBUG: Transformed properties ===')
      console.log('Count:', transformedProperties.length)

      if (page === 1 || refresh) {
        setProperties(transformedProperties)
      } else {
        setProperties(prev => [...prev, ...transformedProperties])
      }

      setHasMore(transformedProperties.length === itemsPerPage)
      setCurrentPage(page)
      
      console.log('=== DEBUG: Properties set successfully ===')
    } catch (error) {
      console.error('Error fetching properties:', error)
      Alert.alert('Error', `Failed to load properties: ${error}`)
      if (page === 1) {
        setProperties([])
      }
    } finally {
      console.log('=== DEBUG: Setting loading to false ===')
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      console.log('=== DEBUG: Checking authentication ===')
      
      // Test network connectivity first
      const connectivityTest = await mobileUtils.testConnectivity()
      console.log('=== DEBUG: Network connectivity test ===', connectivityTest)
      
      if (!connectivityTest.success) {
        console.error('=== DEBUG: Network connectivity failed ===', connectivityTest.error)
        Alert.alert(
          'Network Error', 
          'Unable to connect to the server. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        )
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      console.log('=== DEBUG: Session data ===', session)
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (session?.user) {
        console.log('=== DEBUG: User found, fetching profile ===')
        // Fetch full_name and role from users table
        const { data: userProfile } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', session.user.id)
          .single()
        if (userProfile) {
          if (userProfile.full_name) {
            setFirstName(userProfile.full_name.split(' ')[0])
          } else {
            setFirstName(session.user.email?.split('@')[0] || 'Konti')
          }
          setUserRole(userProfile.role || '')
        }
      } else {
        console.log('=== DEBUG: No user found ===')
        setFirstName('')
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (session?.user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', session.user.id)
          .single()
        if (userProfile) {
          if (userProfile.full_name) {
            setFirstName(userProfile.full_name.split(' ')[0])
          } else {
            setFirstName(session.user.email?.split('@')[0] || 'Konti')
          }
          setUserRole(userProfile.role || '')
        }
      } else {
        setFirstName('')
        setUserRole('')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    console.log('=== DEBUG: useEffect triggered - user:', !!user, 'authLoading:', authLoading)
    // Fetch properties regardless of authentication status for public listings
    if (!authLoading) {
      console.log('=== DEBUG: Auth loading complete, fetching properties ===')
      fetchProperties(1, search, sortBy)
    }
  }, [user, search, sortBy, authLoading])

  const onRefresh = () => {
    console.log('=== DEBUG: Refresh triggered ===')
    fetchProperties(1, search, sortBy)
  }

  const testRoomDataFetch = async () => {
    try {
      console.log('=== DEBUG: Testing room data fetch ===')
      
      // Test basic room query
      const { data: rooms, error: roomError } = await supabase
        .from('rooms')
        .select('id, room_number, floor_number, status, property_id')
        .limit(5)
      
      console.log('DEBUG: Room query result:', rooms)
      console.log('DEBUG: Room query error:', roomError)
      
      // Test property query
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, name, is_published')
        .eq('is_published', true)
        .limit(3)
      
      console.log('DEBUG: Properties query result:', properties)
      console.log('DEBUG: Properties query error:', propError)
      
    } catch (error) {
      console.error('DEBUG: Test fetch error:', error)
    }
  }

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchProperties(currentPage + 1, search, sortBy)
    }
  }

  const [ishyuraModalVisible, setIshyuraModalVisible] = useState(false)
  const [propertyDetailsVisible, setPropertyDetailsVisible] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const handlePropertyPress = (property: Property) => {
    console.log('=== DEBUG: Property pressed, user:', !!user)
    // Allow viewing property details without authentication
    try {
      setSelectedProperty(property)
      setPropertyDetailsVisible(true)
    } catch (error) {
      console.error('Error opening property details modal:', error)
    }
  }

  const handleBookNow = (property: Property) => {
    console.log('=== DEBUG: Book now pressed, user:', !!user)
    if (!user) {
      console.log('=== DEBUG: No user, showing sign in for booking ===')
      setShowSignIn(true)
      return
    }
    setSelectedProperty(property)
    setIshyuraModalVisible(true)
  }

  const handleLogin = () => {
    setShowSignIn(true)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleProfile = () => {
    // Navigate to profile based on user status
    if (user) {
      // Navigate to Profile tab using React Navigation
      navigation.navigate('Profile' as never)
    } else {
      router.push('/auth/sign-in')
    }
  }

  const handleSearch = () => {
    console.log('🔍 [SEARCH] Triggering search for:', search)
    // Trigger a new search with the current search term
    if (search.trim()) {
      fetchProperties(1, search.trim(), sortBy, true)
    }
  }

  // Group properties by city
  const grouped = properties.reduce((acc: Record<string, Property[]>, curr: Property) => {
    let displayCity = curr.aho
    if (curr.aho === 'Kigali') {
      if (curr.address) {
        const addressLower = curr.address.toLowerCase()
        if (addressLower.includes('gasabo') || addressLower.includes('kg')) {
          displayCity = 'Kigali-Gasabo'
        } else if (addressLower.includes('nyarugenge') || addressLower.includes('city center')) {
          displayCity = 'Kigali-Nyarugenge'
        } else if (addressLower.includes('kicukiro')) {
          displayCity = 'Kigali-Kicukiro'
        } else {
          displayCity = 'Kigali-Gasabo'
        }
      } else {
        displayCity = 'Kigali-Gasabo'
      }
    }
    
    if (!acc[displayCity]) acc[displayCity] = []
    acc[displayCity].push(curr)
    return acc
  }, {} as Record<string, Property[]>)

  const amenityIcons: { [key: string]: string } = {
    'WiFi': 'wifi',
    'Parking': 'car',
    'Security': 'shield-checkmark',
    'Electricity': 'flash',
    'Bathroom': 'water',
    'Bedroom': 'bed',
    'Air Conditioning': 'snow',
    'Kitchen': 'restaurant',
    'TV': 'tv',
    'Washing Machine': 'shirt',
    'Igikoni': 'restaurant',
    'Ubwitugu': 'shield-checkmark',
    'Amashanyarazi': 'flash',
    'Amazi': 'water',
    'default': 'checkmark-circle',
  }

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <Surface style={[styles.propertyCard, { backgroundColor: theme.card }]} elevation={3}>
      <View style={{ overflow: 'hidden', borderRadius: 20 }}>
        <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.ifoto }}
          style={styles.propertyImage}
          resizeMode="cover"
          alt={`Photo of ${item.izina} property`}
        />
        <View style={styles.imageOverlay}>
          <View style={[styles.codeBadge, { backgroundColor: 'rgba(255, 255, 255, 0.95)' }]}>
            <Text style={[styles.codeText, { color: theme.primary }]}>{item.code}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: (() => {
              if (item.total_rooms === 0) {
                return theme.textTertiary; // Gray for no rooms
              } else if (item.irimo) {
                return theme.error; // Red for fully occupied
              } else if (item.available_rooms === item.total_rooms) {
                return '#10b981'; // Green for all available
              } else {
                return '#f59e0b'; // Amber for partially available
              }
            })()
          }]}> 
            <Text style={styles.statusText}>
              {(() => {
                if (item.total_rooms === 0) {
                  return t('noRooms');
                } else if (item.irimo) {
                  return t('fullyOccupied');
                } else if (item.available_rooms === item.total_rooms) {
                  return t('allAvailable');
                } else {
                  return `${item.available_rooms} ${t('roomsAvailable')}`;
                }
              })()}
            </Text>
          </View>
        </View>
        <View style={styles.priceOverlay}>
          <Text style={styles.priceOverlayText}>{item.igiciro}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text variant="titleMedium" style={[styles.propertyName, { color: theme.text }]} numberOfLines={2}>
          {item.izina}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={theme.textSecondary} />
          <Text variant="bodySmall" style={[styles.propertyLocation, { color: theme.textSecondary }]}>
            {item.aho} • {item.ubwoko}
          </Text>
        </View>
        {/* --- AMENITIES ROW --- */}
        <View style={[styles.amenitiesRow, {marginBottom: 16, paddingHorizontal: 4}]}> 
          {(item.amenities || []).slice(0, 3).map((amenity: string, idx: number) => (
            <View key={idx} style={styles.amenityItem}>
              <Ionicons name={amenityIcons[amenity] as any || amenityIcons.default} size={14} color="#10b981" />
              <Text style={[styles.amenityText, {color: '#10b981'}]}>{amenity}</Text>
            </View>
          ))}
        </View>
        {/* --- REMOVE ROOMS/RATING --- */}
        <View style={styles.cardActions}>
          <Button
            mode="contained"
            onPress={() => handleBookNow(item)}
            style={[styles.bookButton, { backgroundColor: theme.primary }]}
            labelStyle={styles.bookButtonLabel}
            compact
            accessible={true}
            accessibilityLabel={`${t('pay')} ${item.izina}`}
            accessibilityHint="Kanda kugira ngo utangire ubwishyu bw'inyubako"
          >
            {t('pay')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => handlePropertyPress(item)}
            style={[styles.viewButton, { borderColor: theme.primary }]}
            labelStyle={[styles.viewButtonLabel, { color: theme.primary }]}
            compact
            accessible={true}
            accessibilityLabel={`${t('view')} amakuru ya ${item.izina}`}
            accessibilityHint="Kanda kugira ngo urebye amakuru arambuye y'inyubako"
          >
            {t('view')}
          </Button>
        </View>
      </View>
      </View>
    </Surface>
  )

  const renderCitySection = ({ item }: { item: { city: string; properties: Property[]; propertyCount?: number } }) => (
    <View style={styles.citySection}>
      <View style={styles.cityHeader}>
        <Text variant="titleLarge" style={[styles.cityTitle, { color: theme.primary }]}>
          {item.city}
        </Text>
        {item.propertyCount && (
          <View style={[styles.propertyCountBadge, { backgroundColor: theme.surfaceVariant }]}>
            <Text variant="bodySmall" style={[styles.propertyCount, { color: theme.textSecondary }]}>
              {item.propertyCount} {t('properties')}
            </Text>
          </View>
        )}
      </View>
      <FlatList
        data={item.properties}
        renderItem={renderPropertyCard}
        keyExtractor={(property, index) => index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        snapToInterval={width * 0.85 + 12}
        decelerationRate="fast"
        pagingEnabled={false}
      />
    </View>
  )

  // Sort cities by number of properties (descending order)
  const citySections = Object.entries(grouped)
    .map(([city, properties]) => ({
      city,
      properties,
      propertyCount: properties.length
    }))
    .sort((a, b) => b.propertyCount - a.propertyCount) // Sort by property count descending

  // Show loading screen only if auth is loading OR properties are loading with no data
  if (authLoading || (loading && properties.length === 0)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text variant="bodyLarge" style={[styles.loadingText, { color: theme.textSecondary }]}>
          {authLoading ? t('loading') : t('loadingProperties')}
        </Text>
        <StatusBar style={theme.themeMode === 'dark' ? 'light' : 'dark'} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Blur overlay when property details modal is open */}
      {propertyDetailsVisible && (
        <BlurView intensity={50} tint={theme.themeMode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      )}
      <StatusBar style={theme.themeMode === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLogo}>
          <IcumbiLogo width={40} height={40} />
          <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.primary }]}>
            Icumbi
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!authLoading && (
            user ? (
              // User is logged in - show profile info and sign out
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity 
                  onPress={handleProfile}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.surfaceVariant,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    gap: 8
                  }}
                >
                  <Ionicons name="person-circle" size={24} color={theme.primary} />
                  <Text style={{ color: theme.text, fontWeight: '600' }}>
                    {firstName}
                  </Text>
                </TouchableOpacity>

              </View>
            ) : (
              // User is not logged in - show login button
              <Button
                mode="contained"
                onPress={handleLogin}
                style={[styles.loginButton, { backgroundColor: theme.primary }]}
                labelStyle={styles.loginButtonLabel}
              >
                {t('signIn')}
              </Button>
            )
          )}
        </View>
      </View>



      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <View style={[styles.customSearchBar, { backgroundColor: theme.surfaceVariant }]}>
          <TextInput
            placeholder={t('searchPlaceholder')}
            onChangeText={setSearch}
            value={search}
            style={[styles.customSearchInput, { color: theme.text }]}
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={styles.searchIconWrapper}
            onPress={handleSearch}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Options */}
      <View style={[styles.sortContainer, { backgroundColor: theme.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={sortBy === 'newest'}
            onPress={() => setSortBy('newest')}
            style={[styles.sortChip, { backgroundColor: sortBy === 'newest' ? theme.primary : theme.surfaceVariant }]}
            textStyle={[styles.sortChipText, { color: sortBy === 'newest' ? 'white' : theme.text }]}
          >
            {t('newest')}
          </Chip>
          <Chip
            selected={sortBy === 'oldest'}
            onPress={() => setSortBy('oldest')}
            style={[styles.sortChip, { backgroundColor: sortBy === 'oldest' ? theme.primary : theme.surfaceVariant }]}
            textStyle={[styles.sortChipText, { color: sortBy === 'oldest' ? 'white' : theme.text }]}
          >
            {t('oldest')}
          </Chip>
          <Chip
            selected={sortBy === 'price_low'}
            onPress={() => setSortBy('price_low')}
            style={[styles.sortChip, { backgroundColor: sortBy === 'price_low' ? theme.primary : theme.surfaceVariant }]}
            textStyle={[styles.sortChipText, { color: sortBy === 'price_low' ? 'white' : theme.text }]}
          >
            {t('lowPrice')}
          </Chip>
          <Chip
            selected={sortBy === 'price_high'}
            onPress={() => setSortBy('price_high')}
            style={[styles.sortChip, { backgroundColor: sortBy === 'price_high' ? theme.primary : theme.surfaceVariant }]}
            textStyle={[styles.sortChipText, { color: sortBy === 'price_high' ? 'white' : theme.text }]}
          >
            {t('highPrice')}
          </Chip>
        </ScrollView>
      </View>

      {/* Properties List */}
      <FlatList
        data={citySections}
        renderItem={renderCitySection}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={
          <View style={styles.heroSection}>
            <Text variant="headlineLarge" style={[styles.heroTitle, { color: theme.primary }]}>
              {t('welcome')}
            </Text>
            <Text variant="bodyLarge" style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
              {t('welcomeSubtitle')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={64} color={theme.textTertiary} />
              <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.text }]}>
                {t('noPropertiesFound')}
              </Text>
              <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {t('searchDifferentTerms')}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={[styles.footerSection, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <View style={[styles.addPropertyCard, { backgroundColor: theme.primary }]}>
              <Text variant="headlineSmall" style={[styles.addPropertyTitle, { color: 'white' }]}>
                {t('haveProperty')}
              </Text>
              <Text variant="bodyMedium" style={[styles.addPropertySubtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                {t('addPropertySubtitle')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (!user) {
                    setShowSignIn(true)
                    return
                  }
                  
                  // Check if user is landlord or admin
                  if (userRole === 'landlord' || userRole === 'admin') {
                    // Show add property modal
                    setShowAddPropertyModal(true)
                  } else {
                    // Show message for non-landlord/admin users
                    Alert.alert(
                      t('addPropertyAlert'),
                      t('addPropertyAlertMessage'),
                      [
                        { text: t('cancel'), style: 'cancel' },
                        { 
                          text: t('goToDashboard'),
                          onPress: () => {
                            Alert.alert(t('alertInfo'), t('dashboardInfo'))
                          }
                        }
                      ]
                    )
                  }
                }}
                style={styles.addPropertyButton}
              >
                <View style={styles.gradientButton}>
                  <Text style={styles.addPropertyButtonLabel}>
                    {t('addPropertyButton')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.appFooter}>
              <Text variant="bodySmall" style={[styles.footerText, { color: theme.textSecondary }]}>
                {t('appFooter')}
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Ishyura Modal */}
      <IshyuraModal
        visible={ishyuraModalVisible}
        onDismiss={() => setIshyuraModalVisible(false)}
        onSuccess={() => {
          // Refresh properties after successful payment
          fetchProperties()
        }}
        user={user}
        selectedProperty={selectedProperty}
      />

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetailsModal
          visible={propertyDetailsVisible}
          onDismiss={() => {
            console.log('Property details modal closing')
            setPropertyDetailsVisible(false)
          }}
          property={selectedProperty}
          onBookNow={(property) => {
            console.log('onBookNow called from property details modal')
            setPropertyDetailsVisible(false)
            setIshyuraModalVisible(true)
          }}
        />
      )}

      {/* Sign In Modal */}
      <Modal visible={showSignIn} animationType="slide" onRequestClose={() => setShowSignIn(false)}>
        <SignInScreen 
          onSuccess={() => setShowSignIn(false)} 
          onClose={() => setShowSignIn(false)}
          onShowSignUp={() => {
            setShowSignIn(false);
            setShowSignUp(true);
          }}
        />
      </Modal>

      {/* Sign Up Modal */}
      <Modal visible={showSignUp} animationType="slide" onRequestClose={() => setShowSignUp(false)}>
        <SignUpScreen 
          onSuccess={() => setShowSignUp(false)} 
          onClose={() => setShowSignUp(false)}
          onShowSignIn={() => {
            setShowSignUp(false);
            setShowSignIn(true);
          }}
        />
      </Modal>

      {/* Add Property Modal */}
      <AddActionModal
        visible={showAddPropertyModal}
        onClose={() => setShowAddPropertyModal(false)}
        userRole={userRole}
        initialAction="property"
      />

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#667eea',
  },
  loginButton: {
    borderRadius: 20,
    backgroundColor: '#667eea',
  },
  loginButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 12, // reduced from 16
    paddingVertical: 6, // reduced from 12
    backgroundColor: 'white',
  },
  customSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    elevation: 0,
  },
  customSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 0,
    paddingRight: 8,
  },
  searchIconWrapper: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortContainer: {
    paddingHorizontal: 12, // reduced from 16
    paddingVertical: 4, // reduced from 8
    backgroundColor: 'white',
  },
  sortChip: {
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  sortChipText: {
    fontSize: 12,
    color: '#374151',
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  heroTitle: {
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  citySection: {
    marginBottom: 24,
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cityTitle: {
    fontWeight: 'bold',
    color: '#667eea',
  },
  propertyCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  propertyCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  propertyCard: {
    width: width * 0.85,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  codeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    elevation: 1,
    alignSelf: 'flex-start',
  },
  codeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#667eea',
    lineHeight: 11,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    elevation: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
    lineHeight: 10,
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  priceOverlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardContent: {
    padding: 16,
  },
  propertyName: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
    fontSize: 16,
    lineHeight: 20,
  },
  propertyLocation: {
    color: '#6b7280',
    marginLeft: 4,
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  amenitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amenityText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bookButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#667eea',
    elevation: 2,
  },
  bookButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewButton: {
    flex: 1,
    borderRadius: 12,
    borderColor: '#667eea',
    elevation: 1,
  },
  viewButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667eea',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#6b7280',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    marginLeft: 8,
    color: '#6b7280',
  },
  footerSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  addPropertyCard: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  addPropertyTitle: {
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  addPropertySubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  addPropertyButton: {
    borderRadius: 12,
    elevation: 3,
    minWidth: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradientButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addPropertyButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#667eea',
  },
  appFooter: {
    alignItems: 'center',
  },
  footerText: {
    color: '#6b7280',
  },
}) 