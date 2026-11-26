<template>
  <ContentWrap>
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="80px"
    >
      <el-form-item label="供应商名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入供应商名称"
          clearable
          class="!w-220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="供应商编码" prop="code">
        <el-input
          v-model="queryParams.code"
          placeholder="请输入供应商编码"
          clearable
          class="!w-220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option
            v-for="item in COMMON_STATUS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
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
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['data-query:ai-model-provider:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button
          type="danger"
          plain
          :disabled="checkedIds.length === 0"
          @click="handleDeleteBatch"
          v-hasPermi="['data-query:ai-model-provider:delete']"
        >
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button
          type="success"
          plain
          :loading="exportLoading"
          @click="handleExport"
          v-hasPermi="['data-query:ai-model-provider:export']"
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
      <el-table-column
        label="供应商名称"
        align="center"
        prop="name"
        :show-overflow-tooltip="true"
      />
      <el-table-column label="编码" align="center" prop="code" :show-overflow-tooltip="true" />
      <el-table-column
        label="API 地址"
        align="center"
        prop="baseUrl"
        :show-overflow-tooltip="true"
      />
      <el-table-column label="每日 Token 上限" align="center" prop="dailyTokenLimit" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="getStatusTagType(scope.row.status)">{{
            getOptionLabel(COMMON_STATUS, scope.row.status)
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
            v-hasPermi="['data-query:ai-model-provider:update']"
            >编辑</el-button
          >
          <el-button
            link
            type="warning"
            @click="handleStatusChange(scope.row)"
            v-hasPermi="['data-query:ai-model-provider:update']"
          >
            {{ scope.row.status === 0 ? '停用' : '启用' }}
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['data-query:ai-model-provider:delete']"
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

  <ProviderForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { COMMON_STATUS, getOptionLabel, getStatusTagType } from '@/api/dataQuery/constants'
import * as ProviderApi from '@/api/dataQuery/model/provider'
import ProviderForm from './ProviderForm.vue'

defineOptions({ name: 'DataQueryModelProvider' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<ProviderApi.AiModelProviderVO[]>([])
const queryParams = reactive<ProviderApi.AiModelProviderPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  code: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await ProviderApi.getAiModelProviderPage(queryParams)
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

const handleStatusChange = async (row: ProviderApi.AiModelProviderVO) => {
  const status = row.status === 0 ? 1 : 0
  await ProviderApi.updateAiModelProviderStatus(row.id!, status)
  message.success('状态修改成功')
  await getList()
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await ProviderApi.deleteAiModelProvider(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: ProviderApi.AiModelProviderVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await ProviderApi.deleteAiModelProviderList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await ProviderApi.exportAiModelProvider(queryParams)
    download.excel(data, '模型供应商.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
