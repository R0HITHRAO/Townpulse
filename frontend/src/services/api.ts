/**
 * TownPulse Frontend API Client
 * Typed fetch wrappers with automatic JWT Authorization header injection
 * and unified error handling.
 */

// Same-origin by default: the browser calls /api/... on whatever host served
// the page. Nginx (Docker) and the Vite dev server both proxy /api to the
// backend, so no CORS, mixed-content, or cross-port issues can occur.
// Set VITE_API_URL explicitly only when the backend lives on another host.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
  /**
   * Stable slug (e.g. "healthcare") used for shareable /c/<slug> URLs. Present
   * on both the API and the static offline snapshot.
   */
  slug?: string;
  icon?: string;
  description?: string;
}

export interface Listing {
  id: string;
  name: string;
  /** Name in the local language(s) where the source recorded one. */
  name_local?: string | null;
  description?: string | null;
  address: string;
  image_url?: string;
  category_id?: number | null;
  category?: Category | null;
  lat?: number;
  lng?: number;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  hours?: Record<string, string> | null;
  /** Free-text service bullets, e.g. "Wheelchair access: yes". */
  services?: string[];
  /** Where this record came from. Rendered so a listing is auditable. */
  source?: string | null;
  /** Link to the upstream record, when there is one. */
  source_url?: string | null;
  verified: boolean;
  status: string;
  owner_user_id?: string;
  distance_meters?: number;
  average_rating?: number;
  review_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Review {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface ReviewListResponse {
  total: number;
  average_rating: number;
  items: Review[];
}

export interface EmergencyAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  is_active: boolean;
  link_url?: string;
  created_at: string;
  expires_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
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
  /**
   * Numeric id from the API, or a slug from the offline snapshot (which
   * filters by either — see `directoryFallback.searchSnapshot`), or a /c/<slug>
   * category page filtering against whichever source answers.
   */
  category_id?: number | string;
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

// ─── Errors ───────────────────────────────────────────────────────────────

/**
 * Distinguishes the failure modes a user actually hits, so the UI can say
 * something true instead of "something went wrong".
 */
export type ApiErrorKind =
  /** The browser has no connection at all. */
  | 'offline'
  /** The request timed out — usually a slow link or a hung backend. */
  | 'timeout'
  /**
   * A response arrived, but it was HTML rather than JSON. This is the
   * "Unexpected token '<'" case: the request was answered by the SPA fallback
   * or a proxy error page, not by the API.
   */
  | 'not-json'
  /** The server answered, or could not be reached. */
  | 'server';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  /** True when suggesting "try again later" is honest. */
  readonly retryable: boolean;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.retryable = kind !== 'server' || (status ?? 500) >= 500;
  }
}

/** Abort a request that has hung past this — a slow link, not a dead one. */
const REQUEST_TIMEOUT_MS = 15000;

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError thrown by our own timer, not by the caller.
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        'timeout',
        `The server did not answer within ${REQUEST_TIMEOUT_MS / 1000} seconds.`
      );
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiError('offline', 'You appear to be offline.');
    }
    throw new ApiError(
      'server',
      `Could not reach the API at ${API_BASE_URL}. Is the backend running?`
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) {
    return {} as T;
  }

  // Read as text first. response.json() throws the unhelpful
  // "Unexpected token '<'" whenever the body is HTML, and it discards the body
  // that would have told us *why* it was HTML.
  const raw = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const trimmed = raw.trimStart();
  const looksJson =
    contentType.includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  let data: unknown = null;
  if (raw && looksJson) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // A proxy error page served as text/html must not be reported as a JSON
    // parse failure.
    if (!data && !looksJson) {
      throw new ApiError(
        'server',
        `The server returned ${response.status} ${response.statusText || ''}`.trim() +
          ' but not JSON. Check that the backend is running and that /api is proxied to it.',
        response.status
      );
    }
    const detail = (data as { detail?: unknown })?.detail;
    throw new ApiError(
      'server',
      typeof detail === 'string'
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `Request failed with status ${response.status}`,
      response.status
    );
  }

  if (!data) {
    throw new ApiError(
      'not-json',
      'The server returned an HTML page instead of data. This usually means the ' +
        'SPA fallback answered an /api request, or a proxy is misconfigured.',
      response.status
    );
  }

  return data as T;
}

// ─── API Endpoints ────────────────────────────────────────────────────

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

  // Reviews
  getReviews: (listingId: string) => request<ReviewListResponse>(`/listings/${listingId}/reviews`),

  addReview: (listingId: string, rating: number, comment?: string) =>
    request<Review>(`/listings/${listingId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),

  deleteReview: (reviewId: string) =>
    request<void>(`/reviews/${reviewId}`, {
      method: 'DELETE',
    }),

  // Emergency Alerts
  getActiveAlerts: () => request<EmergencyAlert[]>('/alerts/active'),

  createAlert: (data: Partial<EmergencyAlert>) =>
    request<EmergencyAlert>('/admin/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deactivateAlert: (alertId: string) =>
    request<void>(`/admin/alerts/${alertId}`, {
      method: 'DELETE',
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
    request<{ message: string; dev_otp?: string | null }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string) =>
    request<{ access_token: string; refresh_token: string; user: User }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),

  getMe: () => request<User>('/auth/me'),

  // ─── Diagnostics ──────────────────────────────────────────────────────────
  /**
   * Probes the backend. Used by the error panels so the user is told *which*
   * link in the chain is broken (frontend -> proxy -> backend -> database)
   * rather than a generic "could not load".
   */
  checkHealth: () => request<{ status?: string; database?: string; version?: string }>('/health'),

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
