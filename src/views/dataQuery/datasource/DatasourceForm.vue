<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="820px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="150px">
      <el-alert
        v-if="formType === 'create'"
        class="mb-12px"
        type="info"
        :closable="false"
        show-icon
        title="常规接入请使用「表结构一键导入」"
        description="一键导入会自动完成建源、连通性检测、表列元数据导入与向量索引，无需在此逐项填写；本表单仅用于手工建源或导入后微调。"
      />
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基础信息" name="base">
          <el-form-item label="名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入名称" />
          </el-form-item>
          <el-form-item label="编码" prop="code">
            <el-input v-model="formData.code" placeholder="请输入编码" />
          </el-form-item>
          <el-form-item label="数据库类型" prop="dsType">
            <el-select v-model="formData.dsType" placeholder="请选择数据库类型" class="!w-full">
              <el-option v-for="item in DS_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="SQL 方言" prop="dialect">
            <el-select v-model="formData.dialect" placeholder="请选择 SQL 方言" class="!w-full">
              <el-option v-for="item in DIALECT_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="驱动类名" prop="driverClass">
            <el-input v-model="formData.driverClass" placeholder="请输入驱动类名" />
          </el-form-item>
          <el-form-item label="JDBC 地址" prop="jdbcUrl">
            <el-input v-model="formData.jdbcUrl" placeholder="请输入 JDBC 地址" />
          </el-form-item>
          <el-form-item label="用户名" prop="username">
            <el-input v-model="formData.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="formData.password" type="password" show-password placeholder="请输入密码" />
            <span v-if="formType === 'update'" class="ml-8px text-12px text-gray-400">留空表示不修改已配置的密码</span>
          </el-form-item>
          <el-form-item label="Schema" prop="schemaName">
            <el-input v-model="formData.schemaName" placeholder="请输入 Schema" />
          </el-form-item>
          <el-form-item label="Catalog" prop="catalogName">
            <el-input v-model="formData.catalogName" placeholder="请输入 Catalog" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="formData.status" placeholder="请选择状态" class="!w-full">
              <el-option v-for="item in DS_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序" prop="sort">
            <el-input-number v-model="formData.sort" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-tab-pane>

        <el-tab-pane label="只读连接" name="readonly">
          <el-form-item label="启用只读连接" prop="readonlyEnabled">
            <el-radio-group v-model="formData.readonlyEnabled">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="只读 JDBC 地址" prop="readonlyUrl">
            <el-input v-model="formData.readonlyUrl" placeholder="请输入只读 JDBC 地址" />
          </el-form-item>
          <el-form-item label="只读用户名" prop="readonlyUsername">
            <el-input v-model="formData.readonlyUsername" placeholder="请输入只读用户名" />
          </el-form-item>
          <el-form-item label="只读密码" prop="readonlyPassword">
            <el-input v-model="formData.readonlyPassword" type="password" show-password placeholder="请输入只读密码" />
            <span v-if="formType === 'update'" class="ml-8px text-12px text-gray-400">留空表示不修改已配置的密码</span>
          </el-form-item>
        </el-tab-pane>

        <el-tab-pane label="SQL 规则与限制" name="sql">
          <el-form-item label="标识符引号" prop="identifierQuote">
            <el-input v-model="formData.identifierQuote" placeholder="例如双引号、反引号" />
          </el-form-item>
          <el-form-item label="全部加引号" prop="quoteAll">
            <el-radio-group v-model="formData.quoteAll">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="SQL 规则（JSON）" prop="sqlRules">
            <el-input v-model="formData.sqlRules" type="textarea" :rows="3" placeholder="请输入 SQL 规则 JSON" />
          </el-form-item>
          <el-form-item label="最大返回行数" prop="maxRows">
            <el-input-number v-model="formData.maxRows" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="最大扫描行数" prop="maxScanRows">
            <el-input-number v-model="formData.maxScanRows" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="查询超时（ms）" prop="queryTimeoutMs">
            <el-input-number v-model="formData.queryTimeoutMs" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="允许 DDL" prop="allowDdl">
            <el-radio-group v-model="formData.allowDdl">
              <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="允许访问 Schema" prop="allowedSchemas">
            <el-input v-model="formData.allowedSchemas" placeholder="多个用逗号分隔" />
          </el-form-item>
          <el-form-item label="表过滤规则" prop="tableFilter">
            <el-input v-model="formData.tableFilter" type="textarea" :rows="2" placeholder="请输入表过滤规则" />
          </el-form-item>
        </el-tab-pane>

        <el-tab-pane label="连接池与同步" name="pool">
          <el-form-item label="最小空闲连接" prop="poolMinIdle">
            <el-input-number v-model="formData.poolMinIdle" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="最大活动连接" prop="poolMaxActive">
            <el-input-number v-model="formData.poolMaxActive" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="连接校验 SQL" prop="poolValidationSql">
            <el-input v-model="formData.poolValidationSql" placeholder="请输入连接校验 SQL" />
          </el-form-item>
          <el-form-item label="同步 Cron" prop="syncCron">
            <el-input v-model="formData.syncCron" placeholder="请输入同步 Cron 表达式" />
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
import { DIALECT_OPTIONS, DS_STATUS_OPTIONS, DS_TYPE_OPTIONS, YES_NO_OPTIONS } from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'

defineOptions({ name: 'DataQueryDatasourceForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const activeTab = ref('base')

const defaultForm = (): DatasourceApi.AiDatasourceVO => ({
  id: undefined,
  name: '',
  code: '',
  dsType: 1,
  dialect: 'postgresql',
  driverClass: '',
  jdbcUrl: '',
  username: '',
  password: '',
  readonlyUrl: '',
  readonlyUsername: '',
  readonlyPassword: '',
  readonlyEnabled: 0,
  schemaName: '',
  catalogName: '',
  identifierQuote: '',
  quoteAll: 0,
  sqlRules: '',
  maxRows: 1000,
  maxScanRows: 0,
  queryTimeoutMs: 0,
  poolMinIdle: 0,
  poolMaxActive: 10,
  poolValidationSql: '',
  allowDdl: 0,
  allowedSchemas: '',
  tableFilter: '',
  syncCron: '',
  status: 0,
  sort: 0,
  remark: ''
})
const formData = ref<DatasourceApi.AiDatasourceVO>(defaultForm())

const formRules = reactive({
  name: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
  code: [{ required: true, message: '编码不能为空', trigger: 'blur' }],
  dsType: [{ required: true, message: '数据库类型不能为空', trigger: 'change' }],
  dialect: [{ required: true, message: 'SQL 方言不能为空', trigger: 'change' }],
  jdbcUrl: [{ required: true, message: 'JDBC 地址不能为空', trigger: 'blur' }]
})

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  activeTab.value = 'base'
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await DatasourceApi.getAiDatasource(id)) }
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
    delete data.syncStatus
    delete data.lastSyncTime
    delete data.structVersion
    delete data.healthStatus
    delete data.lastCheckTime
    delete data.lastCheckResult
    delete data.createTime
    delete data.passwordConfigured
    delete data.readonlyPasswordConfigured
    if (formType.value === 'create') {
      await DatasourceApi.createAiDatasource(data)
      message.success(t('common.createSuccess'))
    } else {
      await DatasourceApi.updateAiDatasource(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
