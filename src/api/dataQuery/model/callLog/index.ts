import request from '@/config/axios'

/** 模型调用日志（只读，后端未提供增删改接口） */
export interface AiModelCallLogVO {
  id: number
  traceId: string
  conversationId: number
  sceneCode: string
  providerId: number
  modelConfigId: number
  modelId: string
  requestTokens: number
  responseTokens: number
  totalTokens: number
  cost: number
  latencyMs: number
  status: number
  fallbackFromModelId: number
  errorCode: string
  errorMsg: string
  userId: number
  tenantId: number
  /** M1 治理埋点：灰度 / 重试 / 降级 / 熔断 / 错误分类 */
  isGray: number
  grayGroup: string
  grayExperimentId: number
  grayBucketKey: string
  retryOfTraceId: string
  retryIndex: number
  fallbackDepth: number
  routeStrategy: number
  circuitState: string
  circuitKey: string
  errorCategory: string
  queueWaitMs: number
  requestId: string
  createTime: string
}

export interface AiModelCallLogPageReqVO extends PageParam {
  traceId?: string
  conversationId?: number
  sceneCode?: string
  modelConfigId?: number
  modelId?: string
  status?: number
  userId?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-model-call-log'

export const getAiModelCallLogPage = (params: AiModelCallLogPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiModelCallLog = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const exportAiModelCallLog = (params: AiModelCallLogPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
