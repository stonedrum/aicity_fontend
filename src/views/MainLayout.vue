<template>
  <el-container class="layout-container">
    <el-header>
      <div class="header-content">
        <h2>城维云智能市政运维专家</h2>
        <div v-if="token">
          <span>欢迎, {{ username }}</span>
          <el-button type="text" @click="passwordDialogVisible = true">修改密码</el-button>
          <el-button type="text" @click="logout">退出</el-button>
        </div>
      </div>
    </el-header>

    <el-main>
      <div v-if="!token" class="auth-box">
        <el-card>
          <template #header>登录</template>
          <el-form :model="loginForm" label-width="80px">
            <el-form-item label="用户名">
              <el-input v-model="loginForm.username"></el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password"></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleLogin">登录</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <div v-else>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="智能问答" name="chat">
            <SmartChat :kbTypeOptions="kbTypeOptions" :token="token" :logout="logout" />
          </el-tab-pane>

          <el-tab-pane label="模型对比" name="comparison">
            <ModelComparison :kbTypeOptions="kbTypeOptions" :token="token" :logout="logout" />
          </el-tab-pane>

          <el-tab-pane label="文档管理" name="documents">
            <DocumentManagement 
              :kbTypeOptions="kbTypeOptions" 
              :token="token" 
              @view-clauses="handleViewClauses" 
            />
          </el-tab-pane>

          <el-tab-pane label="知识库管理" name="search">
            <KnowledgeManagement 
              :kbTypeOptions="kbTypeOptions" 
              :token="token" 
              :initialDocId="selectedDocId"
            />
          </el-tab-pane>

          <el-tab-pane label="文档上传" name="upload">
            <DocumentUpload :kbTypeOptions="kbTypeOptions" :authHeaders="authHeaders" />
          </el-tab-pane>

          <el-tab-pane label="查询日志" name="logs">
            <ChatLogs v-if="activeTab === 'logs'" :token="token" />
          </el-tab-pane>

          <el-tab-pane label="对比日志" name="comp_logs">
            <ComparisonLogs v-if="activeTab === 'comp_logs'" :token="token" />
          </el-tab-pane>

          <el-tab-pane label="提示词配置" name="prompts" v-if="userRole === 'sysadmin'">
            <PromptConfig v-if="activeTab === 'prompts'" :authHeaders="authHeaders" />
          </el-tab-pane>

          <el-tab-pane label="字典管理" name="dicts" v-if="userRole === 'sysadmin'">
            <DictManagement v-if="activeTab === 'dicts'" :authHeaders="authHeaders" :onDictChange="loadKbTypes" />
          </el-tab-pane>

          <el-tab-pane label="用户管理" name="users" v-if="userRole === 'sysadmin'">
            <UserManagement v-if="activeTab === 'users'" :token="token" />
          </el-tab-pane>

          <el-tab-pane label="系统配置" name="sys_configs" v-if="userRole === 'sysadmin'">
            <SystemConfig v-if="activeTab === 'sys_configs'" :token="token" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-main>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px">
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="旧密码">
          <el-input v-model="passwordForm.old_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.new_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirm_password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdatePassword">确定</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL } from '../api/config'

// Import sub-components
import DocumentUpload from '../components/DocumentUpload.vue'
import DocumentManagement from '../components/DocumentManagement.vue'
import KnowledgeManagement from '../components/KnowledgeManagement.vue'
import SmartChat from '../components/SmartChat.vue'
import ModelComparison from '../components/ModelComparison.vue'
import ComparisonLogs from '../components/ComparisonLogs.vue'
import ChatLogs from '../components/ChatLogs.vue'
import PromptConfig from '../components/PromptConfig.vue'
import DictManagement from '../components/DictManagement.vue'
import UserManagement from '../components/UserManagement.vue'
import SystemConfig from '../components/SystemConfig.vue'

const token = ref(localStorage.getItem('token'))
const username = ref(localStorage.getItem('username'))
const userRole = ref(localStorage.getItem('role'))
const activeTab = ref('chat')
const selectedDocId = ref(null)
const loginForm = ref({ username: '', password: '' })
const kbTypeOptions = ref([])

const passwordDialogVisible = ref(false)
const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const authHeaders = computed(() => ({
  Authorization: `Bearer ${token.value}`
}))

const handleViewClauses = ({ docId }) => {
  selectedDocId.value = docId
  activeTab.value = 'search'
}

const loadKbTypes = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/dicts/kb_type`)
    kbTypeOptions.value = res.data
  } catch (err) {
    console.error('加载知识库类型字典失败:', err)
  }
}

loadKbTypes()

const handleLogin = async () => {
  try {
    const res = await axios.post(`${API_BASE_URL}/token`, loginForm.value)
    token.value = res.data.access_token
    username.value = res.data.username
    userRole.value = res.data.role
    localStorage.setItem('token', token.value)
    localStorage.setItem('username', username.value)
    localStorage.setItem('role', userRole.value)
    ElMessage.success('登录成功')
    
    // 如果是普通用户，强制跳转到 chat
    if (userRole.value === 'user') {
      window.location.href = '/chat'
    } else {
      loadKbTypes()
    }
  } catch (err) {
    ElMessage.error('登录失败: ' + (err.response?.data?.detail || '未知错误'))
  }
}

const logout = () => {
  token.value = null
  username.value = null
  userRole.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  activeTab.value = 'chat'
}

const handleUpdatePassword = async () => {
  if (!passwordForm.value.old_password || !passwordForm.value.new_password) {
    ElMessage.warning('请填写完整')
    return
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    ElMessage.error('两次输入的新密码不一致')
    return
  }
  try {
    await axios.put(`${API_BASE_URL}/users/me/password`, {
      old_password: passwordForm.value.old_password,
      new_password: passwordForm.value.new_password
    }, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    ElMessage.success('密码修改成功，请重新登录')
    passwordDialogVisible.value = false
    logout()
  } catch (err) {
    ElMessage.error(err.response?.data?.detail || '修改失败')
  }
}

onMounted(() => {
  if (token.value) {
    loadKbTypes()
  }
})
</script>

<style scoped>
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

.el-main {
  padding: 0 20px 20px 20px;
  flex: 1;
}

.el-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
}
</style>
