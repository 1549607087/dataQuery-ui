<template>
  <ContentWrap>
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="S7 只读执行（危险操作）"
      description="校验通过后走独立只读连接实际执行 SQL，会占用数据库资源并产生查询审计。提交前会二次确认，请确认 SQL 已过 S6 闸门且不含敏感数据。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">1. 执行参数</el-divider>
    <el-form label-width="120px" class="-mb-15px">
      <el-form-item label="数据源">
        <el-select v-model="form.datasourceId" placeholder="请选择数据源" filterable clearable class="!w-300px">
          <el-option
            v-for="ds in datasourceOptions"
            :key="ds.id"
            :label="`${ds.name} (${ds.code})`"
            :value="ds.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="用户问题">
        <el-input v-model="form.question" clearable class="!w-500px" :placeholder="questionPlaceholder" />
        <span class="ml-10px text-12px text-gray-400">schemaContext 留空时由服务端据此自动召回</span>
      </el-form-item>
      <el-form-item label="schemaContext">
        <el-input
          v-model="form.schemaContextText"
          type="textarea"
          :rows="4"
          class="!w-700px"
          :placeholder="schemaPlaceholder"
        />
      </el-form-item>
      <el-form-item label="SQL 文本">
        <el-input
          v-model="form.sql"
          type="textarea"
          :rows="8"
          class="!w-700px"
          :placeholder="sqlPlaceholder"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="danger"
          :loading="loading"
          v-hasPermi="['data-query:sql-guard:execute']"
          @click="handleExecute"
        >
          <Icon icon="ep:video-play" class="mr-5px" />执行查询
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">2. 执行结果</el-divider>
    <template v-if="result">
      <el-descriptions :column="4" border class="mb-15px">
        <el-descriptions-item label="审计编号 auditId">{{ formatNullable(result.auditId) }}</el-descriptions-item>
        <el-descriptions-item label="链路 ID traceId">{{ formatNullable(result.traceId) }}</el-descriptions-item>
        <el-descriptions-item label="返回行数 rowCount">{{ formatNullable(result.rowCount) }}</el-descriptions-item>
        <el-descriptions-item label="耗时 latencyMs（ms）">{{ formatNullable(result.latencyMs) }}</el-descriptions-item>
        <el-descriptions-item label="召回方式 recallMode">{{ recallModeLabel }}</el-descriptions-item>
        <el-descriptions-item label="触达上限 truncated">
          <el-tag :type="result.truncated ? 'warning' : 'info'">{{ formatBool(result.truncated) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="结果已脱敏 masked">
          <el-tag :type="result.masked ? 'warning' : 'info'">{{ formatBool(result.masked) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="独立只读通道 readonlyConnection">
          <el-tag :type="result.readonlyConnection ? 'success' : 'warning'">{{ formatBool(result.readonlyConnection) }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-collapse v-model="activeNames">
        <el-collapse-item title="实际执行 SQL（executedSql）" name="executed">
          <pre class="sql-pre">{{ result.executedSql || '-' }}</pre>
        </el-collapse-item>
        <el-collapse-item :title="`结果列（columnNames / columnTypes，共 ${result.columnNames?.length || 0} 列）`" name="columns">
          <template v-if="result.columnNames && result.columnNames.length">
            <el-tag
              v-for="(col, idx) in result.columnNames"
              :key="idx"
              type="info"
              class="mr-5px mb-5px"
            >{{ formatColumnLabel(col, idx) }}</el-tag>
          </template>
          <el-empty v-else description="无结果列" :image-size="50" />
        </el-collapse-item>
        <el-collapse-item :title="`数据行（rows，共 ${tableRows.length} 行）`" name="rows">
          <el-table
            v-if="tableRows.length"
            :data="tableRows"
            :fit="false"
            height="420"
            border
            stripe
            size="small"
            style="width: 100%"
          >
            <el-table-column type="index" label="#" width="60" fixed="left" align="center" />
            <el-table-column
              v-for="(col, idx) in (result.columnNames || [])"
              :key="idx"
              :label="formatColumnLabel(col, idx)"
              :prop="String(idx)"
              min-width="160"
              show-overflow-tooltip
            >
              <template #default="scope">{{ formatCell(scope.row[idx]) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="本次查询无数据行" :image-size="60" />
        </el-collapse-item>
        <el-collapse-item :title="`执行告警（warnings，共 ${result.warnings?.length || 0} 项）`" name="warnings">
          <template v-if="result.warnings && result.warnings.length">
            <el-alert
              v-for="(w, idx) in result.warnings"
              :key="idx"
              type="warning"
              :closable="false"
              :title="w"
              class="mb-8px"
            />
          </template>
          <el-empty v-else description="无告警" :image-size="50" />
        </el-collapse-item>
      </el-collapse>
    </template>
    <el-empty v-else description="填写 SQL 后点击「执行查询」" :image-size="60" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { RECALL_MODE_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as SqlGuardApi from '@/api/dataQuery/sqlguard'
import { getAiDatasourceSimpleList } from '@/api/dataQuery/datasource'
import type { AiDatasourceSimpleRespVO } from '@/api/dataQuery/datasource'

defineOptions({ name: 'DataQuerySqlExecute' })

const message = useMessage()

const datasourceOptions = ref<AiDatasourceSimpleRespVO[]>([])
const loadDatasourceList = async () => {
  try {
    datasourceOptions.value = await getAiDatasourceSimpleList()
  } catch {
    // 数据源列表仅用于下拉，加载失败不阻塞手工填写
  }
}
onMounted(() => {
  loadDatasourceList()
})

const questionPlaceholder = '请输入用户问题（schemaContext 为空时必填，用于服务端自动召回）'
const schemaPlaceholder =
  '可选：粘贴 S3 召回结果 SchemaContext JSON，例如 {"tableIds":[1],"columnIds":[2]}；留空则不传，由服务端按 question 自动召回'
const sqlPlaceholder = '粘贴模型原始 SQL 或手工编辑后的 SQL，支持 markdown ```sql 代码块'

const form = reactive({
  datasourceId: undefined as number | undefined,
  sql: '',
  question: '',
  schemaContextText: ''
})

const loading = ref(false)
const result = ref<SqlGuardApi.QueryResult>()
const activeNames = ref<string[]>(['executed', 'columns', 'rows'])

const handleExecute = async () => {
  if (!form.datasourceId) {
    message.warning('请选择数据源')
    return
  }
  if (!form.sql.trim()) {
    message.warning('请输入 SQL 文本')
    return
  }
  let schemaContext: any = undefined
  const text = form.schemaContextText.trim()
  if (text) {
    try {
      schemaContext = JSON.parse(text)
    } catch {
      message.error('schemaContext 不是合法 JSON，请检查格式')
      return
    }
  }
  try {
    await message.confirm(
      '该操作会通过独立只读连接实际执行 SQL（已过 S6 闸门）。请确认 SQL 内容无误、不含敏感数据，是否继续？',
      '只读执行确认'
    )
  } catch {
    return
  }
  const data: SqlGuardApi.SqlGuardReqVO = {
    datasourceId: form.datasourceId,
    sql: form.sql,
    question: form.question.trim() || undefined,
    schemaContext
  }
  loading.value = true
  try {
    result.value = await SqlGuardApi.execute(data)
  } finally {
    loading.value = false
  }
}

const tableRows = computed<any[][]>(() => (result.value?.rows ?? []) as any[][])

const formatNullable = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return '-'
  return String(v)
}
const formatBool = (v?: boolean | null): string => {
  if (v === undefined || v === null) return '-'
  return v ? '是' : '否'
}
const formatCell = (v: any): string => {
  if (v === undefined || v === null) return '-'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
const formatColumnLabel = (name: string, idx: number): string => {
  const type = result.value?.columnTypes?.[idx]
  return type ? `${name} (${type})` : name
}
const recallModeLabel = computed(() => {
  const mode = result.value?.recallMode
  if (!mode) return '-'
  const label = getOptionLabel(RECALL_MODE_OPTIONS, mode)
  return label === mode ? mode : `${label} (${mode})`
})
</script>

<style scoped>
.sql-pre {
  margin: 0;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 320px;
  overflow: auto;
}
</style>
