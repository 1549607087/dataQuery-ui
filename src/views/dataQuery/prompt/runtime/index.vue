<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="S4 提示词运行时渲染"
      description="按场景锁定已发布的版本快照进行渲染，可粘贴 S3 召回结果作为 schema；模板正文与租户信息不会回显。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">渲染入参</el-divider>
    <el-form label-width="120px" class="-mb-15px">
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
      <el-form-item label="场景编码">
        <el-select v-model="form.sceneCode" filterable allow-create default-first-option class="!w-260px">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
        <span class="ml-12px text-12px text-gray-400">不传时后端默认 SQL_GEN</span>
      </el-form-item>
      <el-form-item label="用户问题">
        <el-input v-model="form.question" :placeholder="'用户问题，注入 {{question}} 变量'" clearable class="!w-480px" />
      </el-form-item>
      <el-form-item label="自动召回 Schema">
        <el-switch v-model="form.recallSchema" />
        <span class="ml-12px text-12px text-gray-400">开启后服务端自行执行 S3 召回注入 schema；需同时提供数据源与问题</span>
      </el-form-item>
      <el-form-item label="Top-K">
        <el-input-number v-model="form.topK" :min="1" :max="20" :controls="false" class="!w-120px" />
        <span class="ml-12px text-12px text-gray-400">自动召回的表数量，取值 1~20</span>
      </el-form-item>
      <el-form-item label="Schema 文本">
        <el-input
          v-model="form.schema"
          type="textarea"
          :rows="5"
          :placeholder="'可粘贴 Schema 召回结果，注入 {{schema}} 变量'"
        />
      </el-form-item>
      <el-form-item label="扩展变量">
        <el-input v-model="variablesText" type="textarea" :rows="4" :placeholder="'扩展变量的 JSON 对象，可留空'" />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleRender"
          v-hasPermi="['data-query:prompt-runtime:query']"
        >
          <Icon icon="ep:document-checked" class="mr-5px" />执行渲染
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <template v-if="result">
    <ContentWrap>
      <el-divider content-position="left">渲染结果（PromptRenderRespVO）</el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="场景编码">{{ result.sceneCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="模板编号">{{ result.promptId }}</el-descriptions-item>
        <el-descriptions-item label="版本快照编号">{{ result.promptVersionId }}</el-descriptions-item>
        <el-descriptions-item label="版本号">{{ result.version }}</el-descriptions-item>
        <el-descriptions-item label="模板归属租户">{{ result.templateTenantId }}</el-descriptions-item>
        <el-descriptions-item label="回落平台模板">
          <el-tag :type="result.fallbackToPlatform ? 'warning' : 'success'">{{ result.fallbackToPlatform ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Token 粗估">{{ result.tokenEstimate }}</el-descriptions-item>
        <el-descriptions-item label="召回方式">
          <el-tag :type="result.recallMode === 'KEYWORD_DEGRADED' || result.recallMode === 'EMPTY' ? 'warning' : 'success'">
            {{ getOptionLabel(RECALL_MODE_OPTIONS, result.recallMode) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="召回降级">
          <el-tag :type="result.recallDegraded ? 'danger' : 'success'">{{ result.recallDegraded ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="命中表数">{{ result.recallTableCount }}</el-descriptions-item>
        <el-descriptions-item label="召回降级原因" :span="2">{{ result.recallDegradeReason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="正文哈希 contentHash" :span="2">{{ result.contentHash || '-' }}</el-descriptions-item>
        <el-descriptions-item label="快照哈希 snapshotHash" :span="2">{{ result.snapshotHash || '-' }}</el-descriptions-item>
      </el-descriptions>
    </ContentWrap>

    <ContentWrap>
      <el-divider content-position="left">变量审计（模板声明 / 注入 / 缺失 / 未使用）</el-divider>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="模板声明变量">{{ result.declaredVariables?.join(', ') || '-' }}</el-descriptions-item>
        <el-descriptions-item label="实际注入变量">{{ result.providedVariables?.join(', ') || '-' }}</el-descriptions-item>
        <el-descriptions-item label="未登记变量">
          <el-tag v-if="result.undeclaredVariables?.length" type="warning">{{ result.undeclaredVariables.join(', ') }}</el-tag>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="缺失必填变量">
          <el-tag v-if="result.missingVariables?.length" type="danger">{{ result.missingVariables.join(', ') }}</el-tag>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="未使用变量" :span="2">{{ result.unusedVariables?.join(', ') || '-' }}</el-descriptions-item>
      </el-descriptions>
    </ContentWrap>

    <ContentWrap>
      <el-divider content-position="left">渲染正文 content（只读）</el-divider>
      <pre class="json-pre">{{ result.content }}</pre>
    </ContentWrap>
  </template>
  <ContentWrap v-else>
    <el-empty description="填写入参后点击「执行渲染」" :image-size="60" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { RECALL_MODE_OPTIONS, SCENE_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as RuntimeApi from '@/api/dataQuery/prompt/runtime'

defineOptions({ name: 'DataQueryPromptRuntime' })

const message = useMessage()

const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const form = reactive({
  datasourceId: undefined as number | undefined,
  sceneCode: 'SQL_GEN',
  question: '',
  schema: '',
  recallSchema: false,
  topK: 6
})
const variablesText = ref('')
const loading = ref(false)
const result = ref<RuntimeApi.PromptRenderRespVO>()

const handleRender = async () => {
  let variables: Record<string, string> = {}
  if (variablesText.value.trim()) {
    try {
      const parsed = JSON.parse(variablesText.value)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        message.error('扩展变量必须是 JSON 对象')
        return
      }
      variables = parsed
    } catch {
      message.error('扩展变量不是合法的 JSON，请检查格式')
      return
    }
  }
  if (!form.datasourceId) {
    message.warning('请先选择数据源')
    return
  }
  loading.value = true
  try {
    result.value = await RuntimeApi.renderPrompt({
      sceneCode: form.sceneCode,
      datasourceId: form.datasourceId,
      question: form.question,
      schema: form.schema || undefined,
      variables,
      recallSchema: form.recallSchema,
      topK: form.topK
    })
  } catch {
    message.error('提示词渲染失败，请稍后重试')
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
  max-height: 480px;
  overflow: auto;
  background: #f8fafc;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
