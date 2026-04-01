import { supabase } from './supabase';

// For local dev: http://localhost:8000
// For production: https://medi-vault-api.onrender.com
// The /api prefix is added here, not in the env var
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_URL = `${BASE_URL}/api`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  // Fetch a blob (for PDFs, images, etc.)
  fetchBlob: async (endpoint: string): Promise<Blob> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    return response.blob();
  },

  upload: async <T>(endpoint: string, file: File, fields?: Record<string, string>): Promise<T> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const formData = new FormData();
    formData.append('file', file);
    if (fields) {
      Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  },

  postFormData: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  },
};
