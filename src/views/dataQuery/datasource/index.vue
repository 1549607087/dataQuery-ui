<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="接入新库推荐使用「表结构一键导入」"
      description="一个表单完成：创建/复用数据源 → 连通性检测 → 全量表列主键外键导入 → 向量索引。左侧「新增」仅用于手工建源或导入后微调，接入主链路请使用一键导入。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="queryParams.name" placeholder="请输入名称" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="编码" prop="code">
        <el-input v-model="queryParams.code" placeholder="请输入编码" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="数据库类型" prop="dsType">
        <el-select v-model="queryParams.dsType" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in DS_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="SQL 方言" prop="dialect">
        <el-select v-model="queryParams.dialect" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in DIALECT_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in DS_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="健康状态" prop="healthStatus">
        <el-select v-model="queryParams.healthStatus" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in HEALTH_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="同步状态" prop="syncStatus">
        <el-select v-model="queryParams.syncStatus" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in DS_SYNC_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="primary" @click="goImport()" v-hasPermi="['data-query:metadata-import:import']">
          <Icon icon="ep:upload-filled" class="mr-5px" />一键导入
        </el-button>
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-datasource:create']">
          <Icon icon="ep:plus" class="mr-5px" />手工新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-datasource:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-datasource:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="名称" align="center" prop="name" />
      <el-table-column label="编码" align="center" prop="code" />
      <el-table-column label="类型" align="center" prop="dsType">
        <template #default="scope">{{ getOptionLabel(DS_TYPE_OPTIONS, scope.row.dsType) }}</template>
      </el-table-column>
      <el-table-column label="方言" align="center" prop="dialect" />
      <el-table-column label="JDBC 地址" align="center" prop="jdbcUrl" :show-overflow-tooltip="true" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : scope.row.status === 2 ? 'warning' : 'info'">{{ getOptionLabel(DS_STATUS_OPTIONS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="健康状态" align="center" prop="healthStatus">
        <template #default="scope">
          <el-tag :type="scope.row.healthStatus === 1 ? 'success' : scope.row.healthStatus === 2 ? 'danger' : 'info'">{{ getOptionLabel(HEALTH_STATUS_OPTIONS, scope.row.healthStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="同步状态" align="center" prop="syncStatus">
        <template #default="scope">{{ getOptionLabel(DS_SYNC_STATUS_OPTIONS, scope.row.syncStatus) }}</template>
      </el-table-column>
      <el-table-column label="只读连接" align="center" prop="readonlyEnabled">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.readonlyEnabled) }}</template>
      </el-table-column>
      <el-table-column label="最大行数" align="center" prop="maxRows" width="100" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="420" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-datasource:update']">编辑</el-button>
          <el-button link type="primary" @click="handleTest(scope.row.id)" v-hasPermi="['data-query:ai-datasource:update']">测试连接</el-button>
          <el-button link type="primary" @click="goImport(scope.row.id)" v-hasPermi="['data-query:metadata-import:import']">重新导入</el-button>
          <span v-hasPermi="['data-query:ai-datasource:update']" class="mx-5px">
            <el-select
              :model-value="scope.row.status"
              size="small"
              class="!w-100px"
              @change="handleStatusChange(scope.row, $event)"
            >
              <el-option v-for="item in DS_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </span>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-datasource:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="testVisible" title="连通性检测结果" width="520px">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="检测结果">
        <el-tag :type="testResult.success ? 'success' : 'danger'">{{ testResult.success ? '成功' : '失败' }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="耗时（ms）">{{ testResult.latencyMs }}</el-descriptions-item>
      <el-descriptions-item label="健康状态">{{ getOptionLabel(HEALTH_STATUS_OPTIONS, testResult.healthStatus) }}</el-descriptions-item>
      <el-descriptions-item label="信息">{{ testResult.message }}</el-descriptions-item>
      <el-descriptions-item label="检测时间">{{ testResult.checkedAt }}</el-descriptions-item>
    </el-descriptions>
  </el-dialog>

  <DatasourceForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  DIALECT_OPTIONS,
  DS_STATUS_OPTIONS,
  DS_SYNC_STATUS_OPTIONS,
  DS_TYPE_OPTIONS,
  HEALTH_STATUS_OPTIONS,
  YES_NO_OPTIONS,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import DatasourceForm from './DatasourceForm.vue'

defineOptions({ name: 'DataQueryDatasource' })

const message = useMessage()
const { t } = useI18n()
const router = useRouter()

/** 跳转表结构一键导入（携带数据源编号时按「复用已有数据源」模式打开） */
const goImport = (datasourceId?: number) =>
  router.push(
    datasourceId
      ? { path: '/data-query/datasource/metadata-import', query: { datasourceId: String(datasourceId) } }
      : { path: '/data-query/datasource/metadata-import' }
  )

const loading = ref(true)
const total = ref(0)
const list = ref<DatasourceApi.AiDatasourceVO[]>([])
const queryParams = reactive<DatasourceApi.AiDatasourcePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  code: undefined,
  dsType: undefined,
  dialect: undefined,
  status: undefined,
  healthStatus: undefined,
  syncStatus: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await DatasourceApi.getAiDatasourcePage(queryParams)
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

const formRef = ref()
const openForm = (type: string, id?: number) => formRef.value.open(type, id)

const handleStatusChange = async (row: DatasourceApi.AiDatasourceVO, status: number) => {
  try {
    await DatasourceApi.updateAiDatasourceStatus(row.id!, status)
    message.success('状态修改成功')
    await getList()
  } catch {}
}

const testVisible = ref(false)
const testResult = ref<Partial<DatasourceApi.AiDatasourceTestRespVO>>({})
const handleTest = async (id: number) => {
  testResult.value = await DatasourceApi.testAiDatasourceConnection(id)
  testVisible.value = true
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await DatasourceApi.deleteAiDatasource(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: DatasourceApi.AiDatasourceVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await DatasourceApi.deleteAiDatasourceList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await DatasourceApi.exportAiDatasource(queryParams)
    download.excel(data, '数据源.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
