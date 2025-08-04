export type UserRole = 'landlord' | 'manager' | 'tenant' | 'admin'
export type RoomStatus = 'vacant' | 'occupied' | 'maintenance'
export type BillingType = 'monthly' | 'per_night' | 'custom'
export type PaymentType = 'full' | 'partial' | 'advance' | 'discount'
export type PaymentMethod = 'cash' | 'mtn_momo' | 'airtel_money' | 'bank_transfer'
export type ActivityType = 
  | 'tenant_created'
  | 'tenant_updated'
  | 'tenant_deleted'
  | 'property_created'
  | 'property_updated'
  | 'property_deleted'
  | 'room_created'
  | 'room_updated'
  | 'room_deleted'
  | 'payment_recorded'
  | 'payment_updated'
  | 'manager_invited'
  | 'manager_assigned'
  | 'manager_removed'
  | 'room_tenant_assigned'
  | 'room_tenant_moved_out'
  | 'user_login'
  | 'user_profile_updated'

export interface User {
  id: string
  role: UserRole
  full_name: string
  phone_number: string  // Primary authentication identifier - 10 digit phone number
  email: string | null  // Optional field, used for Supabase Auth compatibility
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface TenantUser {
  id: string
  auth_user_id: string
  full_name: string
  email: string
  phone_number: string
  status: string
  preferred_language?: string
  created_at: string
  updated_at: string
}

export interface Property {
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
}

export interface PropertyManager {
  property_id: string
  manager_id: string
  assigned_at: string
}

export interface ManagerInvitation {
  id: string
  email: string
  pin: string
  property_id: string
  landlord_id: string
  manager_name: string
  phone_number: string
  id_number: string
  user_id: string | null
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  property_id: string
  floor_number: number
  room_number: string
  rent_amount: number
  billing_type: BillingType
  status: RoomStatus
  description: string | null
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: string
  tenant_user_id: string
  full_name: string
  phone_number: string | null
  email: string | null
  id_number: string
  emergency_contact: string | null
  id_document_url: string | null
  landlord_id: string
  created_at: string
  updated_at: string
}

export interface RoomTenant {
  id: string
  room_id: string
  tenant_id: string
  rent_portion: number
  move_in_date: string
  next_due_date: string | null
  move_out_date: string | null
  contract_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  room_id: string
  tenant_id: string
  amount: number
  payment_date: string
  payment_methods: string[] // JSONB array of payment methods
  receipt_number: string | null
  notes: string | null
  recorded_by: string
  created_at: string
      // IremboPay-specific fields
    irembopay_tx_ref?: string | null
    irembopay_transaction_id?: string | null
  status?: string
  tenant_phone?: string | null
  landlord_phone?: string | null
  transfer_reference?: string | null
  transfer_id?: string | null
  transfer_status?: string | null
}

export interface Activity {
  id: string
  user_id: string | null
  action_type: ActivityType
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  description: string
  metadata: any | null
  created_at: string
}

// Admin-specific interfaces
export interface SecurityAlert {
  id: string
  type: 'login_failure' | 'suspicious_activity' | 'unauthorized_access' | 'data_breach' | 'system_anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  source: string | null
  ip_address: string | null
  user_agent: string | null
  user_id: string | null
  status: 'active' | 'investigating' | 'resolved'
  metadata: any
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource: string
  resource_id: string | null
  details: string | null
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
  success: boolean
  error_message: string | null
  metadata: any
  created_at: string
}

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'closed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: 'technical' | 'billing' | 'general' | 'feature_request' | 'bug_report'
  assigned_to: string | null
  resolution: string | null
  attachments: any[]
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface SupportTicketMessage {
  id: string
  ticket_id: string
  user_id: string
  message: string
  is_internal: boolean
  attachments: any[]
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
  target_audience: 'all' | 'landlords' | 'managers' | 'tenants' | 'admins'
  published: boolean
  published_at: string | null
  published_by: string | null
  expires_at: string | null
  priority: number
  metadata: any
  created_at: string
  updated_at: string
}

export interface AnnouncementView {
  id: string
  announcement_id: string
  user_id: string
  viewed_at: string
}

export interface ComplianceReport {
  id: string
  title: string
  type: 'gdpr' | 'financial' | 'security' | 'operational' | 'audit'
  status: 'pending' | 'compliant' | 'warning' | 'non_compliant'
  score: number | null
  findings: string | null
  recommendations: string | null
  generated_by: string | null
  next_review_date: string | null
  metadata: any
  created_at: string
  updated_at: string
}

export interface UserFeedback {
  id: string
  user_id: string | null
  rating: number | null
  comment: string | null
  category: 'app' | 'support' | 'feature' | 'bug' | 'general'
  page_url: string | null
  helpful_count: number
  metadata: any
  created_at: string
}

export interface DataPrivacyRequest {
  id: string
  user_id: string
  request_type: 'access' | 'delete' | 'export' | 'correction' | 'portability'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  description: string | null
  verification_method: string | null
  verification_data: any | null
  processed_by: string | null
  processed_at: string | null
  rejection_reason: string | null
  response_data: any | null
  expires_at: string | null
  metadata: any
  created_at: string
  updated_at: string
}

export interface SystemHealthMetric {
  id: string
  metric_name: string
  metric_value: number | null
  metric_unit: string | null
  status: 'healthy' | 'warning' | 'error'
  threshold_warning: number | null
  threshold_error: number | null
  metadata: any
  created_at: string
}

export interface ApiUsageLog {
  id: string
  user_id: string | null
  endpoint: string
  method: string
  status_code: number | null
  response_time_ms: number | null
  ip_address: string | null
  user_agent: string | null
  api_key_id: string | null
  rate_limited: boolean
  metadata: any
  created_at: string
}

export interface BackupLog {
  id: string
  backup_type: 'automatic' | 'manual' | 'scheduled'
  status: 'started' | 'completed' | 'failed'
  file_path: string | null
  file_size_bytes: number | null
  backup_duration_ms: number | null
  initiated_by: string | null
  error_message: string | null
  metadata: any
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
      }
      tenant_users: {
        Row: TenantUser
        Insert: Omit<TenantUser, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TenantUser, 'id' | 'created_at' | 'updated_at'>>
      }
      properties: {
        Row: Property
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Property, 'id' | 'created_at' | 'updated_at'>>
      }
      property_managers: {
        Row: PropertyManager
        Insert: Omit<PropertyManager, 'assigned_at'>
        Update: never
      }
      manager_invitations: {
        Row: ManagerInvitation
        Insert: Omit<ManagerInvitation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ManagerInvitation, 'id' | 'created_at' | 'updated_at'>>
      }
      rooms: {
        Row: Room
        Insert: Omit<Room, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Room, 'id' | 'created_at' | 'updated_at'>>
      }
      tenants: {
        Row: Tenant
        Insert: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>
      }
      room_tenants: {
        Row: RoomTenant
        Insert: Omit<RoomTenant, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RoomTenant, 'id' | 'created_at' | 'updated_at'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'>
        Update: never
      }
      activities: {
        Row: Activity
        Insert: Omit<Activity, 'id' | 'created_at'>
        Update: never
      }
      // Admin tables
      security_alerts: {
        Row: SecurityAlert
        Insert: Omit<SecurityAlert, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SecurityAlert, 'id' | 'created_at' | 'updated_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
      support_tickets: {
        Row: SupportTicket
        Insert: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>>
      }
      support_ticket_messages: {
        Row: SupportTicketMessage
        Insert: Omit<SupportTicketMessage, 'id' | 'created_at'>
        Update: never
      }
      announcements: {
        Row: Announcement
        Insert: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Announcement, 'id' | 'created_at' | 'updated_at'>>
      }
      announcement_views: {
        Row: AnnouncementView
        Insert: Omit<AnnouncementView, 'id' | 'viewed_at'>
        Update: never
      }
      compliance_reports: {
        Row: ComplianceReport
        Insert: Omit<ComplianceReport, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ComplianceReport, 'id' | 'created_at' | 'updated_at'>>
      }
      user_feedback: {
        Row: UserFeedback
        Insert: Omit<UserFeedback, 'id' | 'created_at'>
        Update: Partial<Omit<UserFeedback, 'id' | 'created_at'>>
      }
      data_privacy_requests: {
        Row: DataPrivacyRequest
        Insert: Omit<DataPrivacyRequest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DataPrivacyRequest, 'id' | 'created_at' | 'updated_at'>>
      }
      system_health_metrics: {
        Row: SystemHealthMetric
        Insert: Omit<SystemHealthMetric, 'id' | 'created_at'>
        Update: never
      }
      api_usage_logs: {
        Row: ApiUsageLog
        Insert: Omit<ApiUsageLog, 'id' | 'created_at'>
        Update: never
      }
      backup_logs: {
        Row: BackupLog
        Insert: Omit<BackupLog, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'] 