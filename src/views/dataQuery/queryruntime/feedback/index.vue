<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="审计 ID" prop="auditId">
        <el-input-number v-model="queryParams.auditId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="会话 ID" prop="sessionId">
        <el-input-number v-model="queryParams.sessionId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="用户 ID" prop="userId">
        <el-input-number v-model="queryParams.userId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="评分" prop="rating">
        <el-select v-model="queryParams.rating" placeholder="请选择评分" clearable class="!w-220px">
          <el-option v-for="item in RATING_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="反馈类型" prop="feedbackType">
        <el-input v-model="queryParams.feedbackType" placeholder="如 结果不准 / SQL 错误 / 口径疑问 / 其它" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="审核状态" prop="reviewed">
        <el-select v-model="queryParams.reviewed" placeholder="请选择审核状态" clearable class="!w-220px">
          <el-option v-for="item in REVIEW_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-query-feedback:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-query-feedback:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-query-feedback:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="审计 ID" align="center" prop="auditId" width="100" />
      <el-table-column label="会话 ID" align="center" prop="sessionId" width="100" />
      <el-table-column label="用户 ID" align="center" prop="userId" width="100" />
      <el-table-column label="评分" align="center" prop="rating">
        <template #default="scope">{{ getOptionLabel(RATING_OPTIONS, scope.row.rating) }}</template>
      </el-table-column>
      <el-table-column label="反馈类型" align="center" prop="feedbackType" :show-overflow-tooltip="true" />
      <el-table-column label="文字反馈" align="center" prop="comment" :show-overflow-tooltip="true" />
      <el-table-column label="纠正 SQL" align="center" prop="correctedSql" :show-overflow-tooltip="true" />
      <el-table-column label="审核状态" align="center" prop="reviewed">
        <template #default="scope">
          <el-tag :type="scope.row.reviewed === 1 ? 'success' : scope.row.reviewed === 2 ? 'danger' : 'info'">
            {{ getOptionLabel(REVIEW_STATUS_OPTIONS, scope.row.reviewed) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核人 ID" align="center" prop="reviewerId" width="110" />
      <el-table-column label="审核时间" align="center" prop="reviewTime" width="180" />
      <el-table-column label="审核备注" align="center" prop="reviewRemark" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-query-feedback:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-query-feedback:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <FeedbackForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { RATING_OPTIONS, REVIEW_STATUS_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as FeedbackApi from '@/api/dataQuery/queryruntime/feedback'
import FeedbackForm from './FeedbackForm.vue'

defineOptions({ name: 'DataQueryQueryFeedback' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<FeedbackApi.AiQueryFeedbackVO[]>([])
const queryParams = reactive<FeedbackApi.AiQueryFeedbackPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  auditId: undefined,
  sessionId: undefined,
  userId: undefined,
  rating: undefined,
  feedbackType: undefined,
  reviewed: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await FeedbackApi.getAiQueryFeedbackPage(queryParams)
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
    await FeedbackApi.deleteAiQueryFeedback(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: FeedbackApi.AiQueryFeedbackVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await FeedbackApi.deleteAiQueryFeedbackList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await FeedbackApi.exportAiQueryFeedback(queryParams)
    download.excel(data, '反馈.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
