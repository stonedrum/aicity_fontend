<template>
  <div class="comparison-container">
    <div class="comparison-header">
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
        <el-form-item>
          <el-button type="warning" @click="clearHistory">清空对话</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="comparison-main">
      <!-- Qwen Box -->
      <div class="model-box">
        <div class="box-header">模型 A</div>
        <div class="chat-messages" ref="qwenScroll">
          <div v-for="(msg, index) in qwenHistory" :key="index" :class="['message-item', msg.role]">
            <div class="content-bubble" :class="msg.role">
              <div class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
            </div>
          </div>
          <div v-if="qwenLoading" class="loading-status">
            <el-icon class="is-loading"><loading /></el-icon> 正在思考...
          </div>
          <!-- 投票按钮 Qwen 侧 -->
          <div v-if="canVote && !hasVoted" class="vote-actions">
            <el-button type="success" plain size="small" icon="Check" @click="submitVote(1)">A 更优</el-button>
          </div>
        </div>
      </div>

      <!-- DeepSeek Box -->
      <div class="model-box">
        <div class="box-header">模型 B</div>
        <div class="chat-messages" ref="deepseekScroll">
          <div v-for="(msg, index) in deepseekHistory" :key="index" :class="['message-item', msg.role]">
            <div class="content-bubble" :class="msg.role">
              <div class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
            </div>
          </div>
          <div v-if="deepseekLoading" class="loading-status">
            <el-icon class="is-loading"><loading /></el-icon> 正在思考...
          </div>
          <!-- 投票按钮 DeepSeek 侧 -->
          <div v-if="canVote && !hasVoted" class="vote-actions">
            <el-button type="success" plain size="small" icon="Check" @click="submitVote(2)">B 更优</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <el-input
        v-model="userInput"
        type="textarea"
        :rows="3"
        placeholder="输入问题，同时询问两个模型..."
        @keyup.enter.ctrl="handleCompare"
      />
      <div class="input-actions">
        <span class="tip">Ctrl + Enter 发送</span>
        <el-button type="primary" :loading="qwenLoading || deepseekLoading" @click="handleCompare">同时询问</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import { Loading, Check } from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  linkify: true,
  breaks: true
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
const userInput = ref('')
const qwenHistory = ref([])
const deepseekHistory = ref([])
const qwenLoading = ref(false)
const deepseekLoading = ref(false)
const qwenScroll = ref(null)
const deepseekScroll = ref(null)

// 投票相关
const lastQuestion = ref('')
const hasVoted = ref(false)
const canVote = computed(() => {
  return qwenHistory.value.length > 0 && 
         deepseekHistory.value.length > 0 && 
         !qwenLoading.value && 
         !deepseekLoading.value &&
         qwenHistory.value[qwenHistory.value.length - 1].role === 'assistant' &&
         deepseekHistory.value[deepseekHistory.value.length - 1].role === 'assistant'
})

const scrollToBottom = async (el) => {
  await nextTick()
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

const clearHistory = () => {
  qwenHistory.value = []
  deepseekHistory.value = []
  lastQuestion.value = ''
  hasVoted.value = false
}

const submitVote = async (winner) => {
  if (hasVoted.value) return
  
  try {
    const qwenResp = qwenHistory.value[qwenHistory.value.length - 1].content
    const dsResp = deepseekHistory.value[deepseekHistory.value.length - 1].content
    
    await axios.post('http://127.0.0.1:8000/comparison/vote', {
      query_content: lastQuestion.value,
      qwen_response: qwenResp,
      deepseek_response: dsResp,
      winner: winner
    }, {
      headers: { 'Authorization': `Bearer ${props.token}` }
    })
    
    hasVoted.value = true
    ElMessage.success('感谢您的反馈！')
  } catch (err) {
    ElMessage.error('投票失败: ' + err.message)
  }
}

const callModel = async (modelName, historyRef, loadingRef, scrollRef) => {
  loadingRef.value = true
  const question = userInput.value
  
  // Add user message to specific history if not already there (though here we manage two histories)
  historyRef.value.push({ role: 'user', content: question })
  await scrollToBottom(scrollRef.value)

  try {
    const response = await fetch('http://127.0.0.1:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.token}`
      },
      body: JSON.stringify({
        message: question,
        model: modelName,
        stream: true,
        kb_type: chatKbType.value || null
      })
    })

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    const assistantMsg = { role: 'assistant', content: '' }
    historyRef.value.push(assistantMsg)
    const msgIndex = historyRef.value.length - 1
    loadingRef.value = false

    let totalContent = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      totalContent += chunk
      historyRef.value[msgIndex].content = totalContent
      await nextTick()
      await scrollToBottom(scrollRef.value)
    }
  } catch (err) {
    const displayName = modelName.includes('qwen') ? '模型 A' : '模型 B'
    ElMessage.error(`${displayName} 调用出错: ${err.message}`)
    loadingRef.value = false
  }
}

const handleCompare = async () => {
  if (!userInput.value || qwenLoading.value || deepseekLoading.value) return
  
  const question = userInput.value
  lastQuestion.value = question
  hasVoted.value = false // 新问题开始，重置投票状态
  
  // 并行调用两个模型
  const p1 = callModel('qwen-plus', qwenHistory, qwenLoading, qwenScroll)
  const p2 = callModel('deepseek-v3.2', deepseekHistory, deepseekLoading, deepseekScroll)
  
  userInput.value = ''
  await Promise.all([p1, p2])
}
</script>

<style scoped>
.comparison-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 160px);
  background: #f0f2f5;
  border-radius: 8px;
  overflow: hidden;
}

.comparison-header {
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #dcdfe6;
}

.comparison-main {
  flex: 1;
  display: flex;
  gap: 15px;
  padding: 15px;
  overflow: hidden;
}

.model-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  overflow: hidden;
}

.box-header {
  padding: 10px;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: bold;
  text-align: center;
  color: #409eff;
}

.chat-messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  max-width: 90%;
}

.message-item.user {
  align-self: flex-end;
}

.message-item.assistant {
  align-self: flex-start;
}

.content-bubble {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.content-bubble.user {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #d9ecff;
}

.content-bubble.assistant {
  background-color: #f4f4f5;
  color: #303133;
  border: 1px solid #e9e9eb;
}

.loading-status {
  padding: 10px;
  color: #909399;
  font-size: 13px;
}

.vote-actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  padding: 10px;
  border-top: 1px dashed #ebeef5;
}

.chat-input {
  padding: 15px 20px;
  background: white;
  border-top: 1px solid #dcdfe6;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.tip {
  font-size: 12px;
  color: #909399;
}

.chat-messages::-webkit-scrollbar {
  width: 5px;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 10px;
}
</style>
