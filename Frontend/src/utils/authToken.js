import axios from 'axios';

const AUTH_TOKEN_KEY = 'prepper_auth_token';
let interceptorRegistered = false;

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch {
    // Ignore storage errors in restricted browsing modes
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Attaches the stored JWT as an Authorization Bearer header on requests to
 * our backend so authentication still works when third-party cookies are blocked.
 */
export function setupAxiosAuthInterceptor(backendUrl) {
  if (interceptorRegistered) return;
  interceptorRegistered = true;

  axios.interceptors.request.use((config) => {
    const token = getAuthToken();
    const requestUrl = config.url || '';
    if (token && (!backendUrl || requestUrl.startsWith(backendUrl))) {
      config.headers = config.headers || {};
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || '';
      if (status === 401 && /expired|invalid token/i.test(msg)) {
        clearAuthToken();
      }
      return Promise.reject(error);
    }
  );
}
