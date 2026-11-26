import request from '@/config/axios'

/** 数据源字段元数据（表单 = SaveReqVO 全字段 + 后端维护字段可选） */
export interface AiDatasourceColumnVO {
  id: number | undefined
  datasourceId: number | undefined
  tableId: number | undefined
  schemaName: string
  tableName: string
  columnName: string
  nameZh: string
  description: string
  dataType: string
  jdbcType: string
  columnSize: number
  nullable: number
  primaryKey: number
  autoIncrement: number
  defaultValue: string
  ordinalPosition: number
  semanticRole: number
  aggregation: string
  unit: string
  timeFormat: string
  isDefaultTime: number
  metricDef: string
  synonyms: string
  sampleValues: string
  enumEnabled: number
  sensitiveType: number
  maskRule: string
  visible: number
  queryable: number
  filterable: number
  sort: number
  remark: string
  /** 以下字段由后端维护，只展示不提交 */
  distinctCountEstimate?: number
  syncStatus?: number
  structHash?: string
  createTime?: string
}

export interface AiDatasourceColumnPageReqVO extends PageParam {
  datasourceId?: number
  tableId?: number
  tableName?: string
  columnName?: string
  nameZh?: string
  semanticRole?: number
  queryable?: number
  sensitiveType?: number
  syncStatus?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-datasource-column'

export const getAiDatasourceColumnPage = (params: AiDatasourceColumnPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiDatasourceColumn = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } })

export const getAiDatasourceColumnListByDatasource = (datasourceId: number) =>
  request.get({ url: `${BASE_URL}/list-by-datasource`, params: { datasourceId } })

export const getAiDatasourceColumnListByTable = (tableId: number) =>
  request.get({ url: `${BASE_URL}/list-by-table`, params: { tableId } })

export const createAiDatasourceColumn = (data: AiDatasourceColumnVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiDatasourceColumn = (data: AiDatasourceColumnVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const deleteAiDatasourceColumn = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete`, params: { id } })

export const deleteAiDatasourceColumnList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiDatasourceColumn = (params: AiDatasourceColumnPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
