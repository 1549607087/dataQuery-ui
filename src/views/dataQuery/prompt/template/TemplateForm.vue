<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="800px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="130px">
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="formData.sceneCode" placeholder="请选择场景编码" filterable class="!w-full">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="提示词名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入提示词名称" />
      </el-form-item>
      <el-form-item label="提示词编码" prop="code">
        <el-input v-model="formData.code" placeholder="租户内唯一，供程序按编码引用" />
      </el-form-item>
      <el-form-item label="提示词类型" prop="promptType">
        <el-select v-model="formData.promptType" placeholder="请选择类型" class="!w-full">
          <el-option v-for="item in PROMPT_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="模板正文" prop="content">
        <el-input v-model="formData.content" type="textarea" :rows="10" :placeholder="'占位符统一使用 {{var_name}}'" />
      </el-form-item>
      <el-form-item label="默认模型" prop="modelId">
        <el-select v-model="formData.modelId" placeholder="0 表示跟随场景路由结果" class="!w-full">
          <el-option :label="'跟随场景路由'" :value="0" />
          <el-option v-for="item in modelOptions" :key="item.id" :label="`${item.name} (${item.modelId})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="模型参数覆盖" prop="params">
        <el-input v-model="formData.params" type="textarea" :rows="2" placeholder="JSON，如 {&quot;temperature&quot;:0,&quot;top_p&quot;:1,&quot;max_tokens&quot;:2048}" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio v-for="item in GRAY_STATUS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="灰度比例（%）" prop="grayRatio">
        <el-input-number v-model="formData.grayRatio" :min="0" :max="100" controls-position="right" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="formData.sort" :min="0" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">同场景内数值越小越优先</span>
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
import { GRAY_STATUS, PROMPT_TYPE_OPTIONS, SCENE_OPTIONS } from '@/api/dataQuery/constants'
import * as PromptApi from '@/api/dataQuery/prompt/template'
import * as ConfigApi from '@/api/dataQuery/model/config'

defineOptions({ name: 'DataQueryPromptTemplateForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const modelOptions = ref<ConfigApi.AiModelConfigSimpleVO[]>([])

const defaultForm = (): PromptApi.AiPromptVO => ({
  id: undefined,
  sceneCode: '',
  name: '',
  code: '',
  promptType: 1,
  content: '',
  modelId: undefined,
  params: '',
  status: 0,
  grayRatio: 0,
  sort: 0,
  remark: ''
})
const formData = ref<PromptApi.AiPromptVO>(defaultForm())

const formRules = reactive({
  sceneCode: [{ required: true, message: '场景编码不能为空', trigger: 'change' }],
  name: [{ required: true, message: '提示词名称不能为空', trigger: 'blur' }],
  code: [{ required: true, message: '提示词编码不能为空', trigger: 'blur' }],
  promptType: [{ required: true, message: '提示词类型不能为空', trigger: 'change' }],
  content: [{ required: true, message: '模板正文不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!modelOptions.value.length) {
    modelOptions.value = await ConfigApi.getAiModelConfigSimpleList()
  }
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await PromptApi.getAiPrompt(id)) }
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
    // 只提交 SaveReqVO 声明的字段；变量快照 / 版本 / 来源由服务端维护
    const f = formData.value
    const data: PromptApi.AiPromptVO = {
      id: f.id,
      sceneCode: f.sceneCode,
      name: f.name,
      code: f.code,
      promptType: f.promptType,
      content: f.content,
      modelId: f.modelId,
      params: f.params,
      status: f.status,
      grayRatio: f.grayRatio,
      sort: f.sort,
      remark: f.remark
    }
    if (formType.value === 'create') {
      await PromptApi.createAiPrompt(data)
      message.success(t('common.createSuccess'))
    } else {
      await PromptApi.updateAiPrompt(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
