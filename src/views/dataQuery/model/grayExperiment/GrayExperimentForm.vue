<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="760px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="150px">
      <el-divider content-position="left">基础配置</el-divider>
      <el-form-item label="实验名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入实验名称" />
      </el-form-item>
      <el-form-item label="灰度变量" prop="grayObject">
        <el-radio-group v-model="formData.grayObject">
          <el-radio v-for="item in GRAY_OBJECT_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
        </el-radio-group>
        <span class="ml-8px text-12px text-gray-400">一次实验只切换一个变量</span>
      </el-form-item>
      <el-form-item label="生效场景" prop="sceneCode">
        <el-select v-model="formData.sceneCode" placeholder="请选择场景" filterable class="!w-full">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="场景绑定" prop="bindingId">
        <el-select v-model="formData.bindingId" placeholder="0 表示不绑定" class="!w-full">
          <el-option :label="'不绑定'" :value="0" />
          <el-option v-for="item in bindingOptions" :key="item.id" :label="`${item.sceneName} (${item.sceneCode})`" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="灰度比例（%）" prop="grayRatio">
        <el-input-number v-model="formData.grayRatio" :min="0" :max="100" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">建议从 5 起步</span>
      </el-form-item>
      <el-form-item label="分桶维度" prop="bucketKey">
        <el-select v-model="formData.bucketKey" placeholder="请选择" class="!w-full">
          <el-option v-for="item in BUCKET_KEY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="formData.status" placeholder="请选择状态" class="!w-full">
          <el-option v-for="item in EXPERIMENT_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">对照组 A / 灰度组 B</el-divider>
      <el-form-item label="对照组 A 模型" prop="baselineModelId">
        <el-select v-model="formData.baselineModelId" placeholder="请选择模型" :disabled="!isModelGray" filterable class="!w-full">
          <el-option :label="'未设置'" :value="0" />
          <el-option v-for="item in modelOptions" :key="item.id" :label="`${item.name} (${item.modelId})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="灰度组 B 模型" prop="grayModelId">
        <el-select v-model="formData.grayModelId" placeholder="请选择模型" :disabled="!isModelGray" filterable class="!w-full">
          <el-option :label="'未设置'" :value="0" />
          <el-option v-for="item in modelOptions" :key="item.id" :label="`${item.name} (${item.modelId})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="对照组 A 提示词" prop="baselinePromptId">
        <el-select v-model="formData.baselinePromptId" placeholder="请选择提示词" :disabled="isModelGray" filterable class="!w-full">
          <el-option :label="'未设置'" :value="0" />
          <el-option v-for="item in promptOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="灰度组 B 提示词" prop="grayPromptId">
        <el-select v-model="formData.grayPromptId" placeholder="请选择提示词" :disabled="isModelGray" filterable class="!w-full">
          <el-option :label="'未设置'" :value="0" />
          <el-option v-for="item in promptOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">时间与指标</el-divider>
      <el-form-item label="开始时间" prop="startTime">
        <el-date-picker v-model="formData.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="留空表示不限制" class="!w-full" />
      </el-form-item>
      <el-form-item label="结束时间" prop="endTime">
        <el-date-picker v-model="formData.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="留空表示不限制" class="!w-full" />
      </el-form-item>
      <el-form-item label="每组最小样本量" prop="minSampleSize">
        <el-input-number v-model="formData.minSampleSize" :min="0" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">未达标不允许下结论</span>
      </el-form-item>
      <el-form-item label="观察指标" prop="metrics">
        <el-input v-model="formData.metrics" type="textarea" :rows="2" placeholder="JSON，如 [&quot;sql_executable_rate&quot;,&quot;p95_latency_ms&quot;]" />
      </el-form-item>
      <el-form-item label="实验结论" prop="conclusion">
        <el-input v-model="formData.conclusion" type="textarea" :rows="2" placeholder="实验结束后填写" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="formData.sort" :min="0" controls-position="right" />
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
import {
  BUCKET_KEY_OPTIONS,
  EXPERIMENT_STATUS_OPTIONS,
  GRAY_OBJECT_OPTIONS,
  SCENE_OPTIONS
} from '@/api/dataQuery/constants'
import * as ExperimentApi from '@/api/dataQuery/model/grayExperiment'
import * as BindingApi from '@/api/dataQuery/model/sceneBinding'
import * as ConfigApi from '@/api/dataQuery/model/config'
import * as PromptApi from '@/api/dataQuery/prompt/template'

defineOptions({ name: 'DataQueryModelGrayExperimentForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const bindingOptions = ref<BindingApi.AiModelSceneBindingVO[]>([])
const modelOptions = ref<ConfigApi.AiModelConfigSimpleVO[]>([])
const promptOptions = ref<PromptApi.AiPromptSimpleVO[]>([])

const defaultForm = (): ExperimentApi.AiModelGrayExperimentVO => ({
  id: undefined,
  name: '',
  grayObject: 'MODEL',
  sceneCode: '',
  bindingId: undefined,
  baselineModelId: undefined,
  grayModelId: undefined,
  baselinePromptId: undefined,
  grayPromptId: undefined,
  grayRatio: 5,
  bucketKey: 'USER',
  startTime: undefined,
  endTime: undefined,
  minSampleSize: 100,
  metrics: '',
  status: 0,
  conclusion: '',
  sort: 0,
  remark: ''
})
const formData = ref<ExperimentApi.AiModelGrayExperimentVO>(defaultForm())
const isModelGray = computed(() => formData.value.grayObject === 'MODEL')

const formRules = reactive({
  name: [{ required: true, message: '实验名称不能为空', trigger: 'blur' }],
  grayObject: [{ required: true, message: '灰度变量不能为空', trigger: 'change' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!modelOptions.value.length) {
    const [bindings, models, prompts] = await Promise.all([
      BindingApi.getAiModelSceneBindingPage({ pageNo: 1, pageSize: 100 }),
      ConfigApi.getAiModelConfigSimpleList(),
      PromptApi.getAiPromptSimpleList()
    ])
    bindingOptions.value = bindings.list
    modelOptions.value = models
    promptOptions.value = prompts
  }
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await ExperimentApi.getAiModelGrayExperiment(id)) }
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
  if (isModelGray.value && (!formData.value.baselineModelId || !formData.value.grayModelId)) {
    message.warning('模型灰度实验需要同时指定对照组与灰度组模型')
    return
  }
  if (!isModelGray.value && (!formData.value.baselinePromptId || !formData.value.grayPromptId)) {
    message.warning('提示词灰度实验需要同时指定对照组与灰度组提示词')
    return
  }
  formLoading.value = true
  try {
    const f = formData.value
    const data: ExperimentApi.AiModelGrayExperimentVO = {
      id: f.id,
      name: f.name,
      grayObject: f.grayObject,
      sceneCode: f.sceneCode,
      bindingId: f.bindingId,
      baselineModelId: f.baselineModelId,
      grayModelId: f.grayModelId,
      baselinePromptId: f.baselinePromptId,
      grayPromptId: f.grayPromptId,
      grayRatio: f.grayRatio,
      bucketKey: f.bucketKey,
      startTime: f.startTime,
      endTime: f.endTime,
      minSampleSize: f.minSampleSize,
      metrics: f.metrics,
      status: f.status,
      conclusion: f.conclusion,
      sort: f.sort,
      remark: f.remark
    }
    if (formType.value === 'create') {
      await ExperimentApi.createAiModelGrayExperiment(data)
      message.success(t('common.createSuccess'))
    } else {
      await ExperimentApi.updateAiModelGrayExperiment(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
