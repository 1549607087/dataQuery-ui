import request from '@/config/axios'

/** 数据源表元数据（表单 = SaveReqVO 全字段 + 后端维护字段可选） */
export interface AiDatasourceTableVO {
  id: number | undefined
  datasourceId: number | undefined
  schemaName: string
  tableName: string
  tableType: number
  nameZh: string
  description: string
  tableRole: number
  primaryKey: string
  defaultTimeColumn: string
  visible: number
  queryable: number
  sensitiveLevel: number
  sort: number
  remark: string
  /** 以下字段由后端维护，只展示不提交 */
  rowCountEstimate?: number
  columnCount?: number
  sampleRows?: string
  sampleTime?: string
  syncStatus?: number
  structHash?: string
  lastSyncTime?: string
  createTime?: string
}

export interface AiDatasourceTablePageReqVO extends PageParam {
  datasourceId?: number
  tableName?: string
  nameZh?: string
  tableType?: number
  visible?: number
  queryable?: number
  syncStatus?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-datasource-table'

export const getAiDatasourceTablePage = (params: AiDatasourceTablePageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiDatasourceTable = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } })

export const getAiDatasourceTableListByDatasource = (datasourceId: number) =>
  request.get({ url: `${BASE_URL}/list-by-datasource`, params: { datasourceId } })

export const createAiDatasourceTable = (data: AiDatasourceTableVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiDatasourceTable = (data: AiDatasourceTableVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const deleteAiDatasourceTable = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete`, params: { id } })

export const deleteAiDatasourceTableList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiDatasourceTable = (params: AiDatasourceTablePageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
