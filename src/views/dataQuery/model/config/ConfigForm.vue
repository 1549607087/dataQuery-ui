<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="150px"
    >
      <el-form-item label="所属供应商" prop="providerId">
        <el-select v-model="formData.providerId" placeholder="请选择供应商" class="!w-full">
          <el-option
            v-for="item in providerOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="模型显示名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入模型显示名称" />
      </el-form-item>
      <el-form-item label="模型标识" prop="modelId">
        <el-input v-model="formData.modelId" placeholder="调用时使用，如 qwen-plus / gpt-4o" />
      </el-form-item>
      <el-form-item label="模型类型" prop="modelType">
        <el-select
          v-model="formData.modelType"
          placeholder="请选择模型类型"
          class="!w-full"
          @change="handleModelTypeChange"
        >
          <el-option
            v-for="item in MODEL_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="协议" prop="protocol">
        <el-select
          v-model="formData.protocol"
          :disabled="formData.modelType !== 3"
          placeholder="请选择协议"
          class="!w-full"
        >
          <el-option
            v-for="item in protocolOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <span class="ml-8px text-12px text-gray-400">
          {{
            formData.modelType === 3 ? '重排可选 COHERE / DASHSCOPE' : '固定按 OpenAI 兼容格式调用'
          }}
        </span>
      </el-form-item>
      <el-form-item label="能力标签" prop="capability">
        <el-input
          v-model="formData.capability"
          placeholder="JSON，如 [&quot;streaming&quot;,&quot;function_call&quot;]"
        />
      </el-form-item>
      <el-form-item label="上下文窗口" prop="contextWindow">
        <el-input-number
          v-model="formData.contextWindow"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="最大输出 Token" prop="maxOutputTokens">
        <el-input-number
          v-model="formData.maxOutputTokens"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="默认参数" prop="defaultParams">
        <el-input
          v-model="formData.defaultParams"
          type="textarea"
          :rows="2"
          placeholder="JSON，如 {&quot;temperature&quot;:0.2,&quot;top_p&quot;:0.8}"
        />
      </el-form-item>
      <el-form-item label="支持流式" prop="supportStream">
        <el-radio-group v-model="formData.supportStream">
          <el-radio :value="1">是</el-radio>
          <el-radio :value="0">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="输入单价（元/百万 Token）" prop="inputPrice">
        <el-input-number
          v-model="formData.inputPrice"
          :min="0"
          :precision="4"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="输出单价（元/百万 Token）" prop="outputPrice">
        <el-input-number
          v-model="formData.outputPrice"
          :min="0"
          :precision="4"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="币种" prop="currency">
        <el-input v-model="formData.currency" placeholder="CNY" />
      </el-form-item>
      <el-form-item label="QPS 上限" prop="qpsLimit">
        <el-input-number
          v-model="formData.qpsLimit"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
        <span class="ml-8px text-12px text-gray-400">0 表示不限</span>
      </el-form-item>
      <el-form-item label="并发上限" prop="concurrentLimit">
        <el-input-number
          v-model="formData.concurrentLimit"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="超时（毫秒）" prop="timeoutMs">
        <el-input-number
          v-model="formData.timeoutMs"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="失败重试次数" prop="retryCount">
        <el-input-number
          v-model="formData.retryCount"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>

      <el-divider content-position="left">熔断策略</el-divider>
      <el-form-item label="启用熔断" prop="circuitEnabled">
        <el-radio-group v-model="formData.circuitEnabled">
          <el-radio :value="1">是</el-radio>
          <el-radio :value="0">否</el-radio>
        </el-radio-group>
        <span class="ml-8px text-12px text-gray-400">默认关闭，避免升级后误伤</span>
      </el-form-item>
      <el-form-item label="失败率阈值（%）" prop="circuitFailureRate">
        <el-input-number
          v-model="formData.circuitFailureRate"
          :min="0"
          :max="100"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="窗口最小样本" prop="circuitMinSample">
        <el-input-number
          v-model="formData.circuitMinSample"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
        <span class="ml-8px text-12px text-gray-400">不足则不熔断，防止小样本误判</span>
      </el-form-item>
      <el-form-item label="统计窗口（秒）" prop="circuitWindowSeconds">
        <el-input-number
          v-model="formData.circuitWindowSeconds"
          :min="1"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="OPEN 时长（秒）" prop="circuitOpenSeconds">
        <el-input-number
          v-model="formData.circuitOpenSeconds"
          :min="1"
          controls-position="right"
          class="!w-full"
        />
        <span class="ml-8px text-12px text-gray-400">到期自动进入 HALF_OPEN</span>
      </el-form-item>
      <el-form-item label="半开探测数" prop="circuitHalfOpenProbes">
        <el-input-number
          v-model="formData.circuitHalfOpenProbes"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="熔断维度键" prop="circuitKey">
        <el-input
          v-model="formData.circuitKey"
          placeholder="留空由后端按 provider_id:model_config_id 生成"
        />
      </el-form-item>

      <el-divider content-position="left">重试退避</el-divider>
      <el-form-item label="可重试错误" prop="retryableErrors">
        <el-input
          v-model="formData.retryableErrors"
          placeholder="逗号分隔，401 / 400 / CONTENT_FILTER 绝不重试"
        />
      </el-form-item>
      <el-form-item label="退避基数（ms）" prop="retryBaseBackoffMs">
        <el-input-number
          v-model="formData.retryBaseBackoffMs"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="退避上限（ms）" prop="retryMaxBackoffMs">
        <el-input-number
          v-model="formData.retryMaxBackoffMs"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="抖动系数" prop="retryJitterRatio">
        <el-input-number
          v-model="formData.retryJitterRatio"
          :min="0"
          :max="1"
          :precision="2"
          controls-position="right"
          class="!w-full"
        />
        <span class="ml-8px text-12px text-gray-400">0.00-1.00，建议 0.30</span>
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio v-for="item in GRAY_STATUS" :key="item.value" :value="item.value">{{
            item.label
          }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="灰度比例（%）" prop="grayRatio">
        <el-input-number
          v-model="formData.grayRatio"
          :min="0"
          :max="100"
          controls-position="right"
        />
        <span class="ml-8px text-12px text-gray-400">仅状态为灰度时生效</span>
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
  GRAY_STATUS,
  MODEL_TYPE_DEFAULT_PROTOCOL,
  MODEL_TYPE_OPTIONS,
  OPENAI_PROTOCOL_OPTIONS,
  RERANK_PROTOCOL_OPTIONS
} from '@/api/dataQuery/constants'
import * as ConfigApi from '@/api/dataQuery/model/config'
import * as ProviderApi from '@/api/dataQuery/model/provider'

defineOptions({ name: 'DataQueryModelConfigForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const providerOptions = ref<ProviderApi.AiModelProviderSimpleVO[]>([])

const defaultForm = (): ConfigApi.AiModelConfigVO => ({
  id: undefined,
  providerId: undefined,
  name: '',
  modelId: '',
  modelType: 1,
  protocol: 'OPENAI',
  capability: '',
  contextWindow: 0,
  maxOutputTokens: 0,
  defaultParams: '',
  supportStream: 1,
  inputPrice: 0,
  outputPrice: 0,
  currency: 'CNY',
  qpsLimit: 0,
  concurrentLimit: 0,
  timeoutMs: 60000,
  retryCount: 2,
  circuitEnabled: 0,
  circuitFailureRate: 50,
  circuitMinSample: 20,
  circuitWindowSeconds: 60,
  circuitOpenSeconds: 30,
  circuitHalfOpenProbes: 3,
  circuitKey: '',
  retryableErrors: '429,5xx,TIMEOUT,CONNECT',
  retryBaseBackoffMs: 200,
  retryMaxBackoffMs: 2000,
  retryJitterRatio: 0.3,
  status: 0,
  grayRatio: 0,
  sort: 0,
  remark: ''
})
const formData = ref<ConfigApi.AiModelConfigVO>(defaultForm())

const formRules = reactive({
  providerId: [{ required: true, message: '所属供应商不能为空', trigger: 'change' }],
  name: [{ required: true, message: '模型显示名称不能为空', trigger: 'blur' }],
  modelId: [{ required: true, message: '模型标识不能为空', trigger: 'blur' }],
  modelType: [{ required: true, message: '模型类型不能为空', trigger: 'change' }],
  protocol: [{ required: true, message: '协议不能为空', trigger: 'change' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

/** Rerank 才允许在 COHERE / DASHSCOPE 间切换，其余类型固定 OPENAI */
const protocolOptions = computed(() =>
  formData.value.modelType === 3 ? RERANK_PROTOCOL_OPTIONS : OPENAI_PROTOCOL_OPTIONS
)

/** 切换模型类型时自动带入默认协议（仅用户手动切换触发，编辑回填不覆盖已有协议） */
const handleModelTypeChange = (modelType: number) => {
  formData.value.protocol = MODEL_TYPE_DEFAULT_PROTOCOL[modelType] || 'OPENAI'
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!providerOptions.value.length) {
    providerOptions.value = await ProviderApi.getAiModelProviderSimpleList()
  }
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await ConfigApi.getAiModelConfig(id)) }
      // 存量数据协议为空时按模型类型补默认值，避免下拉空白
      if (!formData.value.protocol) {
        formData.value.protocol = MODEL_TYPE_DEFAULT_PROTOCOL[formData.value.modelType] || 'OPENAI'
      }
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
    // 只提交 SaveReqVO 声明的字段；healthStatus / lastCheck* / createTime 由后端维护
    const f = formData.value
    const data: ConfigApi.AiModelConfigVO = {
      id: f.id,
      providerId: f.providerId,
      name: f.name,
      modelId: f.modelId,
      modelType: f.modelType,
      protocol: f.protocol,
      capability: f.capability,
      contextWindow: f.contextWindow,
      maxOutputTokens: f.maxOutputTokens,
      defaultParams: f.defaultParams,
      supportStream: f.supportStream,
      inputPrice: f.inputPrice,
      outputPrice: f.outputPrice,
      currency: f.currency,
      qpsLimit: f.qpsLimit,
      concurrentLimit: f.concurrentLimit,
      timeoutMs: f.timeoutMs,
      retryCount: f.retryCount,
      circuitEnabled: f.circuitEnabled,
      circuitFailureRate: f.circuitFailureRate,
      circuitMinSample: f.circuitMinSample,
      circuitWindowSeconds: f.circuitWindowSeconds,
      circuitOpenSeconds: f.circuitOpenSeconds,
      circuitHalfOpenProbes: f.circuitHalfOpenProbes,
      circuitKey: f.circuitKey,
      retryableErrors: f.retryableErrors,
      retryBaseBackoffMs: f.retryBaseBackoffMs,
      retryMaxBackoffMs: f.retryMaxBackoffMs,
      retryJitterRatio: f.retryJitterRatio,
      status: f.status,
      grayRatio: f.grayRatio,
      sort: f.sort,
      remark: f.remark
    }
    if (formType.value === 'create') {
      await ConfigApi.createAiModelConfig(data)
      message.success(t('common.createSuccess'))
    } else {
      await ConfigApi.updateAiModelConfig(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
