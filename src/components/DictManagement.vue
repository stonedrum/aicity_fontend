<template>
  <div class="dicts-management">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>字典类型</span>
              <el-button type="primary" size="small" @click="openAddDictType">新增</el-button>
            </div>
          </template>
          <el-table 
            :data="dictTypes" 
            highlight-current-row 
            @current-change="handleDictTypeChange"
            v-loading="dictTypesLoading"
            size="small"
            style="cursor: pointer"
          >
            <el-table-column prop="type_name" label="编码" />
            <el-table-column prop="description" label="名称" show-overflow-tooltip />
            <el-table-column label="操作" width="130">
              <template #default="{ row }">
                <el-button type="text" size="small" @click.stop="openEditDictType(row)">编辑</el-button>
                <el-button 
                  type="text" 
                  size="small" 
                  style="color: #f56c6c" 
                  @click.stop="handleDeleteDictType(row)"
                  :disabled="row.type_name === 'kb_type'"
                >删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card shadow="never" v-if="selectedDictType">
          <template #header>
            <div class="card-header">
              <span>数据项: {{ selectedDictType.description }} ({{ selectedDictType.type_name }})</span>
              <el-button type="primary" size="small" @click="openAddDictData">新增项</el-button>
            </div>
          </template>
          <el-table :data="selectedDictType.data" v-loading="dictDataLoading" border size="small">
            <el-table-column prop="label" label="名称 (Label)" />
            <el-table-column prop="value" label="值 (Value)" />
            <el-table-column prop="sort_order" label="排序" width="70" align="center" />
            <el-table-column prop="is_active" label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                  {{ row.is_active ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button type="text" size="small" @click="openEditDictData(row)">编辑</el-button>
                <el-button type="text" size="small" style="color: #f56c6c" @click="handleDeleteDictData(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
        <el-empty v-else description="请先选择左侧字典类型" />
      </el-col>
    </el-row>

    <el-dialog v-model="dictTypeDialogVisible" :title="isEditingDictType ? '编辑类型' : '新增类型'" width="400px">
      <el-form :model="dictTypeForm" label-width="80px">
        <el-form-item label="编码">
          <el-input v-model="dictTypeForm.type_name" placeholder="如 kb_type" :disabled="isEditingDictType && dictTypeForm.type_name === 'kb_type'" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="dictTypeForm.description" placeholder="中文名称或描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictTypeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDictType" :loading="dictSaveLoading">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dictDataDialogVisible" :title="isEditingDictData ? '编辑数据项' : '新增数据项'" width="400px">
      <el-form :model="dictDataForm" label-width="100px">
        <el-form-item label="显示名称">
          <el-input v-model="dictDataForm.label" placeholder="如 桥梁" />
        </el-form-item>
        <el-form-item label="存储值">
          <el-input v-model="dictDataForm.value" placeholder="如 bridge" />
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="dictDataForm.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="dictDataForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictDataDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDictData" :loading="dictSaveLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL } from '../api/config'

const props = defineProps({
  authHeaders: Object,
  onDictChange: Function
})

const dictTypes = ref([])
const dictTypesLoading = ref(false)
const selectedDictType = ref(null)
const dictDataLoading = ref(false)
const dictTypeDialogVisible = ref(false)
const isEditingDictType = ref(false)
const dictTypeForm = ref({ id: null, type_name: '', description: '' })
const dictDataDialogVisible = ref(false)
const isEditingDictData = ref(false)
const dictDataForm = ref({ id: null, label: '', value: '', sort_order: 0, is_active: true })
const dictSaveLoading = ref(false)

const loadDictTypes = async () => {
  dictTypesLoading.value = true
  try {
    const res = await axios.get(`${API_BASE_URL}/dict-types`, {
      headers: props.authHeaders
    })
    dictTypes.value = res.data
    if (selectedDictType.value) {
      const updated = dictTypes.value.find(t => t.id === selectedDictType.value.id)
      if (updated) selectedDictType.value = updated
    }
  } catch (err) {
    ElMessage.error('加载字典类型失败')
  } finally {
    dictTypesLoading.value = false
  }
}

const handleDictTypeChange = (val) => {
  selectedDictType.value = val
}

const openAddDictType = () => {
  isEditingDictType.value = false
  dictTypeForm.value = { id: null, type_name: '', description: '' }
  dictTypeDialogVisible.value = true
}

const openEditDictType = (row) => {
  isEditingDictType.value = true
  dictTypeForm.value = { ...row }
  dictTypeDialogVisible.value = true
}

const saveDictType = async () => {
  dictSaveLoading.value = true
  try {
    if (isEditingDictType.value) {
      await axios.put(`${API_BASE_URL}/dict-types/${dictTypeForm.value.id}`, dictTypeForm.value, {
        headers: props.authHeaders
      })
    } else {
      await axios.post(`${API_BASE_URL}/dict-types`, dictTypeForm.value, {
        headers: props.authHeaders
      })
    }
    ElMessage.success('保存成功')
    dictTypeDialogVisible.value = false
    loadDictTypes()
  } catch (err) {
    ElMessage.error('保存失败')
  } finally {
    dictSaveLoading.value = false
  }
}

const handleDeleteDictType = async (row) => {
  if (!confirm(`确定要删除字典类型 "${row.description}" 吗？这会同时删除下属所有数据项！`)) return
  try {
    await axios.delete(`${API_BASE_URL}/dict-types/${row.id}`, {
      headers: props.authHeaders
    })
    ElMessage.success('删除成功')
    if (selectedDictType.value?.id === row.id) selectedDictType.value = null
    loadDictTypes()
  } catch (err) {
    ElMessage.error('删除失败')
  }
}

const openAddDictData = () => {
  isEditingDictData.value = false
  dictDataForm.value = { id: null, label: '', value: '', sort_order: selectedDictType.value.data.length + 1, is_active: true }
  dictDataDialogVisible.value = true
}

const openEditDictData = (row) => {
  isEditingDictData.value = true
  dictDataForm.value = { ...row }
  dictDataDialogVisible.value = true
}

const saveDictData = async () => {
  dictSaveLoading.value = true
  try {
    if (isEditingDictData.value) {
      await axios.put(`${API_BASE_URL}/dict-data/${dictDataForm.value.id}`, dictDataForm.value, {
        headers: props.authHeaders
      })
    } else {
      await axios.post(`${API_BASE_URL}/dict-data/${selectedDictType.value.id}`, dictDataForm.value, {
        headers: props.authHeaders
      })
    }
    ElMessage.success('保存成功')
    dictDataDialogVisible.value = false
    loadDictTypes()
    if (props.onDictChange) props.onDictChange()
  } catch (err) {
    ElMessage.error('保存失败')
  } finally {
    dictSaveLoading.value = false
  }
}

const handleDeleteDictData = async (row) => {
  if (!confirm(`确定要删除数据项 "${row.label}" 吗？`)) return
  try {
    await axios.delete(`${API_BASE_URL}/dict-data/${row.id}`, {
      headers: props.authHeaders
    })
    ElMessage.success('删除成功')
    loadDictTypes()
    if (props.onDictChange) props.onDictChange()
  } catch (err) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  loadDictTypes()
})
</script>

<style scoped>
.dicts-management {
  padding: 10px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dicts-management :deep(.el-table__row) {
  cursor: pointer;
}
</style>
