<template>
  <ContentWrap>
    <!-- 顶部说明：轮询机制提示 -->
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb-15px"
      title="上传为异步解析"
      description="上传后仅返回文档编号，解析/切片/向量化由后端异步完成。页面会自动轮询解析状态，直到「已完成 / 失败 / 已下线」；期间可继续其他操作。"
    />

    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="90px"
    >
      <el-form-item label="知识库" prop="baseId">
        <el-select
          v-model="queryParams.baseId"
          placeholder="全部知识库"
          clearable
          class="!w-200px"
          @change="handleQuery"
        >
          <el-option
            v-for="item in baseOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="文件名" prop="fileName">
        <el-input
          v-model="queryParams.fileName"
          placeholder="文件名模糊匹配"
          clearable
          class="!w-200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="扩展名" prop="fileType">
        <el-select v-model="queryParams.fileType" placeholder="全部" clearable class="!w-130px">
          <el-option
            v-for="typeItem in DOCUMENT_ALLOWED_FILE_TYPES"
            :key="typeItem"
            :label="typeItem"
            :value="typeItem"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="解析状态" prop="parseStatus">
        <el-select v-model="queryParams.parseStatus" placeholder="全部" clearable class="!w-140px">
          <el-option
            v-for="item in DOCUMENT_PARSE_STATUS_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="参与检索" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="全部" clearable class="!w-120px">
          <el-option label="是" :value="1" />
          <el-option label="否" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('2000-01-01 00:00:00'), new Date('2000-01-01 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px" />搜索
        </el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb-8px">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          @click="openUpload"
          v-hasPermi="['data-query:knowledge-document:upload']"
        >
          <Icon icon="ep:upload-filled" class="mr-5px" />上传文档
        </el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          :loading="exportLoading"
          @click="handleExport"
          v-hasPermi="['data-query:knowledge-document:query']"
        >
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-col>
    </el-row>
  </ContentWrap>

  <ContentWrap class="mt-15px">
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="文件名" min-width="220" show-overflow-tooltip>
        <template #default="scope">
          <span class="font-medium">{{ scope.row.fileName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" align="center" prop="fileType" width="80">
        <template #default="scope">
          <el-tag size="small" type="info">{{ scope.row.fileType }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="版本" align="center" width="90">
        <template #default="scope">
          <div class="flex items-center justify-center gap-4px">
            <span class="font-medium">v{{ scope.row.version }}</span>
            <el-tag v-if="scope.row.isLatest === 1" type="success" size="small">生效</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="大小"
        align="center"
        prop="fileSize"
        width="100"
        :formatter="formatSize"
      />
      <el-table-column label="解析状态" align="center" prop="parseStatus" width="120">
        <template #default="scope">
          <el-tooltip
            v-if="scope.row.parseStatus === 3 && scope.row.parseError"
            :content="scope.row.parseError"
            placement="top"
          >
            <el-tag :type="getDocumentParseStatusTagType(scope.row.parseStatus)" size="small">
              {{ getOptionLabel(DOCUMENT_PARSE_STATUS_OPTIONS, scope.row.parseStatus) }}
            </el-tag>
          </el-tooltip>
          <el-tag v-else :type="getDocumentParseStatusTagType(scope.row.parseStatus)" size="small">
            <span
              v-if="scope.row.parseStatus === 1"
              class="inline-block h-6px w-6px shrink-0 rounded-full bg-current mr-4px"
            ></span>
            {{ getOptionLabel(DOCUMENT_PARSE_STATUS_OPTIONS, scope.row.parseStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="切片数" align="center" prop="chunkCount" width="90" />
      <el-table-column
        label="字符数"
        align="center"
        prop="charCount"
        width="110"
        :formatter="formatCount"
      />
      <el-table-column label="参与检索" align="center" prop="enabled" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.enabled === 1 ? 'success' : 'info'" size="small">
            {{ scope.row.enabled === 1 ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建人" align="center" prop="creator" width="100" />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        width="170"
        :formatter="dateFormatter"
      />
      <el-table-column label="操作" align="center" width="220" fixed="right">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openVersions(scope.row)"
            v-hasPermi="['data-query:knowledge-document:query']"
          >
            版本历史
          </el-button>
          <el-button
            link
            type="primary"
            :disabled="scope.row.parseStatus === 1"
            @click="handleRebuild(scope.row)"
            v-hasPermi="['data-query:knowledge-document:update']"
          >
            重建
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['data-query:knowledge-document:delete']"
          >
            删除
          </el-button>
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

  <DocumentUploadForm ref="uploadFormRef" @success="onUploadSuccess" />
  <DocumentVersionDialog ref="versionDialogRef" @switched="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { useRoute } from 'vue-router'
import * as KnowledgeDocumentApi from '@/api/dataQuery/knowledgeDocument'
import * as KnowledgeBaseApi from '@/api/dataQuery/knowledge'
import {
  DOCUMENT_ALLOWED_FILE_TYPES,
  DOCUMENT_PARSE_STATUS_OPTIONS,
  DOCUMENT_PARSE_FINAL_STATUS,
  getDocumentParseStatusTagType,
  getOptionLabel
} from '@/api/dataQuery/constants'
import DocumentUploadForm from './DocumentUploadForm.vue'
import DocumentVersionDialog from './DocumentVersionDialog.vue'

defineOptions({ name: 'DataQueryKnowledgeDocument' })

const message = useMessage()
const { t } = useI18n()
const route = useRoute()

const loading = ref(true)
const total = ref(0)
const list = ref<KnowledgeDocumentApi.AiKnowledgeDocumentVO[]>([])
const baseOptions = ref<KnowledgeBaseApi.AiKnowledgeBaseSimpleRespVO[]>([])
const queryFormRef = ref()
const exportLoading = ref(false)

const queryParams = reactive<KnowledgeDocumentApi.AiKnowledgeDocumentPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  baseId: undefined,
  fileName: undefined,
  fileType: undefined,
  parseStatus: undefined,
  enabled: undefined,
  createTime: []
})

// ---------- 工具 ----------
const formatSize = (_row: any, _column: any, cellValue: number): string => {
  if (cellValue == null) return '-'
  if (cellValue < 1024) return `${cellValue} B`
  if (cellValue < 1024 * 1024) return `${(cellValue / 1024).toFixed(1)} KB`
  return `${(cellValue / 1024 / 1024).toFixed(1)} MB`
}
const formatCount = (_row: any, _column: any, cellValue: number): string =>
  cellValue == null ? '-' : String(cellValue).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// ---------- 列表 ----------
const getList = async () => {
  loading.value = true
  try {
    const params = {
      ...queryParams,
      createTime: queryParams.createTime?.length === 2 ? queryParams.createTime : undefined
    }
    const data = await KnowledgeDocumentApi.getKnowledgeDocumentPage(params)
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
const loadBases = async () => {
  try {
    baseOptions.value = await KnowledgeBaseApi.getAiKnowledgeBaseSimpleList()
  } catch {
    baseOptions.value = []
  }
}

// ---------- 解析状态轮询 ----------
/** 待轮询的 documentId 集合；终态后移除 */
const pollingIds = ref<number[]>([])
let pollTimer: ReturnType<typeof setInterval> | undefined
const POLL_INTERVAL = 2000

const stopPolling = (id: number) => {
  pollingIds.value = pollingIds.value.filter((x) => x !== id)
}
const startPolling = (id: number) => {
  if (pollingIds.value.includes(id)) return
  pollingIds.value.push(id)
  if (pollTimer) return
  pollTimer = setInterval(() => {
    if (!pollingIds.value.length) {
      clearInterval(pollTimer)
      pollTimer = undefined
      return
    }
    void pollOnce()
  }, POLL_INTERVAL)
}
/** 单轮轮询：逐个查询，终态即停止；同时刷新列表行，避免列表信息过期 */
const pollOnce = async () => {
  const ids = [...pollingIds.value]
  for (const id of ids) {
    try {
      const fresh = await KnowledgeDocumentApi.getKnowledgeDocument(id)
      const idx = list.value.findIndex((row) => row.id === id)
      if (idx >= 0) list.value[idx] = { ...list.value[idx], ...fresh }
      if (DOCUMENT_PARSE_FINAL_STATUS.includes(fresh.parseStatus)) {
        stopPolling(id)
        if (fresh.parseStatus === 2) message.success(`文档「${fresh.fileName}」解析完成`)
        else if (fresh.parseStatus === 3)
          message.error(`文档「${fresh.fileName}」解析失败：${fresh.parseError || '未知原因'}`)
      }
    } catch {
      // 单条查询失败不影响其它文档，下一轮重试
    }
  }
}
onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
})

// ---------- 上传 / 重建 / 删除 / 导出 ----------
const uploadFormRef = ref()
const versionDialogRef = ref()
const openUpload = () => uploadFormRef.value.open(queryParams.baseId)
const onUploadSuccess = (documentId: number, duplicated: boolean, version: number) => {
  // 幂等命中时后端复用了已生效文档，无需轮询；否则刷新列表拿到该行再跟踪解析状态
  void getList().then(() => {
    if (!duplicated) startPolling(documentId)
    if (version) message.success(`已生成 v${version}，正在跟踪解析状态…`)
  })
}

/** 打开版本历史弹窗 */
const openVersions = (row: KnowledgeDocumentApi.AiKnowledgeDocumentVO) =>
  versionDialogRef.value.open(row)

const handleRebuild = async (row: KnowledgeDocumentApi.AiKnowledgeDocumentVO) => {
  try {
    await message.confirm(
      `确认重建文档「${row.fileName}」？将下线旧切片并重新解析，会产生 Embedding 成本。`,
      '重建文档'
    )
    await KnowledgeDocumentApi.rebuildKnowledgeDocument(row.id!)
    message.success('已提交重建，正在跟踪解析状态…')
    row.parseStatus = 0
    row.chunkCount = 0
    row.charCount = 0
    startPolling(row.id!)
  } catch {}
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await KnowledgeDocumentApi.deleteKnowledgeDocument(id)
    stopPolling(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const params = {
      ...queryParams,
      createTime: queryParams.createTime?.length === 2 ? queryParams.createTime : undefined
    }
    const data = await KnowledgeDocumentApi.exportKnowledgeDocument(params)
    download.excel(data, '知识库文档.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  await loadBases()
  // 从知识库列表「文档管理」跳转过来时带 baseId，定位到对应知识库
  const baseId = route.query.baseId
  if (baseId) queryParams.baseId = Number(baseId)
  await getList()
})
</script>
