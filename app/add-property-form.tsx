import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Image } from 'react-native'
import { Text, Button, Card, ActivityIndicator } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { formatCurrency, uploadImageToStorage } from '@/lib/helpers'

interface AddPropertyFormProps {
  onBack: () => void
  onSuccess: () => void
}

interface Room {
  room_number: string
  rent_amount: string
  billing_type: string
  image_uri?: string
}

interface Floor {
  floor_number: number
  room_count: number
  rooms: Room[]
}

export default function AddPropertyForm({ onBack, onSuccess }: AddPropertyFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: 'Kigali-Gasabo',
    country: 'Rwanda',
    floors_count: 1,
    property_type: 'apartment',
    description: '',
  })
  
  // 1. Add state for number of floors (etaje)
  const [floorsCount, setFloorsCount] = useState('1')
  const [floors, setFloors] = useState<Floor[]>([])

  // 2. When floorsCount changes, update floors array
  useEffect(() => {
    const count = parseInt(floorsCount) || 1
    const newFloors: Floor[] = []
    for (let i = 1; i <= count; i++) {
      const existing = floors.find(f => f.floor_number === i)
      newFloors.push(existing || { floor_number: i, room_count: 1, rooms: [] })
    }
    setFloors(newFloors)
  }, [floorsCount])

  // 3. For each floor, user types number of rooms
  const updateFloorRoomCount = (floorIndex: number, count: string) => {
    const num = parseInt(count) || 1
    const newFloors = [...floors]
    newFloors[floorIndex].room_count = num
    // Update rooms array for this floor
    const currentRooms = newFloors[floorIndex].rooms
    if (num > currentRooms.length) {
      for (let i = currentRooms.length; i < num; i++) {
        currentRooms.push({ room_number: '', rent_amount: '', billing_type: 'monthly', image_uri: undefined })
      }
    } else if (num < currentRooms.length) {
      newFloors[floorIndex].rooms = currentRooms.slice(0, num)
    }
    setFloors(newFloors)
  }

  // 4. For each room, user enters name, price, and can add optional photo
  const addRoomToFloor = (floorIndex: number) => {
    const newFloors = [...floors]
    newFloors[floorIndex].rooms.push({
      room_number: '',
      rent_amount: '',
      billing_type: 'monthly'
    })
    setFloors(newFloors)
  }

  const removeRoomFromFloor = (floorIndex: number, roomIndex: number) => {
    const newFloors = [...floors]
    if (newFloors[floorIndex].rooms.length > 1) {
      newFloors[floorIndex].rooms.splice(roomIndex, 1)
      setFloors(newFloors)
    }
  }

  const updateRoom = (floorIndex: number, roomIndex: number, field: keyof Room, value: string) => {
    const newFloors = [...floors]
    newFloors[floorIndex].rooms[roomIndex][field] = value
    setFloors(newFloors)
  }

  // 0. Add state for main image
  const [mainImage, setMainImage] = useState<string | null>(null)

  const pickMainImage = async (source: 'camera' | 'gallery') => {
    try {
      let result
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Ikosa', 'Uburenganzira bwo gukoresha camera ntibwemewe. Emeza uburenganzira mu igenamiterere rya telefone yawe.')
          return
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      }
      if (!result.canceled && result.assets[0]) {
        setMainImage(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Ikosa', 'Ntibyashoboye gufata cyangwa guhitamo ifoto')
    }
  }

  const removeMainImage = () => setMainImage(null)

  // Property type options in Kinyarwanda
  const propertyTypes = [
    { label: 'Apartama', value: 'apartment' },
    { label: 'Inzu', value: 'house' },
    { label: 'Icyumba', value: 'room' },
    { label: 'Studio', value: 'studio' },
    { label: 'Ubucuruzi', value: 'commercial' }
  ]

  // City options for Rwanda
  const cities = [
    { label: 'Kigali-Gasabo', value: 'Kigali-Gasabo' },
    { label: 'Kigali-Nyarugenge', value: 'Kigali-Nyarugenge' },
    { label: 'Kigali-Kicukiro', value: 'Kigali-Kicukiro' },
    { label: 'Musanze', value: 'Musanze' },
    { label: 'Huye', value: 'Huye' },
    { label: 'Rubavu', value: 'Rubavu' },
    { label: 'Karongi', value: 'Karongi' },
    { label: 'Nyagatare', value: 'Nyagatare' },
    { label: 'Rwamagana', value: 'Rwamagana' }
  ]

  // Billing type options
  const billingTypes = [
    { label: 'Buri kwezi', value: 'monthly' },
    { label: 'Buri munsi', value: 'daily' },
    { label: 'Ijoro rimwe', value: 'per_night' },
    { label: 'Buri cyumweru', value: 'weekly' },
    { label: 'Buri mwaka', value: 'yearly' }
  ]

  const pickImage = async (floorIndex: number, roomIndex: number, source: 'camera' | 'gallery') => {
    try {
      let result
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Ikosa', 'Uburenganzira bwo gukoresha camera ntibwemewe. Emeza uburenganzira mu igenamiterere rya telefone yawe.')
          return
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      }
      if (!result.canceled && result.assets[0]) {
        const newFloors = [...floors]
        newFloors[floorIndex].rooms[roomIndex].image_uri = result.assets[0].uri
        setFloors(newFloors)
      }
    } catch (error) {
      Alert.alert('Ikosa', 'Ntibyashoboye gufata cyangwa guhitamo ifoto')
    }
  }

  const removeImage = (floorIndex: number, roomIndex: number) => {
    const newFloors = [...floors]
    newFloors[floorIndex].rooms[roomIndex].image_uri = undefined
    setFloors(newFloors)
  }

  // Amenities state
  const [amenitiesOpen, setAmenitiesOpen] = useState(false)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [toiletLocation, setToiletLocation] = useState<'imbere' | 'hanze' | null>(null)
  const [kitchenLocation, setKitchenLocation] = useState<'imbere' | 'hanze' | null>(null)
  const [bathLocation, setBathLocation] = useState<'imbere' | 'hanze' | null>(null)

  const AMENITIES = [
    // General
    { group: 'Ibikoresho Rusange', items: [
      'Amashanyarazi',
      'Amazi meza',
      'Ikigega cy’amazi',
      'Sisitemu ya Septique cyangwa Sewer',
      'Internet (fiber/cable)',
      'Gazi',
      'Backup power (generator/inverter/solar)',
      'Igitaka cyateyeho tiles',
      'Ibirahure bifite imitego y’udukoko',
      'Inzugi n’amadirishya bifunze neza',
      'Balkoni/veranda',
      'Curtain rods/blinds',
    ]},
    // Bedrooms
    { group: 'Ibyumba byo kuryamamo', items: [
      'Ibyumba binini',
      'Closet/wardrobe',
      'Uburiri n’umusego (furnished)',
      'Meza y’uruhande/amatara (furnished)',
      'Indorerwamo yo kwiyogoshesha (furnished)',
      'Air conditioning cyangwa Fan',
      'Socket z’amashanyarazi',
    ]},
    // Living Room
    { group: 'Salon', items: [
      'Sofa set (furnished)',
      'Meza y’icyayi (furnished)',
      'TV stand cyangwa TV (furnished)',
      'Smart TV cyangwa TV isanzwe (furnished)',
      'Fan cyangwa Air conditioning',
      'Curtains/blinds',
      'Carpet cyangwa rug (furnished)',
      'Meza yo kuriraho n’intebe (furnished)',
      'Bookshelf cyangwa decor (optional)',
    ]},
    // Kitchen
    { group: 'Igikoni', items: [
      'Sink ifite drainage',
      'Kabineti n’ububiko',
      'Counter ya granite/tiles',
      'Ahagenewe frigo na gaz',
      'Frigo (furnished)',
      'Cocotte ya gaz/umuriro (furnished)',
      'Microwave (furnished)',
      'Toaster/kettle (optional)',
      'Ventilation (idirishya cyangwa extractor fan)',
      'Pantry/ububiko',
    ]},
    // Bathrooms
    { group: 'Ubwiherero', items: [
      'Toilet (Western-style)',
      'Shower (instant/boiler heater)',
      'Lavabo n’indorerwamo',
      'Tiled floor/walls',
      'Bathroom shelves/cabinets',
      'Hot water system',
      'Exhaust fan/idirishya',
    ]},
    // Laundry
    { group: 'Kwoza imyenda', items: [
      'Connection ya washing machine',
      'Washing machine (furnished)',
      'Laundry area cyangwa balcony',
      'Outdoor clothesline/drying rack',
    ]},
    // Parking & Outdoor
    { group: 'Parking n’inyuma', items: [
      'Parking yihariye',
      'Compund ipavye',
      'Ubusitani/akarima',
      'Outdoor security lights',
      'Rooftop cyangwa patio (optional)',
    ]},
    // Security
    { group: 'Umutekano', items: [
      'Gated entrance',
      'Urukuta rurerure',
      'Inzugi zifunze',
      'Security lights',
      'Alarm system (optional)',
      'CCTV (optional)',
      'Umuzamu (apartments/gated)',
    ]},
    // Comfort
    { group: 'Ibyo kwidagadura', items: [
      'Air conditioning (bedrooms/salon)',
      'Ceiling/wall fans',
      'Solar power system',
      'Solar water heater',
      'Generator/inverter backup',
      'Intercom system',
      'Elevator (multi-story)',
    ]},
    // Furnished
    { group: 'Furnished', items: [
      'Uburiri n’imisego',
      'Sofa',
      'Meza yo kuriraho',
      'TV & stand',
      'Ibikoresho byo mu gikoni',
      'Washing machine',
      'Curtains/rugs',
      'Iron/ironing board',
      'Artwork/decor (optional)',
    ]},
    // Tech
    { group: 'Ikoranabuhanga', items: [
      'Wi-Fi yihuta',
      'Cable TV/satellite',
      'Smart home devices (optional)',
    ]},
  ]

  const toggleAmenity = (item: string) => {
    setSelectedAmenities(prev => prev.includes(item)
      ? prev.filter(a => a !== item)
      : [...prev, item])
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Ikosa', 'Andika izina ry&apos;inyubako')
      return false
    }
    
    if (!formData.address.trim()) {
      Alert.alert('Ikosa', 'Andika aderesi y&apos;inyubako')
      return false
    }

    // Validate rooms
    for (const floor of floors) {
      for (const room of floor.rooms) {
        if (!room.room_number.trim()) {
          Alert.alert('Ikosa', `Andika izina ry&apos;icyumba ku riko rya ${floor.floor_number}`)
          return false
        }
        if (!room.rent_amount.trim() || parseFloat(room.rent_amount) <= 0) {
          Alert.alert('Ikosa', `Andika ikiguzi cy&apos;icyumba "${room.room_number}"`)
          return false
        }
      }
    }

    if (!mainImage) {
      Alert.alert('Ikosa', 'Shyiramo ifoto nyamukuru y&apos;inyubako')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        Alert.alert('Ikosa', 'Ntiwashoboye kumenya uwowe. Ongera ukinjire.')
        return
      }

      // Upload main image to storage if provided
      let uploadedImageUrl = null
      if (mainImage) {
        try {
          uploadedImageUrl = await uploadImageToStorage(mainImage)
          console.log('Image uploaded successfully:', uploadedImageUrl)
        } catch (error) {
          console.error('Failed to upload image:', error)
          Alert.alert('Ikosa', 'Ntiyashoboye kohereza ifoto. Ongera ugerageze.')
          return
        }
      }

      // Prepare property data
      const propertyData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city,
        country: formData.country,
        floors_count: parseInt(floorsCount) || 1,
        property_type: formData.property_type,
        description: formData.description.trim(),
        landlord_id: user.id,
        featured_image_url: uploadedImageUrl,
        // Set default visibility flags
        is_public: true,
        is_available: true,
        is_published: true,
        amenities: selectedAmenities,
        toilet_location: toiletLocation,
        kitchen_location: kitchenLocation,
        bath_location: bathLocation,
      }

      // Insert property
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single()

      if (propertyError) {
        console.error('Property creation error:', propertyError)
        Alert.alert('Ikosa', 'Ntiyashoboye kurondora inyubako. Ongera ugerageze.')
        return
      }

      // Prepare rooms data
      const roomsData = floors.flatMap((floor) =>
        floor.rooms.map((room) => ({
          property_id: property.id,
          floor_number: floor.floor_number,
          room_number: room.room_number.trim(),
          rent_amount: parseFloat(room.rent_amount),
          billing_type: room.billing_type,
          status: 'vacant'
        }))
      )

      // Insert rooms
      const { error: roomsError } = await supabase
        .from('rooms')
        .insert(roomsData)

      if (roomsError) {
        console.error('Rooms creation error:', roomsError)
        Alert.alert('Ikosa', 'Inyubako yarongoye ariko ntibyashoboye kurondora ibyumba. Ongera ugerageze mu cyumba cy&apos;ibyumba.')
        onSuccess()
        return
      }

      // --- NEW: Update price_range_min and price_range_max ---
      // Fetch all rooms for this property
      const { data: allRooms, error: fetchRoomsError } = await supabase
        .from('rooms')
        .select('rent_amount')
        .eq('property_id', property.id)
        .is('deleted_at', null)

      if (!fetchRoomsError && allRooms && allRooms.length > 0) {
        const prices = allRooms.map(r => Number(r.rent_amount)).filter(n => !isNaN(n))
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        await supabase
          .from('properties')
          .update({ price_range_min: minPrice, price_range_max: maxPrice })
          .eq('id', property.id)
      }
      // --- END NEW ---

      Alert.alert('Byagenze neza!', 'Inyubako yarongoye neza hamwe n&apos;ibyumba byayo.')
      onSuccess()

    } catch (error) {
      console.error('Error creating property:', error)
      Alert.alert('Ikosa', 'Habaye ikosa. Ongera ugerageze.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={styles.title}>Ongeraho Inyubako</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Amakuru y&apos;ibanze</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ifoto nyamukuru y&apos;inyubako *</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => pickMainImage('camera')} style={styles.imagePickerButton}>
                  <Ionicons name="camera" size={24} color="#6B7280" />
                  <Text style={styles.imagePickerText}>Fata Ifoto</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => pickMainImage('gallery')} style={styles.imagePickerButton}>
                  <Ionicons name="image" size={24} color="#6B7280" />
                  <Text style={styles.imagePickerText}>Hitamo muri Gallery</Text>
                </TouchableOpacity>
              </View>
              {mainImage && (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: mainImage }} style={styles.roomImage} />
                  <TouchableOpacity onPress={removeMainImage} style={styles.removeImageButton}>
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Izina ry&apos;inyubako *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Urugero: Kigali Heights"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Aderesi *</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Urugero: KN 15 Ave, Kimisagara"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Umujyi</Text>
              <View style={styles.selectorContainer}>
                {cities.map((city) => (
                  <TouchableOpacity
                    key={city.value}
                    style={[
                      styles.selectorOption,
                      formData.city === city.value && styles.selectorOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, city: city.value })}
                  >
                    <View style={styles.radioCircle}>
                      {formData.city === city.value && <View style={styles.radioSelected} />}
                    </View>
                    <Text style={styles.selectorLabel}>{city.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ubwoko bw&apos;inyubako</Text>
              <View style={styles.selectorContainer}>
                {propertyTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.selectorOption,
                      formData.property_type === type.value && styles.selectorOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, property_type: type.value })}
                  >
                    <View style={styles.radioCircle}>
                      {formData.property_type === type.value && <View style={styles.radioSelected} />}
                    </View>
                    <Text style={styles.selectorLabel}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Umubare w&apos;etaje *</Text>
              <TextInput
                style={styles.input}
                value={floorsCount}
                onChangeText={setFloorsCount}
                placeholder="Urugero: 3"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ibisobanuro</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Andika ibisobanuro by&apos;inyubako..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Floors and Rooms */}
        {floors.map((floor, floorIndex) => (
          <Card key={floor.floor_number} style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Etaje ya {floor.floor_number}</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Umubare w&apos;ibyumba kuri etaje {floor.floor_number} *</Text>
                <TextInput
                  style={styles.input}
                  value={String(floor.room_count)}
                  onChangeText={count => updateFloorRoomCount(floorIndex, count)}
                  placeholder="Urugero: 4"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
              {floor.rooms.map((room, roomIndex) => (
                <View key={roomIndex} style={styles.roomContainer}>
                  <View style={styles.roomHeader}>
                    <Text style={styles.roomTitle}>Icyumba {roomIndex + 1}</Text>
                    {floor.rooms.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeRoomFromFloor(floorIndex, roomIndex)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Izina ry&apos;icyumba *</Text>
                    <TextInput
                      style={styles.input}
                      value={room.room_number}
                      onChangeText={text => updateRoom(floorIndex, roomIndex, 'room_number', text)}
                      placeholder="Urugero: Icyumba 101"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Ikiguzi *</Text>
                    <TextInput
                      style={styles.input}
                      value={room.rent_amount}
                      onChangeText={text => updateRoom(floorIndex, roomIndex, 'rent_amount', text)}
                      placeholder="150000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Uburyo bwo kwishyura</Text>
                    <View style={styles.selectorContainer}>
                      {billingTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.selectorOption,
                            room.billing_type === type.value && styles.selectorOptionSelected
                          ]}
                          onPress={() => updateRoom(floorIndex, roomIndex, 'billing_type', type.value)}
                        >
                          <View style={styles.radioCircle}>
                            {room.billing_type === type.value && <View style={styles.radioSelected} />}
                          </View>
                          <Text style={styles.selectorLabel}>{type.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* Room Image Picker with camera/gallery option */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Ifoto y&apos;icyumba (si ngombwa)</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => pickImage(floorIndex, roomIndex, 'camera')} style={styles.imagePickerButton}>
                        <Ionicons name="camera" size={24} color="#6B7280" />
                        <Text style={styles.imagePickerText}>Fata Ifoto</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => pickImage(floorIndex, roomIndex, 'gallery')} style={styles.imagePickerButton}>
                        <Ionicons name="image" size={24} color="#6B7280" />
                        <Text style={styles.imagePickerText}>Hitamo muri Gallery</Text>
                      </TouchableOpacity>
                    </View>
                    {room.image_uri && (
                      <View style={styles.imageContainer}>
                        <Image source={{ uri: room.image_uri }} style={styles.roomImage} />
                        <TouchableOpacity onPress={() => removeImage(floorIndex, roomIndex)} style={styles.removeImageButton}>
                          <Ionicons name="close-circle" size={24} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => addRoomToFloor(floorIndex)}
                style={styles.addRoomButton}
              >
                <Ionicons name="add-circle" size={20} color="#4F46E5" />
                <Text style={styles.addRoomText}>Ongeraho ikindi cyumba</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        ))}

        <View style={styles.card}>
          <TouchableOpacity onPress={() => setAmenitiesOpen(!amenitiesOpen)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
            <Ionicons name={amenitiesOpen ? 'chevron-down' : 'chevron-forward'} size={20} color="#4F46E5" />
            <Text style={{ fontWeight: 'bold', color: '#4F46E5', marginLeft: 8 }}>Ongeraho Ibikoresho/Inyongera (Optional)</Text>
          </TouchableOpacity>
          {amenitiesOpen && (
            <ScrollView style={{ maxHeight: 320 }}>
              {AMENITIES.map(group => (
                <View key={group.group} style={{ marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{group.group}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {group.items.map(item => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => toggleAmenity(item)}
                        style={{
                          backgroundColor: selectedAmenities.includes(item) ? '#4F46E5' : '#F3F4F6',
                          borderRadius: 16,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Text style={{ color: selectedAmenities.includes(item) ? 'white' : '#374151' }}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Ibyo wihitiyemo</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity onPress={() => setToiletLocation(toiletLocation === 'imbere' ? 'hanze' : 'imbere')} style={{ backgroundColor: toiletLocation === 'imbere' ? '#4F46E5' : '#F3F4F6', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: toiletLocation === 'imbere' ? 'white' : '#374151' }}>Ubwiherero imbere</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setToiletLocation(toiletLocation === 'hanze' ? 'imbere' : 'hanze')} style={{ backgroundColor: toiletLocation === 'hanze' ? '#4F46E5' : '#F3F4F6', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: toiletLocation === 'hanze' ? 'white' : '#374151' }}>Ubwiherero hanze</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setKitchenLocation(kitchenLocation === 'imbere' ? 'hanze' : 'imbere')} style={{ backgroundColor: kitchenLocation === 'imbere' ? '#4F46E5' : '#F3F4F6', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: kitchenLocation === 'imbere' ? 'white' : '#374151' }}>Igikoni imbere</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setKitchenLocation(kitchenLocation === 'hanze' ? 'imbere' : 'hanze')} style={{ backgroundColor: kitchenLocation === 'hanze' ? '#4F46E5' : '#F3F4F6', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: kitchenLocation === 'hanze' ? 'white' : '#374151' }}>Igikoni hanze</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setBathLocation(bathLocation === 'imbere' ? 'hanze' : 'imbere')} style={{ backgroundColor: bathLocation === 'imbere' ? '#4F46E5' : '#F3F4F6', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: bathLocation === 'imbere' ? 'white' : '#374151' }}>Amaswero imbere</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setBathLocation(bathLocation === 'hanze' ? 'imbere' : 'hanze')} style={{ backgroundColor: bathLocation === 'hanze' ? '#4F46E5' : '#F3F4F6', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: bathLocation === 'hanze' ? 'white' : '#374151' }}>Amaswero hanze</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.submitContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            labelStyle={styles.submitButtonText}
          >
            {loading ? 'Kurondora...' : 'Rondora Inyubako'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectorContainer: {
    gap: 8,
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  selectorOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioSelected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  selectorLabel: {
    fontSize: 14,
    color: '#374151',
  },
  roomContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  removeButton: {
    padding: 4,
  },
  addRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addRoomText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontWeight: '600',
  },
  submitContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  roomImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10, // Adjusted padding for smaller buttons
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  imagePickerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
}) 