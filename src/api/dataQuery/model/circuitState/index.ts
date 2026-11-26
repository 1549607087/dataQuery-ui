import request from '@/config/axios'

/**
 * 熔断状态快照（只读 + 人工重置）
 * 运行时以 Redis 三态为准，DB 表只在状态跃迁时写一次，页面列表是审计 / 恢复快照
 */
export interface AiModelCircuitStateVO {
  id: number
  /** 关联 ai_model_config.id */
  modelConfigId: number
  /** 熔断维度键 provider_id:model_config_id */
  circuitKey: string
  /** CLOSED 闭合、OPEN 打开、HALF_OPEN 半开 */
  state: string
  windowStartTime?: string
  windowTotal: number
  windowFailed: number
  windowSucceeded: number
  /** 窗口失败率（百分比） */
  failureRate: number
  consecutiveFailures: number
  consecutiveSuccesses: number
  lastFailureTime?: string
  lastFailureCategory: string
  openedTime?: string
  openUntil?: string
  halfOpenProbes: number
  halfOpenSucceeded: number
  version: number
  remark: string
  updateTime?: string
  createTime?: string
}

export interface AiModelCircuitStatePageReqVO extends PageParam {
  circuitKey?: string
  state?: string
  modelConfigId?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-model-circuit-state'

export const getAiModelCircuitStatePage = (params: AiModelCircuitStatePageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiModelCircuitState = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

/** 按熔断维度键读取实时状态（Redis 优先） */
export const getAiModelCircuitStateByKey = (circuitKey: string) =>
  request.get({ url: `${BASE_URL}/get-by-key`, params: { circuitKey } })

/** 人工止血：重置为 CLOSED 并清除限流 key */
export const resetAiModelCircuitState = (circuitKey: string) =>
  request.put({ url: `${BASE_URL}/reset`, params: { circuitKey } })

export const exportAiModelCircuitState = (params: AiModelCircuitStatePageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
