export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string
          email: string
          role: string
          status: string
          phone?: string | null
          preferred_region?: string | null
          start_date?: string | null
          avatar_url?: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name: string
          email: string
          role: string
          status?: string
          phone?: string | null
          preferred_region?: string | null
          start_date?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string
          email?: string
          role?: string
          status?: string
          phone?: string | null
          preferred_region?: string | null
          start_date?: string | null
          avatar_url?: string | null
        }
      }
      routes: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          date: string
          status: string
          duration: number
          completed_houses: number
          total_houses: number
          completion: number
          driver_id?: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          date: string
          status: string
          duration?: number
          completed_houses?: number
          total_houses: number
          completion?: number
          driver_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          date?: string
          status?: string
          duration?: number
          completed_houses?: number
          total_houses?: number
          completion?: number
          driver_id?: string | null
        }
      }
      houses: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          address: string
          lat: number
          lng: number
          status: string
          notes?: string | null
          route_id: string
          is_new_customer?: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          address: string
          lat: number
          lng: number
          status: string
          notes?: string | null
          route_id: string
          is_new_customer?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          address?: string
          lat?: number
          lng?: number
          status?: string
          notes?: string | null
          route_id?: string
          is_new_customer?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 