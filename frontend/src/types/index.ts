export type UserRole = 'applicant' | 'employee' | 'manager' | 'admin' | 'superadmin';

export type ApplicationStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type StepStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export type DocumentCategory =
  | 'identification'
  | 'work_authorization'
  | 'certification'
  | 'health'
  | 'background'
  | 'agreement'
  | 'other';

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'on_leave';

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  agency_id?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  current_step: number;
  total_steps: number;
  agency_id?: string;
  location_id?: string;
  data: Record<string, unknown>;
  submitted_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationStep {
  id: string;
  application_id: string;
  step_number: number;
  step_name: string;
  step_type: 'form' | 'agreement' | 'upload';
  status: StepStatus;
  data: Record<string, unknown>;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  category: DocumentCategory;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  expires_at?: string;
  notes?: string;
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface Agreement {
  id: string;
  application_id: string;
  agreement_type: string;
  agreed: boolean;
  signature: string;
  signed_at: string;
  ip_address?: string;
}

export interface Employee {
  id: string;
  user_id: string;
  profile: Profile;
  employee_id: string;
  status: EmployeeStatus;
  hire_date: string;
  termination_date?: string;
  position: string;
  department?: string;
  pay_rate?: number;
  documents: Document[];
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeClientAssignment {
  id: string;
  employee_id: string;
  client_id: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Agency {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  website?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  address_line1?: string;
  address_line2?: string;
  city: string;
  state: string;
  zip?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_hiring: boolean;
  created_at: string;
  updated_at: string;
}

export const STEP_NAMES: Record<number, string> = {
  1: 'Application Basics',
  2: 'Personal Information',
  3: 'Emergency Contact',
  4: 'Education',
  5: 'Reference 1',
  6: 'Reference 2',
  7: 'Employment History',
  8: 'Work Preferences',
  9: 'Confidentiality Agreement',
  10: 'E-Signature Agreement',
  11: 'Work Authorization',
  12: 'ID Front',
  13: 'ID Back',
  14: 'Social Security Card',
  15: 'Credentials',
  16: 'CPR Certification',
  17: 'TB Test',
  18: 'Orientation Training',
  19: 'Criminal Background',
  20: 'VA Code Disclosure',
  21: 'Job Description',
  22: 'Final Signature',
};

export const TOTAL_STEPS = 22;
