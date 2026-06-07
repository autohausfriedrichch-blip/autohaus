export type UserRole = 'super_admin' | 'admin' | 'mechanic' | 'customer'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Customer {
  id: string
  full_name: string
  email?: string
  phone: string
  whatsapp?: string
  address?: string
  city?: string
  postal_code?: string
  preferred_contact: 'phone' | 'whatsapp' | 'email'
  marketing_consent: boolean
  notes?: string
  fleet_account_id?: string
  created_at: string
  updated_at: string
  vehicles?: Vehicle[]
}

export interface Vehicle {
  id: string
  customer_id: string
  make: string
  model: string
  year: number
  license_plate: string
  vin?: string
  mileage?: number
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg'
  color?: string
  notes?: string
  created_at: string
  customer?: Customer
}

export type WorkOrderStatus =
  | 'new_booking' | 'confirmed' | 'checked_in' | 'diagnostics'
  | 'waiting_quote' | 'waiting_approval' | 'waiting_parts'
  | 'in_repair' | 'quality_check' | 'ready' | 'checkout_ready'
  | 'delivered' | 'closed'

export interface WorkOrder {
  id: string
  order_number: string
  customer_id: string
  vehicle_id: string
  service_type: string
  status: WorkOrderStatus
  mechanic_id?: string
  scheduled_date?: string
  scheduled_time?: string
  is_mobile: boolean
  mobile_address?: string
  fault_description?: string
  work_to_do?: string
  work_done?: string
  parts_cost: number
  labor_cost: number
  total_amount: number
  internal_notes?: string
  customer_notes?: string
  next_service_date?: string
  checkin_mileage?: number
  checkin_fuel_level?: number
  checkin_signature?: string
  checkin_at?: string
  checkout_at?: string
  payment_status: 'pending' | 'paid' | 'partial'
  created_at: string
  updated_at: string
  customer?: Customer
  vehicle?: Vehicle
  mechanic?: Profile
  photos?: WorkOrderPhoto[]
  quotes?: Quote[]
}

export interface WorkOrderPhoto {
  id: string
  work_order_id: string
  url: string
  category: string
  caption?: string
  is_visible_to_customer: boolean
  uploaded_by: string
  created_at: string
}

export interface Quote {
  id: string
  work_order_id: string
  customer_id: string
  vehicle_id: string
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  valid_until?: string
  items: QuoteItem[]
  labor_cost: number
  parts_cost: number
  tax_rate: number
  total_amount: number
  notes?: string
  customer_notes?: string
  approved_at?: string
  rejected_at?: string
  created_at: string
  customer?: Customer
  vehicle?: Vehicle
}

export interface QuoteItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  item_type: 'labor' | 'part' | 'other'
}

export interface Booking {
  id: string
  customer_id: string
  vehicle_id: string
  service_id?: string
  service_type: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  is_mobile: boolean
  mobile_address?: string
  notes?: string
  urgency: 'normal' | 'urgent' | 'asap'
  created_at: string
  customer?: Customer
  vehicle?: Vehicle
}

export interface Service {
  id: string
  name: string
  category: string
  price: number
  duration_minutes: number
  description?: string
  is_mobile: boolean
  is_active: boolean
  is_visible_to_customer: boolean
}

export interface CommunicationLog {
  id: string
  customer_id: string
  work_order_id?: string
  quote_id?: string
  direction: 'inbound' | 'outbound'
  channel: 'whatsapp' | 'phone' | 'email' | 'in_person'
  message_type: string
  content?: string
  handled_by?: string
  created_at: string
  customer?: Customer
}

export interface FleetAccount {
  id: string
  company_name: string
  contact_name: string
  contact_email?: string
  contact_phone?: string
  billing_address?: string
  discount_percent: number
  contract_status: 'active' | 'inactive' | 'pending'
  notes?: string
  created_at: string
}

export interface DashboardStats {
  todayBookings: number
  openWorkOrders: number
  pendingQuotes: number
  monthRevenue: number
  newCustomers: number
  mobileJobs: number
}
