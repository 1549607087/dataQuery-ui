<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="实验名称" prop="name">
        <el-input v-model="queryParams.name" placeholder="请输入实验名称" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="灰度变量" prop="grayObject">
        <el-select v-model="queryParams.grayObject" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in GRAY_OBJECT_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="生效场景" prop="sceneCode">
        <el-select v-model="queryParams.sceneCode" placeholder="请选择场景" clearable filterable class="!w-220px">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in EXPERIMENT_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-model-gray-experiment:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-model-gray-experiment:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb-12px"
      title="一次实验只允许一个变量"
      description="MODEL 或 PROMPT 二选一，避免模型与提示词同时变化导致 A/B 归因污染；分桶维度必须稳定，否则同一用户两次请求会命中不同分组。"
    />
    <el-table v-loading="loading" :data="list">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="实验名称" align="center" prop="name" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="灰度变量" align="center" prop="grayObject">
        <template #default="scope">{{ getOptionLabel(GRAY_OBJECT_OPTIONS, scope.row.grayObject) }}</template>
      </el-table-column>
      <el-table-column label="生效场景" align="center" prop="sceneCode" />
      <el-table-column label="灰度比例" align="center" prop="grayRatio" width="100">
        <template #default="scope">{{ scope.row.grayRatio }}%</template>
      </el-table-column>
      <el-table-column label="分桶维度" align="center" prop="bucketKey">
        <template #default="scope">{{ getOptionLabel(BUCKET_KEY_OPTIONS, scope.row.bucketKey) }}</template>
      </el-table-column>
      <el-table-column label="最小样本量" align="center" prop="minSampleSize" width="110" />
      <el-table-column label="状态" align="center" prop="status" width="110">
        <template #default="scope">
          <el-tag :type="getExperimentStatusTagType(scope.row.status)">{{ getOptionLabel(EXPERIMENT_STATUS_OPTIONS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="起止时间" align="center" min-width="280">
        <template #default="scope">{{ scope.row.startTime || '-' }} ~ {{ scope.row.endTime || '-' }}</template>
      </el-table-column>
      <el-table-column label="实验结论" align="center" prop="conclusion" min-width="140" :show-overflow-tooltip="true" />
      <el-table-column label="操作" align="center" width="240" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-model-gray-experiment:update']">编辑</el-button>
          <el-dropdown trigger="click" @command="(status: number | string) => handleStatusChange(scope.row, Number(status))">
            <el-button link type="warning" v-hasPermi="['data-query:ai-model-gray-experiment:update']">状态流转<Icon icon="ep:arrow-down" class="ml-3px" /></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="item in EXPERIMENT_STATUS_OPTIONS" :key="item.value" :command="item.value" :disabled="item.value === scope.row.status">
                  {{ item.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-model-gray-experiment:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <GrayExperimentForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import download from '@/utils/download'
import {
  BUCKET_KEY_OPTIONS,
  EXPERIMENT_STATUS_OPTIONS,
  GRAY_OBJECT_OPTIONS,
  SCENE_OPTIONS,
  getExperimentStatusTagType,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as ExperimentApi from '@/api/dataQuery/model/grayExperiment'
import GrayExperimentForm from './GrayExperimentForm.vue'

defineOptions({ name: 'DataQueryModelGrayExperiment' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<ExperimentApi.AiModelGrayExperimentVO[]>([])
const queryParams = reactive<ExperimentApi.AiModelGrayExperimentPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  grayObject: undefined,
  sceneCode: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await ExperimentApi.getAiModelGrayExperimentPage(queryParams)
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

const handleStatusChange = async (row: ExperimentApi.AiModelGrayExperimentVO, status: number) => {
  await ExperimentApi.updateAiModelGrayExperimentStatus(row.id!, status)
  message.success('状态修改成功')
  await getList()
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await ExperimentApi.deleteAiModelGrayExperiment(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await ExperimentApi.exportAiModelGrayExperiment(queryParams)
    download.excel(data, '灰度实验.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
