<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="720px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="140px">
      <el-divider content-position="left">基础信息</el-divider>
      <el-form-item label="数据源" prop="datasourceId">
        <el-select v-model="formData.datasourceId" placeholder="请选择数据源" filterable class="!w-full">
          <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="Schema" prop="schemaName">
        <el-input v-model="formData.schemaName" placeholder="请输入 Schema" />
      </el-form-item>
      <el-form-item label="表名" prop="tableName">
        <el-input v-model="formData.tableName" placeholder="请输入表名" />
      </el-form-item>
      <el-form-item label="中文名" prop="nameZh">
        <el-input v-model="formData.nameZh" placeholder="请输入中文名" />
      </el-form-item>
      <el-form-item label="表类型" prop="tableType">
        <el-select v-model="formData.tableType" placeholder="请选择表类型" class="!w-full">
          <el-option v-for="item in TABLE_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="表角色" prop="tableRole">
        <el-select v-model="formData.tableRole" placeholder="请选择表角色" class="!w-full">
          <el-option v-for="item in TABLE_ROLE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="主键" prop="primaryKey">
        <el-input v-model="formData.primaryKey" placeholder="请输入主键字段名" />
      </el-form-item>
      <el-form-item label="默认时间字段" prop="defaultTimeColumn">
        <el-input v-model="formData.defaultTimeColumn" placeholder="请输入默认时间字段名" />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="请输入描述" />
      </el-form-item>

      <el-divider content-position="left">展示与权限</el-divider>
      <el-form-item label="是否可见" prop="visible">
        <el-radio-group v-model="formData.visible">
          <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="是否可查" prop="queryable">
        <el-radio-group v-model="formData.queryable">
          <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="敏感级别" prop="sensitiveLevel">
        <el-select v-model="formData.sensitiveLevel" placeholder="请选择敏感级别" class="!w-full">
          <el-option v-for="item in SENSITIVE_LEVEL_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
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
import { SENSITIVE_LEVEL_OPTIONS, TABLE_ROLE_OPTIONS, TABLE_TYPE_OPTIONS, YES_NO_OPTIONS } from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as TableApi from '@/api/dataQuery/datasource/table'

defineOptions({ name: 'DataQueryDatasourceTableForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])

const defaultForm = (): TableApi.AiDatasourceTableVO => ({
  id: undefined,
  datasourceId: undefined,
  schemaName: '',
  tableName: '',
  nameZh: '',
  description: '',
  tableType: 1,
  tableRole: 5,
  primaryKey: '',
  defaultTimeColumn: '',
  visible: 1,
  queryable: 1,
  sensitiveLevel: 0,
  sort: 0,
  remark: ''
})
const formData = ref<TableApi.AiDatasourceTableVO>(defaultForm())

const formRules = reactive({
  datasourceId: [{ required: true, message: '数据源不能为空', trigger: 'change' }],
  tableName: [{ required: true, message: '表名不能为空', trigger: 'blur' }],
  tableType: [{ required: true, message: '表类型不能为空', trigger: 'change' }]
})

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!datasourceOptions.value.length) {
    datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
  }
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await TableApi.getAiDatasourceTable(id)) }
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
    delete data.rowCountEstimate
    delete data.columnCount
    delete data.sampleRows
    delete data.sampleTime
    delete data.syncStatus
    delete data.structHash
    delete data.lastSyncTime
    delete data.createTime
    if (formType.value === 'create') {
      await TableApi.createAiDatasourceTable(data)
      message.success(t('common.createSuccess'))
    } else {
      await TableApi.updateAiDatasourceTable(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
