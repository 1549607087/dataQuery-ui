<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="130px">
      <el-form-item label="审计 ID" prop="auditId">
        <el-input-number v-model="formData.auditId" :min="0" controls-position="right" class="!w-full" />
      </el-form-item>
      <el-form-item label="会话 ID" prop="sessionId">
        <el-input-number v-model="formData.sessionId" :min="0" controls-position="right" class="!w-full" />
      </el-form-item>
      <el-form-item label="用户 ID" prop="userId">
        <el-input-number v-model="formData.userId" :min="0" controls-position="right" class="!w-full" />
      </el-form-item>
      <el-form-item label="评分" prop="rating">
        <el-select v-model="formData.rating" placeholder="请选择评分" class="!w-full">
          <el-option v-for="item in RATING_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="反馈类型" prop="feedbackType">
        <el-input v-model="formData.feedbackType" placeholder="自由填写，如 结果不准 / SQL 错误 / 口径疑问 / 其它" />
      </el-form-item>
      <el-form-item label="文字反馈" prop="comment">
        <el-input v-model="formData.comment" type="textarea" :rows="3" placeholder="用户文字反馈" />
      </el-form-item>
      <el-form-item label="纠正 SQL" prop="correctedSql">
        <el-input v-model="formData.correctedSql" type="textarea" :rows="4" placeholder="用户纠正后的 SQL，仅作参考" />
      </el-form-item>
      <el-form-item label="审核状态" prop="reviewed">
        <el-select v-model="formData.reviewed" placeholder="请选择审核状态" class="!w-full">
          <el-option v-for="item in REVIEW_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="审核人 ID" prop="reviewerId">
        <el-input-number v-model="formData.reviewerId" :min="0" controls-position="right" class="!w-full" />
      </el-form-item>
      <el-form-item label="审核时间" prop="reviewTime">
        <el-date-picker v-model="formData.reviewTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择审核时间" class="!w-full" />
      </el-form-item>
      <el-form-item label="审核备注" prop="reviewRemark">
        <el-input v-model="formData.reviewRemark" type="textarea" :rows="2" placeholder="请输入审核备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { RATING_OPTIONS, REVIEW_STATUS_OPTIONS } from '@/api/dataQuery/constants'
import * as FeedbackApi from '@/api/dataQuery/queryruntime/feedback'

defineOptions({ name: 'DataQueryQueryFeedbackForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()

const defaultForm = (): FeedbackApi.AiQueryFeedbackVO => ({
  id: undefined,
  auditId: undefined,
  sessionId: undefined,
  userId: undefined,
  rating: 5,
  feedbackType: '',
  comment: '',
  correctedSql: '',
  reviewed: 0,
  reviewerId: undefined,
  reviewTime: '',
  reviewRemark: ''
})
const formData = ref<FeedbackApi.AiQueryFeedbackVO>(defaultForm())

const formRules = reactive({
  rating: [{ required: true, message: '评分不能为空', trigger: 'change' }],
  reviewed: [{ required: true, message: '审核状态不能为空', trigger: 'change' }]
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
      formData.value = { ...defaultForm(), ...(await FeedbackApi.getAiQueryFeedback(id)) }
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
      await FeedbackApi.createAiQueryFeedback(data)
      message.success(t('common.createSuccess'))
    } else {
      await FeedbackApi.updateAiQueryFeedback(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
