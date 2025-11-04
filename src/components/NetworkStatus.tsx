import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'
import { webUtils } from '@/lib/supabase'

interface NetworkStatusProps {
  onStatusChange?: (isOnline: boolean) => void
}

export default function NetworkStatus({ onStatusChange }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkNetworkStatus = async () => {
    setIsChecking(true)
    try {
      const result = await webUtils.testConnectivity()
      const online = result.success
      setIsOnline(online)
      onStatusChange?.(online)
      
      if (!online) {
        console.error('❌ [NETWORK_STATUS] Network connectivity failed:', result.error)
      } else {
        console.log('✅ [NETWORK_STATUS] Network connectivity successful')
      }
    } catch (error) {
      console.error('❌ [NETWORK_STATUS] Network check error:', error)
      setIsOnline(false)
      onStatusChange?.(false)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkNetworkStatus()
    
    // Check network status every 30 seconds
    const interval = setInterval(checkNetworkStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" />
        <Text style={styles.text}>Checking network...</Text>
      </View>
    )
  }

  if (isOnline === null) {
    return null
  }

  return (
    <View style={[styles.container, isOnline ? styles.online : styles.offline]}>
      <View style={[styles.indicator, isOnline ? styles.onlineIndicator : styles.offlineIndicator]} />
      <Text style={[styles.text, isOnline ? styles.onlineText : styles.offlineText]}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  online: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  offline: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineIndicator: {
    backgroundColor: '#4CAF50',
  },
  offlineIndicator: {
    backgroundColor: '#F44336',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  onlineText: {
    color: '#4CAF50',
  },
  offlineText: {
    color: '#F44336',
  },
}) 