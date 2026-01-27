<template>
  <div class="system-config">
    <div class="header">
      <h3>系统参数配置</h3>
      <el-alert title="修改 LLM 或 RAG 相关配置后将立即生效，无需重启后端。" type="info" show-icon :closable="false" style="margin-bottom: 20px;" />
    </div>

    <el-table :data="configs" v-loading="loading" border stripe style="width: 100%">
      <el-table-column prop="description" label="配置项" width="200" />
      <el-table-column prop="config_key" label="键名" width="180">
        <template #default="{ row }">
          <code style="color: #409eff;">{{ row.config_key }}</code>
        </template>
      </el-table-column>
      <el-table-column prop="config_value" label="配置值">
        <template #default="{ row }">
          <template v-if="isEditing(row)">
            <el-select v-if="row.config_key === 'system_default_model'" v-model="editForm.config_value" size="small" style="width: 100%">
              <el-option label="模型 A (阿里千问)" value="qwen" />
              <el-option label="模型 B (DeepSeek)" value="deepseek" />
            </el-select>
            <el-input-number 
              v-else-if="['initial_rag_count', 'rerank_count'].includes(row.config_key)"
              v-model="editForm.config_value"
              :min="1" :max="100"
              size="small"
              style="width: 100%"
            />
            <el-input-number 
              v-else-if="['initial_rag_threshold', 'rerank_threshold'].includes(row.config_key)"
              v-model="editForm.config_value"
              :min="0" :max="1" :step="0.1"
              size="small"
              style="width: 100%"
            />
            <el-input 
              v-else
              v-model="editForm.config_value" 
              :type="isKey(row) ? 'password' : 'text'"
              show-password
              size="small" 
            />
          </template>
          <span v-else>
            <template v-if="row.config_key === 'system_default_model'">
              {{ row.config_value === 'qwen' ? '模型 A (阿里千问)' : '模型 B (DeepSeek)' }}
            </template>
            <template v-else-if="['initial_rag_count', 'rerank_count'].includes(row.config_key)">
              {{ row.config_value }} (条)
            </template>
            <template v-else-if="['initial_rag_threshold', 'rerank_threshold'].includes(row.config_key)">
              {{ row.config_value }}
            </template>
            <template v-else>
              {{ isKey(row) ? '********' : row.config_value }}
            </template>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <template v-if="isEditing(row)">
            <el-button size="small" type="primary" @click="saveEdit(row)">保存</el-button>
            <el-button size="small" @click="cancelEdit">取消</el-button>
          </template>
          <el-button v-else size="small" @click="startEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL } from '../api/config'

const props = defineProps({
  token: String
})

const configs = ref([])
const loading = ref(false)
const editingKey = ref(null)
const editForm = ref({ config_value: '' })

const isEditing = (row) => editingKey.value === row.config_key
const isKey = (row) => row.config_key.includes('api_key')

const loadConfigs = async () => {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE_URL}/configs`, {
      headers: { Authorization: `Bearer ${props.token}` }
    })
    configs.value = res.data
  } catch (err) {
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

const startEdit = (row) => {
  editingKey.value = row.config_key
  const val = row.config_value
  // 如果是数字类型的配置，转为数字供 el-input-number 使用
  if (['initial_rag_count', 'rerank_count'].includes(row.config_key)) {
    editForm.value.config_value = parseInt(val) || 0
  } else if (['initial_rag_threshold', 'rerank_threshold'].includes(row.config_key)) {
    editForm.value.config_value = parseFloat(val) || 0
  } else {
    editForm.value.config_value = val
  }
}

const cancelEdit = () => {
  editingKey.value = null
}

const saveEdit = async (row) => {
  try {
    // 确保发送到后端的是字符串，因为后端 Schema 要求是 string
    await axios.put(`${API_BASE_URL}/configs/${row.config_key}`, {
      config_value: String(editForm.value.config_value)
    }, {
      headers: { Authorization: `Bearer ${props.token}` }
    })
    ElMessage.success('配置已更新')
    editingKey.value = null
    loadConfigs()
  } catch (err) {
    ElMessage.error(err.response?.data?.detail || '更新失败')
  }
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.system-config {
  padding: 10px;
}
.header {
  margin-bottom: 20px;
}
</style>
