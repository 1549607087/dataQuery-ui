<template>
  <ContentWrap :body-style="{ padding: '0', overflow: 'hidden' }">
    <div class="chat-shell">
      <!-- 左：我的会话 -->
      <aside class="chat-side">
        <div class="p-10px">
          <el-button
            type="primary"
            class="w-full"
            v-hasPermi="['data-query:knowledge-chat:query']"
            @click="handleNewSession"
          >
            <Icon icon="ep:plus" class="mr-5px" />新建对话
          </el-button>
          <el-input
            v-model="sessionKeyword"
            placeholder="搜索会话（过滤当前页）"
            clearable
            class="mt-10px"
          >
            <template #prefix><Icon icon="ep:search" /></template>
          </el-input>
        </div>

        <div v-loading="sessionLoading" class="session-list">
          <div
            v-for="item in filteredSessions"
            :key="item.id"
            class="session-item"
            :class="{ 'is-active': item.id === currentSession?.id }"
            @click="handleSelectSession(item)"
          >
            <div class="flex items-center">
              <span class="session-title">{{ item.title || '未命名会话' }}</span>
              <span class="session-ops">
                <el-button link size="small" title="重命名" @click.stop="handleRename(item)">
                  <Icon icon="ep:edit" />
                </el-button>
                <el-button link size="small" title="删除" @click.stop="handleDelete(item)">
                  <Icon icon="ep:delete" />
                </el-button>
              </span>
            </div>
            <div class="session-sub">{{ item.lastQuestion || '—' }}</div>
            <div class="session-time">
              {{ formatTime(item.lastAskTime || item.createTime) }}
            </div>
          </div>
          <el-empty
            v-if="!filteredSessions.length && !sessionLoading"
            description="暂无会话"
            :image-size="56"
          />
        </div>

        <div
          v-if="sessionTotal > sessionQuery.pageSize"
          class="flex items-center justify-between px-10px pb-8px"
        >
          <el-button
            link
            size="small"
            :disabled="sessionQuery.pageNo <= 1"
            @click="handleSessionPage(-1)"
          >
            上一页
          </el-button>
          <span class="text-12px text-gray-400">
            {{ sessionQuery.pageNo }} / {{ sessionPageCount }}
          </span>
          <el-button
            link
            size="small"
            :disabled="sessionQuery.pageNo >= sessionPageCount"
            @click="handleSessionPage(1)"
          >
            下一页
          </el-button>
        </div>
      </aside>

      <!-- 右：对话主体 -->
      <section class="chat-main">
        <header class="chat-head">
          <div class="min-w-0">
            <div class="truncate text-15px font-600">
              {{ currentSession?.title || '新对话' }}
            </div>
            <div class="mt-2px truncate text-12px text-gray-400">
              知识库：{{ currentBaseName }}
              <span v-if="currentSession?.messageCount" class="ml-8px">
                共 {{ currentSession.messageCount }} 条消息
              </span>
              <span class="ml-8px">同步问答（无流式）</span>
            </div>
          </div>
          <div class="flex flex-none items-center">
            <el-tooltip
              :disabled="!baseLocked"
              content="会话已绑定知识库，切换请先「新建对话」"
              placement="bottom"
            >
              <span class="inline-block">
                <el-select
                  v-model="form.baseId"
                  placeholder="选择知识库"
                  filterable
                  :disabled="baseLocked || baseLoading"
                  class="!w-240px"
                >
                  <el-option
                    v-for="base in baseOptions"
                    :key="base.id"
                    :label="`${base.name}（${base.code}）`"
                    :value="base.id"
                  />
                </el-select>
              </span>
            </el-tooltip>
          </div>
        </header>

        <div
          ref="scrollRef"
          v-loading="loadingMessages"
          class="chat-body"
          @scroll="handleChatScroll"
        >
          <el-empty
            v-if="!messages.length && !sending && !loadingMessages"
            :description="emptyText"
            :image-size="76"
          />

          <template v-for="item in messages" :key="item.id">
            <div
              v-if="item.role === 'USER'"
              class="msg-user question-anchor"
              :data-question-id="item.id"
            >
              <div class="msg-user-bubble">{{ item.question }}</div>
            </div>
            <div v-else>
              <KnowledgeChatMessage :message="item" @open-ref="handleOpenRef" />
              <div class="kmsg-ops">
                <el-button link size="small" @click="handleRetrievePreview(item.question || '')">
                  <Icon icon="ep:search" class="mr-2px" />检索调试
                </el-button>
              </div>
            </div>
          </template>

          <!-- 同步链路较长，等待期间给出明确的进行中状态 -->
          <div v-if="sending" class="msg-pending">
            <div class="pending-avatar">AI</div>
            <div class="pending-text">
              <span class="pending-dot"></span>
              {{ sendingTip }}
            </div>
          </div>
        </div>

        <footer class="chat-foot">
          <el-input
            v-model="form.question"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            resize="none"
            placeholder="基于所选知识库提问，例如：差旅报销需要哪些材料？"
            @keydown.ctrl.enter="handleAsk"
          />
          <div class="mt-8px flex items-center justify-between">
            <span class="text-12px text-gray-400">
              Ctrl + Enter 发送 · 同步接口，模型生成期间请稍候
            </span>
            <el-button
              v-hasPermi="['data-query:knowledge-chat:ask']"
              type="primary"
              :loading="sending"
              @click="handleAsk"
            >
              发送
            </el-button>
          </div>
        </footer>

        <!-- 右边缘问题轨道：默认一列短横线，hover 展开问题列表 -->
        <QuestionRail :items="questionNavItems" @select="handleJumpToQuestion" />
      </section>
    </div>

    <!-- 引用原文切片 -->
    <el-drawer v-model="refDrawerVisible" title="引用原文切片" size="560px">
      <div v-loading="refDrawerLoading">
        <template v-if="currentRef">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="引用编号"> [{{ currentRef.refNo }}] </el-descriptions-item>
            <el-descriptions-item label="切片编号">
              {{ currentRef.chunkId }}
            </el-descriptions-item>
            <el-descriptions-item label="文件名" :span="2">
              {{ currentRef.fileName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="切片序号">
              #{{ currentRef.chunkIndex }}
            </el-descriptions-item>
            <el-descriptions-item label="页码">
              {{ currentRef.pageNo != null ? `第 ${currentRef.pageNo} 页` : '无（TXT / MD）' }}
            </el-descriptions-item>
            <el-descriptions-item label="标题路径" :span="2">
              {{ currentRef.headingPath || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="字符区间">
              {{ currentRef.charStart }} ~ {{ currentRef.charEnd }}
            </el-descriptions-item>
            <el-descriptions-item label="向量状态">
              <el-tag
                v-if="currentChunk"
                :type="getChunkSyncStatusTagType(currentChunk.syncStatus)"
                size="small"
              >
                {{ getOptionLabel(CHUNK_SYNC_STATUS_OPTIONS, currentChunk.syncStatus) }}
              </el-tag>
              <span v-else class="text-12px text-gray-400">
                {{ refDrawerLoading ? '加载中' : '未知' }}
              </span>
            </el-descriptions-item>
          </el-descriptions>

          <div class="mt-12px">
            <div class="ref-content-label">
              切片正文
              <span v-if="chunkLoadFailed" class="text-12px text-gray-400">
                （未能加载完整原文，以下为引用摘要，最多 1000 字）
              </span>
            </div>
            <div class="ref-content">{{ currentChunk?.content || currentRef.content }}</div>
          </div>
        </template>
      </div>
    </el-drawer>

    <!-- 检索调试：读取同一条召回链路，不调用大模型、不写会话 -->
    <el-drawer v-model="previewVisible" title="知识库检索调试" size="720px">
      <div v-loading="previewLoading">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="mb-10px"
          title="与知识库问答 S2 使用同一条召回链路"
          description="这里只读取切片与分数，不调用大模型、不写会话，可用来排查召回质量问题。"
        />
        <!-- 版本水位：回退到 version<=N 的最高版本，不传取当前生效版 -->
        <div class="flex items-center gap-8px mb-10px">
          <span class="text-13px text-gray-600 shrink-0">文档版本水位</span>
          <el-input-number
            v-model="previewVersion"
            :min="1"
            :controls="false"
            placeholder="留空=当前生效版"
            class="!w-180px"
          />
          <el-button size="small" @click="handleRetrievePreview(lastPreviewQuestion)">
            <Icon icon="ep:refresh" class="mr-4px" />按此版本重查
          </el-button>
          <span class="text-12px text-gray-400">填 N 则只召回 version ≤ N 的最高版本切片</span>
        </div>
        <template v-if="preview">
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="Rerank 精排">
              <el-tag v-if="preview.rerankApplied" type="success" size="small">
                已执行 · {{ preview.rerankModelCode || '默认模型' }} ·
                {{ preview.rerankLatencyMs ?? 0 }} ms
              </el-tag>
              <el-tooltip
                v-else
                :content="preview.rerankSkipReason || '未执行精排'"
                placement="top"
              >
                <el-tag type="info" size="small">未执行</el-tag>
              </el-tooltip>
            </el-descriptions-item>
            <el-descriptions-item label="召回模式">{{ preview.mode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="是否降级">
              {{ preview.degraded ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="耗时"
              >{{ preview.latencyMs ?? 0 }} ms</el-descriptions-item
            >
            <el-descriptions-item label="向量候选">
              {{ preview.vectorCandidateCount ?? 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="关键词候选">
              {{ preview.keywordCandidateCount ?? 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="最终保留">
              {{ preview.keptCount ?? 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="token 估算">
              {{ preview.tokenEstimate ?? 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="是否截断">
              {{ preview.truncated ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="降级原因" :span="3">
              {{ preview.degradeReason || '-' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="!preview.rerankApplied && preview.rerankSkipReason"
              label="Rerank 跳过原因"
              :span="3"
            >
              {{ preview.rerankSkipReason }}
            </el-descriptions-item>
          </el-descriptions>
          <div class="ref-content-label mt-12px">召回切片</div>
          <el-table :data="preview.items || []" size="small" border max-height="360">
            <el-table-column type="index" label="#" width="48" />
            <el-table-column prop="fileName" label="文档" min-width="140" show-overflow-tooltip />
            <el-table-column prop="chunkIndex" label="切片" width="70" />
            <el-table-column prop="score" label="分数" width="80" />
            <el-table-column
              prop="content"
              label="正文摘要"
              min-width="260"
              show-overflow-tooltip
            />
          </el-table>
          <div class="ref-content-label mt-12px">送入模型的上下文</div>
          <pre class="code-pre">{{ preview.contextText || '-' }}</pre>
        </template>
      </div>
    </el-drawer>
  </ContentWrap>
</template>

<script lang="ts" setup>
import type { AiKnowledgeBaseSimpleRespVO } from '@/api/dataQuery/knowledge'
import type { AiKnowledgeChunkVO } from '@/api/dataQuery/knowledgeChunk'
import type {
  KnowledgeChatMessageRespVO,
  KnowledgeReference,
  KnowledgeSessionRespVO
} from '@/api/dataQuery/knowledgeChat'
import {
  askKnowledgeChat,
  deleteKnowledgeChatSession,
  getKnowledgeChatMessageList,
  getKnowledgeChatSession,
  getKnowledgeChatSessionPage,
  renameKnowledgeChatSession
} from '@/api/dataQuery/knowledgeChat'
import { getAiKnowledgeChunk } from '@/api/dataQuery/knowledgeChunk'
import { getAiKnowledgeBaseSimpleList } from '@/api/dataQuery/knowledge'
import { retrievePreview } from '@/api/dataQuery/chat'
import type { RetrievePreviewRespVO } from '@/api/dataQuery/chat'
import {
  CHUNK_SYNC_STATUS_OPTIONS,
  getChunkSyncStatusTagType,
  getOptionLabel
} from '@/api/dataQuery/constants'
import QuestionRail from '@/views/dataQuery/components/QuestionRail.vue'
import KnowledgeChatMessage from './KnowledgeChatMessage.vue'

defineOptions({ name: 'DataQueryKnowledgeChat' })

const message = useMessage()

const formatTime = (value?: string): string => {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 19)
}

// ==================== 会话列表 ====================
const sessions = ref<KnowledgeSessionRespVO[]>([])
const sessionTotal = ref(0)
const sessionLoading = ref(false)
const sessionQuery = ref({ pageNo: 1, pageSize: 10 })
const sessionKeyword = ref('')
const currentSession = ref<KnowledgeSessionRespVO>()

const sessionPageCount = computed(() =>
  Math.max(1, Math.ceil(sessionTotal.value / sessionQuery.value.pageSize))
)

/**
 * 后端 session/page 目前只把 baseId 传给 service，title 未参与查询，
 * 因此这里对当前页做客户端过滤（placeholder 已标注），不改变服务端总数。
 */
const filteredSessions = computed(() => {
  const keyword = sessionKeyword.value.trim().toLowerCase()
  if (!keyword) return sessions.value
  return sessions.value.filter(
    (item) =>
      (item.title || '').toLowerCase().includes(keyword) ||
      (item.lastQuestion || '').toLowerCase().includes(keyword)
  )
})

// ==================== 知识库 / 表单 ====================
const baseOptions = ref<AiKnowledgeBaseSimpleRespVO[]>([])
const baseLoading = ref(false)
const form = ref<{ baseId?: number; question: string }>({ baseId: undefined, question: '' })

/** 会话一旦创建就绑定知识库，后端会拒绝换库，因此这里直接锁定下拉 */
const baseLocked = computed(() => !!currentSession.value)
const currentBaseName = computed(() => {
  const hit = baseOptions.value.find((item) => item.id === form.value.baseId)
  return hit?.name || (form.value.baseId ? String(form.value.baseId) : '未选择')
})

// ==================== 消息 ====================
const messages = ref<KnowledgeChatMessageRespVO[]>([])
const loadingMessages = ref(false)
const sending = ref(false)
const sendingTip = ref('正在检索知识库并生成回答…')
const scrollRef = ref<HTMLElement>()

const emptyText = computed(() => {
  if (currentSession.value) return '该会话暂无消息'
  if (!form.value.baseId) return '请先在右上角选择知识库'
  return '输入问题开始基于知识库的问答'
})

// ==================== 引用抽屉 ====================
const refDrawerVisible = ref(false)
const refDrawerLoading = ref(false)
const chunkLoadFailed = ref(false)
const currentRef = ref<KnowledgeReference>()
const currentChunk = ref<AiKnowledgeChunkVO>()

// ==================== 检索调试 ====================
const previewVisible = ref(false)
const previewLoading = ref(false)
const preview = ref<RetrievePreviewRespVO>()
/** 文档版本水位：留空取当前生效版；填 N 回退到 version≤N 的最高版本切片 */
const previewVersion = ref<number | undefined>(undefined)
/** 记住上次调试的问题，供「按此版本重查」复用 */
const lastPreviewQuestion = ref('')

const handleRetrievePreview = async (question: string) => {
  if (!form.value.baseId) {
    message.warning('请先选择知识库')
    return
  }
  lastPreviewQuestion.value = question
  previewVisible.value = true
  previewLoading.value = true
  preview.value = undefined
  try {
    preview.value = await retrievePreview({
      baseId: form.value.baseId,
      question,
      version: previewVersion.value || undefined
    })
  } catch {
    // 拦截器已提示
  } finally {
    previewLoading.value = false
  }
}

// ==================== 数据加载 ====================
const loadBases = async () => {
  baseLoading.value = true
  try {
    baseOptions.value = (await getAiKnowledgeBaseSimpleList()) || []
    if (!form.value.baseId && baseOptions.value.length) {
      form.value.baseId = baseOptions.value[0].id
    }
  } finally {
    baseLoading.value = false
  }
}

const loadSessions = async () => {
  sessionLoading.value = true
  try {
    const data = await getKnowledgeChatSessionPage({
      pageNo: sessionQuery.value.pageNo,
      pageSize: sessionQuery.value.pageSize
    })
    sessions.value = data?.list || []
    sessionTotal.value = data?.total || 0
  } finally {
    sessionLoading.value = false
  }
}

const loadMessages = async (sessionId: number) => {
  loadingMessages.value = true
  try {
    messages.value = (await getKnowledgeChatMessageList(sessionId)) || []
    scrollToBottom()
  } finally {
    loadingMessages.value = false
  }
}

const handleSessionPage = async (delta: number) => {
  const next = sessionQuery.value.pageNo + delta
  if (next < 1 || next > sessionPageCount.value) return
  sessionQuery.value.pageNo = next
  await loadSessions()
}

// ==================== 会话操作 ====================
const handleSelectSession = async (item: KnowledgeSessionRespVO) => {
  currentSession.value = item
  form.value.baseId = item.baseId
  activeQuestionId.value = 0
  // 清掉上一会话残留的跳转保护窗口，否则新会话的自动滚动会失效
  locateGuardUntil = 0
  await loadMessages(item.id)
}

const handleNewSession = () => {
  currentSession.value = undefined
  messages.value = []
  form.value.question = ''
  activeQuestionId.value = 0
  locateGuardUntil = 0
}

const handleRename = async (item: KnowledgeSessionRespVO) => {
  let title: string
  try {
    title = await message.prompt(`当前标题：${item.title || '未命名会话'}`, '重命名会话')
  } catch {
    return
  }
  if (!title || !title.trim()) return
  await renameKnowledgeChatSession({ sessionId: item.id, title: title.trim().slice(0, 100) })
  message.success('已重命名')
  if (currentSession.value?.id === item.id) {
    currentSession.value = { ...currentSession.value, title: title.trim().slice(0, 100) }
  }
  await loadSessions()
}

const handleDelete = async (item: KnowledgeSessionRespVO) => {
  try {
    await message.delConfirm(
      `确认删除会话「${item.title || item.sessionNo || item.id}」？其消息将级联删除`
    )
  } catch {
    return
  }
  await deleteKnowledgeChatSession(item.id)
  message.success('已删除')
  if (currentSession.value?.id === item.id) {
    handleNewSession()
  }
  await loadSessions()
}

// ==================== 提问 ====================
const handleAsk = async () => {
  const question = form.value.question.trim()
  const baseId = form.value.baseId
  if (!question) {
    message.warning('请输入问题')
    return
  }
  if (!baseId) {
    message.warning('请先选择知识库')
    return
  }
  if (sending.value) return

  sending.value = true
  sendingTip.value = '正在检索知识库并生成回答…'
  try {
    const resp = await askKnowledgeChat({
      baseId,
      sessionId: currentSession.value?.id,
      question
    })
    form.value.question = ''

    // 首次提问由后端建会话，需要回查详情拿到标题、绑定信息与消息数
    if (!currentSession.value) {
      try {
        const detail = await getKnowledgeChatSession(resp.sessionId)
        currentSession.value = detail
        if (detail?.baseId) form.value.baseId = detail.baseId
      } catch {
        // 详情拉取失败不影响本轮回答展示，至少记住会话编号，避免重复建会话
        // 注意：sessionId 是雪花 ID 字符串，绝不能 Number()，否则精度丢失导致查不到消息
        currentSession.value = { id: resp.sessionId, baseId }
      }
      sessionQuery.value.pageNo = 1
    }

    await Promise.all([loadSessions(), loadMessages(resp.sessionId)])

    if (resp.status && resp.status !== 'DONE') {
      const tipMap: Record<string, string> = {
        CLARIFY: '未召回到相关内容，已给出澄清建议',
        REJECT: '提问命中注入检测，已被拒绝',
        DEGRADED: '模型能力降级，回答可能不完整',
        FAILED: '本轮问答未完成，请稍后重试'
      }
      message.warning(tipMap[resp.status] || '本轮问答未正常完成')
    }
  } catch {
    // 错误提示由请求拦截器统一处理，这里只结束等待态
  } finally {
    sending.value = false
    sendingTip.value = '正在检索知识库并生成回答…'
  }
}

// ==================== 引用 ====================
const handleOpenRef = async (ref: KnowledgeReference) => {
  currentRef.value = ref
  currentChunk.value = undefined
  chunkLoadFailed.value = false
  refDrawerVisible.value = true
  refDrawerLoading.value = true
  try {
    currentChunk.value = await getAiKnowledgeChunk(ref.chunkId)
  } catch {
    // 无切片查询权限或切片已下线时，退回引用自带的截断正文
    chunkLoadFailed.value = true
  } finally {
    refDrawerLoading.value = false
  }
}

// ==================== 滚动与问题轨道 ====================
// 雪花 ID 超过 JS 安全整数范围，后端以字符串下发，统一按原值保存并字符串化比较
const activeQuestionId = ref<string | number>(0)
let locateGuardUntil = 0
let scrollRafId = 0
let highlightTimer: ReturnType<typeof setTimeout> | undefined

/** 知识库问答本期无版本概念，current/total 固定 1，轨道不显示版本徽章 */
const questionNavItems = computed(() =>
  messages.value
    .filter((item) => item.role === 'USER')
    .map((item) => ({
      id: item.id,
      question: item.question || '',
      current: 1,
      total: 1,
      active: String(item.id) === String(activeQuestionId.value)
    }))
)

const scrollToBottom = () => {
  nextTick(() => {
    const el = scrollRef.value
    // 跳转保护窗口内不抢滚动，避免刚定位过去又被拉到底部
    if (!el || Date.now() < locateGuardUntil) return
    el.scrollTop = el.scrollHeight
  })
}

const updateActiveByScroll = () => {
  const el = scrollRef.value
  if (!el || Date.now() < locateGuardUntil) return
  const anchors = Array.from(el.querySelectorAll<HTMLElement>('[data-question-id]'))
  if (!anchors.length) {
    activeQuestionId.value = 0
    return
  }
  // 触底视为正在看最后一问，否则取锚点中心距视口中心最近者
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
    activeQuestionId.value = anchors[anchors.length - 1].dataset.questionId || 0
    return
  }
  const center = el.getBoundingClientRect().top + el.clientHeight / 2
  let bestId: string | number = 0
  let bestDistance = Number.POSITIVE_INFINITY
  anchors.forEach((anchor) => {
    const rect = anchor.getBoundingClientRect()
    const distance = Math.abs(rect.top + rect.height / 2 - center)
    if (distance < bestDistance) {
      bestDistance = distance
      bestId = anchor.dataset.questionId || 0
    }
  })
  activeQuestionId.value = bestId
}

const handleChatScroll = () => {
  if (scrollRafId) return
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = 0
    updateActiveByScroll()
  })
}

const handleJumpToQuestion = async (id: string | number) => {
  const el = scrollRef.value
  if (!el) return
  locateGuardUntil = Date.now() + 800
  activeQuestionId.value = id
  await nextTick()
  const target = el.querySelector<HTMLElement>(`[data-question-id="${id}"]`)
  if (!target) {
    message.warning('该问题不在当前消息中')
    return
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.add('question-anchor--highlight')
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => target.classList.remove('question-anchor--highlight'), 1600)
}

// ==================== 初始化 ====================
onMounted(async () => {
  await loadBases()
  await loadSessions()
})

onBeforeUnmount(() => {
  if (scrollRafId) cancelAnimationFrame(scrollRafId)
  clearTimeout(highlightTimer)
})
</script>

<style scoped>
.chat-shell {
  display: flex;
  height: calc(100vh - 190px);
  min-height: 520px;
}

.chat-side {
  display: flex;
  flex-direction: column;
  flex: none;
  width: 262px;
  background: var(--el-fill-color-blank);
  border-right: 1px solid var(--el-border-color-lighter);
}

.session-list {
  flex: 1;
  padding: 0 8px 8px;
  overflow: auto;
}

.session-item {
  padding: 8px 10px;
  margin-bottom: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
}

.session-item:hover {
  background: var(--el-fill-color-light);
}

.session-item.is-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.session-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-ops {
  display: none;
  flex: none;
}

.session-item:hover .session-ops {
  display: inline-flex;
}

.session-sub {
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-time {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.chat-main {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.chat-body {
  flex: 1;
  min-width: 0;
  padding: 14px 16px;
  overflow: auto;
  background: var(--el-fill-color-lighter);
}

.chat-foot {
  padding: 10px 14px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
}

.msg-user {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.msg-user-bubble {
  max-width: 76%;
  padding: 10px 12px;
  color: var(--el-text-color-primary);
  overflow-wrap: break-word;
  white-space: pre-wrap;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

/* 点击轨道项后短暂高亮，提示定位落点 */
.question-anchor {
  border-radius: 6px;
  transition: background-color 0.6s ease;
}

.question-anchor--highlight {
  background-color: var(--el-color-warning-light-9);
}

.msg-pending {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.pending-avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 12px;
  font-weight: 700;
  color: var(--el-color-white);
  background: linear-gradient(135deg, var(--el-color-primary), #6f7cf7);
  border-radius: 6px;
}

.pending-text {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.pending-dot {
  width: 8px;
  height: 8px;
  background: var(--el-color-primary);
  border-radius: 50%;
  animation: pending-pulse 1s ease-in-out infinite;
}

@keyframes pending-pulse {
  0%,
  100% {
    opacity: 0.3;
  }

  50% {
    opacity: 1;
  }
}

.ref-content-label {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.ref-content {
  padding: 12px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  overflow-wrap: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

/* 回答下方的检索调试入口 */
.kmsg-ops {
  display: flex;
  justify-content: flex-end;
  margin: -4px 0 14px;
}

.code-pre {
  max-height: 240px;
  padding: 10px 12px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}
</style>
