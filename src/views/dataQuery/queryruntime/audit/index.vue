<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="100px">
      <el-form-item label="会话 ID" prop="sessionId">
        <el-input-number v-model="queryParams.sessionId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="用户 ID" prop="userId">
        <el-input-number v-model="queryParams.userId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="数据源 ID" prop="datasourceId">
        <el-input-number v-model="queryParams.datasourceId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="链路 ID" prop="traceId">
        <el-input v-model="queryParams.traceId" placeholder="请输入 traceId" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="意图编码" prop="intentCode">
        <el-input v-model="queryParams.intentCode" placeholder="请输入意图编码" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="SQL 校验状态" prop="sqlStatus">
        <el-select v-model="queryParams.sqlStatus" placeholder="请选择校验状态" clearable filterable class="!w-220px">
          <el-option v-for="item in SQL_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="结果状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择结果状态" clearable class="!w-220px">
          <el-option v-for="item in AUDIT_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="只读连接" prop="readonlyConnection">
        <el-select v-model="queryParams.readonlyConnection" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-query-audit:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="会话 ID" align="center" prop="sessionId" width="100" />
      <el-table-column label="用户 ID" align="center" prop="userId" width="100" />
      <el-table-column label="数据源 ID" align="center" prop="datasourceId" width="110" />
      <el-table-column label="链路 ID" align="center" prop="traceId" width="180" :show-overflow-tooltip="true" />
      <el-table-column label="用户问题" align="center" prop="question" :show-overflow-tooltip="true" />
      <el-table-column label="意图编码" align="center" prop="intentCode" :show-overflow-tooltip="true" />
      <el-table-column label="SQL 校验" align="center" prop="sqlStatus">
        <template #default="scope">
          <el-tag :type="scope.row.sqlStatus === 'PASS' ? 'success' : scope.row.sqlStatus === 'REJECT' ? 'danger' : 'warning'">
            {{ getOptionLabel(SQL_STATUS_OPTIONS, scope.row.sqlStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="结果状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : scope.row.status === 5 ? 'danger' : 'warning'">
            {{ getOptionLabel(AUDIT_STATUS_OPTIONS, scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="召回表" align="center" prop="recalledTables" :show-overflow-tooltip="true" />
      <el-table-column label="生成 SQL" align="center" prop="generatedSql" :show-overflow-tooltip="true" />
      <el-table-column label="结果行数" align="center" prop="resultRows" width="100" />
      <el-table-column label="结果截断" align="center" prop="resultTruncated" width="90">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.resultTruncated) }}</template>
      </el-table-column>
      <el-table-column label="耗时（ms）" align="center" prop="latencyMs" width="110" />
      <el-table-column label="只读连接" align="center" prop="readonlyConnection" width="100">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.readonlyConnection) }}</template>
      </el-table-column>
      <el-table-column label="错误摘要" align="center" prop="errorMsg" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="100" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row.id)" v-hasPermi="['data-query:ai-query-audit:query']">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="detailVisible" title="查询审计详情" width="900px">
    <el-descriptions v-loading="detailLoading" :column="2" border>
      <el-descriptions-item label="编号">{{ detail.id }}</el-descriptions-item>
      <el-descriptions-item label="会话 ID">{{ detail.sessionId }}</el-descriptions-item>
      <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
      <el-descriptions-item label="数据源 ID">{{ detail.datasourceId }}</el-descriptions-item>
      <el-descriptions-item label="链路 ID">{{ detail.traceId }}</el-descriptions-item>
      <el-descriptions-item label="意图编码">{{ detail.intentCode }}</el-descriptions-item>
      <el-descriptions-item label="SQL 校验状态">{{ getOptionLabel(SQL_STATUS_OPTIONS, detail.sqlStatus) }}</el-descriptions-item>
      <el-descriptions-item label="结果状态">{{ getOptionLabel(AUDIT_STATUS_OPTIONS, detail.status) }}</el-descriptions-item>
      <el-descriptions-item label="提示词版本 ID">{{ detail.promptVersionId }}</el-descriptions-item>
      <el-descriptions-item label="模型配置 ID">{{ detail.modelConfigId }}</el-descriptions-item>
      <el-descriptions-item label="结果行数">{{ detail.resultRows }}</el-descriptions-item>
      <el-descriptions-item label="结果截断">{{ getOptionLabel(YES_NO_OPTIONS, detail.resultTruncated) }}</el-descriptions-item>
      <el-descriptions-item label="耗时（ms）">{{ detail.latencyMs }}</el-descriptions-item>
      <el-descriptions-item label="只读连接">{{ getOptionLabel(YES_NO_OPTIONS, detail.readonlyConnection) }}</el-descriptions-item>
      <el-descriptions-item label="错误码">{{ detail.errorCode }}</el-descriptions-item>
      <el-descriptions-item label="客户端 IP">{{ detail.clientIp }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ detail.createTime }}</el-descriptions-item>
      <el-descriptions-item label="用户原始问题" :span="2">
        <pre class="m-0 max-h-200px overflow-auto whitespace-pre-wrap break-all text-12px">{{ detail.question || '-' }}</pre>
      </el-descriptions-item>
      <el-descriptions-item label="归一化问题" :span="2">
        <pre class="m-0 max-h-200px overflow-auto whitespace-pre-wrap break-all text-12px">{{ detail.normalizedQuestion || '-' }}</pre>
      </el-descriptions-item>
      <el-descriptions-item label="Schema 召回命中表" :span="2">
        <pre class="m-0 max-h-200px overflow-auto whitespace-pre-wrap break-all text-12px">{{ detail.recalledTables || '-' }}</pre>
      </el-descriptions-item>
      <el-descriptions-item label="LLM 生成 SQL" :span="2">
        <pre class="m-0 max-h-200px overflow-auto whitespace-pre-wrap break-all text-12px">{{ detail.generatedSql || '-' }}</pre>
      </el-descriptions-item>
      <el-descriptions-item label="校验后 SQL" :span="2">
        <pre class="m-0 max-h-200px overflow-auto whitespace-pre-wrap break-all text-12px">{{ detail.validatedSql || '-' }}</pre>
      </el-descriptions-item>
      <el-descriptions-item label="执行 SQL" :span="2">
        <pre class="m-0 max-h-200px overflow-auto whitespace-pre-wrap break-all text-12px">{{ detail.executedSql || '-' }}</pre>
      </el-descriptions-item>
      <el-descriptions-item label="错误摘要" :span="2">
        <pre class="m-0 max-h-200px overflow-auto whitespace-pre-wrap break-all text-12px">{{ detail.errorMsg || '-' }}</pre>
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { AUDIT_STATUS_OPTIONS, SQL_STATUS_OPTIONS, YES_NO_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as AuditApi from '@/api/dataQuery/queryruntime/audit'

defineOptions({ name: 'DataQueryQueryAudit' })

const message = useMessage()

const loading = ref(true)
const total = ref(0)
const list = ref<AuditApi.AiQueryAuditVO[]>([])
const queryParams = reactive<AuditApi.AiQueryAuditPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  sessionId: undefined,
  userId: undefined,
  datasourceId: undefined,
  traceId: undefined,
  intentCode: undefined,
  sqlStatus: undefined,
  status: undefined,
  readonlyConnection: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<Partial<AuditApi.AiQueryAuditVO>>({})

const getList = async () => {
  loading.value = true
  try {
    const data = await AuditApi.getAiQueryAuditPage(queryParams)
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
    detail.value = await AuditApi.getAiQueryAudit(id)
  } finally {
    detailLoading.value = false
  }
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await AuditApi.exportAiQueryAudit(queryParams)
    download.excel(data, '查询审计.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
