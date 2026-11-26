<template>
  <ContentWrap>
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="80px"
    >
      <el-form-item label="模型名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入模型名称"
          clearable
          class="!w-220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="模型标识" prop="modelId">
        <el-input
          v-model="queryParams.modelId"
          placeholder="请输入模型标识"
          clearable
          class="!w-220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="供应商" prop="providerId">
        <el-select
          v-model="queryParams.providerId"
          placeholder="请选择供应商"
          clearable
          class="!w-220px"
        >
          <el-option
            v-for="item in providerOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="模型类型" prop="modelType">
        <el-select
          v-model="queryParams.modelType"
          placeholder="请选择类型"
          clearable
          class="!w-220px"
        >
          <el-option
            v-for="item in MODEL_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option
            v-for="item in GRAY_STATUS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['data-query:ai-model-config:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button
          type="danger"
          plain
          :disabled="checkedIds.length === 0"
          @click="handleDeleteBatch"
          v-hasPermi="['data-query:ai-model-config:delete']"
        >
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button
          type="success"
          plain
          :loading="exportLoading"
          @click="handleExport"
          v-hasPermi="['data-query:ai-model-config:export']"
        >
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="模型名称" align="center" prop="name" :show-overflow-tooltip="true" />
      <el-table-column
        label="模型标识"
        align="center"
        prop="modelId"
        :show-overflow-tooltip="true"
      />
      <el-table-column label="供应商" align="center" prop="providerId">
        <template #default="scope">{{ providerName(scope.row.providerId) }}</template>
      </el-table-column>
      <el-table-column label="类型" align="center" prop="modelType">
        <template #default="scope">{{
          getOptionLabel(MODEL_TYPE_OPTIONS, scope.row.modelType)
        }}</template>
      </el-table-column>
      <el-table-column label="协议" align="center" prop="protocol" width="120" />
      <el-table-column label="上下文窗口" align="center" prop="contextWindow" />
      <el-table-column label="健康状态" align="center" prop="healthStatus">
        <template #default="scope">{{
          getOptionLabel(HEALTH_STATUS_OPTIONS, scope.row.healthStatus)
        }}</template>
      </el-table-column>
      <el-table-column label="熔断" align="center" prop="circuitEnabled" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.circuitEnabled === 1 ? 'warning' : 'info'">{{
            getOptionLabel(YES_NO_OPTIONS, scope.row.circuitEnabled)
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="getStatusTagType(scope.row.status)">{{
            getOptionLabel(GRAY_STATUS, scope.row.status)
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        width="180"
        :formatter="dateFormatter"
      />
      <el-table-column label="操作" align="center" width="200" fixed="right">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['data-query:ai-model-config:update']"
            >编辑</el-button
          >
          <el-button
            link
            type="warning"
            @click="handleStatusChange(scope.row)"
            v-hasPermi="['data-query:ai-model-config:update']"
          >
            {{ scope.row.status === 0 ? '停用' : '启用' }}
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['data-query:ai-model-config:delete']"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <ConfigForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  GRAY_STATUS,
  HEALTH_STATUS_OPTIONS,
  MODEL_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  getOptionLabel,
  getStatusTagType
} from '@/api/dataQuery/constants'
import * as ConfigApi from '@/api/dataQuery/model/config'
import * as ProviderApi from '@/api/dataQuery/model/provider'
import ConfigForm from './ConfigForm.vue'

defineOptions({ name: 'DataQueryModelConfig' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<ConfigApi.AiModelConfigVO[]>([])
const providerOptions = ref<ProviderApi.AiModelProviderSimpleVO[]>([])
const queryParams = reactive<ConfigApi.AiModelConfigPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  modelId: undefined,
  providerId: undefined,
  modelType: undefined,
  status: undefined,
  healthStatus: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const providerName = (id: number) =>
  providerOptions.value.find((item) => item.id === id)?.name || id

const getList = async () => {
  loading.value = true
  try {
    const data = await ConfigApi.getAiModelConfigPage(queryParams)
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

const handleStatusChange = async (row: ConfigApi.AiModelConfigVO) => {
  await ConfigApi.updateAiModelConfigStatus(row.id!, row.status === 0 ? 1 : 0)
  message.success('状态修改成功')
  await getList()
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await ConfigApi.deleteAiModelConfig(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: ConfigApi.AiModelConfigVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await ConfigApi.deleteAiModelConfigList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await ConfigApi.exportAiModelConfig(queryParams)
    download.excel(data, '模型配置.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  providerOptions.value = await ProviderApi.getAiModelProviderSimpleList()
  getList()
})
</script>
