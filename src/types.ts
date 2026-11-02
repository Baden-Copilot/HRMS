export interface TechnologyTopic {
  id?: number;
  code: string;
  title: string;
  category: string;
  description?: string;
  participant_count?: number;
}

export interface InterestSegment {
  id?: number;
  name: string;
  color: string;
  topic_codes: string;
  description?: string;
  created_at?: string;
  matched_participants_count?: number;
  matched_participants?: Array<{
    id: number;
    reg_number: string;
    full_name: string;
    institution_name: string;
    role_position: string;
    city: string;
    phone_wa?: string;
  }>;
}

export type ParticipantRole = 
  | 'Direktur / Wakil Manajemen Rumah Sakit'
  | 'Mitra Telkom'
  | 'Narasumber';

export type RegistrationStatus = 
  | 'Terdaftar'
  | 'Terverifikasi'
  | 'Hadir'
  | 'Tidak Hadir'
  | 'Dibatalkan';

export interface Participant {
  id: number;
  reg_number: string;
  full_name: string;
  role_position: ParticipantRole;
  institution_name: string;
  phone_wa: string;
  email: string;
  city: string;
  pdp_consent?: number;
  created_at: string;
  updated_at?: string;
  registration_id?: number;
  status: RegistrationStatus;
  qr_token: string;
  check_in_time?: string | null;
  badge_printed?: number;
  notes?: string | null;
  topics?: Array<{ code: string; title: string; category?: string }>;
}

export interface AttendanceRecord {
  id: number;
  registration_id: number;
  check_in_timestamp: string;
  check_in_method: string;
  operator_name: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  details: string;
  created_at: string;
}

export interface DashboardStats {
  total_participants: number;
  total_institutions: number;
  roles: Array<{ role_position: string; count: number }>;
  statuses: Array<{ status: string; count: number }>;
  cities: Array<{ city: string; count: number }>;
  topics: Array<{ code: string; title: string; category: string; participant_count: number }>;
  daily_registrations: Array<{ date: string; count: number }>;
  recent_audits: AuditLog[];
}
