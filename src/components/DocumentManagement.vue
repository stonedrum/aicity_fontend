<template>
  <div class="document-management">
    <div class="toolbar">
      <el-form :inline="true" size="small">
        <el-form-item label="知识库类型">
          <el-select v-model="filterKbType" placeholder="全部类型" clearable style="width: 150px;" @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建人" v-if="['sysadmin', 'admin'].includes(userRole)">
          <el-select v-model="filterUploader" placeholder="全部创建人" clearable style="width: 150px;" @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option v-for="username in userOptions" :key="username" :label="username" :value="username" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="搜索文件名..." clearable @keyup.enter="handleSearch" style="width: 250px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button type="success" @click="openAdd">新增文档</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table v-loading="loading" :data="documents" border stripe size="small" style="width: 100%">
      <el-table-column prop="kb_type" label="知识库类型" width="150">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ getKbTypeLabel(row.kb_type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="region_level" label="区域范围" width="100">
        <template #default="{ row }">
          {{ row.region_level || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="province" label="省份" width="120">
        <template #default="{ row }">
          {{ row.province || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="city" label="城市" width="120">
        <template #default="{ row }">
          {{ row.city || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="filename" label="文件名" min-width="250" show-overflow-tooltip />
      <el-table-column prop="uploader" label="上传人" width="120" />
      <el-table-column prop="upload_time" label="上传时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.upload_time) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="350" fixed="right">
        <template #default="{ row }">
          <el-button type="text" size="small" @click="viewFile(row)">查看文件</el-button>
          <el-button type="text" size="small" @click="viewClauses(row)">查看条目</el-button>
          <el-button type="text" size="small" @click="openBatchImportRow(row)">JSON 批量导入</el-button>
          <el-button type="text" size="small" @click="openMarkdownImportRow(row)">Markdown 导入</el-button>
          <el-button type="text" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="text" size="small" style="color: #f56c6c" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑文档' : '新增文档'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="知识库类型" required>
          <el-select v-model="form.kb_type" placeholder="请选择类型" style="width: 100%">
            <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域范围" required>
          <el-select v-model="form.region_level" placeholder="请选择区域范围" style="width: 100%" @change="handleRegionLevelChange">
            <el-option label="全国" value="全国" />
            <el-option label="省级" value="省级" />
            <el-option label="市级" value="市级" />
          </el-select>
        </el-form-item>
        <el-form-item label="省份" v-if="form.region_level === '省级' || form.region_level === '市级'" required>
          <el-select v-model="form.province" placeholder="请选择省份" style="width: 100%" @change="handleProvinceChange">
            <el-option v-for="item in provinces" :key="item.id" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市" v-if="form.region_level === '市级'" required>
          <el-select v-model="form.city" placeholder="请选择城市" style="width: 100%" :disabled="!form.province">
            <el-option v-for="item in cities" :key="item.id" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件名" v-if="isEdit" required>
          <el-input v-model="form.filename" placeholder="请输入文件名" />
        </el-form-item>
        <el-form-item label="上传文件" v-if="!isEdit" required>
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :show-file-list="true"
          >
            <el-button type="primary">选择 PDF 文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="自动导入" v-if="!isEdit">
          <el-checkbox v-model="form.auto_import">自动解析并导入知识条目</el-checkbox>
          <div class="el-upload__tip" style="line-height: 1.4; color: #909399; margin-top: 5px;">
            开启后，系统将自动从 PDF 中提取内容并按页拆分为知识条目。
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="batchDialogVisible" title="JSON 批量导入条款" width="600px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="归属类型">
          <el-select v-model="batchForm.kb_type" placeholder="请选择类型" style="width: 100%" disabled>
            <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属文档">
          <el-input :value="batchDocName" readonly style="width: 100%" />
        </el-form-item>
        <el-form-item label="导入文件">
          <el-upload
            :auto-upload="false"
            accept=".json,application/json"
            :limit="1"
            :on-change="handleBatchFileChange"
            :show-file-list="true"
          >
            <el-button type="primary">选择 JSON 文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="解析结果">
          <el-input v-model="batchSummary" type="textarea" :rows="4" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchLoading" @click="handleBatchImport">开始导入</el-button>
      </template>
    </el-dialog>

    <!-- Markdown 导入对话框 -->
    <el-dialog v-model="mdDialogVisible" title="Markdown 导入条款" width="500px">
      <el-form label-width="100px">
        <el-form-item label="所属文档">
          <el-input :value="mdDocName" readonly style="width: 100%" />
        </el-form-item>
        <el-form-item label="Markdown文件">
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :limit="1"
            accept=".md"
            :on-change="handleMdFileChange"
            :show-file-list="true"
          >
            <el-button type="primary" icon="Upload">选择 .md 文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                系统将按二级标题(##)拆分内容，超长部分自动分段。
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mdDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="mdLoading" @click="handleMdImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '../api/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  kbTypeOptions: Array,
  token: String
})

const emit = defineEmits(['view-clauses'])

const loading = ref(false)
const documents = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterKbType = ref('')
const filterUploader = ref('')
const keyword = ref('')

const userRole = ref(localStorage.getItem('role'))
const userOptions = ref([])

const loadUserOptions = async () => {
  if (!['sysadmin', 'admin'].includes(userRole.value)) return
  try {
    const res = await axios.get('/usernames')
    userOptions.value = res.data
  } catch (err) {
    console.error('加载用户列表失败:', err)
  }
}

// 新增/编辑相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const saveLoading = ref(false)
const form = ref({ 
  id: null, 
  kb_type: '', 
  filename: '', 
  auto_import: false,
  region_level: '全国',
  province: '',
  city: ''
})
const selectedFile = ref(null)

// 区域数据
const provinces = ref([])
const cities = ref([])

const loadProvinces = async () => {
  try {
    const res = await axios.get('/regions/provinces')
    console.log('加载省份成功:', res.data)
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
  form.value.province = ''
  form.value.city = ''
  cities.value = []
}

const handleProvinceChange = (val) => {
  form.value.city = ''
  loadCities(val)
}

// 批量导入相关
const batchDialogVisible = ref(false)
const batchLoading = ref(false)
const batchForm = ref({ kb_type: '', doc_id: null, items: [] })
const batchDocName = ref('')
const batchSummary = ref('未选择文件')

// Markdown 导入相关
const mdDialogVisible = ref(false)
const mdLoading = ref(false)
const mdDocId = ref(null)
const mdDocName = ref('')
const mdSelectedFile = ref(null)

const getKbTypeLabel = (val) => {
  const item = props.kbTypeOptions.find(i => i.value === val)
  return item ? item.label : val
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString()
}

const loadDocuments = async () => {
  loading.value = true
  try {
    const res = await axios.get('/documents', {
      params: { 
        page: page.value,
        page_size: pageSize.value,
        kb_type: filterKbType.value || null,
        uploader: filterUploader.value || null,
        keyword: keyword.value || null 
      }
    })
    documents.value = res.data.items
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载文档列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadDocuments()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  loadDocuments()
}

const handlePageChange = (val) => {
  page.value = val
  loadDocuments()
}

const openBatchImportRow = (row) => {
  batchForm.value = { 
    kb_type: row.kb_type,
    doc_id: row.id,
    items: []
  }
  batchDocName.value = row.filename
  batchSummary.value = '未选择文件'
  batchDialogVisible.value = true
}

const openMarkdownImportRow = (row) => {
  mdDocId.value = row.id
  mdDocName.value = row.filename
  mdSelectedFile.value = null
  mdDialogVisible.value = true
}

const handleMdFileChange = (file) => {
  mdSelectedFile.value = file.raw
}

const handleMdImport = async () => {
  if (!mdSelectedFile.value) {
    ElMessage.warning('请先选择 Markdown 文件')
    return
  }
  mdLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', mdSelectedFile.value)
    
    const res = await axios.post(`/documents/${mdDocId.value}/import-markdown`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data'
      }
    })
    ElMessage.success(`导入成功，共插入 ${res.data.inserted} 条记录`)
    mdDialogVisible.value = false
  } catch (err) {
    ElMessage.error('Markdown 导入失败: ' + (err.response?.data?.detail || err.message))
  } finally {
    mdLoading.value = false
  }
}

const handleBatchFileChange = (file) => {
  const rawFile = file.raw
  if (!rawFile) {
    batchSummary.value = '读取文件失败'
    return
  }
  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const text = String(evt.target?.result || '').replace(/^\uFEFF/, '')
      const data = JSON.parse(text || '[]')
      if (!Array.isArray(data)) {
        batchSummary.value = 'JSON 结构错误：根节点应为数组'
        batchForm.value.items = []
        return
      }

      const items = data
        .map(item => ({
          chapter_path: item['章节标题'] || item.chapter_path || '',
          content: item['内容'] || item.content || ''
        }))
        .filter(item => item.chapter_path && item.content)

      batchForm.value.items = items
      const invalidCount = data.length - items.length
      batchSummary.value = `解析成功：${items.length} 条，跳过无效：${invalidCount} 条`
      if (items.length === 0) {
        ElMessage.warning('未解析到有效条款，请检查字段是否为“章节标题”和“内容”')
      }
    } catch (e) {
      console.error('JSON 解析失败:', e)
      batchSummary.value = `JSON 解析失败：${e.message || '请检查格式'}`
      batchForm.value.items = []
    }
  }
  reader.readAsText(rawFile, 'utf-8')
}

const handleBatchImport = async () => {
  if (!batchForm.value.items.length) {
    ElMessage.warning('请先选择并解析 JSON 文件')
    return
  }
  batchLoading.value = true
  try {
    await axios.post('/clauses/batch', batchForm.value)
    ElMessage.success('批量导入成功')
    batchDialogVisible.value = false
  } catch (err) {
    const detail = err?.response?.data?.detail
    const status = err?.response?.status
    const message = detail ? `批量导入失败：${detail}` : '批量导入失败'
    ElMessage.error(status ? `${message} (HTTP ${status})` : message)
  } finally {
    batchLoading.value = false
  }
}

const openAdd = () => {
  isEdit.value = false
  form.value = { 
    id: null, 
    kb_type: props.kbTypeOptions[0]?.value || '', 
    filename: '', 
    auto_import: false,
    region_level: '全国',
    province: '',
    city: ''
  }
  selectedFile.value = null
  dialogVisible.value = true
}

const openEdit = async (row) => {
  isEdit.value = true
  form.value = { ...row }
  if (form.value.province) {
    await loadCities(form.value.province)
  }
  dialogVisible.value = true
}

const handleFileChange = (file) => {
  selectedFile.value = file.raw
}

const handleSave = async () => {
  if (!form.value.kb_type) {
    ElMessage.warning('请选择知识库类型')
    return
  }

  saveLoading.value = true
  try {
    if (isEdit.value) {
      await axios.put(`/documents/${form.value.id}`, {
        filename: form.value.filename,
        kb_type: form.value.kb_type,
        region_level: form.value.region_level,
        province: form.value.province,
        city: form.value.city
      })
      ElMessage.success('更新成功')
    } else {
      if (!selectedFile.value) {
        ElMessage.warning('请选择要上传的文件')
        saveLoading.value = false
        return
      }
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      formData.append('kb_type', form.value.kb_type)
      formData.append('auto_import', form.value.auto_import)
      formData.append('region_level', form.value.region_level || '')
      formData.append('province', form.value.province || '')
      formData.append('city', form.value.city || '')
      
      const res = await axios.post('/documents', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      })
      if (res.data.auto_import) {
        ElMessage.success(`上传并自动导入成功，共解析 ${res.data.inserted_clauses} 条知识条目`)
      } else {
        ElMessage.success('上传成功')
      }
    }
    dialogVisible.value = false
    loadDocuments()
  } catch (err) {
    ElMessage.error(isEdit.value ? '更新失败' : '上传失败: ' + (err.response?.data?.detail || err.message))
  } finally {
    saveLoading.value = false
  }
}

const viewFile = (row) => {
  if (row.file_url) {
    window.open(row.file_url, '_blank')
  } else {
    ElMessage.warning('文件链接不存在')
  }
}

const viewClauses = (row) => {
  emit('view-clauses', { docId: row.id, docName: row.filename })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除文档 "${row.filename}" 及其关联的所有知识条目吗？该操作不可恢复！`, '极其重要提示', {
    type: 'warning',
    confirmButtonText: '确定删除',
    confirmButtonClass: 'el-button--danger'
  }).then(async () => {
    try {
      // 假设后端支持 DELETE /documents/{id} 并且联级删除条目
      await axios.delete(`/documents/${row.id}`)
      ElMessage.success('删除成功')
      loadDocuments()
    } catch (err) {
      ElMessage.error('删除失败: ' + (err.response?.data?.detail || err.message))
    }
  }).catch(() => {})
}

onMounted(() => {
  loadDocuments()
  loadProvinces()
  loadUserOptions()
})
</script>

<style scoped>
.document-management {
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
</style>
