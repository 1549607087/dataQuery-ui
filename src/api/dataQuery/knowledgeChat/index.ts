import request from '@/config/axios'

/**
 * 引用溯源项
 *
 * refNo 与回答正文中的 `[n]` 一一对应：服务端 CitationValidator 会删除越界编号，
 * 因此 references 中只包含真实参与生成的切片。
 * content 由服务端截断到 1000 字，需要完整正文时用 knowledgeChunk 的 /get 取。
 */
export interface KnowledgeReference {
  /** 引用编号 1..K */
  refNo: number
  chunkId: number
  documentId: number
  fileName: string
  chunkIndex: number
  /** PDF 页码，TXT / MD 为 null */
  pageNo?: number | null
  headingPath?: string
  charStart?: number
  charEnd?: number
  /** 切片正文（截断） */
  content: string
}

/** 提问请求：baseId 必填；sessionId 不传则新建会话 */
export interface KnowledgeChatAskReqVO {
  baseId: number
  sessionId?: number
  /** 用户问题，上限 500 字 */
  question: string
  /** 可选，仅作路由偏好，仍受 RAG 场景候选集约束 */
  modelConfigId?: number
}

/** 提问响应：同步返回回答与引用，5 种终态都会给出 answer */
export interface KnowledgeChatAskRespVO {
  sessionId: number
  sessionNo?: string
  traceId?: string
  baseId: number
  baseName?: string
  question: string
  /** DONE / CLARIFY / REJECT / DEGRADED / FAILED */
  status: string
  answer: string
  references?: KnowledgeReference[]
  /** VECTOR / HYBRID / KEYWORD_DEGRADED / EMPTY */
  recallMode?: string
  recallDegraded?: boolean
  recallDegradeReason?: string
  retrievedCount?: number
  citationDroppedCount?: number
  promptVersionId?: number
  modelId?: string
  modelConfigId?: number
  latencyMs?: number
  errorCode?: number
  errorMsg?: string
  degradeReason?: string
  /** 落库失败为 null */
  userMessageId?: number
  assistantMessageId?: number
}

/** 会话消息（当前主链，按 seq 升序） */
export interface KnowledgeChatMessageRespVO {
  id: number
  /** USER / ASSISTANT */
  role: string
  parentId?: number
  version?: number
  seq?: number
  active?: boolean
  question?: string
  answer?: string
  references?: KnowledgeReference[]
  recallMode?: string
  recallDegraded?: boolean
  retrievedCount?: number
  citationDroppedCount?: number
  latencyMs?: number
  status?: string
  errorCode?: string
  errorMsg?: string
  /** 赞踩，本期不接（后端已预留） */
  rating?: number
  traceId?: string
  createTime?: string
}

/** 会话 */
export interface KnowledgeSessionRespVO {
  id: number
  baseId: number
  title?: string
  sessionNo?: string
  /** 固定 RAG */
  sceneCode?: string
  /** 1 进行中 / 2 已结束 */
  status?: number
  messageCount?: number
  lastQuestion?: string
  lastAskTime?: string
  currentLeafId?: number
  createTime?: string
}

/**
 * 会话分页请求
 *
 * 注意：Controller 当前只把 baseId 传给 service，title 未参与查询，
 * 因此标题搜索由前端对当前页做过滤（不是服务端模糊匹配）。
 */
export interface KnowledgeSessionPageReqVO extends PageParam {
  baseId?: number
  title?: string
}

export interface KnowledgeSessionRenameReqVO {
  sessionId: number
  title: string
}

const BASE_URL = '/data-query/knowledge-chat'

/**
 * 知识库问答（同步）
 *
 * 后端走完整 RAG 链路（召回 → 提示词装配 → 模型调用 → 引用校验），
 * 没有 SSE，因此超时放宽到 90s。
 */
export const askKnowledgeChat = (data: KnowledgeChatAskReqVO) =>
  request.post({ url: `${BASE_URL}/ask`, data, timeout: 90000 })

/** 我的会话分页（服务端固化 userId） */
export const getKnowledgeChatSessionPage = (params: KnowledgeSessionPageReqVO) =>
  request.get({ url: `${BASE_URL}/session/page`, params })

export const getKnowledgeChatSession = (id: number) =>
  request.get({ url: `${BASE_URL}/session/get`, params: { id } })

export const renameKnowledgeChatSession = (data: KnowledgeSessionRenameReqVO) =>
  request.put({ url: `${BASE_URL}/session/rename`, data })

/** 注意：参数名是 id，不是 sessionId */
export const deleteKnowledgeChatSession = (id: number) =>
  request.delete({ url: `${BASE_URL}/session/delete`, params: { id } })

/** 会话消息历史（当前主链） */
export const getKnowledgeChatMessageList = (sessionId: number) =>
  request.get({ url: `${BASE_URL}/message/list`, params: { sessionId } })
