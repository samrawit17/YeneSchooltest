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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.warn('API request timed out');
    }

    const skipAuthRedirect = (error.config as any)?.skipAuthErrorRedirect === true;

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

        const redirectParams = new URLSearchParams({ type: '403' });

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
      const skipAuthRedirect = (error.config as any)?.skipAuthErrorRedirect === true;
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
        const redirectParams = new URLSearchParams({ type: '404' });

        window.location.href = `/access-denied?${redirectParams.toString()}`;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
