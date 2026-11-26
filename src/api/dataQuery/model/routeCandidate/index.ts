import request from '@/config/axios'

/** 模型路由候选：补齐权重 / 成本优先策略所需的候选集 */
export interface AiModelRouteCandidateVO {
  id: number | undefined
  /** 关联 ai_model_scene_binding.id */
  bindingId: number | undefined
  /** 关联 ai_model_config.id */
  modelId: number | undefined
  /** 关联 ai_model_provider.id，用于跨供应商校验 */
  providerId: number | undefined
  weight: number
  priority: number
  maxQps: number
  /** 是否参与路由：0 否、1 是 */
  enabled: number
  sort: number
  remark: string
  tenantId?: number
  createTime?: string
}

export interface AiModelRouteCandidatePageReqVO extends PageParam {
  bindingId?: number
  modelId?: number
  providerId?: number
  enabled?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-model-route-candidate'

export const getAiModelRouteCandidatePage = (params: AiModelRouteCandidatePageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiModelRouteCandidate = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

/** 按场景绑定读取候选链（路由预览的运行时数据源） */
export const getAiModelRouteCandidateListByBinding = (bindingId: number) =>
  request.get({ url: `${BASE_URL}/list-by-binding`, params: { bindingId } })

export const createAiModelRouteCandidate = (data: AiModelRouteCandidateVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiModelRouteCandidate = (data: AiModelRouteCandidateVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const deleteAiModelRouteCandidate = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiModelRouteCandidateList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiModelRouteCandidate = (params: AiModelRouteCandidatePageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
