<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="链路 ID" prop="traceId">
        <el-input v-model="queryParams.traceId" placeholder="请输入 traceId" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="queryParams.sceneCode" placeholder="请选择场景" clearable filterable class="!w-220px">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="模型标识" prop="modelId">
        <el-input v-model="queryParams.modelId" placeholder="请输入模型标识" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="调用状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in CALL_LOG_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-model-call-log:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="链路 ID" align="center" prop="traceId" width="180" :show-overflow-tooltip="true" />
      <el-table-column label="场景" align="center" prop="sceneCode" />
      <el-table-column label="模型标识" align="center" prop="modelId" :show-overflow-tooltip="true" />
      <el-table-column label="总 Token" align="center" prop="totalTokens" />
      <el-table-column label="费用（元）" align="center" prop="cost" />
      <el-table-column label="耗时（ms）" align="center" prop="latencyMs" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="getStatusTagType(scope.row.status)">{{ getOptionLabel(CALL_LOG_STATUS_OPTIONS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="错误分类" align="center" prop="errorCategory" min-width="140">
        <template #default="scope">{{ getOptionLabel(ERROR_CATEGORY_OPTIONS, scope.row.errorCategory) }}</template>
      </el-table-column>
      <el-table-column label="降级/重试" align="center" width="110">
        <template #default="scope">{{ scope.row.fallbackDepth }} / {{ scope.row.retryIndex }}</template>
      </el-table-column>
      <el-table-column label="熔断状态" align="center" prop="circuitState" width="120">
        <template #default="scope">
          <el-tag :type="getCircuitStateTagType(scope.row.circuitState)">{{ getOptionLabel(CIRCUIT_STATE_OPTIONS, scope.row.circuitState) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="错误信息" align="center" prop="errorMsg" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="100" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="detailVisible" title="调用日志详情" width="800px">
    <el-descriptions v-loading="detailLoading" :column="2" border>
      <el-descriptions-item label="编号">{{ detail.id }}</el-descriptions-item>
      <el-descriptions-item label="链路 ID">{{ detail.traceId }}</el-descriptions-item>
      <el-descriptions-item label="会话 ID">{{ detail.conversationId }}</el-descriptions-item>
      <el-descriptions-item label="场景编码">{{ detail.sceneCode }}</el-descriptions-item>
      <el-descriptions-item label="供应商编号">{{ detail.providerId }}</el-descriptions-item>
      <el-descriptions-item label="模型配置编号">{{ detail.modelConfigId }}</el-descriptions-item>
      <el-descriptions-item label="模型标识">{{ detail.modelId }}</el-descriptions-item>
      <el-descriptions-item label="调用状态">{{ getOptionLabel(CALL_LOG_STATUS_OPTIONS, detail.status) }}</el-descriptions-item>
      <el-descriptions-item label="输入 Token">{{ detail.requestTokens }}</el-descriptions-item>
      <el-descriptions-item label="输出 Token">{{ detail.responseTokens }}</el-descriptions-item>
      <el-descriptions-item label="总 Token">{{ detail.totalTokens }}</el-descriptions-item>
      <el-descriptions-item label="费用（元）">{{ detail.cost }}</el-descriptions-item>
      <el-descriptions-item label="耗时（ms）">{{ detail.latencyMs }}</el-descriptions-item>
      <el-descriptions-item label="降级前模型">{{ detail.fallbackFromModelId }}</el-descriptions-item>
      <el-descriptions-item label="错误码">{{ detail.errorCode }}</el-descriptions-item>
      <el-descriptions-item label="错误分类">{{ getOptionLabel(ERROR_CATEGORY_OPTIONS, detail.errorCategory) }}</el-descriptions-item>
      <el-descriptions-item label="用户编号">{{ detail.userId }}</el-descriptions-item>
      <el-descriptions-item label="供应商请求 ID">{{ detail.requestId }}</el-descriptions-item>
      <el-descriptions-item label="命中灰度">{{ getOptionLabel(YES_NO_OPTIONS, detail.isGray) }}</el-descriptions-item>
      <el-descriptions-item label="灰度分组">{{ getOptionLabel(GRAY_GROUP_OPTIONS, detail.grayGroup) }}</el-descriptions-item>
      <el-descriptions-item label="灰度实验编号">{{ detail.grayExperimentId }}</el-descriptions-item>
      <el-descriptions-item label="分桶维度">{{ detail.grayBucketKey || '-' }}</el-descriptions-item>
      <el-descriptions-item label="原始链路 ID">{{ detail.retryOfTraceId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="重试序号">{{ detail.retryIndex }}</el-descriptions-item>
      <el-descriptions-item label="降级深度">{{ detail.fallbackDepth }}</el-descriptions-item>
      <el-descriptions-item label="路由策略">{{ getOptionLabel(ROUTE_STRATEGY_OPTIONS, detail.routeStrategy) }}</el-descriptions-item>
      <el-descriptions-item label="熔断状态">{{ getOptionLabel(CIRCUIT_STATE_OPTIONS, detail.circuitState) }}</el-descriptions-item>
      <el-descriptions-item label="熔断键">{{ detail.circuitKey || '-' }}</el-descriptions-item>
      <el-descriptions-item label="排队耗时（ms）">{{ detail.queueWaitMs }}</el-descriptions-item>
      <el-descriptions-item label="错误信息" :span="2">{{ detail.errorMsg }}</el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  CALL_LOG_STATUS_OPTIONS,
  CIRCUIT_STATE_OPTIONS,
  ERROR_CATEGORY_OPTIONS,
  GRAY_GROUP_OPTIONS,
  ROUTE_STRATEGY_OPTIONS,
  SCENE_OPTIONS,
  YES_NO_OPTIONS,
  getCircuitStateTagType,
  getOptionLabel,
  getStatusTagType
} from '@/api/dataQuery/constants'
import * as CallLogApi from '@/api/dataQuery/model/callLog'

defineOptions({ name: 'DataQueryModelCallLog' })

const message = useMessage()

const loading = ref(true)
const total = ref(0)
const list = ref<CallLogApi.AiModelCallLogVO[]>([])
const queryParams = reactive<CallLogApi.AiModelCallLogPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  traceId: undefined,
  sceneCode: undefined,
  modelId: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<Partial<CallLogApi.AiModelCallLogVO>>({})

const getList = async () => {
  loading.value = true
  try {
    const data = await CallLogApi.getAiModelCallLogPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

const openDetail = async (id: number) => {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await CallLogApi.getAiModelCallLog(id)
  } finally {
    detailLoading.value = false
  }
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await CallLogApi.exportAiModelCallLog(queryParams)
    download.excel(data, '模型调用日志.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
