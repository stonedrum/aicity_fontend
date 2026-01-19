<template>
  <el-container class="layout-container">
    <el-header>
      <div class="header-content">
        <h2>市政专家知识库</h2>
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
          <el-tab-pane label="智能问答" name="chat">
            <SmartChat :kbTypeOptions="kbTypeOptions" :token="token" :logout="logout" />
          </el-tab-pane>

          <el-tab-pane label="知识库管理" name="search">
            <KnowledgeManagement :kbTypeOptions="kbTypeOptions" :token="token" />
          </el-tab-pane>

          <el-tab-pane label="文档上传" name="upload">
            <DocumentUpload :kbTypeOptions="kbTypeOptions" :authHeaders="authHeaders" />
          </el-tab-pane>

          <el-tab-pane label="查询日志" name="logs">
            <ChatLogs v-if="activeTab === 'logs'" :token="token" />
          </el-tab-pane>

          <el-tab-pane label="提示词配置" name="prompts">
            <PromptConfig v-if="activeTab === 'prompts'" :authHeaders="authHeaders" />
          </el-tab-pane>

          <el-tab-pane label="字典管理" name="dicts">
            <DictManagement v-if="activeTab === 'dicts'" :authHeaders="authHeaders" :onDictChange="loadKbTypes" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

// Import sub-components
import DocumentUpload from './components/DocumentUpload.vue'
import KnowledgeManagement from './components/KnowledgeManagement.vue'
import SmartChat from './components/SmartChat.vue'
import ChatLogs from './components/ChatLogs.vue'
import PromptConfig from './components/PromptConfig.vue'
import DictManagement from './components/DictManagement.vue'

// Axios interceptor for 401
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      if (token.value) {
        ElMessage.error('认证超时，请重新登录')
        logout()
      }
    }
    return Promise.reject(error)
  }
)

const token = ref(localStorage.getItem('token'))
const username = ref(localStorage.getItem('username'))
const activeTab = ref('chat')
const loginForm = ref({ username: '', password: '' })
const kbTypeOptions = ref([])

const authHeaders = computed(() => ({
  Authorization: `Bearer ${token.value}`
}))

const loadKbTypes = async () => {
  try {
    const res = await axios.get('http://localhost:8000/dicts/kb_type')
    kbTypeOptions.value = res.data
  } catch (err) {
    console.error('加载知识库类型字典失败:', err)
  }
}

const handleLogin = async () => {
  try {
    const res = await axios.post('http://localhost:8000/token', loginForm.value)
    token.value = res.data.access_token
    username.value = loginForm.value.username
    localStorage.setItem('token', token.value)
    localStorage.setItem('username', username.value)
    ElMessage.success('登录成功')
    loadKbTypes()
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
    loadKbTypes()
  } catch (err) {
    ElMessage.error('注册失败: ' + (err.response?.data?.detail || '未知错误'))
  }
}

const logout = () => {
  token.value = null
  username.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  activeTab.value = 'chat'
}

onMounted(() => {
  if (token.value) {
    loadKbTypes()
  }
})
</script>

<style>
/* Global full-screen width style */
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

.layout-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  border-bottom: 1px solid #eee;
}

.auth-box {
  max-width: 400px;
  margin: 100px auto;
}

/* Ensure el-main takes up remaining space and tabs fill width */
.el-main {
  padding: 0 20px 20px 20px;
  flex: 1;
}

.el-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.el-tabs__content {
  flex: 1;
  overflow-y: auto;
}

/* Markdown common styles */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
}
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}
.markdown-body :deep(th), .markdown-body :deep(td) {
  border: 1px solid #ddd;
  padding: 6px 13px;
}
.markdown-body :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 3px;
}
</style>
