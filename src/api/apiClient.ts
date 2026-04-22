import axios, { type InternalAxiosRequestConfig } from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "https://api.talesandtreasures.com.ng").replace(
  /\/$/,
  ""
);

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

const NETWORK_EVENT = "tt-admin:network-pending";
let pendingRequests = 0;
const GET_CACHE_TTL_MS = 5_000;

type CachedGetEntry = {
  data: unknown;
  status: number;
  statusText: string;
  headers: unknown;
  expiresAt: number;
};

type CachedConfig = InternalAxiosRequestConfig & {
  __cacheKey?: string;
  _retry?: boolean;
};

const cachedGetResponses = new Map<string, CachedGetEntry>();

function emitPendingRequests() {
  window.dispatchEvent(
    new CustomEvent(NETWORK_EVENT, { detail: { pending: pendingRequests } }),
  );
}

function getRequestPath(config: InternalAxiosRequestConfig): string {
  const rawUrl = String(config.url || "");
  if (!rawUrl) return "";
  if (/^https?:\/\//i.test(rawUrl)) {
    try {
      return new URL(rawUrl).pathname || rawUrl;
    } catch {
      return rawUrl;
    }
  }
  return rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
}

function shouldCacheGet(config: InternalAxiosRequestConfig): boolean {
  if (String(config.method || "get").toLowerCase() !== "get") return false;
  if (config.headers?.["x-skip-cache"]) return false;

  const path = getRequestPath(config).toLowerCase();
  if (!path) return false;
  if (path.startsWith("/auth/")) return false;
  if (path.includes("/payments/verify/")) return false;

  return true;
}

function clearExpiredGetCache(): void {
  const now = Date.now();
  for (const [key, entry] of cachedGetResponses.entries()) {
    if (entry.expiresAt <= now) {
      cachedGetResponses.delete(key);
    }
  }
}

function buildGetCacheKey(config: InternalAxiosRequestConfig): string {
  const token = localStorage.getItem("authToken") || "";
  const path = getRequestPath(config);
  const params = JSON.stringify(config.params || {});
  return `${path}::${params}::${token}`;
}

// === REQUEST INTERCEPTOR ===
// Attach the access token to every request if available
apiClient.interceptors.request.use(
  (config) => {
    pendingRequests += 1;
    emitPendingRequests();

    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const normalizedMethod = String(config.method || "get").toLowerCase();
    if (normalizedMethod !== "get") {
      cachedGetResponses.clear();
      return config;
    }

    if (shouldCacheGet(config)) {
      clearExpiredGetCache();
      const cacheKey = buildGetCacheKey(config);
      (config as CachedConfig).__cacheKey = cacheKey;

      const cached = cachedGetResponses.get(cacheKey);
      if (cached) {
        config.adapter = async () => ({
          data: cached.data,
          status: cached.status,
          statusText: cached.statusText,
          headers: cached.headers,
          config,
          request: undefined,
        });
      }
    }

    return config;
  },
  (error) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    emitPendingRequests();
    return Promise.reject(error);
  }
);

// === RESPONSE INTERCEPTOR ===
// Automatically refresh the access token if expired (401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    emitPendingRequests();

    const config = response.config as CachedConfig;
    if (shouldCacheGet(config) && config.__cacheKey) {
      cachedGetResponses.set(config.__cacheKey, {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
      });
    }

    return response;
  },
  async (error) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    emitPendingRequests();

    const originalRequest = error.config as CachedConfig | undefined;

    // Check if unauthorized & prevent infinite retry loop
    if (
      originalRequest &&
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          // No refresh token available, force logout
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("authUser");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Request a new access token using the refresh token
        const rs = await axios.post(
          `${API_URL}/auth/refresh`, 
          { refreshToken },
          {
            headers: {
              Authorization: `Bearer ${refreshToken}` // Send as Bearer token
            }
          }
        );

        const { accessToken } = rs.data;

        // Store new access token
        localStorage.setItem("authToken", accessToken);
        cachedGetResponses.clear();

        // Update Authorization headers
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

        // Retry the original request with the new token
        return apiClient(originalRequest);
      } catch (_error) {
        // If refresh fails, logout and redirect to login
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authUser");
        window.location.href = "/login";
        return Promise.reject(_error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { NETWORK_EVENT };
