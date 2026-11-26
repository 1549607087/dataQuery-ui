import request from '@/config/axios'

/** 数据源同步日志（只读，仅 RespVO） */
export interface AiDatasourceSyncLogVO {
  id: number
  datasourceId: number
  taskNo: string
  syncType: number
  triggerType: number
  scope: string
  startTime: string
  endTime: string
  latencyMs: number
  status: number
  tableAdded: number
  tableChanged: number
  tableRemoved: number
  columnAdded: number
  columnChanged: number
  columnRemoved: number
  relationAdded: number
  enumAdded: number
  changeDetail: string
  structVersionBefore: number
  structVersionAfter: number
  errorCode: string
  errorMsg: string
  operatorId: number
  operatorName: string
  createTime: string
}

export interface AiDatasourceSyncLogPageReqVO extends PageParam {
  datasourceId?: number
  taskNo?: string
  syncType?: number
  triggerType?: number
  status?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-datasource-sync-log'

export const getAiDatasourceSyncLogPage = (params: AiDatasourceSyncLogPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiDatasourceSyncLog = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } })

export const getAiDatasourceSyncLogListByDatasource = (datasourceId: number) =>
  request.get({ url: `${BASE_URL}/list-by-datasource`, params: { datasourceId } })

export const exportAiDatasourceSyncLog = (params: AiDatasourceSyncLogPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
