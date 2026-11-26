<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="用户 ID" prop="userId">
        <el-input-number v-model="queryParams.userId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="数据源 ID" prop="datasourceId">
        <el-input-number v-model="queryParams.datasourceId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="会话编号" prop="sessionNo">
        <el-input v-model="queryParams.sessionNo" placeholder="请输入会话编号" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="queryParams.sceneCode" placeholder="请选择场景" clearable filterable class="!w-220px">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in QUERY_SESSION_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="会话标题" prop="title">
        <el-input v-model="queryParams.title" placeholder="请输入会话标题" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="链路 ID" prop="traceId">
        <el-input v-model="queryParams.traceId" placeholder="请输入 traceId" clearable class="!w-220px" @keyup.enter="handleQuery" />
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-query-session:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-query-session:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-query-session:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="用户 ID" align="center" prop="userId" width="100" />
      <el-table-column label="数据源 ID" align="center" prop="datasourceId" width="110" />
      <el-table-column label="会话标题" align="center" prop="title" :show-overflow-tooltip="true" />
      <el-table-column label="会话编号" align="center" prop="sessionNo" :show-overflow-tooltip="true" />
      <el-table-column label="场景编码" align="center" prop="sceneCode">
        <template #default="scope">{{ getOptionLabel(SCENE_OPTIONS, scope.row.sceneCode) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : scope.row.status === 2 ? 'info' : 'warning'">
            {{ getOptionLabel(QUERY_SESSION_STATUS_OPTIONS, scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="消息数" align="center" prop="messageCount" width="90" />
      <el-table-column label="最近问题" align="center" prop="lastQuestion" :show-overflow-tooltip="true" />
      <el-table-column label="最近提问" align="center" prop="lastAskTime" width="180" />
      <el-table-column label="链路 ID" align="center" prop="traceId" width="180" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-query-session:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-query-session:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <SessionForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { QUERY_SESSION_STATUS_OPTIONS, SCENE_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as SessionApi from '@/api/dataQuery/queryruntime/session'
import SessionForm from './SessionForm.vue'

defineOptions({ name: 'DataQueryQuerySession' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<SessionApi.AiQuerySessionVO[]>([])
const queryParams = reactive<SessionApi.AiQuerySessionPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  userId: undefined,
  datasourceId: undefined,
  sessionNo: undefined,
  sceneCode: undefined,
  status: undefined,
  title: undefined,
  traceId: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await SessionApi.getAiQuerySessionPage(queryParams)
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
    await SessionApi.deleteAiQuerySession(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: SessionApi.AiQuerySessionVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await SessionApi.deleteAiQuerySessionList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await SessionApi.exportAiQuerySession(queryParams)
    download.excel(data, '问数会话.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
