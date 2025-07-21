import { Database } from './database'

// Database row types
export type Driver = Database['public']['Tables']['drivers']['Row']
export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type Route = Database['public']['Tables']['routes']['Row']
export type Destination = Database['public']['Tables']['destinations']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type TransportationRecord = Database['public']['Tables']['transportation_records']['Row']
export type TransportationDetail = Database['public']['Tables']['transportation_details']['Row']

// Database insert types
export type DriverInsert = Database['public']['Tables']['drivers']['Insert']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
export type RouteInsert = Database['public']['Tables']['routes']['Insert']
export type DestinationInsert = Database['public']['Tables']['destinations']['Insert']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type TransportationRecordInsert = Database['public']['Tables']['transportation_records']['Insert']
export type TransportationDetailInsert = Database['public']['Tables']['transportation_details']['Insert']

// Database update types
export type DriverUpdate = Database['public']['Tables']['drivers']['Update']
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']
export type RouteUpdate = Database['public']['Tables']['routes']['Update']
export type DestinationUpdate = Database['public']['Tables']['destinations']['Update']
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type TransportationRecordUpdate = Database['public']['Tables']['transportation_records']['Update']
export type TransportationDetailUpdate = Database['public']['Tables']['transportation_details']['Update']

// Extended types with relationships
export interface RouteWithDestinations extends Route {
  destinations: Destination[]
}

export interface TransportationRecordWithDetails extends TransportationRecord {
  driver: Driver
  vehicle: Vehicle
  route: RouteWithDestinations
  transportation_details: (TransportationDetail & {
    destination: Destination
    user?: any
  })[]
}

export interface TransportationDetailWithDestination extends TransportationDetail {
  destination: Destination
  user?: any
}

// Form types
export interface DriverLoginForm {
  driverId: string
  vehicleNo: string
  pinCode?: string
}

export interface TransportationRecordForm {
  driverId: string
  vehicleId: string
  routeId?: string
  userId?: string
  transportationDate: string
  transportationType: 'regular' | 'medical' | 'emergency' | 'outing' | 'individual'
  startOdometer?: number
  endOdometer?: number
  passengerCount?: number
  weatherCondition?: string
  specialNotes?: string
  managementCodeId?: string | null
  
  // 基本的な記録事項
  departureTime?: string  // 出発時刻
  arrivalTime?: string    // 到着時刻
  transportationDistance?: number  // 送迎距離(km)
  transportationDuration?: number  // 所要時間(分)
  pickupAddress?: string   // 乗車地点住所
  dropoffAddress?: string  // 降車地点住所
  
  // 安全管理に関する記録
  safetyCheckBoarding?: string      // 乗車時安全確認状況
  safetyCheckAlighting?: string     // 降車時安全確認状況
  wheelchairSecurityStatus?: string // 車椅子固定状況
  companionPresent?: boolean        // 同乗者の有無
  companionName?: string           // 同乗者氏名
  companionRelationship?: string   // 同乗者続柄
}

export interface TransportationDetailForm {
  userId?: string
  destinationId: string
  pickupTime?: string
  arrivalTime?: string
  departureTime?: string
  dropOffTime?: string
  healthCondition?: string
  behaviorNotes?: string
  assistanceRequired?: string
  remarks?: string
  
  // 安全管理項目
  individualSafetyNotes?: string  // 個別の安全に関する特記事項
  mobilityAidUsed?: string        // 使用した福祉用具
  mobilityAidSecurity?: string    // 福祉用具の固定状況
}

// Status types
export type TransportationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TransportationType = 'regular' | 'medical' | 'emergency' | 'outing' | 'individual'
export type DestinationType = 'home' | 'facility' | 'medical' | 'other'

// UI types
export interface NavigationItem {
  href: string
  label: string
  icon?: string
}

export interface UserRole {
  role: 'driver' | 'admin'
  permissions: string[]
}

// Report types
export interface MonthlyReport {
  month: string
  totalTransportations: number
  totalDistance: number
  averageTransportationTime: number
  driverStats: DriverStat[]
  routeStats: RouteStat[]
}

export interface DriverStat {
  driverId: string
  driverName: string
  totalTransportations: number
  totalDistance: number
  averageTransportationTime: number
}

export interface RouteStat {
  routeId: string
  routeName: string
  totalTransportations: number
  averageTransportationTime: number
}

// Export format types
export interface ExportOptions {
  format: 'excel' | 'csv'
  dateRange: {
    start: string
    end: string
  }
  includeDetails: boolean
}

// Transportation type mappings
export const TRANSPORTATION_TYPES = {
  regular: '通所支援',
  medical: '医療送迎',
  emergency: '緊急送迎',
  outing: '外出支援',
  individual: '個別送迎',
} as const

export const DESTINATION_TYPES = {
  home: '自宅',
  facility: '施設',
  medical: '医療機関',
  other: 'その他',
} as const

// Error types
export interface AppError {
  code: string
  message: string
  details?: unknown
}

// API response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: AppError
  success: boolean
}

// Offline sync types
export interface SyncStatus {
  isOnline: boolean
  hasUnsyncedData: boolean
  lastSyncTime?: string
}

export interface UnsyncedData {
  transportationRecords: TransportationRecordInsert[]
  transportationDetails: TransportationDetailInsert[]
}

// Chart data types for dashboard
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
  }[]
}