<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="字段元数据由「表结构一键导入」自动采集"
      description="这里用于导入后的微调：中文名、语义角色、枚举取值、敏感级别、可见性等。单条新增/删除仅在特殊场景使用。"
    />
    <el-button link type="primary" class="mt-8px" @click="goImport">
      <Icon icon="ep:upload-filled" class="mr-5px" />去「表结构一键导入」
    </el-button>
  </ContentWrap>

  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="数据源" prop="datasourceId">
        <el-select v-model="queryParams.datasourceId" placeholder="请选择数据源" clearable filterable class="!w-220px" @change="handleDatasourceChange">
          <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="表" prop="tableId">
        <el-select v-model="queryParams.tableId" placeholder="请选择表" clearable filterable class="!w-220px">
          <el-option v-for="item in tableOptions" :key="item.id" :label="item.tableName" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="表名" prop="tableName">
        <el-input v-model="queryParams.tableName" placeholder="请输入表名" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="字段名" prop="columnName">
        <el-input v-model="queryParams.columnName" placeholder="请输入字段名" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="中文名" prop="nameZh">
        <el-input v-model="queryParams.nameZh" placeholder="请输入中文名" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="语义角色" prop="semanticRole">
        <el-select v-model="queryParams.semanticRole" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in SEMANTIC_ROLE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否可查" prop="queryable">
        <el-select v-model="queryParams.queryable" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="敏感类型" prop="sensitiveType">
        <el-select v-model="queryParams.sensitiveType" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in SENSITIVE_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-datasource-column:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-datasource-column:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-datasource-column:export']">
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
      <el-table-column label="表名" align="center" prop="tableName" :show-overflow-tooltip="true" />
      <el-table-column label="字段名" align="center" prop="columnName" :show-overflow-tooltip="true" />
      <el-table-column label="中文名" align="center" prop="nameZh" :show-overflow-tooltip="true" />
      <el-table-column label="数据类型" align="center" prop="dataType" />
      <el-table-column label="语义角色" align="center" prop="semanticRole">
        <template #default="scope">{{ getOptionLabel(SEMANTIC_ROLE_OPTIONS, scope.row.semanticRole) }}</template>
      </el-table-column>
      <el-table-column label="主键" align="center" prop="primaryKey">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.primaryKey) }}</template>
      </el-table-column>
      <el-table-column label="是否可查" align="center" prop="queryable">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.queryable) }}</template>
      </el-table-column>
      <el-table-column label="敏感类型" align="center" prop="sensitiveType">
        <template #default="scope">{{ getOptionLabel(SENSITIVE_TYPE_OPTIONS, scope.row.sensitiveType) }}</template>
      </el-table-column>
      <el-table-column label="枚举启用" align="center" prop="enumEnabled">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.enumEnabled) }}</template>
      </el-table-column>
      <el-table-column label="同步状态" align="center" prop="syncStatus">
        <template #default="scope">{{ getOptionLabel(META_SYNC_STATUS_OPTIONS, scope.row.syncStatus) }}</template>
      </el-table-column>
      <el-table-column label="描述" align="center" prop="description" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-datasource-column:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-datasource-column:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <ColumnForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  META_SYNC_STATUS_OPTIONS,
  SEMANTIC_ROLE_OPTIONS,
  SENSITIVE_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as ColumnApi from '@/api/dataQuery/datasource/column'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as TableApi from '@/api/dataQuery/datasource/table'
import ColumnForm from './ColumnForm.vue'

defineOptions({ name: 'DataQueryDatasourceColumn' })

const message = useMessage()
const { t } = useI18n()
const router = useRouter()
const goImport = () => router.push('/data-query/datasource/metadata-import')

const loading = ref(true)
const total = ref(0)
const list = ref<ColumnApi.AiDatasourceColumnVO[]>([])
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const tableOptions = ref<TableApi.AiDatasourceTableVO[]>([])
const queryParams = reactive<ColumnApi.AiDatasourceColumnPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  datasourceId: undefined,
  tableId: undefined,
  tableName: undefined,
  columnName: undefined,
  nameZh: undefined,
  semanticRole: undefined,
  queryable: undefined,
  sensitiveType: undefined,
  syncStatus: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const datasourceName = (id: number) =>
  datasourceOptions.value.find((item) => item.id === id)?.name || id

const handleDatasourceChange = async (val: number) => {
  queryParams.tableId = undefined
  tableOptions.value = val ? await TableApi.getAiDatasourceTableListByDatasource(val) : []
}

const getList = async () => {
  loading.value = true
  try {
    const data = await ColumnApi.getAiDatasourceColumnPage(queryParams)
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
  tableOptions.value = []
  handleQuery()
}

const formRef = ref()
const openForm = (type: string, id?: number) => formRef.value.open(type, id)

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await ColumnApi.deleteAiDatasourceColumn(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: ColumnApi.AiDatasourceColumnVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await ColumnApi.deleteAiDatasourceColumnList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await ColumnApi.exportAiDatasourceColumn(queryParams)
    download.excel(data, '数据源字段元数据.xls')
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
