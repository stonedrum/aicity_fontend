// API 基础路径配置
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 自动检测当前主机名并配合 8000 端口（后端默认端口）
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//127.0.0.1:8000`;
  }
  return 'http://112.17.141.170:8321';
};

export const API_BASE_URL = getApiBaseUrl();
