import request from '@/config/axios'

/** 路由预览：不发起模型调用，返回「这次请求会怎么走」 */
export interface ModelRoutePreviewReqVO {
  sceneCode: string
  userId?: number
  tenantId?: number
  conversationId?: number
  sessionId?: string
}

export interface ModelRoutePreviewCandidateVO {
  modelConfigId: number
  modelId: string
  name: string
  providerId: number
  status: number
  inputPrice: number
  outputPrice: number
  circuitEnabled: number
  circuitKey: string
}

/** 场景级覆盖优先于模型默认，NULL 表示继承，这里返回的是解析后的生效值 */
export interface ModelRoutePreviewEffectiveVO {
  timeoutMs: number
  qpsLimit: number
  concurrentLimit: number
  retryCount: number
  retryableErrors: string
  retryBaseBackoffMs: number
  retryMaxBackoffMs: number
  retryJitterRatio: number
  fallbackMaxDepth: number
  fallbackCrossProvider: number
}

export interface ModelRoutePreviewVO {
  sceneCode: string
  routeStrategy: number
  /** 是否命中候选表；false 表示回落解析旧 fallback_model_ids */
  fromCandidateTable: boolean
  gray: boolean
  grayGroup: string
  grayExperimentId: number
  grayBucketKey: string
  bucketValue: string
  promptIdOverride: number
  candidates: ModelRoutePreviewCandidateVO[]
  effective: ModelRoutePreviewEffectiveVO
}

/** 联调：走完整治理链路执行一次模型调用 */
export interface ModelInvokeReqVO {
  sceneCode: string
  prompt?: string
  traceId?: string
  conversationId?: number
  userId?: number
  tenantId?: number
  sessionId?: string
}

/** echo=true 表示当前仍是占位客户端，尚未接入真实模型 */
export interface ModelInvocationResultVO {
  content: string
  requestTokens: number
  responseTokens: number
  totalTokens: number
  requestId: string
  modelId: string
  modelConfigId: number
  echo: boolean
  routeStrategy: number
  fallbackDepth: number
  isGray: number
  grayGroup: string
  traceId: string
  latencyMs: number
}

const BASE_URL = '/data-query/ai-model-governance'

export const getModelRoutePreview = (params: ModelRoutePreviewReqVO) =>
  request.get({ url: `${BASE_URL}/route-preview`, params })

export const invokeModel = (data: ModelInvokeReqVO) =>
  request.post({ url: `${BASE_URL}/invoke`, data })

/** 人工止血：重置指定熔断维度为 CLOSED 并清除限流 key */
export const resetModelCircuit = (circuitKey: string) =>
  request.put({ url: `${BASE_URL}/reset-circuit`, params: { circuitKey } })
