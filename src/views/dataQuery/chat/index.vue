<template>
  <ContentWrap :body-style="{ padding: '0', overflow: 'hidden' }">
    <div class="chat-shell">
      <!-- 左：两种模式聚合的统一会话列表 -->
      <aside class="chat-side">
        <div class="p-10px">
          <el-button
            type="primary"
            class="w-full"
            v-hasPermi="['data-query:chat:query']"
            @click="handleNewSession"
          >
            <Icon icon="ep:plus" class="mr-5px" />新建对话
          </el-button>
          <el-radio-group
            v-model="sessionFilter"
            size="small"
            class="mt-10px w-full"
            @change="handleSessionFilterChange"
          >
            <el-radio-button value="ALL">全部</el-radio-button>
            <el-radio-button value="QUERY">问数</el-radio-button>
            <el-radio-button value="KNOWLEDGE">知识</el-radio-button>
          </el-radio-group>
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
            v-for="item in filteredSessions"
            :key="String(item.sessionId)"
            class="session-item"
            :class="{ 'is-active': isCurrentSession(item) }"
            @click="handleSelectSession(item)"
          >
            <div class="flex items-center">
              <span class="mode-badge" :class="item.mode === 'QUERY' ? 'is-query' : 'is-knowledge'">
                {{ item.mode === 'QUERY' ? '问数' : '知识' }}
              </span>
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

      <!-- 右：统一对话主体 -->
      <section class="chat-main">
        <header class="chat-head">
          <div class="min-w-0">
            <div class="truncate text-15px font-600">
              {{ currentSession?.title || '新对话' }}
            </div>
            <div class="mt-2px truncate text-12px text-gray-400">
              {{ resourceLabel }}
              <span class="ml-8px">模型：{{ modelLabel }}</span>
              <span class="ml-8px">
                {{ mode === 'KNOWLEDGE' ? '流式' : form.stream ? '流式' : '同步' }}
              </span>
              <span v-if="currentSession?.messageCount" class="ml-8px">
                共 {{ currentSession.messageCount }} 条消息
              </span>
            </div>
          </div>
          <div class="head-controls">
            <el-radio-group :model-value="mode" size="small" @change="switchMode">
              <el-radio-button value="QUERY">智能问数</el-radio-button>
              <el-radio-button value="KNOWLEDGE">知识库</el-radio-button>
            </el-radio-group>
            <el-tooltip
              :disabled="!resourceLocked"
              content="会话已绑定资源，切换请先「新建对话」"
              placement="bottom"
            >
              <span class="inline-block">
                <el-select
                  v-if="mode === 'QUERY'"
                  v-model="form.datasourceId"
                  placeholder="选择数据源"
                  filterable
                  :disabled="resourceLocked"
                  class="!w-200px"
                >
                  <el-option
                    v-for="ds in datasourceOptions"
                    :key="ds.id"
                    :label="`${ds.name}（${ds.code}）`"
                    :value="ds.id"
                  />
                </el-select>
                <el-select
                  v-else
                  v-model="form.baseId"
                  placeholder="选择知识库"
                  filterable
                  :disabled="resourceLocked"
                  class="!w-200px"
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
            <el-radio-group v-if="mode === 'QUERY'" v-model="form.stream" size="small">
              <el-radio-button :value="true">流式</el-radio-button>
              <el-radio-button :value="false">同步</el-radio-button>
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
            v-if="!renderedTurns.length && !stages.length && !sending"
            :image-size="100"
            :description="emptyText"
          />

          <ChatTurn
            v-for="turn in renderedTurns"
            :key="turn.key"
            :turn="turn"
            :mode="turn.mainUser.mode || mode"
            @copy="handleCopy"
            @edit="handleEdit"
            @pager-step="handlePagerStep"
            @jump-latest="handleJumpLatest"
            @regenerate="handleRegenerate"
            @rate="handleRate"
            @versions="handleVersions"
            @open-ref="handleOpenRef"
            @retrieve-preview="handleRetrievePreview"
          />

          <!-- 流式阶段进度：两种模式共用统一 stage 事件 -->
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

          <!-- 流式正文：delta 逐字写入临时气泡，终态后由落库消息替换 -->
          <div v-if="streamingTurn" class="streaming-turn">
            <div class="streaming-question">{{ streamingTurn.question }}</div>
            <div class="msg-pending">
              <div class="pending-avatar">AI</div>
              <div class="pending-text streaming-answer">
                <span v-if="streamingTurn.answer" class="streaming-answer-text">{{
                  streamingTurn.answer
                }}</span>
                <span v-else>{{ sendingTip }}</span>
                <span v-if="streamingTurn.answer" class="streaming-caret"></span>
              </div>
            </div>
          </div>

          <div v-if="sending && !streamingTurn" class="msg-pending">
            <div class="pending-avatar">AI</div>
            <span class="pending-text"> <span class="pending-dot"></span>{{ sendingTip }} </span>
          </div>

          <!-- 用户主动停止：整轮以 STOPPED 收口，回答区只显示「已停止」，不渲染结果表格 -->
          <el-alert
            v-if="stoppedNotice && !sending"
            type="info"
            :closable="false"
            show-icon
            class="stopped-notice"
            title="本轮已停止生成"
            description="已产生的内容按停止状态留痕；重新提问或重新生成可继续。"
          />
        </div>

        <footer class="chat-foot">
          <div class="mb-8px flex flex-wrap items-center justify-between gap-8px">
            <div class="flex items-center">
              <span class="mr-6px text-12px text-gray-400">模型</span>
              <template v-if="mode === 'QUERY'">
                <el-select
                  v-model="form.modelConfigId"
                  placeholder="默认模型（自动路由）"
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
              </template>
              <el-tag v-else type="info" size="small">RAG 场景绑定模型</el-tag>
            </div>
            <span class="text-12px text-gray-400">Ctrl + Enter 发送</span>
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
              {{
                mode === 'QUERY'
                  ? 'Schema 白名单与租户由服务端固化；仅列出当前场景可路由的模型'
                  : '仅基于所选知识库已解析完成的文档回答；引用编号可点击查看原文'
              }}
            </span>
            <div>
              <el-button
                v-if="sending && (mode === 'KNOWLEDGE' || form.stream || rerunning)"
                :loading="stopping"
                :disabled="stopRequested"
                @click="handleStop"
              >
                <Icon v-if="!stopping" icon="ep:video-pause" class="mr-5px" />停止生成
              </el-button>
              <el-button
                type="primary"
                :loading="sending"
                :disabled="!canSend"
                v-hasPermi="['data-query:chat:query']"
                @click="handleSend"
              >
                <Icon icon="ep:promotion" class="mr-5px" />发送
              </el-button>
            </div>
          </div>
        </footer>

        <!-- 右边缘 hover 问题轨道：默认短横线，hover 展开历史问题 -->
        <QuestionRail :items="questionNavItems" @select="handleJumpToQuestion" />
      </section>
    </div>

    <!-- 回答历史版本：按 mode 渲染对应结果卡，选中历史版本可切回主链 -->
    <el-dialog v-model="versionsVisible" title="回答历史版本" width="920px" top="6vh">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="mb-10px"
        title="可查看并切换历史版本"
        description="这里展示同一问题下的回答版本。点击任一无「主链」标记的版本可预览，再点「切到该版本」即可激活为当前分支；旧分支完整保留，可随时切回，不会重跑链路。"
      />
      <div v-loading="versionsLoading" class="flex">
        <div class="mr-12px w-220px flex-none">
          <div
            v-for="(item, idx) in versionList"
            :key="String(item.id)"
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
            v-if="!versionList.length && !versionsLoading"
            description="无历史版本"
            :image-size="50"
          />
        </div>
        <div class="min-w-0 flex-1">
          <ChatResultCard
            v-if="mode === 'QUERY' && selectedVersion"
            :response="toUnifiedAnswerView(selectedVersion)"
          />
          <KnowledgeChatMessage v-else-if="selectedVersion" :message="selectedVersion" />
          <el-empty v-else-if="!versionsLoading" description="请选择版本" :image-size="60" />
          <div
            v-if="selectedVersion && !selectedVersion.active && currentSession"
            class="mt-12px flex justify-end"
          >
            <el-button type="primary" :loading="switchingVersion" @click="handleSwitchVersion">
              切到该版本
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 引用原文切片 -->
    <el-drawer v-model="refDrawerVisible" title="引用原文切片" size="560px">
      <div v-loading="refDrawerLoading">
        <template v-if="currentRef">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="引用编号"> [{{ currentRef.refNo }}] </el-descriptions-item>
            <el-descriptions-item label="切片编号">{{ currentRef.chunkId }}</el-descriptions-item>
            <el-descriptions-item label="文件名" :span="2">
              {{ currentRef.fileName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="切片序号"
              >#{{ currentRef.chunkIndex }}</el-descriptions-item
            >
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

    <!-- 检索调试：仅知识库模式可用 -->
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
import {
  askUnifiedChat,
  askUnifiedChatStream,
  cancelUnifiedChat,
  deleteUnifiedSession,
  editUnifiedChat,
  editUnifiedChatStream,
  getUnifiedMessageList,
  getUnifiedMessageVersions,
  getUnifiedQuestionVersions,
  getUnifiedSessionPage,
  rateUnifiedMessage,
  regenerateUnifiedChat,
  regenerateUnifiedChatStream,
  renameUnifiedSession,
  retrievePreview,
  switchUnifiedVersion,
  type ChatDeltaEvent,
  type ChatId,
  type ChatMode,
  type ChatTerminalPayload,
  type RetrievePreviewRespVO,
  type UnifiedChatAskReqVO,
  type UnifiedChatAskRespVO,
  type UnifiedChatMessageRespVO,
  type UnifiedSessionRespVO
} from '@/api/dataQuery/chat'
import type { AiChatModelOption, ChatStageEvent } from '@/api/dataQuery/aichat'
import { getChatModelOptions } from '@/api/dataQuery/aichat'
import type { AiDatasourceSimpleRespVO } from '@/api/dataQuery/datasource'
import { getAiDatasourceSimpleList } from '@/api/dataQuery/datasource'
import type { AiKnowledgeBaseSimpleRespVO } from '@/api/dataQuery/knowledge'
import { getAiKnowledgeBaseSimpleList } from '@/api/dataQuery/knowledge'
import type { AiKnowledgeChunkVO } from '@/api/dataQuery/knowledgeChunk'
import { getAiKnowledgeChunk } from '@/api/dataQuery/knowledgeChunk'
import type { KnowledgeReference } from '@/api/dataQuery/knowledgeChat'
import {
  CHAT_STAGE_OPTIONS,
  CHAT_STATUS_OPTIONS,
  CHUNK_SYNC_STATUS_OPTIONS,
  getChatStatusTagType,
  getChunkSyncStatusTagType,
  getOptionLabel,
  getStageStateTagType
} from '@/api/dataQuery/constants'
import QuestionRail from '@/views/dataQuery/components/QuestionRail.vue'
import ChatResultCard from '@/views/dataQuery/aichat/ChatResultCard.vue'
import KnowledgeChatMessage from '@/views/dataQuery/knowledge/chat/KnowledgeChatMessage.vue'
import ChatTurn from './ChatTurn.vue'
import type { QuestionVersionPanel, RenderedTurn } from './types'
import { toUnifiedAnswerView } from './transform'

defineOptions({ name: 'DataQueryChat' })

const message = useMessage()

const questionPlaceholder =
  '问数：查询本月销售额前 10 的商品；知识库：差旅报销需要哪些材料？（上限 500 字）'

// ==================== 会话 ====================
const mode = ref<ChatMode>('QUERY')
const sessionFilter = ref<ChatMode | 'ALL'>('ALL')
const sessions = ref<UnifiedSessionRespVO[]>([])
const sessionTotal = ref(0)
const sessionLoading = ref(false)
const sessionQuery = reactive({ pageNo: 1, pageSize: 15, title: '' })
const currentSession = ref<UnifiedSessionRespVO>()

const sessionPageCount = computed(() =>
  Math.max(1, Math.ceil(sessionTotal.value / sessionQuery.pageSize))
)

/**
 * 模式过滤双保险：服务端 mode 参数负责分页总量，本地这层保证切换单选框时
 * 当前页立刻只显示对应模式的会话（含请求失败保留旧列表的情况）。
 * title 同样做当前页过滤兜底。
 */
const filteredSessions = computed(() => {
  let list = sessions.value
  if (sessionFilter.value !== 'ALL') {
    list = list.filter((item) => item.mode === sessionFilter.value)
  }
  const keyword = sessionQuery.title.trim().toLowerCase()
  if (!keyword) return list
  return list.filter(
    (item) =>
      (item.title || '').toLowerCase().includes(keyword) ||
      (item.lastQuestion || '').toLowerCase().includes(keyword)
  )
})

const isCurrentSession = (item: UnifiedSessionRespVO): boolean =>
  !!currentSession.value &&
  currentSession.value.mode === item.mode &&
  String(currentSession.value.sessionId) === String(item.sessionId)

let sessionRequestSeq = 0
const loadSessions = async () => {
  const seq = ++sessionRequestSeq
  sessionLoading.value = true
  try {
    const data = await getUnifiedSessionPage({
      pageNo: sessionQuery.pageNo,
      pageSize: sessionQuery.pageSize,
      mode: sessionFilter.value === 'ALL' ? undefined : sessionFilter.value,
      title: sessionQuery.title || undefined
    })
    // 快速切换过滤条件时，丢弃过期响应，避免旧模式会话覆盖新模式列表
    if (seq !== sessionRequestSeq) return
    sessions.value = data?.list || []
    sessionTotal.value = data?.total || 0
  } catch {
    // axios 拦截器已提示；保留上次列表，不打断当前对话
  } finally {
    if (seq === sessionRequestSeq) sessionLoading.value = false
  }
}

/** 左侧会话类型过滤：重置分页并向服务端按 mode 重新拉取 */
const handleSessionFilterChange = () => {
  sessionQuery.pageNo = 1
  void loadSessions()
}

const handleSearchSession = () => {
  sessionQuery.pageNo = 1
  void loadSessions()
}

const handleSessionPage = (delta: number) => {
  const next = sessionQuery.pageNo + delta
  if (next < 1 || next > sessionPageCount.value) return
  sessionQuery.pageNo = next
  void loadSessions()
}

// ==================== 资源与模型 ====================
const datasourceOptions = ref<AiDatasourceSimpleRespVO[]>([])
const baseOptions = ref<AiKnowledgeBaseSimpleRespVO[]>([])
const form = reactive({
  question: '',
  datasourceId: undefined as ChatId | undefined,
  baseId: undefined as ChatId | undefined,
  modelConfigId: undefined as ChatId | undefined,
  stream: true
})

const resourceLocked = computed(() => !!currentSession.value)
const resourceId = computed<ChatId | undefined>(() =>
  mode.value === 'QUERY'
    ? currentSession.value?.resourceId || form.datasourceId
    : currentSession.value?.resourceId || form.baseId
)
const resourceLabel = computed(() => {
  if (mode.value === 'QUERY') {
    const hit = datasourceOptions.value.find((ds) => String(ds.id) === String(resourceId.value))
    return hit ? `数据源：${hit.name}（${hit.code}）` : '数据源：未选择'
  }
  const hit = baseOptions.value.find((base) => String(base.id) === String(resourceId.value))
  return hit ? `知识库：${hit.name}（${hit.code}）` : '知识库：未选择'
})

const modelOptions = ref<AiChatModelOption[]>([])
const modelLoading = ref(false)
const defaultModelName = computed(
  () => modelOptions.value.find((item) => item.defaultModel)?.name || ''
)
const modelLabel = computed(() => {
  if (mode.value === 'KNOWLEDGE') return 'RAG 场景绑定'
  const selected = modelOptions.value.find(
    (item) => String(item.modelConfigId) === String(form.modelConfigId)
  )
  if (selected) return selected.name
  const defaultOption = modelOptions.value.find((item) => item.defaultModel)
  return defaultOption ? `${defaultOption.name}（默认）` : '场景默认'
})
const modelOptionLabel = (option: AiChatModelOption) =>
  `${option.name}（${option.modelId}）${option.defaultModel ? ' · 默认' : ''}`

const loadResources = async () => {
  try {
    datasourceOptions.value = (await getAiDatasourceSimpleList()) || []
  } catch {
    // 下拉加载失败不阻塞页面
  }
  try {
    baseOptions.value = (await getAiKnowledgeBaseSimpleList()) || []
    if (!form.baseId && baseOptions.value.length) form.baseId = baseOptions.value[0].id
  } catch {
    // 同上
  }
  modelLoading.value = true
  try {
    modelOptions.value = (await getChatModelOptions()) || []
  } catch {
    modelOptions.value = []
  } finally {
    modelLoading.value = false
  }
}

// ==================== 消息与版本面板 ====================
const messages = ref<UnifiedChatMessageRespVO[]>([])
const loadingMessages = ref(false)
const sending = ref(false)
/** 本地已放弃接收（断流兜底），用于 catch 分支不再报错 */
const stopped = ref(false)
/** 已向服务端发出停止指令，按钮进入 loading 并避免重复提交 */
const stopping = ref(false)
/** 本轮已请求停止：防止重复点「停止」重复打 cancel */
const stopRequested = ref(false)
/** 本轮以「已停止」收口，消息区展示提示条 */
const stoppedNotice = ref(false)
/** 本轮流式提问的客户端请求编号：带它提问才能被 cancel 定位 */
const currentClientRequestId = ref<string>()
const sendingTip = ref('正在检索并生成回答…')
/** 流式提问的临时气泡：正文 delta 直接拼这里，终态到达后由落库消息替换 */
const streamingTurn = ref<{ question: string; answer: string }>()
const stages = ref<ChatStageEvent[]>([])
const progress = ref(0)
const scrollRef = ref<HTMLElement>()
let abortController: AbortController | undefined
/** 停止后等待服务端收口的兜底定时器：超时仍无终态则强制断流 */
let stopFallbackTimer: ReturnType<typeof setTimeout> | undefined
/** KNOWLEDGE 流式重跑进行中：停止按钮据此显示 */
const rerunning = ref(false)

/**
 * 把 fetch-event-source 抛出的错误翻译成可展示文案。
 * 124 = 该轮正在重新生成（后端 Redis 在途锁）；125 = 问数模式不支持流式重跑。
 */
const rerunErrorCodeMessage = (code?: number): string | undefined => {
  if (code === 1099000124) return '这轮正在生成中，请等待当前任务完成后再试'
  if (code === 1099000125) return '问数模式的重跑暂不支持流式，请用同步方式重试'
  return undefined
}

const clearStopFallback = () => {
  if (stopFallbackTimer) {
    clearTimeout(stopFallbackTimer)
    stopFallbackTimer = undefined
  }
}

/**
 * 生成 clientRequestId。优先 crypto.randomUUID（36 字符，满足后端 64 上限）；
 * 非安全上下文（部分内网 http 访问）降级为时间戳 + 随机串。
 */
const newClientRequestId = (): string => {
  const cryptoObj = globalThis.crypto as Crypto | undefined
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** key 用字符串：雪花 ID 超过 JS 安全整数，绝不能作为对象 key 前先转 number */
const questionPanels = reactive<Record<string, QuestionVersionPanel>>({})

const clearQuestionPanels = () => {
  Object.keys(questionPanels).forEach((key) => delete questionPanels[key])
}

const loadQuestionPanel = async (
  user: UnifiedChatMessageRespVO,
  panelMode: ChatMode = mode.value
) => {
  const key = String(user.id)
  const sessionId = currentSession.value?.sessionId
  if (!user.id || String(user.id) === '0' || !sessionId || questionPanels[key]) return
  questionPanels[key] = {
    list: [],
    current: 1,
    total: 1,
    loading: true
  }
  try {
    const list = await getUnifiedQuestionVersions(panelMode, sessionId, user.seq ?? 0)
    const versions = (list || [])
      .filter((item) => item.role === 'USER')
      .sort((a, b) => (a.version ?? 1) - (b.version ?? 1))
    // current / total 是「第几版、共几版」的序号，不等于数据库 version 字段值。
    // version 会跳号（如 1、3），直接用它当序号会导致翻页找不到目标、点了没反应。
    const currentIdx = versions.findIndex((item) => String(item.id) === String(user.id))
    questionPanels[key] = {
      list: list || [],
      current: currentIdx >= 0 ? currentIdx + 1 : Math.max(versions.length, 1),
      total: Math.max(versions.length, 1),
      loading: false
    }
  } catch {
    delete questionPanels[key]
  }
}

/**
 * 主链消息加载后主动补齐每条问题的版本面板。
 * 重新生成 / 修改问题会把 current_leaf_id 切到某条历史分支，此时主链 USER 自身的
 * version 只是它在兄弟组里的序号（如 1），并不等于兄弟总数（如 2）。若只靠
 * renderedTurns 的 raw.version 兜底，翻页器会缩成 1/1，其它分支入口直接消失。
 * 总数必须以服务端按 seq 返回的同轮版本数为准。
 */
const refreshQuestionPanels = async (panelMode: ChatMode) => {
  const users = messages.value.filter(
    (item) =>
      item.role === 'USER' && item.id && String(item.id) !== '0' && !questionPanels[String(item.id)]
  )
  await Promise.all(users.map((user) => loadQuestionPanel(user, panelMode)))
}

const resolveQuestionView = (mainUser: UnifiedChatMessageRespVO) => {
  const panel = questionPanels[String(mainUser.id)]
  if (!panel || !panel.list.length) {
    return {
      user: mainUser,
      assistant: undefined as UnifiedChatMessageRespVO | undefined,
      isHistory: false
    }
  }
  const versions = panel.list
    .filter((item) => item.role === 'USER')
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1))
  // 按面板里的序号取，而非按 version 字段值匹配（version 可能跳号）
  const target = versions[panel.current - 1] || mainUser
  const candidates = panel.list
    .filter((item) => item.role === 'ASSISTANT' && String(item.parentId) === String(target.id))
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1))
  const assistant =
    candidates.find((item) => item.active) || candidates[candidates.length - 1] || undefined
  return { user: target, assistant, isHistory: String(target.id) !== String(mainUser.id) }
}

/** USER + 紧随的 ASSISTANT 合成一轮，支持问题版本翻页与回答版本错配保护 */
const renderedTurns = computed<RenderedTurn[]>(() => {
  const views = new Map<string, ReturnType<typeof resolveQuestionView>>()
  for (const raw of messages.value) {
    if (raw.role === 'USER' && raw.id && questionPanels[String(raw.id)]) {
      views.set(String(raw.id), resolveQuestionView(raw))
    }
  }

  // 每条主链问题「当前展示的回答」id：翻页到历史问题版本后，后续问题若仍挂在主链
  // 版本的回答上，就不属于当前正在看的这条分支，应从该条起整段隐藏。
  const shownAssistantId = new Map<string, ChatId>()
  for (const raw of messages.value) {
    if (raw.role !== 'USER' || !raw.id) continue
    const view = views.get(String(raw.id))
    const activeAssistant = messages.value.find(
      (item) => item.role === 'ASSISTANT' && String(item.parentId) === String(raw.id)
    )
    const id = view?.assistant?.id ?? activeAssistant?.id
    if (id != null && String(id) !== '0') shownAssistantId.set(String(raw.id), id)
  }

  // 主链是从根到叶的单链。一旦下一条问题的 parent 不是上一条「当前展示的回答」，
  // 说明它挂在别的版本分支上，后面所有消息都是那条分支的后代，统一不渲染。
  let expectedParent: ChatId | undefined
  let branchEnd = messages.value.length
  for (let i = 0; i < messages.value.length; i++) {
    const raw = messages.value[i]
    if (raw.role !== 'USER') continue
    if (raw.parentId == null || String(raw.parentId) === '0') {
      expectedParent = undefined
      continue
    }
    if (expectedParent != null && String(raw.parentId) !== String(expectedParent)) {
      branchEnd = i
      break
    }
    expectedParent = raw.id ? shownAssistantId.get(String(raw.id)) : undefined
  }
  const visibleMessages = messages.value.slice(0, branchEnd)

  const turns: RenderedTurn[] = []
  for (const raw of visibleMessages) {
    if (raw.role === 'USER') {
      const view = raw.id ? views.get(String(raw.id)) : undefined
      const shown = view?.user || raw
      const panel = raw.id ? questionPanels[String(raw.id)] : undefined
      // 总数取 panel.total 或主链 raw.version，不能用历史版本的 version，否则翻页器会消失
      const versionCount = panel?.total ?? raw.version ?? 1
      turns.push({
        key: `${mode.value}-${String(raw.id || `local-${turns.length}`)}`,
        user: shown,
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
            : undefined,
        questionVersion: shown.version ?? 1
      })
      continue
    }

    const turn = turns.find((item) => String(item.mainUser.id) === String(raw.parentId))
    if (!turn) continue
    const view = raw.parentId ? views.get(String(raw.parentId)) : undefined
    turn.isHistory = turn.isHistory || (view?.isHistory ?? false)
    // 历史问题版本下不能用主链回答兜底，否则会出现「v1 问题配 v2 回答」
    const versionedAssistant = view?.assistant
    turn.answerMissing = !!view && !!view.isHistory && !versionedAssistant
    turn.assistant = turn.answerMissing ? undefined : versionedAssistant || raw
  }
  return turns
})

// ==================== 右侧 hover 问题轨道与滚动 ====================
interface QuestionNavItem {
  id: ChatId
  question: string
  current: number
  total: number
  active: boolean
}

const activeQuestionId = ref<ChatId>()
let locateGuardUntil = 0
let scrollRafId = 0
let highlightTimer: ReturnType<typeof setTimeout> | undefined

const questionNavItems = computed<QuestionNavItem[]>(() =>
  renderedTurns.value.map((turn) => ({
    id: turn.mainUser.id,
    question: turn.user.question || '',
    current: turn.pager?.current ?? turn.questionVersion ?? 1,
    total: turn.pager?.total ?? turn.questionVersion ?? 1,
    active: String(activeQuestionId.value) === String(turn.mainUser.id)
  }))
)

const scrollToBottom = () => {
  nextTick(() => {
    if (Date.now() < locateGuardUntil) return
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

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
  const center = el.getBoundingClientRect().top + el.clientHeight / 2
  let closest = anchors[0]
  let minDistance = Infinity
  for (const anchor of anchors) {
    const rect = anchor.getBoundingClientRect()
    const distance = Math.abs(rect.top + rect.height / 2 - center)
    if (distance < minDistance) {
      minDistance = distance
      closest = anchor
    }
  }
  activeQuestionId.value = closest.dataset.questionId
}

const handleChatScroll = () => {
  if (scrollRafId) return
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = 0
    if (Date.now() < locateGuardUntil) return
    updateActiveByScroll()
  })
}

const highlightAnchor = async (id: ChatId) => {
  locateGuardUntil = Date.now() + 1200
  activeQuestionId.value = id
  await nextTick()
  const target = scrollRef.value?.querySelector<HTMLElement>(`[data-question-id="${String(id)}"]`)
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.add('question-anchor--highlight')
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => target.classList.remove('question-anchor--highlight'), 1600)
}

const handleJumpToQuestion = async (id: ChatId) => {
  const turn = renderedTurns.value.find((item) => String(item.mainUser.id) === String(id))
  if (!turn) return
  if (!questionPanels[String(id)]) await loadQuestionPanel(turn.mainUser)
  await highlightAnchor(id)
}

// ==================== 消息加载 ====================
/** 落库失败时用实时响应兜底，避免用户看不到本轮结果 */
const appendLocalTurn = (question: string, resp: UnifiedChatAskRespVO, targetMode: ChatMode) => {
  streamingTurn.value = undefined
  const base = messages.value.length
  messages.value.push(
    {
      mode: targetMode,
      id: resp.userMessageId ?? 0,
      role: 'USER',
      question,
      seq: base + 1,
      active: true,
      version: 1
    },
    {
      mode: targetMode,
      id: resp.assistantMessageId ?? 0,
      role: 'ASSISTANT',
      seq: base + 2,
      active: true,
      version: 1,
      status: resp.status,
      question,
      answer: resp.answer,
      generatedSql: resp.sql,
      executedSql: resp.executedSql,
      result: resp.result,
      chartSpec: resp.chartSpec,
      explain: resp.explain,
      references: resp.references,
      recallMode: resp.recallMode,
      recallDegraded: resp.recallDegraded,
      retrievedCount: resp.retrievedCount,
      citationDroppedCount: resp.citationDroppedCount,
      latencyMs: resp.latencyMs,
      errorCode:
        resp.errorCode === undefined || resp.errorCode === null
          ? undefined
          : String(resp.errorCode),
      errorMsg: resp.errorMsg,
      rating: 0,
      traceId: resp.traceId
    }
  )
  scrollToBottom()
}

const loadMessages = async (
  targetMode: ChatMode,
  sessionId: ChatId,
  fallback?: UnifiedChatAskRespVO,
  question?: string
) => {
  loadingMessages.value = true
  try {
    messages.value = await getUnifiedMessageList(targetMode, sessionId)
    const landed = fallback
      ? messages.value.some(
          (item) =>
            (fallback.assistantMessageId != null &&
              String(item.id) === String(fallback.assistantMessageId)) ||
            (!!fallback.traceId && item.traceId === fallback.traceId)
        )
      : true
    if (fallback && !landed)
      appendLocalTurn(question || fallback.question || '', fallback, targetMode)
    // 版本面板按 seq 从服务端取真实总数：主链切到历史分支后 raw.version 不再等于分支数
    await refreshQuestionPanels(targetMode)
  } catch {
    // 拦截器已提示；刷新失败不覆盖已有消息
  } finally {
    loadingMessages.value = false
    scrollToBottom()
  }
}

// ==================== 提问 ====================
const canSend = computed(() => !!form.question.trim() && !!resourceId.value && !sending.value)
const emptyText = computed(() => {
  if (currentSession.value) return '该会话暂无消息'
  if (!resourceId.value) return mode.value === 'QUERY' ? '请先选择数据源' : '请先选择知识库'
  return mode.value === 'QUERY'
    ? '输入问题开始智能问数，结果按轮次保存，可重新生成、修改问题和赞踩'
    : '输入问题开始知识库问答，回答中的 [n] 角标可点击查看引用原文'
})
const progressStatus = computed<'success' | 'exception' | ''>(() => {
  const last = stages.value[stages.value.length - 1]
  if (!last) return ''
  if (last.stage === 'error' || last.state === 'ERROR') return 'exception'
  if (last.stage === 'done') return 'success'
  return ''
})

/**
 * 停止回答：优先走服务端取消（POST /chat/cancel?clientRequestId=），并保持 SSE 连接，
 * 等后端以 stopped 终态收口。直接 abort 会让前端收不到 stopped 事件。
 * 仅在没有 clientRequestId（同步模式）或兜底超时时才本地断流。
 */
const handleStop = async () => {
  if (!sending.value || stopRequested.value) return
  stopRequested.value = true
  const requestId = currentClientRequestId.value
  if (!requestId) {
    stopped.value = true
    stoppedNotice.value = true
    abortController?.abort()
    return
  }
  stopping.value = true
  sendingTip.value = '正在停止…'
  try {
    await cancelUnifiedChat(requestId)
    message.info('已发送停止指令，等待服务端收口…')
  } catch {
    // CHAT_CANCEL_NOT_FOUND 等：本轮可能刚好结束，保持连接继续等终态，不打断
  } finally {
    stopping.value = false
  }
  // 兜底：15s 内仍未收到 stopped / done，强制断流，避免页面一直挂起。
  // 此时前端已拿不到终态事件，同样按「已停止」呈现。
  clearStopFallback()
  stopFallbackTimer = setTimeout(() => {
    if (!sending.value) return
    stopped.value = true
    stoppedNotice.value = true
    abortController?.abort()
  }, 15000)
}

/**
 * 停止收口：从服务端重拉消息，落库的 STOPPED 回答由结果卡渲染为「已停止」，
 * 不在这里拼半成品结果。会话是新建时同步进左侧列表并清空问题面板缓存。
 */
const finishStopped = async (sessionId: ChatId | undefined, question: string) => {
  streamingTurn.value = undefined
  stoppedNotice.value = true
  if (!sessionId) return
  const isNew =
    !currentSession.value || String(currentSession.value.sessionId) !== String(sessionId)
  if (isNew) {
    currentSession.value = {
      mode: mode.value,
      sessionId,
      title: question.slice(0, 30),
      resourceId: resourceId.value,
      messageCount: 0
    }
    sessionQuery.pageNo = 1
  }
  await loadMessages(mode.value, sessionId)
  void loadSessions()
}

const afterAnswer = async (resp: UnifiedChatAskRespVO, question: string) => {
  streamingTurn.value = undefined
  if (!resp.sessionId) {
    appendLocalTurn(question, resp, mode.value)
    return
  }
  const isNew =
    !currentSession.value || String(currentSession.value.sessionId) !== String(resp.sessionId)
  if (isNew) {
    currentSession.value = {
      mode: mode.value,
      sessionId: resp.sessionId,
      title: question.slice(0, 30),
      resourceId: resourceId.value,
      messageCount: 0
    }
    sessionQuery.pageNo = 1
  }
  await loadMessages(mode.value, resp.sessionId, resp, question)
  void loadSessions()
}

const sendSync = async (req: UnifiedChatAskReqVO, question: string) => {
  let resp: UnifiedChatAskRespVO
  try {
    resp = await askUnifiedChat(req)
  } catch (e: any) {
    form.question = question
    message.error(e?.message || '对话失败，请检查后端服务与网络')
    return
  }
  await afterAnswer(resp, question)
}

/**
 * 流式提问：QUERY 只有阶段事件，KNOWLEDGE 额外逐段推正文 delta。
 * 两种模式终态 payload 不同：QUERY 带 response；KNOWLEDGE 带 answer/sessionId/消息 id/persisted。
 */
const sendStream = async (req: UnifiedChatAskReqVO, question: string) => {
  abortController = new AbortController()
  streamingTurn.value = { question, answer: '' }
  const isKnowledge = req.mode === 'KNOWLEDGE'
  const state: {
    resp?: UnifiedChatAskRespVO
    payload?: ChatTerminalPayload
    failure: string
    /** 收到 stopped 终态：用户主动停止，不按成功/失败处理 */
    stoppedByServer: boolean
    stoppedSessionId?: ChatId
  } = { failure: '', stoppedByServer: false }
  try {
    await askUnifiedChatStream(
      req,
      {
        onStage: (event) => {
          stages.value.push(event)
          if (typeof event.progress === 'number') {
            progress.value = Math.max(progress.value, Math.min(event.progress, 100))
          }
          const payload = event.payload as ChatTerminalPayload | undefined
          const payloadResponse = payload?.response as UnifiedChatAskRespVO | undefined
          // 停止终态优先：QUERY 的 stopped 也带 response，必须在此拦下，
          // 否则会被当作成功渲染出结果表格。
          if (
            event.stage === 'stopped' ||
            event.state === 'STOPPED' ||
            payload?.status === 'STOPPED'
          ) {
            state.stoppedByServer = true
            state.payload = payload
            state.stoppedSessionId = payload?.sessionId || payloadResponse?.sessionId
            return
          }
          if (event.stage === 'done' || event.stage === 'error') {
            state.payload = payload
            if (event.stage === 'error') state.failure = event.message || '流式对话失败'
            if (payloadResponse) {
              // QUERY：done 带完整结果，沿用落库核对逻辑
              state.resp = payloadResponse
            } else if (event.stage === 'done' && isKnowledge && payload?.answer) {
              // KNOWLEDGE：done 只带 answer/消息 id，转成统一响应供落库核对
              state.resp = {
                mode: 'KNOWLEDGE',
                status: payload.status,
                sessionId: payload.sessionId,
                answer: payload.answer,
                userMessageId: payload.userMessageId,
                assistantMessageId: payload.assistantMessageId,
                errorCode: payload.errorCode
              }
            }
          }
        },
        onDelta: (event: ChatDeltaEvent) => {
          if (!streamingTurn.value) return
          streamingTurn.value.answer += event.content || ''
          scrollToBottom()
        },
        onError: (err, code) => {
          state.failure = rerunErrorCodeMessage(code) || err
        },
        onClose: () => {
          // 结果已在 done / stopped 事件里处理
        }
      },
      abortController.signal
    )
  } catch (e: any) {
    if (stopped.value) {
      message.info('已停止接收，服务端仍在收口本轮')
      return
    }
    state.failure = state.failure || e?.message || '流式对话连接异常'
  }

  // 已停止优先于结果渲染：即使 payload 带了 response 也不走结果卡
  if (state.stoppedByServer) {
    await finishStopped(state.stoppedSessionId, question)
    return
  }
  if (stopped.value) return
  if (!state.resp) {
    // 知识库失败但已收到正文：留在当前页面，不让用户白等
    if (isKnowledge && streamingTurn.value?.answer) {
      appendLocalTurn(
        question,
        { mode: 'KNOWLEDGE', status: 'ERROR', answer: streamingTurn.value.answer },
        'KNOWLEDGE'
      )
    }
    form.question = question
    message.error(state.failure || '连接已结束但未收到结果，请查看服务端日志或改用同步模式')
    return
  }
  // 未落库（空回答/版本策略）：内容只留在当前页面，不伪造一条落库消息
  if (isKnowledge && state.payload?.persisted === false) {
    appendLocalTurn(question, state.resp, 'KNOWLEDGE')
    message.info('本轮未保存，内容仅保留在当前页面')
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
  if (!resourceId.value) {
    message.warning(mode.value === 'QUERY' ? '请选择数据源' : '请选择知识库')
    return
  }

  // 流式提问都要可取消标识：知识库固定流式，问数由流式/同步开关决定。
  // 后端只对带 clientRequestId 的 ask-stream 注册取消令牌。
  const useStream = mode.value === 'KNOWLEDGE' || form.stream
  const clientRequestId = useStream ? newClientRequestId() : undefined

  const req: UnifiedChatAskReqVO = {
    mode: mode.value,
    question,
    sessionId: currentSession.value?.sessionId,
    // 两种资源互斥：只发送当前模式需要的字段，切换模式必须新建会话
    datasourceId: mode.value === 'QUERY' ? resourceId.value : undefined,
    baseId: mode.value === 'KNOWLEDGE' ? resourceId.value : undefined,
    modelConfigId: form.modelConfigId || undefined,
    sceneCode: mode.value === 'QUERY' ? 'SQL_GEN' : undefined,
    clientRequestId
  }

  currentClientRequestId.value = clientRequestId
  sending.value = true
  stopped.value = false
  stopping.value = false
  stopRequested.value = false
  stoppedNotice.value = false
  stages.value = []
  progress.value = 0
  form.question = ''

  try {
    if (useStream) {
      await sendStream(req, question)
    } else {
      await sendSync(req, question)
    }
  } finally {
    sending.value = false
    stopping.value = false
    stopRequested.value = false
    abortController = undefined
    currentClientRequestId.value = undefined
    streamingTurn.value = undefined
    sendingTip.value = '正在检索并生成回答…'
    clearStopFallback()
  }
}

// ==================== 模式 / 会话操作 ====================
/**
 * 切换模式必须新建会话：两种会话归属链互斥，不能携带旧 sessionId。
 * 返回是否切换成功，供「点击另一模式的会话」时判断后续加载是否可继续。
 */
const switchMode = (next: ChatMode | string | number | boolean, silent = false): boolean => {
  const target = String(next) as ChatMode
  if (target !== 'QUERY' && target !== 'KNOWLEDGE') return false
  if (target === mode.value) return true
  if (sending.value) {
    message.warning('请等待当前对话结束或先停止接收')
    return false
  }
  mode.value = target
  currentSession.value = undefined
  messages.value = []
  clearQuestionPanels()
  stages.value = []
  progress.value = 0
  stoppedNotice.value = false
  stopped.value = false
  clearStopFallback()
  form.question = ''
  // 模型候选集按场景区分，跨模式不沿用上一场景的选择
  form.modelConfigId = undefined
  activeQuestionId.value = undefined
  locateGuardUntil = 0
  sessionQuery.pageNo = 1
  // 左侧过滤若只看一种模式，跟着切过去，否则看不到新模式刚建的会话
  if (sessionFilter.value !== 'ALL') sessionFilter.value = target
  void loadSessions()
  if (!silent) {
    message.info(
      target === 'QUERY'
        ? '已切到智能问数，发送后新建问数会话'
        : '已切到知识库问答，发送后新建知识库会话'
    )
  }
  return true
}

const handleNewSession = () => {
  currentSession.value = undefined
  messages.value = []
  clearQuestionPanels()
  stages.value = []
  progress.value = 0
  stoppedNotice.value = false
  stopped.value = false
  clearStopFallback()
  form.question = ''
  activeQuestionId.value = undefined
  locateGuardUntil = 0
}

const handleSelectSession = async (item: UnifiedSessionRespVO) => {
  if (sending.value) {
    message.warning('请等待当前对话结束或先停止接收')
    return
  }
  if (mode.value !== item.mode && !switchMode(item.mode, true)) return
  currentSession.value = item
  if (item.mode === 'QUERY') form.datasourceId = item.resourceId
  else form.baseId = item.resourceId
  clearQuestionPanels()
  stages.value = []
  progress.value = 0
  stoppedNotice.value = false
  stopped.value = false
  clearStopFallback()
  locateGuardUntil = 0
  activeQuestionId.value = undefined
  await loadMessages(item.mode, item.sessionId)
  const last = questionNavItems.value[questionNavItems.value.length - 1]
  activeQuestionId.value = last?.id
}

const handleRename = async (item: UnifiedSessionRespVO) => {
  let input: any
  try {
    input = await message.prompt(`当前标题：${item.title || '未命名会话'}`, '重命名会话')
  } catch {
    return
  }
  const title = (input?.value || '').trim().slice(0, 100)
  if (!title) {
    message.warning('标题不能为空')
    return
  }
  await renameUnifiedSession({ mode: item.mode, sessionId: item.sessionId, title })
  message.success('已重命名')
  if (isCurrentSession(item)) currentSession.value = { ...currentSession.value!, title }
  await loadSessions()
}

const handleDelete = async (item: UnifiedSessionRespVO) => {
  try {
    await message.delConfirm(`确认删除会话「${item.title || '未命名会话'}」？其消息会一并删除。`)
  } catch {
    return
  }
  await deleteUnifiedSession(item.mode, item.sessionId)
  message.success('已删除')
  if (isCurrentSession(item)) handleNewSession()
  await loadSessions()
}

// ==================== 消息操作 ====================
const handleCopy = async (text?: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制问题')
  } catch {
    message.error('复制失败，请手动选中复制')
  }
}

/**
 * KNOWLEDGE 流式重跑统一执行器：乐观更新 → delta 逐字渲染 → 终态判定 → 成功重拉 / 失败回滚。
 *
 * 乐观对象：EDIT 改问题气泡 + 清空回答；REGENERATE 只清空回答。
 * 提交前保存快照，persisted=false / error / 断流时原样恢复——否则用户刷新后会以为编辑丢了。
 *
 * op/version/消息 id 决定气泡去向：EDIT 落库是同 seq 的新 USER 兄弟版本（翻页器 N/M +1），
 * REGENERATE 是同 parent 的新 ASSISTANT 兄弟版本；两者都由后端切 active，
 * 前端终态一律重拉主链即可拿到正确版本，不手工 append，避免与树模型打架。
 */
const runRerunStream = async (params: {
  op: 'EDIT' | 'REGENERATE'
  user: UnifiedChatMessageRespVO
  assistant?: UnifiedChatMessageRespVO
  newQuestion?: string
}) => {
  const { op, user, assistant, newQuestion } = params
  const sessionId = currentSession.value?.sessionId
  if (!sessionId) return

  // 1. 快照：问题原文 + 回答原文
  const snapshotUserQuestion = user.question
  const snapshotAssistantAnswer = assistant?.answer
  const snapshotAssistantStatus = assistant?.status

  /** 回滚到提交前的气泡，持久化失败时用它消除「以为编辑成功」的错觉 */
  const rollback = () => {
    user.question = snapshotUserQuestion
    if (assistant) {
      assistant.answer = snapshotAssistantAnswer
      assistant.status = snapshotAssistantStatus
    }
  }

  // 2. 乐观更新。先清版本面板：面板里的对象是独立副本，不清会让 delta 拼到
  // messages 上却渲染面板旧对象，逐字效果出不来；重拉后 refreshQuestionPanels 会重建。
  clearQuestionPanels()
  if (op === 'EDIT' && newQuestion) user.question = newQuestion
  if (assistant) {
    assistant.answer = ''
    assistant.status = 'RUNNING'
  }

  const requestId = newClientRequestId()
  currentClientRequestId.value = requestId
  abortController = new AbortController()
  sending.value = true
  rerunning.value = true
  stopped.value = false
  stopping.value = false
  stopRequested.value = false
  stoppedNotice.value = false
  stages.value = []
  progress.value = 0
  sendingTip.value = op === 'EDIT' ? '正在按新问题重新生成…' : '正在重新生成…'
  scrollToBottom()

  const state: {
    terminal?: 'done' | 'error' | 'stopped'
    payload?: ChatTerminalPayload
    failure: string
    stoppedByServer: boolean
    stoppedSessionId?: ChatId
  } = { failure: '', stoppedByServer: false }

  const handlers = {
    onStage: (event: ChatStageEvent) => {
      stages.value.push(event)
      if (typeof event.progress === 'number') {
        progress.value = Math.max(progress.value, Math.min(event.progress, 100))
      }
      const payload = event.payload as ChatTerminalPayload | undefined
      // 停止终态优先：QUERY 的 stopped 也带 response，不能被当成功渲染
      if (event.stage === 'stopped' || event.state === 'STOPPED' || payload?.status === 'STOPPED') {
        state.stoppedByServer = true
        state.terminal = 'stopped'
        state.payload = payload
        if (payload?.sessionId) state.stoppedSessionId = payload.sessionId
        return
      }
      if (event.stage === 'done' || event.stage === 'error') {
        state.terminal = event.stage
        state.payload = payload
        if (event.stage === 'error') state.failure = event.message || '重新生成失败'
      }
    },
    onDelta: (event: ChatDeltaEvent) => {
      // 增量只拼到乐观气泡；终态到达后一律用落库消息重拉覆盖
      if (assistant) {
        assistant.answer = `${assistant.answer || ''}${event.content || ''}`
        scrollToBottom()
      }
    },
    onError: (err: string, code?: number) => {
      state.failure = rerunErrorCodeMessage(code) || err || '重新生成失败'
    },
    onClose: () => {
      // 终态已在 done / error / stopped 事件处理
    }
  }

  try {
    const modelConfigId = form.modelConfigId || undefined
    if (op === 'EDIT') {
      await editUnifiedChatStream(
        {
          mode: 'KNOWLEDGE',
          messageId: user.id,
          question: newQuestion || '',
          modelConfigId,
          clientRequestId: requestId
        },
        handlers,
        abortController.signal
      )
    } else {
      await regenerateUnifiedChatStream(
        {
          mode: 'KNOWLEDGE',
          messageId: assistant?.id || user.id,
          modelConfigId,
          clientRequestId: requestId
        },
        handlers,
        abortController.signal
      )
    }
  } catch (e: any) {
    if (stopped.value) {
      // 本地强制断流：没拿到后端终态，无法确认是否落库。保守回滚乐观气泡，
      // 再重拉一次主链——后端如果已落库 STOPPED，重拉会拿到正确状态。
      rollback()
      await loadMessages(mode.value, sessionId)
      void loadSessions()
      return
    }
    if (!state.failure) {
      state.failure = rerunErrorCodeMessage(e?.code) || e?.message || '重新生成连接异常'
    }
  } finally {
    sending.value = false
    rerunning.value = false
    stopping.value = false
    stopRequested.value = false
    abortController = undefined
    currentClientRequestId.value = undefined
    sendingTip.value = '正在检索并生成回答…'
    clearStopFallback()
  }

  // 3. 终态收口
  if (state.stoppedByServer || state.terminal === 'stopped') {
    // 中断：后端按「用户确实看到内容」判定是否落库（payload.persisted）。
    // 未落库则回滚；已落库则重拉显示 STOPPED 消息。
    if (state.payload?.persisted === false) {
      rollback()
      message.info('已停止，本轮未保留，气泡已恢复原样')
    } else {
      await loadMessages(mode.value, state.stoppedSessionId || sessionId)
      clearQuestionPanels()
      stoppedNotice.value = true
      message.info('已停止生成')
    }
    void loadSessions()
    return
  }
  if (state.terminal === 'error' || state.failure) {
    // 失败语义：后端 PromotionPolicy 对重跑失败不落库，前端必须回滚
    rollback()
    clearQuestionPanels()
    message.error(state.failure || '重新生成失败，已恢复原内容')
    void loadSessions()
    return
  }
  if (state.terminal === 'done') {
    // persisted=false：版本策略跳过落库，回滚（edit 的问题气泡也要退回）
    if (state.payload?.persisted === false) {
      rollback()
      clearQuestionPanels()
      message.warning('本轮未保存，已恢复原内容')
      void loadSessions()
      return
    }
    // 成功：后端已落库并切 active，重拉主链拿到 op/version 对应的新气泡
    clearQuestionPanels()
    await loadMessages(mode.value, sessionId)
    void loadSessions()
    const v = typeof state.payload?.version === 'number' ? ` v${state.payload.version}` : ''
    message.success(
      op === 'EDIT'
        ? `已生成问题${v}并切换为当前版本，原问题可在历史中切回`
        : `已重新生成回答${v}，旧版本可在历史中切回`
    )
  }
}

const handleEdit = async (user: UnifiedChatMessageRespVO) => {
  if (!user.id || String(user.id) === '0' || sending.value) return
  const nextVersion = (user.version ?? 1) + 1
  let input: any
  try {
    input = await message.prompt(
      `原问题：${user.question || ''}\n\n请输入修改后的新问题；提交后会生成问题 v${nextVersion} 并作为当前分支继续对话，原分支会完整保留为历史版本。`,
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
  // KNOWLEDGE：走流式 edit-stream，带乐观更新与持久化失败回滚
  if (mode.value === 'KNOWLEDGE') {
    const assistant = messages.value.find(
      (item) => item.role === 'ASSISTANT' && String(item.parentId) === String(user.id)
    )
    await runRerunStream({ op: 'EDIT', user, assistant, newQuestion: question })
    return
  }
  // QUERY：后端重跑不支持流式（125），保持同步
  sending.value = true
  try {
    await editUnifiedChat({
      mode: mode.value,
      messageId: user.id,
      question,
      modelConfigId: form.modelConfigId || undefined
    })
    message.success(`已生成问题 v${nextVersion} 并切换为当前分支，原分支可在历史版本中切回`)
    clearQuestionPanels()
    if (currentSession.value) {
      await loadMessages(mode.value, currentSession.value.sessionId)
    }
    void loadSessions()
  } catch {
    // 拦截器已提示（如非主链不可修改）
  } finally {
    sending.value = false
  }
}

/** 问题版本翻页进行中，防止连点导致并发切分支 */
const switchingPager = ref(false)

/**
 * 翻页必须真正切换服务端分支，而不是只改本地面板的 current。
 * message/list 只返回当前激活叶子到根的主链：若仅本地换当前轮的展示版本，
 * 该版本分支下的后续对话不在主链里，用户会看到「数字翻了、下面的对话没变」。
 * 后端 switchVersion 会沿目标版本向下找到激活叶子，切完重拉主链即可整链同步。
 */
const switchQuestionVersion = async (
  panel: QuestionVersionPanel,
  targetVersion: number,
  sessionId: ChatId
) => {
  const versions = panel.list
    .filter((item) => item.role === 'USER')
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1))
  const target = versions[targetVersion - 1]
  if (!target?.id || switchingPager.value) return
  switchingPager.value = true
  panel.loading = true
  try {
    await switchUnifiedVersion({
      mode: mode.value,
      sessionId,
      targetMessageId: target.id
    })
    clearQuestionPanels()
    await loadMessages(mode.value, sessionId)
    void loadSessions()
    message.success(`已切换到第 ${targetVersion} 版问题，下方对话已同步`)
  } catch {
    panel.loading = false
    // 拦截器已提示
  } finally {
    switchingPager.value = false
  }
}

/** 首次点击翻页箭头才拉全量版本，之后按目标版本切换服务端激活分支 */
const handlePagerStep = async (user: UnifiedChatMessageRespVO, delta: number) => {
  const key = String(user.id)
  if (questionPanels[key]?.loading || switchingPager.value) return
  if (!questionPanels[key]) await loadQuestionPanel(user)
  const panel = questionPanels[key]
  if (!panel || panel.loading) return
  const next = panel.current + delta
  if (next < 1 || next > panel.total) return
  const sessionId = currentSession.value?.sessionId
  if (!sessionId) return
  await switchQuestionVersion(panel, next, sessionId)
}

const handleJumpLatest = async (user: UnifiedChatMessageRespVO) => {
  const key = String(user.id)
  if (questionPanels[key]?.loading || switchingPager.value) return
  if (!questionPanels[key]) await loadQuestionPanel(user)
  const panel = questionPanels[key]
  if (!panel || panel.loading) return
  const sessionId = currentSession.value?.sessionId
  if (!sessionId) return
  await switchQuestionVersion(panel, panel.total, sessionId)
}

const handleRegenerate = async (messageId: ChatId) => {
  if (sending.value) return
  // KNOWLEDGE：走流式 regenerate-stream，带乐观清空回答与失败回滚
  if (mode.value === 'KNOWLEDGE') {
    const assistant = messages.value.find((item) => String(item.id) === String(messageId))
    const user = assistant
      ? messages.value.find((item) => String(item.id) === String(assistant.parentId))
      : undefined
    if (!assistant || !user) {
      message.warning('未找到对应的问题与回答，请刷新后重试')
      return
    }
    await runRerunStream({ op: 'REGENERATE', user, assistant })
    return
  }
  // QUERY：保持同步
  sending.value = true
  try {
    await regenerateUnifiedChat({
      mode: mode.value,
      messageId,
      modelConfigId: form.modelConfigId || undefined
    })
    message.success('已重新生成，旧版本保留在历史版本中')
    clearQuestionPanels()
    if (currentSession.value) {
      await loadMessages(mode.value, currentSession.value.sessionId)
    }
    void loadSessions()
  } catch {
    // 拦截器已提示
  } finally {
    sending.value = false
  }
}

/**
 * 赞踩状态要同时写入主链消息和版本面板里的副本。
 * 翻过版本后卡片渲染的是 questionPanels 里的对象，只改主链会导致按钮状态不变，
 * 第二次点击仍按旧 rating 算出「点赞」，提示也就一直是已点赞。
 */
const applyRating = (messageId: ChatId, rating: number) => {
  for (const item of messages.value) {
    if (String(item.id) === String(messageId)) item.rating = rating
  }
  for (const panel of Object.values(questionPanels)) {
    for (const item of panel.list) {
      if (String(item.id) === String(messageId)) item.rating = rating
    }
  }
}

const handleRate = async (messageId: ChatId, rating: number) => {
  const target = messages.value.find((item) => String(item.id) === String(messageId))
  const previous = target?.rating ?? 0
  applyRating(messageId, rating)
  try {
    await rateUnifiedMessage({ mode: mode.value, messageId, rating })
    message.success(
      rating === 1 ? '已点赞，感谢反馈' : rating === -1 ? '已点踩，感谢反馈' : '已取消评价'
    )
  } catch {
    applyRating(messageId, previous)
    message.error('评价保存失败，已恢复原状态')
  }
}

// ==================== 历史版本 ====================
const versionsVisible = ref(false)
const versionsLoading = ref(false)
const versionList = ref<UnifiedChatMessageRespVO[]>([])
const versionIndex = ref(0)
const versionsMessageId = ref<ChatId>()
const switchingVersion = ref(false)
const selectedVersion = computed<UnifiedChatMessageRespVO | undefined>(
  () => versionList.value[versionIndex.value]
)

const handleVersions = async (messageId: ChatId) => {
  versionsVisible.value = true
  versionsLoading.value = true
  versionList.value = []
  versionIndex.value = 0
  versionsMessageId.value = messageId
  try {
    versionList.value = await getUnifiedMessageVersions(mode.value, messageId)
    const idx = versionList.value.findIndex((item) => item.active)
    versionIndex.value = idx >= 0 ? idx : 0
  } finally {
    versionsLoading.value = false
  }
}

const handleSwitchVersion = async () => {
  const target = selectedVersion.value
  const sessionId = currentSession.value?.sessionId
  if (!target?.id || !sessionId || switchingVersion.value) return
  switchingVersion.value = true
  try {
    await switchUnifiedVersion({
      mode: mode.value,
      sessionId,
      targetMessageId: target.id
    })
    message.success('已切换版本，会话主链已更新')
    clearQuestionPanels()
    await loadMessages(mode.value, sessionId)
    if (target.parentId) await highlightAnchor(target.parentId)
    if (versionsMessageId.value != null) {
      versionList.value = await getUnifiedMessageVersions(mode.value, versionsMessageId.value)
      const idx = versionList.value.findIndex((item) => String(item.id) === String(target.id))
      versionIndex.value = idx >= 0 ? idx : 0
    }
    void loadSessions()
  } catch {
    // 拦截器已提示
  } finally {
    switchingVersion.value = false
  }
}

// ==================== 引用与检索调试 ====================
const refDrawerVisible = ref(false)
const refDrawerLoading = ref(false)
const chunkLoadFailed = ref(false)
const currentRef = ref<KnowledgeReference>()
const currentChunk = ref<AiKnowledgeChunkVO>()

const handleOpenRef = async (ref: KnowledgeReference) => {
  currentRef.value = ref
  currentChunk.value = undefined
  chunkLoadFailed.value = false
  refDrawerVisible.value = true
  refDrawerLoading.value = true
  try {
    currentChunk.value = await getAiKnowledgeChunk(ref.chunkId)
  } catch {
    chunkLoadFailed.value = true
  } finally {
    refDrawerLoading.value = false
  }
}

const previewVisible = ref(false)
const previewLoading = ref(false)
const preview = ref<RetrievePreviewRespVO>()
/** 文档版本水位：留空取当前生效版；填 N 回退到 version<=N 的最高版本 */
const previewVersion = ref<number | undefined>(undefined)
/** 记住上次调试的问题，供「按此版本重查」复用 */
const lastPreviewQuestion = ref('')

const handleRetrievePreview = async (question: string) => {
  if (mode.value !== 'KNOWLEDGE') {
    message.warning('检索调试仅知识库模式可用')
    return
  }
  if (!form.baseId) {
    message.warning('请先选择知识库')
    return
  }
  lastPreviewQuestion.value = question
  previewVisible.value = true
  previewLoading.value = true
  preview.value = undefined
  try {
    preview.value = await retrievePreview({
      baseId: form.baseId,
      question,
      version: previewVersion.value || undefined
    })
  } catch {
    // 拦截器已提示
  } finally {
    previewLoading.value = false
  }
}

// ==================== 工具与初始化 ====================
const formatTime = (value?: string): string => {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 19)
}

onMounted(async () => {
  await loadResources()
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
  flex: none;
  flex-direction: column;
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

.mode-badge {
  padding: 0 4px;
  margin-right: 6px;
  font-size: 10px;
  line-height: 16px;
  border-radius: 3px;
  flex: none;
}

.mode-badge.is-query {
  color: #2f6fed;
  background: #eaf1ff;
}

.mode-badge.is-knowledge {
  color: #0b7f63;
  background: #e7f7f1;
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

.head-controls {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
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

.stage-box {
  padding: 10px 12px;
  margin-top: 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.stage-list {
  max-height: 160px;
  margin-top: 8px;
  overflow: auto;
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

.stopped-notice {
  margin-top: 8px;
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

/* 流式正文临时气泡：问题先落位，回答按 delta 逐字生长 */
.streaming-turn {
  margin-bottom: 14px;
}

.streaming-question {
  width: fit-content;
  max-width: 80%;
  padding: 10px 14px;
  margin-bottom: 10px;
  margin-left: auto;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-color-white);
  background: var(--el-color-primary);
  border-radius: 8px;
}

.streaming-turn .msg-pending {
  margin-bottom: 0;
}

.streaming-answer {
  align-items: flex-start;
  max-width: calc(100% - 40px);
  min-height: 34px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.streaming-answer-text {
  line-height: 1.7;
  color: var(--el-text-color-primary);
}

.streaming-caret {
  display: inline-block;
  flex: none;
  width: 2px;
  height: 15px;
  margin-top: 2px;
  background: var(--el-color-primary);
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

.version-item {
  padding: 8px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.version-item:hover {
  background: var(--el-fill-color-light);
}

.version-item.is-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
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
