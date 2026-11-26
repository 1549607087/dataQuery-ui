<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="模型治理链路联调台"
      description="路由预览不发起模型调用，用于验证启停、灰度、权重是否即时生效；联调调用会走完限流→熔断→超时→重试→跨供应商降级全链路；人工止血用于重置熔断与限流 key。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">1. 路由预览（不调用模型）</el-divider>
    <el-form :inline="true" label-width="100px" class="-mb-15px">
      <el-form-item label="场景编码">
        <el-select v-model="previewParams.sceneCode" placeholder="请选择场景" filterable class="!w-220px">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="用户编号">
        <el-input-number v-model="previewParams.userId" :min="0" :controls="false" placeholder="留空取当前登录用户" class="!w-180px" />
      </el-form-item>
      <el-form-item label="租户编号">
        <el-input-number v-model="previewParams.tenantId" :min="0" :controls="false" placeholder="留空默认 1" class="!w-180px" />
      </el-form-item>
      <el-form-item label="会话编号">
        <el-input-number v-model="previewParams.conversationId" :min="0" :controls="false" placeholder="可留空" class="!w-180px" />
      </el-form-item>
      <el-form-item label="Session ID">
        <el-input v-model="previewParams.sessionId" placeholder="可留空" clearable class="!w-200px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="previewLoading" @click="handlePreview" v-hasPermi="['data-query:ai-model-governance:query']">
          <Icon icon="ep:share" class="mr-5px" />预览路由
        </el-button>
      </el-form-item>
    </el-form>

    <template v-if="preview">
      <el-descriptions :column="4" border class="mt-15px">
        <el-descriptions-item label="场景编码">{{ preview.sceneCode }}</el-descriptions-item>
        <el-descriptions-item label="路由策略">{{ getOptionLabel(ROUTE_STRATEGY_OPTIONS, preview.routeStrategy) }}</el-descriptions-item>
        <el-descriptions-item label="候选表命中">
          <el-tag :type="preview.fromCandidateTable ? 'success' : 'warning'">{{ preview.fromCandidateTable ? '候选表' : '回落旧降级链' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="命中灰度">
          <el-tag :type="preview.gray ? 'warning' : 'info'">{{ preview.gray ? `是（${preview.grayGroup || '-'}）` : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="灰度实验编号">{{ preview.grayExperimentId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="分桶维度">{{ preview.grayBucketKey || '-' }}</el-descriptions-item>
        <el-descriptions-item label="分桶值">{{ preview.bucketValue || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提示词覆盖">{{ preview.promptIdOverride || '跟随路由' }}</el-descriptions-item>
      </el-descriptions>

      <h4 class="mt-15px mb-8px">本次候选链（按顺序）</h4>
      <el-table :data="preview.candidates || []" size="small" border>
        <el-table-column label="顺序" align="center" type="index" width="70" />
        <el-table-column label="模型配置编号" align="center" prop="modelConfigId" width="120" />
        <el-table-column label="模型名称" align="center" prop="name" min-width="140" />
        <el-table-column label="模型标识" align="center" prop="modelId" min-width="140" />
        <el-table-column label="供应商" align="center" prop="providerId" width="100" />
        <el-table-column label="输入单价" align="center" prop="inputPrice" width="100" />
        <el-table-column label="输出单价" align="center" prop="outputPrice" width="100" />
        <el-table-column label="熔断" align="center" width="100">
          <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.circuitEnabled) }}</template>
        </el-table-column>
        <el-table-column label="熔断键" align="center" prop="circuitKey" min-width="130" />
      </el-table>

      <h4 class="mt-15px mb-8px">解析后的生效参数</h4>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="超时（ms）">{{ preview.effective?.timeoutMs }}</el-descriptions-item>
        <el-descriptions-item label="QPS 上限">{{ preview.effective?.qpsLimit }}</el-descriptions-item>
        <el-descriptions-item label="并发上限">{{ preview.effective?.concurrentLimit }}</el-descriptions-item>
        <el-descriptions-item label="重试次数">{{ preview.effective?.retryCount }}</el-descriptions-item>
        <el-descriptions-item label="退避基数（ms）">{{ preview.effective?.retryBaseBackoffMs }}</el-descriptions-item>
        <el-descriptions-item label="退避上限（ms）">{{ preview.effective?.retryMaxBackoffMs }}</el-descriptions-item>
        <el-descriptions-item label="抖动系数">{{ preview.effective?.retryJitterRatio }}</el-descriptions-item>
        <el-descriptions-item label="可重试错误" :span="1">{{ preview.effective?.retryableErrors || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最大降级深度">{{ preview.effective?.fallbackMaxDepth }}</el-descriptions-item>
        <el-descriptions-item label="强制跨供应商">{{ getOptionLabel(YES_NO_OPTIONS, preview.effective?.fallbackCrossProvider) }}</el-descriptions-item>
      </el-descriptions>
    </template>
    <el-empty v-else description="选择场景后点击「预览路由」" :image-size="60" />
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">2. 联调调用（完整治理链路）</el-divider>
    <el-form :inline="true" label-width="100px" class="-mb-15px">
      <el-form-item label="场景编码">
        <el-select v-model="invokeParams.sceneCode" placeholder="请选择场景" filterable class="!w-220px">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="提示词内容">
        <el-input v-model="invokeParams.prompt" placeholder="联调用 prompt" clearable class="!w-260px" />
      </el-form-item>
      <el-form-item label="链路 ID">
        <el-input v-model="invokeParams.traceId" placeholder="留空由后端生成" clearable class="!w-220px" />
      </el-form-item>
      <el-form-item label="用户编号">
        <el-input-number v-model="invokeParams.userId" :min="0" :controls="false" placeholder="可留空" class="!w-180px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="invokeLoading" @click="handleInvoke" v-hasPermi="['data-query:ai-model-governance:create']">
          <Icon icon="ep:video-play" class="mr-5px" />执行联调
        </el-button>
      </el-form-item>
    </el-form>
    <template v-if="invokeResult">
      <el-alert
        v-if="invokeResult.echo"
        type="warning"
        :closable="false"
        show-icon
        class="mt-15px"
        title="当前为占位客户端（echo=true）"
        description="后端尚未接入真实模型客户端，返回内容是回显文本，链路本身仍然完整执行。"
      />
      <el-descriptions :column="4" border class="mt-15px">
        <el-descriptions-item label="链路 ID">{{ invokeResult.traceId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="模型标识">{{ invokeResult.modelId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="模型配置编号">{{ invokeResult.modelConfigId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="路由策略">{{ getOptionLabel(ROUTE_STRATEGY_OPTIONS, invokeResult.routeStrategy) }}</el-descriptions-item>
        <el-descriptions-item label="降级深度">{{ invokeResult.fallbackDepth }}</el-descriptions-item>
        <el-descriptions-item label="命中灰度">{{ getOptionLabel(YES_NO_OPTIONS, invokeResult.isGray) }}</el-descriptions-item>
        <el-descriptions-item label="灰度分组">{{ invokeResult.grayGroup || '-' }}</el-descriptions-item>
        <el-descriptions-item label="耗时（ms）">{{ invokeResult.latencyMs }}</el-descriptions-item>
        <el-descriptions-item label="输入 Token">{{ invokeResult.requestTokens }}</el-descriptions-item>
        <el-descriptions-item label="输出 Token">{{ invokeResult.responseTokens }}</el-descriptions-item>
        <el-descriptions-item label="总 Token">{{ invokeResult.totalTokens }}</el-descriptions-item>
        <el-descriptions-item label="供应商请求 ID">{{ invokeResult.requestId || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-input v-model="invokeResult.content" type="textarea" :rows="4" readonly class="mt-15px" />
    </template>
    <el-empty v-else description="尚未执行联调" :image-size="60" />
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">3. 人工止血（重置熔断与限流）</el-divider>
    <el-form :inline="true" label-width="100px" class="-mb-15px">
      <el-form-item label="熔断维度键">
        <el-input v-model="resetKey" placeholder="如 1:2（provider_id:model_config_id）" clearable class="!w-300px" />
      </el-form-item>
      <el-form-item>
        <el-button type="danger" plain :loading="resetLoading" @click="handleReset" v-hasPermi="['data-query:ai-model-governance:update']">
          <Icon icon="ep:switch-button" class="mr-5px" />重置为 CLOSED
        </el-button>
      </el-form-item>
    </el-form>
    <div class="text-12px text-gray-400 mt-8px">也可在「熔断状态」页面按行重置，效果一致。</div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import {
  ROUTE_STRATEGY_OPTIONS,
  SCENE_OPTIONS,
  YES_NO_OPTIONS,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as GovernanceApi from '@/api/dataQuery/model/governance'

defineOptions({ name: 'DataQueryModelGovernance' })

const message = useMessage()

const previewParams = reactive<GovernanceApi.ModelRoutePreviewReqVO>({
  sceneCode: '',
  userId: undefined,
  tenantId: undefined,
  conversationId: undefined,
  sessionId: undefined
})
const previewLoading = ref(false)
const preview = ref<GovernanceApi.ModelRoutePreviewVO>()

const handlePreview = async () => {
  if (!previewParams.sceneCode) {
    message.warning('请选择场景编码')
    return
  }
  previewLoading.value = true
  try {
    preview.value = await GovernanceApi.getModelRoutePreview(previewParams)
  } finally {
    previewLoading.value = false
  }
}

const invokeParams = reactive<GovernanceApi.ModelInvokeReqVO>({
  sceneCode: '',
  prompt: '',
  traceId: undefined,
  conversationId: undefined,
  userId: undefined,
  tenantId: undefined,
  sessionId: undefined
})
const invokeLoading = ref(false)
const invokeResult = ref<GovernanceApi.ModelInvocationResultVO>()

const handleInvoke = async () => {
  if (!invokeParams.sceneCode) {
    message.warning('请选择场景编码')
    return
  }
  invokeLoading.value = true
  try {
    invokeResult.value = await GovernanceApi.invokeModel(invokeParams)
  } finally {
    invokeLoading.value = false
  }
}

const resetKey = ref('')
const resetLoading = ref(false)
const handleReset = async () => {
  if (!resetKey.value) {
    message.warning('请输入熔断维度键')
    return
  }
  try {
    await message.confirm(`确认重置熔断键 [${resetKey.value}] 为 CLOSED 并清除限流 key？`, '人工止血')
    resetLoading.value = true
    await GovernanceApi.resetModelCircuit(resetKey.value)
    message.success('重置成功')
  } catch {
  } finally {
    resetLoading.value = false
  }
}
</script>
