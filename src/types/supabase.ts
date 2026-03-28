export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      booking_email_logs: {
        Row: {
          booking_id: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          invoice_id: string | null
          payload: Json
          provider: string
          provider_message_id: string | null
          recipient_email: string
          recipient_role: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          invoice_id?: string | null
          payload?: Json
          provider?: string
          provider_message_id?: string | null
          recipient_email: string
          recipient_role: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          invoice_id?: string | null
          payload?: Json
          provider?: string
          provider_message_id?: string | null
          recipient_email?: string
          recipient_role?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_email_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_email_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "booking_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_invoices: {
        Row: {
          booking_id: string
          created_at: string
          currency: string
          id: string
          invoice_number: string
          issued_at: string
          metadata: Json
          total_amount: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number: string
          issued_at?: string
          metadata?: Json
          total_amount: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          metadata?: Json
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_events: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          booking_id: string
          created_at: string
          id: string
          metadata: Json
          next_status: Database["public"]["Enums"]["booking_status"]
          previous_status: Database["public"]["Enums"]["booking_status"] | null
          reason: string
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          booking_id: string
          created_at?: string
          id?: string
          metadata?: Json
          next_status: Database["public"]["Enums"]["booking_status"]
          previous_status?: Database["public"]["Enums"]["booking_status"] | null
          reason: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          next_status?: Database["public"]["Enums"]["booking_status"]
          previous_status?: Database["public"]["Enums"]["booking_status"] | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string | null
          end_time: string
          host_id: string
          id: string
          pickup_code: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          host_id: string
          id?: string
          pickup_code: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          host_id?: string
          id?: string
          pickup_code?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          capacity: number
          created_at: string | null
          has_charging: boolean | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          owner_id: string | null
          price_per_hour: number
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          has_charging?: boolean | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          owner_id?: string | null
          price_per_hour: number
        }
        Update: {
          capacity?: number
          created_at?: string | null
          has_charging?: boolean | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          owner_id?: string | null
          price_per_hour?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          host_status: string | null
          id: string
          nom: string
          role: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          host_status?: string | null
          id: string
          nom?: string
          role?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          host_status?: string | null
          id?: string
          nom?: string
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      hosts_map: {
        Row: {
          capacity: number | null
          has_charging: boolean | null
          id: string | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string | null
          owner_id: string | null
          price_per_hour: number | null
        }
        Insert: {
          capacity?: number | null
          has_charging?: boolean | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          owner_id?: string | null
          price_per_hour?: number | null
        }
        Update: {
          capacity?: number | null
          has_charging?: boolean | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          owner_id?: string | null
          price_per_hour?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      book_parking_spot: {
        Args: {
          p_end_time: string
          p_host_id: string
          p_start_time: string
          p_total_price: number
        }
        Returns: Json
      }
      cancel_booking: {
        Args: { p_booking_id: string }
        Returns: {
          created_at: string | null
          end_time: string
          host_id: string
          id: string
          pickup_code: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_booking: {
        Args: { p_booking_id: string }
        Returns: {
          created_at: string | null
          end_time: string
          host_id: string
          id: string
          pickup_code: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_pending_bookings: { Args: never; Returns: number }
      generate_booking_pickup_code: {
        Args: { p_booking_id: string }
        Returns: string
      }
      log_booking_status_event: {
        Args: {
          p_actor_role: string
          p_actor_user_id: string
          p_booking_id: string
          p_metadata?: Json
          p_next_status: Database["public"]["Enums"]["booking_status"]
          p_previous_status: Database["public"]["Enums"]["booking_status"]
          p_reason: string
        }
        Returns: undefined
      }
      validate_booking_by_code: {
        Args: { p_pickup_code: string }
        Returns: {
          created_at: string | null
          end_time: string
          host_id: string
          id: string
          pickup_code: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      booking_status: "pending" | "active" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: ["pending", "active", "completed", "cancelled"],
    },
  },
} as const
