<template>
  <el-container class="layout-container">
    <el-header>
      <div class="header-content">
        <h2>标准条款知识库 (RAG)</h2>
        <div v-if="token">
          <span>欢迎, {{ username }}</span>
          <el-button type="text" @click="logout">退出</el-button>
        </div>
      </div>
    </el-header>

    <el-main>
      <div v-if="!token" class="auth-box">
        <el-card>
          <template #header>登录 / 注册</template>
          <el-form :model="loginForm" label-width="80px">
            <el-form-item label="用户名">
              <el-input v-model="loginForm.username"></el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password"></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleLogin">登录</el-button>
              <el-button @click="handleRegister">注册</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <div v-else>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="文档上传" name="upload">
            <el-upload
              class="upload-demo"
              drag
              action="http://localhost:8000/upload"
              :headers="authHeaders"
              :on-success="onUploadSuccess"
              accept=".pdf"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">仅支持 PDF 文件</div>
              </template>
            </el-upload>
          </el-tab-pane>

          <el-tab-pane label="知识库检索" name="search">
            <!-- ... existing search code ... -->
          </el-tab-pane>

          <el-tab-pane label="智能问答" name="chat">
            <div class="chat-container">
              <div class="chat-messages" ref="chatScroll">
                <div v-for="(msg, index) in chatHistory" :key="index" :class="['message-item', msg.role]">
                  <div class="avatar" v-if="msg.role === 'assistant'">
                    <!-- Stylized Engineering Expert Avatar -->
                    <svg viewBox="0 0 100 100" width="40" height="40">
                      <circle cx="50" cy="50" r="48" fill="#f0f2f5" stroke="#dcdfe6" />
                      <!-- Helmet (Yellow) -->
                      <path d="M20 50 Q50 10 80 50" fill="#ffd700" stroke="#b8860b" stroke-width="2" />
                      <rect x="25" y="45" width="50" height="10" rx="2" fill="#ffd700" />
                      <!-- Face -->
                      <circle cx="50" cy="65" r="20" fill="#ffdbac" />
                      <!-- Glasses -->
                      <path d="M38 65 L44 65 M56 65 L62 65" stroke="#333" stroke-width="2" />
                      <circle cx="41" cy="65" r="4" fill="none" stroke="#333" stroke-width="1" />
                      <circle cx="59" cy="65" r="4" fill="none" stroke="#333" stroke-width="1" />
                      <!-- Reflective Vest (Orange) -->
                      <path d="M30 85 L70 85 L75 100 L25 100 Z" fill="#ff4500" />
                      <rect x="35" y="85" width="5" height="15" fill="#fff" opacity="0.6" />
                      <rect x="60" y="85" width="5" height="15" fill="#fff" opacity="0.6" />
                    </svg>
                  </div>
                  <div class="content-bubble" :class="msg.role">
                    <div class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
                  </div>
                </div>
                <div v-if="chatLoading" class="message-item assistant">
                  <div class="avatar">
                    <el-icon class="is-loading"><loading /></el-icon>
                  </div>
                  <div class="content-bubble assistant">思考中...</div>
                </div>
              </div>
              
              <div class="chat-input">
                <el-input
                  v-model="chatInput"
                  type="textarea"
                  :rows="3"
                  placeholder="我是您的工程专家，请问有什么可以帮您？"
                  @keyup.enter.ctrl="handleChat"
                />
                <div class="input-actions">
                  <span class="tip">Ctrl + Enter 发送</span>
                  <el-button type="primary" :loading="chatLoading" @click="handleChat">发送</el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import MarkdownIt from 'markdown-it'
import { UploadFilled, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const md = new MarkdownIt()
const token = ref(localStorage.getItem('token'))
const username = ref(localStorage.getItem('username'))
const activeTab = ref('chat') // Default to chat as requested
const loginForm = ref({ username: '', password: '' })
const searchQuery = ref('')
const results = ref([])
const loading = ref(false)

// Chat related
const chatInput = ref('')
const chatHistory = ref([])
const chatLoading = ref(false)
const chatScroll = ref(null)

const scrollToBottom = async () => {
  await nextTick()
  if (chatScroll.value) {
    chatScroll.value.scrollTop = chatScroll.value.scrollHeight
  }
}

const handleChat = async () => {
  if (!chatInput.value || chatLoading.value) return
  
  const userMsg = chatInput.value
  chatInput.value = ''
  chatHistory.value.push({ role: 'user', content: userMsg })
  await scrollToBottom()
  
  chatLoading.value = true
  
  // Use fetch for streaming
  try {
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({
        message: userMsg,
        history: chatHistory.value.slice(0, -1), // Send previous history
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('请求失败:', response.status, errorText)
      throw new Error(`请求失败 (${response.status}): ${errorText || '未知错误'}`)
    }

    console.log('开始接收流式响应...')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    // 创建响应式的消息对象
    const assistantMsg = { role: 'assistant', content: '' }
    const msgIndex = chatHistory.value.length
    chatHistory.value.push(assistantMsg)
    chatLoading.value = false // Assistant bubble is now present
    console.log('已创建助手消息，索引:', msgIndex, '当前历史长度:', chatHistory.value.length)

    try {
      let chunkCount = 0
      let totalContent = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log(`流式响应完成，共接收 ${chunkCount} 个数据块，总长度: ${totalContent.length} 字符`)
          console.log('最终内容预览:', totalContent.substring(0, 100))
          break
        }
        chunkCount++
        const chunk = decoder.decode(value, { stream: true })
        if (chunkCount <= 5) {  // 只打印前5个chunk的调试信息
          console.log(`接收到数据块 ${chunkCount} (${chunk.length} 字符):`, chunk.substring(0, 50))
        }
        totalContent += chunk
        // 直接更新对象属性，Vue 3 会自动检测变化
        chatHistory.value[msgIndex].content = totalContent
        console.log(`更新消息内容，当前长度: ${totalContent.length}, 历史记录长度: ${chatHistory.value.length}`)
        // 使用 nextTick 确保 DOM 更新后再滚动
        await nextTick()
        await scrollToBottom()
      }
      if (chatHistory.value[msgIndex].content.trim() === '') {
        console.warn('警告: 没有接收到任何内容')
        chatHistory.value[msgIndex].content = '⚠️ 未收到响应内容，请检查后端服务或网络连接。'
      } else {
        console.log('最终内容长度:', chatHistory.value[msgIndex].content.length)
        console.log('最终内容:', chatHistory.value[msgIndex].content.substring(0, 200))
      }
    } catch (readErr) {
      console.error('读取响应时出错:', readErr)
      ElMessage.error('读取响应时出错: ' + readErr.message)
      if (chatHistory.value[msgIndex] && chatHistory.value[msgIndex].content.trim() === '') {
        chatHistory.value.pop() // 移除空的消息
      } else if (chatHistory.value[msgIndex]) {
        chatHistory.value[msgIndex].content += '\n\n❌ 读取响应时出错: ' + readErr.message
      }
    }
  } catch (err) {
    ElMessage.error('问答出错: ' + (err.message || '未知错误'))
    chatLoading.value = false
    // 如果还没有创建助手消息，创建一个显示错误的消息
    if (chatHistory.value.length > 0 && chatHistory.value[chatHistory.value.length - 1].role === 'user') {
      chatHistory.value.push({ 
        role: 'assistant', 
        content: `❌ 错误: ${err.message || '无法连接到服务器，请检查后端服务是否正常运行'}` 
      })
    }
  } finally {
    chatLoading.value = false
  }
}

const authHeaders = computed(() => ({
  Authorization: `Bearer ${token.value}`
}))

const renderMarkdown = (content) => md.render(content)

const handleLogin = async () => {
  try {
    const res = await axios.post('http://localhost:8000/token', loginForm.value)
    token.value = res.data.access_token
    username.value = loginForm.value.username
    localStorage.setItem('token', token.value)
    localStorage.setItem('username', username.value)
    ElMessage.success('登录成功')
  } catch (err) {
    ElMessage.error('登录失败: ' + (err.response?.data?.detail || '未知错误'))
  }
}

const handleRegister = async () => {
  try {
    const res = await axios.post('http://localhost:8000/register', loginForm.value)
    token.value = res.data.access_token
    username.value = loginForm.value.username
    localStorage.setItem('token', token.value)
    localStorage.setItem('username', username.value)
    ElMessage.success('注册成功')
  } catch (err) {
    ElMessage.error('注册失败: ' + (err.response?.data?.detail || '未知错误'))
  }
}

const logout = () => {
  token.value = null
  username.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('username')
}

const onUploadSuccess = () => {
  ElMessage.success('文件上传并解析成功')
}

const handleSearch = async () => {
  if (!searchQuery.value) return
  loading.value = true
  try {
    const res = await axios.post('http://localhost:8000/search', { query: searchQuery.value })
    results.value = res.data
  } catch (err) {
    ElMessage.error('搜索出错')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.layout-container {
  max-width: 1000px;
  margin: 0 auto;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}
.auth-box {
  max-width: 400px;
  margin: 100px auto;
}
.search-bar {
  margin: 20px 0;
}
.result-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chapter {
  font-weight: bold;
}
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
}
.markdown-body :deep(th), .markdown-body :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
}

/* Chat Styles */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  background: #f9fafc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message-item {
  display: flex;
  gap: 12px;
  max-width: 85%;
}

.message-item.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-item.assistant {
  align-self: flex-start;
}

.avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.content-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.content-bubble.user {
  background-color: #409eff;
  color: white;
  border-bottom-right-radius: 2px;
}

.content-bubble.assistant {
  background-color: white;
  color: #303133;
  border: 1px solid #ebeef5;
  border-bottom-left-radius: 2px;
}

.chat-input {
  padding: 20px;
  background: white;
  border-top: 1px solid #ebeef5;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.tip {
  font-size: 12px;
  color: #909399;
}

/* Scrollbar Style */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}
</style>
