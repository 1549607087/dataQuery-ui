<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="80px">
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="queryParams.sceneCode" placeholder="请选择场景" clearable filterable class="!w-220px">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="场景名称" prop="sceneName">
        <el-input v-model="queryParams.sceneName" placeholder="请输入场景名称" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="主模型" prop="primaryModelId">
        <el-select v-model="queryParams.primaryModelId" placeholder="请选择主模型" clearable class="!w-220px">
          <el-option v-for="item in modelOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否启用" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-model-scene-binding:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-model-scene-binding:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-model-scene-binding:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="场景编码" align="center" prop="sceneCode" />
      <el-table-column label="场景名称" align="center" prop="sceneName" />
      <el-table-column label="主模型" align="center" prop="primaryModelId">
        <template #default="scope">{{ modelName(scope.row.primaryModelId) }}</template>
      </el-table-column>
      <el-table-column label="降级链" align="center" prop="fallbackModelIds" :show-overflow-tooltip="true" />
      <el-table-column label="路由策略" align="center" prop="routeStrategy">
        <template #default="scope">{{ getOptionLabel(ROUTE_STRATEGY_OPTIONS, scope.row.routeStrategy) }}</template>
      </el-table-column>
      <el-table-column label="最大降级" align="center" prop="fallbackMaxDepth" width="100" />
      <el-table-column label="灰度比例" align="center" prop="grayRatio" width="100">
        <template #default="scope">{{ scope.row.grayRatio }}%</template>
      </el-table-column>
      <el-table-column label="绑定提示词" align="center" prop="promptId">
        <template #default="scope">{{ promptName(scope.row.promptId) }}</template>
      </el-table-column>
      <el-table-column label="是否启用" align="center" prop="enabled">
        <template #default="scope">
          <el-tag :type="scope.row.enabled === 1 ? 'success' : 'info'">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.enabled) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column label="操作" align="center" width="200" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-model-scene-binding:update']">编辑</el-button>
          <el-button link type="warning" @click="handleEnabledChange(scope.row)" v-hasPermi="['data-query:ai-model-scene-binding:update']">
            {{ scope.row.enabled === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-model-scene-binding:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <SceneBindingForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import download from '@/utils/download'
import { ROUTE_STRATEGY_OPTIONS, SCENE_OPTIONS, YES_NO_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as BindingApi from '@/api/dataQuery/model/sceneBinding'
import * as ConfigApi from '@/api/dataQuery/model/config'
import * as PromptApi from '@/api/dataQuery/prompt/template'
import SceneBindingForm from './SceneBindingForm.vue'

defineOptions({ name: 'DataQueryModelSceneBinding' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<BindingApi.AiModelSceneBindingVO[]>([])
const modelOptions = ref<ConfigApi.AiModelConfigSimpleVO[]>([])
const promptOptions = ref<PromptApi.AiPromptSimpleVO[]>([])
const queryParams = reactive<BindingApi.AiModelSceneBindingPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  sceneCode: undefined,
  sceneName: undefined,
  primaryModelId: undefined,
  enabled: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const modelName = (id: number) => modelOptions.value.find((item) => item.id === id)?.name || id
const promptName = (id: number) => (!id ? '跟随路由' : promptOptions.value.find((item) => item.id === id)?.name || id)

const getList = async () => {
  loading.value = true
  try {
    const data = await BindingApi.getAiModelSceneBindingPage(queryParams)
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

const handleEnabledChange = async (row: BindingApi.AiModelSceneBindingVO) => {
  await BindingApi.updateAiModelSceneBindingEnabled(row.id!, row.enabled === 1 ? 0 : 1)
  message.success('状态修改成功')
  await getList()
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await BindingApi.deleteAiModelSceneBinding(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: BindingApi.AiModelSceneBindingVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await BindingApi.deleteAiModelSceneBindingList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await BindingApi.exportAiModelSceneBinding(queryParams)
    download.excel(data, '模型场景绑定.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  modelOptions.value = await ConfigApi.getAiModelConfigSimpleList()
  promptOptions.value = await PromptApi.getAiPromptSimpleList()
  getList()
})
</script>
