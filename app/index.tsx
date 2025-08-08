import React, { useState, useEffect, useContext } from 'react'
import { View, StyleSheet, Image, Dimensions, ScrollView, RefreshControl, FlatList, TouchableOpacity, Alert, Modal, TextInput, Linking } from 'react-native'
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
import LanguageSelector from './components/LanguageSelector'

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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  // Fetch properties from Supabase using RPC function to bypass RLS recursion
  const fetchProperties = async (page = 1, searchQuery = '', sortOrder = 'newest', refresh = false) => {
    try {
      console.log('=== DEBUG: Starting fetchProperties ===')
      console.log('Page:', page, 'Search:', searchQuery, 'Sort:', sortOrder, 'Refresh:', refresh)

      if (refresh) {
        setRefreshing(true)
      } else if (page === 1) {
        setLoading(true)
      }

      // Use RPC function to bypass RLS recursion issues
      const { data: propertiesData, error } = await mobileUtils.retryRequest(async () => {
        // Use different RPC functions based on sort order to avoid type conflicts
        if (sortOrder === 'price_low' || sortOrder === 'price_high') {
          return await supabase
            .rpc('get_public_properties_by_price', {
              p_search_query: searchQuery || null,
              p_sort_order: sortOrder,
              p_page: page,
              p_items_per_page: 10
            })
        } else {
          return await supabase
            .rpc('get_public_properties', {
              p_search_query: searchQuery || null,
              p_sort_order: sortOrder,
              p_page: page,
              p_items_per_page: 10
            })
        }
      })

      console.log('=== DEBUG: RPC Query executed ===')
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
              const validImage = property.property_images.find((img: any) => img && !isLocalFileUri(img))
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
          amenities: Array.isArray(property.amenities) ? property.amenities : ['WiFi', 'Parking', 'Security']
        }
      })

      console.log('=== DEBUG: Transformed properties ===')
      console.log('Count:', transformedProperties.length)

      if (page === 1 || refresh) {
        setProperties(transformedProperties)
      } else {
        setProperties(prev => [...prev, ...transformedProperties])
      }

      setHasMore(transformedProperties.length === 10)
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LanguageSelector size="small" />
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
              <View style={styles.footerTextContainer}>
                <Text variant="bodySmall" style={[styles.footerText, { color: theme.textSecondary }]}>
                  {t('appFooter')} -{' '}
                </Text>
                <TouchableOpacity 
                  style={styles.privacyLinkContainer}
                  onPress={() => {
                    console.log('Privacy link clicked from index!');
                    // Show privacy modal
                    setShowPrivacyModal(true)
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.privacyLinkText, { color: theme.primary }]}>
                    {t('privacy')}
                  </Text>
                </TouchableOpacity>
              </View>
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

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.privacyModalContainer}>
          <View style={styles.privacyModalHeader}>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={styles.privacyModalBackButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.privacyModalTitle}>Privacy Policy & Terms</Text>
          </View>
          <ScrollView style={styles.privacyModalContent}>
            <Text style={styles.privacyModalTitle}>Privacy Policy for Icumbi Mobile App</Text>
            <Text style={styles.privacyModalSubtitle}>Last Updated: August 18, 2025</Text>
            
            <Text style={styles.privacyModalText}>
              Welcome to Icumbi ("we," "our," or "us"). This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the Icumbi mobile application ("App").
            </Text>
            
            <Text style={styles.privacyModalSectionTitle}>1. Information We Collect</Text>
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Personal Information:</Text>{'\n'}
              • Full Name: Your complete name as provided during registration{'\n'}
              • Phone Number: Your 10-digit Rwandan phone number (primary identifier){'\n'}
              • Email Address: Your email address for account verification{'\n'}
              • Password: Securely encrypted password for account authentication{'\n'}
              • Role: Your role in the platform (tenant, landlord, manager, admin){'\n'}
              • Profile Picture: Optional avatar image (if provided)
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Property and Rental Information:</Text>{'\n'}
              • Property Details: Property names, addresses, descriptions{'\n'}
              • Property Images: Photos of properties and rooms (with consent){'\n'}
              • Rental Information: Lease terms, payment amounts, rental history{'\n'}
              • Location Data: Property addresses and general location information
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Payment Information:</Text>{'\n'}
              • Payment Method: Your chosen payment method (MTN MoMo, Airtel Money, Bank Transfer, Cards, Cash){'\n'}
              • Payment Amounts: Transaction amounts and payment history{'\n'}
              • Transaction IDs: Unique identifiers for payment tracking{'\n'}
              • Phone Numbers: For mobile money payments (Airtel phone numbers)
            </Text>
            
            <Text style={styles.privacyModalSectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Account Management:</Text>{'\n'}
              • Create and manage your user account{'\n'}
              • Authenticate your identity and maintain account security{'\n'}
              • Provide personalized user experience based on your role{'\n'}
              • Send account-related notifications and updates
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Property Management:</Text>{'\n'}
              • Display and manage property listings{'\n'}
              • Process property bookings and reservations{'\n'}
              • Handle tenant-landlord communications{'\n'}
              • Generate property reports and analytics
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Payment Processing:</Text>{'\n'}
              • Process rental payments and transactions{'\n'}
              • Generate payment receipts and records{'\n'}
              • Track payment history and financial reports{'\n'}
              • Handle payment disputes and refunds
            </Text>
            
            <Text style={styles.privacyModalSectionTitle}>3. Data Security</Text>
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Security Measures:</Text>{'\n'}
              • Encryption: All data is encrypted in transit and at rest{'\n'}
              • Authentication: Secure login and multi-factor authentication{'\n'}
              • Access Controls: Limited access to personal information{'\n'}
              • Regular Audits: Security assessments and vulnerability testing
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Data Retention:</Text>{'\n'}
              We retain your information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and improve our services.
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Data Deletion:</Text>{'\n'}
              You may request deletion of your account and personal information by contacting us at support@icumbi.com. We will process your request within 30 days.
            </Text>
            
            <Text style={styles.privacyModalSectionTitle}>4. Your Rights and Choices</Text>
            <Text style={styles.privacyModalText}>
              You have the right to:{'\n'}
              • Access: View and download your personal information{'\n'}
              • Correct: Update or modify your information{'\n'}
              • Delete: Request deletion of your account and data{'\n'}
              • Portability: Export your data in a machine-readable format
            </Text>
            
            <Text style={styles.privacyModalSectionTitle}>5. Terms and Conditions</Text>
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Acceptance of Terms:</Text>{'\n'}
              By downloading, installing, or using the Icumbi app, you agree to comply with and be bound by these Terms and Conditions.
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>User Accounts:</Text>{'\n'}
              • You must provide accurate and complete information when creating an account{'\n'}
              • You are responsible for maintaining the confidentiality of your account credentials{'\n'}
              • You must be at least 18 years old to create an account{'\n'}
              • One person may only create one account
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Payment Terms:</Text>{'\n'}
              • All payments are processed through secure third-party providers{'\n'}
              • Payment methods include MTN MoMo, Airtel Money, bank transfers, and cards{'\n'}
              • Transaction fees may apply and will be clearly displayed{'\n'}
              • Refunds are subject to our refund policy
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>User Conduct:</Text>{'\n'}
              You agree not to:{'\n'}
              • Use the app for any illegal or unauthorized purpose{'\n'}
              • Violate any laws or regulations{'\n'}
              • Infringe on the rights of others{'\n'}
              • Upload harmful or malicious content{'\n'}
              • Attempt to gain unauthorized access to our systems{'\n'}
              • Use the app to harass, abuse, or harm other users
            </Text>
            
            <Text style={styles.privacyModalSectionTitle}>6. Contact Information</Text>
            <Text style={styles.privacyModalText}>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </Text>
            <Text style={styles.privacyModalContactInfo}>
              Email: support@icumbi.com{'\n'}
              Phone: +250 780 0566 266{'\n'}
              Address: Kigali, Rwanda{'\n'}
              Website: https://icumbi.com
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Governing Law:</Text>{'\n'}
              This Privacy Policy is governed by the laws of Rwanda. Any disputes arising from this policy will be resolved in accordance with Rwandan law.
            </Text>
            
            <Text style={styles.privacyModalText}>
              <Text style={styles.bold}>Consent:</Text>{'\n'}
              By using the Icumbi mobile app, you consent to the collection, use, and sharing of your information as described in this Privacy Policy.
            </Text>
          </ScrollView>
        </View>
      </Modal>

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
  footerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    color: '#6b7280',
  },
  privacyLinkContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  privacyModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  privacyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 50,
  },
  privacyModalBackButton: {
    padding: 8,
    marginRight: 8,
  },
  privacyModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  privacyModalContent: {
    flex: 1,
    padding: 20,
  },
  privacyModalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    color: '#374151',
  },
  privacyModalMainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  privacyModalSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 20,
    color: '#6b7280',
  },
  privacyModalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    color: '#1f2937',
  },
  privacyModalContactInfo: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 8,
    color: '#374151',
  },
  bold: {
    fontWeight: 'bold',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  privacyLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  privacyLinkText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
}) 