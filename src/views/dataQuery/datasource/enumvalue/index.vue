<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="数据源" prop="datasourceId">
        <el-select v-model="queryParams.datasourceId" placeholder="请选择数据源" clearable filterable class="!w-220px" @change="handleDatasourceChange">
          <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="表" prop="tableId">
        <el-select v-model="queryParams.tableId" placeholder="请选择表" clearable filterable class="!w-220px" @change="handleTableChange">
          <el-option v-for="item in tableOptions" :key="item.id" :label="item.tableName" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="字段" prop="columnId">
        <el-select v-model="queryParams.columnId" placeholder="请选择字段" clearable filterable class="!w-220px">
          <el-option v-for="item in columnOptions" :key="item.id" :label="item.columnName" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="源值" prop="sourceValue">
        <el-input v-model="queryParams.sourceValue" placeholder="请输入源值" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="展示名" prop="displayName">
        <el-input v-model="queryParams.displayName" placeholder="请输入展示名" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="字典类型" prop="dictType">
        <el-input v-model="queryParams.dictType" placeholder="请输入字典类型" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in COMMON_STATUS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-datasource-column-enum:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-datasource-column-enum:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-datasource-column-enum:export']">
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
      <el-table-column label="字段编号" align="center" prop="columnId" width="100" />
      <el-table-column label="源值" align="center" prop="sourceValue" :show-overflow-tooltip="true" />
      <el-table-column label="展示名" align="center" prop="displayName" :show-overflow-tooltip="true" />
      <el-table-column label="字典类型" align="center" prop="dictType" />
      <el-table-column label="字典值" align="center" prop="dictValue" :show-overflow-tooltip="true" />
      <el-table-column label="来源" align="center" prop="source" width="90" />
      <el-table-column label="采样次数" align="center" prop="sampleCount" width="100" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">{{ getOptionLabel(COMMON_STATUS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column label="描述" align="center" prop="description" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-datasource-column-enum:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-datasource-column-enum:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <EnumForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { COMMON_STATUS, getOptionLabel } from '@/api/dataQuery/constants'
import * as ColumnApi from '@/api/dataQuery/datasource/column'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as EnumApi from '@/api/dataQuery/datasource/enumvalue'
import * as TableApi from '@/api/dataQuery/datasource/table'
import EnumForm from './EnumForm.vue'

defineOptions({ name: 'DataQueryDatasourceEnum' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<EnumApi.AiDatasourceColumnEnumVO[]>([])
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const tableOptions = ref<TableApi.AiDatasourceTableVO[]>([])
const columnOptions = ref<ColumnApi.AiDatasourceColumnVO[]>([])
const queryParams = reactive<EnumApi.AiDatasourceColumnEnumPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  datasourceId: undefined,
  tableId: undefined,
  columnId: undefined,
  sourceValue: undefined,
  displayName: undefined,
  dictType: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const datasourceName = (id: number) =>
  datasourceOptions.value.find((item) => item.id === id)?.name || id

const handleDatasourceChange = async (val: number) => {
  queryParams.tableId = undefined
  queryParams.columnId = undefined
  tableOptions.value = val ? await TableApi.getAiDatasourceTableListByDatasource(val) : []
  columnOptions.value = val ? await ColumnApi.getAiDatasourceColumnListByDatasource(val) : []
}

const handleTableChange = async (val: number) => {
  queryParams.columnId = undefined
  if (val) {
    columnOptions.value = await ColumnApi.getAiDatasourceColumnListByTable(val)
  } else if (queryParams.datasourceId) {
    columnOptions.value = await ColumnApi.getAiDatasourceColumnListByDatasource(queryParams.datasourceId)
  } else {
    columnOptions.value = []
  }
}

const getList = async () => {
  loading.value = true
  try {
    const data = await EnumApi.getAiDatasourceColumnEnumPage(queryParams)
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
  columnOptions.value = []
  handleQuery()
}

const formRef = ref()
const openForm = (type: string, id?: number) => formRef.value.open(type, id)

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await EnumApi.deleteAiDatasourceColumnEnum(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: EnumApi.AiDatasourceColumnEnumVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await EnumApi.deleteAiDatasourceColumnEnumList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EnumApi.exportAiDatasourceColumnEnum(queryParams)
    download.excel(data, '字段枚举映射.xls')
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
