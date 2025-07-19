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
      drivers: {
        Row: {
          id: string
          name: string
          employee_no: string
          email: string | null
          pin_code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          employee_no: string
          email?: string | null
          pin_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          employee_no?: string
          email?: string | null
          pin_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          vehicle_no: string
          vehicle_type: string | null
          capacity: string | null
          fuel_type: string | null
          last_oil_change_odometer: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_no: string
          vehicle_type?: string | null
          capacity?: string | null
          fuel_type?: string | null
          last_oil_change_odometer?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_no?: string
          vehicle_type?: string | null
          capacity?: string | null
          fuel_type?: string | null
          last_oil_change_odometer?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      routes: {
        Row: {
          id: string
          route_name: string
          route_code: string
          start_location: string | null
          end_location: string | null
          estimated_time: string | null
          distance: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          route_name: string
          route_code: string
          start_location?: string | null
          end_location?: string | null
          estimated_time?: string | null
          distance?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          route_name?: string
          route_code?: string
          start_location?: string | null
          end_location?: string | null
          estimated_time?: string | null
          distance?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      destinations: {
        Row: {
          id: string
          route_id: string
          name: string
          address: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          route_id: string
          name: string
          address?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          name?: string
          address?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      delivery_records: {
        Row: {
          id: string
          delivery_date: string
          driver_id: string
          vehicle_id: string
          route_id: string
          start_odometer: number | null
          end_odometer: number | null
          gas_card_used: boolean
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          delivery_date: string
          driver_id: string
          vehicle_id: string
          route_id: string
          start_odometer?: number | null
          end_odometer?: number | null
          gas_card_used?: boolean
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          delivery_date?: string
          driver_id?: string
          vehicle_id?: string
          route_id?: string
          start_odometer?: number | null
          end_odometer?: number | null
          gas_card_used?: boolean
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      delivery_details: {
        Row: {
          id: string
          delivery_record_id: string
          destination_id: string
          arrival_time: string | null
          departure_time: string | null
          has_invoice: boolean
          remarks: string | null
          time_slot: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          delivery_record_id: string
          destination_id: string
          arrival_time?: string | null
          departure_time?: string | null
          has_invoice?: boolean
          remarks?: string | null
          time_slot?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          delivery_record_id?: string
          destination_id?: string
          arrival_time?: string | null
          departure_time?: string | null
          has_invoice?: boolean
          remarks?: string | null
          time_slot?: number | null
          created_at?: string
          updated_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}