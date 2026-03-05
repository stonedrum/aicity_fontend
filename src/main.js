import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'
import 'katex/dist/katex.min.css'
import 'markdown-it-texmath/css/texmath.css'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(ElementPlus, {
  locale: zhCn,
})
app.use(router)
app.mount('#app')
