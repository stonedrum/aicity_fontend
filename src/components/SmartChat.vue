<template>
  <div class="chat-container">
    <div class="chat-header">
      <el-form :inline="true" size="small">
        <el-form-item label="指定知识库 (可选)">
          <el-select v-model="chatKbType" placeholder="全部类型" clearable style="width: 150px;">
            <el-option
              v-for="item in kbTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    <div class="chat-messages" ref="chatScroll" @click="handleMessageClick">
      <div v-for="(msg, index) in chatHistory" :key="index" :class="['message-item', msg.role]">
        <div class="avatar" v-if="msg.role === 'assistant'">
          <svg viewBox="0 0 100 100" width="40" height="40">
            <circle cx="50" cy="50" r="48" fill="#f0f2f5" stroke="#dcdfe6" />
            <path d="M20 50 Q50 10 80 50" fill="#ffd700" stroke="#b8860b" stroke-width="2" />
            <rect x="25" y="45" width="50" height="10" rx="2" fill="#ffd700" />
            <circle cx="50" cy="65" r="20" fill="#ffdbac" />
            <path d="M38 65 L44 65 M56 65 L62 65" stroke="#333" stroke-width="2" />
            <circle cx="41" cy="65" r="4" fill="none" stroke="#333" stroke-width="1" />
            <circle cx="59" cy="65" r="4" fill="none" stroke="#333" stroke-width="1" />
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

    <!-- PDF 预览对话框 -->
    <el-dialog
      v-model="pdfDialogVisible"
      :fullscreen="isMaximized"
      :width="isMaximized ? '100%' : '80%'"
      destroy-on-close
      class="pdf-preview-dialog"
      :show-close="false"
      align-center
    >
      <template #header="{ close, titleId, titleClass }">
        <div class="custom-dialog-header">
          <span :id="titleId" :class="titleClass">{{ pdfTitle }}</span>
          <div class="header-actions">
            <el-button link @click="toggleMaximize">
              <el-icon><FullScreen v-if="!isMaximized" /><Rank v-else /></el-icon>
            </el-button>
            <el-button link @click="pdfDialogVisible = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      <div class="pdf-container">
        <iframe
          v-if="pdfDialogVisible"
          :src="currentPdfUrl"
          width="100%"
          height="100%"
          frameborder="0"
        ></iframe>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { Loading, FullScreen, Rank, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import { API_BASE_URL } from '../api/config'

// 自定义更宽松的公式匹配规则，允许公式内容前后有空格
if (texmath && texmath.rules) {
  texmath.rules.permissive = {
    inline: [
      {   name: 'math_inline_double',
          rex: /\${2}([^$]*?[^\\])\${2}/gy,
          tmpl: '<section><eqn>$1</eqn></section>',
          tag: '$$',
          displayMode: true,
          pre: texmath.$_pre,
          post: texmath.$_post
      },
      {   name: 'math_inline',
          rex: /\$((?:[^\$]|\\\$)+)\$/gy,
          tmpl: '<eq>$1</eq>',
          tag: '$',
          outerSpace: false,
          pre: texmath.$_pre,
          post: texmath.$_post
      }
    ],
    block: [
      {   name: 'math_block_eqno',
          rex: /\${2}([^$]*?[^\\])\${2}\s*?\(([^)\s]+?)\)/gmy,
          tmpl: '<section class="eqno"><eqn>$1</eqn><span>($2)</span></section>',
          tag: '$$'
      },
      {   name: 'math_block',
          rex: /\${2}([^$]*?[^\\])\${2}/gmy,
          tmpl: '<section><eqn>$1</eqn></section>',
          tag: '$$'
      }
    ]
  }
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
  typographer: true
}).use(texmath, {
  engine: katex,
  delimiters: ['permissive', 'brackets'],
  katexOptions: { macros: { "\\RR": "\\mathbb{R}" }, throwOnError: false }
})

// PDF 预览相关
const pdfDialogVisible = ref(false)
const currentPdfUrl = ref('')
const isMaximized = ref(false)
const pdfTitle = ref('文件预览')

const handleMessageClick = (event) => {
  const link = event.target.closest('a')
  if (link) {
    const url = link.href
    if (url.toLowerCase().includes('.pdf')) {
      event.preventDefault()
      openPdfPreview(url, link.innerText)
    }
  }
}

const openPdfPreview = (url, title) => {
  // 强制刷新 iframe，处理 hash 变化可能不触发跳转的问题
  if (pdfDialogVisible.value && currentPdfUrl.value === url) {
    currentPdfUrl.value = ''
    nextTick(() => {
      currentPdfUrl.value = url
    })
  } else {
    currentPdfUrl.value = url
  }
  pdfTitle.value = title || '文件预览'
  pdfDialogVisible.value = true
}

const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value
}

watch(() => pdfDialogVisible.value, (val) => {
  if (!val) {
    isMaximized.value = false
  }
})

const renderMarkdown = (content) => md.render(content)

const props = defineProps({
  kbTypeOptions: {
    type: Array,
    default: () => []
  },
  token: String,
  logout: Function
})

const chatKbType = ref('')
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
  
  try {
    const withoutLast = chatHistory.value.slice(0, -1);
    const lastFour = withoutLast.slice(-4);
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.token}`
      },
      body: JSON.stringify({
        message: userMsg,
        // history: lastFour,
        stream: true,
        kb_type: chatKbType.value || null
      })
    })

    if (!response.ok) {
      if (response.status === 401) {
        ElMessage.error('认证超时，请重新登录')
        props.logout()
        throw new Error('认证超时')
      }
      const errorText = await response.text()
      throw new Error(`请求失败 (${response.status}): ${errorText || '未知错误'}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    const assistantMsg = { role: 'assistant', content: '思考中...' }
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
      await nextTick()
      await scrollToBottom()
    }
    
    // Simple duplicate reference removal logic (same as in App.vue)
    const referenceSectionPattern = /(\n\n---\s*\n\*\*[📎📄📁]*\s*引用文件[：:]\*\*\s*\n[^]*?)(?=\n\n---|$)/g
    const sections = totalContent.match(referenceSectionPattern)
    if (sections && sections.length > 1) {
      const lastSection = sections[sections.length - 1]
      let parts = totalContent.split(referenceSectionPattern)
      // Keep only non-reference parts and the last reference section
      // This is a bit simplified, but follows the logic in App.vue
      let cleanedContent = totalContent.replace(referenceSectionPattern, '') + lastSection
      chatHistory.value[msgIndex].content = cleanedContent
    }

  } catch (err) {
    ElMessage.error('问答出错: ' + (err.message || '未知错误'))
    chatLoading.value = false
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  min-height: 500px;
  background: #f9fafc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  overflow: hidden;
}
.chat-header {
  padding: 10px 20px;
  border-bottom: 1px solid #ebeef5;
  background: white;
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
.chat-messages::-webkit-scrollbar {
  width: 6px;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

/* PDF 预览对话框样式 */
.custom-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 20px;
}
.header-actions {
  display: flex;
  gap: 10px;
}
.pdf-container {
  height: 80vh;
  width: 100%;
  background-color: #f0f2f5;
}
.pdf-preview-dialog.is-fullscreen .pdf-container {
  height: calc(100vh - 60px);
}
:deep(.pdf-preview-dialog .el-dialog__body) {
  padding: 0;
  height: 100%;
}
:deep(.pdf-preview-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 10px 20px;
  border-bottom: 1px solid #eee;
}
</style>
