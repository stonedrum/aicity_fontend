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

          <el-tab-pane label="查询日志" name="logs">
            <div class="logs-container">
              <div class="logs-header">
                <h3>Chat 查询日志</h3>
                <el-input
                  v-model="logFilterUsername"
                  placeholder="按用户名筛选（可选）"
                  style="width: 200px; margin-right: 10px;"
                  clearable
                  @clear="loadChatLogs"
                  @keyup.enter="loadChatLogs"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button type="primary" @click="loadChatLogs">查询</el-button>
              </div>

              <el-table :data="chatLogs" style="width: 100%" v-loading="logsLoading" stripe>
                <el-table-column prop="query_time" label="查询时间" width="180">
                  <template #default="{ row }">
                    {{ formatDateTime(row.query_time) }}
                  </template>
                </el-table-column>
                <el-table-column prop="username" label="用户名" width="120" />
                <el-table-column prop="query_content" label="查询内容" min-width="200" show-overflow-tooltip />
                <el-table-column prop="model_name" label="模型" width="120" />
                <el-table-column prop="query_duration_seconds" label="耗时(秒)" width="100">
                  <template #default="{ row }">
                    {{ row.query_duration_seconds ? row.query_duration_seconds.toFixed(2) : '-' }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" size="small" @click="viewLogDetail(row)">查看详情</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="logPage"
                  v-model:page-size="logPageSize"
                  :page-sizes="[10, 15, 20, 50]"
                  :total="logTotal"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleLogPageSizeChange"
                  @current-change="handleLogPageChange"
                />
              </div>
            </div>

            <!-- 日志详情对话框 -->
            <el-dialog v-model="logDetailVisible" title="查询日志详情" width="80%" :close-on-click-modal="false">
              <div v-if="selectedLog" class="log-detail">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="查询时间">{{ formatDateTime(selectedLog.query_time) }}</el-descriptions-item>
                  <el-descriptions-item label="用户名">{{ selectedLog.username }}</el-descriptions-item>
                  <el-descriptions-item label="模型名称">{{ selectedLog.model_name || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="查询耗时">{{ selectedLog.query_duration_seconds ? selectedLog.query_duration_seconds.toFixed(2) + ' 秒' : '-' }}</el-descriptions-item>
                  <el-descriptions-item label="查询内容" :span="2">
                    <div class="log-content">{{ selectedLog.query_content }}</div>
                  </el-descriptions-item>
                </el-descriptions>

                <el-divider>初始 RAG 结果（Top 10）</el-divider>
                <div v-if="selectedLog.initial_rag_results && selectedLog.initial_rag_results.length > 0" class="rag-results">
                  <el-table :data="selectedLog.initial_rag_results" size="small" max-height="300">
                    <el-table-column prop="doc_name" label="文档名称" width="200" show-overflow-tooltip />
                    <el-table-column prop="chapter_path" label="章节路径" width="200" show-overflow-tooltip />
                    <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
                    <el-table-column prop="score" label="相似度" width="100">
                      <template #default="{ row }">
                        {{ row.score ? row.score.toFixed(3) : '-' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
                <div v-else class="no-data">无数据</div>

                <el-divider>重排结果（Top 3）</el-divider>
                <div v-if="selectedLog.reranked_results && selectedLog.reranked_results.length > 0" class="rag-results">
                  <el-table :data="selectedLog.reranked_results" size="small" max-height="300">
                    <el-table-column prop="doc_name" label="文档名称" width="200" show-overflow-tooltip />
                    <el-table-column prop="chapter_path" label="章节路径" width="200" show-overflow-tooltip />
                    <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
                    <el-table-column prop="rerank_score" label="重排分数" width="100">
                      <template #default="{ row }">
                        {{ row.rerank_score ? row.rerank_score.toFixed(3) : '-' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
                <div v-else class="no-data">无数据</div>

                <el-divider>LLM 响应</el-divider>
                <div class="llm-response">
                  <div class="markdown-body" v-html="renderMarkdown(selectedLog.llm_response || '无响应')"></div>
                </div>
              </div>
            </el-dialog>
          </el-tab-pane>

          <el-tab-pane label="提示词配置" name="prompts">
            <div class="prompts-container">
              <div class="prompts-header">
                <h3>提示词模板管理</h3>
                <el-button type="primary" @click="openAddPrompt">新增提示词</el-button>
              </div>

              <el-table :data="prompts" style="width: 100%" v-loading="promptsLoading" stripe>
                <el-table-column prop="name" label="名称" width="200" />
                <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
                <el-table-column prop="version" label="版本" width="80" align="center" />
                <el-table-column prop="is_active" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.is_active ? 'success' : 'info'">{{ row.is_active ? '已启用' : '禁用' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="updated_at" label="更新时间" width="180">
                  <template #default="{ row }">
                    {{ formatDateTime(row.updated_at) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="180" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" size="small" @click="openEditPrompt(row)">编辑</el-button>
                    <el-button 
                      type="danger" 
                      size="small" 
                      @click="handleDeletePrompt(row)"
                      :disabled="row.name === 'rag_system_prompt'"
                    >删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 提示词编辑/新增对话框 -->
            <el-dialog 
              v-model="promptDialogVisible" 
              :title="isEditingPrompt ? '编辑提示词' : '新增提示词'" 
              width="60%"
              :close-on-click-modal="false"
            >
              <el-form :model="promptForm" label-width="100px">
                <el-form-item label="提示词名称">
                  <el-input v-model="promptForm.name" placeholder="例如: chat_summary" :disabled="isEditingPrompt && promptForm.name === 'rag_system_prompt'"></el-input>
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="promptForm.description" placeholder="对该提示词的用途进行说明"></el-input>
                </el-form-item>
                <el-form-item label="模板内容">
                  <el-input 
                    v-model="promptForm.template" 
                    type="textarea" 
                    :rows="12" 
                    placeholder="请输入提示词模板，支持 {context}, {query} 等占位符"
                  ></el-input>
                  <div class="form-tip">提示：使用 {占位符} 进行动态填充</div>
                </el-form-item>
                <el-form-item label="是否启用">
                  <el-switch v-model="promptForm.is_active"></el-switch>
                </el-form-item>
              </el-form>
              <template #footer>
                <span class="dialog-footer">
                  <el-button @click="promptDialogVisible = false">取消</el-button>
                  <el-button type="primary" @click="savePrompt" :loading="saveLoading">保存</el-button>
                </span>
              </template>
            </el-dialog>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import axios from 'axios'
import MarkdownIt from 'markdown-it'
import { UploadFilled, Loading, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const md = new MarkdownIt({
  linkify: true, // 自动识别链接
  breaks: true  // 支持换行
})

// 配置 Axios 响应拦截器处理 Token 超时
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // 如果已经登录过且遇到 401，说明超时了
      if (token.value) {
        ElMessage.error('认证超时，请重新登录')
        logout()
      }
    }
    return Promise.reject(error)
  }
)

// 配置链接渲染器，使链接在新标签页中打开
const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const aIndex = tokens[idx].attrIndex('target')
  if (aIndex < 0) {
    tokens[idx].attrPush(['target', '_blank'])
  } else {
    tokens[idx].attrs[aIndex][1] = '_blank'
  }
  // 添加 rel="noopener noreferrer" 以提高安全性
  const relIndex = tokens[idx].attrIndex('rel')
  if (relIndex < 0) {
    tokens[idx].attrPush(['rel', 'noopener noreferrer'])
  } else {
    tokens[idx].attrs[relIndex][1] = 'noopener noreferrer'
  }
  return defaultRender(tokens, idx, options, env, self)
}
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

// Logs related
const chatLogs = ref([])
const logsLoading = ref(false)
const logPage = ref(1)
const logPageSize = ref(15)
const logTotal = ref(0)
const logFilterUsername = ref('')
const logDetailVisible = ref(false)
const selectedLog = ref(null)

// Prompts related
const prompts = ref([])
const promptsLoading = ref(false)
const promptDialogVisible = ref(false)
const isEditingPrompt = ref(false)
const saveLoading = ref(false)
const promptForm = ref({
  id: null,
  name: '',
  description: '',
  template: '',
  is_active: true
})

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
      if (response.status === 401) {
        ElMessage.error('认证超时，请重新登录')
        logout()
        throw new Error('认证超时')
      }
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
      
      // 移除重复的引用文件部分
      const removeDuplicateReferences = (content) => {
        // 检查是否有多个"引用文件"部分（简单匹配）
        const referenceMarkers = [
          '**📎 引用文件：**',
          '**引用文件：**',
          '引用文件：',
          '---\n**📎 引用文件：**'
        ]
        
        let foundCount = 0
        for (const marker of referenceMarkers) {
          const regex = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          const matches = content.match(regex)
          if (matches) {
            foundCount += matches.length
          }
        }
        
        // 如果发现多个引用文件标记，移除除最后一个之外的所有引用文件部分
        if (foundCount > 1) {
          console.log(`检测到 ${foundCount} 个引用文件部分，移除重复部分`)
          // 使用正则表达式匹配引用文件部分（从---开始到下一个---或文档结尾）
          const referenceSectionPattern = /(\n\n---\s*\n\*\*[📎📄📁]*\s*引用文件[：:]\*\*\s*\n[^]*?)(?=\n\n---|$)/g
          const sections = content.match(referenceSectionPattern)
          if (sections && sections.length > 1) {
            // 保留最后一个，移除前面的所有引用文件部分
            const lastSection = sections[sections.length - 1]
            let cleanedContent = content
            // 移除除最后一个之外的所有引用文件部分
            for (let i = 0; i < sections.length - 1; i++) {
              cleanedContent = cleanedContent.replace(sections[i], '')
            }
            return cleanedContent
          }
        }
        return content
      }
      
      // 处理完成后，移除重复的引用文件部分
      totalContent = removeDuplicateReferences(totalContent)
      chatHistory.value[msgIndex].content = totalContent
      
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
  activeTab.value = 'chat' // 重置标签
  chatHistory.value = []    // 清空对话
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

// Logs related methods
const loadChatLogs = async () => {
  logsLoading.value = true
  try {
    const params = {
      page: logPage.value,
      page_size: logPageSize.value
    }
    if (logFilterUsername.value) {
      params.username = logFilterUsername.value
    }
    const res = await axios.get('http://localhost:8000/chat-logs', {
      params,
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })
    chatLogs.value = res.data.items
    logTotal.value = res.data.total
  } catch (err) {
    ElMessage.error('加载日志失败: ' + (err.response?.data?.detail || err.message))
  } finally {
    logsLoading.value = false
  }
}

const handleLogPageChange = (page) => {
  logPage.value = page
  loadChatLogs()
}

const handleLogPageSizeChange = (size) => {
  logPageSize.value = size
  logPage.value = 1  // 重置到第一页
  loadChatLogs()
}

const viewLogDetail = (log) => {
  selectedLog.value = log
  logDetailVisible.value = true
}

// Prompts related methods
const loadPrompts = async () => {
  promptsLoading.value = true
  try {
    const res = await axios.get('http://localhost:8000/prompts', {
      headers: authHeaders.value
    })
    prompts.value = res.data
  } catch (err) {
    ElMessage.error('加载提示词失败: ' + (err.response?.data?.detail || err.message))
  } finally {
    promptsLoading.value = false
  }
}

const openAddPrompt = () => {
  isEditingPrompt.value = false
  promptForm.value = {
    id: null,
    name: '',
    description: '',
    template: '',
    is_active: true
  }
  promptDialogVisible.value = true
}

const openEditPrompt = (row) => {
  isEditingPrompt.value = true
  promptForm.value = { ...row }
  promptDialogVisible.value = true
}

const savePrompt = async () => {
  if (!promptForm.value.name || !promptForm.value.template) {
    ElMessage.warning('名称和模板不能为空')
    return
  }
  
  saveLoading.value = true
  try {
    if (isEditingPrompt.value) {
      await axios.put(`http://localhost:8000/prompts/${promptForm.value.id}`, promptForm.value, {
        headers: authHeaders.value
      })
      ElMessage.success('更新成功')
    } else {
      await axios.post('http://localhost:8000/prompts', promptForm.value, {
        headers: authHeaders.value
      })
      ElMessage.success('创建成功')
    }
    promptDialogVisible.value = false
    loadPrompts()
  } catch (err) {
    ElMessage.error('保存失败: ' + (err.response?.data?.detail || err.message))
  } finally {
    saveLoading.value = false
  }
}

const handleDeletePrompt = (row) => {
  if (row.name === 'rag_system_prompt') {
    ElMessage.warning('系统核心提示词不可删除')
    return
  }
  
  // 使用 Element Plus 的确认框
  // 注意：需要确保应用中已正确引入相关样式，这里我们假设已由框架处理
  if (confirm(`确定要删除提示词 "${row.name}" 吗？`)) {
    deletePrompt(row.id)
  }
}

const deletePrompt = async (id) => {
  try {
    await axios.delete(`http://localhost:8000/prompts/${id}`, {
      headers: authHeaders.value
    })
    ElMessage.success('删除成功')
    loadPrompts()
  } catch (err) {
    ElMessage.error('删除失败: ' + (err.response?.data?.detail || err.message))
  }
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  const date = new Date(dateTimeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 当切换到日志 tab 时自动加载
const watchActiveTab = () => {
  if (activeTab.value === 'logs' && chatLogs.value.length === 0) {
    loadChatLogs()
  }
  if (activeTab.value === 'prompts') {
    loadPrompts()
  }
}

// 监听 activeTab 变化
watch(activeTab, watchActiveTab)
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
.markdown-body :deep(a) {
  color: #409eff;
  text-decoration: none;
  border-bottom: 1px solid #409eff;
  transition: all 0.3s;
}
.markdown-body :deep(a:hover) {
  color: #66b1ff;
  border-bottom-color: #66b1ff;
}
.markdown-body :deep(a:visited) {
  color: #7c3aed;
  border-bottom-color: #7c3aed;
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

/* Logs Styles */
.logs-container {
  padding: 20px;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.logs-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.log-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.log-content {
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.rag-results {
  margin: 10px 0;
}

.no-data {
  padding: 20px;
  text-align: center;
  color: #999;
}

.llm-response {
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}

/* Prompts Styles */
.prompts-container {
  padding: 20px;
}

.prompts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.prompts-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>
