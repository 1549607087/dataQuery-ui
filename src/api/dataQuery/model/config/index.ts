import request from '@/config/axios'

/** 模型配置 */
export interface AiModelConfigVO {
  id: number | undefined
  providerId: number | undefined
  name: string
  modelId: string
  modelType: number
  /** 协议：Chat/Embedding/SQL 固定 OPENAI；Rerank 可选 DASHSCOPE / COHERE */
  protocol: string
  capability: string
  contextWindow: number
  maxOutputTokens: number
  defaultParams: string
  supportStream: number
  inputPrice: number
  outputPrice: number
  currency: string
  qpsLimit: number
  concurrentLimit: number
  timeoutMs: number
  retryCount: number
  status: number
  grayRatio: number
  /** M1 治理：熔断策略 */
  circuitEnabled: number
  circuitFailureRate: number
  circuitMinSample: number
  circuitWindowSeconds: number
  circuitOpenSeconds: number
  circuitHalfOpenProbes: number
  /** 熔断维度键，留空由后端按 provider_id:model_config_id 生成 */
  circuitKey: string
  /** M1 治理：重试策略 */
  retryableErrors: string
  retryBaseBackoffMs: number
  retryMaxBackoffMs: number
  retryJitterRatio: number
  /** 以下 3 个字段由后端维护，只展示不提交 */
  healthStatus?: number
  lastCheckTime?: string
  lastCheckResult?: string
  sort: number
  remark: string
  createTime?: string
}

export interface AiModelConfigPageReqVO extends PageParam {
  name?: string
  modelId?: string
  providerId?: number
  modelType?: number
  status?: number
  healthStatus?: number
  createTime?: string[]
}

export interface AiModelConfigSimpleVO {
  id: number
  name: string
  modelId: string
  modelType: number
  protocol: string
  supportStream: number
}

const BASE_URL = '/data-query/ai-model-config'

export const getAiModelConfigPage = (params: AiModelConfigPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiModelConfig = (id: number) => request.get({ url: `${BASE_URL}/get?id=${id}` })

export const getAiModelConfigSimpleList = (modelType?: number) =>
  request.get({ url: `${BASE_URL}/simple-list`, params: { modelType } })

export const createAiModelConfig = (data: AiModelConfigVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiModelConfig = (data: AiModelConfigVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const updateAiModelConfigStatus = (id: number, status: number) =>
  request.put({ url: `${BASE_URL}/update-status`, params: { id, status } })

export const deleteAiModelConfig = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiModelConfigList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiModelConfig = (params: AiModelConfigPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
