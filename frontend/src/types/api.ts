import type {
  Application,
  ApplicationStep,
  Document,
  Employee,
  Profile,
  ApplicationStatus,
  DocumentStatus,
} from './index';

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ApplicationListParams {
  status?: ApplicationStatus;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ApplicationResponse {
  application: Application;
  steps: ApplicationStep[];
  profile: Profile;
}

export interface SaveStepRequest {
  step_number: number;
  data: Record<string, unknown>;
  status: 'in_progress' | 'completed' | 'skipped';
}

export interface UploadDocumentRequest {
  file: File;
  category: string;
  document_type: string;
}

export interface ReviewDocumentRequest {
  document_id: string;
  status: DocumentStatus;
  notes?: string;
}

export interface HireApplicantRequest {
  user_id: string;
  position: string;
  hire_date: string;
  pay_rate?: number;
  department?: string;
}

export interface EmployeeListParams {
  status?: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ComplianceAlert {
  id: string;
  employee_id: string;
  employee_name: string;
  document_type: string;
  category: string;
  expires_at: string;
  days_until_expiry: number;
  status: 'expiring_soon' | 'expired' | 'missing';
}

export interface DashboardStats {
  total_applicants: number;
  pending_review: number;
  active_employees: number;
  expiring_documents: number;
  recent_applications: ApplicationResponse[];
}
