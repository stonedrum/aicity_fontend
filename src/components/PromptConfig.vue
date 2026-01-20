<template>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const props = defineProps({
  authHeaders: Object
})

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

const loadPrompts = async () => {
  promptsLoading.value = true
  try {
    const res = await axios.get('http://127.0.0.1:8000/prompts', {
      headers: props.authHeaders
    })
    prompts.value = res.data
  } catch (err) {
    ElMessage.error('加载提示词失败')
  } finally {
    promptsLoading.value = false
  }
}

const openAddPrompt = () => {
  isEditingPrompt.value = false
  promptForm.value = { id: null, name: '', description: '', template: '', is_active: true }
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
      await axios.put(`http://127.0.0.1:8000/prompts/${promptForm.value.id}`, promptForm.value, {
        headers: props.authHeaders
      })
    } else {
      await axios.post('http://127.0.0.1:8000/prompts', promptForm.value, {
        headers: props.authHeaders
      })
    }
    ElMessage.success('保存成功')
    promptDialogVisible.value = false
    loadPrompts()
  } catch (err) {
    ElMessage.error('保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDeletePrompt = async (row) => {
  if (!confirm(`确定要删除提示词 "${row.name}" 吗？`)) return
  try {
    await axios.delete(`http://127.0.0.1:8000/prompts/${row.id}`, {
      headers: props.authHeaders
    })
    ElMessage.success('删除成功')
    loadPrompts()
  } catch (err) {
    ElMessage.error('删除失败')
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

onMounted(() => {
  loadPrompts()
})
</script>

<style scoped>
.prompts-container {
  padding: 20px;
}
.prompts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>
