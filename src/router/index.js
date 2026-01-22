import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'
import ChatBot from '../views/ChatBot.vue'

const routes = [
  {
    path: '/',
    redirect: '/admin'
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

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (to.path.startsWith('/admin') && role === 'user') {
    // 普通用户不能进入管理后台
    return next('/chat')
  }

  next()
})

export default router
