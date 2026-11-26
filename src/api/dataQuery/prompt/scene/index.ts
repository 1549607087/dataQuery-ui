import request from '@/config/axios'

/** 提示词场景字典 */
export interface AiPromptSceneVO {
  id: number | undefined
  sceneCode: string
  sceneName: string
  description: string
  /** 默认占位符集合，JSON 数组字符串 */
  defaultVariables: string
  defaultModelType: number
  status: number
  sort: number
  remark: string
  createTime?: string
}

export interface AiPromptScenePageReqVO extends PageParam {
  sceneCode?: string
  sceneName?: string
  status?: number
  defaultModelType?: number
  createTime?: string[]
}

export interface AiPromptSceneSimpleVO {
  sceneCode: string
  sceneName: string
  defaultVariables: string
  defaultModelType: number
}

const BASE_URL = '/data-query/ai-prompt-scene'

export const getAiPromptScenePage = (params: AiPromptScenePageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiPromptScene = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const getAiPromptSceneByCode = (sceneCode: string) =>
  request.get({ url: `${BASE_URL}/get-by-code`, params: { sceneCode } })

export const getAiPromptSceneSimpleList = () =>
  request.get({ url: `${BASE_URL}/simple-list` })

export const createAiPromptScene = (data: AiPromptSceneVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiPromptScene = (data: AiPromptSceneVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const updateAiPromptSceneStatus = (id: number, status: number) =>
  request.put({ url: `${BASE_URL}/update-status`, params: { id, status } })

export const deleteAiPromptScene = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiPromptSceneList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiPromptScene = (params: AiPromptScenePageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
