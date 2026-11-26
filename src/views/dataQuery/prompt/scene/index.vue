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
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in COMMON_STATUS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-prompt-scene:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-prompt-scene:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-prompt-scene:export']">
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
      <el-table-column label="场景说明" align="center" prop="description" :show-overflow-tooltip="true" />
      <el-table-column label="默认占位符" align="center" prop="defaultVariables" :show-overflow-tooltip="true" />
      <el-table-column label="建议模型类型" align="center" prop="defaultModelType">
        <template #default="scope">{{ getOptionLabel(MODEL_TYPE_OPTIONS, scope.row.defaultModelType) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="getStatusTagType(scope.row.status)">{{ getOptionLabel(COMMON_STATUS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column label="操作" align="center" width="200" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-prompt-scene:update']">编辑</el-button>
          <el-button link type="warning" @click="handleStatusChange(scope.row)" v-hasPermi="['data-query:ai-prompt-scene:update']">
            {{ scope.row.status === 0 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-prompt-scene:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <SceneForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import download from '@/utils/download'
import { COMMON_STATUS, MODEL_TYPE_OPTIONS, SCENE_OPTIONS, getOptionLabel, getStatusTagType } from '@/api/dataQuery/constants'
import * as SceneApi from '@/api/dataQuery/prompt/scene'
import SceneForm from './SceneForm.vue'

defineOptions({ name: 'DataQueryPromptScene' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<SceneApi.AiPromptSceneVO[]>([])
const queryParams = reactive<SceneApi.AiPromptScenePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  sceneCode: undefined,
  sceneName: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await SceneApi.getAiPromptScenePage(queryParams)
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

const handleStatusChange = async (row: SceneApi.AiPromptSceneVO) => {
  await SceneApi.updateAiPromptSceneStatus(row.id!, row.status === 0 ? 1 : 0)
  message.success('状态修改成功')
  await getList()
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await SceneApi.deleteAiPromptScene(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: SceneApi.AiPromptSceneVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await SceneApi.deleteAiPromptSceneList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await SceneApi.exportAiPromptScene(queryParams)
    download.excel(data, '提示词场景字典.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
