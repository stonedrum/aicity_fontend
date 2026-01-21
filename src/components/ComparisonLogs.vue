<template>
  <div class="logs-container">
    <!-- 统计信息 -->
    <div class="stats-cards" v-loading="statsLoading">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card shadow="hover" class="stats-card">
            <div class="stats-label">总比对次数</div>
            <div class="stats-value">{{ stats.total_votes || 0 }}</div>
            <div class="stats-percent" style="visibility: hidden;">占位符</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="stats-card qwen">
            <div class="stats-label">模型 A 获胜</div>
            <div class="stats-value">{{ stats.qwen_wins || 0 }}</div>
            <div class="stats-percent" v-if="stats.total_votes > 0">
              胜率: {{ ((stats.qwen_wins / stats.total_votes) * 100).toFixed(1) }}%
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="stats-card deepseek">
            <div class="stats-label">模型 B 获胜</div>
            <div class="stats-value">{{ stats.deepseek_wins || 0 }}</div>
            <div class="stats-percent" v-if="stats.total_votes > 0">
              胜率: {{ ((stats.deepseek_wins / stats.total_votes) * 100).toFixed(1) }}%
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 列表展示 -->
    <div class="logs-header">
      <h3>模型比对日志</h3>
      <el-button type="primary" icon="Refresh" @click="loadAll">刷新</el-button>
    </div>

    <el-table :data="votes" style="width: 100%" v-loading="loading" stripe border>
      <el-table-column prop="vote_time" label="日期" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.vote_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="username" label="提问人" width="120" />
      <el-table-column prop="query_content" label="问题" min-width="200" show-overflow-tooltip />
      <el-table-column label="优胜模型" width="120">
        <template #default="{ row }">
          <el-tag :type="row.winner === 1 ? 'primary' : 'success'">
            {{ row.winner === 1 ? '模型 A' : '模型 B' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="viewDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 15, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="比对详情" width="90%" top="5vh">
      <div v-if="selectedVote" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="提问人">{{ selectedVote.username }}</el-descriptions-item>
          <el-descriptions-item label="比对时间">{{ formatDateTime(selectedVote.vote_time) }}</el-descriptions-item>
          <el-descriptions-item label="问题" :span="2">{{ selectedVote.query_content }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>提交模型的完整内容 (Context)</el-divider>
        <div v-if="selectedVote.llm_messages" class="llm-messages-context">
          <div v-for="(msg, index) in selectedVote.llm_messages" :key="index" class="msg-item" :class="msg.role">
            <div class="msg-header">
              <el-tag size="small" :type="getRoleTagType(msg.role)">{{ msg.role.toUpperCase() }}</el-tag>
            </div>
            <pre class="msg-body">{{ msg.content }}</pre>
          </div>
        </div>
        <div v-else class="no-data">无上下文记录</div>

        <el-row :gutter="20" class="comparison-result">
          <el-col :span="12">
            <div class="model-result-box" :class="{ winner: selectedVote.winner === 1 }">
              <div class="box-title">模型 A <el-tag v-if="selectedVote.winner === 1" size="small" type="danger">获胜</el-tag></div>
              <div class="markdown-body" v-html="renderMarkdown(selectedVote.qwen_response)"></div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="model-result-box" :class="{ winner: selectedVote.winner === 2 }">
              <div class="box-title">模型 B <el-tag v-if="selectedVote.winner === 2" size="small" type="danger">获胜</el-tag></div>
              <div class="markdown-body" v-html="renderMarkdown(selectedVote.deepseek_response)"></div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ linkify: true, breaks: true })
const renderMarkdown = (content) => md.render(content || '')

const props = defineProps({
  token: String
})

const votes = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const loading = ref(false)
const stats = ref({ total_votes: 0, qwen_wins: 0, deepseek_wins: 0 })
const statsLoading = ref(false)
const detailVisible = ref(false)
const selectedVote = ref(null)

const loadStats = async () => {
  statsLoading.value = true
  try {
    const res = await axios.get('http://127.0.0.1:8000/comparison/stats', {
      headers: { 'Authorization': `Bearer ${props.token}` }
    })
    stats.value = res.data
  } catch (err) {
    console.error('加载统计信息失败', err)
  } finally {
    statsLoading.value = false
  }
}

const loadVotes = async () => {
  loading.value = true
  try {
    const res = await axios.get('http://127.0.0.1:8000/comparison/votes', {
      params: { page: page.value, page_size: pageSize.value },
      headers: { 'Authorization': `Bearer ${props.token}` }
    })
    votes.value = res.data.items
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载列表失败')
  } finally {
    loading.value = false
  }
}

const loadAll = () => {
  loadStats()
  loadVotes()
}

const handlePageChange = (p) => {
  page.value = p
  loadVotes()
}

const handleSizeChange = (s) => {
  pageSize.value = s
  page.value = 1
  loadVotes()
}

const viewDetail = (vote) => {
  selectedVote.value = vote
  detailVisible.value = true
}

const getRoleTagType = (role) => {
  switch (role) {
    case 'system': return 'danger'
    case 'user': return 'primary'
    case 'assistant': return 'success'
    default: return 'info'
  }
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  const date = new Date(dateTimeStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.logs-container {
  padding: 20px;
}
.stats-cards {
  margin-bottom: 30px;
}
.stats-card {
  text-align: center;
  padding: 10px 0;
}
.stats-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}
.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}
.stats-card.qwen .stats-value { color: #409eff; }
.stats-card.deepseek .stats-value { color: #67c23a; }
.stats-percent {
  font-size: 12px;
  margin-top: 5px;
  color: #999;
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
.detail-content {
  max-height: 80vh;
  overflow-y: auto;
}
.llm-messages-context {
  margin: 15px 0;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  background-color: #fafafa;
}
.msg-item {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #eee;
}
.msg-body {
  margin: 5px 0 0 0;
  white-space: pre-wrap;
  font-size: 12px;
  color: #666;
}
.comparison-result {
  margin-top: 20px;
}
.model-result-box {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  height: 400px;
  overflow-y: auto;
  background: #fff;
}
.model-result-box.winner {
  border: 2px solid #f56c6c;
  background: #fffafa;
}
.box-title {
  font-weight: bold;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.no-data {
  text-align: center;
  padding: 20px;
  color: #999;
}
</style>
