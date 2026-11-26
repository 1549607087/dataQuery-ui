<template>
  <el-dialog v-model="visible" :title="`模板操作 - ${row.name || ''}`" width="900px">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="发布" name="publish">
        <el-form label-width="100px">
          <el-form-item label="变更说明">
            <el-input v-model="changeLog" type="textarea" :rows="3" placeholder="本次发布的变更说明，会写入版本快照" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="actionLoading" @click="handlePublish" v-hasPermi="['data-query:ai-prompt:update']">生成版本快照并发布</el-button>
          </el-form-item>
        </el-form>
        <el-alert type="info" :closable="false" show-icon title="发布会把当前正文与变量定义打成只读版本快照，并切换当前生效版本" />
      </el-tab-pane>

      <el-tab-pane label="复制" name="copy">
        <el-form label-width="100px">
          <el-form-item label="新名称"><el-input v-model="copyForm.name" placeholder="请输入新名称" /></el-form-item>
          <el-form-item label="新编码"><el-input v-model="copyForm.code" placeholder="租户内唯一" /></el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="actionLoading" @click="handleCopy" v-hasPermi="['data-query:ai-prompt:create']">连同变量定义复制</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="校验" name="validate">
        <el-button type="primary" :loading="actionLoading" @click="handleValidate" v-hasPermi="['data-query:ai-prompt:query']">重新校验</el-button>
        <div v-if="validateResult" class="mt-15px">
          <el-tag :type="validateResult.valid ? 'success' : 'danger'" class="mb-10px">
            {{ validateResult.valid ? '正文与变量定义一致' : '存在不一致，请检查' }}
          </el-tag>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="正文占位符">{{ listText(validateResult.contentVariables) }}</el-descriptions-item>
            <el-descriptions-item label="已登记变量">{{ listText(validateResult.declaredVariables) }}</el-descriptions-item>
            <el-descriptions-item label="未登记">{{ listText(validateResult.undeclaredVariables) }}</el-descriptions-item>
            <el-descriptions-item label="未使用">{{ listText(validateResult.unusedVariables) }}</el-descriptions-item>
            <el-descriptions-item label="必填存疑">{{ listText(validateResult.suspiciousVariables) }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-tab-pane>

      <el-tab-pane label="渲染调试" name="render">
        <el-form label-width="100px">
          <el-form-item label="模板正文">
            <el-input v-model="renderContent" type="textarea" :rows="8" placeholder="可编辑后试渲染，不改动库中内容" />
          </el-form-item>
          <el-form-item label="变量值">
            <el-input v-model="renderVariables" type="textarea" :rows="3" placeholder="JSON 对象，如 {&quot;question&quot;:&quot;今年销售额&quot;}" />
          </el-form-item>
          <el-form-item label="严格模式">
            <el-switch v-model="renderStrict" />
            <span class="ml-8px text-12px text-gray-400">开启后缺少必填值时直接报错</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="actionLoading" @click="handleRender" v-hasPermi="['data-query:ai-prompt:query']">试渲染</el-button>
          </el-form-item>
        </el-form>
        <template v-if="renderResult">
          <el-tag :type="renderResult.valid ? 'success' : 'warning'" class="mb-10px">
            {{ renderResult.valid ? '校验通过' : '存在缺失或未登记变量' }}
          </el-tag>
          <span class="ml-10px text-12px text-gray-400">Token 预估：{{ renderResult.tokenEstimate }}</span>
          <el-input v-model="renderResult.content" type="textarea" :rows="8" readonly class="mt-10px" />
          <div class="mt-10px text-12px text-gray-400">
            缺失必填：{{ listText(renderResult.missingVariables) }}；未登记：{{ listText(renderResult.undeclaredVariables) }}
          </div>
        </template>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script lang="ts" setup>
import * as PromptApi from '@/api/dataQuery/prompt/template'

defineOptions({ name: 'DataQueryPromptTemplateActions' })

const message = useMessage()

const visible = ref(false)
const activeTab = ref('publish')
const actionLoading = ref(false)
const row = ref<Partial<PromptApi.AiPromptVO>>({})
const changeLog = ref('')
const copyForm = reactive({ name: '', code: '' })
const validateResult = ref<PromptApi.AiPromptValidateRespVO>()
const renderContent = ref('')
const renderVariables = ref('{}')
const renderStrict = ref(false)
const renderResult = ref<PromptApi.AiPromptRenderRespVO>()

const listText = (arr?: string[]) => (arr && arr.length ? arr.join('、') : '无')

const reset = () => {
  activeTab.value = 'publish'
  changeLog.value = ''
  validateResult.value = undefined
  renderVariables.value = '{}'
  renderStrict.value = false
  renderResult.value = undefined
}

const open = async (data: PromptApi.AiPromptVO) => {
  row.value = data
  visible.value = true
  reset()
  copyForm.name = `${data.name} - 副本`
  copyForm.code = `${data.code}_COPY`
  actionLoading.value = true
  try {
    const detail = await PromptApi.getAiPrompt(data.id!)
    renderContent.value = detail.content || ''
  } finally {
    actionLoading.value = false
  }
  await handleValidate()
}
defineExpose({ open })

const emit = defineEmits(['success'])

const handlePublish = async () => {
  if (!row.value.id) return
  actionLoading.value = true
  try {
    await PromptApi.publishAiPrompt({ id: row.value.id, changeLog: changeLog.value })
    message.success('发布成功')
    changeLog.value = ''
    emit('success')
  } finally {
    actionLoading.value = false
  }
}

const handleCopy = async () => {
  if (!row.value.id) return
  if (!copyForm.name || !copyForm.code) {
    message.warning('请填写新名称与新编码')
    return
  }
  actionLoading.value = true
  try {
    await PromptApi.copyAiPrompt({ id: row.value.id, name: copyForm.name, code: copyForm.code })
    message.success('复制成功')
    emit('success')
  } finally {
    actionLoading.value = false
  }
}

const handleValidate = async () => {
  if (!row.value.id) return
  actionLoading.value = true
  try {
    validateResult.value = await PromptApi.validateAiPrompt(row.value.id)
  } finally {
    actionLoading.value = false
  }
}

const handleRender = async () => {
  let variables: Record<string, string> = {}
  try {
    variables = JSON.parse(renderVariables.value || '{}')
  } catch {
    message.warning('变量值不是合法的 JSON 对象')
    return
  }
  actionLoading.value = true
  try {
    renderResult.value = await PromptApi.renderAiPrompt({
      content: renderContent.value,
      promptId: row.value.id,
      variables,
      strict: renderStrict.value
    })
  } finally {
    actionLoading.value = false
  }
}
</script>
