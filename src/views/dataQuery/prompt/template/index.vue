<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="80px">
      <el-form-item label="场景编码" prop="sceneCode">
        <el-select v-model="queryParams.sceneCode" placeholder="请选择场景" clearable filterable class="!w-220px">
          <el-option v-for="item in SCENE_OPTIONS" :key="item.value" :label="`${item.label} (${item.value})`" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="提示词名称" prop="name">
        <el-input v-model="queryParams.name" placeholder="请输入名称" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="提示词编码" prop="code">
        <el-input v-model="queryParams.code" placeholder="请输入编码" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in GRAY_STATUS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-prompt:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-prompt:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-prompt:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="场景" align="center" prop="sceneCode" />
      <el-table-column label="提示词名称" align="center" prop="name" :show-overflow-tooltip="true" />
      <el-table-column label="编码" align="center" prop="code" :show-overflow-tooltip="true" />
      <el-table-column label="类型" align="center" prop="promptType">
        <template #default="scope">{{ getOptionLabel(PROMPT_TYPE_OPTIONS, scope.row.promptType) }}</template>
      </el-table-column>
      <el-table-column label="当前版本" align="center" prop="version" width="100" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="getStatusTagType(scope.row.status)">{{ getOptionLabel(GRAY_STATUS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="灰度比例" align="center" prop="grayRatio" width="100" />
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="220" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-prompt:update']">编辑</el-button>
          <el-button link type="info" @click="openActions(scope.row)">更多</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-prompt:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <TemplateForm ref="formRef" @success="getList" />
  <TemplateActions ref="actionsRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { GRAY_STATUS, PROMPT_TYPE_OPTIONS, SCENE_OPTIONS, getOptionLabel, getStatusTagType } from '@/api/dataQuery/constants'
import * as PromptApi from '@/api/dataQuery/prompt/template'
import TemplateForm from './TemplateForm.vue'
import TemplateActions from './TemplateActions.vue'

defineOptions({ name: 'DataQueryPromptTemplate' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<PromptApi.AiPromptVO[]>([])
const queryParams = reactive<PromptApi.AiPromptPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  sceneCode: undefined,
  name: undefined,
  code: undefined,
  promptType: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await PromptApi.getAiPromptPage(queryParams)
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
const actionsRef = ref()
const openActions = (row: PromptApi.AiPromptVO) => actionsRef.value.open(row)

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await PromptApi.deleteAiPrompt(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: PromptApi.AiPromptVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await PromptApi.deleteAiPromptList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await PromptApi.exportAiPrompt(queryParams)
    download.excel(data, '提示词模板.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
