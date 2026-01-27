import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'
import ChatBot from '../views/ChatBot.vue'
import request from '../api/request'

const routes = [
  {
    path: '/',
    redirect: '/chat'
  },
  {
    path: '/admin',
    name: 'Admin',
    component: MainLayout
  },
  {
    path: '/chat',
    name: 'ChatBot',
    component: ChatBot
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // 如果有 token，尝试验证其有效性（仅在进入页面时验证一次，或者可以依赖请求拦截器）
  // 这里为了实现“打开页面时失效则显示登录”，我们在路由跳转时如果发现有 token 且是从外部进入（from.path === '/' 或 initial load）可以验证
  if (token && from.path === '/') {
    try {
      await request.get('/users/me')
    } catch (err) {
      // 如果报错，拦截器会自动清理并 reload，这里不需要额外操作
      // 如果拦截器没处理，这里也可以清理
      console.error('Token verification failed:', err)
    }
  }

  if (to.path.startsWith('/admin') && role === 'user') {
    // 普通用户不能进入管理后台
    return next('/chat')
  }

  next()
})

export default router
