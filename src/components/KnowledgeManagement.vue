<template>
  <div class="kb-management">
    <div class="toolbar">
      <el-form :inline="true" size="small">
        <el-form-item label="知识库类型">
          <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 150px;" @change="handleSearch">
            <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="归属文档">
          <el-select
            v-model="filterDocId"
            filterable
            remote
            reserve-keyword
            placeholder="请选择或输入搜索..."
            :remote-method="(query) => remoteSearchDocs(query, filterType)"
            :loading="docsLoading"
            clearable
            style="width: 200px;"
            @change="handleSearch"
            @focus="remoteSearchDocs('', filterType)"
          >
            <el-option
              v-for="item in docOptions"
              :key="item.id"
              :label="item.filename"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="搜索内容或路径..." clearable @keyup.enter="handleSearch" style="width: 250px;" />
        </el-form-item>
        <el-form-item label="校验状态">
          <el-select v-model="filterVerified" placeholder="全部" clearable style="width: 120px;" @change="handleSearch">
            <el-option label="全部" :value="null" />
            <el-option label="已校验" :value="true" />
            <el-option label="未校验" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button type="success" @click="openAdd">新增条款</el-button>
          <el-button type="warning" @click="openBatchImport">批量导入</el-button>
          <el-button type="danger" :disabled="selectedIds.length === 0" @click="openBatchEdit">批量设置</el-button>
          <el-button @click="configDialogVisible = true">表格配置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table 
      v-loading="loading" 
      :data="clauses" 
      border 
      stripe 
      size="small" 
      style="width: 100%"
      @header-dragend="handleHeaderDragend"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" fixed="left" />
      <template v-for="col in activeColumns" :key="col.prop">
        <el-table-column
          v-if="col.visible"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :fixed="col.fixed === 'none' ? false : col.fixed"
          show-overflow-tooltip
        >
          <template #default="{ row }" v-if="col.prop === 'kb_type'">
            <el-tag size="small" type="info">{{ getKbTypeLabel(row.kb_type) }}</el-tag>
          </template>
          <template #default="{ row }" v-else-if="col.prop === 'is_verified'">
            <el-tag size="small" :type="row.is_verified ? 'success' : 'warning'">
              {{ row.is_verified ? '已校验' : '未校验' }}
            </el-tag>
            <el-button 
              type="text" 
              size="small" 
              style="margin-left: 10px" 
              @click="toggleVerify(row)"
            >
              {{ row.is_verified ? '设为未校验' : '设为已校验' }}
            </el-button>
          </template>
          <template #default="{ row }" v-else-if="col.prop === 'doc_name'">
            <span>{{ row.doc_name || '-' }}</span>
          </template>
          <template #default="{ row }" v-else-if="col.prop === 'page_number'">
            <span>{{ row.page_number || '未设置' }}</span>
          </template>
          <template #default="{ row }" v-else-if="col.prop === 'created_at'">
            <span>{{ row.created_at ? new Date(row.created_at).toLocaleString() : '-' }}</span>
          </template>
        </el-table-column>
      </template>

      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="text" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="text" size="small" style="color: #f56c6c" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 15, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑条款' : '新增条款'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="归属类型">
          <el-select v-model="form.kb_type" placeholder="请选择类型" style="width: 100%">
            <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属文档">
          <el-select
            v-model="form.doc_id"
            filterable
            remote
            reserve-keyword
            placeholder="请选择或输入搜索..."
            :remote-method="(query) => remoteSearchDocs(query, form.kb_type)"
            :loading="docsLoading"
            clearable
            style="width: 100%;"
            @focus="remoteSearchDocs('', form.kb_type)"
          >
            <el-option
              v-for="item in docOptions"
              :key="item.id"
              :label="item.filename"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="章节路径">
          <el-input v-model="form.chapter_path" placeholder="例如：第一章 > 1.1节" />
        </el-form-item>
        <el-form-item label="所在页码">
          <el-input-number v-model="form.page_number" :min="1" placeholder="页码" style="width: 100%" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="10" placeholder="条款正文内容（支持Markdown）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="!isEdit" type="success" @click="handleSave(true)" :loading="saveLoading">新增并记录</el-button>
        <el-button type="primary" @click="handleSave(false)" :loading="saveLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="batchDialogVisible" title="批量导入条款" width="600px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="归属类型">
          <el-select v-model="batchForm.kb_type" placeholder="请选择类型" style="width: 100%">
            <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属文档">
          <el-select
            v-model="batchForm.doc_id"
            filterable
            remote
            reserve-keyword
            placeholder="请选择或输入搜索..."
            :remote-method="(query) => remoteSearchDocs(query, batchForm.kb_type)"
            :loading="docsLoading"
            clearable
            style="width: 100%;"
            @focus="remoteSearchDocs('', batchForm.kb_type)"
          >
            <el-option
              v-for="item in docOptions"
              :key="item.id"
              :label="item.filename"
              :value="item.id"
            />
          </el-select>
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

    <!-- 批量编辑对话框 -->
    <el-dialog v-model="batchEditVisible" title="批量设置条款属性" width="500px">
      <el-form :model="batchEditForm" label-width="120px">
        <p style="margin-bottom: 20px; color: #666;">将对选中的 {{ selectedIds.length }} 条记录进行修改。勾选下方项进行批量设置：</p>
        
        <el-form-item label="修改知识库类型">
          <div style="display: flex; align-items: center; width: 100%;">
            <el-checkbox v-model="batchEditFields.kb_type" style="margin-right: 10px;" />
            <el-select v-model="batchEditForm.kb_type" :disabled="!batchEditFields.kb_type" placeholder="请选择类型" style="flex: 1;">
              <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="修改所属文档">
          <div style="display: flex; align-items: center; width: 100%;">
            <el-checkbox v-model="batchEditFields.doc_id" style="margin-right: 10px;" />
            <el-select
              v-model="batchEditForm.doc_id"
              :disabled="!batchEditFields.doc_id"
              filterable
              remote
              reserve-keyword
              placeholder="搜索文档..."
              :remote-method="remoteSearchDocs"
              :loading="docsLoading"
              clearable
              style="flex: 1;"
              @focus="remoteSearchDocs('')"
            >
              <el-option
                v-for="item in docOptions"
                :key="item.id"
                :label="item.filename"
                :value="item.id"
              />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="修改校验状态">
          <div style="display: flex; align-items: center; width: 100%;">
            <el-checkbox v-model="batchEditFields.is_verified" style="margin-right: 10px;" />
            <el-radio-group v-model="batchEditForm.is_verified" :disabled="!batchEditFields.is_verified">
              <el-radio :label="true">已校验</el-radio>
              <el-radio :label="false">未校验</el-radio>
            </el-radio-group>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchEditLoading" @click="handleBatchEdit">确定修改</el-button>
      </template>
    </el-dialog>

    <!-- 表格配置对话框 -->
    <el-dialog v-model="configDialogVisible" title="表格列配置" width="500px">
      <el-table :data="columnConfigs" size="small" border>
        <el-table-column label="显示" width="60" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.visible" />
          </template>
        </el-table-column>
        <el-table-column prop="label" label="列名" width="100" />
        <el-table-column label="宽度" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.width" :min="50" :max="1000" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="固定" width="120">
          <template #default="{ row }">
            <el-select v-model="row.fixed" size="small">
              <el-option label="不固定" value="none" />
              <el-option label="左侧" value="left" />
              <el-option label="右侧" value="right" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="80" align="center">
          <template #default="{ $index }">
            <el-button-group>
              <el-button size="small" icon="ArrowUp" @click="moveCol($index, -1)" :disabled="$index === 0" />
              <el-button size="small" icon="ArrowDown" @click="moveCol($index, 1)" :disabled="$index === columnConfigs.length - 1" />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="resetConfig">恢复默认</el-button>
        <el-button type="primary" @click="saveTableConfig">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from '../api/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { API_BASE_URL } from '../api/config'

const props = defineProps({
  kbTypeOptions: Array,
  token: String,
  initialDocId: {
    type: String,
    default: null
  }
})

const loading = ref(false)
const clauses = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const filterType = ref('')
const keyword = ref('')
const filterVerified = ref(null)
const filterDocId = ref(null)

const docOptions = ref([])
const docsLoading = ref(false)

const dialogVisible = ref(false)
const isEdit = ref(false)
const saveLoading = ref(false)
const form = ref({ 
  id: null, 
  kb_type: '', 
  chapter_path: '', 
  content: '', 
  doc_id: null
})

const batchDialogVisible = ref(false)
const batchLoading = ref(false)
const batchForm = ref({ kb_type: '', doc_id: null, items: [] })
const batchSummary = ref('未选择文件')

// 批量设置
const selectedIds = ref([])
const batchEditVisible = ref(false)
const batchEditLoading = ref(false)
const batchEditFields = ref({ kb_type: false, doc_id: false, is_verified: false })
const batchEditForm = ref({ kb_type: '', doc_id: null, is_verified: true })

// 表格配置
const configDialogVisible = ref(false)
const defaultColumns = [
  { prop: 'kb_type', label: '类型', visible: true, width: 120, fixed: 'none' },
  { prop: 'region_level', label: '区域范围', visible: true, width: 100, fixed: 'none' },
  { prop: 'province', label: '省份', visible: true, width: 120, fixed: 'none' },
  { prop: 'city', label: '城市', visible: true, width: 120, fixed: 'none' },
  { prop: 'doc_name', label: '归属文档', visible: true, width: 180, fixed: 'none' },
  { prop: 'page_number', label: '页码', visible: true, width: 80, fixed: 'none' },
  { prop: 'import_method', label: '录入方式', visible: true, width: 100, fixed: 'none' },
  { prop: 'creator', label: '录入人', visible: true, width: 100, fixed: 'none' },
  { prop: 'created_at', label: '创建时间', visible: true, width: 160, fixed: 'none' },
  { prop: 'chapter_path', label: '章节路径', visible: true, width: 200, fixed: 'none' },
  { prop: 'content', label: '条款内容', visible: true, width: null, fixed: 'none' },
  { prop: 'is_verified', label: '校验状态', visible: true, width: 200, fixed: 'none' },
]
const columnConfigs = ref([])

const activeColumns = computed(() => {
  return columnConfigs.value
})

const getKbTypeLabel = (val) => {
  const item = props.kbTypeOptions.find(i => i.value === val)
  return item ? item.label : val
}

const loadClauses = async () => {
  loading.value = true
  try {
    const res = await axios.get('/clauses', {
      params: {
        page: page.value,
        page_size: pageSize.value,
        kb_type: filterType.value || null,
        doc_id: filterDocId.value || null,
        keyword: keyword.value || null,
        is_verified: filterVerified.value !== null ? filterVerified.value : null
      }
    })
    clauses.value = res.data.items
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载条款失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadClauses()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  loadClauses()
}

const handlePageChange = (val) => {
  page.value = val
  loadClauses()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(row => row.id)
}

const openBatchEdit = () => {
  batchEditFields.value = { kb_type: false, doc_id: false, is_verified: false }
  batchEditForm.value = { 
    kb_type: props.kbTypeOptions[0]?.value || '', 
    doc_id: null, 
    is_verified: true 
  }
  batchEditVisible.value = true
}

const handleBatchEdit = async () => {
  const hasField = Object.values(batchEditFields.value).some(v => v)
  if (!hasField) {
    ElMessage.warning('请至少勾选一个要修改的属性')
    return
  }

  batchEditLoading.value = true
  try {
    const payload = {
      ids: selectedIds.value
    }
    if (batchEditFields.value.kb_type) payload.kb_type = batchEditForm.value.kb_type
    if (batchEditFields.value.doc_id) payload.doc_id = batchEditForm.value.doc_id
    if (batchEditFields.value.is_verified) payload.is_verified = batchEditForm.value.is_verified

    await axios.post('/clauses/batch-update', payload)
    
    ElMessage.success('批量修改成功')
    batchEditVisible.value = false
    loadClauses()
  } catch (err) {
    ElMessage.error('批量修改失败')
  } finally {
    batchEditLoading.value = false
  }
}

const openAdd = () => {
  isEdit.value = false
  form.value = { 
    id: null, 
    kb_type: props.kbTypeOptions[0]?.value || '', 
    chapter_path: '', 
    content: '',
    page_number: null,
    doc_id: filterDocId.value || null
  }
  dialogVisible.value = true
}

const openBatchImport = () => {
  batchForm.value = { 
    kb_type: props.kbTypeOptions[0]?.value || '',
    doc_id: filterDocId.value || null,
    items: []
  }
  batchSummary.value = '未选择文件'
  batchDialogVisible.value = true
}

const openEdit = async (row) => {
  isEdit.value = true
  form.value = { ...row }
  // 确保当前行所属文档在下拉选项里，这样即便还没搜索也能显示文件名
  if (row.doc_id && !docOptions.value.find(d => d.id === row.doc_id)) {
    docOptions.value.push({ id: row.doc_id, filename: row.doc_name })
  }
  dialogVisible.value = true
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
        .map((item, index) => {
          // 优先尝试 "页码"，然后是 "page_number"，最后是 "page"
          let rawPage = item['页码']
          if (rawPage === undefined || rawPage === null || rawPage === '') {
            rawPage = item.page_number
          }
          if (rawPage === undefined || rawPage === null || rawPage === '') {
            rawPage = item.page
          }
          
          let parsedPage = null
          if (rawPage !== undefined && rawPage !== null && rawPage !== '') {
            // 如果已经是数字，直接取整
            if (typeof rawPage === 'number') {
              parsedPage = Math.floor(rawPage)
            } else {
              // 如果是字符串，尝试提取其中的数字（如 "第23页" -> 23）
              const match = String(rawPage).match(/\d+/)
              if (match) {
                parsedPage = parseInt(match[0])
              }
            }
          }

          if (index < 3) {
            console.log(`[Batch Import Debug] Item ${index}:`, {
              original_page: rawPage,
              parsed_page: parsedPage,
              chapter: item['章节标题'] || item.chapter_path
            })
          }

          return {
            chapter_path: item['章节标题'] || item['章节'] || item.chapter_path || '',
            content: item['内容'] || item['正文'] || item.content || '',
            page_number: parsedPage
          }
        })
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
  if (!batchForm.value.kb_type) {
    ElMessage.warning('请选择归属类型')
    return
  }
  if (!batchForm.value.items.length) {
    ElMessage.warning('请先选择并解析 JSON 文件')
    return
  }
  batchLoading.value = true
  try {
    await axios.post('/clauses/batch', batchForm.value)
    ElMessage.success('批量导入成功')
    batchDialogVisible.value = false
    loadClauses()
  } catch (err) {
    const detail = err?.response?.data?.detail
    const status = err?.response?.status
    const message = detail ? `批量导入失败：${detail}` : '批量导入失败'
    ElMessage.error(status ? `${message} (HTTP ${status})` : message)
  } finally {
    batchLoading.value = false
  }
}

const handleSave = async (continueAdding = false) => {
  if (!form.value.kb_type || !form.value.content) {
    ElMessage.warning('请填写必填项')
    return
  }
  saveLoading.value = true
  try {
    let res
    if (isEdit.value) {
      res = await axios.put(`/clauses/${form.value.id}`, form.value)
    } else {
      res = await axios.post('/clauses', form.value)
    }
    ElMessage.success('保存成功')
    
    if (continueAdding) {
      // 新增并记录：保留类型和文档，重置其他
      const savedDocId = form.value.doc_id
      const savedKbType = form.value.kb_type
      
      // 记录当前保存的文档到选项中，防止重置后显示 ID 而非名称
      if (res.data.doc_id && res.data.doc_name) {
        if (!docOptions.value.find(d => d.id === res.data.doc_id)) {
          docOptions.value.push({ id: res.data.doc_id, filename: res.data.doc_name })
        }
      }

      form.value = { 
        id: null, 
        kb_type: savedKbType, 
        chapter_path: '', 
        content: '', 
        page_number: null,
        doc_id: savedDocId
      }
    } else {
      dialogVisible.value = false
    }
    
    loadClauses()
  } catch (err) {
    ElMessage.error('保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该条款吗？', '提示', { type: 'warning' }).then(async () => {
    try {
      await axios.delete(`/clauses/${row.id}`)
      ElMessage.success('删除成功')
      loadClauses()
    } catch (err) {
      ElMessage.error('删除失败')
    }
  })
}

const toggleVerify = (row) => {
  const targetStatus = !row.is_verified
  const actionText = targetStatus ? '已校验' : '未校验'
  
  ElMessageBox.confirm(`确定要将该条款状态设置为"${actionText}"吗？`, '确认设置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  }).then(async () => {
    try {
      await axios.put(`/clauses/${row.id}`, {
        is_verified: targetStatus
      })
      ElMessage.success('设置成功')
      loadClauses()
    } catch (err) {
      ElMessage.error('设置失败')
    }
  }).catch(() => {})
}

const remoteSearchDocs = async (query, kbType = null) => {
  docsLoading.value = true
  try {
    const res = await axios.get('/documents', {
      params: { 
        keyword: query || null,
        kb_type: kbType || null,
        page: 1,
        page_size: 100 // 搜索框建议返回多一点
      }
    })
    
    // 后端现在返回的是分页对象 { items: [], total: ... }
    const newDocs = res.data.items || []
    // 收集当前正在使用的所有文档ID（包括筛选器和对话框表单中的）
    const activeDocIds = [form.value.doc_id, filterDocId.value].filter(id => !!id)
    
    // 找出这些 ID 对应的文档对象（如果它们不在新获取的列表中）
    const missingDocs = []
    activeDocIds.forEach(id => {
      if (!newDocs.find(d => d.id === id)) {
        const found = docOptions.value.find(d => d.id === id)
        if (found) missingDocs.push(found)
      }
    })
    
    docOptions.value = [...missingDocs, ...newDocs]
  } catch (err) {
    console.error('搜索文档失败:', err)
  } finally {
    docsLoading.value = false
  }
}

// 表格配置相关逻辑
const loadTableConfig = () => {
  const saved = localStorage.getItem('kb_table_config')
  if (saved) {
    try {
      columnConfigs.value = JSON.parse(saved)
      // 处理可能新增的列
      defaultColumns.forEach(def => {
        if (!columnConfigs.value.find(c => c.prop === def.prop)) {
          columnConfigs.value.push(def)
        }
      })
    } catch (e) {
      columnConfigs.value = [...defaultColumns]
    }
  } else {
    columnConfigs.value = [...defaultColumns]
  }
}

const saveTableConfig = () => {
  localStorage.setItem('kb_table_config', JSON.stringify(columnConfigs.value))
  configDialogVisible.value = false
  ElMessage.success('配置已保存')
}

const resetConfig = () => {
  columnConfigs.value = JSON.parse(JSON.stringify(defaultColumns))
}

const moveCol = (index, delta) => {
  const target = index + delta
  const temp = columnConfigs.value[index]
  columnConfigs.value[index] = columnConfigs.value[target]
  columnConfigs.value[target] = temp
}

const handleHeaderDragend = (newWidth, oldWidth, column, event) => {
  const col = columnConfigs.value.find(c => c.prop === column.property)
  if (col) {
    col.width = newWidth
    localStorage.setItem('kb_table_config', JSON.stringify(columnConfigs.value))
  }
}

watch(() => filterType.value, (newType) => {
  // 当知识库类型变化时，重置文档筛选，并重新搜索文档
  filterDocId.value = null
  remoteSearchDocs('', newType)
})

onMounted(() => {
  loadTableConfig()
  if (props.initialDocId) {
    filterDocId.value = props.initialDocId
  }
  loadClauses()
  remoteSearchDocs('', filterType.value) // 初始化加载匹配当前类型的文档列表
})

watch(() => props.initialDocId, (newId) => {
  if (newId) {
    filterDocId.value = newId
    loadClauses()
  }
})
</script>

<style scoped>
.kb-management {
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
