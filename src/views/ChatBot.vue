<template>
  <div class="bg-slate-900 text-slate-200 h-screen w-screen overflow-hidden relative">
    <!-- Background effects -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
      <div class="absolute top-[-10%] right-[-5%] w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-[128px] opacity-20"></div>
      <div class="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20"></div>
      <div class="w-full h-full" style="background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 40px 40px;"></div>
    </div>

    <div class="flex h-full max-w-7xl mx-auto">
      <!-- Mobile Sidebar Overlay -->
      <div 
        v-if="mobileMenuVisible" 
        @click="mobileMenuVisible = false"
        class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
      ></div>

      <!-- Mobile Sidebar -->
      <aside 
        class="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 md:hidden p-4 flex flex-col space-y-4"
        :class="mobileMenuVisible ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2 text-cyan-400">
            <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            <span class="font-bold tracking-wider font-mono">专家系统</span>
          </div>
          <button @click="mobileMenuVisible = false" class="text-slate-400 p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="text-xs text-slate-500 font-mono uppercase">知识库类型</div>
        <div class="space-y-2">
          <select v-model="chatKbType" class="w-full bg-slate-800/50 border border-slate-600 text-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:border-cyan-500">
            <option value="">全部类型</option>
            <option v-for="item in kbTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>

        <div class="text-xs text-slate-500 font-mono uppercase mt-4">最近对话</div>
        <div class="flex-1 overflow-y-auto space-y-2 no-scrollbar">
          <div 
            v-for="(chat, idx) in historyLogs" 
            :key="idx" 
            @click="selectHistoryFromMobile(chat)"
            class="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 cursor-pointer text-sm transition"
          >
            <div class="font-medium text-slate-300 truncate">{{ chat.title }}</div>
            <div class="text-xs text-slate-500 mt-1">{{ chat.time }}</div>
          </div>
          <div v-if="historyLogs.length === 0" class="text-xs text-slate-600 text-center py-4">暂无对话记录</div>
        </div>

        <div class="pt-4 border-t border-slate-700/50 space-y-2">
          <button @click="passwordDialogVisible = true; mobileMenuVisible = false" class="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-800 hover:bg-cyan-900/30 text-slate-300 transition text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
            修改密码
          </button>
          <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-800 hover:bg-red-900/30 text-slate-300 transition text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            退出登录
          </button>
        </div>
      </aside>

      <!-- Sidebar (Desktop) -->
      <aside class="hidden md:flex flex-col w-64 glass m-4 rounded-2xl p-4 space-y-4">
        <div class="flex items-center space-x-2 text-cyan-400 mb-4">
          <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          <span class="font-bold tracking-wider font-mono">城维云智能市政运维专家</span>
        </div>
        <div class="text-xs text-slate-500 font-mono uppercase">知识库类型</div>
        <div class="space-y-2">
          <select v-model="chatKbType" class="w-full bg-slate-800/50 border border-slate-600 text-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:border-cyan-500">
            <option value="">全部类型</option>
            <option v-for="item in kbTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>
        <div class="text-xs text-slate-500 font-mono uppercase mt-4">最近对话</div>
        <div class="flex-1 overflow-y-auto space-y-2 no-scrollbar">
          <div 
            v-for="(chat, idx) in historyLogs" 
            :key="idx" 
            @click="selectHistory(chat)"
            class="p-3 rounded-lg hover:bg-slate-700/50 cursor-pointer text-sm transition border-l-2 border-transparent"
          >
            <div class="font-medium text-slate-300 truncate">{{ chat.title }}</div>
            <div class="text-xs text-slate-500 mt-1">{{ chat.time }}</div>
          </div>
          <div v-if="historyLogs.length === 0" class="text-xs text-slate-600 text-center py-4">暂无对话记录</div>
        </div>
        <div class="mt-auto pt-4 border-t border-slate-700/50 space-y-2">
          <button @click="passwordDialogVisible = true" class="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-cyan-900/30 text-slate-400 hover:text-cyan-400 transition text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
            修改密码
          </button>
          <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            退出登录
          </button>
        </div>
      </aside>

      <!-- Main Chat Area -->
      <main class="flex-1 flex flex-col relative m-0 md:m-4 rounded-none md:rounded-2xl glass border-0 md:border overflow-hidden">
        <!-- Header -->
        <header class="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
          <div class="flex items-center gap-3">
            <div class="md:hidden text-cyan-400 font-bold font-mono">城维云</div>
            <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/30 border border-cyan-500/30">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span class="text-xs text-cyan-300 font-mono">ONLINE</span>
            </div>
          </div>
          <div class="text-sm text-slate-400 md:block hidden">智能市政运维专家</div>
          <button @click="mobileMenuVisible = true" class="md:hidden p-2 text-slate-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
          </button>
        </header>

        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar" ref="chatScroll">
          <div v-for="(msg, index) in chatHistory" :key="index" :class="['flex items-start gap-4', msg.role === 'user' ? 'flex-row-reverse' : '']">
            <!-- Avatar -->
            <div v-if="msg.role === 'assistant'" class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg glow-border shrink-0">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div v-else class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600">
              <span class="text-slate-300 font-bold text-sm">{{ username?.charAt(0).toUpperCase() || 'U' }}</span>
            </div>

            <!-- Bubble -->
            <div class="space-y-2 max-w-[85%]" :class="msg.role === 'user' ? 'flex flex-col items-end' : ''">
              <div class="text-xs text-slate-400 font-mono">
                {{ msg.role === 'assistant' ? '城维云 AI' : '工程师' }} • {{ msg.time || '刚刚' }}
              </div>
              <div 
                class="p-4 rounded-2xl text-sm leading-relaxed shadow-md markdown-body"
                :class="msg.role === 'assistant' ? 'bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tl-none' : 'bg-gradient-to-r from-cyan-900/80 to-blue-900/80 border border-cyan-800/50 text-white rounded-tr-none'"
                v-html="renderMarkdown(msg.content)"
              ></div>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="chatLoading" class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg glow-border shrink-0">
              <svg class="w-6 h-6 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </div>
            <div class="space-y-2 max-w-[85%]">
              <div class="text-xs text-slate-400 font-mono">城维云 AI • 思考中...</div>
              <div class="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 text-sm animate-pulse">
                思考中...
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-slate-900/40 backdrop-blur-md border-t border-slate-700/50">
          <div class="relative">
            <textarea 
              v-model="chatInput"
              @keydown.enter.prevent="handleChat"
              placeholder="输入指令或描述问题..." 
              class="w-full bg-slate-800/50 border border-slate-600 text-white rounded-xl pl-4 pr-32 py-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition placeholder-slate-500 font-light resize-none h-16"
            ></textarea>
            
            <div class="absolute right-2 top-2 bottom-2 flex items-center space-x-1">
              <button class="p-2 text-slate-400 hover:text-cyan-400 transition" title="语音输入 (未开启)">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              </button>
              <button 
                @click="handleChat"
                :disabled="chatLoading || !chatInput"
                class="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition shadow-lg shadow-cyan-500/30"
              >
                <svg class="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </div>
          <div class="mt-2 text-[10px] text-slate-500 text-center uppercase tracking-widest font-mono">
            Enter 发送 • 内容由 AI 生成，仅供工程参考
          </div>
        </div>
      </main>
    </div>

    <!-- Login Dialog (Simple) -->
    <div v-if="!token" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div class="glass w-full max-w-md p-8 rounded-2xl space-y-6">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-cyan-400 glow-text font-mono">城维云 - 登录</h2>
          <p class="text-slate-400 text-sm mt-2">智能市政运维专家系统</p>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-slate-400 uppercase font-mono mb-1">用户名</label>
            <input v-model="loginForm.username" type="text" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500">
          </div>
          <div>
            <label class="block text-xs text-slate-400 uppercase font-mono mb-1">密码</label>
            <input v-model="loginForm.password" @keyup.enter="handleLogin" type="password" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500">
          </div>
          <button @click="handleLogin" :disabled="loginLoading" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2">
            <span v-if="loginLoading" class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
            登录系统
          </button>
          <div class="text-center text-xs text-slate-500 mt-4">
            还没有账号？请联系系统管理员
          </div>
        </div>
      </div>
    </div>

    <!-- Password Change Dialog -->
    <div v-if="passwordDialogVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div class="glass w-full max-w-md p-8 rounded-2xl space-y-6">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-cyan-400 glow-text font-mono">修改密码</h2>
          <p class="text-slate-400 text-sm mt-2">请妥善保管您的新密码</p>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-slate-400 uppercase font-mono mb-1">旧密码</label>
            <input v-model="passwordForm.old_password" type="password" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500">
          </div>
          <div>
            <label class="block text-xs text-slate-400 uppercase font-mono mb-1">新密码</label>
            <input v-model="passwordForm.new_password" type="password" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500">
          </div>
          <div>
            <label class="block text-xs text-slate-400 uppercase font-mono mb-1">确认新密码</label>
            <input v-model="passwordForm.confirm_password" type="password" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500">
          </div>
          <div class="flex gap-3">
            <button @click="passwordDialogVisible = false" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition">
              取消
            </button>
            <button @click="handleUpdatePassword" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-cyan-500/20 transition">
              确定修改
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ linkify: true, breaks: true })
const renderMarkdown = (content) => md.render(content || '')

const token = ref(localStorage.getItem('token'))
const username = ref(localStorage.getItem('username'))
const chatInput = ref('')
const chatHistory = ref([
  { 
    role: 'assistant', 
    content: '您好，我是城维云市政道桥运维智能专家，已接入城市基础设施运维大模型。请问有什么可以帮您？',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
])
const chatLoading = ref(false)
const chatScroll = ref(null)
const mobileMenuVisible = ref(false)
const chatKbType = ref('')
const kbTypeOptions = ref([])
const historyLogs = ref([])

const loginForm = ref({ username: '', password: '' })
const loginLoading = ref(false)

const passwordDialogVisible = ref(false)
const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const scrollToBottom = async () => {
  await nextTick()
  if (chatScroll.value) {
    chatScroll.value.scrollTop = chatScroll.value.scrollHeight
  }
}

const loadHistory = async () => {
  if (!token.value) return
  try {
    const res = await axios.get('http://127.0.0.1:8000/chat-logs', {
      params: { 
        page: 1, 
        page_size: 15, 
        username: username.value 
      },
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
    historyLogs.value = res.data.items.map(log => ({
      title: log.query_content,
      time: new Date(log.query_time).toLocaleString('zh-CN', { 
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      }),
      content: log.query_content,
      response: log.llm_response
    }))
  } catch (err) {
    console.error('加载历史记录失败', err)
  }
}

const loadKbTypes = async () => {
  try {
    const res = await axios.get('http://127.0.0.1:8000/dicts/kb_type')
    kbTypeOptions.value = res.data
  } catch (err) {
    console.error('加载字典失败', err)
  }
}

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) return
  loginLoading.value = true
  try {
    const res = await axios.post('http://127.0.0.1:8000/token', loginForm.value)
    token.value = res.data.access_token
    username.value = res.data.username
    localStorage.setItem('token', token.value)
    localStorage.setItem('username', username.value)
    localStorage.setItem('role', res.data.role)
    loginLoading.value = false
    loadKbTypes()
    loadHistory()
  } catch (err) {
    alert('登录失败: ' + (err.response?.data?.detail || '未知错误'))
    loginLoading.value = false
  }
}

const handleLogout = () => {
  token.value = null
  username.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  historyLogs.value = []
}

const handleUpdatePassword = async () => {
  if (!passwordForm.value.old_password || !passwordForm.value.new_password) {
    alert('请填写完整')
    return
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    alert('两次输入的新密码不一致')
    return
  }
  try {
    await axios.put('http://127.0.0.1:8000/users/me/password', {
      old_password: passwordForm.value.old_password,
      new_password: passwordForm.value.new_password
    }, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    alert('密码修改成功，请重新登录')
    passwordDialogVisible.value = false
    handleLogout()
  } catch (err) {
    alert(err.response?.data?.detail || '修改失败')
  }
}

const handleChat = async () => {
  if (!chatInput.value || chatLoading.value || !token.value) return

  const userMsg = chatInput.value
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  chatInput.value = ''
  chatHistory.value.push({ role: 'user', content: userMsg, time: currentTime })
  await scrollToBottom()

  chatLoading.value = true

  try {
    const response = await fetch('http://127.0.0.1:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({
        message: userMsg,
        stream: true,
        kb_type: chatKbType.value || null
      })
    })

    if (!response.ok) {
      if (response.status === 401) {
        handleLogout()
        throw new Error('认证超时')
      }
      throw new Error(`请求失败: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    const assistantMsg = { 
      role: 'assistant', 
      content: '思考中...', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
    chatHistory.value.push(assistantMsg)
    const msgIndex = chatHistory.value.length - 1
    chatLoading.value = false

    let totalContent = ''
    let isFirstChunk = true
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      if (isFirstChunk) {
        totalContent = chunk
        isFirstChunk = false
      } else {
        totalContent += chunk
      }
      chatHistory.value[msgIndex].content = totalContent
      await scrollToBottom()
    }

    // Duplicate reference removal logic
    const referenceSectionPattern = /(\n\n---\s*\n\*\*[📎📄📁]*\s*引用文件[：:]\*\*\s*\n[^]*?)(?=\n\n---|$)/g
    const sections = totalContent.match(referenceSectionPattern)
    if (sections && sections.length > 1) {
      const lastSection = sections[sections.length - 1]
      let cleanedContent = totalContent.replace(referenceSectionPattern, '') + lastSection
      chatHistory.value[msgIndex].content = cleanedContent
    }

    // 刷新左侧历史记录
    loadHistory()
  } catch (err) {
    console.error(err)
    chatLoading.value = false
    chatHistory.value.push({ 
      role: 'assistant', 
      content: '抱歉，系统响应出现问题：' + err.message,
      time: currentTime
    })
    await scrollToBottom()
  }
}

const selectHistory = (chat) => {
  // 点击历史记录时，将对话显示在主窗口（可选功能）
  chatHistory.value = [
    { role: 'user', content: chat.content, time: '' },
    { role: 'assistant', content: chat.response, time: chat.time }
  ]
  scrollToBottom()
}

const selectHistoryFromMobile = (chat) => {
  selectHistory(chat)
  mobileMenuVisible.value = false
}

onMounted(() => {
  if (token.value) {
    loadKbTypes()
    loadHistory()
  }
})
</script>

<style>
/* Reset specific for this page if needed */
.markdown-body {
  word-wrap: break-word;
  line-height: 1.6;
}
.markdown-body p {
  margin-bottom: 1rem;
}
.markdown-body p:last-child {
  margin-bottom: 0;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
  font-weight: 600;
  line-height: 1.25;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: #fff;
}
.markdown-body h1 { font-size: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3rem; }
.markdown-body h2 { font-size: 1.3rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3rem; }
.markdown-body h3 { font-size: 1.1rem; }

.markdown-body ul, .markdown-body ol {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
  list-style-position: outside;
}
.markdown-body ul { list-style-type: disc; }
.markdown-body ol { list-style-type: decimal; }

.markdown-body li {
  margin-bottom: 0.25rem;
}

.markdown-body pre {
  background: rgba(15, 23, 42, 0.8);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1rem 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.markdown-body code {
  font-family: 'JetBrains Mono', monospace;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.9em;
  color: #e2e8f0;
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
  color: inherit;
}
.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.9em;
}
.markdown-body th, .markdown-body td {
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.6rem;
  text-align: left;
}
.markdown-body th {
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}
.markdown-body blockquote {
  border-left: 4px solid #0891b2;
  padding-left: 1rem;
  color: #94a3b8;
  margin: 1rem 0;
}
</style>
