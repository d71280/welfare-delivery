import { Database } from './database'

// Database row types
export type Driver = Database['public']['Tables']['drivers']['Row']
export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type Route = Database['public']['Tables']['routes']['Row']
export type Destination = Database['public']['Tables']['destinations']['Row']
export type DeliveryRecord = Database['public']['Tables']['delivery_records']['Row']
export type DeliveryDetail = Database['public']['Tables']['delivery_details']['Row']

// Database insert types
export type DriverInsert = Database['public']['Tables']['drivers']['Insert']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
export type RouteInsert = Database['public']['Tables']['routes']['Insert']
export type DestinationInsert = Database['public']['Tables']['destinations']['Insert']
export type DeliveryRecordInsert = Database['public']['Tables']['delivery_records']['Insert']
export type DeliveryDetailInsert = Database['public']['Tables']['delivery_details']['Insert']

// Database update types
export type DriverUpdate = Database['public']['Tables']['drivers']['Update']
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']
export type RouteUpdate = Database['public']['Tables']['routes']['Update']
export type DestinationUpdate = Database['public']['Tables']['destinations']['Update']
export type DeliveryRecordUpdate = Database['public']['Tables']['delivery_records']['Update']
export type DeliveryDetailUpdate = Database['public']['Tables']['delivery_details']['Update']

// Extended types with relationships
export interface RouteWithDestinations extends Route {
  destinations: Destination[]
}

export interface DeliveryRecordWithDetails extends DeliveryRecord {
  driver: Driver
  vehicle: Vehicle
  route: RouteWithDestinations
  delivery_details: (DeliveryDetail & {
    destination: Destination
  })[]
}

export interface DeliveryDetailWithDestination extends DeliveryDetail {
  destination: Destination
}

// Form types
export interface DriverLoginForm {
  driverId: string
  vehicleNo: string
  pinCode?: string
}

export interface DeliveryRecordForm {
  driverId: string
  vehicleId: string
  routeId: string
  deliveryDate: string
  startOdometer?: number
  endOdometer?: number
  gasCardUsed: boolean
}

export interface DeliveryDetailForm {
  destinationId: string
  arrivalTime?: string
  departureTime?: string
  hasInvoice: boolean
  remarks?: string
  timeSlot?: number
}

// Status types
export type DeliveryStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

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
  totalDeliveries: number
  totalDistance: number
  averageDeliveryTime: number
  driverStats: DriverStat[]
  routeStats: RouteStat[]
}

export interface DriverStat {
  driverId: string
  driverName: string
  totalDeliveries: number
  totalDistance: number
  averageDeliveryTime: number
}

export interface RouteStat {
  routeId: string
  routeName: string
  totalDeliveries: number
  averageDeliveryTime: number
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

// Time slot mappings (0便〜9便)
export const TIME_SLOTS = {
  0: '0便',
  1: '1便',
  2: '2便',
  3: '3便',
  4: '4便',
  5: '5便',
  6: '6便',
  7: '7便',
  8: '8便',
  9: '9便',
} as const

export type TimeSlot = keyof typeof TIME_SLOTS

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
  deliveryRecords: DeliveryRecordInsert[]
  deliveryDetails: DeliveryDetailInsert[]
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