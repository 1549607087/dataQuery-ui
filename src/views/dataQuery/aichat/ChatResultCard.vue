<template>
  <ContentWrap>
    <!-- 终态与关键链路信息 -->
    <div class="mb-10px flex flex-wrap items-center">
      <el-tag :type="statusTagType" size="small" class="mr-8px">{{ statusLabel }}</el-tag>
      <span class="text-12px text-gray-400">
        耗时 {{ formatNullable(response.latencyMs) }} ms
        <span v-if="response.traceId" class="ml-8px">traceId：{{ response.traceId }}</span>
        <span v-if="response.fixRounds" class="ml-8px">修正轮次：{{ response.fixRounds }}</span>
      </span>
    </div>

    <el-descriptions v-if="!isStopped" :column="4" border size="small" class="mb-12px">
      <el-descriptions-item label="召回方式">{{ recallModeLabel }}</el-descriptions-item>
      <el-descriptions-item label="命中表数">{{
        formatNullable(response.recallTableCount)
      }}</el-descriptions-item>
      <el-descriptions-item label="结构版本">{{
        formatNullable(response.structVersion)
      }}</el-descriptions-item>
      <el-descriptions-item label="模型">{{
        formatNullable(response.modelId)
      }}</el-descriptions-item>
      <el-descriptions-item label="提示词版本">{{
        formatNullable(response.promptVersionId)
      }}</el-descriptions-item>
      <el-descriptions-item label="意图">{{
        formatNullable(response.intentCode)
      }}</el-descriptions-item>
      <el-descriptions-item label="消息编号">{{
        formatNullable(response.messageId)
      }}</el-descriptions-item>
      <el-descriptions-item label="召回降级">
        <el-tag :type="response.recallDegraded ? 'warning' : 'info'" size="small">
          {{ response.recallDegraded ? '是' : '否' }}
        </el-tag>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 非成功终态：说明原因，避免把失败结果当业务数据看 -->
    <el-alert
      v-if="response.status === 'CLARIFY'"
      type="warning"
      :closable="false"
      show-icon
      class="mb-12px"
      title="需要补充信息后才能生成 SQL"
      :description="clarifyText"
    />
    <el-alert
      v-else-if="response.status === 'REJECT'"
      type="error"
      :closable="false"
      show-icon
      class="mb-12px"
      title="SQL 未通过安全闸门，已被拒绝执行"
      :description="errorText"
    />
    <el-alert
      v-else-if="response.status === 'FAILED'"
      type="error"
      :closable="false"
      show-icon
      class="mb-12px"
      title="问数链路失败"
      :description="errorText"
    />
    <el-alert
      v-else-if="response.status === 'DEGRADED'"
      type="warning"
      :closable="false"
      show-icon
      class="mb-12px"
      title="已降级返回"
      :description="degradeText"
    />
    <el-alert
      v-else-if="isStopped"
      type="info"
      :closable="false"
      show-icon
      class="mb-12px"
      title="本轮已停止生成"
      description="你主动停止了本轮回答，已产生的内容按停止状态留痕，不展示结果表格。重新提问或重新生成可继续。"
    />

    <!-- 指标卡 -->
    <div
      v-if="isMetric && !isStopped"
      class="mb-12px rounded-8px bg-[var(--el-fill-color-light)] p-16px"
    >
      <div class="text-12px text-gray-400">{{ metricLabel }}</div>
      <div class="mt-4px text-30px font-600 text-[var(--el-color-primary)]">{{ metricValue }}</div>
      <div v-if="response.chartSpec?.reason" class="mt-4px text-12px text-gray-400">
        {{ response.chartSpec?.reason }}
      </div>
    </div>

    <!-- 规则图表：直接复用接口返回的行数据，不额外聚合 -->
    <div v-else-if="showChart && !isStopped" class="mb-12px">
      <div class="mb-4px flex items-center">
        <span class="text-13px font-600">{{ response.chartSpec?.title }}</span>
        <el-tag type="info" size="small" class="ml-8px">{{ chartTypeLabel }}</el-tag>
        <span v-if="response.chartSpec?.reason" class="ml-8px text-12px text-gray-400">
          {{ response.chartSpec?.reason }}
        </span>
      </div>
      <Echart :height="320" :options="chartOption" />
    </div>

    <!-- 结果表格：列名与类型均来自 QueryResult，行按索引取值；用户停止时整块不渲染 -->
    <el-collapse v-if="!isStopped" v-model="activeNames">
      <el-collapse-item :title="`查询结果（${tableRows.length} 行）`" name="rows">
        <el-table
          v-if="tableRows.length"
          :data="tableRows"
          :fit="false"
          height="360"
          border
          stripe
          size="small"
          style="width: 100%"
        >
          <el-table-column type="index" label="#" width="56" fixed="left" align="center" />
          <el-table-column
            v-for="(col, idx) in columnNames"
            :key="idx"
            :min-width="150"
            show-overflow-tooltip
          >
            <template #header>
              <span>{{ col }}</span>
              <span v-if="columnTypes[idx]" class="ml-4px text-11px text-gray-400">
                {{ columnTypes[idx] }}
              </span>
            </template>
            <template #default="scope">{{ formatCell(scope.row[idx]) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="本次查询没有返回数据行" :image-size="60" />

        <div v-if="resultWarnings.length" class="mt-8px">
          <el-alert
            v-for="(warn, idx) in resultWarnings"
            :key="idx"
            type="warning"
            :closable="false"
            show-icon
            :title="warn"
            class="mb-4px"
          />
        </div>
        <div v-if="result?.truncated || result?.masked" class="mt-8px flex flex-wrap">
          <el-tag v-if="result?.truncated" type="warning" size="small" class="mr-8px">
            已按 max_rows 截断，可能还有更多行
          </el-tag>
          <el-tag v-if="result?.masked" type="warning" size="small">结果已按脱敏规则处理</el-tag>
        </div>
      </el-collapse-item>

      <el-collapse-item title="SQL 与口径说明" name="sql">
        <div class="mb-8px">
          <div class="mb-4px flex items-center">
            <span class="text-13px font-600">最终 SQL</span>
            <el-button
              link
              type="primary"
              size="small"
              class="ml-8px"
              @click="copyText(response.sql)"
            >
              复制
            </el-button>
            <el-tag v-if="result?.readonlyConnection" type="success" size="small" class="ml-8px"
              >独立只读连接</el-tag
            >
          </div>
          <pre class="code-pre">{{ response.sql || '-' }}</pre>
        </div>
        <div v-if="showGenerated && response.generatedSql !== response.sql" class="mb-8px">
          <div class="mb-4px text-13px font-600">模型原始 SQL（generatedSql）</div>
          <pre class="code-pre">{{ response.generatedSql }}</pre>
        </div>
        <div v-if="showExecuted && response.executedSql !== response.sql" class="mb-8px">
          <div class="mb-4px text-13px font-600">实际执行 SQL（executedSql）</div>
          <pre class="code-pre">{{ response.executedSql }}</pre>
        </div>
        <div v-if="response.explain" class="mb-8px">
          <div class="mb-4px text-13px font-600">口径说明（不含业务数据行）</div>
          <pre class="code-pre">{{ response.explain }}</pre>
        </div>
        <div v-if="response.summary" class="mb-8px">
          <div class="mb-4px text-13px font-600">结果摘要（模型生成，仅供参考）</div>
          <pre class="code-pre">{{ response.summary }}</pre>
        </div>
        <div v-if="response.recallDegradeReason" class="mb-8px">
          <div class="mb-4px text-13px font-600">召回降级原因</div>
          <pre class="code-pre">{{ response.recallDegradeReason }}</pre>
        </div>
      </el-collapse-item>

      <el-collapse-item
        v-if="canFeedback"
        :title="feedbackSubmitted ? '结果反馈（已提交，待人工审核）' : '结果反馈'"
        name="feedback"
      >
        <el-alert
          v-if="feedbackSubmitted"
          type="success"
          :closable="false"
          show-icon
          title="反馈已提交"
          description="纠正后的 SQL 仅入库供人工审核，不会自动执行，也不会自动改写线上提示词版本。"
        />
        <el-form v-else label-width="110px" class="-mb-15px">
          <el-form-item label="评分">
            <el-rate v-model="feedback.rating" :max="5" show-score score-template="{value} 分" />
          </el-form-item>
          <el-form-item label="反馈类型">
            <el-select
              v-model="feedback.feedbackType"
              placeholder="请选择或输入反馈类型"
              filterable
              allow-create
              default-first-option
              clearable
              class="!w-260px"
            >
              <el-option
                v-for="item in CHAT_FEEDBACK_TYPE_OPTIONS"
                :key="String(item.value)"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="文字反馈">
            <el-input
              v-model="feedback.comment"
              type="textarea"
              :rows="2"
              maxlength="500"
              show-word-limit
              placeholder="例如：金额口径应为含税金额"
              class="!w-620px"
            />
          </el-form-item>
          <el-form-item label="纠正 SQL">
            <el-input
              v-model="feedback.correctedSql"
              type="textarea"
              :rows="3"
              maxlength="4000"
              placeholder="可选：填写你认为正确的 SQL，仅作人工审核参考"
              class="!w-620px"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="feedbackSubmitting"
              v-hasPermi="['data-query:ai-chat:feedback']"
              @click="handleSubmitFeedback"
            >
              提交反馈
            </el-button>
            <span class="ml-10px text-12px text-gray-400">
              归属与关联审计由服务端按登录态固化，只能评价本人发起的问数
            </span>
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>

    <!-- 消息级操作：仅对已落库的助手消息展示 -->
    <div v-if="showMessageActions && !readonly" class="mt-10px flex items-center justify-end">
      <el-tag
        v-if="version && version > 1"
        type="info"
        size="small"
        class="mr-8px"
        title="同一问题下的回答版本"
      >
        回答 v{{ version }}
      </el-tag>
      <el-button
        link
        size="small"
        :disabled="active === false"
        title="沿用原问题重跑整条链路，旧版本会作废"
        @click="handleRegenerate"
      >
        <Icon icon="ep:refresh-right" class="mr-2px" />重新生成
      </el-button>
      <el-button
        size="small"
        :class="{ 'is-liked': rating === 1 }"
        :title="rating === 1 ? '点击取消点赞' : '点赞这条回答'"
        @click="handleRate(1)"
      >
        <Icon :icon="rating === 1 ? 'fa-solid:thumbs-up' : 'fa:thumbs-o-up'" class="mr-2px" />赞
      </el-button>
      <el-button
        size="small"
        :class="{ 'is-disliked': rating === -1 }"
        :title="rating === -1 ? '点击取消点踩' : '点踩这条回答'"
        @click="handleRate(-1)"
      >
        <Icon
          :icon="rating === -1 ? 'fa-solid:thumbs-down' : 'fa:thumbs-o-down'"
          class="mr-2px"
        />踩
      </el-button>
      <el-button link size="small" @click="handleVersions">
        <Icon icon="ep:files" class="mr-2px" />历史版本
      </el-button>
    </div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import type { EChartsOption } from 'echarts'
import { Echart } from '@/components/Echart'
import {
  CHART_TYPE_OPTIONS,
  CHAT_FEEDBACK_TYPE_OPTIONS,
  CHAT_STATUS_OPTIONS,
  getChatStatusTagType,
  getOptionLabel,
  RECALL_MODE_OPTIONS
} from '@/api/dataQuery/constants'
import { submitChatFeedback, type ChatAnswerView } from '@/api/dataQuery/aichat'
import type { ChatId } from '@/api/dataQuery/chat'

defineOptions({ name: 'DataQueryAiChatResultCard' })

const props = defineProps<{
  response: ChatAnswerView
  /** 已落库消息编号；为空表示实时响应（还没有消息 id），不展示消息级操作 */
  messageId?: ChatId
  /** 赞踩：-1 踩 / 0 未评价 / 1 赞 */
  rating?: number
  /** 同一问题下的回答版本，>1 时提示存在历史版本 */
  version?: number
  /** 是否当前主链，false 表示历史版本不可重新生成 */
  active?: boolean
  /** 查看的是历史问题版本：只读，不展示重新生成 / 赞踩 / 版本等操作 */
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'regenerate', messageId: ChatId): void
  (e: 'rate', messageId: ChatId, rating: number): void
  (e: 'versions', messageId: ChatId): void
}>()

const message = useMessage()

const activeNames = ref<string[]>(['rows', 'sql'])

const statusLabel = computed(() => getOptionLabel(CHAT_STATUS_OPTIONS, props.response.status))
const statusTagType = computed(() => getChatStatusTagType(props.response.status))

/**
 * 用户主动停止（终态 STOPPED）：半成品结果不能当业务数据展示。
 * 状态标签与说明保留，指标卡、图表、结果表格、SQL 折叠整块不渲染。
 */
const isStopped = computed(() => props.response.status === 'STOPPED')

const result = computed(() => props.response.result)
const columnNames = computed(() => result.value?.columnNames ?? [])
const columnTypes = computed(() => result.value?.columnTypes ?? [])
const tableRows = computed<any[][]>(() => (result.value?.rows ?? []) as any[][])
const resultWarnings = computed(() => result.value?.warnings ?? [])

const recallModeLabel = computed(() => {
  const mode = props.response.recallMode
  if (!mode) return '-'
  return getOptionLabel(RECALL_MODE_OPTIONS, mode)
})

const clarifyText = computed(() => {
  const msg = props.response.errorMsg || '未召回可用表列'
  return `${msg}。可补充业务口径、时间范围或指标名称后重试。`
})

const errorText = computed(() => {
  const code = props.response.errorCode ? `错误码 ${props.response.errorCode}：` : ''
  return `${code}${props.response.errorMsg || '未返回具体原因，请查看服务端日志'}`
})

const degradeText = computed(() => {
  const reason = props.response.degradeReason || props.response.errorMsg || '未返回降级原因'
  return `${reason}${props.response.recallDegradeReason ? `；召回降级：${props.response.recallDegradeReason}` : ''}`
})

const showGenerated = computed(() => !!props.response.generatedSql)
const showExecuted = computed(() => !!props.response.executedSql)

// ---------- 图表 ----------
const isMetric = computed(() => props.response.chartSpec?.type === 'metric')
const chartTypeLabel = computed(() =>
  getOptionLabel(CHART_TYPE_OPTIONS, props.response.chartSpec?.type)
)

const metricLabel = computed(() => props.response.chartSpec?.yFields?.[0] ?? '指标')
const metricValue = computed(() => {
  const spec = props.response.chartSpec
  const names = columnNames.value
  const idx = spec?.yFields?.length ? names.indexOf(spec.yFields[0]) : -1
  const row = tableRows.value[0]
  if (idx < 0 || !row) return '-'
  return formatNumber(row[idx])
})

const showChart = computed(() => {
  const spec = props.response.chartSpec
  if (!spec?.renderable) return false
  if (!['line', 'bar', 'pie'].includes(spec.type || '')) return false
  return tableRows.value.length > 0
})

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const toText = (v: any): string => {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const chartOption = computed<EChartsOption>(() => {
  const spec = props.response.chartSpec
  const names = columnNames.value
  const rows = tableRows.value
  if (!spec || !names.length || !rows.length) return {}
  const xIdx = names.indexOf(spec.xField || names[0])
  const yFields = (spec.yFields ?? []).filter((f) => names.includes(f))
  if (xIdx < 0 || !yFields.length) return {}

  if (spec.type === 'pie') {
    const yIdx = names.indexOf(yFields[0])
    return {
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', top: 0 },
      series: [
        {
          type: 'pie',
          radius: ['38%', '64%'],
          center: ['50%', '56%'],
          data: rows.map((row) => ({ name: toText(row[xIdx]), value: toNumber(row[yIdx]) })),
          label: { formatter: '{b}: {d}%' }
        }
      ]
    } as EChartsOption
  }

  const categories = rows.map((row) => toText(row[xIdx]))
  return {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', top: 0 },
    grid: { left: 12, right: 24, top: 36, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { rotate: categories.length > 8 ? 30 : 0 }
    },
    yAxis: { type: 'value' },
    series: yFields.map((field) => {
      const idx = names.indexOf(field)
      return {
        name: field,
        type: spec.type === 'line' ? 'line' : 'bar',
        smooth: spec.type === 'line',
        barMaxWidth: 36,
        data: rows.map((row) => toNumber(row[idx]))
      }
    })
  } as EChartsOption
})

// ---------- 反馈 ----------
const canFeedback = computed(() => !!result.value?.auditId)
const feedbackSubmitted = ref(false)
const feedbackSubmitting = ref(false)
const feedback = reactive({
  rating: 5,
  feedbackType: '' as string,
  comment: '',
  correctedSql: ''
})

const handleSubmitFeedback = async () => {
  const auditId = result.value?.auditId
  if (!auditId) {
    message.warning('本次结果缺少审计编号，无法提交反馈')
    return
  }
  if (!feedback.rating) {
    message.warning('请先选择评分')
    return
  }
  feedbackSubmitting.value = true
  try {
    await submitChatFeedback({
      auditId,
      rating: feedback.rating,
      feedbackType: feedback.feedbackType || undefined,
      comment: feedback.comment.trim() || undefined,
      correctedSql: feedback.correctedSql.trim() || undefined
    })
    feedbackSubmitted.value = true
    message.success('反馈已提交，等待人工审核')
  } finally {
    feedbackSubmitting.value = false
  }
}

// ---------- 展示辅助 ----------
const formatNullable = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return '-'
  return String(v)
}
const formatNumber = (v: any): string => {
  if (v === undefined || v === null || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return toText(v)
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}
const formatCell = (v: any): string => {
  if (v === undefined || v === null) return '-'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
const copyText = async (text?: string) => {
  if (!text) {
    message.warning('没有可复制的 SQL')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动选中复制')
  }
}

// ---------- 消息级操作 ----------
const showMessageActions = computed(() => !!props.messageId && String(props.messageId) !== '0')

const handleRegenerate = () => {
  if (!props.messageId) return
  emit('regenerate', props.messageId)
}

/** 再次点击同一评分视为取消（后端 0 表示未评价） */
const handleRate = (value: number) => {
  if (!props.messageId) return
  emit('rate', props.messageId, props.rating === value ? 0 : value)
}

const handleVersions = () => {
  if (!props.messageId) return
  emit('versions', props.messageId)
}
</script>

<style scoped>
.code-pre {
  max-height: 260px;
  padding: 10px 12px;
  margin: 0;
  overflow: auto;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.is-liked {
  font-weight: 600;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
  animation: rate-pop 0.24s ease;
}

.is-disliked {
  font-weight: 600;
  color: var(--el-color-danger);
  background-color: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-7);
  animation: rate-pop 0.24s ease;
}

@keyframes rate-pop {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.14);
  }
}
</style>
