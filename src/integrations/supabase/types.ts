export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          concern: Database["public"]["Enums"]["concern_type"]
          created_at: string
          doctor_id: string
          doctor_schedule_id: string
          id: string
          name: string
          phone: string
          pin: string
          reason: Database["public"]["Enums"]["reason_type"]
          scheduled_time: string
          serial_number: number
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          concern: Database["public"]["Enums"]["concern_type"]
          created_at?: string
          doctor_id: string
          doctor_schedule_id: string
          id?: string
          name: string
          phone: string
          pin: string
          reason: Database["public"]["Enums"]["reason_type"]
          scheduled_time: string
          serial_number: number
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          concern?: Database["public"]["Enums"]["concern_type"]
          created_at?: string
          doctor_id?: string
          doctor_schedule_id?: string
          id?: string
          name?: string
          phone?: string
          pin?: string
          reason?: Database["public"]["Enums"]["reason_type"]
          scheduled_time?: string
          serial_number?: number
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_schedule_id_fkey"
            columns: ["doctor_schedule_id"]
            isOneToOne: false
            referencedRelation: "doctor_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          appointment_id: string
          created_at: string
          doctor_id: string
          id: string
          notes: string | null
          prescription: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          doctor_id: string
          id?: string
          notes?: string | null
          prescription?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          prescription?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_schedules: {
        Row: {
          availability_date: string
          break_end: string
          break_start: string
          created_at: string
          doctor_id: string
          end_time: string
          id: string
          max_appointments: number
          start_time: string
          updated_at: string
        }
        Insert: {
          availability_date: string
          break_end?: string
          break_start?: string
          created_at?: string
          doctor_id: string
          end_time?: string
          id?: string
          max_appointments?: number
          start_time?: string
          updated_at?: string
        }
        Update: {
          availability_date?: string
          break_end?: string
          break_start?: string
          created_at?: string
          doctor_id?: string
          end_time?: string
          id?: string
          max_appointments?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string
          degree: string
          doctor_type: Database["public"]["Enums"]["doctor_type"]
          experience: string
          id: string
          name: string
          password: string
          profile_picture_url: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          degree: string
          doctor_type?: Database["public"]["Enums"]["doctor_type"]
          experience: string
          id?: string
          name: string
          password: string
          profile_picture_url?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          degree?: string
          doctor_type?: Database["public"]["Enums"]["doctor_type"]
          experience?: string
          id?: string
          name?: string
          password?: string
          profile_picture_url?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          concern: Database["public"]["Enums"]["concern_type"]
          created_at: string
          id: string
          medical_history: string | null
          name: string
          phone: string
          pin: string
          profile_picture_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concern: Database["public"]["Enums"]["concern_type"]
          created_at?: string
          id?: string
          medical_history?: string | null
          name: string
          phone: string
          pin: string
          profile_picture_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concern?: Database["public"]["Enums"]["concern_type"]
          created_at?: string
          id?: string
          medical_history?: string | null
          name?: string
          phone?: string
          pin?: string
          profile_picture_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status: "scheduled" | "completed" | "absent" | "cancelled"
      concern_type: "OG" | "OPL" | "Udvash-Unmesh" | "Rokomari" | "Uttoron"
      doctor_type: "Homeopathy" | "General" | "Physiotherapist"
      reason_type: "New Patient" | "Follow Up" | "Report Show"
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
      appointment_status: ["scheduled", "completed", "absent", "cancelled"],
      concern_type: ["OG", "OPL", "Udvash-Unmesh", "Rokomari", "Uttoron"],
      doctor_type: ["Homeopathy", "General", "Physiotherapist"],
      reason_type: ["New Patient", "Follow Up", "Report Show"],
    },
  },
} as const
