<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="150px">
      <el-form-item label="场景绑定" prop="bindingId">
        <el-select v-model="formData.bindingId" placeholder="请选择场景绑定" filterable class="!w-full">
          <el-option v-for="item in bindingOptions" :key="item.id" :label="`${item.sceneName} (${item.sceneCode})`" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="候选模型" prop="modelId">
        <el-select v-model="formData.modelId" placeholder="请选择候选模型" filterable class="!w-full">
          <el-option v-for="item in modelOptions" :key="item.id" :label="`${item.name} (${item.modelId})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="供应商" prop="providerId">
        <el-select v-model="formData.providerId" placeholder="请选择供应商（跨供应商降级校验用）" clearable class="!w-full">
          <el-option v-for="item in providerOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-divider content-position="left">路由参数</el-divider>
      <el-form-item label="权重" prop="weight">
        <el-input-number v-model="formData.weight" :min="0" :max="10000" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">策略 3「权重」时按权重分配流量</span>
      </el-form-item>
      <el-form-item label="优先级" prop="priority">
        <el-input-number v-model="formData.priority" :min="0" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">策略 2「优先级」时数值越小越优先</span>
      </el-form-item>
      <el-form-item label="最大 QPS" prop="maxQps">
        <el-input-number v-model="formData.maxQps" :min="0" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">0 表示不限</span>
      </el-form-item>
      <el-form-item label="参与路由" prop="enabled">
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
import { YES_NO_OPTIONS } from '@/api/dataQuery/constants'
import * as CandidateApi from '@/api/dataQuery/model/routeCandidate'
import * as BindingApi from '@/api/dataQuery/model/sceneBinding'
import * as ConfigApi from '@/api/dataQuery/model/config'
import * as ProviderApi from '@/api/dataQuery/model/provider'

defineOptions({ name: 'DataQueryModelRouteCandidateForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const bindingOptions = ref<BindingApi.AiModelSceneBindingVO[]>([])
const modelOptions = ref<ConfigApi.AiModelConfigSimpleVO[]>([])
const providerOptions = ref<ProviderApi.AiModelProviderSimpleVO[]>([])

const defaultForm = (): CandidateApi.AiModelRouteCandidateVO => ({
  id: undefined,
  bindingId: undefined,
  modelId: undefined,
  providerId: undefined,
  weight: 100,
  priority: 0,
  maxQps: 0,
  enabled: 1,
  sort: 0,
  remark: ''
})
const formData = ref<CandidateApi.AiModelRouteCandidateVO>(defaultForm())

const formRules = reactive({
  bindingId: [{ required: true, message: '场景绑定不能为空', trigger: 'change' }],
  modelId: [{ required: true, message: '候选模型不能为空', trigger: 'change' }]
})

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!bindingOptions.value.length) {
    const [bindings, models, providers] = await Promise.all([
      BindingApi.getAiModelSceneBindingPage({ pageNo: 1, pageSize: 100 }),
      ConfigApi.getAiModelConfigSimpleList(),
      ProviderApi.getAiModelProviderSimpleList()
    ])
    bindingOptions.value = bindings.list
    modelOptions.value = models
    providerOptions.value = providers
  }
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await CandidateApi.getAiModelRouteCandidate(id)) }
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
    const f = formData.value
    const data: CandidateApi.AiModelRouteCandidateVO = {
      id: f.id,
      bindingId: f.bindingId,
      modelId: f.modelId,
      providerId: f.providerId,
      weight: f.weight,
      priority: f.priority,
      maxQps: f.maxQps,
      enabled: f.enabled,
      sort: f.sort,
      remark: f.remark
    }
    if (formType.value === 'create') {
      await CandidateApi.createAiModelRouteCandidate(data)
      message.success(t('common.createSuccess'))
    } else {
      await CandidateApi.updateAiModelRouteCandidate(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
