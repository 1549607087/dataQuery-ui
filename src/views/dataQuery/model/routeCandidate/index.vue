<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="场景绑定" prop="bindingId">
        <el-select v-model="queryParams.bindingId" placeholder="请选择场景绑定" clearable filterable class="!w-220px">
          <el-option v-for="item in bindingOptions" :key="item.id" :label="`${item.sceneName} (${item.sceneCode})`" :value="item.id!" />
        </el-select>
      </el-form-item>
      <el-form-item label="候选模型" prop="modelId">
        <el-select v-model="queryParams.modelId" placeholder="请选择模型" clearable filterable class="!w-220px">
          <el-option v-for="item in modelOptions" :key="item.id" :label="`${item.name} (${item.modelId})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="供应商" prop="providerId">
        <el-select v-model="queryParams.providerId" placeholder="请选择供应商" clearable class="!w-220px">
          <el-option v-for="item in providerOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="参与路由" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-model-route-candidate:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-model-route-candidate:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-model-route-candidate:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
        <el-button type="info" plain :disabled="!queryParams.bindingId" @click="openChain" v-hasPermi="['data-query:ai-model-route-candidate:query']">
          <Icon icon="ep:share" class="mr-5px" />查看当前绑定候选链
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
      title="候选表优先"
      description="路由策略为「权重」或「成本优先」时，运行时优先读取本表；查不到候选才回落解析场景绑定里的旧降级链字符串。"
    />
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="场景绑定" align="center" prop="bindingId" min-width="140">
        <template #default="scope">{{ bindingName(scope.row.bindingId) }}</template>
      </el-table-column>
      <el-table-column label="候选模型" align="center" prop="modelId" min-width="150">
        <template #default="scope">{{ modelName(scope.row.modelId) }}</template>
      </el-table-column>
      <el-table-column label="供应商" align="center" prop="providerId">
        <template #default="scope">{{ providerName(scope.row.providerId) }}</template>
      </el-table-column>
      <el-table-column label="权重" align="center" prop="weight" width="80" />
      <el-table-column label="优先级" align="center" prop="priority" width="80" />
      <el-table-column label="最大 QPS" align="center" prop="maxQps" width="100" />
      <el-table-column label="参与路由" align="center" prop="enabled" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.enabled === 1 ? 'success' : 'info'">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.enabled) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="160" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-model-route-candidate:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-model-route-candidate:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <RouteCandidateForm ref="formRef" @success="getList" />

  <el-dialog v-model="chainVisible" title="场景绑定候选链（运行时顺序）" width="800px">
    <el-table v-loading="chainLoading" :data="chainList" size="small">
      <el-table-column label="顺序" align="center" type="index" width="70" />
      <el-table-column label="候选模型" align="center" prop="modelId">
        <template #default="scope">{{ modelName(scope.row.modelId) }}</template>
      </el-table-column>
      <el-table-column label="供应商" align="center" prop="providerId">
        <template #default="scope">{{ providerName(scope.row.providerId) }}</template>
      </el-table-column>
      <el-table-column label="权重" align="center" prop="weight" />
      <el-table-column label="优先级" align="center" prop="priority" />
      <el-table-column label="最大 QPS" align="center" prop="maxQps" />
      <el-table-column label="参与路由" align="center" prop="enabled">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.enabled) }}</template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { YES_NO_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as CandidateApi from '@/api/dataQuery/model/routeCandidate'
import * as BindingApi from '@/api/dataQuery/model/sceneBinding'
import * as ConfigApi from '@/api/dataQuery/model/config'
import * as ProviderApi from '@/api/dataQuery/model/provider'
import RouteCandidateForm from './RouteCandidateForm.vue'

defineOptions({ name: 'DataQueryModelRouteCandidate' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<CandidateApi.AiModelRouteCandidateVO[]>([])
const bindingOptions = ref<BindingApi.AiModelSceneBindingVO[]>([])
const modelOptions = ref<ConfigApi.AiModelConfigSimpleVO[]>([])
const providerOptions = ref<ProviderApi.AiModelProviderSimpleVO[]>([])
const queryParams = reactive<CandidateApi.AiModelRouteCandidatePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  bindingId: undefined,
  modelId: undefined,
  providerId: undefined,
  enabled: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const bindingName = (id: number) => {
  const hit = bindingOptions.value.find((item) => item.id === id)
  return hit ? `${hit.sceneName} (${hit.sceneCode})` : id
}
const modelName = (id: number) => modelOptions.value.find((item) => item.id === id)?.name || id
const providerName = (id: number) => providerOptions.value.find((item) => item.id === id)?.name || id

const getList = async () => {
  loading.value = true
  try {
    const data = await CandidateApi.getAiModelRouteCandidatePage(queryParams)
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
    await CandidateApi.deleteAiModelRouteCandidate(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: CandidateApi.AiModelRouteCandidateVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await CandidateApi.deleteAiModelRouteCandidateList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await CandidateApi.exportAiModelRouteCandidate(queryParams)
    download.excel(data, '模型路由候选.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

const chainVisible = ref(false)
const chainLoading = ref(false)
const chainList = ref<CandidateApi.AiModelRouteCandidateVO[]>([])
const openChain = async () => {
  chainVisible.value = true
  chainLoading.value = true
  try {
    chainList.value = await CandidateApi.getAiModelRouteCandidateListByBinding(queryParams.bindingId!)
  } finally {
    chainLoading.value = false
  }
}

onMounted(async () => {
  const [bindings, models, providers] = await Promise.all([
    BindingApi.getAiModelSceneBindingPage({ pageNo: 1, pageSize: 100 }),
    ConfigApi.getAiModelConfigSimpleList(),
    ProviderApi.getAiModelProviderSimpleList()
  ])
  bindingOptions.value = bindings.list
  modelOptions.value = models
  providerOptions.value = providers
  getList()
})
</script>
