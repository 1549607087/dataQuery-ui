<template>
  <ContentWrap :body-style="{ padding: '0', overflow: 'hidden' }">
    <div class="chat-shell">
      <!-- 左：我的会话 -->
      <aside class="chat-side">
        <div class="p-10px">
          <el-button
            type="primary"
            class="w-full"
            v-hasPermi="['data-query:ai-chat:query']"
            @click="handleNewSession"
          >
            <Icon icon="ep:plus" class="mr-5px" />新建对话
          </el-button>
          <el-input
            v-model="sessionQuery.title"
            placeholder="搜索会话标题"
            clearable
            class="mt-10px"
            @keyup.enter="handleSearchSession"
            @clear="handleSearchSession"
          >
            <template #prefix><Icon icon="ep:search" /></template>
          </el-input>
        </div>

        <div v-loading="sessionLoading" class="session-list">
          <div
            v-for="item in sessions"
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
            <div class="session-time">{{ formatTime(item.lastAskTime || item.createTime) }}</div>
          </div>
          <el-empty
            v-if="!sessions.length && !sessionLoading"
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
          <span class="text-12px text-gray-400"
            >{{ sessionQuery.pageNo }} / {{ sessionPageCount }}</span
          >
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
              数据源：{{ datasourceLabel }}
              <span class="ml-8px">模型：{{ modelLabel }}</span>
              <span class="ml-8px">{{ form.mode === 'stream' ? '流式' : '同步' }}</span>
              <span v-if="currentSession?.messageCount" class="ml-8px">
                共 {{ currentSession?.messageCount }} 条消息
              </span>
            </div>
          </div>
          <div class="flex flex-none items-center">
            <el-select
              v-model="form.datasourceId"
              placeholder="选择数据源"
              filterable
              :disabled="!!currentSession"
              class="!w-240px"
            >
              <el-option
                v-for="ds in datasourceOptions"
                :key="ds.id"
                :label="`${ds.name}（${ds.code}）`"
                :value="ds.id"
              />
            </el-select>
            <el-radio-group v-model="form.mode" size="small" class="ml-8px">
              <el-radio-button value="stream">流式</el-radio-button>
              <el-radio-button value="sync">同步</el-radio-button>
            </el-radio-group>
          </div>
        </header>

        <div
          ref="scrollRef"
          v-loading="loadingMessages"
          class="chat-body"
          @scroll="handleChatScroll"
        >
          <el-empty
            v-if="!renderedMessages.length && !stages.length"
            :image-size="100"
            description="选择数据源后输入问题开始对话；结果按轮次保存，可重新生成、修改问题和赞踩"
          />

          <div
            v-for="(item, idx) in renderedMessages"
            :key="item.raw.id || `local-${idx}`"
            :data-question-id="
              item.raw.role === 'USER' && item.mainUser?.id && item.mainUser.id > 0
                ? item.mainUser.id
                : undefined
            "
            class="question-anchor"
          >
            <div v-if="item.raw.role === 'USER'" class="msg-user">
              <div class="msg-user-bubble">
                <div class="whitespace-pre-wrap text-14px leading-22px">
                  {{ item.raw.question }}
                </div>
                <div class="msg-ops mt-4px flex items-center justify-end gap-4px">
                  <el-tag v-if="item.isHistory" type="info" size="small" class="mr-2px">
                    历史版本（只读）
                  </el-tag>
                  <el-tooltip content="复制问题" placement="top">
                    <el-button link size="small" @click="copyText(item.raw.question)">
                      <Icon icon="ep:document-copy" />
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-if="!item.isHistory && item.mainUser?.id && item.mainUser.id > 0"
                    content="修改问题"
                    placement="top"
                  >
                    <el-button link size="small" @click="handleEdit(item.mainUser)">
                      <Icon icon="ep:edit-pen" />
                    </el-button>
                  </el-tooltip>
                  <!-- DeepSeek 式问题版本翻页器：‹ 2/3 › -->
                  <div v-if="item.pager" class="version-pager">
                    <el-button
                      link
                      size="small"
                      class="version-pager-arrow"
                      :disabled="item.pager.current <= 1 || item.pager.loading"
                      title="上一版问题"
                      @click="handleVersionSwitch(item.mainUser!, item.pager!, -1)"
                    >
                      <Icon icon="ep:arrow-left" />
                    </el-button>
                    <span class="version-pager-text">
                      {{ item.pager.current }}/{{ item.pager.total }}
                    </span>
                    <el-button
                      link
                      size="small"
                      class="version-pager-arrow"
                      :disabled="item.pager.current >= item.pager.total || item.pager.loading"
                      title="下一版问题"
                      @click="handleVersionSwitch(item.mainUser!, item.pager!, 1)"
                    >
                      <Icon icon="ep:arrow-right" />
                    </el-button>
                    <el-button
                      v-if="item.pager.current < item.pager.total"
                      link
                      size="small"
                      class="version-pager-latest"
                      title="回到最新版（主链）"
                      @click="jumpToLatestVersion(item.pager.userMsgId)"
                    >
                      回到最新
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="msg-assistant">
              <el-alert
                v-if="item.answerMissing"
                type="info"
                :closable="false"
                show-icon
                class="mb-8px"
                title="该历史问题版本暂无对应回答"
                description="已隐藏主链回答以避免问题与回答版本错配；切回最新版问题可查看主链回答。"
              />
              <ChatResultCard
                v-else
                :response="item.answer"
                :message-id="item.raw.id"
                :rating="item.raw.rating"
                :version="item.raw.version"
                :active="item.raw.active"
                :readonly="item.isHistory"
                @regenerate="handleRegenerate"
                @rate="handleRate"
                @versions="handleVersions"
              />
            </div>
          </div>

          <div v-if="stages.length" class="stage-box">
            <el-progress :percentage="progress" :status="progressStatus" :stroke-width="8" />
            <div class="stage-list">
              <div v-for="(stage, idx) in stages" :key="idx" class="stage-row">
                <el-tag :type="getStageStateTagType(stage.state)" size="small">
                  {{ getOptionLabel(CHAT_STAGE_OPTIONS, stage.stage) }}
                </el-tag>
                <span class="ml-8px text-12px">{{ stage.message || '-' }}</span>
                <span class="ml-8px text-11px text-gray-400">{{ stage.latencyMs ?? 0 }} ms</span>
              </div>
            </div>
          </div>
        </div>

        <footer class="chat-foot">
          <div class="mb-8px flex flex-wrap items-center justify-between gap-8px">
            <div class="flex items-center">
              <span class="mr-6px text-12px text-gray-400">模型</span>
              <el-select
                v-model="form.modelConfigId"
                :placeholder="modelPlaceholder"
                :disabled="!modelOptions.length || sending"
                :loading="modelLoading"
                clearable
                filterable
                class="!w-260px"
              >
                <el-option
                  v-for="option in modelOptions"
                  :key="option.modelConfigId"
                  :label="modelOptionLabel(option)"
                  :value="option.modelConfigId"
                >
                  <div class="flex items-center justify-between gap-8px">
                    <span class="truncate">{{ option.name }}</span>
                    <span class="text-11px text-gray-400">{{ option.modelId }}</span>
                  </div>
                </el-option>
              </el-select>
              <el-tag v-if="form.modelConfigId" type="primary" size="small" class="ml-8px">
                本轮指定
              </el-tag>
              <el-tag v-else-if="defaultModelName" type="info" size="small" class="ml-8px">
                场景默认
              </el-tag>
              <el-tooltip
                v-if="modelOptions.length"
                content="只列出当前场景可路由的模型；指定后仅本轮生效，重新生成 / 修改问题也会带上当前选择"
                placement="top"
              >
                <Icon icon="ep:info-filled" class="ml-6px cursor-pointer text-gray-400" />
              </el-tooltip>
              <el-tooltip
                v-else
                content="该场景没有配置可选模型（或候选集为空），只能使用服务端默认路由；请在「模型场景绑定」中配置候选集"
                placement="top"
              >
                <Icon
                  icon="ep:warning-filled"
                  class="ml-6px cursor-pointer text-[var(--el-color-warning)]"
                />
              </el-tooltip>
            </div>
            <span class="text-12px text-gray-400"
              >Ctrl + Enter 发送；重新生成 / 修改问题走同步接口</span
            >
          </div>
          <el-input
            v-model="form.question"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            :placeholder="questionPlaceholder"
            resize="none"
            @keydown.enter.ctrl.prevent="handleSend"
          />
          <div class="mt-8px flex items-center justify-between">
            <span class="text-12px text-gray-400">
              Schema 白名单与租户由服务端固化；所选模型不在候选集内会被服务端拒绝
            </span>
            <div>
              <el-button v-if="sending && form.mode === 'stream'" @click="handleStop">
                <Icon icon="ep:video-pause" class="mr-5px" />停止接收
              </el-button>
              <el-button
                type="primary"
                :loading="sending"
                :disabled="!canSend"
                v-hasPermi="['data-query:ai-chat:query']"
                @click="handleSend"
              >
                <Icon icon="ep:promotion" class="mr-5px" />发送
              </el-button>
            </div>
          </div>
        </footer>

        <!-- 右边缘轨道式问题导航：覆盖在对话区上方，不占布局宽度 -->
        <QuestionRail :items="questionNavItems" @select="handleJumpToQuestion" />
      </section>
    </div>
  </ContentWrap>

  <el-dialog v-model="versionsVisible" title="回答历史版本" width="920px" top="6vh">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb-10px"
      title="可查看并切换历史版本"
      description="这里展示同一问题下的回答版本。点击左侧任一无「主链」标记的版本可预览，再点「切到该版本」即可把它激活为当前分支；旧分支会完整保留，随时可再切回，不会重跑链路。"
    />
    <div v-loading="versionsLoading" class="flex">
      <div class="mr-12px w-220px flex-none">
        <div
          v-for="(item, idx) in versions"
          :key="item.id"
          class="version-item"
          :class="{ 'is-active': idx === versionIndex }"
          @click="versionIndex = idx"
        >
          <div class="flex items-center">
            <span class="mr-6px text-13px font-600">v{{ item.version }}</span>
            <el-tag :type="getChatStatusTagType(item.status)" size="small">
              {{ getOptionLabel(CHAT_STATUS_OPTIONS, item.status) }}
            </el-tag>
            <el-tag v-if="item.active" type="success" size="small" class="ml-4px">主链</el-tag>
          </div>
          <div class="mt-2px text-11px text-gray-400">{{ formatTime(item.createTime) }}</div>
        </div>
        <el-empty
          v-if="!versions.length && !versionsLoading"
          description="无历史版本"
          :image-size="50"
        />
      </div>
      <div class="min-w-0 flex-1">
        <ChatResultCard v-if="currentVersionAnswer" :response="currentVersionAnswer" />
        <el-empty v-else-if="!versionsLoading" description="请选择版本" :image-size="60" />
        <div
          v-if="selectedVersion && !selectedVersion.active && currentSession?.id"
          class="mt-12px flex justify-end"
        >
          <el-button type="primary" :loading="switchingVersion" @click="handleSwitchVersion">
            切到该版本
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script lang="ts" setup>
import {
  askChat,
  askChatStream,
  deleteChatSession,
  editChat,
  getChatMessageList,
  getChatMessageVersions,
  getChatModelOptions,
  getChatQuestionVersions,
  getChatSessionPage,
  messageToAnswerView,
  rateChatMessage,
  regenerateChat,
  renameChatSession,
  switchChatVersion,
  type AiChatAskReqVO,
  type AiChatAskRespVO,
  type AiChatModelOption,
  type AiQuerySession,
  type ChatAnswerView,
  type ChatMessageRespVO,
  type ChatStageEvent
} from '@/api/dataQuery/aichat'
import { getAiDatasourceSimpleList } from '@/api/dataQuery/datasource'
import type { AiDatasourceSimpleRespVO } from '@/api/dataQuery/datasource'
import {
  CHAT_STAGE_OPTIONS,
  CHAT_STATUS_OPTIONS,
  getChatStatusTagType,
  getOptionLabel,
  getStageStateTagType
} from '@/api/dataQuery/constants'
import ChatResultCard from './ChatResultCard.vue'
import QuestionRail from '@/views/dataQuery/components/QuestionRail.vue'

defineOptions({ name: 'DataQueryAiChat' })

const message = useMessage()

const questionPlaceholder =
  '例如：查询本月销售额前 10 的商品及其环比。支持业务口径描述，不需要写表名或 SQL（上限 500 字）'

// ---------- 数据源 ----------
const datasourceOptions = ref<AiDatasourceSimpleRespVO[]>([])
const loadDatasourceList = async () => {
  try {
    datasourceOptions.value = await getAiDatasourceSimpleList()
  } catch {
    // 下拉加载失败不阻塞页面
  }
}

// ---------- 会话 ----------
const sessions = ref<AiQuerySession[]>([])
const sessionTotal = ref(0)
const sessionLoading = ref(false)
const sessionQuery = reactive({ pageNo: 1, pageSize: 15, title: '' })
const currentSession = ref<AiQuerySession>()

const loadSessions = async () => {
  sessionLoading.value = true
  try {
    const data = await getChatSessionPage({ ...sessionQuery })
    sessions.value = data?.list || []
    sessionTotal.value = data?.total || 0
  } catch {
    // 提示由 axios 拦截器统一弹出；保留上次列表，不打断当前对话
  } finally {
    sessionLoading.value = false
  }
}

const handleSearchSession = () => {
  sessionQuery.pageNo = 1
  loadSessions()
}

const sessionPageCount = computed(() =>
  Math.max(1, Math.ceil(sessionTotal.value / sessionQuery.pageSize))
)

const handleSessionPage = (delta: number) => {
  const next = sessionQuery.pageNo + delta
  if (next < 1 || next > sessionPageCount.value) return
  sessionQuery.pageNo = next
  loadSessions()
}

// ---------- 消息 ----------
const messages = ref<ChatMessageRespVO[]>([])
const loadingMessages = ref(false)
const scrollRef = ref<HTMLElement>()

// ---------- 问题版本翻页（DeepSeek 式 ‹ 2/3 ›） ----------
interface QuestionVersionPanel {
  /** 该轮全部消息：多个版本的 USER + 各自的 ASSISTANT（含已退出主链的） */
  list: ChatMessageRespVO[]
  /** 当前查看的问题版本（1 起，与 USER.version 一致） */
  current: number
  /** 问题版本总数 */
  total: number
  loading: boolean
}

/** key = 主链 USER 消息 id；只在用户首次点击翻页器时懒加载 */
const questionPanels = reactive<Record<number, QuestionVersionPanel>>({})

const loadQuestionPanel = async (userMsg: ChatMessageRespVO, sessionId: number) => {
  if (!userMsg.id || questionPanels[userMsg.id]) return
  questionPanels[userMsg.id] = { list: [], current: userMsg.version ?? 1, total: 1, loading: true }
  try {
    const list = (await getChatQuestionVersions(sessionId, userMsg.seq ?? 0)) || []
    const versions = list.filter((m) => m.role === 'USER')
    questionPanels[userMsg.id] = {
      list,
      current: userMsg.version ?? 1,
      total: Math.max(versions.length, 1),
      loading: false
    }
  } catch {
    // 加载失败就撤掉面板，翻页器自动隐藏，回到普通消息展示
    delete questionPanels[userMsg.id]
  }
}

const switchQuestionVersion = (userMsgId: number, delta: number) => {
  const panel = questionPanels[userMsgId]
  if (!panel || panel.loading) return
  const next = panel.current + delta
  if (next < 1 || next > panel.total) return
  panel.current = next
}

/** 一键回到主链最新版（版本号最大 = 主链版本），避免连点右箭头 */
const jumpToLatestVersion = (userMsgId: number) => {
  const panel = questionPanels[userMsgId]
  if (!panel || panel.loading) return
  panel.current = panel.total
}

/** 点击翻页箭头：首次点击才请求历史版本，加载完成后再执行切换 */
const handleVersionSwitch = async (
  userMsg: ChatMessageRespVO,
  pager: { userMsgId: number; loading: boolean },
  delta: number
) => {
  if (pager.loading) return
  if (!questionPanels[pager.userMsgId]) {
    const sessionId = currentSession.value?.id
    if (!sessionId) return
    await loadQuestionPanel(userMsg, sessionId)
  }
  switchQuestionVersion(pager.userMsgId, delta)
}

/** 解析当前查看的问题版本对应的 USER / ASSISTANT；未加载翻页时原样返回 */
const resolveQuestionView = (mainUser: ChatMessageRespVO) => {
  const panel = mainUser.id ? questionPanels[mainUser.id] : undefined
  if (!panel || !panel.list.length) {
    return {
      user: mainUser,
      assistant: undefined as ChatMessageRespVO | undefined,
      isHistory: false
    }
  }
  const versions = panel.list
    .filter((m) => m.role === 'USER')
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1))
  const target = versions.find((u) => Number(u.version) === panel.current) || mainUser
  const targetId = Number(target.id)
  // parentId 可能数字/字符串混用，统一转数值比较；按 version 升序后取最高版本回答
  const candidates = panel.list
    .filter((m) => m.role === 'ASSISTANT' && Number(m.parentId) === targetId)
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1))
  // 优先取该版本下主链的回答；旧版本回答 is_active=0，取 version 最高的一条
  const assistant =
    candidates.find((m) => m.active) || candidates[candidates.length - 1] || undefined
  return { user: target, assistant, isHistory: target.id !== mainUser.id }
}

/**
 * 渲染时把「问题版本」与翻页状态一并算好：
 * - 修改问题会让 USER.version 递增、旧 USER 退出主链，只有全量接口才有历史版本；
 * - ASSISTANT.version 在修改后从 1 重新计数，故问题版本只能取所属 USER 的 version；
 * - 切换到历史版本时，USER 气泡与紧随其后的 ASSISTANT 卡片都要换成对应版本的内容。
 */
const renderedMessages = computed(() => {
  // 主链 USER id -> 当前查看版本的内容
  const views = new Map<number, ReturnType<typeof resolveQuestionView>>()
  for (const raw of messages.value) {
    if (raw.role === 'USER' && raw.id && questionPanels[raw.id]) {
      views.set(raw.id, resolveQuestionView(raw))
    }
  }

  let questionVersion = 1
  return messages.value.map((raw) => {
    if (raw.role === 'USER') {
      const view = raw.id ? views.get(raw.id) : undefined
      const shown = view?.user || raw
      questionVersion = shown.version ?? 1
      const panel = raw.id ? questionPanels[raw.id] : undefined
      // 版本总数取 panel.total 或主链 raw.version（=最新版本号），不能用 shown.version：
      // 切到历史版本后 shown.version 会变小（如 v1），会导致翻页器消失、无法切回最新版。
      const versionCount = panel?.total ?? raw.version ?? 1
      return {
        raw: shown,
        answer: messageToAnswerView(shown),
        questionVersion,
        mainUser: raw,
        isHistory: view?.isHistory ?? false,
        answerMissing: false,
        pager:
          versionCount > 1 && raw.id
            ? {
                userMsgId: raw.id,
                current: panel?.current ?? versionCount,
                total: versionCount,
                loading: panel?.loading ?? false
              }
            : undefined
      }
    }
    // ASSISTANT 跟随其父 USER 的版本切换；保留主链消息 id 供赞踩等写操作使用
    const view = raw.parentId ? views.get(raw.parentId) : undefined
    const isHistory = view?.isHistory ?? false
    const versionedAssistant = view ? view.assistant : undefined
    // 历史版本下绝不能用 || raw 回退到主链回答，否则会出现「v1 问题配 v2 回答」的错配；
    // 匹配不到该版本回答时置 answerMissing，由模板渲染空态。
    const answerMissing = !!view && isHistory && !versionedAssistant
    const shown = answerMissing ? undefined : (versionedAssistant ?? raw)
    return {
      raw: shown ?? raw,
      answer: shown ? messageToAnswerView(shown) : ({} as ChatAnswerView),
      questionVersion,
      mainUser: undefined as ChatMessageRespVO | undefined,
      isHistory,
      answerMissing,
      pager: undefined as
        | { userMsgId: number; current: number; total: number; loading: boolean }
        | undefined
    }
  })
})

// ---------- 问题快速跳转（右侧常驻栏） ----------
interface QuestionNavItem {
  id: number
  question: string
  current: number
  total: number
  active: boolean
}

/** 当前高亮的问题（主链 USER id）；随滚动或点击更新。雪花 ID 为字符串，按原值保存 */
const activeQuestionId = ref<number | string>()
/** 点击跳转后的保护截止时间戳：期间 scrollToBottom 不抢回底部 */
let locateGuardUntil = 0
let scrollRafId = 0

/** 问题导航数据源：与对话区同源，徽章天然一致 */
const questionNavItems = computed<QuestionNavItem[]>(() =>
  renderedMessages.value
    .filter((m) => m.raw.role === 'USER' && !!m.mainUser?.id && m.mainUser.id > 0)
    .map((m) => ({
      id: m.mainUser!.id!,
      question: m.raw.question || m.mainUser!.question || '',
      current: m.pager?.current ?? m.questionVersion ?? 1,
      total: m.pager?.total ?? m.questionVersion ?? 1,
      active: String(activeQuestionId.value) === String(m.mainUser!.id)
    }))
)

/** 滚动定位：触底选最后一条，否则取锚点中心距视口中心最近者；rAF 节流 */
const updateActiveByScroll = () => {
  const el = scrollRef.value
  if (!el) return
  const anchors = Array.from(el.querySelectorAll<HTMLElement>('[data-question-id]'))
  if (!anchors.length) {
    activeQuestionId.value = undefined
    return
  }
  if (el.scrollHeight - el.scrollTop - el.clientHeight <= 4) {
    activeQuestionId.value = anchors[anchors.length - 1].dataset.questionId
    return
  }
  const containerRect = el.getBoundingClientRect()
  const containerCenter = containerRect.top + containerRect.height / 2
  let closest = anchors[0]
  let minDist = Infinity
  for (const anchor of anchors) {
    const rect = anchor.getBoundingClientRect()
    const dist = Math.abs(rect.top + rect.height / 2 - containerCenter)
    if (dist < minDist) {
      minDist = dist
      closest = anchor
    }
  }
  activeQuestionId.value = closest.dataset.questionId
}

const handleChatScroll = () => {
  if (scrollRafId) return
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = 0
    // 保护窗口内不按滚动改写 active，避免平滑滚动中途把目标项抢走
    if (Date.now() < locateGuardUntil) return
    updateActiveByScroll()
  })
}

/** 点击右侧问题：立即高亮 → 幂等懒加载版本面板 → 平滑滚动 + 短暂高亮 */
const handleJumpToQuestion = async (mainUserId: number | string) => {
  const mainUser = messages.value.find((m) => m.id === mainUserId && m.role === 'USER')
  if (!mainUser) return
  const sessionId = currentSession.value?.id

  activeQuestionId.value = mainUserId
  locateGuardUntil = Date.now() + 1200

  // 幂等懒加载：已加载则跳过，保证翻页器停在徽章所示版本（不被重置到最新）
  if (sessionId && !questionPanels[mainUserId]) {
    await loadQuestionPanel(mainUser, sessionId)
  }

  await nextTick()
  const target = scrollRef.value?.querySelector<HTMLElement>(`[data-question-id="${mainUserId}"]`)
  if (!target) return

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.add('question-anchor--highlight')
  setTimeout(() => {
    target.classList.remove('question-anchor--highlight')
  }, 1600)
}

onBeforeUnmount(() => {
  if (scrollRafId) cancelAnimationFrame(scrollRafId)
})

const scrollToBottom = () => {
  nextTick(() => {
    // 点击问题跳转的保护窗口内不抢回底部，否则会覆盖平滑滚动的定位结果
    if (Date.now() < locateGuardUntil) return
    const el = scrollRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

/** 后端消息落库失败只记日志（不影响 ask 结果），这里用实时响应兜底，避免用户看不到结果 */
const appendLocalTurn = (question: string, resp: AiChatAskRespVO) => {
  const base = messages.value.length
  messages.value.push(
    {
      id: resp.userMessageId ?? 0,
      role: 'USER',
      question,
      seq: base + 1,
      active: true,
      version: 1
    },
    {
      id: resp.assistantMessageId ?? 0,
      role: 'ASSISTANT',
      seq: base + 2,
      active: true,
      version: 1,
      status: resp.status,
      question,
      answer: resp.summary,
      generatedSql: resp.generatedSql,
      executedSql: resp.executedSql,
      result: resp.result,
      chartSpec: resp.chartSpec,
      explain: resp.explain,
      errorCode:
        resp.errorCode === undefined || resp.errorCode === null
          ? undefined
          : String(resp.errorCode),
      errorMsg: resp.errorMsg,
      rating: 0,
      traceId: resp.traceId,
      auditId: resp.result?.auditId
    }
  )
  scrollToBottom()
}

const loadMessages = async (sessionId: number, fallback?: AiChatAskRespVO, question?: string) => {
  loadingMessages.value = true
  try {
    messages.value = (await getChatMessageList(sessionId)) || []
    // 优先按助手消息编号判断是否已落库，其次才用 traceId（落库失败时两者都对不上）
    const landed = fallback
      ? messages.value.some(
          (m) =>
            (fallback.assistantMessageId != null && m.id === fallback.assistantMessageId) ||
            (!!fallback.traceId && m.traceId === fallback.traceId)
        )
      : true
    if (fallback && !landed) {
      appendLocalTurn(question || fallback.question || '', fallback)
    }
  } catch {
    // 提示由 axios 拦截器统一弹出；这里不再抛出，避免把「刷新消息失败」误报成「问数失败」
  } finally {
    loadingMessages.value = false
    scrollToBottom()
  }
}

// ---------- 发送 ----------
const form = reactive({
  datasourceId: undefined as number | undefined,
  question: '',
  /** 对话页选择的模型配置编号；undefined 表示按场景绑定的路由策略自动选择 */
  modelConfigId: undefined as number | undefined,
  mode: 'stream' as 'stream' | 'sync'
})

// ---------- 选择模型 ----------
const modelOptions = ref<AiChatModelOption[]>([])
const modelLoading = ref(false)

const loadModelOptions = async () => {
  modelLoading.value = true
  try {
    modelOptions.value = (await getChatModelOptions()) || []
  } catch {
    // 场景未配置时后端返回空数组；真正的失败（网络 / 权限）由拦截器提示，这里保留空列表不阻塞问数
    modelOptions.value = []
  } finally {
    modelLoading.value = false
  }
}

const defaultModelName = computed(
  () => modelOptions.value.find((item) => item.defaultModel)?.name || ''
)
const modelLabel = computed(() => {
  const selected = modelOptions.value.find((item) => item.modelConfigId === form.modelConfigId)
  return (
    selected?.name || (defaultModelName.value ? `${defaultModelName.value}（默认）` : '场景默认')
  )
})
const modelPlaceholder = computed(() =>
  modelOptions.value.length ? '默认模型（自动路由）' : '无可选模型，使用场景默认'
)
const modelOptionLabel = (option: AiChatModelOption) =>
  `${option.name}（${option.modelId}）${option.defaultModel ? ' · 默认' : ''}`

const sending = ref(false)
const stopped = ref(false)
const stages = ref<ChatStageEvent[]>([])
const progress = ref(0)
let abortController: AbortController | undefined

const datasourceLabel = computed(() => {
  const id = currentSession.value?.datasourceId || form.datasourceId
  if (!id) return '未选择'
  const hit = datasourceOptions.value.find((ds) => ds.id === id)
  return hit ? `${hit.name}（${hit.code}）` : `#${id}`
})

const canSend = computed(
  () =>
    !!form.question.trim() &&
    !!(currentSession.value?.datasourceId || form.datasourceId) &&
    !sending.value
)

const progressStatus = computed<'success' | 'exception' | ''>(() => {
  const last = stages.value[stages.value.length - 1]
  if (!last) return ''
  if (last.stage === 'error' || last.state === 'ERROR') return 'exception'
  if (last.stage === 'done') return 'success'
  return ''
})

const handleStop = () => {
  stopped.value = true
  abortController?.abort()
}

const afterAnswer = async (resp: AiChatAskRespVO, question: string) => {
  if (!resp.sessionId) {
    // S0 前置失败：没有会话上下文，消息不会落库，直接本地展示
    appendLocalTurn(question, resp)
    return
  }
  const isNew = !currentSession.value || currentSession.value.id !== resp.sessionId
  if (isNew) {
    await loadSessions()
    currentSession.value = sessions.value.find((s) => s.id === resp.sessionId) || {
      id: resp.sessionId,
      title: question.slice(0, 30),
      datasourceId: form.datasourceId
    }
  }
  await loadMessages(resp.sessionId, resp, question)
  // 标题 / 最后问题 / 消息数会变化，静默刷新列表
  void loadSessions()
}

const sendSync = async (req: AiChatAskReqVO, question: string) => {
  let resp: AiChatAskRespVO
  try {
    resp = await askChat(req)
  } catch (e: any) {
    form.question = question
    message.error(e?.message || '问数失败，请检查后端服务与网络')
    return
  }
  await afterAnswer(resp, question)
}

const sendStream = async (req: AiChatAskReqVO, question: string) => {
  abortController = new AbortController()
  // 用对象承接回调里的赋值，避免 TS 把变量窄化成 undefined
  const state: { resp?: AiChatAskRespVO; failure: string } = { failure: '' }

  try {
    await askChatStream(
      req,
      {
        onStage: (event) => {
          stages.value.push(event)
          if (typeof event.progress === 'number') {
            progress.value = Math.max(progress.value, Math.min(event.progress, 100))
          }
          const payloadResponse = event.payload?.response as AiChatAskRespVO | undefined
          if ((event.stage === 'done' || event.stage === 'error') && payloadResponse) {
            state.resp = payloadResponse
            return
          }
          // SSE 未启用 / 线程池满等前置失败只带 error 事件，没有 response
          if (event.stage === 'error') {
            state.failure = event.message || '流式问数失败'
          }
        },
        onError: (msg) => {
          state.failure = msg
        },
        onClose: () => {
          // 正常收尾：结果已在 done 事件里处理
        }
      },
      abortController.signal
    )
  } catch (e: any) {
    if (stopped.value) {
      message.info('已停止接收，服务端仍会跑完本轮并写入审计与消息')
      return
    }
    state.failure = state.failure || e?.message || '流式问数连接异常'
  }

  if (stopped.value) return
  if (!state.resp) {
    form.question = question
    message.error(state.failure || '连接已结束但未收到结果，请查看服务端日志或改用同步模式')
    return
  }
  await afterAnswer(state.resp, question)
}

const handleSend = async () => {
  if (sending.value) return
  const question = form.question.trim()
  if (!question) {
    message.warning('请输入问题')
    return
  }
  if (question.length > 500) {
    message.warning('问题长度不能超过 500 字符')
    return
  }
  const datasourceId = currentSession.value?.datasourceId || form.datasourceId
  if (!datasourceId) {
    message.warning('请选择数据源')
    return
  }

  const req: AiChatAskReqVO = {
    question,
    datasourceId,
    sessionId: currentSession.value?.id,
    sceneCode: currentSession.value?.sceneCode || undefined,
    // 清空下拉时 Element Plus 会给出空串，这里统一收敛成 undefined（= 按场景默认路由）
    modelConfigId: form.modelConfigId || undefined
  }

  sending.value = true
  stopped.value = false
  stages.value = []
  progress.value = 0
  form.question = ''

  try {
    if (form.mode === 'stream') {
      await sendStream(req, question)
    } else {
      await sendSync(req, question)
    }
  } finally {
    sending.value = false
    abortController = undefined
  }
}

// ---------- 会话操作 ----------
const handleNewSession = () => {
  currentSession.value = undefined
  messages.value = []
  stages.value = []
  progress.value = 0
  form.question = ''
  activeQuestionId.value = undefined
  locateGuardUntil = 0
}

const handleSelectSession = async (item: AiQuerySession) => {
  if (sending.value) {
    message.warning('请等待当前问数结束或先停止接收')
    return
  }
  currentSession.value = item
  if (item.datasourceId) {
    form.datasourceId = item.datasourceId
  }
  stages.value = []
  progress.value = 0
  locateGuardUntil = 0
  activeQuestionId.value = undefined
  if (item.id) {
    await loadMessages(item.id)
    // 默认定位到最后一条问题（与 loadMessages 默认滚到底一致）
    const last = questionNavItems.value[questionNavItems.value.length - 1]
    activeQuestionId.value = last?.id
  }
}

const handleRename = async (item: AiQuerySession) => {
  if (!item.id) return
  let input: any
  try {
    input = await message.prompt(`当前标题：${item.title || '未命名会话'}`, '重命名会话')
  } catch {
    return
  }
  const title = (input?.value || '').trim()
  if (!title) {
    message.warning('标题不能为空')
    return
  }
  if (title.length > 100) {
    message.warning('标题不能超过 100 个字符')
    return
  }
  await renameChatSession({ sessionId: item.id, title })
  message.success('已重命名')
  await loadSessions()
  if (currentSession.value?.id === item.id) {
    currentSession.value = { ...currentSession.value, title }
  }
}

const handleDelete = async (item: AiQuerySession) => {
  if (!item.id) return
  try {
    await message.delConfirm(
      `确认删除会话「${item.title || '未命名会话'}」？会话下的消息会一并删除。`
    )
  } catch {
    return
  }
  await deleteChatSession(item.id)
  message.success('已删除')
  if (currentSession.value?.id === item.id) {
    handleNewSession()
  }
  await loadSessions()
}

// ---------- 重新生成 / 修改问题 / 赞踩 ----------
const handleRegenerate = async (messageId: number) => {
  if (sending.value) return
  sending.value = true
  try {
    const resp = await regenerateChat({
      messageId,
      datasourceId: currentSession.value?.datasourceId,
      modelConfigId: form.modelConfigId || undefined
    })
    if (resp.sessionId) {
      await loadMessages(resp.sessionId)
    }
    message.success('已重新生成，旧版本保留在历史版本中')
    void loadSessions()
  } catch {
    // 失败提示由 axios 拦截器统一弹出（如 079 非主链不可重新生成）
  } finally {
    sending.value = false
  }
}

const handleEdit = async (raw: ChatMessageRespVO) => {
  if (!raw.id || raw.id <= 0 || sending.value) return
  let input: any
  try {
    input = await message.prompt(
      `原问题：${raw.question || ''}\n\n请输入修改后的新问题；提交后会生成问题 v${(raw.version ?? 1) + 1} 并作为当前分支继续对话，` +
        `原问题及其回答会完整保留为历史分支，之后可随时在历史版本中切回。`,
      '修改问题'
    )
  } catch {
    return
  }
  const question = (input?.value || '').trim()
  if (!question) {
    message.warning('问题不能为空')
    return
  }
  if (question.length > 500) {
    message.warning('问题长度不能超过 500 字符')
    return
  }
  sending.value = true
  try {
    const resp = await editChat({
      messageId: raw.id,
      question,
      datasourceId: currentSession.value?.datasourceId,
      modelConfigId: form.modelConfigId || undefined
    })
    if (resp.sessionId) {
      await loadMessages(resp.sessionId)
    }
    message.success(
      `问题已修改，已切换到 v${(raw.version ?? 1) + 1} 并重新生成；原问题分支已保留，可在历史版本中切回`
    )
    void loadSessions()
  } catch {
    // 失败提示由 axios 拦截器统一弹出（如 078 角色不符、077 消息不存在）
  } finally {
    sending.value = false
  }
}

/** 卡片渲染的可能是版本面板副本，赞踩状态要同时写回主链与所有面板副本 */
const applyRating = (messageId: number, rating: number) => {
  for (const item of messages.value) {
    if (item.id === messageId) item.rating = rating
  }
  for (const panel of Object.values(questionPanels)) {
    for (const item of panel.list) {
      if (item.id === messageId) item.rating = rating
    }
  }
}

const handleRate = async (messageId: number, rating: number) => {
  const target = messages.value.find((m) => m.id === messageId)
  const previous = target?.rating ?? 0
  applyRating(messageId, rating)
  try {
    await rateChatMessage({ messageId, rating })
    message.success(
      rating === 1 ? '已点赞，感谢反馈' : rating === -1 ? '已点踩，感谢反馈' : '已取消评价'
    )
  } catch {
    applyRating(messageId, previous)
    message.error('评价保存失败，已恢复原状态')
  }
}

// ---------- 历史版本 ----------
const versionsVisible = ref(false)
const versionsLoading = ref(false)
const versions = ref<ChatMessageRespVO[]>([])
const versionIndex = ref(0)
/** 打开弹窗时的来源消息 id，切换后据此刷新版本列表的主链标记 */
const versionsMessageId = ref<number>()
const switchingVersion = ref(false)

/** 当前选中的版本消息（用于判断是否为主链、能否切换） */
const selectedVersion = computed<ChatMessageRespVO | undefined>(
  () => versions.value[versionIndex.value]
)

const currentVersionAnswer = computed<ChatAnswerView | undefined>(() => {
  const item = selectedVersion.value
  return item ? messageToAnswerView(item) : undefined
})

const handleVersions = async (messageId: number) => {
  versionsVisible.value = true
  versionsLoading.value = true
  versions.value = []
  versionIndex.value = 0
  versionsMessageId.value = messageId
  try {
    versions.value = (await getChatMessageVersions(messageId)) || []
    const idx = versions.value.findIndex((v) => v.active)
    versionIndex.value = idx >= 0 ? idx : 0
  } finally {
    versionsLoading.value = false
  }
}

/**
 * 切换版本：把选中的历史回答激活为当前分支（后端树模型，不重跑链路）。
 * 切换后主链会变，需要：刷新消息列表、清空失效的版本面板缓存、同步右侧轨道高亮。
 */
const handleSwitchVersion = async () => {
  const sessionId = currentSession.value?.id
  const target = selectedVersion.value
  if (!sessionId || !target?.id || switchingVersion.value) return
  switchingVersion.value = true
  try {
    await switchChatVersion({ sessionId, targetMessageId: target.id })
    message.success('已切换版本，会话主链已更新')
    // 主链改变：所有问题版本面板的 current/total 都基于旧主链，清空后由翻页器按需重新懒加载
    Object.keys(questionPanels).forEach((k) => delete questionPanels[k])
    const parentId = target.parentId
    await loadMessages(sessionId)
    // 右侧轨道高亮跟随到被切换消息所属问题；短暂保护避免scrollToBottom/滚动监听抢回
    if (parentId) {
      activeQuestionId.value = parentId
      locateGuardUntil = Date.now() + 1200
      await nextTick()
      const anchor = scrollRef.value?.querySelector<HTMLElement>(`[data-question-id="${parentId}"]`)
      anchor?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // 刷新弹窗内版本列表的主链标记，并选中刚激活的版本
    if (versionsMessageId.value) {
      versions.value = (await getChatMessageVersions(versionsMessageId.value)) || []
      const newIdx = versions.value.findIndex((v) => v.id === target.id)
      versionIndex.value = newIdx >= 0 ? newIdx : 0
    }
    void loadSessions()
  } catch {
    // 失败提示由 axios 拦截器统一弹出
  } finally {
    switchingVersion.value = false
  }
}

// ---------- 工具 ----------
const formatTime = (value?: string): string => {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 19)
}

const copyText = async (text?: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制问题')
  } catch {
    message.error('复制失败，请手动选中复制')
  }
}

onMounted(async () => {
  await loadDatasourceList()
  await loadModelOptions()
  await loadSessions()
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
  width: 262px;
  flex: none;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}

.session-list {
  flex: 1;
  overflow: auto;
  padding: 0 8px 8px;
}

.session-item {
  padding: 8px 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
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
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.session-ops {
  flex: none;
  display: none;
}
.session-item:hover .session-ops {
  display: inline-flex;
}
.session-sub {
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.session-time {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.chat-main {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
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
  overflow: auto;
  padding: 14px 16px;
  background: var(--el-fill-color-lighter);
}

.msg-user {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.msg-user-bubble {
  max-width: 76%;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-color-primary-light-9);
  color: var(--el-text-color-primary);
}

/* DeepSeek 式版本翻页器：‹ 2/3 ›，浅灰小字 + 细箭头，不抢问题正文的视觉重心 */
.msg-ops {
  opacity: 0.7;
}
.msg-user:hover .msg-ops {
  opacity: 1;
}
.version-pager {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.version-pager .el-button {
  height: 18px;
  margin: 0;
  padding: 0;
  color: var(--el-text-color-placeholder);
}
.version-pager-text {
  min-width: 30px;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
.version-pager-latest {
  height: 18px;
  margin: 0 0 0 4px;
  padding: 0 2px;
  font-size: 11px;
}
.msg-assistant {
  margin-bottom: 12px;
}

.stage-box {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}
.stage-list {
  max-height: 160px;
  overflow: auto;
  margin-top: 8px;
}
.stage-row {
  display: flex;
  align-items: center;
  padding: 3px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}
.stage-row:last-child {
  border-bottom: none;
}

.chat-foot {
  padding: 10px 14px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.version-item {
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--el-border-color-lighter);
}
.version-item:hover {
  background: var(--el-fill-color-light);
}
.version-item.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

/* 点击跳转的目标锚点：短暂高亮提示定位结果 */
.question-anchor {
  transition: background-color 0.6s ease;
}

.question-anchor--highlight {
  background-color: var(--el-color-warning-light-9);
}
</style>
