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
          vehicle_name: string | null
          vehicle_type: string | null
          capacity: string | null
          fuel_type: string | null
          wheelchair_accessible: boolean
          current_odometer: number | null
          last_oil_change_odometer: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_no: string
          vehicle_name?: string | null
          vehicle_type?: string | null
          capacity?: string | null
          fuel_type?: string | null
          wheelchair_accessible?: boolean
          current_odometer?: number | null
          last_oil_change_odometer?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_no?: string
          vehicle_name?: string | null
          vehicle_type?: string | null
          capacity?: string | null
          fuel_type?: string | null
          wheelchair_accessible?: boolean
          current_odometer?: number | null
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
          destination_type: 'home' | 'facility' | 'medical' | 'other'
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
          destination_type?: 'home' | 'facility' | 'medical' | 'other'
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
          destination_type?: 'home' | 'facility' | 'medical' | 'other'
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          user_no: string
          name: string
          phone: string | null
          address: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          wheelchair_user: boolean
          special_notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_no: string
          name: string
          phone?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          wheelchair_user?: boolean
          special_notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_no?: string
          name?: string
          phone?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          wheelchair_user?: boolean
          special_notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transportation_records: {
        Row: {
          id: string
          transportation_date: string
          driver_id: string
          vehicle_id: string
          route_id: string
          transportation_type: 'regular' | 'medical' | 'emergency' | 'outing'
          start_time: string | null
          end_time: string | null
          start_odometer: number | null
          end_odometer: number | null
          passenger_count: number | null
          weather_condition: string | null
          special_notes: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transportation_date: string
          driver_id: string
          vehicle_id: string
          route_id: string
          transportation_type?: 'regular' | 'medical' | 'emergency' | 'outing'
          start_time?: string | null
          end_time?: string | null
          start_odometer?: number | null
          end_odometer?: number | null
          passenger_count?: number | null
          weather_condition?: string | null
          special_notes?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transportation_date?: string
          driver_id?: string
          vehicle_id?: string
          route_id?: string
          transportation_type?: 'regular' | 'medical' | 'emergency' | 'outing'
          start_time?: string | null
          end_time?: string | null
          start_odometer?: number | null
          end_odometer?: number | null
          passenger_count?: number | null
          weather_condition?: string | null
          special_notes?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      transportation_details: {
        Row: {
          id: string
          transportation_record_id: string
          user_id: string | null
          destination_id: string
          pickup_time: string | null
          arrival_time: string | null
          departure_time: string | null
          drop_off_time: string | null
          health_condition: string | null
          behavior_notes: string | null
          assistance_required: string | null
          remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transportation_record_id: string
          user_id?: string | null
          destination_id: string
          pickup_time?: string | null
          arrival_time?: string | null
          departure_time?: string | null
          drop_off_time?: string | null
          health_condition?: string | null
          behavior_notes?: string | null
          assistance_required?: string | null
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transportation_record_id?: string
          user_id?: string | null
          destination_id?: string
          pickup_time?: string | null
          arrival_time?: string | null
          departure_time?: string | null
          drop_off_time?: string | null
          health_condition?: string | null
          behavior_notes?: string | null
          assistance_required?: string | null
          remarks?: string | null
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