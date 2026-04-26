import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthErrorRedirect?: boolean;
  }
}
