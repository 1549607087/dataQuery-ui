<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="130px">
      <el-form-item label="模板名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入模板名称" />
      </el-form-item>
      <el-form-item label="模板编码" prop="code">
        <el-input v-model="formData.code" placeholder="租户内唯一，供程序引用" />
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-input v-model="formData.category" placeholder="如 销售 / 财务 / 运营" />
      </el-form-item>
      <el-form-item label="问题模板" prop="questionTemplate">
        <el-input v-model="formData.questionTemplate" type="textarea" :rows="3" placeholder="参数化问题模板文本，含占位符" />
      </el-form-item>
      <el-form-item label="SQL 模板" prop="sqlTemplate">
        <el-input v-model="formData.sqlTemplate" type="textarea" :rows="4" placeholder="仅存储参数化模板文本，不在此执行" />
      </el-form-item>
      <el-form-item label="参数定义" prop="paramsDef">
        <el-input v-model="formData.paramsDef" type="textarea" :rows="4" placeholder="参数定义 JSON：名称、类型、必填、默认值、校验规则" />
      </el-form-item>
      <el-form-item label="数据源 ID" prop="datasourceId">
        <el-input-number v-model="formData.datasourceId" :min="0" controls-position="right" class="!w-full" />
      </el-form-item>
      <el-form-item label="是否启用" prop="enabled">
        <el-radio-group v-model="formData.enabled">
          <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="formData.sort" :min="0" controls-position="right" class="!w-full" />
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
import * as TemplateApi from '@/api/dataQuery/queryruntime/template'

defineOptions({ name: 'DataQueryQueryTemplateForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()

const defaultForm = (): TemplateApi.AiQueryTemplateVO => ({
  id: undefined,
  name: '',
  code: '',
  category: '',
  questionTemplate: '',
  sqlTemplate: '',
  paramsDef: '',
  datasourceId: undefined,
  enabled: 1,
  sort: 0,
  remark: ''
})
const formData = ref<TemplateApi.AiQueryTemplateVO>(defaultForm())

const formRules = reactive({
  name: [{ required: true, message: '模板名称不能为空', trigger: 'blur' }],
  code: [{ required: true, message: '模板编码不能为空', trigger: 'blur' }],
  enabled: [{ required: true, message: '是否启用不能为空', trigger: 'change' }]
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
      formData.value = { ...defaultForm(), ...(await TemplateApi.getAiQueryTemplate(id)) }
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
      await TemplateApi.createAiQueryTemplate(data)
      message.success(t('common.createSuccess'))
    } else {
      await TemplateApi.updateAiQueryTemplate(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
