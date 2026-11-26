import request from '@/config/axios'

/** 灰度实验：一次实验只允许一个变量（MODEL 或 PROMPT），避免归因污染 */
export interface AiModelGrayExperimentVO {
  id: number | undefined
  name: string
  /** MODEL / PROMPT */
  grayObject: string
  sceneCode: string
  /** 关联 ai_model_scene_binding.id */
  bindingId: number | undefined
  /** 对照组 A 模型，关联 ai_model_config.id */
  baselineModelId: number | undefined
  /** 灰度组 B 模型，关联 ai_model_config.id */
  grayModelId: number | undefined
  baselinePromptId: number | undefined
  grayPromptId: number | undefined
  /** 灰度组流量比例 0-100 */
  grayRatio: number
  /** TENANT / USER / SESSION */
  bucketKey: string
  /** 不填表示不限制；空值不提交，避免后端 LocalDateTime 反序列化空串 */
  startTime?: string
  endTime?: string
  minSampleSize: number
  /** 观察指标 JSON */
  metrics: string
  /** 0 草稿、1 进行中、2 已结束、3 已全量、4 已回滚 */
  status: number
  conclusion: string
  sort: number
  remark: string
  tenantId?: number
  createTime?: string
}

export interface AiModelGrayExperimentPageReqVO extends PageParam {
  name?: string
  grayObject?: string
  sceneCode?: string
  status?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-model-gray-experiment'

export const getAiModelGrayExperimentPage = (params: AiModelGrayExperimentPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiModelGrayExperiment = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const createAiModelGrayExperiment = (data: AiModelGrayExperimentVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiModelGrayExperiment = (data: AiModelGrayExperimentVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

/** 状态流转：开始 / 结束 / 全量 / 回滚 */
export const updateAiModelGrayExperimentStatus = (id: number, status: number) =>
  request.put({ url: `${BASE_URL}/update-status`, params: { id, status } })

export const deleteAiModelGrayExperiment = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const exportAiModelGrayExperiment = (params: AiModelGrayExperimentPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
