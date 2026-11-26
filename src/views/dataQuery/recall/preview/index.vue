<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="S3 Schema 召回预览"
      description="召回自检 / 联调端点：返回完整 SchemaContext（DDL 片段 + Join + 命中记录 + S6 表列白名单），不回显租户编号、向量字面量与任何业务数据行。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-form :inline="true" label-width="100px" class="-mb-15px">
      <el-form-item label="数据源">
        <el-select v-model="form.datasourceId" placeholder="请选择数据源" clearable filterable class="!w-260px">
          <el-option
            v-for="item in datasourceOptions"
            :key="item.id"
            :label="`${item.name} (${item.code})`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="Top-K">
        <el-input-number v-model="form.topK" :min="1" :max="20" :controls="false" class="!w-120px" />
      </el-form-item>
      <el-form-item label="召回问题">
        <el-input v-model="form.question" placeholder="请输入用户问题" clearable class="!w-360px" @keyup.enter="handlePreview" />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :loading="loading"
          @click="handlePreview"
          v-hasPermi="['data-query:schema-recall:query']"
        >
          <Icon icon="ep:search" class="mr-5px" />召回预览
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <template v-if="context">
    <ContentWrap>
      <el-divider content-position="left">概览（SchemaContext）</el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="数据源编号">{{ context.datasourceId }}</el-descriptions-item>
        <el-descriptions-item label="归一化问题" :span="3">{{ context.question || '-' }}</el-descriptions-item>
        <el-descriptions-item label="召回方式">
          <el-tag :type="context.recallMode === 'KEYWORD_DEGRADED' || context.recallMode === 'EMPTY' ? 'warning' : 'success'">
            {{ getOptionLabel(RECALL_MODE_OPTIONS, context.recallMode) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="是否降级">
          <el-tag :type="context.degraded ? 'danger' : 'success'">{{ context.degraded ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="建议澄清">
          <el-tag :type="context.recommendClarify ? 'warning' : 'info'">{{ context.recommendClarify ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="是否裁剪">
          <el-tag :type="context.truncated ? 'warning' : 'info'">{{ context.truncated ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="降级原因" :span="2">{{ context.degradeReason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Embedding 模型">{{ context.embeddingModelCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="向量维度">{{ context.dimension }}</el-descriptions-item>
        <el-descriptions-item label="结构版本">{{ context.structVersion }}</el-descriptions-item>
        <el-descriptions-item label="SQL 方言">{{ context.dialect || '-' }}</el-descriptions-item>
        <el-descriptions-item label="标识符引号">{{ context.identifierQuote || '-' }}</el-descriptions-item>
        <el-descriptions-item label="全引号">{{ getOptionLabel(YES_NO_OPTIONS, context.quoteAll) }}</el-descriptions-item>
        <el-descriptions-item label="Token 粗估">{{ context.tokenEstimate }}</el-descriptions-item>
        <el-descriptions-item label="召回耗时（ms）">{{ context.latencyMs }}</el-descriptions-item>
        <el-descriptions-item label="向量候选数">{{ context.vectorCandidateCount }}</el-descriptions-item>
        <el-descriptions-item label="关键词候选数">{{ context.keywordCandidateCount }}</el-descriptions-item>
        <el-descriptions-item label="命中表数">{{ context.hitTableCount }}</el-descriptions-item>
        <el-descriptions-item label="SQL 规则" :span="4">{{ context.sqlRules || '-' }}</el-descriptions-item>
      </el-descriptions>
    </ContentWrap>

    <ContentWrap>
      <el-divider content-position="left">明细分区（只读 JSON）</el-divider>
      <el-tabs type="border-card">
        <el-tab-pane label="Schema 文本">
          <pre class="json-pre">{{ context.schemaText }}</pre>
        </el-tab-pane>
        <el-tab-pane :label="`命中表 (${(context.tables || []).length})`">
          <pre class="json-pre">{{ toJson(context.tables) }}</pre>
        </el-tab-pane>
        <el-tab-pane :label="`Join 路径 (${(context.joins || []).length})`">
          <pre class="json-pre">{{ toJson(context.joins) }}</pre>
        </el-tab-pane>
        <el-tab-pane :label="`命中记录 (${(context.hits || []).length})`">
          <pre class="json-pre">{{ toJson(context.hits) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="表列白名单">
          <div class="mb-8px font-bold">表白名单 tableIds</div>
          <pre class="json-pre">{{ toJson(context.tableIds) }}</pre>
          <div class="mt-12px mb-8px font-bold">列白名单 columnIds</div>
          <pre class="json-pre">{{ toJson(context.columnIds) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="指标口径 / 同义词">
          <div class="mb-8px font-bold">指标口径 metricDefs</div>
          <pre class="json-pre">{{ toJson(context.metricDefs) }}</pre>
          <div class="mt-12px mb-8px font-bold">同义词 synonyms</div>
          <pre class="json-pre">{{ toJson(context.synonyms) }}</pre>
        </el-tab-pane>
      </el-tabs>
    </ContentWrap>
  </template>
  <ContentWrap v-else>
    <el-empty description="选择数据源并输入问题后点击「召回预览」" :image-size="60" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { RECALL_MODE_OPTIONS, YES_NO_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as RecallApi from '@/api/dataQuery/recall/preview'

defineOptions({ name: 'DataQuerySchemaRecall' })

const message = useMessage()

const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const form = reactive({
  datasourceId: undefined as number | undefined,
  question: '',
  topK: 6
})
const loading = ref(false)
const context = ref<RecallApi.SchemaContext>()

/** JSON 类字段统一格式化为只读文本 */
const toJson = (value: unknown): string => {
  if (value === undefined || value === null) return '[]'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const handlePreview = async () => {
  if (!form.datasourceId) {
    message.warning('请先选择数据源')
    return
  }
  if (!form.question.trim()) {
    message.warning('请输入召回问题')
    return
  }
  loading.value = true
  try {
    context.value = await RecallApi.previewSchemaRecall({
      datasourceId: form.datasourceId,
      question: form.question,
      topK: form.topK
    })
  } catch {
    message.error('召回预览失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
  } catch {
    message.error('数据源列表加载失败')
  }
})
</script>

<style scoped>
.json-pre {
  margin: 0;
  padding: 12px;
  max-height: 420px;
  overflow: auto;
  background: #f8fafc;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
