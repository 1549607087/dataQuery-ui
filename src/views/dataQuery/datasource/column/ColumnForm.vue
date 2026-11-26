<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="820px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="150px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基础信息" name="base">
          <el-form-item label="数据源" prop="datasourceId">
            <el-select v-model="formData.datasourceId" placeholder="请选择数据源" filterable class="!w-full" @change="handleDatasourceChange">
              <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="表" prop="tableId">
            <el-select v-model="formData.tableId" placeholder="请选择表" filterable class="!w-full">
              <el-option v-for="item in tableOptions" :key="item.id" :label="item.tableName" :value="item.id!" />
            </el-select>
          </el-form-item>
          <el-form-item label="Schema" prop="schemaName">
            <el-input v-model="formData.schemaName" placeholder="请输入 Schema" />
          </el-form-item>
          <el-form-item label="表名" prop="tableName">
            <el-input v-model="formData.tableName" placeholder="请输入表名" />
          </el-form-item>
          <el-form-item label="字段名" prop="columnName">
            <el-input v-model="formData.columnName" placeholder="请输入字段名" />
          </el-form-item>
          <el-form-item label="中文名" prop="nameZh">
            <el-input v-model="formData.nameZh" placeholder="请输入中文名" />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="请输入描述" />
          </el-form-item>
          <el-form-item label="数据类型" prop="dataType">
            <el-input v-model="formData.dataType" placeholder="请输入数据类型" />
          </el-form-item>
          <el-form-item label="JDBC 类型" prop="jdbcType">
            <el-input v-model="formData.jdbcType" placeholder="请输入 JDBC 类型" />
          </el-form-item>
          <el-form-item label="列长度" prop="columnSize">
            <el-input-number v-model="formData.columnSize" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="默认值" prop="defaultValue">
            <el-input v-model="formData.defaultValue" placeholder="请输入默认值" />
          </el-form-item>
          <el-form-item label="字段序号" prop="ordinalPosition">
            <el-input-number v-model="formData.ordinalPosition" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="排序" prop="sort">
            <el-input-number v-model="formData.sort" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-tab-pane>

        <el-tab-pane label="语义信息" name="semantic">
          <el-form-item label="语义角色" prop="semanticRole">
            <el-select v-model="formData.semanticRole" placeholder="请选择语义角色" class="!w-full">
              <el-option v-for="item in SEMANTIC_ROLE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="聚合方式" prop="aggregation">
            <el-input v-model="formData.aggregation" placeholder="例如 SUM / AVG / COUNT" />
          </el-form-item>
          <el-form-item label="单位" prop="unit">
            <el-input v-model="formData.unit" placeholder="请输入单位" />
          </el-form-item>
          <el-form-item label="时间格式" prop="timeFormat">
            <el-input v-model="formData.timeFormat" placeholder="请输入时间格式" />
          </el-form-item>
          <el-form-item label="默认时间字段" prop="isDefaultTime">
            <el-radio-group v-model="formData.isDefaultTime">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="指标定义（JSON）" prop="metricDef">
            <el-input v-model="formData.metricDef" type="textarea" :rows="3" placeholder="请输入指标定义 JSON" />
          </el-form-item>
          <el-form-item label="同义词" prop="synonyms">
            <el-input v-model="formData.synonyms" type="textarea" :rows="2" placeholder="多个用逗号分隔" />
          </el-form-item>
          <el-form-item label="采样值" prop="sampleValues">
            <el-input v-model="formData.sampleValues" type="textarea" :rows="2" placeholder="请输入采样值" />
          </el-form-item>
        </el-tab-pane>

        <el-tab-pane label="约束与权限" name="constraint">
          <el-form-item label="允许为空" prop="nullable">
            <el-radio-group v-model="formData.nullable">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="主键" prop="primaryKey">
            <el-radio-group v-model="formData.primaryKey">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="自增" prop="autoIncrement">
            <el-radio-group v-model="formData.autoIncrement">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="启用枚举" prop="enumEnabled">
            <el-radio-group v-model="formData.enumEnabled">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="敏感类型" prop="sensitiveType">
            <el-select v-model="formData.sensitiveType" placeholder="请选择敏感类型" class="!w-full">
              <el-option v-for="item in SENSITIVE_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="脱敏规则" prop="maskRule">
            <el-input v-model="formData.maskRule" placeholder="请输入脱敏规则" />
          </el-form-item>
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
          <el-form-item label="是否可过滤" prop="filterable">
            <el-radio-group v-model="formData.filterable">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-tab-pane>
      </el-tabs>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { SEMANTIC_ROLE_OPTIONS, SENSITIVE_TYPE_OPTIONS, YES_NO_OPTIONS } from '@/api/dataQuery/constants'
import * as ColumnApi from '@/api/dataQuery/datasource/column'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as TableApi from '@/api/dataQuery/datasource/table'

defineOptions({ name: 'DataQueryDatasourceColumnForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const activeTab = ref('base')
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const tableOptions = ref<TableApi.AiDatasourceTableVO[]>([])

const defaultForm = (): ColumnApi.AiDatasourceColumnVO => ({
  id: undefined,
  datasourceId: undefined,
  tableId: undefined,
  schemaName: '',
  tableName: '',
  columnName: '',
  nameZh: '',
  description: '',
  dataType: '',
  jdbcType: '',
  columnSize: 0,
  nullable: 1,
  primaryKey: 0,
  autoIncrement: 0,
  defaultValue: '',
  ordinalPosition: 0,
  semanticRole: 1,
  aggregation: '',
  unit: '',
  timeFormat: '',
  isDefaultTime: 0,
  metricDef: '',
  synonyms: '',
  sampleValues: '',
  enumEnabled: 0,
  sensitiveType: 0,
  maskRule: '',
  visible: 1,
  queryable: 1,
  filterable: 1,
  sort: 0,
  remark: ''
})
const formData = ref<ColumnApi.AiDatasourceColumnVO>(defaultForm())

const formRules = reactive({
  datasourceId: [{ required: true, message: '数据源不能为空', trigger: 'change' }],
  tableId: [{ required: true, message: '表不能为空', trigger: 'change' }],
  columnName: [{ required: true, message: '字段名不能为空', trigger: 'blur' }]
})

const handleDatasourceChange = async (val: number) => {
  formData.value.tableId = undefined
  tableOptions.value = val ? await TableApi.getAiDatasourceTableListByDatasource(val) : []
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  activeTab.value = 'base'
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (!datasourceOptions.value.length) {
    datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
  }
  tableOptions.value = []
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await ColumnApi.getAiDatasourceColumn(id)) }
      if (formData.value.datasourceId) {
        tableOptions.value = await TableApi.getAiDatasourceTableListByDatasource(formData.value.datasourceId)
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
    delete data.distinctCountEstimate
    delete data.syncStatus
    delete data.structHash
    delete data.createTime
    if (formType.value === 'create') {
      await ColumnApi.createAiDatasourceColumn(data)
      message.success(t('common.createSuccess'))
    } else {
      await ColumnApi.updateAiDatasourceColumn(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
