import axios from 'axios'
import { API_BASE_URL } from './config'

// 创建一个 axios 实例，设置 baseURL 为配置的 API 地址
const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
})

// 请求拦截器：自动注入 Token
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理 Token 失效
instance.interceptors.response.use(
  response => {
    return response
  },
  error => {
    if (error.response && error.response.status === 401) {
      // Token 失效，清除本地存储并重载页面
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('role')
      
      // 避免无限重载：只有当页面上有 token (或者原本认为有 token) 且报错 401 时才刷新
      // 实际上 localStorage 已经清空了，刷新后组件会因为没 token 显示登录框
      if (window.location.pathname !== '/login') {
        window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)

export default instance
