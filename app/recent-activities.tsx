import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { Text, Card, ActivityIndicator, Chip, Surface } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/helpers'
import { useTheme } from './_layout'
import { useLanguage } from '@/lib/languageContext'

// Types matching the web version
interface DashboardActivity {
  id: string
  type: 'payment' | 'tenant' | 'property' | 'manager' | 'other'
  title: string
  details: string
  timestamp: Date
  icon: string
  iconBg: string
  iconColor: string
}

interface RecentActivitiesProps {
  onBack?: () => void
}

export default function RecentActivities({ onBack }: RecentActivitiesProps) {
  const { theme } = useTheme()
  const { t, currentLanguage } = useLanguage()
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activityFilter, setActivityFilter] = useState<'payment' | 'tenant' | 'property' | 'manager' | 'other' | 'all'>('all')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    initializeUser()
  }, [])

  const initializeUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      
      if (currentUser) {
        await fetchActivities(currentUser.id)
      }
    } catch (error) {
      console.error('Error initializing user:', error)
      setLoading(false)
    }
  }

  const fetchActivities = async (userId: string) => {
    if (!userId) {
      console.log('🚫 [MOBILE_ACTIVITIES] No user ID found')
      setActivities([])
      setLoading(false)
      return
    }

    try {
      console.log('🔄 [MOBILE_ACTIVITIES] Fetching activities for user:', userId)
      
      // Use the same shared activities function as the web version
      const { data: activitiesData, error } = await supabase.rpc('get_shared_activities', {
        p_user_id: userId,
        p_limit: 50,
        p_activity_type: null // Always fetch all activities, filter on client side
      })

      if (error) {
        console.error('❌ [MOBILE_ACTIVITIES] Error fetching activities:', error)
        setActivities([])
        setLoading(false)
        return
      }

      if (!activitiesData || activitiesData.length === 0) {
        console.log('⚠️ [MOBILE_ACTIVITIES] No activities returned from database')
        setActivities([])
        setLoading(false)
        return
      }
      
      // Transform activities to mobile format - same logic as web version
      const transformedActivities: DashboardActivity[] = activitiesData.map((activity: any) => {
        const getActivityTypeAndIcon = (activityType: string) => {
          switch (activityType) {
            case 'tenant':
              return {
                type: 'tenant' as const,
                icon: 'person',
                iconBg: '#f3e8ff',
                iconColor: '#7c3aed'
              }
            case 'payment':
              return {
                type: 'payment' as const,
                icon: 'card',
                iconBg: '#d1fae5',
                iconColor: '#10b981'
              }
            case 'property':
              return {
                type: 'property' as const,
                icon: 'business',
                iconBg: '#dbeafe',
                iconColor: '#3b82f6'
              }
            case 'manager':
              return {
                type: 'manager' as const,
                icon: 'person-add',
                iconBg: '#e9d5ff',
                iconColor: '#8b5cf6'
              }
            default:
              return {
                type: 'other' as const,
                icon: 'flash',
                iconBg: '#f3f4f6',
                iconColor: '#6b7280'
              }
          }
        }

        const { type, icon, iconBg, iconColor } = getActivityTypeAndIcon(activity.type)
        
        return {
          id: activity.id,
          type,
          title: activity.title,
          details: `${activity.user_name || 'System'} • ${formatDate(activity.created_at)}`,
          timestamp: new Date(activity.created_at),
          icon,
          iconBg,
          iconColor
        }
      })

      console.log('✅ [MOBILE_ACTIVITIES] Transformed', transformedActivities.length, 'activities')
      setActivities(transformedActivities)
    } catch (error) {
      console.error('❌ [MOBILE_ACTIVITIES] Error in fetchActivities:', error)
      setActivities([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return t('momentsAgo')
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('minutesAgoSuffix')}`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('hoursAgoSuffix')}`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} ${t('daysAgoSuffix')}`

    const locale = currentLanguage === 'rw' ? 'rw-RW' : 'en-US'
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getFilteredActivities = () => {
    if (activityFilter === 'all') return activities
    return activities.filter(activity => activity.type === activityFilter)
  }

  const onRefresh = async () => {
    if (!user?.id) return
    setRefreshing(true)
    await fetchActivities(user.id)
  }

  const filterActivities = (filter: typeof activityFilter) => {
    setActivityFilter(filter)
    // No need to refetch - just update the filter state
    // The getFilteredActivities function will handle the filtering
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: theme.text }]}>{t('recentActivities')}</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('loadingActivities')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: theme.text }]}>{t('recentActivities')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>({getFilteredActivities().length})</Text>
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.filterScrollView}
      >
        <Chip
          selected={activityFilter === 'all'}
          onPress={() => filterActivities('all')}
          style={[
            styles.filterChip, 
            { backgroundColor: theme.card },
            activityFilter === 'all' && { backgroundColor: theme.primary }
          ]}
          textStyle={[
            styles.filterChipText, 
            { color: theme.text },
            activityFilter === 'all' && { color: 'white' }
          ]}
        >
          {t('all')}
        </Chip>
        <Chip
          selected={activityFilter === 'payment'}
          onPress={() => filterActivities('payment')}
          style={[
            styles.filterChip, 
            { backgroundColor: theme.card },
            activityFilter === 'payment' && { backgroundColor: theme.primary }
          ]}
          textStyle={[
            styles.filterChipText, 
            { color: theme.text },
            activityFilter === 'payment' && { color: 'white' }
          ]}
        >
          {t('payments')}
        </Chip>
        <Chip
          selected={activityFilter === 'tenant'}
          onPress={() => filterActivities('tenant')}
          style={[
            styles.filterChip, 
            { backgroundColor: theme.card },
            activityFilter === 'tenant' && { backgroundColor: theme.primary }
          ]}
          textStyle={[
            styles.filterChipText, 
            { color: theme.text },
            activityFilter === 'tenant' && { color: 'white' }
          ]}
        >
          {t('tenants')}
        </Chip>
        <Chip
          selected={activityFilter === 'property'}
          onPress={() => filterActivities('property')}
          style={[
            styles.filterChip, 
            { backgroundColor: theme.card },
            activityFilter === 'property' && { backgroundColor: theme.primary }
          ]}
          textStyle={[
            styles.filterChipText, 
            { color: theme.text },
            activityFilter === 'property' && { color: 'white' }
          ]}
        >
          {t('properties')}
        </Chip>
        <Chip
          selected={activityFilter === 'manager'}
          onPress={() => filterActivities('manager')}
          style={[
            styles.filterChip, 
            { backgroundColor: theme.card },
            activityFilter === 'manager' && { backgroundColor: theme.primary }
          ]}
          textStyle={[
            styles.filterChipText, 
            { color: theme.text },
            activityFilter === 'manager' && { color: 'white' }
          ]}
        >
          {t('managers')}
        </Chip>
      </ScrollView>

      {/* Activities List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getFilteredActivities().length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flash-off" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {t('noActivitiesFound')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {t('activitiesHelp')}
            </Text>
          </View>
        ) : (
          <View style={styles.activitiesList}>
            {getFilteredActivities().map((activity, index) => (
              <Surface key={`${activity.id}-${index}`} style={[styles.activityCard, { backgroundColor: theme.card }]}>
                <View style={styles.activityContent}>
                  <View style={[styles.activityIcon, { backgroundColor: activity.iconBg }]}>
                    <Ionicons name={activity.icon as any} size={20} color={activity.iconColor} />
                  </View>
                  <View style={styles.activityText}>
                    <Text style={[styles.activityTitle, { color: theme.text }]}>{activity.title}</Text>
                    <Text style={[styles.activityDetails, { color: theme.textSecondary }]}>{activity.details}</Text>
                  </View>
                </View>
                {index < getFilteredActivities().length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              </Surface>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const getFilterDisplayName = (filter: string) => {
  switch (filter) {
    case 'payment': return 'byo kwishyura'
    case 'tenant': return "by'abakodesha"
    case 'property': return "by'inyubako"
    case 'manager': return "by'abayobozi"
    default: return ''
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  filterScrollView: {
    maxHeight: 50,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    paddingBottom: 0,
    paddingTop: 0,
    alignItems: 'center',
  },
  filterChip: {
    marginRight: 8,
    borderColor: '#e5e7eb',
    marginBottom: 0,
    paddingBottom: 0,
    height: 32,
  },
  filterChipSelected: {
    backgroundColor: '#4f46e5',
  },
  filterChipText: {
    fontSize: 14,
    color: '#374151',
  },
  filterChipTextSelected: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    marginTop: 0,
    paddingTop: 0,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    minHeight: 200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  activitiesList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 0,
    marginTop: 0,
  },
  activityCard: {
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
}) 