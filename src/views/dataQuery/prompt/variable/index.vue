<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="所属提示词" prop="promptId">
        <el-select v-model="queryParams.promptId" placeholder="请选择提示词" clearable filterable class="!w-240px">
          <el-option v-for="item in promptOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="占位符名" prop="varName">
        <el-input v-model="queryParams.varName" placeholder="请输入占位符名" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="值类型" prop="varType">
        <el-select v-model="queryParams.varType" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in VAR_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in COMMON_STATUS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-prompt-variable:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="warning" plain @click="openBatch" v-hasPermi="['data-query:ai-prompt-variable:update']">
          <Icon icon="ep:edit" class="mr-5px" />整包保存
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-prompt-variable:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-prompt-variable:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="提示词" align="center" prop="promptId">
        <template #default="scope">{{ promptName(scope.row.promptId) }}</template>
      </el-table-column>
      <el-table-column label="场景" align="center" prop="sceneCode" />
      <el-table-column label="占位符" align="center" prop="varName" />
      <el-table-column label="中文名" align="center" prop="varLabel" />
      <el-table-column label="值类型" align="center" prop="varType">
        <template #default="scope">{{ getOptionLabel(VAR_TYPE_OPTIONS, scope.row.varType) }}</template>
      </el-table-column>
      <el-table-column label="注入来源" align="center" prop="sourceType">
        <template #default="scope">{{ getOptionLabel(SOURCE_TYPE_OPTIONS, scope.row.sourceType) }}</template>
      </el-table-column>
      <el-table-column label="必填" align="center" prop="required">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.required) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="getStatusTagType(scope.row.status)">{{ getOptionLabel(COMMON_STATUS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column label="操作" align="center" width="200" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-prompt-variable:update']">编辑</el-button>
          <el-button link type="warning" @click="handleStatusChange(scope.row)" v-hasPermi="['data-query:ai-prompt-variable:update']">
            {{ scope.row.status === 0 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-prompt-variable:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <VariableForm ref="formRef" @success="getList" />

  <el-dialog v-model="batchVisible" title="整包保存变量定义" width="800px">
    <el-alert type="warning" :closable="false" show-icon class="mb-15px" title="整包保存会逻辑删除所选提示词下的旧变量并重新创建，同时回写模板的变量定义快照" />
    <el-form :inline="true" class="mb-15px">
      <el-form-item label="所属提示词">
        <el-select v-model="batchForm.promptId" placeholder="请选择提示词" filterable class="!w-240px" @change="loadBatch">
          <el-option v-for="item in promptOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="场景编码">
        <el-input v-model="batchForm.sceneCode" placeholder="如 SQL_GEN" class="!w-180px" />
      </el-form-item>
      <el-form-item>
        <el-button @click="loadBatch">重新加载</el-button>
      </el-form-item>
    </el-form>
    <div class="mb-8px text-12px text-gray-400">编辑下方 JSON 数组后提交；字段与「新增/编辑」表单一致</div>
    <el-input v-model="batchForm.json" type="textarea" :rows="14" />
    <template #footer>
      <el-button type="primary" :loading="batchLoading" @click="handleBatchSave">整包保存</el-button>
      <el-button @click="batchVisible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import download from '@/utils/download'
import { COMMON_STATUS, SOURCE_TYPE_OPTIONS, VAR_TYPE_OPTIONS, YES_NO_OPTIONS, getOptionLabel, getStatusTagType } from '@/api/dataQuery/constants'
import * as VariableApi from '@/api/dataQuery/prompt/variable'
import * as PromptApi from '@/api/dataQuery/prompt/template'
import VariableForm from './VariableForm.vue'

defineOptions({ name: 'DataQueryPromptVariable' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<VariableApi.AiPromptVariableVO[]>([])
const promptOptions = ref<PromptApi.AiPromptSimpleVO[]>([])
const queryParams = reactive<VariableApi.AiPromptVariablePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  promptId: undefined,
  sceneCode: undefined,
  varName: undefined,
  varType: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const promptName = (id: number) => promptOptions.value.find((item) => item.id === id)?.name || id

const getList = async () => {
  loading.value = true
  try {
    const data = await VariableApi.getAiPromptVariablePage(queryParams)
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

const handleStatusChange = async (row: VariableApi.AiPromptVariableVO) => {
  await VariableApi.updateAiPromptVariableStatus(row.id!, row.status === 0 ? 1 : 0)
  message.success('状态修改成功')
  await getList()
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await VariableApi.deleteAiPromptVariable(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: VariableApi.AiPromptVariableVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await VariableApi.deleteAiPromptVariableList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await VariableApi.exportAiPromptVariable(queryParams)
    download.excel(data, '提示词模板变量.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 整包保存：以 JSON 编辑当前提示词的全部变量定义 */
const batchVisible = ref(false)
const batchLoading = ref(false)
const batchForm = reactive({ promptId: undefined as number | undefined, sceneCode: '', json: '[]' })

const toSaveVO = (item: VariableApi.AiPromptVariableVO): VariableApi.AiPromptVariableVO => ({
  id: item.id,
  promptId: item.promptId,
  sceneCode: item.sceneCode,
  varName: item.varName,
  varLabel: item.varLabel,
  varType: item.varType,
  sourceType: item.sourceType,
  sourceKey: item.sourceKey,
  required: item.required,
  defaultValue: item.defaultValue,
  sampleValue: item.sampleValue,
  validateRegex: item.validateRegex,
  maxLength: item.maxLength,
  status: item.status,
  sort: item.sort,
  remark: item.remark
})

const loadBatch = async () => {
  if (!batchForm.promptId) {
    batchForm.json = '[]'
    return
  }
  batchLoading.value = true
  try {
    const rows: VariableApi.AiPromptVariableVO[] = await VariableApi.getAiPromptVariableListByPrompt(batchForm.promptId)
    const scene = batchForm.sceneCode || rows[0]?.sceneCode || ''
    batchForm.sceneCode = scene
    batchForm.json = JSON.stringify(rows.map((row) => ({ ...toSaveVO(row), promptId: batchForm.promptId, sceneCode: scene })), null, 2)
  } finally {
    batchLoading.value = false
  }
}

const openBatch = async () => {
  batchForm.promptId = queryParams.promptId || promptOptions.value[0]?.id
  batchForm.sceneCode = queryParams.sceneCode || ''
  batchVisible.value = true
  await loadBatch()
}

const handleBatchSave = async () => {
  if (!batchForm.promptId) {
    message.warning('请先选择所属提示词')
    return
  }
  let variables: VariableApi.AiPromptVariableVO[]
  try {
    variables = JSON.parse(batchForm.json)
  } catch {
    message.warning('变量定义不是合法的 JSON')
    return
  }
  if (!Array.isArray(variables)) {
    message.warning('变量定义必须是 JSON 数组')
    return
  }
  try {
    await message.confirm('整包保存会覆盖该提示词下的全部变量定义，确认继续？')
  } catch {
    return
  }
  batchLoading.value = true
  try {
    await VariableApi.batchSaveAiPromptVariable({
      promptId: batchForm.promptId,
      sceneCode: batchForm.sceneCode,
      variables
    })
    message.success('保存成功')
    batchVisible.value = false
    await getList()
  } finally {
    batchLoading.value = false
  }
}

onMounted(async () => {
  promptOptions.value = await PromptApi.getAiPromptSimpleList()
  getList()
})
</script>
