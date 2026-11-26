<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="S6 SQL 静态校验（仅校验不执行）"
      description="对模型原始 SQL / 手工编辑 SQL 做数据源归属、白名单、只读、LIMIT 等逐项校验；通过时产出 SafeSql，拒绝时给出错误码与原因。本页不会执行任何 SQL。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">1. 校验参数</el-divider>
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
          type="primary"
          :loading="loading"
          v-hasPermi="['data-query:sql-guard:validate']"
          @click="handleValidate"
        >
          <Icon icon="ep:circle-check" class="mr-5px" />提交校验
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">2. 校验报告</el-divider>
    <template v-if="result">
      <el-alert
        :type="result.passed ? 'success' : 'error'"
        :closable="false"
        show-icon
        :title="result.passed ? '校验通过（PASS）' : '校验拒绝（REJECT）'"
        :description="`errorCode：${formatNullable(result.errorCode)} ｜ errorMsg：${formatNullable(result.errorMsg)}`"
        class="mb-15px"
      />
      <el-alert
        v-if="!result.passed"
        type="error"
        :closable="false"
        show-icon
        title="该 SQL 不可执行"
        description="校验未通过，safeSql 为 null（后端拒绝路径不产出可执行 SQL）。请依据下方 errorMsg 与 REJECT 明细修正后重新校验，切勿绕过闸门执行。"
        class="mb-15px"
      />

      <el-descriptions :column="3" border class="mb-15px">
        <el-descriptions-item label="是否通过 passed">
          <el-tag :type="result.passed ? 'success' : 'danger'">{{ result.passed ? 'PASS' : 'REJECT' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="错误码 errorCode">{{ formatNullable(result.errorCode) }}</el-descriptions-item>
        <el-descriptions-item label="拒绝原因 errorMsg">{{ formatNullable(result.errorMsg) }}</el-descriptions-item>
        <el-descriptions-item label="召回方式 recallMode">{{ recallModeLabel }}</el-descriptions-item>
        <el-descriptions-item label="自动追加 LIMIT（limitApplied）">
          <el-tag :type="result.limitApplied ? 'warning' : 'info'">{{ formatBool(result.limitApplied) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="LIMIT 超限收敛（limitClamped）">
          <el-tag :type="result.limitClamped ? 'warning' : 'info'">{{ formatBool(result.limitClamped) }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-collapse v-model="activeNames">
        <el-collapse-item title="原始 SQL（originalSql）" name="original">
          <pre class="sql-pre">{{ result.originalSql || '-' }}</pre>
        </el-collapse-item>
        <el-collapse-item title="可执行 SQL 载体（safeSql，对象）" name="safe">
          <pre class="sql-pre">{{ prettySafeSql }}</pre>
        </el-collapse-item>
        <el-collapse-item :title="`逐项校验明细（checks，共 ${result.checks?.length || 0} 项）`" name="checks">
          <template v-if="result.checks && result.checks.length">
            <div v-for="(item, idx) in result.checks" :key="idx" class="check-item">
              <el-tag :type="isRejectCheck(item) ? 'danger' : 'success'" size="small" class="mr-8px">
                {{ isRejectCheck(item) ? 'REJECT' : 'PASS' }}
              </el-tag>
              <span>{{ item }}</span>
            </div>
          </template>
          <el-empty v-else description="无校验明细" :image-size="50" />
        </el-collapse-item>
        <el-collapse-item :title="`白名单表（whitelistTables，共 ${result.whitelistTables?.length || 0} 项）`" name="tables">
          <template v-if="result.whitelistTables && result.whitelistTables.length">
            <el-tag v-for="(t, idx) in result.whitelistTables" :key="idx" type="info" class="mr-5px mb-5px">{{ t }}</el-tag>
          </template>
          <el-empty v-else description="无白名单表" :image-size="50" />
        </el-collapse-item>
        <el-collapse-item :title="`白名单列（whitelistColumns，共 ${result.whitelistColumns?.length || 0} 项）`" name="columns">
          <template v-if="result.whitelistColumns && result.whitelistColumns.length">
            <el-tag v-for="(c, idx) in result.whitelistColumns" :key="idx" type="info" class="mr-5px mb-5px">{{ c }}</el-tag>
          </template>
          <el-empty v-else description="无白名单列" :image-size="50" />
        </el-collapse-item>
        <el-collapse-item :title="`告警（warnings，共 ${result.warnings?.length || 0} 项）`" name="warnings">
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
    <el-empty v-else description="填写 SQL 后点击「提交校验」" :image-size="60" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { RECALL_MODE_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as SqlGuardApi from '@/api/dataQuery/sqlguard'
import { getAiDatasourceSimpleList } from '@/api/dataQuery/datasource'
import type { AiDatasourceSimpleRespVO } from '@/api/dataQuery/datasource'

defineOptions({ name: 'DataQuerySqlValidate' })

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
const result = ref<SqlGuardApi.SqlGuardResult>()
const activeNames = ref<string[]>(['original', 'safe', 'checks'])

const handleValidate = async () => {
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
  const data: SqlGuardApi.SqlGuardReqVO = {
    datasourceId: form.datasourceId,
    sql: form.sql,
    question: form.question.trim() || undefined,
    schemaContext
  }
  loading.value = true
  try {
    result.value = await SqlGuardApi.validate(data)
  } finally {
    loading.value = false
  }
}

const formatNullable = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return '-'
  return String(v)
}
const formatBool = (v?: boolean | null): string => {
  if (v === undefined || v === null) return '-'
  return v ? '是' : '否'
}
const isRejectCheck = (item: string): boolean => {
  return item.toUpperCase().includes('REJECT') || item.includes('拒绝')
}
const prettySafeSql = computed(() => {
  const safe = result.value?.safeSql
  if (safe === undefined || safe === null) return 'null'
  return JSON.stringify(safe, null, 2)
})
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
.check-item {
  display: flex;
  align-items: flex-start;
  padding: 4px 0;
  font-size: 13px;
}
</style>
