<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="表结构一键导入（推荐的接入方式）"
      description="一个表单完成：创建/复用数据源 → 连通性检测 → 全量表列主键外键同步 → 向量索引。预览只读扫描、不落库；导入失败会返回失败阶段与已创建的数据源编号，可带上该编号重试。租户由服务端上下文决定，无需填写。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="140px">
      <el-form-item label="接入方式">
        <el-radio-group v-model="mode" @change="handleModeChange">
          <el-radio-button value="new">新建数据源</el-radio-button>
          <el-radio-button value="existing">复用已有数据源</el-radio-button>
        </el-radio-group>
        <span class="ml-12px text-12px text-gray-400">
          {{ mode === 'new' ? '只需填名称、编码、JDBC 地址，其余按数据库类型自动推断' : '选择已接入的数据源重新扫描并同步元数据' }}
        </span>
      </el-form-item>

      <el-form-item v-if="mode === 'existing'" label="数据源" prop="datasourceId">
        <el-select v-model="formData.datasourceId" placeholder="请选择数据源" clearable filterable class="!w-420px">
          <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>

      <template v-else>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="数据源名称" prop="name">
              <el-input v-model="formData.name" placeholder="例如：本地业务库" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据源编码" prop="code">
              <el-input v-model="formData.code" placeholder="租户内唯一，例如：biz_pg" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="JDBC 地址" prop="jdbcUrl">
          <el-input v-model="formData.jdbcUrl" placeholder="jdbc:postgresql://127.0.0.1:5432/postgres" clearable />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="数据库类型" prop="dsType">
              <el-select v-model="formData.dsType" placeholder="请选择数据库类型" class="!w-full">
                <el-option v-for="item in DS_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SQL 方言">
              <el-input v-model="formData.dialect" placeholder="不填按数据库类型自动推断" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名">
              <el-input v-model="formData.username" placeholder="本地 trust 认证可留空" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码">
              <el-input v-model="formData.password" type="password" show-password placeholder="留空表示空密码，加密存储且不回显" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Schema">
              <el-input v-model="formData.schemaName" placeholder="PostgreSQL 默认 public，其余留空表示全库扫描" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Catalog">
              <el-input v-model="formData.catalogName" placeholder="MySQL / SQLServer 按库名填写" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="驱动类名">
              <el-input v-model="formData.driverClass" placeholder="不填按数据库类型自动推断（仅白名单内驱动）" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大返回行数">
              <el-input-number v-model="options.maxRows" :min="1" :max="10000" :controls="false" class="!w-140px" />
              <span class="ml-8px text-12px text-gray-400">默认 1000</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-collapse class="ml-140px mb-18px">
          <el-collapse-item title="只读连接（生产环境建议单独配置只读账号，留空则降级复用管理连接）" name="readonly">
            <el-form-item label="只读 JDBC 地址" label-width="130px">
              <el-input v-model="formData.readonlyUrl" placeholder="不填表示暂不启用独立只读账号" clearable />
            </el-form-item>
            <el-form-item label="只读用户名" label-width="130px">
              <el-input v-model="formData.readonlyUsername" clearable />
            </el-form-item>
            <el-form-item label="只读密码" label-width="130px">
              <el-input v-model="formData.readonlyPassword" type="password" show-password placeholder="留空表示空密码" />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </template>

      <el-divider content-position="left">扫描范围（不填由服务端按系统 schema 规则收窄）</el-divider>
      <div class="ml-140px mb-12px text-12px text-gray-400 leading-5">
        仅作用于本次预览与导入的扫描，不会改写数据源自身配置；复用已有数据源时同样生效。<br />
        表名匹配为正则（包含即命中、区分大小写，PostgreSQL 表名本身是小写），多项用逗号分隔，例如
        <span class="text-gray-500">^p4reg_,^biz_</span>；填了 schema 白名单即按白名单扫描，不再局限于数据源的默认 schema。
      </div>
      <el-form-item label="Schema 白名单">
        <el-input v-model="scanScope.allowedSchemas" placeholder="多个用逗号分隔，例如：public,biz；为空表示全部非系统 schema" clearable />
      </el-form-item>
      <el-form-item label="仅导入表名匹配">
        <el-input v-model="scanScope.includeTables" placeholder="表名正则，多个用逗号分隔，例如：^p4reg_,^biz_" clearable />
      </el-form-item>
      <el-form-item label="排除表名匹配">
        <el-input v-model="scanScope.excludeTables" placeholder="表名正则，命中即跳过，多个用逗号分隔" clearable />
      </el-form-item>

      <el-divider content-position="left">导入选项</el-divider>
      <el-form-item label="构建向量索引">
        <el-switch v-model="options.buildVector" active-text="导入后构建" inactive-text="暂不构建" />
        <span class="ml-12px text-12px text-gray-400">构建失败只告警，不回滚已导入的元数据</span>
      </el-form-item>
      <el-form-item label="复用已有数据源">
        <el-switch v-model="options.reuseExisting" active-text="编码相同则复用" inactive-text="重复编码直接报错" />
      </el-form-item>

      <!-- 复用模式下缩小范围会让范围外的既有表被标记为源端已删除（可恢复），提前说明避免误解 -->
      <el-alert
        v-if="mode === 'existing' && hasScope"
        class="ml-140px mb-12px"
        type="warning"
        :closable="false"
        show-icon
        title="缩小扫描范围会把范围外已导入的表标记为「源端已删除」"
        description="不会物理删除，人工补的中文名、口径等仍在；下次放宽范围再导入会自动恢复为「已同步」。"
      />

      <el-form-item>
        <el-button type="primary" plain :loading="previewLoading" @click="handlePreview" v-hasPermi="['data-query:metadata-import:preview']">
          <Icon icon="ep:view" class="mr-5px" />预览将导入的表
        </el-button>
        <el-button type="primary" :loading="importLoading" @click="handleImport" v-hasPermi="['data-query:metadata-import:import']">
          <Icon icon="ep:upload-filled" class="mr-5px" />一键导入
        </el-button>
        <el-button @click="handleReset"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 预览结果 -->
  <ContentWrap v-if="previewResult">
    <el-divider content-position="left">预览结果（只读扫描，未写入任何数据）</el-divider>
    <el-alert
      v-if="!previewResult.success"
      type="error"
      :closable="false"
      show-icon
      title="扫描失败"
      :description="previewResult.errorMsg || '请检查连接串、账号权限与扫描范围后重试'"
    />
    <template v-else>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="SQL 方言">{{ previewResult.dialect || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Schema">{{ previewResult.schemaName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="表总数">{{ previewResult.tableCount }}</el-descriptions-item>
        <el-descriptions-item label="字段总数">{{ previewResult.columnCount }}</el-descriptions-item>
        <el-descriptions-item label="Join 候选">{{ previewResult.relationCount }}</el-descriptions-item>
        <el-descriptions-item label="单次表数上限">{{ previewResult.maxTables }}</el-descriptions-item>
        <el-descriptions-item label="表明细是否截断">{{ previewResult.truncated ? '是（总数仍为真实值）' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="耗时（ms）">{{ previewResult.latencyMs }}</el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-for="(w, i) in previewResult.warnings"
        :key="i"
        class="mt-12px"
        type="warning"
        :closable="false"
        show-icon
        :title="w"
      />

      <el-table :data="previewResult.tables" size="small" border class="mt-16px" max-height="440">
        <el-table-column label="Schema" prop="schemaName" width="140" show-overflow-tooltip />
        <el-table-column label="表名" prop="tableName" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="90" align="center">
          <template #default="scope">{{ getOptionLabel(TABLE_TYPE_OPTIONS, scope.row.tableType) }}</template>
        </el-table-column>
        <el-table-column label="字段数" prop="columnCount" width="90" align="center" />
        <el-table-column label="主键" width="180" show-overflow-tooltip>
          <template #default="scope">{{ (scope.row.primaryKeys || []).join(', ') || '-' }}</template>
        </el-table-column>
        <el-table-column label="字段样例" show-overflow-tooltip>
          <template #default="scope">
            {{ (scope.row.columns || []).join(', ') }}{{ scope.row.columnsTruncated ? ' …' : '' }}
          </template>
        </el-table-column>
      </el-table>
    </template>
  </ContentWrap>

  <!-- 导入结果 -->
  <ContentWrap v-if="importResult">
    <el-alert
      :type="importResult.success ? 'success' : 'error'"
      :closable="false"
      show-icon
      :title="importResult.success ? '一键导入完成' : '一键导入中断'"
      :description="importResult.summary || importResult.errorMsg || ''"
    />

    <el-descriptions :column="4" border class="mt-16px">
      <el-descriptions-item label="结果">
        <el-tag :type="importResult.success ? 'success' : 'danger'">{{ importResult.success ? '成功' : '失败' }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="终态阶段">{{ getOptionLabel(IMPORT_STAGE_OPTIONS, importResult.stage) }}</el-descriptions-item>
      <el-descriptions-item label="数据源编号">{{ importResult.datasourceId ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="耗时（ms）">{{ importResult.latencyMs ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="新建数据源">{{ importResult.datasourceCreated ? '是' : '否' }}</el-descriptions-item>
      <el-descriptions-item label="复用数据源">{{ importResult.datasourceReused ? '是' : '否' }}</el-descriptions-item>
      <el-descriptions-item label="错误码">{{ importResult.errorCode ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="错误信息">{{ importResult.errorMsg || '-' }}</el-descriptions-item>
    </el-descriptions>

    <el-divider content-position="left">分步执行记录</el-divider>
    <el-table :data="importResult.steps" size="small" border>
      <el-table-column label="步骤" prop="name" width="140" />
      <el-table-column label="状态" width="110" align="center">
        <template #default="scope">
          <el-tag :type="getImportStepStatusTagType(scope.row.status)">
            {{ getOptionLabel(IMPORT_STEP_STATUS_OPTIONS, scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="说明" prop="detail" show-overflow-tooltip />
      <el-table-column label="耗时（ms）" prop="latencyMs" width="110" align="center" />
    </el-table>

    <template v-if="importResult.connection">
      <el-divider content-position="left">连通性检测</el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="结果">
          <el-tag :type="importResult.connection.success ? 'success' : 'danger'">
            {{ importResult.connection.success ? '通过' : '失败' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="健康状态">{{ getOptionLabel(HEALTH_STATUS_OPTIONS, importResult.connection.healthStatus) }}</el-descriptions-item>
        <el-descriptions-item label="耗时（ms）">{{ importResult.connection.latencyMs }}</el-descriptions-item>
        <el-descriptions-item label="信息">{{ importResult.connection.message || '-' }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <template v-if="importResult.sync">
      <el-divider content-position="left">元数据同步</el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="结果">
          <el-tag :type="importResult.sync.success ? 'success' : 'danger'">{{ importResult.sync.success ? '成功' : '失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="任务号">{{ importResult.sync.taskNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="表 增/改/删">{{ importResult.sync.tableAdded }} / {{ importResult.sync.tableChanged }} / {{ importResult.sync.tableRemoved }}</el-descriptions-item>
        <el-descriptions-item label="字段 增/改/删">{{ importResult.sync.columnAdded }} / {{ importResult.sync.columnChanged }} / {{ importResult.sync.columnRemoved }}</el-descriptions-item>
        <el-descriptions-item label="关系新增">{{ importResult.sync.relationAdded }}</el-descriptions-item>
        <el-descriptions-item label="结构版本">{{ importResult.sync.structVersionBefore }} → {{ importResult.sync.structVersionAfter }}</el-descriptions-item>
        <el-descriptions-item label="耗时（ms）">{{ importResult.sync.latencyMs }}</el-descriptions-item>
        <el-descriptions-item label="错误信息">{{ importResult.sync.errorMsg || '-' }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <template v-if="importResult.vector">
      <el-divider content-position="left">向量索引</el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="Embedding 可用">{{ importResult.vector.embeddingAvailable ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="模型">{{ importResult.vector.modelCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="维度">{{ importResult.vector.dimension || '-' }}</el-descriptions-item>
        <el-descriptions-item label="文档总数">{{ importResult.vector.totalDocuments }}</el-descriptions-item>
        <el-descriptions-item label="新增 / 更新 / 跳过">{{ importResult.vector.created }} / {{ importResult.vector.updated }} / {{ importResult.vector.skipped }}</el-descriptions-item>
        <el-descriptions-item label="下线">{{ importResult.vector.retired }}</el-descriptions-item>
        <el-descriptions-item label="已向量化 / 待向量化">{{ importResult.vector.embedded }} / {{ importResult.vector.pendingEmbedding }}</el-descriptions-item>
        <el-descriptions-item label="耗时（ms）">{{ importResult.vector.latencyMs }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <template v-if="importResult.warnings && importResult.warnings.length">
      <el-divider content-position="left">告警（非阻断）</el-divider>
      <el-alert
        v-for="(w, i) in importResult.warnings"
        :key="i"
        class="mb-8px"
        type="warning"
        :closable="false"
        show-icon
        :title="w"
      />
    </template>

    <div v-if="importResult.success" class="mt-16px">
      <el-button type="primary" plain @click="goTable">
        <Icon icon="ep:right" class="mr-5px" />查看已导入的表元数据
      </el-button>
      <el-button plain @click="goDatasource">返回数据源列表</el-button>
    </div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import {
  DS_TYPE_OPTIONS,
  HEALTH_STATUS_OPTIONS,
  IMPORT_STAGE_OPTIONS,
  IMPORT_STEP_STATUS_OPTIONS,
  TABLE_TYPE_OPTIONS,
  getImportStepStatusTagType,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as ImportApi from '@/api/dataQuery/metadataimport'

defineOptions({ name: 'DataQueryMetadataImport' })

const message = useMessage()
const router = useRouter()
const route = useRoute()

/** 接入方式：new 新建数据源、existing 复用已有数据源 */
const mode = ref<'new' | 'existing'>('new')

const formRef = ref()
const formData = reactive({
  datasourceId: undefined as number | undefined,
  name: '',
  code: '',
  dsType: 2,
  jdbcUrl: '',
  username: '',
  password: '',
  schemaName: '',
  catalogName: '',
  driverClass: '',
  dialect: '',
  readonlyUrl: '',
  readonlyUsername: '',
  readonlyPassword: ''
})

const scanScope = reactive({
  allowedSchemas: '',
  includeTables: '',
  excludeTables: ''
})

const options = reactive({
  maxRows: 1000,
  buildVector: true,
  reuseExisting: true
})

const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const previewResult = ref<ImportApi.MetadataPreviewRespVO>()
const importResult = ref<ImportApi.MetadataImportRespVO>()
const previewLoading = ref(false)
const importLoading = ref(false)

const formRules = computed(() => {
  const rules: Record<string, any> = {}
  if (mode.value === 'existing') {
    rules.datasourceId = [{ required: true, message: '请选择数据源', trigger: 'change' }]
  } else {
    rules.name = [{ required: true, message: '数据源名称不能为空', trigger: 'blur' }]
    rules.code = [{ required: true, message: '数据源编码不能为空', trigger: 'blur' }]
    rules.jdbcUrl = [{ required: true, message: 'JDBC 地址不能为空', trigger: 'blur' }]
    rules.dsType = [{ required: true, message: '请选择数据库类型', trigger: 'change' }]
  }
  return rules
})

const handleModeChange = () => {
  previewResult.value = undefined
  formRef.value?.clearValidate()
}

/** 逗号 / 空格分隔文本转正则或 schema 数组，空串转 undefined 避免后端当成「空白名单」 */
const toArray = (text: string): string[] | undefined => {
  const arr = (text || '')
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  return arr.length ? arr : undefined
}

/** 是否填了任一扫描范围（用于复用模式下提示范围收窄的影响） */
const hasScope = computed(
  () =>
    !!toArray(scanScope.allowedSchemas) ||
    !!toArray(scanScope.includeTables) ||
    !!toArray(scanScope.excludeTables)
)

const buildReq = (): ImportApi.MetadataImportReqVO => {  const base: ImportApi.MetadataImportReqVO = {
    allowedSchemas: toArray(scanScope.allowedSchemas),
    includeTables: toArray(scanScope.includeTables),
    excludeTables: toArray(scanScope.excludeTables),
    maxRows: options.maxRows,
    buildVector: options.buildVector,
    reuseExisting: options.reuseExisting
  }
  if (mode.value === 'existing') {
    return { ...base, datasourceId: formData.datasourceId }
  }
  return {
    ...base,
    name: formData.name,
    code: formData.code,
    dsType: formData.dsType,
    jdbcUrl: formData.jdbcUrl,
    username: formData.username || undefined,
    password: formData.password || undefined,
    schemaName: formData.schemaName || undefined,
    catalogName: formData.catalogName || undefined,
    driverClass: formData.driverClass || undefined,
    dialect: formData.dialect || undefined,
    readonlyUrl: formData.readonlyUrl || undefined,
    readonlyUsername: formData.readonlyUsername || undefined,
    readonlyPassword: formData.readonlyPassword || undefined
  }
}

const getDatasourceOptions = async () => {
  datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
}

const handlePreview = async () => {
  if (!(await formRef.value.validate())) return
  previewLoading.value = true
  try {
    const data: ImportApi.MetadataPreviewRespVO = await ImportApi.previewMetadataImport(buildReq())
    previewResult.value = data
    importResult.value = undefined
    if (data.success) {
      message.success(`扫描完成：${data.tableCount} 张表 / ${data.columnCount} 个字段`)
    } else {
      message.error(data.errorMsg || '预览扫描失败')
    }
  } finally {
    previewLoading.value = false
  }
}

const handleImport = async () => {
  if (!(await formRef.value.validate())) return
  try {
    await message.confirm(
      `确认执行一键导入？将创建/复用数据源，并写入全量元数据${options.buildVector ? '与向量索引' : ''}，重复导入不会回滚已写入内容。`
    )
  } catch {
    return
  }
  importLoading.value = true
  try {
    const data: ImportApi.MetadataImportRespVO = await ImportApi.importMetadata(buildReq())
    importResult.value = data
    previewResult.value = undefined
    if (data.success) {
      message.success(data.summary || '一键导入完成')
      // 导入成功后刷新下拉，后续可切到「复用已有数据源」重复预览
      await getDatasourceOptions()
    } else {
      message.error(data.summary || data.errorMsg || '一键导入失败')
    }
  } finally {
    importLoading.value = false
  }
}

const handleReset = () => {
  formRef.value?.resetFields()
  formData.datasourceId = undefined
  formData.name = ''
  formData.code = ''
  formData.dsType = 2
  formData.jdbcUrl = ''
  formData.username = ''
  formData.password = ''
  formData.schemaName = ''
  formData.catalogName = ''
  formData.driverClass = ''
  formData.dialect = ''
  formData.readonlyUrl = ''
  formData.readonlyUsername = ''
  formData.readonlyPassword = ''
  scanScope.allowedSchemas = ''
  scanScope.includeTables = ''
  scanScope.excludeTables = ''
  options.maxRows = 1000
  options.buildVector = true
  options.reuseExisting = true
  previewResult.value = undefined
  importResult.value = undefined
  formRef.value?.clearValidate()
}

const goTable = () => router.push('/data-query/datasource/ai-datasource-table')
const goDatasource = () => router.push('/data-query/datasource/ai-datasource')

onMounted(async () => {
  await getDatasourceOptions()
  // 从数据源列表「重新导入」进入时，直接切到复用模式并预选数据源
  const presetId = Number(route.query.datasourceId)
  if (presetId) {
    mode.value = 'existing'
    formData.datasourceId = presetId
  }
})

// 页面被 keep-alive 缓存时，再次从列表带编号进入同样生效
watch(
  () => route.query.datasourceId,
  (val) => {
    const presetId = Number(val)
    if (presetId) {
      mode.value = 'existing'
      formData.datasourceId = presetId
    }
  }
)
</script>
