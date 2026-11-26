<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="表元数据由「表结构一键导入」自动采集"
      description="这里用于导入后的微调：中文名、表角色、可见性、可查性、敏感级别等。单条新增/删除仅在特殊场景使用，不要用它代替一键导入。"
    />
    <el-button link type="primary" class="mt-8px" @click="goImport">
      <Icon icon="ep:upload-filled" class="mr-5px" />去「表结构一键导入」
    </el-button>
  </ContentWrap>

  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="数据源" prop="datasourceId">
        <el-select v-model="queryParams.datasourceId" placeholder="请选择数据源" clearable filterable class="!w-220px">
          <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="表名" prop="tableName">
        <el-input v-model="queryParams.tableName" placeholder="请输入表名" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="中文名" prop="nameZh">
        <el-input v-model="queryParams.nameZh" placeholder="请输入中文名" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="表类型" prop="tableType">
        <el-select v-model="queryParams.tableType" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in TABLE_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否可见" prop="visible">
        <el-select v-model="queryParams.visible" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否可查" prop="queryable">
        <el-select v-model="queryParams.queryable" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="同步状态" prop="syncStatus">
        <el-select v-model="queryParams.syncStatus" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in META_SYNC_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-datasource-table:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-datasource-table:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-datasource-table:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="数据源" align="center" prop="datasourceId" min-width="140">
        <template #default="scope">{{ datasourceName(scope.row.datasourceId) }}</template>
      </el-table-column>
      <el-table-column label="Schema" align="center" prop="schemaName" />
      <el-table-column label="表名" align="center" prop="tableName" :show-overflow-tooltip="true" />
      <el-table-column label="中文名" align="center" prop="nameZh" :show-overflow-tooltip="true" />
      <el-table-column label="表类型" align="center" prop="tableType">
        <template #default="scope">{{ getOptionLabel(TABLE_TYPE_OPTIONS, scope.row.tableType) }}</template>
      </el-table-column>
      <el-table-column label="表角色" align="center" prop="tableRole">
        <template #default="scope">{{ getOptionLabel(TABLE_ROLE_OPTIONS, scope.row.tableRole) }}</template>
      </el-table-column>
      <el-table-column label="字段数" align="center" prop="columnCount" width="90" />
      <el-table-column label="敏感级别" align="center" prop="sensitiveLevel">
        <template #default="scope">{{ getOptionLabel(SENSITIVE_LEVEL_OPTIONS, scope.row.sensitiveLevel) }}</template>
      </el-table-column>
      <el-table-column label="是否可见" align="center" prop="visible">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.visible) }}</template>
      </el-table-column>
      <el-table-column label="是否可查" align="center" prop="queryable">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.queryable) }}</template>
      </el-table-column>
      <el-table-column label="同步状态" align="center" prop="syncStatus">
        <template #default="scope">{{ getOptionLabel(META_SYNC_STATUS_OPTIONS, scope.row.syncStatus) }}</template>
      </el-table-column>
      <el-table-column label="描述" align="center" prop="description" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-datasource-table:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-datasource-table:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <TableForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  META_SYNC_STATUS_OPTIONS,
  SENSITIVE_LEVEL_OPTIONS,
  TABLE_ROLE_OPTIONS,
  TABLE_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as TableApi from '@/api/dataQuery/datasource/table'
import TableForm from './TableForm.vue'

defineOptions({ name: 'DataQueryDatasourceTable' })

const message = useMessage()
const { t } = useI18n()
const router = useRouter()
const goImport = () => router.push('/data-query/datasource/metadata-import')

const loading = ref(true)
const total = ref(0)
const list = ref<TableApi.AiDatasourceTableVO[]>([])
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const queryParams = reactive<TableApi.AiDatasourceTablePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  datasourceId: undefined,
  tableName: undefined,
  nameZh: undefined,
  tableType: undefined,
  visible: undefined,
  queryable: undefined,
  syncStatus: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const datasourceName = (id: number) =>
  datasourceOptions.value.find((item) => item.id === id)?.name || id

const getList = async () => {
  loading.value = true
  try {
    const data = await TableApi.getAiDatasourceTablePage(queryParams)
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

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await TableApi.deleteAiDatasourceTable(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: TableApi.AiDatasourceTableVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await TableApi.deleteAiDatasourceTableList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await TableApi.exportAiDatasourceTable(queryParams)
    download.excel(data, '数据源表元数据.xls')
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
