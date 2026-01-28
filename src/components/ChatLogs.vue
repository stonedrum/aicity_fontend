<template>
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

        <el-divider>意图识别信息</el-divider>
        <div v-if="selectedLog.intent_info" class="intent-info">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="意图识别 Prompt">
              <pre class="log-content-pre">{{ selectedLog.intent_info.prompt }}</pre>
            </el-descriptions-item>
            <el-descriptions-item label="模型原始回复">{{ selectedLog.intent_info.response }}</el-descriptions-item>
            <el-descriptions-item label="识别出的类型">{{ selectedLog.intent_info.detected_type }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div v-else class="no-data">无意图识别记录（已指定类型或识别跳过）</div>

        <el-divider>初始 RAG 结果（Top {{ systemConfigs.initial_rag_count || 10 }}）（相似度 > {{ systemConfigs.initial_rag_threshold || 0.3 }}）</el-divider>
        <div v-if="selectedLog.initial_rag_results && selectedLog.initial_rag_results.length > 0" class="rag-results">
          <el-table :data="selectedLog.initial_rag_results" size="small" max-height="300">
            <el-table-column prop="doc_name" label="文档名称" width="200" show-overflow-tooltip />
            <el-table-column prop="page_number" label="页码" width="80" />
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

        <el-divider>重排结果（Top {{ systemConfigs.rerank_count || 3 }}）（重排分 > {{ systemConfigs.rerank_threshold || 0.8 }}）</el-divider>
        <div v-if="selectedLog.reranked_results && selectedLog.reranked_results.length > 0" class="rag-results">
          <el-table :data="selectedLog.reranked_results" size="small" max-height="300">
            <el-table-column prop="doc_name" label="文档名称" width="200" show-overflow-tooltip />
            <el-table-column prop="page_number" label="页码" width="80" />
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

        <el-divider>LLM 完整上下文 (llm_messages)</el-divider>
        <div v-if="selectedLog.llm_messages && selectedLog.llm_messages.length > 0" class="llm-messages-context">
          <div v-for="(msg, index) in selectedLog.llm_messages" :key="index" class="msg-item" :class="msg.role">
            <div class="msg-header">
              <el-tag size="small" :type="getRoleTagType(msg.role)">{{ msg.role.toUpperCase() }}</el-tag>
            </div>
            <pre class="msg-body">{{ msg.content }}</pre>
          </div>
        </div>
        <div v-else class="no-data">无上下文记录</div>

        <el-divider>LLM 响应</el-divider>
        <div class="llm-response">
          <div class="markdown-body" v-html="renderMarkdown(selectedLog.llm_response || '无响应')"></div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import { API_BASE_URL } from '../api/config'

const md = new MarkdownIt({
  linkify: true,
  breaks: true
})

const renderMarkdown = (content) => md.render(content)

const getRoleTagType = (role) => {
  switch (role) {
    case 'system': return 'danger'
    case 'user': return 'primary'
    case 'assistant': return 'success'
    default: return 'info'
  }
}

const props = defineProps({
  token: String
})

const chatLogs = ref([])
const logsLoading = ref(false)
const logPage = ref(1)
const logPageSize = ref(15)
const logTotal = ref(0)
const logFilterUsername = ref('')
const logDetailVisible = ref(false)
const selectedLog = ref(null)
const systemConfigs = ref({})

const loadSystemConfigs = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/configs`, {
      headers: { 'Authorization': `Bearer ${props.token}` }
    })
    const configMap = {}
    res.data.forEach(item => {
      configMap[item.config_key] = item.config_value
    })
    systemConfigs.value = configMap
  } catch (err) {
    console.error('加载系统配置失败', err)
  }
}

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
    const res = await axios.get(`${API_BASE_URL}/chat-logs`, {
      params,
      headers: {
        'Authorization': `Bearer ${props.token}`
      }
    })
    chatLogs.value = res.data.items
    logTotal.value = res.data.total
  } catch (err) {
    ElMessage.error('加载日志失败')
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
  logPage.value = 1
  loadChatLogs()
}

const viewLogDetail = (log) => {
  selectedLog.value = log
  logDetailVisible.value = true
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

onMounted(() => {
  loadSystemConfigs()
  loadChatLogs()
})
</script>

<style scoped>
.logs-container {
  padding: 20px;
}
.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
.log-content-pre {
  margin: 0;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 12px;
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
.llm-messages-context {
  margin: 10px 0;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  background-color: #fafafa;
}
.msg-item {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #eee;
}
.msg-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.msg-header {
  margin-bottom: 5px;
}
.msg-body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  background: transparent;
  padding: 0;
  border: none;
}
.msg-item.system .msg-body {
  color: #909399;
}
</style>
