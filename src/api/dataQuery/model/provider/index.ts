import request from '@/config/axios'

/** 模型供应商（接入凭证） */
export interface AiModelProviderVO {
  id: number | undefined
  name: string
  code: string
  protocol: string
  baseUrl: string
  /** 密钥不回显：新增时填写，修改时留空表示不修改 */
  apiKey: string
  apiSecret: string
  headers: string
  proxyUrl: string
  dailyTokenLimit: number
  monthlyBudget: number
  status: number
  sort: number
  remark: string
  createTime: string
}

export interface AiModelProviderPageReqVO extends PageParam {
  name?: string
  code?: string
  protocol?: string
  status?: number
  createTime?: string[]
}

export interface AiModelProviderSimpleVO {
  id: number
  name: string
  code: string
}

const BASE_URL = '/data-query/ai-model-provider'

export const getAiModelProviderPage = (params: AiModelProviderPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiModelProvider = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const getAiModelProviderSimpleList = () =>
  request.get({ url: `${BASE_URL}/simple-list` })

export const createAiModelProvider = (data: AiModelProviderVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiModelProvider = (data: AiModelProviderVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const updateAiModelProviderStatus = (id: number, status: number) =>
  request.put({ url: `${BASE_URL}/update-status`, params: { id, status } })

export const deleteAiModelProvider = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiModelProviderList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiModelProvider = (params: AiModelProviderPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
