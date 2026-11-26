<template>
  <Dialog v-model="dialogVisible" :title="`版本历史 · ${fileName}`" width="900px">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb-12px"
      title="切换生效版本"
      description="同一文档多次内容变更会形成版本链。切换生效版本只改标记，不重新解析、不消耗 Embedding；之后的新提问将只召回新生效版本的内容，历史版仍保留可随时回滚。"
    />

    <el-table v-loading="loading" :data="versions" stripe size="small">
      <el-table-column label="版本" align="center" width="80">
        <template #default="scope">
          <span class="font-medium">v{{ scope.row.version }}</span>
        </template>
      </el-table-column>
      <el-table-column label="生效状态" align="center" width="110">
        <template #default="scope">
          <el-tag v-if="scope.row.isLatest === 1" type="success" size="small">生效中</el-tag>
          <el-tag v-else type="info" size="small">历史版</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="文件名" min-width="180" show-overflow-tooltip prop="fileName" />
      <el-table-column label="解析状态" align="center" width="110">
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
            {{ getOptionLabel(DOCUMENT_PARSE_STATUS_OPTIONS, scope.row.parseStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="切片数" align="center" prop="chunkCount" width="80" />
      <el-table-column
        label="字符数"
        align="center"
        prop="charCount"
        width="100"
        :formatter="formatCount"
      />
      <el-table-column
        label="上传时间"
        align="center"
        prop="createTime"
        width="160"
        :formatter="dateFormatter"
      />
      <el-table-column label="操作" align="center" width="110" fixed="right">
        <template #default="scope">
          <el-button
            v-if="scope.row.isLatest !== 1"
            link
            type="primary"
            :disabled="scope.row.parseStatus !== 2"
            :title="scope.row.parseStatus !== 2 ? '该版本未解析完成，不能切换' : ''"
            @click="handleSwitch(scope.row)"
            v-hasPermi="['data-query:knowledge-document:update']"
          >
            切换为生效
          </el-button>
          <span v-else class="text-12px text-gray-400">当前版本</span>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="dialogVisible = false">关 闭</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import * as KnowledgeDocumentApi from '@/api/dataQuery/knowledgeDocument'
import {
  DOCUMENT_PARSE_STATUS_OPTIONS,
  getDocumentParseStatusTagType,
  getOptionLabel
} from '@/api/dataQuery/constants'

defineOptions({ name: 'DataQueryDocumentVersionDialog' })

const emit = defineEmits<{
  /** 生效版本已切换，父组件应刷新列表 */
  (e: 'switched'): void
}>()

const message = useMessage()
const dialogVisible = ref(false)
const loading = ref(false)
const versions = ref<KnowledgeDocumentApi.AiKnowledgeDocumentVO[]>([])
const baseId = ref<number | undefined>(undefined)
const docKey = ref('')
const fileName = ref('')

const formatCount = (_row: any, _column: any, cellValue: number): string =>
  cellValue == null ? '-' : String(cellValue).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const loadVersions = async () => {
  if (baseId.value == null || !docKey.value) return
  loading.value = true
  try {
    versions.value = await KnowledgeDocumentApi.getDocumentVersions(baseId.value, docKey.value)
  } finally {
    loading.value = false
  }
}

/** 打开版本历史弹窗 */
const open = async (row: KnowledgeDocumentApi.AiKnowledgeDocumentVO) => {
  baseId.value = row.baseId
  docKey.value = row.docKey
  fileName.value = row.fileName
  dialogVisible.value = true
  await loadVersions()
}
defineExpose({ open })

const handleSwitch = async (row: KnowledgeDocumentApi.AiKnowledgeDocumentVO) => {
  try {
    await message.confirm(
      `确认将「${fileName.value}」切换到 v${row.version}？切换后新提问只召回该版本内容，可随时切回。`,
      '切换生效版本'
    )
    await KnowledgeDocumentApi.switchDocumentVersion({
      baseId: baseId.value!,
      docKey: docKey.value,
      version: row.version
    })
    message.success(`已切换到 v${row.version}`)
    await loadVersions()
    emit('switched')
  } catch {}
}
</script>
