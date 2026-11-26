<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="130px">
      <el-form-item label="用户 ID" prop="userId">
        <el-input-number v-model="formData.userId" :min="0" controls-position="right" class="!w-full" />
      </el-form-item>
      <el-form-item label="数据源 ID" prop="datasourceId">
        <el-input-number v-model="formData.datasourceId" :min="0" controls-position="right" class="!w-full" />
      </el-form-item>
      <el-form-item label="会话标题" prop="title">
        <el-input v-model="formData.title" placeholder="请输入会话标题" />
      </el-form-item>
      <el-form-item label="会话编号" prop="sessionNo">
        <el-input v-model="formData.sessionNo" placeholder="租户内唯一，便于检索与引用" />
      </el-form-item>
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="formData.sceneCode" placeholder="请选择场景编码" filterable class="!w-full">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="formData.status" placeholder="请选择状态" class="!w-full">
          <el-option v-for="item in QUERY_SESSION_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="消息数" prop="messageCount">
        <el-input-number v-model="formData.messageCount" :min="0" controls-position="right" class="!w-full" />
      </el-form-item>
      <el-form-item label="最近问题" prop="lastQuestion">
        <el-input v-model="formData.lastQuestion" type="textarea" :rows="2" placeholder="最近一次用户问题，用于会话列表预览" />
      </el-form-item>
      <el-form-item label="最近提问时间" prop="lastAskTime">
        <el-date-picker v-model="formData.lastAskTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择最近提问时间" class="!w-full" />
      </el-form-item>
      <el-form-item label="链路 ID" prop="traceId">
        <el-input v-model="formData.traceId" placeholder="请输入 traceId" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { QUERY_SESSION_STATUS_OPTIONS, SCENE_OPTIONS } from '@/api/dataQuery/constants'
import * as SessionApi from '@/api/dataQuery/queryruntime/session'

defineOptions({ name: 'DataQueryQuerySessionForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()

const defaultForm = (): SessionApi.AiQuerySessionVO => ({
  id: undefined,
  userId: undefined,
  datasourceId: undefined,
  title: '',
  sessionNo: '',
  sceneCode: '',
  status: 1,
  messageCount: 0,
  lastQuestion: '',
  lastAskTime: '',
  traceId: '',
  remark: ''
})
const formData = ref<SessionApi.AiQuerySessionVO>(defaultForm())

const formRules = reactive({
  title: [{ required: true, message: '会话标题不能为空', trigger: 'blur' }],
  sessionNo: [{ required: true, message: '会话编号不能为空', trigger: 'blur' }],
  sceneCode: [{ required: true, message: '场景编码不能为空', trigger: 'change' }],
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
      formData.value = { ...defaultForm(), ...(await SessionApi.getAiQuerySession(id)) }
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
    const data = { ...formData.value }
    delete data.createTime
    if (formType.value === 'create') {
      await SessionApi.createAiQuerySession(data)
      message.success(t('common.createSuccess'))
    } else {
      await SessionApi.updateAiQuerySession(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
