import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.warn('API request timed out');
    }

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/sign-in' && !currentPath.startsWith('/sign-in')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/sign-in';
      }
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    if (error.response?.status === 403 && typeof window !== 'undefined') {
      const skipAuthRedirect = (error.config as any)?.skipAuthErrorRedirect === true;
      if (!currentPath.includes('/access-denied') && !currentPath.includes('/sign-in') && !skipAuthRedirect) {
        sessionStorage.setItem('accessDeniedUrl', currentPath);
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

        window.location.href = '/access-denied?type=403';
      }
    }

    const protectedAdminRoutes = ['/admin', '/hr/', '/finance/', '/superadmin', '/registrar'];
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
        sessionStorage.setItem('accessDeniedCode', '404');
        const notFoundMessage =
          error.response?.data?.message ||
          'Resource not found or you do not have permission to access this page.';
        sessionStorage.setItem('accessDeniedMessage', notFoundMessage);
        window.location.href = '/access-denied?type=404';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
