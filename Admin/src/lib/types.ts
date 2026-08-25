export interface Room {
  id: number;
  title: string;
  description: string;
  address: string;
  price: number;
  area: number;
  images: string[];
  status: 'available' | 'rented' | 'maintenance';
  electricity: number;
  water: number;
  internet: number;
  serviceFee: number;
  maxPeople: number;
  district: string;
  city: string;
  lat: number | null;
  lng: number | null;
  amenities: string[];
  phone: string;
  zaloLink: string;
  views: number;
  contacts: number;
  isFeatured: boolean;
  isNew: boolean;
  isCheap: boolean;
  rating: number;
  created_at?: string;
  updated_at?: string;
}

export type RoomFormData = {
  title: string;
  description: string;
  address: string;
  price: string;
  area: string;
  status: Room['status'];
  district: string;
  city: string;
  maxPeople: string;
  phone: string;
  zaloLink: string;
  electricity: string;
  water: string;
  internet: string;
  serviceFee: string;
  rating: string;
  isFeatured: boolean;
  isNew: boolean;
  isCheap: boolean;
  images: string;
  amenities: string[];
  lat: string;
  lng: string;
};

export interface Tenant {
  id: number;
  room_id: number;
  room_title: string;
  full_name: string;
  phone: string;
  cccd: string;
  deposit_amount: number;
  amount_given: number;
  amount_remaining: number;
  rent_price: number;
  contract_signed_date: string | null;
  move_in_date: string | null;
  start_date: string | null;
  end_date: string | null;
  people_count: number;
  contract_months: number;
  owner_name: string;
  owner_phone: string;
  payment_status: string;
  note: string;
  is_complete: boolean;
  created_at?: string;
}

export interface TenantHistory {
  id: number;
  tenant_id: number;
  room_id: number;
  room_title: string;
  full_name: string;
  phone: string;
  cccd: string;
  deposit_amount: number;
  rent_price: number;
  move_in_date: string | null;
  start_date: string | null;
  end_date: string | null;
  delete_reason: string;
  deleted_at: string;
}

export interface Demand {
  id: number;
  full_name: string;
  phone: string;
  gender?: string | null;
  district?: string | null;
  room_type?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  min_area?: number | null;
  max_area?: number | null;
  people_count?: number | null;
  bedroom_count?: number | null;
  air_conditioner?: boolean | null;
  washing_machine?: boolean | null;
  private_wc?: boolean | null;
  kitchen?: boolean | null;
  parking?: boolean | null;
  full_furniture?: boolean | null;
  furniture_list?: string[];
  max_distance?: string | null;
  preferred_location?: string | null;
  move_in_date?: string | null;
  special_requirements?: string | null;
  note?: string;
  status?: string;
  created_at?: string;
}

export interface DemandParsedData {
  room_type: string | null;
  district: string | null;
  min_price: number | null;
  max_price: number | null;
  min_area: number | null;
  max_area: number | null;
  people_count: number | null;
  bedroom_count: number | null;
  air_conditioner: boolean | null;
  washing_machine: boolean | null;
  private_wc: boolean | null;
  kitchen: boolean | null;
  parking: boolean | null;
  full_furniture: boolean | null;
  furniture_list: string[];
  max_distance: string | null;
  preferred_location: string | null;
  move_in_date: string | null;
  special_requirements: string | null;
  full_name: string | null;
  phone: string | null;
  note: string;
}

export interface RoomStats {
  total: number;
  available: number;
  rented: number;
  revenue: number;
}

export interface HealthInfo {
  status: string;
  dbMode?: string;
  timestamp?: string;
}