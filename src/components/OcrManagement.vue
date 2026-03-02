<template>
  <div class="ocr-management">
    <div class="toolbar">
      <el-form :inline="true" size="small">
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 120px;" @change="handleSearch">
            <el-option label="待提交" value="待提交" />
            <el-option label="待识别" value="待识别" />
            <el-option label="已识别" value="已识别" />
            <el-option label="识别失败" value="识别失败" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button type="success" @click="openUploadDialog">上传扫描件</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table v-loading="loading" :data="tasks" border stripe size="small" style="width: 100%">
      <el-table-column prop="upload_time" label="上传时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.upload_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="uploader" label="上传人" width="120" />
      <el-table-column prop="original_file_url" label="原始文件" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :href="row.original_file_url" target="_blank">查看原件</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="ocr_status" label="识别状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTag(row.ocr_status)" size="small">{{ row.ocr_status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="ocr_time" label="识别时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.ocr_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="result_file_url" label="解析结果" width="120">
        <template #default="{ row }">
          <el-link v-if="row.result_file_url" type="success" :href="row.result_file_url" target="_blank">下载 ZIP</el-link>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="rag_status" label="RAG 提交" width="100">
        <template #default="{ row }">
          <el-tag :type="row.rag_status === '已提交' ? 'success' : 'info'" size="small">{{ row.rag_status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="识别内容" width="100">
        <template #default="{ row }">
          <el-button 
            v-if="row.ocr_status === '已识别'" 
            type="primary" 
            link 
            size="small" 
            @click="handleViewContent(row)"
          >
            查看内容
          </el-button>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button 
            link 
            size="small" 
            type="primary"
            :loading="row.checking"
            :disabled="row.ocr_status === '已识别'"
            @click="handleCheckTask(row)"
          >
            {{ row.ocr_status === '待提交' ? '提交识别' : '检查进度' }}
          </el-button>
          <el-button 
            link 
            size="small" 
            :disabled="row.ocr_status !== '已识别' || row.rag_status === '已提交'"
            @click="openSubmitRagDialog(row)"
          >
            提交知识库
          </el-button>
          <el-button link size="small" style="color: #f56c6c" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传扫描件 (仅限 PDF)" width="450px" :close-on-click-modal="false">
      <el-upload
        class="ocr-upload"
        drag
        action="#"
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-remove="() => selectedFile = null"
        accept=".pdf"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">只能上传 PDF 文件，且一次只能上传一个。系统将自动调用 OCR 进行解析。</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploadLoading" @click="handleUpload">开始上传</el-button>
      </template>
    </el-dialog>

    <!-- 提交 RAG 对话框 -->
    <el-dialog v-model="ragDialogVisible" title="将 OCR 结果提交到知识库" width="500px">
      <el-form :model="ragForm" label-width="100px">
        <el-form-item label="知识库类型" required>
          <el-select v-model="ragForm.kb_type" placeholder="请选择类型" style="width: 100%">
            <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域范围">
          <el-select v-model="ragForm.region_level" placeholder="请选择区域范围" style="width: 100%" @change="handleRegionLevelChange">
            <el-option label="全国" value="全国" />
            <el-option label="省级" value="省级" />
            <el-option label="市级" value="市级" />
          </el-select>
        </el-form-item>
        <el-form-item label="省份" v-if="['省级', '市级'].includes(ragForm.region_level)">
          <el-select v-model="ragForm.province" placeholder="请选择省份" style="width: 100%" @change="handleProvinceChange">
            <el-option v-for="item in provinces" :key="item.id" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市" v-if="ragForm.region_level === '市级'">
          <el-select v-model="ragForm.city" placeholder="请选择城市" style="width: 100%" :disabled="!ragForm.province">
            <el-option v-for="item in cities" :key="item.id" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ragDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="ragLoading" @click="handleConfirmSubmitRag">确认提交</el-button>
      </template>
    </el-dialog>

    <!-- 查看识别内容全屏对话框 -->
    <el-dialog
      v-model="contentDialogVisible"
      :title="`查看识别内容 - ${contentRow?.filename || '文件'}`"
      fullscreen
      destroy-on-close
      class="content-viewer-dialog"
    >
      <div v-loading="contentLoading" class="content-viewer-layout">
        <!-- 左侧 PDF -->
        <div class="pdf-pane">
          <div class="pane-header">原始 PDF 文件</div>
          <iframe 
            v-if="contentRow?.original_file_url" 
            :src="contentRow.original_file_url" 
            class="pdf-iframe"
          ></iframe>
        </div>
        
        <!-- 右侧 Markdown -->
        <div class="md-pane">
          <div class="pane-header">识别后的 Markdown 内容</div>
          <div class="md-content-container markdown-body" v-html="renderedMarkdown"></div>
        </div>
      </div>
      <template #footer>
        <el-button @click="contentDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from '../api/request'
import rawAxios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const props = defineProps({
  kbTypeOptions: Array,
  token: String
})

const loading = ref(false)
const tasks = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const filterStatus = ref('')

const uploadDialogVisible = ref(false)
const uploadLoading = ref(false)
const selectedFile = ref(null)

const ragDialogVisible = ref(false)
const ragLoading = ref(false)
const selectedTask = ref(null)
const ragForm = ref({
  kb_type: '',
  region_level: '全国',
  province: '',
  city: ''
})

const contentDialogVisible = ref(false)
const contentLoading = ref(false)
const contentRow = ref(null)
const markdownText = ref('')

const renderedMarkdown = computed(() => {
  return md.render(markdownText.value || '*暂无内容*')
})

const handleViewContent = async (row) => {
  contentRow.value = row
  contentDialogVisible.value = true
  contentLoading.value = true
  markdownText.value = ''
  
  if (!row.md_file_url) {
    ElMessage.warning('该任务没有生成 Markdown 文件')
    contentLoading.value = false
    return
  }

  try {
    // 跨域读取 OSS 上的 MD 文件，直接使用 rawAxios 避免请求拦截器注入 auth header
    const res = await rawAxios.get(row.md_file_url)
    markdownText.value = res.data
  } catch (err) {
    console.error('获取 Markdown 失败:', err)
    ElMessage.error('获取识别内容失败，可能是跨域问题，请检查 OSS 的 CORS 配置')
  } finally {
    contentLoading.value = false
  }
}

const provinces = ref([])
const cities = ref([])

const loadProvinces = async () => {
  try {
    const res = await axios.get('/regions/provinces')
    provinces.value = res.data
  } catch (err) {
    console.error('加载省份失败:', err)
  }
}

const loadCities = async (provinceName) => {
  if (!provinceName) {
    cities.value = []
    return
  }
  const province = provinces.value.find(p => p.name === provinceName)
  if (!province) return
  try {
    const res = await axios.get(`/regions/${province.id}/cities`)
    cities.value = res.data
  } catch (err) {
    console.error('加载城市失败:', err)
  }
}

const handleRegionLevelChange = () => {
  ragForm.value.province = ''
  ragForm.value.city = ''
  cities.value = []
}

const handleProvinceChange = (val) => {
  ragForm.value.city = ''
  loadCities(val)
}

const formatDateTime = (str) => {
  if (!str) return '-'
  return new Date(str).toLocaleString()
}

const getStatusTag = (status) => {
  switch (status) {
    case '已识别': return 'success'
    case '待识别': return 'warning'
    case '识别失败': return 'danger'
    case '待提交': return 'info'
    default: return 'info'
  }
}

const handleCheckTask = async (row) => {
  row.checking = true
  try {
    const res = await axios.post(`/ocr/tasks/${row.id}/check`)
    ElMessage.success(row.ocr_status === '待提交' ? '任务已成功提交到 MinerU' : '任务状态已更新')
    // 更新当前行数据
    Object.assign(row, res.data)
  } catch (err) {
    ElMessage.error('操作失败: ' + (err.response?.data?.detail || err.message))
  } finally {
    row.checking = false
  }
}

const loadTasks = async () => {
  loading.value = true
  try {
    const res = await axios.get('/ocr/tasks', {
      params: {
        page: page.value,
        page_size: pageSize.value,
        ocr_status: filterStatus.value || null
      }
    })
    tasks.value = res.data.items
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载任务列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadTasks()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  handleSearch()
}

const handlePageChange = (val) => {
  page.value = val
  loadTasks()
}

const openUploadDialog = () => {
  selectedFile.value = null
  uploadDialogVisible.value = true
}

const handleFileChange = (file) => {
  if (file.raw.type !== 'application/pdf') {
    ElMessage.warning('只能上传 PDF 文件')
    return false
  }
  selectedFile.value = file.raw
}

const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择文件')
    return
  }
  uploadLoading.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  try {
    await axios.post('/ocr/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    ElMessage.success('上传成功，解析任务已提交')
    uploadDialogVisible.value = false
    handleSearch()
  } catch (err) {
    ElMessage.error('上传失败: ' + (err.response?.data?.detail || err.message))
  } finally {
    uploadLoading.value = false
  }
}

const openSubmitRagDialog = (row) => {
  selectedTask.value = row
  ragForm.value = {
    kb_type: props.kbTypeOptions[0]?.value || '',
    region_level: '全国',
    province: '',
    city: ''
  }
  ragDialogVisible.value = true
}

const handleConfirmSubmitRag = async () => {
  if (!ragForm.value.kb_type) {
    ElMessage.warning('请选择知识库类型')
    return
  }
  ragLoading.value = true
  const formData = new FormData()
  formData.append('kb_type', ragForm.value.kb_type)
  formData.append('region_level', ragForm.value.region_level || '')
  formData.append('province', ragForm.value.province || '')
  formData.append('city', ragForm.value.city || '')

  try {
    const res = await axios.post(`/ocr/tasks/${selectedTask.value.id}/submit_rag`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    ElMessage.success('成功提交至知识库')
    ragDialogVisible.value = false
    loadTasks()
  } catch (err) {
    ElMessage.error('提交失败: ' + (err.response?.data?.detail || err.message))
  } finally {
    ragLoading.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除此 OCR 任务吗？`, '警告', {
    type: 'warning',
    confirmButtonText: '删除',
    confirmButtonClass: 'el-button--danger'
  }).then(async () => {
    try {
      await axios.delete(`/ocr/tasks/${row.id}`)
      ElMessage.success('删除成功')
      loadTasks()
    } catch (err) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  loadTasks()
  loadProvinces()
})
</script>

<style scoped>
.ocr-management {
  padding: 20px;
}
.toolbar {
  margin-bottom: 20px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.ocr-upload {
  width: 100%;
}

/* 对话框整体高度调整 */
.content-viewer-dialog :deep(.el-dialog) {
  margin: 0 !important;
  display: flex;
  flex-direction: column;
  height: 100vh !important;
  width: 100vw !important;
}

.content-viewer-dialog :deep(.el-dialog__header) {
  padding: 12px 20px;
  margin: 0;
  border-bottom: 1px solid #ddd;
}

.content-viewer-dialog :deep(.el-dialog__footer) {
  padding: 10px 20px;
  border-top: 1px solid #ddd;
}

.content-viewer-dialog :deep(.el-dialog__body) {
  flex: 1;
  overflow: hidden;
  padding: 0 !important;
  display: flex;
  min-height: 0;
}

.content-viewer-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-height: 0;
}

.pdf-pane, .md-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.pdf-pane {
  border-right: 1px solid #ddd;
}

.md-pane {
  border-right: none;
}

.pane-header {
  height: 40px;
  line-height: 40px;
  padding: 0 16px;
  background-color: #f5f7fa;
  font-weight: bold;
  border-bottom: 1px solid #ddd;
  color: #333;
  box-sizing: border-box;
}

.pdf-iframe {
  height: calc(100% - 40px);
  width: 100%;
  border: none;
  display: block;
}

.md-content-container {
  height: calc(100% - 40px);
  padding: 24px;
  overflow-y: auto;
  background-color: #fff;
  line-height: 1.6;
  box-sizing: border-box;
}

/* 简单的 markdown 样式增强 */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 16px;
  word-wrap: break-word;
}
.markdown-body :deep(h1), .markdown-body :deep(h2), .markdown-body :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}
.markdown-body :deep(h1) { padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
.markdown-body :deep(p) { margin-top: 0; margin-bottom: 16px; }
.markdown-body :deep(img) { max-width: 100%; }
.markdown-body :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  width: 100%;
}
.markdown-body :deep(table th), .markdown-body :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}
.markdown-body :deep(table tr:nth-child(2n)) { background-color: #f6f8fa; }
</style>
