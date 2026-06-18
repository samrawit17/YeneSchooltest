export type RequestOptions = {
  skipAuthErrorRedirect?: boolean;
};

export const requestOptions = (options?: RequestOptions) =>
  options?.skipAuthErrorRedirect ? { skipAuthErrorRedirect: true } : {};
