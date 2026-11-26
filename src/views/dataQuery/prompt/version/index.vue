<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="所属提示词" prop="promptId">
        <el-select v-model="queryParams.promptId" placeholder="请选择提示词" clearable filterable class="!w-240px">
          <el-option v-for="item in promptOptions" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="版本号" prop="version">
        <el-input-number v-model="queryParams.version" :min="1" controls-position="right" class="!w-160px" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in VERSION_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="发布人" prop="publisher">
        <el-input v-model="queryParams.publisher" placeholder="请输入发布人" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-prompt-version:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="提示词" align="center" prop="promptId">
        <template #default="scope">{{ promptName(scope.row.promptId) }}</template>
      </el-table-column>
      <el-table-column label="版本号" align="center" prop="version" width="100" />
      <el-table-column label="变更说明" align="center" prop="changeLog" :show-overflow-tooltip="true" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">{{ getOptionLabel(VERSION_STATUS_OPTIONS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Token 预估" align="center" prop="tokenEstimate" width="110" />
      <el-table-column label="发布时间" align="center" prop="publishTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="发布人" align="center" prop="publisher" />
      <el-table-column label="操作" align="center" width="220" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
          <el-button link type="info" @click="openDiff(scope.row)" v-hasPermi="['data-query:ai-prompt-version:query']">对比</el-button>
          <el-button link type="warning" @click="openRollback(scope.row)" v-hasPermi="['data-query:ai-prompt-version:update']">回滚</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="detailVisible" title="版本快照详情" width="900px">
    <el-descriptions :column="2" border class="mb-15px">
      <el-descriptions-item label="版本号">{{ detail.version }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ getOptionLabel(VERSION_STATUS_OPTIONS, detail.status) }}</el-descriptions-item>
      <el-descriptions-item label="变更说明">{{ detail.changeLog }}</el-descriptions-item>
      <el-descriptions-item label="正文哈希">{{ detail.contentHash }}</el-descriptions-item>
    </el-descriptions>
    <div class="mb-10px">模板正文</div>
    <el-input :model-value="detail.content" type="textarea" :rows="10" readonly />
    <div class="mt-15px mb-10px">变量定义快照</div>
    <el-input :model-value="detail.variableDefs" type="textarea" :rows="4" readonly />
  </el-dialog>

  <el-dialog v-model="diffVisible" title="版本对比" width="1000px">
    <el-form :inline="true" class="mb-15px">
      <el-form-item label="源版本">
        <el-select v-model="diffForm.sourceId" placeholder="请选择" class="!w-220px">
          <el-option v-for="item in versionOptions" :key="item.id" :label="`v${item.version} - ${item.changeLog || '无说明'}`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="目标版本">
        <el-select v-model="diffForm.targetId" placeholder="请选择" class="!w-220px">
          <el-option v-for="item in versionOptions" :key="item.id" :label="`v${item.version} - ${item.changeLog || '无说明'}`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="diffLoading" @click="handleDiff">开始对比</el-button>
      </el-form-item>
    </el-form>
    <template v-if="diffResult">
      <el-tag :type="diffResult.contentChanged ? 'warning' : 'success'" class="mb-10px">
        正文{{ diffResult.contentChanged ? '有变更' : '无变更' }}
      </el-tag>
      <el-tag :type="diffResult.variableChanged ? 'warning' : 'success'" class="mb-10px ml-10px">
        变量定义{{ diffResult.variableChanged ? '有变更' : '无变更' }}
      </el-tag>
      <el-row :gutter="15">
        <el-col :span="12">
          <div class="mb-8px">源版本 v{{ diffResult.sourceVersion }}</div>
          <el-input :model-value="diffResult.sourceContent" type="textarea" :rows="12" readonly />
        </el-col>
        <el-col :span="12">
          <div class="mb-8px">目标版本 v{{ diffResult.targetVersion }}</div>
          <el-input :model-value="diffResult.targetContent" type="textarea" :rows="12" readonly />
        </el-col>
      </el-row>
    </template>
  </el-dialog>

  <el-dialog v-model="rollbackVisible" title="回滚到该版本" width="560px">
    <el-alert type="warning" :closable="false" show-icon class="mb-15px" title="回滚会基于所选版本生成一条新版本，不会改写任何历史版本记录" />
    <el-form label-width="100px">
      <el-form-item label="变更说明">
        <el-input v-model="rollbackChangeLog" type="textarea" :rows="3" placeholder="本次回滚的说明" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" :loading="rollbackLoading" @click="handleRollback">确认回滚</el-button>
      <el-button @click="rollbackVisible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { VERSION_STATUS_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as VersionApi from '@/api/dataQuery/prompt/version'
import * as PromptApi from '@/api/dataQuery/prompt/template'

defineOptions({ name: 'DataQueryPromptVersion' })

const message = useMessage()

const loading = ref(true)
const total = ref(0)
const list = ref<VersionApi.AiPromptVersionVO[]>([])
const promptOptions = ref<PromptApi.AiPromptSimpleVO[]>([])
const queryParams = reactive<VersionApi.AiPromptVersionPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  promptId: undefined,
  version: undefined,
  status: undefined,
  publisher: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const promptName = (id: number) => promptOptions.value.find((item) => item.id === id)?.name || id

const getList = async () => {
  loading.value = true
  try {
    const data = await VersionApi.getAiPromptVersionPage(queryParams)
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
const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await VersionApi.exportAiPromptVersion(queryParams)
    download.excel(data, '提示词版本.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 详情 */
const detailVisible = ref(false)
const detail = ref<Partial<VersionApi.AiPromptVersionVO>>({})
const openDetail = (row: VersionApi.AiPromptVersionVO) => {
  detail.value = row
  detailVisible.value = true
}

/** 对比 */
const diffVisible = ref(false)
const diffLoading = ref(false)
const versionOptions = ref<VersionApi.AiPromptVersionVO[]>([])
const diffForm = reactive<{ sourceId?: number; targetId?: number }>({ sourceId: undefined, targetId: undefined })
const diffResult = ref<VersionApi.AiPromptVersionDiffVO>()
const openDiff = async (row: VersionApi.AiPromptVersionVO) => {
  diffVisible.value = true
  diffResult.value = undefined
  diffLoading.value = true
  try {
    versionOptions.value = await VersionApi.getAiPromptVersionListByPrompt(row.promptId)
    const others = versionOptions.value.filter((item) => item.id !== row.id)
    diffForm.sourceId = others.length ? others[others.length - 1].id : row.id
    diffForm.targetId = row.id
  } finally {
    diffLoading.value = false
  }
}
const handleDiff = async () => {
  if (!diffForm.sourceId || !diffForm.targetId) {
    message.warning('请选择要对比的两个版本')
    return
  }
  diffLoading.value = true
  try {
    diffResult.value = await VersionApi.diffAiPromptVersion(diffForm.sourceId, diffForm.targetId)
  } finally {
    diffLoading.value = false
  }
}

/** 回滚 */
const rollbackVisible = ref(false)
const rollbackLoading = ref(false)
const rollbackRow = ref<Partial<VersionApi.AiPromptVersionVO>>({})
const rollbackChangeLog = ref('')
const openRollback = (row: VersionApi.AiPromptVersionVO) => {
  rollbackRow.value = row
  rollbackChangeLog.value = ''
  rollbackVisible.value = true
}
const handleRollback = async () => {
  if (!rollbackRow.value.promptId || !rollbackRow.value.id) return
  try {
    await message.confirm('确认基于该版本生成新版本并切换当前生效版本？')
  } catch {
    return
  }
  rollbackLoading.value = true
  try {
    await VersionApi.rollbackAiPromptVersion({
      promptId: rollbackRow.value.promptId,
      versionId: rollbackRow.value.id,
      changeLog: rollbackChangeLog.value
    })
    message.success('回滚成功')
    rollbackVisible.value = false
    await getList()
  } finally {
    rollbackLoading.value = false
  }
}

onMounted(async () => {
  promptOptions.value = await PromptApi.getAiPromptSimpleList()
  getList()
})
</script>
