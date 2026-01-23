<template>
  <div class="upload-container">
    <el-form label-width="100px" style="margin-bottom: 20px;">
      <el-form-item label="知识库类型">
        <el-select v-model="uploadKbType" placeholder="请选择知识库类型" style="width: 200px;">
          <el-option
            v-for="item in kbTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <el-upload
      class="upload-demo"
      drag
      :action="`${API_BASE_URL}/upload`"
      :headers="authHeaders"
      :data="{ kb_type: uploadKbType }"
      :on-success="onUploadSuccess"
      accept=".pdf"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        将文件拖到此处，或<em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">仅支持 PDF 文件</div>
      </template>
    </el-upload>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { API_BASE_URL } from '../api/config'

const props = defineProps({
  kbTypeOptions: {
    type: Array,
    default: () => []
  },
  authHeaders: {
    type: Object,
    required: true
  }
})

const uploadKbType = ref(props.kbTypeOptions.length > 0 ? props.kbTypeOptions[0].value : 'bridge')

const onUploadSuccess = () => {
  ElMessage.success('文件上传并解析成功')
}
</script>

<style scoped>
.upload-container {
  padding: 20px;
}
</style>
