import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useLanguageStore } = require('@/lib/languageStore');
        const language = useLanguageStore.getState().language;
        if (language) {
          config.headers.set('x-locale', language);
        }
      } catch {
        // store not available — skip
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      console.warn('API request timed out');
    }

    const originalRequest = error.config as any;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const skipAuthRedirect = originalRequest.skipAuthErrorRedirect === true;

    // Attempt token refresh on 401 (only once per request, and not for the refresh endpoint itself)
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !skipAuthRedirect &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh', null, { skipAuthErrorRedirect: true });
        isRefreshing = false;

        pendingRequests.forEach((p) => p.resolve(null));
        pendingRequests = [];

        return api(originalRequest);
      } catch {
        isRefreshing = false;
        pendingRequests.forEach((p) => p.reject(error));
        pendingRequests = [];

        const currentPath = window.location.pathname;
        if (currentPath !== '/sign-in' && !currentPath.startsWith('/sign-in')) {
          window.location.href = '/sign-in';
        }

        return Promise.reject(error);
      }
    }

    // Handle 401 on refresh endpoint or non-retryable requests
    if (error.response?.status === 401 && typeof window !== 'undefined' && !skipAuthRedirect) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/sign-in' && !currentPath.startsWith('/sign-in')) {
        window.location.href = '/sign-in';
      }
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    if (
      error.response?.status === 503 &&
      error.response?.data?.code === 'MAINTENANCE_MODE' &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new CustomEvent('sms:maintenance-mode'));
    }

    if (error.response?.status === 403 && typeof window !== 'undefined') {
      if (!currentPath.includes('/access-denied') && !currentPath.includes('/sign-in') && !skipAuthRedirect) {
        sessionStorage.setItem('accessDeniedUrl', currentPath);
        const requestUrl =
          error.config?.url ||
          error.response?.config?.url ||
          '';
        if (requestUrl) {
          sessionStorage.setItem('accessDeniedApiUrl', requestUrl);
        }
        sessionStorage.setItem('accessDeniedCode', '403');
        const errorMessage =
          error.response?.data?.message ||
          'You do not have the required permissions to access this resource.';
        sessionStorage.setItem('accessDeniedMessage', errorMessage);

        const requiredPermission =
          error.response?.data?.requiredPermission ||
          error.response?.headers?.['x-required-permission'];
        if (requiredPermission) {
          sessionStorage.setItem('accessDeniedPermission', requiredPermission);
        }

        const redirectParams = new URLSearchParams({ type: '403', from: currentPath });
        if (requestUrl) {
          redirectParams.set('api', requestUrl);
          redirectParams.set('error', errorMessage);
        }

        window.location.href = `/access-denied?${redirectParams.toString()}`;
      }
    }

    const protectedAdminRoutes = ['/admin', '/finance/', '/superadmin', '/registrar'];
    const isProtectedRoute = protectedAdminRoutes.some((route) => currentPath.includes(route));

    if (
      error.response?.status === 404 &&
      typeof window !== 'undefined' &&
      isProtectedRoute &&
      !currentPath.includes('/access-denied') &&
      !currentPath.includes('/sign-in')
    ) {
      if (!skipAuthRedirect) {
        sessionStorage.setItem('accessDeniedUrl', currentPath);
        const requestUrl =
          error.config?.url ||
          error.response?.config?.url ||
          '';
        if (requestUrl) {
          sessionStorage.setItem('accessDeniedApiUrl', requestUrl);
        }
        sessionStorage.setItem('accessDeniedCode', '404');
        const notFoundMessage =
          error.response?.data?.message ||
          'Resource not found or you do not have permission to access this page.';
        sessionStorage.setItem('accessDeniedMessage', notFoundMessage);
        const redirectParams = new URLSearchParams({ type: '404', from: currentPath });

        window.location.href = `/access-denied?${redirectParams.toString()}`;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
