import request from '@/config/axios'

/**
 * 知识库（SaveReqVO 字段 + 后端维护字段）
 *
 * 注意：embeddingModelCode 已由后端改为「系统写入」的运行时指纹
 * （provider.code:model_id:dimension），create/update 的 SaveReqVO 不再接受该字段，
 * 仅在 RespVO 中只读返回；这里标记为可选，仅用于列表展示，禁止随表单提交。
 */
export interface AiKnowledgeBaseVO {
  id: number | undefined
  name: string
  code: string
  description: string
  status: number
  /** 以下字段由后端维护，只展示不提交 */
  documentCount?: number
  chunkCount?: number
  embeddingModelCode?: string
  creator?: string
  createTime?: string
}

export interface AiKnowledgeBasePageReqVO extends PageParam {
  name?: string
  code?: string
  status?: number
  /** 向量模型代号指纹，精确匹配（后端 eqIfPresent） */
  embeddingModelCode?: string
  createTime?: string[]
}

/** 精简列表：仅状态正常(status=0)的知识库 */
export interface AiKnowledgeBaseSimpleRespVO {
  id: number
  name: string
  code: string
  status: number
}

const BASE_URL = '/data-query/knowledge-base'

export const getAiKnowledgeBasePage = (params: AiKnowledgeBasePageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiKnowledgeBase = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } })

export const getAiKnowledgeBaseByCode = (code: string) =>
  request.get({ url: `${BASE_URL}/get-by-code`, params: { code } })

export const getAiKnowledgeBaseSimpleList = () =>
  request.get({ url: `${BASE_URL}/simple-list` })

export const createAiKnowledgeBase = (data: AiKnowledgeBaseVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiKnowledgeBase = (data: AiKnowledgeBaseVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const updateAiKnowledgeBaseStatus = (id: number, status: number) =>
  request.put({ url: `${BASE_URL}/update-status`, params: { id, status } })

export const deleteAiKnowledgeBase = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete`, params: { id } })

export const deleteAiKnowledgeBaseList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiKnowledgeBase = (params: AiKnowledgeBasePageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
