<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="100px">
      <el-form-item label="数据源" prop="datasourceId">
        <el-select v-model="queryParams.datasourceId" placeholder="请选择数据源" clearable filterable class="!w-220px" @change="handleDatasourceChange">
          <el-option v-for="item in datasourceOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="左表" prop="leftTableId">
        <el-select v-model="queryParams.leftTableId" placeholder="请选择左表" clearable filterable class="!w-220px">
          <el-option v-for="item in tableOptions" :key="item.id" :label="item.tableName" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="右表" prop="rightTableId">
        <el-select v-model="queryParams.rightTableId" placeholder="请选择右表" clearable filterable class="!w-220px">
          <el-option v-for="item in tableOptions" :key="item.id" :label="item.tableName" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="已验证" prop="verified">
        <el-select v-model="queryParams.verified" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否启用" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-datasource-table-relation:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-datasource-table-relation:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-datasource-table-relation:export']">
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
      <el-table-column label="左表" align="center" prop="leftTableName" :show-overflow-tooltip="true" />
      <el-table-column label="右表" align="center" prop="rightTableName" :show-overflow-tooltip="true" />
      <el-table-column label="连接类型" align="center" prop="joinType">
        <template #default="scope">{{ getOptionLabel(JOIN_TYPE_OPTIONS, scope.row.joinType) }}</template>
      </el-table-column>
      <el-table-column label="基数" align="center" prop="cardinality">
        <template #default="scope">{{ getOptionLabel(CARDINALITY_OPTIONS, scope.row.cardinality) }}</template>
      </el-table-column>
      <el-table-column label="已验证" align="center" prop="verified">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.verified) }}</template>
      </el-table-column>
      <el-table-column label="是否启用" align="center" prop="enabled">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.enabled) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">{{ getOptionLabel(COMMON_STATUS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="代价" align="center" prop="cost" width="90" />
      <el-table-column label="Join 条件" align="center" prop="joinCondition" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-datasource-table-relation:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-datasource-table-relation:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <RelationForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  CARDINALITY_OPTIONS,
  COMMON_STATUS,
  JOIN_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as RelationApi from '@/api/dataQuery/datasource/relation'
import * as TableApi from '@/api/dataQuery/datasource/table'
import RelationForm from './RelationForm.vue'

defineOptions({ name: 'DataQueryDatasourceRelation' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<RelationApi.AiDatasourceTableRelationVO[]>([])
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const tableOptions = ref<TableApi.AiDatasourceTableVO[]>([])
const queryParams = reactive<RelationApi.AiDatasourceTableRelationPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  datasourceId: undefined,
  leftTableId: undefined,
  rightTableId: undefined,
  verified: undefined,
  enabled: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const datasourceName = (id: number) =>
  datasourceOptions.value.find((item) => item.id === id)?.name || id

const handleDatasourceChange = async (val: number) => {
  queryParams.leftTableId = undefined
  queryParams.rightTableId = undefined
  tableOptions.value = val ? await TableApi.getAiDatasourceTableListByDatasource(val) : []
}

const getList = async () => {
  loading.value = true
  try {
    const data = await RelationApi.getAiDatasourceTableRelationPage(queryParams)
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
    await RelationApi.deleteAiDatasourceTableRelation(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: RelationApi.AiDatasourceTableRelationVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await RelationApi.deleteAiDatasourceTableRelationList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await RelationApi.exportAiDatasourceTableRelation(queryParams)
    download.excel(data, '表关系Join路径.xls')
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
