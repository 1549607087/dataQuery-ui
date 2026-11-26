<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="数据源" prop="datasourceId">
        <el-select v-model="queryParams.datasourceId" placeholder="请选择数据源" clearable filterable class="!w-220px">
          <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="任务编号" prop="taskNo">
        <el-input v-model="queryParams.taskNo" placeholder="请输入任务编号" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="同步类型" prop="syncType">
        <el-select v-model="queryParams.syncType" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in SYNC_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="触发方式" prop="triggerType">
        <el-select v-model="queryParams.triggerType" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in TRIGGER_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in SYNC_LOG_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-datasource-sync-log:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="数据源" align="center" prop="datasourceId" min-width="140">
        <template #default="scope">{{ datasourceName(scope.row.datasourceId) }}</template>
      </el-table-column>
      <el-table-column label="任务编号" align="center" prop="taskNo" :show-overflow-tooltip="true" />
      <el-table-column label="同步类型" align="center" prop="syncType">
        <template #default="scope">{{ getOptionLabel(SYNC_TYPE_OPTIONS, scope.row.syncType) }}</template>
      </el-table-column>
      <el-table-column label="触发方式" align="center" prop="triggerType">
        <template #default="scope">{{ getOptionLabel(TRIGGER_TYPE_OPTIONS, scope.row.triggerType) }}</template>
      </el-table-column>
      <el-table-column label="范围" align="center" prop="scope" :show-overflow-tooltip="true" />
      <el-table-column label="耗时（ms）" align="center" prop="latencyMs" width="100" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : scope.row.status === 3 ? 'danger' : scope.row.status === 2 ? 'warning' : 'info'">{{ getOptionLabel(SYNC_LOG_STATUS_OPTIONS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="表增/改/删" align="center" width="120">
        <template #default="scope">{{ scope.row.tableAdded }} / {{ scope.row.tableChanged }} / {{ scope.row.tableRemoved }}</template>
      </el-table-column>
      <el-table-column label="列增/改/删" align="center" width="120">
        <template #default="scope">{{ scope.row.columnAdded }} / {{ scope.row.columnChanged }} / {{ scope.row.columnRemoved }}</template>
      </el-table-column>
      <el-table-column label="错误码" align="center" prop="errorCode" :show-overflow-tooltip="true" />
      <el-table-column label="变更明细" align="center" prop="changeDetail" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="100" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row.id)" v-hasPermi="['data-query:ai-datasource-sync-log:query']">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="detailVisible" title="同步日志详情" width="860px">
    <el-descriptions v-loading="detailLoading" :column="2" border>
      <el-descriptions-item label="编号">{{ detail.id }}</el-descriptions-item>
      <el-descriptions-item label="数据源">{{ datasourceName(detail.datasourceId!) }}</el-descriptions-item>
      <el-descriptions-item label="任务编号">{{ detail.taskNo }}</el-descriptions-item>
      <el-descriptions-item label="同步类型">{{ getOptionLabel(SYNC_TYPE_OPTIONS, detail.syncType) }}</el-descriptions-item>
      <el-descriptions-item label="触发方式">{{ getOptionLabel(TRIGGER_TYPE_OPTIONS, detail.triggerType) }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ getOptionLabel(SYNC_LOG_STATUS_OPTIONS, detail.status) }}</el-descriptions-item>
      <el-descriptions-item label="范围" :span="2">{{ detail.scope }}</el-descriptions-item>
      <el-descriptions-item label="开始时间">{{ detail.startTime }}</el-descriptions-item>
      <el-descriptions-item label="结束时间">{{ detail.endTime }}</el-descriptions-item>
      <el-descriptions-item label="耗时（ms）">{{ detail.latencyMs }}</el-descriptions-item>
      <el-descriptions-item label="新增表">{{ detail.tableAdded }}</el-descriptions-item>
      <el-descriptions-item label="变更表">{{ detail.tableChanged }}</el-descriptions-item>
      <el-descriptions-item label="删除表">{{ detail.tableRemoved }}</el-descriptions-item>
      <el-descriptions-item label="新增列">{{ detail.columnAdded }}</el-descriptions-item>
      <el-descriptions-item label="变更列">{{ detail.columnChanged }}</el-descriptions-item>
      <el-descriptions-item label="删除列">{{ detail.columnRemoved }}</el-descriptions-item>
      <el-descriptions-item label="新增关系">{{ detail.relationAdded }}</el-descriptions-item>
      <el-descriptions-item label="新增枚举">{{ detail.enumAdded }}</el-descriptions-item>
      <el-descriptions-item label="变更前结构版本">{{ detail.structVersionBefore }}</el-descriptions-item>
      <el-descriptions-item label="变更后结构版本">{{ detail.structVersionAfter }}</el-descriptions-item>
      <el-descriptions-item label="错误码">{{ detail.errorCode }}</el-descriptions-item>
      <el-descriptions-item label="错误信息" :span="2">{{ detail.errorMsg }}</el-descriptions-item>
      <el-descriptions-item label="变更明细" :span="2">{{ detail.changeDetail }}</el-descriptions-item>
      <el-descriptions-item label="操作人编号">{{ detail.operatorId }}</el-descriptions-item>
      <el-descriptions-item label="操作人">{{ detail.operatorName }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ detail.createTime }}</el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  SYNC_LOG_STATUS_OPTIONS,
  SYNC_TYPE_OPTIONS,
  TRIGGER_TYPE_OPTIONS,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as SyncLogApi from '@/api/dataQuery/datasource/synclog'

defineOptions({ name: 'DataQueryDatasourceSyncLog' })

const message = useMessage()

const loading = ref(true)
const total = ref(0)
const list = ref<SyncLogApi.AiDatasourceSyncLogVO[]>([])
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const queryParams = reactive<SyncLogApi.AiDatasourceSyncLogPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  datasourceId: undefined,
  taskNo: undefined,
  syncType: undefined,
  triggerType: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<Partial<SyncLogApi.AiDatasourceSyncLogVO>>({})

const datasourceName = (id: number) =>
  datasourceOptions.value.find((item) => item.id === id)?.name || id

const getList = async () => {
  loading.value = true
  try {
    const data = await SyncLogApi.getAiDatasourceSyncLogPage(queryParams)
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
    detail.value = await SyncLogApi.getAiDatasourceSyncLog(id)
  } finally {
    detailLoading.value = false
  }
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await SyncLogApi.exportAiDatasourceSyncLog(queryParams)
    download.excel(data, '数据源同步日志.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
  getList()
})
</script>
