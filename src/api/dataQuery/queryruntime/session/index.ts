import request from '@/config/axios'

/** 问数会话 */
export interface AiQuerySessionVO {
  id: number | undefined
  userId: number | undefined
  datasourceId: number | undefined
  title: string
  sessionNo: string
  sceneCode: string
  status: number
  messageCount: number
  lastQuestion: string
  lastAskTime: string
  traceId: string
  remark: string
  createTime?: string
}

export interface AiQuerySessionPageReqVO extends PageParam {
  userId?: number
  datasourceId?: number
  sessionNo?: string
  sceneCode?: string
  status?: number
  title?: string
  traceId?: string
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-query-session'

export const getAiQuerySessionPage = (params: AiQuerySessionPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiQuerySession = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const createAiQuerySession = (data: AiQuerySessionVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiQuerySession = (data: AiQuerySessionVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const deleteAiQuerySession = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiQuerySessionList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiQuerySession = (params: AiQuerySessionPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
