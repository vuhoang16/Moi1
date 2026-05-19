import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getMockResponse } from './mock-data';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1';

export const api = axios.create({ baseURL: BASE_URL });

const MOCK_MODE = !!process.env.EXPO_PUBLIC_MOCK_AUTH;

if (MOCK_MODE) {
  api.interceptors.request.use((config) => {
    config.adapter = async (cfg: typeof config) => {
      await new Promise((r) => setTimeout(r, 300));
      const data = getMockResponse(cfg.url ?? '', cfg.method);
      return {
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
        request: {},
      };
    };
    return config;
  });
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
        await SecureStore.setItemAsync('access_token', data.accessToken);
        await SecureStore.setItemAsync('refresh_token', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }
    return Promise.reject(error);
  },
);
