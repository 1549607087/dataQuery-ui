import request from '@/config/axios'

/** 反馈（评分与纠正） */
export interface AiQueryFeedbackVO {
  id: number | undefined
  auditId: number | undefined
  sessionId: number | undefined
  userId: number | undefined
  rating: number
  feedbackType: string
  comment: string
  correctedSql: string
  reviewed: number
  reviewerId: number | undefined
  reviewTime: string
  reviewRemark: string
  createTime?: string
}

export interface AiQueryFeedbackPageReqVO extends PageParam {
  auditId?: number
  sessionId?: number
  userId?: number
  rating?: number
  feedbackType?: string
  reviewed?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-query-feedback'

export const getAiQueryFeedbackPage = (params: AiQueryFeedbackPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiQueryFeedback = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const createAiQueryFeedback = (data: AiQueryFeedbackVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiQueryFeedback = (data: AiQueryFeedbackVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const deleteAiQueryFeedback = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiQueryFeedbackList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiQueryFeedback = (params: AiQueryFeedbackPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
