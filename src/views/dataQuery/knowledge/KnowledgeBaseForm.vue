<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="640px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="110px">
      <el-form-item label="知识库名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入知识库名称" maxlength="128" show-word-limit />
      </el-form-item>
      <el-form-item label="业务编码" prop="code">
        <el-input
          v-model="formData.code"
          placeholder="租户内唯一，只允许字母、数字、下划线、短横线"
          maxlength="64"
          show-word-limit
          :disabled="formType === 'update'"
        />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          maxlength="512"
          show-word-limit
          placeholder="请输入知识库描述"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="formData.status" class="!w-full">
          <el-option v-for="item in KNOWLEDGE_BASE_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <span class="ml-8px text-12px text-gray-400">停用后该库不参与检索</span>
      </el-form-item>
      <el-form-item label="向量模型代号">
        <el-input
          :model-value="formData.embeddingModelCode || '系统写入（暂无）'"
          disabled
          class="!w-full"
        />
        <div class="text-12px text-gray-400">
          运行时指纹（provider.code:model_id:dimension），在文档上传 / 向量重建时由服务端写入；创建 / 更新接口不接受，此处只读
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { KNOWLEDGE_BASE_STATUS_OPTIONS } from '@/api/dataQuery/constants'
import * as KnowledgeBaseApi from '@/api/dataQuery/knowledge'

defineOptions({ name: 'DataQueryKnowledgeBaseForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()

const defaultForm = (): KnowledgeBaseApi.AiKnowledgeBaseVO => ({
  id: undefined,
  name: '',
  code: '',
  description: '',
  status: 0,
  // 后端维护字段：仅回显展示，不提交
  documentCount: 0,
  chunkCount: 0,
  embeddingModelCode: '',
  creator: '',
  createTime: undefined
})
const formData = ref<KnowledgeBaseApi.AiKnowledgeBaseVO>(defaultForm())

const formRules = reactive({
  name: [{ required: true, message: '知识库名称不能为空', trigger: 'blur' }],
  code: [
    { required: true, message: '业务编码不能为空', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '业务编码只能包含字母、数字、下划线、短横线', trigger: 'blur' }
  ],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await KnowledgeBaseApi.getAiKnowledgeBase(id)) }
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open })

const emit = defineEmits(['success'])
const submitForm = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return
  formLoading.value = true
  try {
    // 只提交 SaveReqVO 声明的字段；
    // embeddingModelCode 已由后端改为系统写入（SaveReqVO 无此字段），连同其它后端维护字段一并剔除
    const f = formData.value
    const data: KnowledgeBaseApi.AiKnowledgeBaseVO = {
      id: f.id,
      name: f.name,
      code: f.code,
      description: f.description,
      status: f.status
    }
    if (formType.value === 'create') {
      await KnowledgeBaseApi.createAiKnowledgeBase(data)
      message.success(t('common.createSuccess'))
    } else {
      await KnowledgeBaseApi.updateAiKnowledgeBase(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
