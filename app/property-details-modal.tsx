import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Linking,
  TextInput
} from 'react-native'
import { Modal, Portal, Button, Card, Chip, Divider, IconButton } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { isLocalFileUri, getFallbackPropertyImage } from '@/lib/helpers'
import { BlurView } from 'expo-blur';
import DatePicker from './date-picker';
import { useLanguage } from '@/lib/languageContext';

const { width, height } = Dimensions.get('window')

interface PropertyDetailsModalProps {
  visible: boolean
  onDismiss: () => void
  property: any
  onBookNow: (property: any) => void
}

interface PropertyDetails {
  id: string
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
  floors_count?: number
  total_rooms?: number
  available_rooms?: number
  amenities?: string[]
  address?: string
  country?: string
  created_at?: string
  updated_at?: string
  // Additional fetched data
  images?: string[]
  rooms?: any[]
}

const amenityIcons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
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
  // Map both English and Kinyarwanda amenity names to icons
  'Amashanyarazi': 'flash', // Kinyarwanda for Electricity
  'Amazi meza': 'water', // Kinyarwanda for Clean Water
  'Ikigega cy\'amazi': 'water', // Kinyarwanda for Water Tank
  'Sisitemu ya Septique cyangwa Sewer': 'water', // Kinyarwanda for Septic System
  'Internet (fiber/cable)': 'wifi',
  'Gazi': 'flame', // Kinyarwanda for Gas
  'Backup power (generator/inverter/solar)': 'battery-charging',
  'Igitaka cyateyeho tiles': 'home', // Kinyarwanda for Tiled Floor
  'Amazi': 'water',
  'default': 'checkmark-circle'
}

// Helper function to validate UUID
function isValidUUID(uuid: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

export default function PropertyDetailsModal({ 
  visible, 
  onDismiss, 
  property, 
  onBookNow 
}: PropertyDetailsModalProps) {
  const { t } = useLanguage();
  const [fullProperty, setFullProperty] = useState<PropertyDetails | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  // Removed autoSlideTimer - now using enhanced autoPlayInterval
  const [isLoading, setIsLoading] = useState(false)
  const [showInquiryForm, setShowInquiryForm] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [inquiryData, setInquiryData] = useState({
    name: '',
    phone: '',
    message: ''
  })
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: '1',
    specialRequests: ''
  })
  // Add state for which date picker is open
  const [datePickerVisible, setDatePickerVisible] = useState<'checkIn' | 'checkOut' | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Enhanced image gallery state
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const autoPlayInterval = useRef<number | null>(null)
  const [lastInteraction, setLastInteraction] = useState(Date.now())

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    
    checkAuth()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch comprehensive property data
  const fetchFullProperty = async () => {
    if (!property?.id || !isValidUUID(property.id)) {
      setFullProperty(property); // fallback to local/test data
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true)
    try {
      const propertyId = property.id
      // Fetch main property data with more details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()
      if (propertyError) throw propertyError
      // Fetch rooms for this property using RPC to avoid RLS issues
      const { data: roomsData } = await supabase
        .rpc('get_property_rooms', {
          p_property_id: propertyId
        })
      // Collect all images: featured, property_images, and all room images
      let images: string[] = []
      
      // Add featured image if it's a valid URL (not local file URI)
      if (propertyData.featured_image_url && !isLocalFileUri(propertyData.featured_image_url)) {
        images.push(propertyData.featured_image_url)
      }
      
      // Add property images array if they're valid URLs
      if (Array.isArray(propertyData.property_images)) {
        const validPropertyImages = propertyData.property_images.filter((img: any) => 
          img && !isLocalFileUri(img)
        )
        images = images.concat(validPropertyImages)
      }
      
      // Add room images if they're valid URLs
      if (roomsData && Array.isArray(roomsData)) {
        roomsData.forEach(room => {
          if (Array.isArray(room.images)) {
            const validRoomImages = room.images.filter((img: any) => 
              img && !isLocalFileUri(img)
            )
            images = images.concat(validRoomImages)
          }
        })
      }
      
      // Fallback to property.ifoto if no valid images found
      if (images.length === 0 && property.ifoto && !isLocalFileUri(property.ifoto)) {
        images = [property.ifoto]
      }
      
      // If still no images, use fallback
      if (images.length === 0) {
        images = [getFallbackPropertyImage()]
      }
      console.log('[PROPERTY MODAL] Images to display:', images)
      const fullPropertyData: PropertyDetails = {
        ...propertyData,
        izina: propertyData.name || property.izina,
        aho: propertyData.city || property.aho,
        igiciro: propertyData.price_range_min 
          ? `Rwf ${propertyData.price_range_min.toLocaleString()} - ${propertyData.price_range_max?.toLocaleString()}`
          : property.igiciro,
        ifoto: (() => {
          // Use featured_image_url if it's a valid URL
          if (propertyData.featured_image_url && !isLocalFileUri(propertyData.featured_image_url)) {
            return propertyData.featured_image_url
          }
          // Use property.ifoto if it's a valid URL
          if (property.ifoto && !isLocalFileUri(property.ifoto)) {
            return property.ifoto
          }
          // Use fallback image
          return getFallbackPropertyImage()
        })(),
        amanota: property.amanota || 4.5,
        ubwoko: propertyData.property_type || property.ubwoko,
        code: property.code,
        irimo: property.irimo,
        uburyo: property.uburyo,
        ibisobanuro: propertyData.description || property.ibisobanuro,
        images: images,
        rooms: roomsData || []
      }
      setFullProperty(fullPropertyData)
    } catch (error) {
      console.error('Error fetching property data:', error)
      setFullProperty(property)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (visible && property) {
      fetchFullProperty()
      setCurrentImageIndex(0)
      setShowInquiryForm(false)
      setShowBookingForm(false)
    }
  }, [visible, property])

  // Enhanced auto-play effect
  useEffect(() => {
    if (visible && fullProperty?.images && fullProperty.images.length > 1 && isAutoPlaying) {
      startAutoPlay()
    } else {
      stopAutoPlay()
    }
    
    return () => stopAutoPlay()
  }, [visible, fullProperty?.images, isAutoPlaying])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoPlay()
    }
  }, [])

  // Enhanced auto-play functions
  const startAutoPlay = () => {
    if (fullProperty?.images && fullProperty.images.length > 1 && isAutoPlaying) {
      autoPlayInterval.current = setInterval(() => {
        // Only auto-advance if user hasn't interacted recently (last 3 seconds)
        if (Date.now() - lastInteraction > 3000) {
          setCurrentImageIndex((prevIndex) => 
            prevIndex === (fullProperty?.images?.length || 1) - 1 ? 0 : prevIndex + 1
          )
        }
      }, 4000) // Change image every 4 seconds
    }
  }

  const stopAutoPlay = () => {
    if (autoPlayInterval.current) {
      clearInterval(autoPlayInterval.current)
      autoPlayInterval.current = null
    }
  }

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying)
    setLastInteraction(Date.now())
    if (isAutoPlaying) {
      stopAutoPlay()
    } else {
      startAutoPlay()
    }
  }

  const goToNextImage = () => {
    setLastInteraction(Date.now())
    setCurrentImageIndex((prevIndex) => 
      prevIndex === (fullProperty?.images?.length || 1) - 1 ? 0 : prevIndex + 1
    )
  }

  const goToPrevImage = () => {
    setLastInteraction(Date.now())
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? (fullProperty?.images?.length || 1) - 1 : prevIndex - 1
    )
  }

  const goToImage = (index: number) => {
    setLastInteraction(Date.now())
    setCurrentImageIndex(index)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleInquirySubmit = async () => {
    if (!inquiryData.name || !inquiryData.phone || !inquiryData.message) {
      Alert.alert(t('error'), t('fillAllFields'))
      return
    }

    try {
      // For now, just show success message
      Alert.alert(
        'Success', 
        t('messageSentSuccess'),
        [{ text: 'OK', onPress: () => setShowInquiryForm(false) }]
      )
              setInquiryData({ name: '', phone: '', message: '' })
    } catch (error) {
      Alert.alert('Error', 'Habaye ikibazo. Ongera ugerageze.')
    }
  }

  const handleBookingSubmit = async () => {
    if (!bookingData.checkIn || !bookingData.checkOut) {
      Alert.alert(t('error'), t('enterCheckInOutDates'))
      return
    }

    try {
      // For now, just show success message
      Alert.alert(
        'Success', 
        'Booking yawe yatanzwe neza. Tuzakumenyesha vuba.',
        [{ text: 'OK', onPress: () => setShowBookingForm(false) }]
      )
      setBookingData({ checkIn: '', checkOut: '', guests: '1', specialRequests: '' })
    } catch (error) {
      Alert.alert('Error', 'Habaye ikibazo. Ongera ugerageze.')
    }
  }

  const handleCall = () => {
    // You can add actual phone number here
    Alert.alert('Call', 'Would you like to call the landlord?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL('tel:+250788123456') }
    ])
  }

  const handleShare = () => {
    const shareText = `${t('shareProperty')} ${fullProperty?.izina} - ${fullProperty?.igiciro}`
    // You can implement actual sharing here
    Alert.alert('Share', shareText)
  }

  const renderImageGallery = () => {
    const images = fullProperty?.images || [fullProperty?.ifoto]
    console.log('[PROPERTY MODAL] Rendering images:', images)
    if (!images || images.length === 0 || !images[0]) {
      return (
        <View style={styles.imageGalleryContainer}>
          <Text style={{textAlign: 'center', marginTop: 40, color: '#888'}}>Nta mafoto aboneka kuri iyi nyubako.</Text>
        </View>
      )
    }
    return (
      <View style={styles.imageGalleryContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / width)
            setCurrentImageIndex(newIndex)
            setLastInteraction(Date.now()) // Update last interaction on scroll
          }}
          onScrollBeginDrag={() => {
            setLastInteraction(Date.now()) // Update on start of manual scroll
          }}
          contentOffset={{ x: currentImageIndex * width, y: 0 }}
        >
          {images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image
                source={{ uri: image }}
                style={styles.galleryImage}
                resizeMode="cover"
                onError={() => console.warn('[PROPERTY MODAL] Failed to load image:', image)}
              />
            </View>
          ))}
        </ScrollView>
        
        {/* Enhanced Controls for Multiple Images */}
        {images.length > 1 && (
          <>
            {/* Navigation Arrows */}
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={goToPrevImage}
              activeOpacity={0.7}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={goToNextImage}
              activeOpacity={0.7}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
            
            {/* Auto-play Control */}
            <TouchableOpacity
              style={styles.autoPlayButton}
              onPress={toggleAutoPlay}
              activeOpacity={0.7}
            >
              <Text style={styles.autoPlayButtonText}>
                {isAutoPlaying ? '⏸️' : '▶️'}
              </Text>
            </TouchableOpacity>
            
            {/* Image Counter */}
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1} / {images.length}
              </Text>
            </View>
            
            {/* Enhanced Image Indicators */}
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.activeIndicator
                  ]}
                  onPress={() => goToImage(index)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </>
        )}
      </View>
    )
  }

  const renderAmenities = () => {
    const amenities = fullProperty?.amenities || ['WiFi', 'Parking', 'Security']
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('propertyFeatures')}</Text>
        <View style={styles.amenitiesGrid}>
          {amenities.map((amenity, index) => (
            <View key={index} style={styles.amenityItem}>
              <Ionicons 
                name={amenityIcons[amenity] || amenityIcons.default} 
                size={20} 
                color="#10b981" 
              />
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const renderRooms = () => {
    const rooms = fullProperty?.rooms || [];
    if (rooms.length === 0) return null;
    // Group rooms by floor
    const grouped = rooms.reduce((acc: Record<number, any[]>, room) => {
      const floor = room.floor_number || 1;
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(room);
      return acc;
    }, {});
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('rooms')}</Text>
        {Object.entries(grouped).map(([floor, floorRooms]) => (
          <View key={floor} style={{marginBottom: 12}}>
            <Text style={styles.floorTitle}>{t('floors')} {floor}</Text>
            <View style={styles.roomsContainer}>
              {floorRooms.map((room: any, idx: number) => (
                <Card key={idx} style={[styles.roomCard, {backgroundColor: '#f8fafc'}]}>
                  <Card.Content>
                    <View style={styles.roomHeader}>
                      <Text style={styles.roomNumber}>{t('room')} {room.room_number}</Text>
                      <Text style={{
                        fontWeight: 'bold',
                        fontSize: 14,
                        color: room.status === 'vacant' ? '#10b981' : '#ef4444',
                        marginLeft: 8
                      }}>
                        {room.status === 'vacant' ? t('available') : t('occupied')}
                      </Text>
                    </View>
                    <Text style={styles.roomPrice}>
                      RWF {room.rent_amount?.toLocaleString() || '0'} / {t('perMonth')}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderInquiryForm = () => {
    if (!showInquiryForm) return null
    
    return (
      <View style={styles.inquiryForm}>
        <View style={styles.formHeader}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#10b981" />
          <Text style={styles.formTitle}>{t('ask')}</Text>
        </View>
        <Text style={styles.formSubtitle}>
          {t('sendMessageToLandlord')}
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('fullName')} *</Text>
          <TextInput
            style={styles.textInput}
            value={inquiryData.name}
            onChangeText={(text) => setInquiryData({ ...inquiryData, name: text })}
            placeholder={t('enterYourName')}
            autoCapitalize="words"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('phoneNumber')} *</Text>
          <TextInput
            style={styles.textInput}
            value={inquiryData.phone}
            onChangeText={(text) => setInquiryData({ ...inquiryData, phone: text })}
            placeholder={t('enterYourPhone')}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>
        

        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('message')} *</Text>
          <TextInput
            style={[styles.textInput, styles.messageInput]}
            value={inquiryData.message}
            onChangeText={(text) => setInquiryData({ ...inquiryData, message: text })}
            placeholder={t('inquiryPlaceholder')}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {inquiryData.message.length}/500
          </Text>
        </View>
        
        <View style={styles.formActions}>
          <Button
            mode="outlined"
            onPress={() => setShowInquiryForm(false)}
            style={styles.formButton}
            icon="close"
          >
            Hagarika
          </Button>
          <Button
            mode="contained"
            onPress={handleInquirySubmit}
            style={styles.formButton}
            icon="send"
            disabled={!inquiryData.name || !inquiryData.phone || !inquiryData.message}
          >
            {t('sendMessage')}
          </Button>
        </View>
      </View>
    )
  }

  const renderBookingForm = () => {
    if (!showBookingForm) return null
    
    return (
      <View style={styles.bookingForm}>
        <View style={styles.formHeader}>
          <Ionicons name="calendar" size={24} color="#10b981" />
          <Text style={styles.formTitle}>Booking</Text>
        </View>
        <Text style={styles.formSubtitle}>
          Hitamo itariki zo kwinjira no gusohoka
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Itariki yo kwinjira *</Text>
          <TouchableOpacity onPress={() => setDatePickerVisible('checkIn')}>
            <TextInput
              style={styles.textInput}
              value={bookingData.checkIn}
              placeholder="YYYY-MM-DD"
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Itariki yo gusohoka *</Text>
          <TouchableOpacity onPress={() => setDatePickerVisible('checkOut')}>
            <TextInput
              style={styles.textInput}
              value={bookingData.checkOut}
              placeholder="YYYY-MM-DD"
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Abantu</Text>
          <TextInput
            style={styles.textInput}
            value={bookingData.guests}
            onChangeText={(text) => setBookingData({ ...bookingData, guests: text })}
            placeholder="1"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Ibibazo byihuse</Text>
          <TextInput
            style={[styles.textInput, styles.messageInput]}
            value={bookingData.specialRequests}
            onChangeText={(text) => setBookingData({ ...bookingData, specialRequests: text })}
            placeholder={t('enterYourQuestions')}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
        <View style={styles.formActions}>
          <Button
            mode="outlined"
            onPress={() => setShowBookingForm(false)}
            style={styles.formButton}
          >
            Hagarika
          </Button>
          <Button
            mode="contained"
            onPress={handleBookingSubmit}
            style={styles.formButton}
          >
            Booking
          </Button>
        </View>
        <DatePicker
          visible={datePickerVisible === 'checkIn'}
          onClose={() => setDatePickerVisible(null)}
          onDateSelect={(date) => setBookingData({ ...bookingData, checkIn: date })}
          title="Hitamo itariki yo kwinjira"
          minDate={new Date().toISOString().split('T')[0]}
        />
        <DatePicker
          visible={datePickerVisible === 'checkOut'}
          onClose={() => setDatePickerVisible(null)}
          onDateSelect={(date) => setBookingData({ ...bookingData, checkOut: date })}
          title="Hitamo itariki yo gusohoka"
          minDate={bookingData.checkIn || new Date().toISOString().split('T')[0]}
        />
      </View>
    )
  }

  if (isLoading) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>{t('loadingDetails')}</Text>
        </Modal>
      </Portal>
    )
  }

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={styles.modalContainer}
      >
        {/* Blurred background overlay, only behind modal content */}
        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        <StatusBar barStyle="light-content" />
        
        {/* Header with image gallery */}
        <View style={styles.header}>
          {renderImageGallery()}
          
          {/* Action buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={onDismiss}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Property info overlay */}
          <View style={styles.propertyInfoOverlay}>
            <Text style={styles.propertyName}>{fullProperty?.izina}</Text>
            {/* Status badge for property occupancy */}
            {fullProperty && (
              (() => {
                const total = fullProperty.total_rooms || 0;
                const available = fullProperty.available_rooms || 0;
                if (total === 0) return null;
                if (available > 0) {
                  return (
                    <View style={{alignSelf: 'flex-start', backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6, marginBottom: 6}}>
                      <Text style={{color: '#10b981', fontWeight: 'bold', fontSize: 14}}>{t('available')}</Text>
                    </View>
                  );
                } else {
                  return (
                    <View style={{alignSelf: 'flex-start', backgroundColor: '#fee2e2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6, marginBottom: 6}}>
                      <Text style={{color: '#ef4444', fontWeight: 'bold', fontSize: 14}}>{t('occupied')}</Text>
                    </View>
                  );
                }
              })()
            )}
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="white" />
              <Text style={styles.locationText}>
                {fullProperty?.address || fullProperty?.aho}, {fullProperty?.country || 'Kigali'}
              </Text>
            </View>
            <Text style={styles.priceText}>{fullProperty?.igiciro}</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ref={scrollViewRef}
        >
          {/* Auth Status Banner */}
          {!user && (
            <View style={styles.authBanner}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.authBannerText}>
                {t('loginToBook')}
              </Text>
            </View>
          )}
          
          {/* Quick stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="business" size={20} color="#8b5cf6" />
              <Text style={styles.statValue}>{fullProperty?.floors_count || 1}</Text>
              <Text style={styles.statLabel}>{t('floors')}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bed" size={20} color="#10b981" />
              <Text style={styles.statValue}>{fullProperty?.total_rooms || 0}</Text>
              <Text style={styles.statLabel}>{t('rooms')}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.statValue}>{fullProperty?.available_rooms || 0}</Text>
              <Text style={styles.statLabel}>{t('available')}</Text>
            </View>
          </View>
          <Divider style={{marginVertical: 10}} />
          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('description')}</Text>
            <Text style={styles.descriptionText}>
              {fullProperty?.ibisobanuro || 'Iyi nyubako ifite ibisobanuro byiza kandi birambuye. Kubaza byinshi, kanda hasi.'}
            </Text>
          </View>
          <Divider style={{marginVertical: 10}} />
          {/* Amenities */}
          {renderAmenities()}
          <Divider style={{marginVertical: 10}} />
          {/* Rooms by floor */}
          {renderRooms()}
          {/* Show forms above bottom bar, always visible */}
          {showInquiryForm && (
            <View style={{marginTop: 16}}>{renderInquiryForm()}</View>
          )}
          {showBookingForm && (
            <View style={{marginTop: 16}}>{renderBookingForm()}</View>
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom action bar */}
        <View style={styles.bottomBar}>
          <Button
            mode={showInquiryForm ? "contained" : "outlined"}
            onPress={() => {
              if (!user) {
                Alert.alert(
                  `🔒 ${t('loginBeforeAsk')}`,
                  t('loginBeforeAskMessage'),
                  [
                    { text: t('closeButton'), style: 'cancel' },
                    { text: `👤 ${t('loginButton')}`, onPress: () => router.push('/auth/sign-in') }
                  ]
                )
                return
              }
              setShowInquiryForm(!showInquiryForm)
              setShowBookingForm(false)
              setTimeout(() => {
                if (scrollViewRef.current) scrollViewRef.current.scrollToEnd({animated: true})
              }, 200)
            }}
            style={[styles.bottomButton, showInquiryForm && styles.activeButton]}
            icon="message-text"
            accessible={true}
            accessibilityLabel="Kubaza ibibazo ku nyubako"
          >
            {!user ? `🔒 ${t('ask')}` : t('ask')}
          </Button>
          <Button
            mode={showBookingForm ? "contained" : "outlined"}
            onPress={() => {
              if (!user) {
                Alert.alert(
                  `🔒 ${t('loginBeforeAsk')}`,
                  t('loginBeforeAskMessage'),
                  [
                    { text: t('closeButton'), style: 'cancel' },
                    { text: `👤 ${t('loginButton')}`, onPress: () => router.push('/auth/sign-in') }
                  ]
                )
                return
              }
              setShowBookingForm(!showBookingForm)
              setShowInquiryForm(false)
              setTimeout(() => {
                if (scrollViewRef.current) scrollViewRef.current.scrollToEnd({animated: true})
              }, 200)
            }}
            style={[styles.bottomButton, showBookingForm && styles.activeButton]}
            icon="calendar"
            accessible={true}
            accessibilityLabel={t('bookNow')}
          >
            {!user ? '🔒 Booking' : 'Booking'}
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              const allOccupied = (fullProperty?.total_rooms || 0) > 0 && (fullProperty?.available_rooms || 0) === 0;
              if (allOccupied) return;
              if (!user) {
                Alert.alert(
                  `🔒 ${t('loginBeforeAsk')}`,
                  t('loginBeforeAskMessage'),
                  [
                    { text: t('closeButton'), style: 'cancel' },
                    { text: `👤 ${t('loginButton')}`, onPress: () => router.push('/auth/sign-in') }
                  ]
                )
                return
              }
              try {
                onBookNow(fullProperty)
              } catch (error) {
                console.error('Error starting booking process:', error)
                Alert.alert('Ikosa', 'Habaye ikosa mu gutangira booking. Ongera ugerageze.')
              }
            }}
            disabled={(fullProperty?.total_rooms || 0) > 0 && (fullProperty?.available_rooms || 0) === 0}
            style={[
              styles.bottomButton,
              styles.payButton,
              ((fullProperty?.total_rooms || 0) > 0 && (fullProperty?.available_rooms || 0) === 0) && {backgroundColor: '#e5e7eb', borderColor: '#e5e7eb'}
            ]}
            icon="credit-card"
            accessible={true}
            accessibilityLabel={t('payForProperty')}
          >
            {!user ? t('bookNowLocked') : t('bookNow')}
          </Button>
        </View>
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 0,
    flex: 1,
    height: '100%',
  },

  loadingContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    height: height * 0.4,
    position: 'relative',
  },
  imageGalleryContainer: {
    flex: 1,
  },
  imageContainer: {
    width: width,
    height: height * 0.4,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: 'white',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 16,
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  propertyInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  propertyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120, // Extra space for bottom bar
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
  },
  amenityText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  roomsContainer: {
    gap: 12,
  },
  roomCard: {
    marginBottom: 8,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  roomStatus: {
    height: 24,
  },
  roomPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  inquiryForm: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'solid',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bookingForm: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 48, // Better touch target
  },
  messageInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  bottomSpacing: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for home indicator on iOS
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  payButton: {
    backgroundColor: '#10b981',
  },
  activeButton: {
    backgroundColor: '#10b981',
  },
  debugText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 4,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  // Enhanced image gallery styles
  navButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: 10,
    marginTop: -20, // Offset for centering
  },
  nextButton: {
    right: 10,
    marginTop: -20, // Offset for centering
  },
  navButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  autoPlayButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  autoPlayButtonText: {
    fontSize: 14,
  },
  imageCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 10,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Auth banner styles
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 0,
  },
  authBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
}) 