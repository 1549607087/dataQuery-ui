<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="720px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="140px">
      <el-divider content-position="left">关联信息</el-divider>
      <el-form-item label="数据源" prop="datasourceId">
        <el-select v-model="formData.datasourceId" placeholder="请选择数据源" filterable class="!w-full" @change="handleDatasourceChange">
          <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="表" prop="tableId">
        <el-select v-model="formData.tableId" placeholder="请选择表" filterable class="!w-full" @change="handleTableChange">
          <el-option v-for="item in tableOptions" :key="item.id" :label="item.tableName" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="字段" prop="columnId">
        <el-select v-model="formData.columnId" placeholder="请选择字段" filterable class="!w-full">
          <el-option v-for="item in columnOptions" :key="item.id" :label="item.columnName" :value="item.id!" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">映射内容</el-divider>
      <el-form-item label="源值" prop="sourceValue">
        <el-input v-model="formData.sourceValue" placeholder="请输入源值" />
      </el-form-item>
      <el-form-item label="展示名" prop="displayName">
        <el-input v-model="formData.displayName" placeholder="请输入展示名" />
      </el-form-item>
      <el-form-item label="字典类型" prop="dictType">
        <el-input v-model="formData.dictType" placeholder="请输入字典类型" />
      </el-form-item>
      <el-form-item label="字典值" prop="dictValue">
        <el-input v-model="formData.dictValue" placeholder="请输入字典值" />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="请输入描述" />
      </el-form-item>
      <el-form-item label="来源" prop="source">
        <el-input-number v-model="formData.source" :min="0" controls-position="right" />
      </el-form-item>
      <el-form-item label="采样次数" prop="sampleCount">
        <el-input-number v-model="formData.sampleCount" :min="0" controls-position="right" />
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
import { COMMON_STATUS } from '@/api/dataQuery/constants'
import * as ColumnApi from '@/api/dataQuery/datasource/column'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as EnumApi from '@/api/dataQuery/datasource/enumvalue'
import * as TableApi from '@/api/dataQuery/datasource/table'

defineOptions({ name: 'DataQueryDatasourceEnumForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const tableOptions = ref<TableApi.AiDatasourceTableVO[]>([])
const columnOptions = ref<ColumnApi.AiDatasourceColumnVO[]>([])

const defaultForm = (): EnumApi.AiDatasourceColumnEnumVO => ({
  id: undefined,
  datasourceId: undefined,
  tableId: undefined,
  columnId: undefined,
  sourceValue: '',
  displayName: '',
  dictType: '',
  dictValue: '',
  description: '',
  source: 1,
  sampleCount: 0,
  status: 0,
  sort: 0,
  remark: ''
})
const formData = ref<EnumApi.AiDatasourceColumnEnumVO>(defaultForm())

const formRules = reactive({
  datasourceId: [{ required: true, message: '数据源不能为空', trigger: 'change' }],
  columnId: [{ required: true, message: '字段不能为空', trigger: 'change' }],
  sourceValue: [{ required: true, message: '源值不能为空', trigger: 'blur' }],
  displayName: [{ required: true, message: '展示名不能为空', trigger: 'blur' }]
})

const handleDatasourceChange = async (val: number) => {
  formData.value.tableId = undefined
  formData.value.columnId = undefined
  tableOptions.value = val ? await TableApi.getAiDatasourceTableListByDatasource(val) : []
  columnOptions.value = []
}

const handleTableChange = async (val: number) => {
  formData.value.columnId = undefined
  columnOptions.value = val ? await ColumnApi.getAiDatasourceColumnListByTable(val) : []
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!datasourceOptions.value.length) {
    datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
  }
  tableOptions.value = []
  columnOptions.value = []
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await EnumApi.getAiDatasourceColumnEnum(id)) }
      if (formData.value.datasourceId) {
        tableOptions.value = await TableApi.getAiDatasourceTableListByDatasource(formData.value.datasourceId)
      }
      if (formData.value.tableId) {
        columnOptions.value = await ColumnApi.getAiDatasourceColumnListByTable(formData.value.tableId)
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
    const data = { ...formData.value }
    // 剔除后端维护字段，只提交 SaveReqVO 字段
    delete data.createTime
    if (formType.value === 'create') {
      await EnumApi.createAiDatasourceColumnEnum(data)
      message.success(t('common.createSuccess'))
    } else {
      await EnumApi.updateAiDatasourceColumnEnum(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
