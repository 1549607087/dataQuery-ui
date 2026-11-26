import request from '@/config/axios'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getAccessToken } from '@/utils/auth'
import { config } from '@/config/axios/config'
import type { ChartSpec, ChatStageEvent, QueryResult } from '@/api/dataQuery/aichat'
import type { KnowledgeReference } from '@/api/dataQuery/knowledgeChat'

/**
 * 统一对话 API（后端 UnifiedChatController）。
 *
 * 所有端点都用 mode=QUERY/KNOWLEDGE 路由到问数或知识库引擎：
 * - QUERY：resourceId 是 datasourceId；
 * - KNOWLEDGE：resourceId 是 baseId。
 * 两种模式的会话不能混用，续聊时 sessionId 必须与 mode 匹配，否则服务端拒绝。
 */
export const BASE_URL = '/data-query/chat'

export type ChatMode = 'QUERY' | 'KNOWLEDGE'
/** 雪花 ID 可能超过 JS 安全整数，ID 一律按原值透传，禁止 Number() 转换 */
export type ChatId = string | number

export interface UnifiedChatAskReqVO {
  mode: ChatMode
  question: string
  /** 不传则新建会话；切换 mode 必须新建，不能携带旧 sessionId */
  sessionId?: ChatId
  /** mode=QUERY 必填 */
  datasourceId?: ChatId
  /** mode=KNOWLEDGE 必填 */
  baseId?: ChatId
  modelConfigId?: ChatId
  /** 仅 QUERY 有效，默认 SQL_GEN */
  sceneCode?: string
  /** 仅 KNOWLEDGE 有效：文档版本水位，回退到 version<=N 的最高版本；不传取当前生效版 */
  version?: number
  /**
   * 客户端请求编号（最长 64）：流式提问时生成并携带，
   * 点「停止」时用同一个值调 cancel 定位在途请求；不传则本次提问不可取消。
   */
  clientRequestId?: string
}

export interface UnifiedChatAskRespVO {
  mode?: ChatMode
  status?: string
  sessionId?: ChatId
  sessionNo?: string
  traceId?: string
  userMessageId?: ChatId
  assistantMessageId?: ChatId
  question?: string
  normalizedQuestion?: string
  /** QUERY 为摘要，KNOWLEDGE 为 Markdown 回答 */
  answer?: string
  errorCode?: number
  errorMsg?: string
  degradeReason?: string
  latencyMs?: number

  // QUERY 专有
  sql?: string
  executedSql?: string
  result?: QueryResult
  chartSpec?: ChartSpec
  explain?: string
  intentCode?: string
  recallMode?: string
  recallTableCount?: number
  datasourceId?: ChatId

  // KNOWLEDGE 专有
  baseId?: ChatId
  baseName?: string
  references?: KnowledgeReference[]
  recallDegraded?: boolean
  retrievedCount?: number
  citationDroppedCount?: number
}

/** 会话列表项：两张会话表 UNION ALL，sessionId 必须配合 mode 定位 */
export interface UnifiedSessionRespVO {
  mode: ChatMode
  sessionId: ChatId
  title?: string
  lastQuestion?: string
  lastAskTime?: string
  messageCount?: number
  /** 后端 VO 注释：1 进行中 / 2 已结束；老问数表仍可能给 0/1 */
  status?: number
  traceId?: string
  /** QUERY 为 datasourceId，KNOWLEDGE 为 baseId */
  resourceId?: ChatId
  createTime?: string
}

export interface UnifiedSessionPageReqVO extends PageParam {
  /** 不传则两种模式聚合 */
  mode?: ChatMode
  title?: string
}

/** 统一消息：两种模式字段并集，role 区分提问 / 回答 */
export interface UnifiedChatMessageRespVO {
  mode?: ChatMode
  id: ChatId
  role: 'USER' | 'ASSISTANT' | string
  parentId?: ChatId
  version?: number
  seq?: number
  active?: boolean
  question?: string
  answer?: string
  rating?: number
  traceId?: string
  status?: string
  errorCode?: number | string
  errorMsg?: string
  createTime?: string

  // QUERY 专有
  generatedSql?: string
  executedSql?: string
  result?: QueryResult
  chartSpec?: ChartSpec
  explain?: string
  auditId?: ChatId

  // KNOWLEDGE 专有
  references?: KnowledgeReference[]
  recallMode?: string
  recallDegraded?: boolean
  retrievedCount?: number
  citationDroppedCount?: number
  latencyMs?: number
}

export interface UnifiedRenameReqVO {
  mode: ChatMode
  sessionId: ChatId
  title: string
}

export interface UnifiedSwitchVersionReqVO {
  mode: ChatMode
  sessionId: ChatId
  targetMessageId: ChatId
}

export interface UnifiedRegenerateReqVO {
  mode: ChatMode
  /** Regenerate 传助手消息 id */
  messageId: ChatId
  modelConfigId?: ChatId
  /** 流式重跑用：停止按钮与后端在途去重都依赖它 */
  clientRequestId?: string
}

export interface UnifiedEditReqVO {
  mode: ChatMode
  /** Edit 传用户消息 id */
  messageId: ChatId
  question: string
  modelConfigId?: ChatId
  /** 流式修改用：停止按钮与后端在途去重都依赖它 */
  clientRequestId?: string
}

export interface UnifiedRatingReqVO {
  mode: ChatMode
  messageId: ChatId
  rating: number
}

export interface RetrievePreviewReqVO {
  baseId: ChatId
  question: string
  topK?: number
  /** 文档版本水位：回退到 version<=N 的最高版本；不传取当前生效版本 */
  version?: number
}

export interface RetrievePreviewItemVO {
  refNo?: number
  chunkId?: ChatId
  documentId?: ChatId
  fileName?: string
  chunkIndex?: number
  pageNo?: number | null
  headingPath?: string
  score?: number
  content?: string
  [key: string]: any
}

export interface RetrievePreviewRespVO {
  mode?: string
  degraded?: boolean
  degradeReason?: string
  vectorCandidateCount?: number
  keywordCandidateCount?: number
  keptCount?: number
  truncated?: boolean
  tokenEstimate?: number
  contextText?: string
  latencyMs?: number
  /** 是否实际执行了 Rerank 精排 */
  rerankApplied?: boolean
  /** Rerank 未执行 / 降级原因 */
  rerankSkipReason?: string
  /** 本轮 Rerank 模型代号 */
  rerankModelCode?: string
  /** 本轮 Rerank 调用耗时（毫秒） */
  rerankLatencyMs?: number
  items?: RetrievePreviewItemVO[]
}

/** 统一同步提问；后端超时按 mode 取配置，这里留 90s 余量 */
export const askUnifiedChat = async (data: UnifiedChatAskReqVO): Promise<UnifiedChatAskRespVO> =>
  await request.post({ url: `${BASE_URL}/ask`, data, timeout: 90000 })

/**
 * 终态事件 payload（done / error / stopped 共用）。
 * KNOWLEDGE 带 op/version/persisted/消息 id；QUERY 只带 status/sessionId/response。
 * persisted=false 表示本轮按版本策略未落库，前端必须回滚乐观气泡。
 */
export interface ChatTerminalPayload {
  status?: string
  sessionId?: ChatId
  answer?: string
  response?: UnifiedChatAskRespVO
  op?: 'ASK' | 'REGENERATE' | 'EDIT'
  version?: number
  userMessageId?: ChatId
  assistantMessageId?: ChatId
  messageId?: ChatId
  persisted?: boolean
  stopReason?: string
  errorCode?: number
  references?: KnowledgeReference[]
  metrics?: { ttftMs?: number; deltaCount?: number; pushedChars?: number; totalMs?: number }
}

/** 知识库流式正文增量：event=delta，按 seq 顺序拼接 */
export interface ChatDeltaEvent {
  content: string
  seq: number
  traceId?: string
  timestamp?: number
}

export interface ChatStreamHandlers {
  onStage: (event: ChatStageEvent) => void
  /** 正文增量，仅 KNOWLEDGE 流式产生；QUERY 不出 delta */
  onDelta?: (event: ChatDeltaEvent) => void
  onError: (message: string, code?: number) => void
  onClose: () => void
}

/**
 * 统一流式请求底层：三个流式端点（ask / edit / regenerate）共用同一套 SSE 管线。
 * 不允许自动重连（重连会重复问数 / 重复写审计），所以 onerror 直接抛错停止。
 * HTTP 层错误（如 124 在途冲突、125 模式不支持）把原生 code 挂到 Error 上交给调用方。
 */
const streamChat = async (
  endpoint: string,
  data: object,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> => {
  const token = getAccessToken()
  await fetchEventSource(`${config.base_url}${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    openWhenHidden: true,
    body: JSON.stringify(data),
    signal,
    async onopen(res) {
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok || !contentType.includes('text/event-stream')) {
        let msg = `流式请求失败（HTTP ${res.status}）`
        let code: number | undefined
        try {
          const body = await res.json()
          if (body?.msg) msg = body.msg
          if (typeof body?.code === 'number') code = body.code
        } catch {
          // 非 JSON 响应体：保留默认文案
        }
        const err: any = new Error(msg)
        err.code = code
        throw err
      }
    },
    onmessage(msg) {
      if (!msg.data) return
      if (msg.event === 'delta') {
        if (!handlers.onDelta) return
        try {
          handlers.onDelta(JSON.parse(msg.data) as ChatDeltaEvent)
        } catch {
          handlers.onError('正文增量解析失败，已忽略该事件')
        }
        return
      }
      if (msg.event && msg.event !== 'stage') return
      try {
        handlers.onStage(JSON.parse(msg.data) as ChatStageEvent)
      } catch {
        handlers.onError('阶段事件解析失败，已忽略该事件')
      }
    },
    onerror(err: any) {
      // fetch-event-source 的 onerror 拿到的是我们 onopen 抛出的 Error（带原生 code）
      handlers.onError(err?.message || '流式连接异常', err?.code)
      throw err
    },
    onclose() {
      handlers.onClose()
    }
  })
}

export const askUnifiedChatStream = async (
  data: UnifiedChatAskReqVO,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> => streamChat('/ask-stream', data, handlers, signal)

/** 流式修改问题：KNOWLEDGE 专用，QUERY 调用会收到 125 错误 */
export const editUnifiedChatStream = async (
  data: UnifiedEditReqVO,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> => streamChat('/edit-stream', data, handlers, signal)

/** 流式重新生成：KNOWLEDGE 专用，QUERY 调用会收到 125 错误 */
export const regenerateUnifiedChatStream = async (
  data: UnifiedRegenerateReqVO,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> => streamChat('/regenerate-stream', data, handlers, signal)

/**
 * 停止回答：按 clientRequestId 取消在途的流式提问。
 *
 * 只对带 clientRequestId 的流式请求有效；请求已结束、id 不存在或后端未开启
 * 取消能力时返回 CHAT_CANCEL_NOT_FOUND，调用方据此提示「本轮可能已结束」。
 */
export const cancelUnifiedChat = async (clientRequestId: string): Promise<boolean> =>
  await request.post({ url: `${BASE_URL}/cancel`, params: { clientRequestId } })

// ==================== 会话 ====================

/** 我的会话列表：mode 不传则聚合两种模式，分页按最后提问时间倒序 */
export const getUnifiedSessionPage = async (
  params: UnifiedSessionPageReqVO
): Promise<{ list: UnifiedSessionRespVO[]; total: number }> =>
  await request.get({ url: `${BASE_URL}/session/page`, params })

export const renameUnifiedSession = async (data: UnifiedRenameReqVO): Promise<boolean> =>
  await request.put({ url: `${BASE_URL}/session/rename`, data })

export const deleteUnifiedSession = async (mode: ChatMode, sessionId: ChatId): Promise<boolean> =>
  await request.delete({ url: `${BASE_URL}/session/delete`, params: { mode, sessionId } })

// ==================== 消息与版本 ====================

/** 当前主链消息（按 seq 升序） */
export const getUnifiedMessageList = async (
  mode: ChatMode,
  sessionId: ChatId
): Promise<UnifiedChatMessageRespVO[]> =>
  await request.get({ url: `${BASE_URL}/message/list`, params: { mode, sessionId } })

/** 某轮回答的全部版本 */
export const getUnifiedMessageVersions = async (
  mode: ChatMode,
  messageId: ChatId
): Promise<UnifiedChatMessageRespVO[]> =>
  await request.get({ url: `${BASE_URL}/message/versions`, params: { mode, messageId } })

/**
 * 某一轮问题的全部版本（USER 各版本 + 各自 ASSISTANT），供问题气泡的 N/M 翻页器使用
 */
export const getUnifiedQuestionVersions = async (
  mode: ChatMode,
  sessionId: ChatId,
  seq: number
): Promise<UnifiedChatMessageRespVO[]> =>
  await request.get({
    url: `${BASE_URL}/message/question-versions`,
    params: { mode, sessionId, seq }
  })

/** 切换版本：只改兄弟选中与 current_leaf_id，不重跑链路 */
export const switchUnifiedVersion = async (data: UnifiedSwitchVersionReqVO): Promise<boolean> =>
  await request.put({ url: `${BASE_URL}/message/versions`, data })

// ==================== 重跑 / 修改 / 赞踩 ====================

export const regenerateUnifiedChat = async (
  data: UnifiedRegenerateReqVO
): Promise<UnifiedChatAskRespVO> =>
  await request.post({ url: `${BASE_URL}/regenerate`, data, timeout: 90000 })

export const editUnifiedChat = async (data: UnifiedEditReqVO): Promise<UnifiedChatAskRespVO> =>
  await request.post({ url: `${BASE_URL}/edit`, data, timeout: 90000 })

export const rateUnifiedMessage = async (data: UnifiedRatingReqVO): Promise<boolean> =>
  await request.post({ url: `${BASE_URL}/rating`, data })

// ==================== 检索调试（仅 KNOWLEDGE 有意义） ====================

export const retrievePreview = async (data: RetrievePreviewReqVO): Promise<RetrievePreviewRespVO> =>
  await request.post({ url: `${BASE_URL}/retrieve-preview`, data, timeout: 90000 })
