import request from '@/config/axios'

/** 查询审计（append-only，管理端只读，后端仅提供 page / get / export） */
export interface AiQueryAuditVO {
  id: number
  sessionId: number
  userId: number
  datasourceId: number
  traceId: string
  question: string
  normalizedQuestion: string
  intentCode: string
  recalledTables: string
  promptVersionId: number
  modelConfigId: number
  generatedSql: string
  validatedSql: string
  executedSql: string
  sqlStatus: string
  resultRows: number
  resultTruncated: number
  latencyMs: number
  status: number
  errorCode: string
  errorMsg: string
  readonlyConnection: number
  clientIp: string
  createTime: string
}

export interface AiQueryAuditPageReqVO extends PageParam {
  sessionId?: number
  userId?: number
  datasourceId?: number
  traceId?: string
  intentCode?: string
  sqlStatus?: string
  status?: number
  readonlyConnection?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-query-audit'

export const getAiQueryAuditPage = (params: AiQueryAuditPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiQueryAudit = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const exportAiQueryAudit = (params: AiQueryAuditPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
