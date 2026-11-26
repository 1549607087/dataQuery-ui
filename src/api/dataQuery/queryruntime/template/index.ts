import request from '@/config/axios'

/** 查询模板 */
export interface AiQueryTemplateVO {
  id: number | undefined
  name: string
  code: string
  category: string
  questionTemplate: string
  sqlTemplate: string
  paramsDef: string
  datasourceId: number | undefined
  enabled: number
  sort: number
  remark: string
  createTime?: string
}

export interface AiQueryTemplatePageReqVO extends PageParam {
  name?: string
  code?: string
  category?: string
  datasourceId?: number
  enabled?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-query-template'

export const getAiQueryTemplatePage = (params: AiQueryTemplatePageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiQueryTemplate = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const createAiQueryTemplate = (data: AiQueryTemplateVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiQueryTemplate = (data: AiQueryTemplateVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const deleteAiQueryTemplate = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiQueryTemplateList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiQueryTemplate = (params: AiQueryTemplatePageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
