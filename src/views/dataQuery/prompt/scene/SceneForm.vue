<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="130px">
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="formData.sceneCode" placeholder="请选择场景编码" filterable class="!w-full" @change="handleSceneChange">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="场景名称" prop="sceneName">
        <el-input v-model="formData.sceneName" placeholder="请输入场景名称" />
      </el-form-item>
      <el-form-item label="场景说明" prop="description">
        <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="该场景的用途说明" />
      </el-form-item>
      <el-form-item label="默认占位符" prop="defaultVariables">
        <el-input v-model="formData.defaultVariables" :placeholder="'JSON 数组，如 [&quot;question&quot;,&quot;schema&quot;]'" />
      </el-form-item>
      <el-form-item label="建议模型类型" prop="defaultModelType">
        <el-select v-model="formData.defaultModelType" placeholder="请选择" class="!w-full">
          <el-option v-for="item in MODEL_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
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
import { COMMON_STATUS, MODEL_TYPE_OPTIONS, SCENE_OPTIONS } from '@/api/dataQuery/constants'
import * as SceneApi from '@/api/dataQuery/prompt/scene'

defineOptions({ name: 'DataQueryPromptSceneForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()

const defaultForm = (): SceneApi.AiPromptSceneVO => ({
  id: undefined,
  sceneCode: '',
  sceneName: '',
  description: '',
  defaultVariables: '',
  defaultModelType: 1,
  status: 0,
  sort: 0,
  remark: ''
})
const formData = ref<SceneApi.AiPromptSceneVO>(defaultForm())

const formRules = reactive({
  sceneCode: [{ required: true, message: '场景编码不能为空', trigger: 'change' }],
  sceneName: [{ required: true, message: '场景名称不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

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
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await SceneApi.getAiPromptScene(id)) }
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
    const data: SceneApi.AiPromptSceneVO = {
      id: f.id,
      sceneCode: f.sceneCode,
      sceneName: f.sceneName,
      description: f.description,
      defaultVariables: f.defaultVariables,
      defaultModelType: f.defaultModelType,
      status: f.status,
      sort: f.sort,
      remark: f.remark
    }
    if (formType.value === 'create') {
      await SceneApi.createAiPromptScene(data)
      message.success(t('common.createSuccess'))
    } else {
      await SceneApi.updateAiPromptScene(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
