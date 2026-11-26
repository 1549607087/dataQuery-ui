<template>
  <ContentWrap>
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="mb-12px"
      title="列表是审计快照，实时状态以 Redis 为准"
      description="DB 表只在熔断状态跃迁时写入一次。要看当前真实状态，请用下方「实时状态查询」按熔断键读取；重置会同时清理 Redis 与 DB 快照。"
    />
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="熔断键" prop="circuitKey">
        <el-input v-model="queryParams.circuitKey" placeholder="如 1:2" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="熔断状态" prop="state">
        <el-select v-model="queryParams.state" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in CIRCUIT_STATE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="模型配置" prop="modelConfigId">
        <el-input-number v-model="queryParams.modelConfigId" :min="0" :controls="false" placeholder="模型配置编号" class="!w-220px" />
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
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-model-circuit-state:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-form :inline="true" label-width="110px" class="-mb-15px">
      <el-form-item label="实时状态查询">
        <el-input v-model="realtimeKey" placeholder="熔断维度键，如 1:2" clearable class="!w-260px" @keyup.enter="handleRealtime" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" plain :loading="realtimeLoading" @click="handleRealtime" v-hasPermi="['data-query:ai-model-circuit-state:query']">
          <Icon icon="ep:refresh-right" class="mr-5px" />读取 Redis 实时状态
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="熔断键" align="center" prop="circuitKey" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="模型配置" align="center" prop="modelConfigId" width="100" />
      <el-table-column label="状态" align="center" prop="state" width="120">
        <template #default="scope">
          <el-tag :type="getCircuitStateTagType(scope.row.state)">{{ getOptionLabel(CIRCUIT_STATE_OPTIONS, scope.row.state) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="窗口失败率" align="center" prop="failureRate" width="110">
        <template #default="scope">{{ scope.row.failureRate }}%</template>
      </el-table-column>
      <el-table-column label="窗口请求/失败" align="center" width="130">
        <template #default="scope">{{ scope.row.windowTotal }} / {{ scope.row.windowFailed }}</template>
      </el-table-column>
      <el-table-column label="连续失败" align="center" prop="consecutiveFailures" width="100" />
      <el-table-column label="最近失败分类" align="center" prop="lastFailureCategory" min-width="140">
        <template #default="scope">{{ getOptionLabel(ERROR_CATEGORY_OPTIONS, scope.row.lastFailureCategory) }}</template>
      </el-table-column>
      <el-table-column label="OPEN 到期" align="center" prop="openUntil" width="180" />
      <el-table-column label="更新时间" align="center" prop="updateTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="200" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row.id)">详情</el-button>
          <el-button link type="primary" @click="handleRealtimeByKey(scope.row.circuitKey)" v-hasPermi="['data-query:ai-model-circuit-state:query']">实时</el-button>
          <el-button link type="danger" @click="handleReset(scope.row.circuitKey)" v-hasPermi="['data-query:ai-model-circuit-state:update']">重置</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="detailVisible" title="熔断状态详情" width="860px">
    <el-descriptions v-loading="detailLoading" :column="2" border>
      <el-descriptions-item label="编号">{{ detail.id }}</el-descriptions-item>
      <el-descriptions-item label="熔断键">{{ detail.circuitKey }}</el-descriptions-item>
      <el-descriptions-item label="模型配置编号">{{ detail.modelConfigId }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ getOptionLabel(CIRCUIT_STATE_OPTIONS, detail.state) }}</el-descriptions-item>
      <el-descriptions-item label="窗口起始">{{ detail.windowStartTime }}</el-descriptions-item>
      <el-descriptions-item label="窗口请求数">{{ detail.windowTotal }}</el-descriptions-item>
      <el-descriptions-item label="窗口失败数">{{ detail.windowFailed }}</el-descriptions-item>
      <el-descriptions-item label="窗口成功数">{{ detail.windowSucceeded }}</el-descriptions-item>
      <el-descriptions-item label="窗口失败率">{{ detail.failureRate }}%</el-descriptions-item>
      <el-descriptions-item label="连续失败">{{ detail.consecutiveFailures }}</el-descriptions-item>
      <el-descriptions-item label="连续成功">{{ detail.consecutiveSuccesses }}</el-descriptions-item>
      <el-descriptions-item label="最近失败时间">{{ detail.lastFailureTime }}</el-descriptions-item>
      <el-descriptions-item label="最近失败分类">{{ getOptionLabel(ERROR_CATEGORY_OPTIONS, detail.lastFailureCategory) }}</el-descriptions-item>
      <el-descriptions-item label="进入 OPEN 时间">{{ detail.openedTime }}</el-descriptions-item>
      <el-descriptions-item label="OPEN 到期时间">{{ detail.openUntil }}</el-descriptions-item>
      <el-descriptions-item label="半开探测数">{{ detail.halfOpenProbes }}</el-descriptions-item>
      <el-descriptions-item label="半开成功数">{{ detail.halfOpenSucceeded }}</el-descriptions-item>
      <el-descriptions-item label="乐观锁版本">{{ detail.version }}</el-descriptions-item>
      <el-descriptions-item label="备注">{{ detail.remark }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ detail.createTime }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ detail.updateTime }}</el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  CIRCUIT_STATE_OPTIONS,
  ERROR_CATEGORY_OPTIONS,
  getCircuitStateTagType,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as CircuitApi from '@/api/dataQuery/model/circuitState'

defineOptions({ name: 'DataQueryModelCircuitState' })

const message = useMessage()

const loading = ref(true)
const total = ref(0)
const list = ref<CircuitApi.AiModelCircuitStateVO[]>([])
const queryParams = reactive<CircuitApi.AiModelCircuitStatePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  circuitKey: undefined,
  state: undefined,
  modelConfigId: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<Partial<CircuitApi.AiModelCircuitStateVO>>({})
const realtimeKey = ref('')
const realtimeLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await CircuitApi.getAiModelCircuitStatePage(queryParams)
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
    detail.value = await CircuitApi.getAiModelCircuitState(id)
  } finally {
    detailLoading.value = false
  }
}

/** 按熔断键读 Redis 实时状态，并把结果直接展示在详情弹窗里 */
const loadRealtime = async (circuitKey: string) => {
  if (!circuitKey) {
    message.warning('请输入熔断维度键')
    return
  }
  detailVisible.value = true
  detailLoading.value = true
  realtimeLoading.value = true
  try {
    detail.value = await CircuitApi.getAiModelCircuitStateByKey(circuitKey)
  } finally {
    detailLoading.value = false
    realtimeLoading.value = false
  }
}
const handleRealtime = () => loadRealtime(realtimeKey.value)
const handleRealtimeByKey = (circuitKey: string) => {
  realtimeKey.value = circuitKey
  loadRealtime(circuitKey)
}

const handleReset = async (circuitKey: string) => {
  try {
    await message.confirm(`确认将熔断键 [${circuitKey}] 重置为 CLOSED 并清除限流 key？`, '人工止血')
    await CircuitApi.resetAiModelCircuitState(circuitKey)
    message.success('重置成功')
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await CircuitApi.exportAiModelCircuitState(queryParams)
    download.excel(data, '熔断状态.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
