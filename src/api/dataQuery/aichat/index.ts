import request from '@/config/axios'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getAccessToken } from '@/utils/auth'
import { config } from '@/config/axios/config'

export const BASE_URL = '/data-query/ai-chat'

/** S7 只读查询结果（与后端 framework/sqlguard/QueryResult 对齐） */
export interface QueryResult {
  auditId?: number
  traceId?: string
  executedSql?: string
  columnNames?: string[]
  columnTypes?: string[]
  /** 按 columnNames 顺序的行数据，已按脱敏规则处理 */
  rows?: any[][]
  rowCount?: number
  truncated?: boolean
  masked?: boolean
  readonlyConnection?: boolean
  latencyMs?: number
  recallMode?: string
  warnings?: string[]
}

/** S8 规则图表推荐，前端复用 queryResult.rows 渲染，不触发二次查询 */
export interface ChartSpec {
  /** line / bar / pie / metric / table / none */
  type?: string
  renderable?: boolean
  title?: string
  xField?: string
  yFields?: string[]
  aggregation?: string
  rowCount?: number
  reason?: string
}

/** ask 请求：只允许 question / datasourceId / sessionId / sceneCode / modelConfigId */
export interface AiChatAskReqVO {
  question: string
  datasourceId: number
  sessionId?: number
  sceneCode?: string
  /** 对话页「选择模型」：指定模型配置编号；为空时按场景绑定的路由策略自动选择 */
  modelConfigId?: number
}

/** ask 响应：终态 + 表格结果 + SQL + 可解释信息 */
export interface AiChatAskRespVO {
  /** DONE / CLARIFY / REJECT / DEGRADED / FAILED */
  status?: string
  sessionId?: number
  /** 兼容 P5 的 sessionId:traceId 组合串 */
  messageId?: string
  /** P7：本轮用户消息 / 助手消息编号（落库成功时非空，供重新生成、赞踩引用） */
  userMessageId?: number
  assistantMessageId?: number
  traceId?: string
  question?: string
  normalizedQuestion?: string
  intentCode?: string
  sql?: string
  generatedSql?: string
  executedSql?: string
  result?: QueryResult
  recallMode?: string
  recallDegraded?: boolean
  recallDegradeReason?: string
  recallTableCount?: number
  structVersion?: number
  promptVersionId?: number
  promptContentHash?: string
  modelId?: string
  modelConfigId?: number
  summary?: string
  degradeReason?: string
  chartSpec?: ChartSpec
  explain?: string
  errorCode?: number
  errorMsg?: string
  fixRounds?: number
  latencyMs?: number
}

/** SSE 阶段事件（事件名统一 stage，data 为该对象 JSON） */
export interface ChatStageEvent {
  stage?: string
  /** RUNNING / DONE / SKIPPED / ERROR / STOPPED（用户主动停止） */
  state?: string
  traceId?: string
  message?: string
  progress?: number
  payload?: Record<string, any>
  latencyMs?: number
  timestamp?: number
}

/** 反馈请求：userId / sessionId / reviewed 等由服务端从登录态与审计记录固化 */
export interface AiChatFeedbackReqVO {
  auditId: number
  /** 1~5，5 为最满意 */
  rating: number
  feedbackType?: string
  comment?: string
  /** 仅作人工审核参考，不会自动执行、不会改写线上提示词 */
  correctedSql?: string
}

/** 对话页可选模型：来自 SQL_GEN 场景候选集，首个即默认路由 */
export interface AiChatModelOption {
  modelConfigId: number
  name: string
  modelId: string
  /** 1 Chat、2 Embedding、3 Rerank、4 SQL 专用 */
  modelType?: number
  /** 0 否、1 是 */
  supportStream?: number
  /** 是否为当前场景默认首选（不指定模型时走它） */
  defaultModel?: boolean
}

/** 可选模型列表；后端场景未配置时会返回空数组（不报错），此时只能走默认路由 */
export const getChatModelOptions = async (): Promise<AiChatModelOption[]> => {
  return await request.get({ url: `${BASE_URL}/model-options` })
}

/** 同步问数：一次请求走完 S0~S9（服务端硬超时 60s，这里留出余量） */
export const askChat = async (data: AiChatAskReqVO): Promise<AiChatAskRespVO> => {
  return await request.post({ url: `${BASE_URL}/ask`, data, timeout: 90000 })
}

/** 提交问数结果反馈 */
export const submitChatFeedback = async (data: AiChatFeedbackReqVO): Promise<number> => {
  return await request.post({ url: `${BASE_URL}/feedback`, data })
}

export interface ChatStreamHandlers {
  /** 每收到一个阶段事件回调一次 */
  onStage: (event: ChatStageEvent) => void
  /** 连接层面的错误（非业务终态），参数为可直接展示的文案 */
  onError: (message: string) => void
  /** 服务端正常关闭连接（通常已先发出 done / error 事件） */
  onClose: () => void
}

/**
 * 流式问数：POST + JSON body 的 SSE，浏览器原生 EventSource 只支持 GET，必须用 fetch 流式读取。
 *
 * 三个必须注意的点：
 * 1. 不能依赖 EventSource 的自动重连——后端一次 ask 会产生审计与查询，重连会重复执行；
 *    这里 onerror 直接抛出让 fetch-event-source 停止重试。
 * 2. 服务端正常关闭连接时必须提供 onclose，否则该库会当成断线并重连。
 * 3. 权限不足 / 参数校验失败时后端返回的是普通 JSON 而非 SSE，需要在 onopen 里识别并取出 msg。
 */
export const askChatStream = async (
  data: AiChatAskReqVO,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> => {
  const token = getAccessToken()
  await fetchEventSource(`${config.base_url}${BASE_URL}/ask-stream`, {
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
        let msg = `流式问数请求失败（HTTP ${res.status}）`
        try {
          const body = await res.json()
          if (body?.msg) msg = body.msg
        } catch {
          // 非 JSON 响应体：保留默认文案
        }
        throw new Error(msg)
      }
    },
    onmessage(msg) {
      if (!msg.data) return
      // 事件名统一为 stage；忽略心跳等其它事件
      if (msg.event && msg.event !== 'stage') return
      try {
        handlers.onStage(JSON.parse(msg.data) as ChatStageEvent)
      } catch {
        handlers.onError('阶段事件解析失败，已忽略该事件')
      }
    },
    onerror(err) {
      // 抛出即停止重试，避免重复触发问数与审计
      throw err
    },
    onclose() {
      handlers.onClose()
    }
  })
}

// ==================== P7：会话 / 消息 / 重新生成 / 修改问题 / 赞踩 ====================

/** 会话（后端直接返回 AiQuerySession 实体，字段以此为准） */
export interface AiQuerySession {
  id?: number
  userId?: number
  datasourceId?: number
  title?: string
  sessionNo?: string
  sceneCode?: string
  /** 0 进行中 / 1 已结束（以 DDL 注释为准） */
  status?: number
  messageCount?: number
  lastQuestion?: string
  lastAskTime?: string
  traceId?: string
  remark?: string
  createTime?: string
  updateTime?: string
}

/** 对话消息：USER 提问 / ASSISTANT 回答快照 */
export interface ChatMessageRespVO {
  id?: number
  /** USER / ASSISTANT */
  role?: string
  /** ASSISTANT 指向对应 USER；USER 为 0 */
  parentId?: number
  /** 同一问题重新生成 / 修改后递增 */
  version?: number
  seq?: number
  /** 是否当前主链；false 为历史版本 */
  active?: boolean
  question?: string
  answer?: string
  generatedSql?: string
  executedSql?: string
  result?: QueryResult
  chartSpec?: ChartSpec
  explain?: string
  /** DONE / CLARIFY / REJECT / DEGRADED / FAILED */
  status?: string
  /** 注意：消息表里 error_code 是 varchar，这里是字符串，与 ask 响应的数字错误码不同 */
  errorCode?: string
  errorMsg?: string
  /** -1 踩 / 0 未评价 / 1 赞 */
  rating?: number
  traceId?: string
  auditId?: number
  createTime?: string
  /** 回答历史版本（仅查版本时可能返回） */
  alternatives?: ChatMessageRespVO[]
}

export interface ChatSessionPageReqVO {
  pageNo?: number
  pageSize?: number
  title?: string
}

export interface ChatSessionRenameReqVO {
  sessionId: number
  title: string
}

export interface ChatRegenerateReqVO {
  /** 要重新生成的助手消息编号 */
  messageId: number
  /** 可选：为空时沿用原消息的数据源 */
  datasourceId?: number
  /** 可选：对话页当前选中的模型；为空按场景默认路由 */
  modelConfigId?: number
}

export interface ChatEditReqVO {
  /** 要修改的用户消息编号 */
  messageId: number
  question: string
  datasourceId?: number
  /** 可选：对话页当前选中的模型；为空按场景默认路由 */
  modelConfigId?: number
}

export interface ChatRatingReqVO {
  /** 助手消息编号 */
  messageId: number
  /** -1 踩 / 0 取消 / 1 赞 */
  rating: number
}

/** 切换版本请求：把某条历史消息（问题 USER 或回答 ASSISTANT）激活为当前分支 */
export interface ChatSwitchVersionReqVO {
  sessionId: number
  /** 目标版本消息编号，来自 versions / question-versions 列表 */
  targetMessageId: number
}

/** 我的会话列表（服务端固化 userId） */
export const getChatSessionPage = async (
  params: ChatSessionPageReqVO
): Promise<{ list: AiQuerySession[]; total: number }> => {
  return await request.get({ url: `${BASE_URL}/conversation/session/page`, params })
}

/** 会话改名 */
export const renameChatSession = async (data: ChatSessionRenameReqVO): Promise<boolean> => {
  return await request.put({ url: `${BASE_URL}/conversation/session/rename`, data })
}

/** 删除会话（级联软删消息） */
export const deleteChatSession = async (sessionId: number): Promise<boolean> => {
  return await request.delete({
    url: `${BASE_URL}/conversation/session/delete`,
    params: { sessionId }
  })
}

/** 会话消息历史（当前主链，按 seq 升序） */
export const getChatMessageList = async (sessionId: number): Promise<ChatMessageRespVO[]> => {
  return await request.get({ url: `${BASE_URL}/conversation/message/list`, params: { sessionId } })
}

/** 某轮回答的全部版本（含历史，只读查看） */
export const getChatMessageVersions = async (messageId: number): Promise<ChatMessageRespVO[]> => {
  return await request.get({
    url: `${BASE_URL}/conversation/message/versions`,
    params: { messageId }
  })
}

/**
 * 某一轮问题的全部版本（USER + 各自的 ASSISTANT，含已退出主链的旧版本）。
 * 供对话气泡下方「‹ 2/3 ›」翻页器使用：同一 seq 下每次修改问题都会新增一个 USER 版本。
 */
export const getChatQuestionVersions = async (
  sessionId: number,
  seq: number
): Promise<ChatMessageRespVO[]> => {
  return await request.get({
    url: `${BASE_URL}/conversation/message/question-versions`,
    params: { sessionId, seq }
  })
}

/** 重新生成：以原问题重跑整条链路，旧版本作废（同步接口，无 SSE 版本） */
export const regenerateChat = async (data: ChatRegenerateReqVO): Promise<AiChatAskRespVO> => {
  return await request.post({ url: `${BASE_URL}/conversation/regenerate`, data, timeout: 90000 })
}

/** 修改问题：改写后从该轮重跑，生成新分支（同步接口，无 SSE 版本） */
export const editChat = async (data: ChatEditReqVO): Promise<AiChatAskRespVO> => {
  return await request.post({ url: `${BASE_URL}/conversation/edit`, data, timeout: 90000 })
}

/** 赞踩：-1 踩 / 0 取消 / 1 赞（幂等，仅助手消息） */
export const rateChatMessage = async (data: ChatRatingReqVO): Promise<boolean> => {
  return await request.post({ url: `${BASE_URL}/conversation/rating`, data })
}

/**
 * 切换版本：把目标消息激活为当前分支叶子（后端树模型，仅改选中与 current_leaf_id，不重跑链路）。
 * target 可为回答版本（ASSISTANT）或问题版本（USER），服务端按其 parent/role/seq 定位兄弟组。
 */
export const switchChatVersion = async (data: ChatSwitchVersionReqVO): Promise<boolean> => {
  return await request.put({ url: `${BASE_URL}/conversation/message/versions`, data })
}

// ==================== 统一渲染视图 ====================

/**
 * 结果卡片的统一输入：同时承接 ask 响应（P5/P6）与已落库消息（P7）。
 * 两者的差异只在字段来源与错误码类型（响应是数字、消息表是字符串），统一成宽松视图后
 * 卡片不必关心数据来自实时响应还是历史消息。
 */
export interface ChatAnswerView {
  status?: string
  sessionId?: number
  messageId?: string
  traceId?: string
  question?: string
  /** 意图编码（仅实时响应有，历史消息为空） */
  intentCode?: string
  sql?: string
  generatedSql?: string
  executedSql?: string
  result?: QueryResult
  recallMode?: string
  recallDegraded?: boolean
  recallDegradeReason?: string
  recallTableCount?: number
  structVersion?: number
  promptVersionId?: number
  modelId?: string
  summary?: string
  degradeReason?: string
  chartSpec?: ChartSpec
  explain?: string
  errorCode?: string | number
  errorMsg?: string
  fixRounds?: number
  latencyMs?: number
}

/** ask / regenerate / edit 的响应直接可用（字段更全，缺省项由卡片显示为 -） */
export const toAnswerView = (resp: AiChatAskRespVO): ChatAnswerView => resp

/** 已落库消息转统一视图：补 sql、把顶层 auditId 合并进 result，便于复用反馈区 */
export const messageToAnswerView = (msg: ChatMessageRespVO): ChatAnswerView => {
  const result = msg.result
    ? { ...msg.result, auditId: msg.result.auditId ?? msg.auditId }
    : undefined
  return {
    status: msg.status,
    messageId: msg.id ? String(msg.id) : undefined,
    traceId: msg.traceId,
    question: msg.question,
    sql: msg.executedSql || msg.generatedSql,
    generatedSql: msg.generatedSql,
    executedSql: msg.executedSql,
    result,
    recallMode: result?.recallMode,
    chartSpec: msg.chartSpec ?? undefined,
    explain: msg.explain ?? undefined,
    summary: msg.answer ?? undefined,
    errorCode: msg.errorCode,
    errorMsg: msg.errorMsg
  }
}
