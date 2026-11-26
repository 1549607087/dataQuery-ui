<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="150px">
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="formData.sceneCode" placeholder="请选择场景编码" filterable class="!w-full" @change="handleSceneChange">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="场景名称" prop="sceneName">
        <el-input v-model="formData.sceneName" placeholder="请输入场景名称" />
      </el-form-item>
      <el-form-item label="主模型" prop="primaryModelId">
        <el-select v-model="formData.primaryModelId" placeholder="请选择主模型" class="!w-full">
          <el-option v-for="item in modelOptions" :key="item.id" :label="`${item.name} (${item.modelId})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="降级链" prop="fallbackModelIds">
        <el-input v-model="formData.fallbackModelIds" placeholder="模型 ID，逗号分隔，按顺序尝试" />
      </el-form-item>
      <el-form-item label="路由策略" prop="routeStrategy">
        <el-select v-model="formData.routeStrategy" placeholder="请选择路由策略" class="!w-full">
          <el-option v-for="item in ROUTE_STRATEGY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="绑定提示词" prop="promptId">
        <el-select v-model="formData.promptId" placeholder="0 表示跟随场景路由取模板" clearable class="!w-full">
          <el-option :label="'跟随场景路由'" :value="0" />
          <el-option v-for="item in promptOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="温度覆盖" prop="temperatureOverride">
        <el-input-number v-model="formData.temperatureOverride" :min="0" :max="2" :precision="2" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">留空则使用模型默认值</span>
      </el-form-item>

      <el-divider content-position="left">场景级覆盖（留空 = 继承模型默认）</el-divider>
      <el-form-item label="超时（ms）" prop="timeoutMsOverride">
        <el-input-number v-model="formData.timeoutMsOverride" :min="0" controls-position="right" class="!w-200px" />
        <span class="ml-8px text-12px text-gray-400">交互式 SQL_GEN 建议 4000~8000</span>
      </el-form-item>
      <el-form-item label="QPS 上限" prop="qpsLimitOverride">
        <el-input-number v-model="formData.qpsLimitOverride" :min="0" controls-position="right" class="!w-200px" />
        <span class="ml-8px text-12px text-gray-400">0 表示不限</span>
      </el-form-item>
      <el-form-item label="并发上限" prop="concurrentLimitOverride">
        <el-input-number v-model="formData.concurrentLimitOverride" :min="0" controls-position="right" class="!w-200px" />
      </el-form-item>
      <el-form-item label="重试次数" prop="retryCountOverride">
        <el-input-number v-model="formData.retryCountOverride" :min="0" controls-position="right" class="!w-200px" />
      </el-form-item>

      <el-divider content-position="left">降级与灰度</el-divider>
      <el-form-item label="强制跨供应商" prop="fallbackCrossProvider">
        <el-radio-group v-model="formData.fallbackCrossProvider">
          <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
        </el-radio-group>
        <span class="ml-8px text-12px text-gray-400">同供应商双模型等于没降级</span>
      </el-form-item>
      <el-form-item label="最大降级深度" prop="fallbackMaxDepth">
        <el-input-number v-model="formData.fallbackMaxDepth" :min="0" controls-position="right" />
      </el-form-item>
      <el-form-item label="灰度比例（%）" prop="grayRatio">
        <el-input-number v-model="formData.grayRatio" :min="0" :max="100" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">优先于模型配置，一次只灰度一个变量</span>
      </el-form-item>
      <el-form-item label="分桶维度" prop="grayBucketKey">
        <el-select v-model="formData.grayBucketKey" placeholder="请选择" class="!w-full">
          <el-option v-for="item in BUCKET_KEY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="灰度实验编号" prop="grayExperimentId">
        <el-input-number v-model="formData.grayExperimentId" :min="0" :controls="false" class="!w-220px" />
        <span class="ml-8px text-12px text-gray-400">0 表示无实验</span>
      </el-form-item>

      <el-form-item label="是否启用" prop="enabled">
        <el-radio-group v-model="formData.enabled">
          <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
        </el-radio-group>
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
import { BUCKET_KEY_OPTIONS, ROUTE_STRATEGY_OPTIONS, SCENE_OPTIONS, YES_NO_OPTIONS } from '@/api/dataQuery/constants'
import * as BindingApi from '@/api/dataQuery/model/sceneBinding'
import * as ConfigApi from '@/api/dataQuery/model/config'
import * as PromptApi from '@/api/dataQuery/prompt/template'

defineOptions({ name: 'DataQueryModelSceneBindingForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const modelOptions = ref<ConfigApi.AiModelConfigSimpleVO[]>([])
const promptOptions = ref<PromptApi.AiPromptSimpleVO[]>([])

const defaultForm = (): BindingApi.AiModelSceneBindingVO => ({
  id: undefined,
  sceneCode: '',
  sceneName: '',
  primaryModelId: undefined,
  fallbackModelIds: '',
  routeStrategy: 1,
  promptId: undefined,
  temperatureOverride: undefined,
  timeoutMsOverride: undefined,
  qpsLimitOverride: undefined,
  concurrentLimitOverride: undefined,
  retryCountOverride: undefined,
  fallbackCrossProvider: 1,
  fallbackMaxDepth: 2,
  grayRatio: 0,
  grayBucketKey: 'TENANT',
  grayExperimentId: undefined,
  enabled: 1,
  sort: 0,
  remark: ''
})
const formData = ref<BindingApi.AiModelSceneBindingVO>(defaultForm())

const formRules = reactive({
  sceneCode: [{ required: true, message: '场景编码不能为空', trigger: 'change' }],
  sceneName: [{ required: true, message: '场景名称不能为空', trigger: 'blur' }],
  primaryModelId: [{ required: true, message: '主模型不能为空', trigger: 'change' }],
  routeStrategy: [{ required: true, message: '路由策略不能为空', trigger: 'change' }]
})

/** 选场景时自动带出中文名，减少手工录入 */
const handleSceneChange = (value: string) => {
  if (!formData.value.sceneName) {
    formData.value.sceneName = SCENE_OPTIONS.find((item) => item.value === value)?.label || ''
  }
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!modelOptions.value.length) {
    modelOptions.value = await ConfigApi.getAiModelConfigSimpleList()
    promptOptions.value = await PromptApi.getAiPromptSimpleList()
  }
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await BindingApi.getAiModelSceneBinding(id)) }
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
    const data = formData.value
    if (formType.value === 'create') {
      await BindingApi.createAiModelSceneBinding(data)
      message.success(t('common.createSuccess'))
    } else {
      await BindingApi.updateAiModelSceneBinding(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
