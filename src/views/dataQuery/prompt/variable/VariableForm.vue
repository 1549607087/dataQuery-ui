<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="140px">
      <el-form-item label="所属提示词" prop="promptId">
        <el-select v-model="formData.promptId" placeholder="请选择提示词" filterable class="!w-full" @change="handlePromptChange">
          <el-option v-for="item in promptOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="formData.sceneCode" placeholder="选择提示词后自动带出" filterable allow-create clearable class="!w-full">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="占位符名" prop="varName">
        <el-input v-model="formData.varName" placeholder="不含双花括号，如 question / schema" />
      </el-form-item>
      <el-form-item label="中文名" prop="varLabel">
        <el-input v-model="formData.varLabel" placeholder="如 用户问题" />
      </el-form-item>
      <el-form-item label="值类型" prop="varType">
        <el-select v-model="formData.varType" placeholder="请选择值类型" class="!w-full">
          <el-option v-for="item in VAR_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="注入来源" prop="sourceType">
        <el-select v-model="formData.sourceType" placeholder="请选择注入来源" class="!w-full">
          <el-option v-for="item in SOURCE_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源键" prop="sourceKey">
        <el-input v-model="formData.sourceKey" placeholder="如 user.question / metadata.schema" />
      </el-form-item>
      <el-form-item label="是否必填" prop="required">
        <el-radio-group v-model="formData.required">
          <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="默认值" prop="defaultValue">
        <el-input v-model="formData.defaultValue" placeholder="非必填变量缺省时使用" />
      </el-form-item>
      <el-form-item label="示例值" prop="sampleValue">
        <el-input v-model="formData.sampleValue" placeholder="调试台与文档展示用" />
      </el-form-item>
      <el-form-item label="校验正则" prop="validateRegex">
        <el-input v-model="formData.validateRegex" placeholder="为空则不校验" />
      </el-form-item>
      <el-form-item label="最大字符数" prop="maxLength">
        <el-input-number v-model="formData.maxLength" :min="0" controls-position="right" />
        <span class="ml-8px text-12px text-gray-400">0 表示不限</span>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio v-for="item in COMMON_STATUS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
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
import { COMMON_STATUS, SCENE_OPTIONS, SOURCE_TYPE_OPTIONS, VAR_TYPE_OPTIONS, YES_NO_OPTIONS } from '@/api/dataQuery/constants'
import * as VariableApi from '@/api/dataQuery/prompt/variable'
import * as PromptApi from '@/api/dataQuery/prompt/template'

defineOptions({ name: 'DataQueryPromptVariableForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const promptOptions = ref<PromptApi.AiPromptSimpleVO[]>([])

const defaultForm = (): VariableApi.AiPromptVariableVO => ({
  id: undefined,
  promptId: undefined,
  sceneCode: '',
  varName: '',
  varLabel: '',
  varType: 1,
  sourceType: 2,
  sourceKey: '',
  required: 1,
  defaultValue: '',
  sampleValue: '',
  validateRegex: '',
  maxLength: 0,
  status: 0,
  sort: 0,
  remark: ''
})
const formData = ref<VariableApi.AiPromptVariableVO>(defaultForm())

const formRules = reactive({
  promptId: [{ required: true, message: '所属提示词不能为空', trigger: 'change' }],
  varName: [{ required: true, message: '占位符名不能为空', trigger: 'blur' }]
})

const handlePromptChange = (id: number) => {
  const hit = promptOptions.value.find((item) => item.id === id)
  if (hit?.sceneCode) formData.value.sceneCode = hit.sceneCode
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!promptOptions.value.length) {
    promptOptions.value = await PromptApi.getAiPromptSimpleList()
  }
  // 从列表页带出的默认提示词由父组件通过 queryParams 传入，这里不耦合列表状态
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await VariableApi.getAiPromptVariable(id)) }
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
    const data: VariableApi.AiPromptVariableVO = {
      id: f.id,
      promptId: f.promptId,
      sceneCode: f.sceneCode,
      varName: f.varName,
      varLabel: f.varLabel,
      varType: f.varType,
      sourceType: f.sourceType,
      sourceKey: f.sourceKey,
      required: f.required,
      defaultValue: f.defaultValue,
      sampleValue: f.sampleValue,
      validateRegex: f.validateRegex,
      maxLength: f.maxLength,
      status: f.status,
      sort: f.sort,
      remark: f.remark
    }
    if (formType.value === 'create') {
      await VariableApi.createAiPromptVariable(data)
      message.success(t('common.createSuccess'))
    } else {
      await VariableApi.updateAiPromptVariable(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
