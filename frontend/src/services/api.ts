/**
 * TownPulse Frontend API Client
 * Typed fetch wrappers with automatic JWT Authorization header injection
 * and unified error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'user' | 'business_owner' | 'admin';
  phone_verified: boolean;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
  description?: string;
}

export interface Listing {
  id: string;
  name: string;
  description?: string;
  address: string;
  category_id?: number;
  category?: Category;
  lat?: number;
  lng?: number;
  phone?: string;
  email?: string;
  website?: string;
  hours?: Record<string, string>;
  verified: boolean;
  status: string;
  owner_user_id?: string;
  distance_meters?: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: int;
  page: int;
  per_page: int;
  total_pages: int;
}

export interface Claim {
  id: string;
  listing_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_url?: string;
  message?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
  user?: User;
}

export interface SearchParams {
  q?: string;
  category_id?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  verified_only?: boolean;
  sort_by?: 'created_at' | 'name' | 'distance';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

// ─── Token Utilities ──────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem('townpulse_access_token');
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('townpulse_access_token', accessToken);
  localStorage.setItem('townpulse_refresh_token', refreshToken);
}

export function clearStoredTokens(): void {
  localStorage.removeItem('townpulse_access_token');
  localStorage.removeItem('townpulse_refresh_token');
  localStorage.removeItem('townpulse_user');
}

// ─── Core Request Wrapper ─────────────────────────────────────────────────────

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An unexpected network error occurred' }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

export const api = {
  // Categories
  getCategories: () => request<Category[]>('/categories'),

  // Listings
  searchListings: (params: SearchParams = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.category_id) query.append('category_id', params.category_id.toString());
    if (params.lat !== undefined) query.append('lat', params.lat.toString());
    if (params.lng !== undefined) query.append('lng', params.lng.toString());
    if (params.radius) query.append('radius', params.radius.toString());
    if (params.verified_only) query.append('verified_only', 'true');
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());

    return request<PaginatedResponse<Listing>>(`/listings?${query.toString()}`);
  },

  getListing: (id: string) => request<Listing>(`/listings/${id}`),

  createListing: (data: Partial<Listing>) =>
    request<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateListing: (id: string, data: Partial<Listing>) =>
    request<Listing>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteListing: (id: string) =>
    request<{ message: string }>(`/listings/${id}`, {
      method: 'DELETE',
    }),

  claimListing: (listingId: string, proofUrl?: string, message?: string) =>
    request<Claim>(`/listings/${listingId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ listing_id: listingId, proof_url: proofUrl, message }),
    }),

  reportListing: (listingId: string, reason: string) =>
    request<{ message: string }>(`/listings/${listingId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Auth
  register: (name: string, email?: string, phone?: string, password?: string) =>
    request<{ access_token: string; refresh_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  requestOtp: (phone: string) =>
    request<{ message: string }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string) =>
    request<{ access_token: string; refresh_token: string; user: User }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),

  getMe: () => request<User>('/auth/me'),

  // Admin
  getAnalytics: () => request<Record<string, any>>('/admin/analytics'),
  getPendingListings: () => request<Listing[]>('/admin/listings/pending'),
  verifyListing: (id: string) => request<Listing>(`/admin/listings/${id}/verify`, { method: 'POST' }),
  getPendingClaims: () => request<Claim[]>('/admin/claims/pending'),
  approveClaim: (id: string) => request<Claim>(`/admin/claims/${id}/approve`, { method: 'POST' }),
  rejectClaim: (id: string, reason?: string) =>
    request<Claim>(`/admin/claims/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ status: 'rejected', rejection_reason: reason }),
    }),
};
