import request from '@/config/axios'

/** 模型场景绑定（路由与降级） */
export interface AiModelSceneBindingVO {
  id: number | undefined
  sceneCode: string
  sceneName: string
  primaryModelId: number | undefined
  /** 降级链：模型 ID 逗号分隔，按顺序尝试 */
  fallbackModelIds: string
  routeStrategy: number
  promptId: number | undefined
  temperatureOverride: number | undefined
  enabled: number
  /** M1 治理：场景级覆盖，NULL 表示继承模型默认值 */
  timeoutMsOverride?: number | null
  qpsLimitOverride?: number | null
  concurrentLimitOverride?: number | null
  retryCountOverride?: number | null
  /** 降级链是否强制跨供应商：0 否、1 是 */
  fallbackCrossProvider: number
  /** 单次请求最多降级跳数 */
  fallbackMaxDepth: number
  /** 场景级灰度比例 0-100，优先于模型配置 */
  grayRatio: number
  grayBucketKey: string
  /** 当前生效的灰度实验，留空表示无实验 */
  grayExperimentId: number | undefined
  sort: number
  remark: string
  createTime?: string
}

export interface AiModelSceneBindingPageReqVO extends PageParam {
  sceneCode?: string
  sceneName?: string
  primaryModelId?: number
  enabled?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-model-scene-binding'

export const getAiModelSceneBindingPage = (params: AiModelSceneBindingPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiModelSceneBinding = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const getAiModelSceneBindingByScene = (sceneCode: string) =>
  request.get({ url: `${BASE_URL}/get-by-scene`, params: { sceneCode } })

export const createAiModelSceneBinding = (data: AiModelSceneBindingVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiModelSceneBinding = (data: AiModelSceneBindingVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const updateAiModelSceneBindingEnabled = (id: number, enabled: number) =>
  request.put({ url: `${BASE_URL}/update-enabled`, params: { id, enabled } })

export const deleteAiModelSceneBinding = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiModelSceneBindingList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiModelSceneBinding = (params: AiModelSceneBindingPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
