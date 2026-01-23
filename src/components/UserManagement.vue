<template>
  <div class="user-management">
    <div class="header">
      <h3>用户管理</h3>
      <el-button type="primary" icon="Plus" @click="openAddDialog">新增用户</el-button>
    </div>

    <el-table :data="users" v-loading="loading" border stripe style="width: 100%">
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="getRoleTagType(row.role)">{{ getRoleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button size="small" type="warning" @click="handleResetPassword(row)">重置密码</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)" :disabled="row.username === currentUsername">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 15, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadUsers"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="400px">
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="userForm.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="系统管理员" value="sysadmin" />
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" v-if="!isEdit">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { API_BASE_URL } from '../api/config'

const props = defineProps({
  token: String
})

const currentUsername = localStorage.getItem('username')
const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const loading = ref(false)

const dialogVisible = ref(false)
const isEdit = ref(false)
const userForm = ref({
  id: '',
  username: '',
  role: 'user',
  password: ''
})

const getRoleLabel = (role) => {
  const map = {
    sysadmin: '系统管理员',
    admin: '管理员',
    user: '普通用户'
  }
  return map[role] || role
}

const getRoleTagType = (role) => {
  const map = {
    sysadmin: 'danger',
    admin: 'warning',
    user: 'info'
  }
  return map[role] || ''
}

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE_URL}/users`, {
      params: { page: page.value, page_size: pageSize.value },
      headers: { Authorization: `Bearer ${props.token}` }
    })
    users.value = res.data.items
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (val) => {
  pageSize.value = val
  page.value = 1
  loadUsers()
}

const openAddDialog = () => {
  isEdit.value = false
  userForm.value = { username: '', role: 'user', password: '' }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  userForm.value = { ...row }
  dialogVisible.value = true
}

const saveUser = async () => {
  try {
    if (isEdit.value) {
      await axios.put(`${API_BASE_URL}/users/${userForm.value.id}`, {
        role: userForm.value.role
      }, {
        headers: { Authorization: `Bearer ${props.token}` }
      })
      ElMessage.success('更新成功')
    } else {
      await axios.post(`${API_BASE_URL}/users`, userForm.value, {
        headers: { Authorization: `Bearer ${props.token}` }
      })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadUsers()
  } catch (err) {
    ElMessage.error(err.response?.data?.detail || '操作失败')
  }
}

const handleResetPassword = (row) => {
  ElMessageBox.confirm(`确定要重置用户 ${row.username} 的密码为 123456 吗？`, '警告', {
    type: 'warning'
  }).then(async () => {
    try {
      await axios.post(`${API_BASE_URL}/users/${row.id}/reset-password`, {}, {
        headers: { Authorization: `Bearer ${props.token}` }
      })
      ElMessage.success('密码重置成功')
    } catch (err) {
      ElMessage.error('重置失败')
    }
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除用户 ${row.username} 吗？`, '危险', {
    type: 'error'
  }).then(async () => {
    try {
      await axios.delete(`${API_BASE_URL}/users/${row.id}`, {
        headers: { Authorization: `Bearer ${props.token}` }
      })
      ElMessage.success('删除成功')
      loadUsers()
    } catch (err) {
      ElMessage.error(err.response?.data?.detail || '删除失败')
    }
  })
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
