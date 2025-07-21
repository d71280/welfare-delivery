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
          driver_license_number: string | null
          management_code_id: string | null
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
          driver_license_number?: string | null
          management_code_id?: string | null
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
          driver_license_number?: string | null
          management_code_id?: string | null
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
          management_code_id: string | null
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
          management_code_id?: string | null
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
          management_code_id?: string | null
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
          management_code_id: string | null
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
          management_code_id?: string | null
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
          management_code_id?: string | null
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
          route_id: string | null
          transportation_type: 'regular' | 'medical' | 'emergency' | 'outing' | 'individual'
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
          
          // 基本的な記録事項
          departure_time: string | null
          arrival_time: string | null
          transportation_distance: number | null
          transportation_duration: number | null
          pickup_address: string | null
          dropoff_address: string | null
          
          // 安全管理に関する記録
          safety_check_boarding: string | null
          safety_check_alighting: string | null
          wheelchair_security_status: string | null
          companion_present: boolean | null
          companion_name: string | null
          companion_relationship: string | null
        }
        Insert: {
          id?: string
          transportation_date: string
          driver_id: string
          vehicle_id: string
          route_id?: string | null
          transportation_type?: 'regular' | 'medical' | 'emergency' | 'outing' | 'individual'
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
          
          // 基本的な記録事項
          departure_time?: string | null
          arrival_time?: string | null
          transportation_distance?: number | null
          transportation_duration?: number | null
          pickup_address?: string | null
          dropoff_address?: string | null
          
          // 安全管理に関する記録
          safety_check_boarding?: string | null
          safety_check_alighting?: string | null
          wheelchair_security_status?: string | null
          companion_present?: boolean | null
          companion_name?: string | null
          companion_relationship?: string | null
        }
        Update: {
          id?: string
          transportation_date?: string
          driver_id?: string
          vehicle_id?: string
          route_id?: string | null
          transportation_type?: 'regular' | 'medical' | 'emergency' | 'outing' | 'individual'
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
          
          // 基本的な記録事項
          departure_time?: string | null
          arrival_time?: string | null
          transportation_distance?: number | null
          transportation_duration?: number | null
          pickup_address?: string | null
          dropoff_address?: string | null
          
          // 安全管理に関する記録
          safety_check_boarding?: string | null
          safety_check_alighting?: string | null
          wheelchair_security_status?: string | null
          companion_present?: boolean | null
          companion_name?: string | null
          companion_relationship?: string | null
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
          
          // 安全管理項目
          individual_safety_notes: string | null
          mobility_aid_used: string | null
          mobility_aid_security: string | null
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
          
          // 安全管理項目
          individual_safety_notes?: string | null
          mobility_aid_used?: string | null
          mobility_aid_security?: string | null
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
          
          // 安全管理項目
          individual_safety_notes?: string | null
          mobility_aid_used?: string | null
          mobility_aid_security?: string | null
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