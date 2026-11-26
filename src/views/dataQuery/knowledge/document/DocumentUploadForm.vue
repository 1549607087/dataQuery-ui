<template>
  <Dialog v-model="dialogVisible" title="上传知识库文档" width="560px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="所属知识库" prop="baseId">
        <el-select
          v-model="form.baseId"
          placeholder="请选择知识库"
          class="!w-full"
          :disabled="baseIdFixed"
        >
          <el-option
            v-for="item in baseOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
        <div class="text-12px text-gray-400 mt-4px">
          仅「正常」状态的知识库可上传；文档归属该知识库
        </div>
      </el-form-item>
      <el-form-item label="文档标识">
        <el-input
          v-model="form.docKey"
          placeholder="选填，缺省取文件名"
          clearable
          class="!w-full"
        />
        <div class="text-12px text-gray-400 mt-4px">
          同一文档多次上传请填相同标识，会形成版本链（如 annual-report）；留空则按文件名自动归组
        </div>
      </el-form-item>
      <el-form-item label="文档文件" prop="file">
        <el-upload
          :auto-upload="false"
          :limit="1"
          :show-file-list="true"
          :file-list="fileList"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
          accept=".txt,.md,.pdf,.doc,.docx"
          class="!w-full"
        >
          <el-button type="primary" :disabled="formLoading">
            <Icon icon="ep:upload" class="mr-5px" />选择文件
          </el-button>
          <template #tip>
            <div class="el-upload__tip">
              支持 TXT / MD / PDF / DOC / DOCX，单个文件不超过 {{ maxSizeMb }} MB。
              上传后异步解析，页面会自动跟踪解析状态。
            </div>
          </template>
        </el-upload>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" @click="dialogVisible = false">取 消</el-button>
      <el-button type="primary" :loading="formLoading" @click="submitForm">开始上传</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import * as KnowledgeDocumentApi from '@/api/dataQuery/knowledgeDocument'
import * as KnowledgeBaseApi from '@/api/dataQuery/knowledge'
import { DOCUMENT_ALLOWED_FILE_TYPES, DOCUMENT_MAX_FILE_SIZE_MB } from '@/api/dataQuery/constants'

defineOptions({ name: 'DataQueryDocumentUploadForm' })

const emit = defineEmits<{
  /** 上传成功，把结果交给父组件启动轮询并提示版本 */
  (e: 'success', documentId: number, duplicated: boolean, version: number): void
}>()

const message = useMessage()
const dialogVisible = ref(false)
const formLoading = ref(false)
const baseIdFixed = ref(false)
const maxSizeMb = DOCUMENT_MAX_FILE_SIZE_MB

const formRef = ref()
const fileList = ref<any[]>([])
const selectedFile = ref<File | undefined>(undefined)
const baseOptions = ref<KnowledgeBaseApi.AiKnowledgeBaseSimpleRespVO[]>([])

const form = reactive({
  baseId: undefined as number | undefined,
  docKey: '' as string
})
const rules = {
  baseId: [{ required: true, message: '请选择知识库', trigger: 'change' }]
}

const loadBases = async () => {
  try {
    baseOptions.value = await KnowledgeBaseApi.getAiKnowledgeBaseSimpleList()
  } catch {
    baseOptions.value = []
  }
}

/** 打开弹窗：可传入固定 baseId（从知识库列表「文档管理」进入时） */
const open = async (baseId?: number) => {
  await loadBases()
  form.baseId = baseId
  form.docKey = ''
  baseIdFixed.value = !!baseId
  fileList.value = []
  selectedFile.value = undefined
  dialogVisible.value = true
}
defineExpose({ open })

const handleFileChange = (file: any) => {
  const raw: File = file.raw || file
  const name = raw.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot < 0 ? '' : name.substring(dot + 1).toUpperCase()
  if (DOCUMENT_ALLOWED_FILE_TYPES.indexOf(ext) < 0) {
    message.error(`不支持的文件类型：${ext || '无扩展名'}（仅 TXT/MD/PDF/DOC/DOCX）`)
    fileList.value = []
    selectedFile.value = undefined
    return
  }
  if (raw.size > DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024) {
    message.error(`文件大小不能超过 ${DOCUMENT_MAX_FILE_SIZE_MB} MB`)
    fileList.value = []
    selectedFile.value = undefined
    return
  }
  if (raw.size === 0) {
    message.error('文件内容不能为空')
    fileList.value = []
    selectedFile.value = undefined
    return
  }
  // 只保留最后一个文件
  fileList.value = [file]
  selectedFile.value = raw
}

const handleExceed = () => {
  message.warning('只能上传一个文件，请先移除已选文件')
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  if (!selectedFile.value) {
    message.warning('请选择文件')
    return
  }
  formLoading.value = true
  try {
    const resp = await KnowledgeDocumentApi.uploadKnowledgeDocument(
      form.baseId!,
      selectedFile.value,
      form.docKey || undefined
    )
    dialogVisible.value = false
    if (resp.duplicated) {
      message.warning(`命中上传幂等：内容未变化，复用 v${resp.version}，未重复入库`)
    }
    emit('success', resp.documentId, resp.duplicated, resp.version)
  } finally {
    formLoading.value = false
  }
}
</script>
