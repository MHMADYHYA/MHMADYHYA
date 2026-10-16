/**
 * أنواع قاعدة البيانات (مكتوبة يدوياً بما يطابق supabase/migrations).
 * لما تتغير الجداول لازم يتحدث هاد الملف.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'change_requested'
  | 'cancelled'
  | 'attended'
  | 'no_show'

export type PaymentStatus = 'unpaid' | 'paid' | 'waived'
export type PaymentMethod = 'cash' | 'bit' | 'transfer' | 'other'
export type MessageRecipient = 'client' | 'companion'
export type MessageKind = 'invite' | 'change' | 'cancel' | 'reminder_day' | 'reminder_hour'
export type EventActor = 'admin' | 'client' | 'system'

export type ClientRow = {
  id: string
  full_name: string
  phone: string
  default_companion_name: string | null
  default_companion_phone: string | null
  default_price: number | null
  notes: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export type AppointmentRow = {
  id: string
  client_id: string
  starts_at: string
  duration_min: number
  ends_at: string
  status: AppointmentStatus
  has_companion: boolean
  companion_name: string | null
  companion_phone: string | null
  meeting_url: string | null
  zoom_meeting_id: string | null
  public_token: string
  client_note: string | null
  cancel_reason: string | null
  admin_notes: string | null
  previous_starts_at: string | null
  responded_at: string | null
  price: number | null
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export type OutboxMessageRow = {
  id: string
  appointment_id: string
  recipient: MessageRecipient
  kind: MessageKind
  to_phone: string
  body: string
  due_at: string
  sent_at: string | null
  notified_at: string | null
  skipped_at: string | null
  created_at: string
}

export type AppointmentEventRow = {
  id: string
  appointment_id: string
  actor: EventActor
  type: string
  from_status: string | null
  to_status: string | null
  data: Json
  created_at: string
}

export type SettingsRow = {
  id: boolean
  default_duration_min: number
  reminder_day_hours: number
  reminder_hour_minutes: number
  follow_up_after_hours: number
  fixed_meeting_url: string | null
  templates: Json
  public_base_url: string | null
  default_price: number | null
  daily_summary_enabled: boolean
  daily_summary_time: string
  daily_summary_last_sent_on: string | null
  timezone: string
  updated_at: string
}

export type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export type AdminRow = {
  user_id: string
  created_at: string
}

type Insertable<Row, Optional extends keyof Row, Omitted extends keyof Row = never> = Omit<
  Partial<Pick<Row, Optional>> & Omit<Row, Optional | Omitted>,
  never
>

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: AdminRow
        Insert: Insertable<AdminRow, 'created_at'>
        Update: Partial<AdminRow>
        Relationships: []
      }
      clients: {
        Row: ClientRow
        Insert: Insertable<
          ClientRow,
          | 'id'
          | 'default_companion_name'
          | 'default_companion_phone'
          | 'default_price'
          | 'notes'
          | 'archived'
          | 'created_at'
          | 'updated_at'
        >
        Update: Partial<ClientRow>
        Relationships: []
      }
      appointments: {
        Row: AppointmentRow
        Insert: Insertable<
          AppointmentRow,
          | 'id'
          | 'ends_at'
          | 'status'
          | 'has_companion'
          | 'companion_name'
          | 'companion_phone'
          | 'meeting_url'
          | 'zoom_meeting_id'
          | 'public_token'
          | 'client_note'
          | 'cancel_reason'
          | 'admin_notes'
          | 'previous_starts_at'
          | 'responded_at'
          | 'price'
          | 'payment_status'
          | 'payment_method'
          | 'paid_at'
          | 'created_at'
          | 'updated_at'
        >
        Update: Partial<AppointmentRow>
        Relationships: [
          {
            foreignKeyName: 'appointments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      outbox_messages: {
        Row: OutboxMessageRow
        Insert: Insertable<OutboxMessageRow, 'id' | 'sent_at' | 'notified_at' | 'skipped_at' | 'created_at'>
        Update: Partial<OutboxMessageRow>
        Relationships: [
          {
            foreignKeyName: 'outbox_messages_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
        ]
      }
      appointment_events: {
        Row: AppointmentEventRow
        Insert: Insertable<AppointmentEventRow, 'id' | 'from_status' | 'to_status' | 'data' | 'created_at'>
        Update: Partial<AppointmentEventRow>
        Relationships: [
          {
            foreignKeyName: 'appointment_events_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
        ]
      }
      settings: {
        Row: SettingsRow
        Insert: Partial<SettingsRow>
        Update: Partial<SettingsRow>
        Relationships: []
      }
      push_subscriptions: {
        Row: PushSubscriptionRow
        Insert: Insertable<PushSubscriptionRow, 'id' | 'created_at'>
        Update: Partial<PushSubscriptionRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      admin_create_appointment: {
        Args: {
          p_client_id: string
          p_starts_at: string
          p_duration_min: number
          p_has_companion: boolean
          p_companion_name: string | null
          p_companion_phone: string | null
          p_meeting_url: string | null
          p_zoom_meeting_id: string | null
          p_price: number | null
          p_admin_notes: string | null
          p_public_token: string | null
          p_messages: Json
        }
        Returns: string
      }
      admin_reschedule_appointment: {
        Args: {
          p_id: string
          p_starts_at: string
          p_duration_min: number
          p_meeting_url: string | null
          p_zoom_meeting_id: string | null
          p_messages: Json
        }
        Returns: undefined
      }
      admin_cancel_appointment: {
        Args: { p_id: string; p_reason: string | null; p_messages: Json }
        Returns: undefined
      }
      get_public_appointment: { Args: { p_token: string }; Returns: Json }
      respond_to_appointment: {
        Args: { p_token: string; p_action: string; p_note?: string | null }
        Returns: Json
      }
    }
    Enums: {
      appointment_status: AppointmentStatus
      payment_status: PaymentStatus
    }
    CompositeTypes: Record<string, never>
  }
}

/** موعد مع بيانات الزبون المرفقة (PostgREST embedding) */
export type AppointmentWithClient = AppointmentRow & {
  clients: Pick<ClientRow, 'id' | 'full_name' | 'phone'>
  outbox_messages?: Pick<OutboxMessageRow, 'id' | 'kind' | 'recipient' | 'due_at' | 'sent_at' | 'skipped_at'>[]
}

/** رسالة مع الموعد والزبون */
export type OutboxWithAppointment = OutboxMessageRow & {
  appointments: Pick<AppointmentRow, 'id' | 'starts_at' | 'status' | 'companion_name'> & {
    clients: Pick<ClientRow, 'id' | 'full_name'>
  }
}
